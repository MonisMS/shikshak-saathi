import { NextResponse } from "next/server";
import * as z from "zod";
import { getAuthedTeacher } from "@/lib/session";

/**
 * F33 (U12). Proxies text to Sarvam text-to-speech (§12.4,
 * `research/voice-and-fallback.md` §2) for the parent-note "Listen" button
 * and the lesson plan's teacherSays script (neither built yet — the exact
 * response shape below, {audios: string[]}, is free to pick since nothing
 * consumes it yet; matches Sarvam's own field name for whoever builds it).
 */

const MAX_CHUNK_CHARS = 2500; // bulbul:v3's hard limit

const TtsBody = z.object({
  text: z.string().min(1),
  lang: z.string().min(2).max(10).default("hi-IN"),
});

/** Splits on sentence/space boundaries so a chunk never cuts a word in half. */
function chunkText(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const chunks: string[] = [];
  let rest = text.trim();
  while (rest.length > maxLen) {
    let splitAt = rest.lastIndexOf(". ", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = rest.lastIndexOf(" ", maxLen);
    if (splitAt < 0) splitAt = maxLen;
    chunks.push(rest.slice(0, splitAt + 1).trim());
    rest = rest.slice(splitAt + 1).trim();
  }
  if (rest.length > 0) chunks.push(rest);
  return chunks;
}

export async function POST(req: Request) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Voice read-aloud is not configured" }, { status: 502 });
  }

  const parsed = TtsBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { text, lang } = parsed.data;

  const chunks = chunkText(text, MAX_CHUNK_CHARS);
  const audios: string[] = [];

  for (const chunk of chunks) {
    try {
      const res = await fetch("https://api.sarvam.ai/text-to-speech", {
        method: "POST",
        headers: {
          "api-subscription-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: chunk,
          language_code: lang,
          model: "bulbul:v3",
          speaker: "ritu",
          pace: 0.9,
        }),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return NextResponse.json({ error: `Sarvam responded HTTP ${res.status}: ${body}` }, { status: 502 });
      }

      const data = (await res.json()) as { audios?: string[] };
      if (!data.audios?.[0]) {
        return NextResponse.json({ error: "Empty audio response" }, { status: 502 });
      }
      audios.push(data.audios[0]);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  return NextResponse.json({ audios });
}
