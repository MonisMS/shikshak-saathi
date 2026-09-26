import { NextResponse } from "next/server";
import * as z from "zod";
import { requireTeacher } from "@/lib/session";
import { generateJSON, MODEL_FAST } from "@/lib/ai/gemini";
import { VoiceIntent } from "@/lib/ai/schemas";
import { buildVoiceParsePrompt } from "@/lib/ai/prompts/voice";

/**
 * F31: transcript → VoiceIntent (§12.4). This path is explicitly carved out for
 * Monis inside `api/**` (TEAM_TASKS.md folder-ownership list) — the Sarvam proxies
 * `/api/voice/transcribe` and `/api/voice/tts` are Ujjwal's, not this route.
 */
export const maxDuration = 30;

const bodySchema = z.object({ transcript: z.string().min(1).max(500) });

export async function POST(req: Request) {
  await requireTeacher(); // redirects to /login on no session — not try/catch-wrapped

  const parsedBody = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });
  }

  const { system, user } = buildVoiceParsePrompt(parsedBody.data.transcript);

  try {
    const result = await generateJSON({ schema: VoiceIntent, system, user, model: MODEL_FAST });
    return NextResponse.json(result.data);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
