import type { z } from "zod";
import type { LessonPlan } from "@/lib/ai/schemas";
import { buildSystemPrompt } from "./system";
import { modifiersBlock, type PromptContext } from "./context";

/**
 * PARENT_NOTE prompt (§10.5 — "same additionalMaterials file (homework option)").
 * Idea adapted (MIT, no direct copy): Oak's additionalMaterials.instructions.ts —
 * written for the audience actually reading it (here: a parent with no subject
 * background), not restated lesson jargon. Uses the FAST model (§7.2/§10.2).
 */
export function buildParentNotePrompt(
  ctx: PromptContext,
  plan: z.infer<typeof LessonPlan>,
  opts?: { instruction?: string; repair?: string[] },
): { system: string; user: string } {
  const system = buildSystemPrompt(ctx);

  const user = [
    "# Task",
    "Write a short note FOR THE PARENT of a student in this class — plain, warm, non-technical language a parent with no background in this subject can follow. Do not restate lesson jargon; explain it in everyday terms.",
    "",
    "What was actually taught, to base the note on:",
    JSON.stringify({ keyLearningPoints: plan.keyLearningPoints, homework: plan.homework }),
    "",
    "Fields:",
    "- learnedToday: 1-2 plain sentences on what the class learned today.",
    "- homework: the homework, restated simply for a parent (based on the lesson's homework above).",
    "- homeActivity: one activity using only items available at home, at most 2 sentences.",
    "- askYourChild: up to 3 short questions a parent can ask their child to check they understood.",
    `- language: set this to "${ctx.language}".`,
    "- whatsappText: all of the above combined into ONE warm, jargon-free WhatsApp-length message (max 700 characters).",
    "",
    modifiersBlock(opts?.instruction, opts?.repair),
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
