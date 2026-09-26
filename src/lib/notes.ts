import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/scope";
import { generateJSON, MODEL_FAST } from "@/lib/ai/gemini";
import {
  ChunkTranscript,
  NoteSummary,
  buildChunkTranscribePrompt,
  buildNoteSummaryPrompt,
  type NoteLanguage,
} from "@/lib/ai/prompts/notes";

/** Scoped fetch (roadmap §0.2.6) — a teacher can never read another teacher's note by guessing an id. */
export async function getNoteForTeacher(noteId: string, teacherId: string) {
  const note = await prisma.classNote.findFirst({ where: { id: noteId, teacherId } });
  if (!note) throw new NotFoundError(`Note ${noteId} not found for this teacher`);
  return note;
}

async function logGeneration(teacherId: string, entry: { model: string; latencyMs: number; ok: boolean; error?: string; inTok?: number; outTok?: number }) {
  await prisma.generationLog
    .create({
      data: {
        teacherId,
        model: entry.model,
        latencyMs: entry.latencyMs,
        ok: entry.ok,
        error: entry.error?.slice(0, 500),
        inputTokens: entry.inTok,
        outputTokens: entry.outTok,
      },
    })
    .catch(() => {}); // logging must never fail the user's request
}

export async function summarizeTranscript(teacherId: string, transcript: string, language: NoteLanguage): Promise<NoteSummary> {
  const { system, user } = buildNoteSummaryPrompt(transcript, language);
  const start = Date.now();
  try {
    const result = await generateJSON({ schema: NoteSummary, system, user });
    await logGeneration(teacherId, { model: result.model, latencyMs: result.latencyMs, ok: true, inTok: result.inTok, outTok: result.outTok });
    return result.data;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logGeneration(teacherId, { model: "notes-summary", latencyMs: Date.now() - start, ok: false, error: message });
    throw e;
  }
}

/* ───────────── WAV helpers (client sends 16 kHz / mono / 16-bit PCM) ───────────── */

export interface PcmWav {
  sampleRate: number;
  pcm: Uint8Array; // raw little-endian int16 samples
}

/** Parses a PCM WAV and returns its data chunk; null for anything that isn't mono 16-bit PCM. */
export function parsePcmWav(buf: Uint8Array): PcmWav | null {
  if (buf.length < 44) return null;
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const tag = (o: number) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") return null;

  let offset = 12;
  let sampleRate = 0;
  let fmtOk = false;
  while (offset + 8 <= buf.length) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === "fmt ") {
      const format = view.getUint16(body, true);
      const channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      const bits = view.getUint16(body + 14, true);
      fmtOk = format === 1 && channels === 1 && bits === 16;
    } else if (id === "data") {
      if (!fmtOk || !sampleRate) return null;
      return { sampleRate, pcm: buf.subarray(body, Math.min(body + size, buf.length)) };
    }
    offset = body + size + (size % 2); // chunks are word-aligned
  }
  return null;
}

export function encodePcmWav(pcm: Uint8Array, sampleRate: number): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(44 + pcm.length);
  const view = new DataView(out.buffer);
  const write = (o: number, s: string) => [...s].forEach((c, i) => (out[o + i] = c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

/* ───────────── Speech-to-text for one chunk ───────────── */

const SARVAM_MAX_SECONDS = 29; // Sarvam's REST endpoint rejects clips over 30s

async function transcribeViaSarvam(wav: PcmWav): Promise<string> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error("Sarvam is not configured");

  const bytesPerPiece = SARVAM_MAX_SECONDS * wav.sampleRate * 2;
  const parts: string[] = [];
  for (let start = 0; start < wav.pcm.length; start += bytesPerPiece) {
    const piece = encodePcmWav(wav.pcm.subarray(start, start + bytesPerPiece), wav.sampleRate);
    const form = new FormData();
    form.append("file", new Blob([piece], { type: "audio/wav" }), "chunk.wav");
    form.append("model", "saaras:v3");
    form.append("mode", "codemix");
    form.append("language_code", "unknown");

    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": apiKey },
      body: form,
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(`Sarvam responded HTTP ${res.status}`);
    const data = (await res.json()) as { transcript?: string };
    if (data.transcript?.trim()) parts.push(data.transcript.trim());
  }
  return parts.join(" ");
}

/** Gemini first (handles codemix well, rotates keys); Sarvam as the cross-provider fallback. */
export async function transcribeWavChunk(teacherId: string, wavBytes: Uint8Array, wav: PcmWav): Promise<{ text: string; engine: string }> {
  const { system, user } = buildChunkTranscribePrompt();
  const start = Date.now();
  let geminiError: string;
  try {
    const result = await generateJSON({
      schema: ChunkTranscript,
      system,
      user,
      model: MODEL_FAST,
      parts: [{ inlineData: { mimeType: "audio/wav", data: Buffer.from(wavBytes).toString("base64") } }],
    });
    await logGeneration(teacherId, { model: result.model, latencyMs: result.latencyMs, ok: true, inTok: result.inTok, outTok: result.outTok });
    return { text: result.data.text.trim(), engine: result.model };
  } catch (e) {
    geminiError = e instanceof Error ? e.message : String(e);
    await logGeneration(teacherId, { model: "notes-stt-gemini", latencyMs: Date.now() - start, ok: false, error: geminiError });
  }

  const sarvamStart = Date.now();
  try {
    const text = await transcribeViaSarvam(wav);
    await logGeneration(teacherId, { model: "sarvam:saaras:v3", latencyMs: Date.now() - sarvamStart, ok: true });
    return { text, engine: "sarvam:saaras:v3" };
  } catch (e) {
    const sarvamError = e instanceof Error ? e.message : String(e);
    await logGeneration(teacherId, { model: "sarvam:saaras:v3", latencyMs: Date.now() - sarvamStart, ok: false, error: sarvamError });
    throw new Error(`Transcription failed (Gemini: ${geminiError}; Sarvam: ${sarvamError})`);
  }
}
