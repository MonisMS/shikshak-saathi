import { NextResponse } from "next/server";
import { getAuthedTeacher } from "@/lib/session";
import { parsePcmWav, transcribeWavChunk } from "@/lib/notes";

/**
 * Class Notes: one ~50s slice of a longer recording → text. The browser splits the
 * audio itself (src/lib/audio-chunks.ts) so no request comes near Vercel's 4.5 MB
 * body limit, and a failed slice can be retried on its own.
 */
export const maxDuration = 60;

const MAX_BYTES = 3 * 1024 * 1024;
const MAX_SECONDS = 90;

export async function POST(req: Request) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Audio chunk too large" }, { status: 400 });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const wav = parsePcmWav(bytes);
  if (!wav) return NextResponse.json({ error: "Audio chunk must be a mono 16-bit PCM WAV" }, { status: 400 });
  if (wav.pcm.length / (wav.sampleRate * 2) > MAX_SECONDS) {
    return NextResponse.json({ error: `Audio chunk longer than ${MAX_SECONDS}s` }, { status: 400 });
  }

  try {
    const { text, engine } = await transcribeWavChunk(teacher.id, bytes, wav);
    return NextResponse.json({ text, engine });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
