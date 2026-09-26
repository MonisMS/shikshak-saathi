import { buildSystemPrompt } from "./system";
import type { PromptContext } from "./context";

/**
 * FIX / REMEDIAL prompt (§10.5, §10.7). Idea adapted (MIT, no direct copy): Oak's
 * additionalMaterials.instructions.ts — concrete, teacher-speakable content over
 * vague labels; be specific rather than gesturing at an activity. Ported to our
 * narrower need: a single 5-minute, low-resource re-teach of one misconception,
 * not Oak's general-purpose additional-materials section.
 */
export function buildFixPrompt(
  ctx: PromptContext,
  misconceptions: { code: string; label: string; correction: string }[],
): { system: string; user: string } {
  const system = buildSystemPrompt({ ...ctx, lowResource: true }); // fixes are always blackboard-only (F46)

  const user = [
    "# Task",
    `Write a 5-minute remedial activity for each of these top misconceptions from yesterday's exit quiz (1–3 of them). These will open tomorrow's lesson.`,
    JSON.stringify(misconceptions),
    "",
    "For each misconception, write one activity: {misconceptionId (reuse the code given above), title, minutes (3–10), steps (2–6, concrete blackboard/chalk/local-object actions — say exactly what to draw or do, not 'explain the concept'), materials (local objects only), checkQuestion (one quick oral re-check that confirms the fix worked), pageRef}.",
    "",
    "Also write a groupingSuggestion: one line on how to pair or group students for this warm-up (e.g. pair a student who got it wrong with one who got it right).",
  ].join("\n");

  return { system, user };
}
