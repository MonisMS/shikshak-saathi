import { NextResponse } from "next/server";
import { getAuthedTeacher } from "@/lib/session";

/**
 * F31/F32 (U12). Proxies a recorded voice note to Sarvam speech-to-text
 * (§12.4, `research/voice-and-fallback.md` §1). Called by
 * src/components/voice/mic-button.tsx, which reads {transcript} on success
 * and falls back to the browser's Web Speech API on any non-2xx response.
 */

const MAX_BYTES = 2 * 1024 * 1024; // ~30s of webm at MediaRecorder's default bitrate

export async function POST(req: Request) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Voice transcription is not configured", fallback: true }, { status: 502 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Audio file too large (max ~30s)" }, { status: 400 });
  }

  const sarvamForm = new FormData();
  sarvamForm.append("file", file, "speech.webm");
  sarvamForm.append("model", "saaras:v3");
  sarvamForm.append("mode", "codemix");
  sarvamForm.append("language_code", "unknown");

  try {
    const res = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: { "api-subscription-key": apiKey },
      body: sarvamForm,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json({ error: `Sarvam responded HTTP ${res.status}: ${body}`, fallback: true }, { status: 502 });
    }

    const data = (await res.json()) as { transcript?: string; language_code?: string };
    if (!data.transcript) {
      return NextResponse.json({ error: "Empty transcript", fallback: true }, { status: 502 });
    }

    return NextResponse.json({ transcript: data.transcript, language_code: data.language_code });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message, fallback: true }, { status: 502 });
  }
}
