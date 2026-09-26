import type { z } from "zod";
import type { Objectives } from "@/lib/ai/schemas";
import { buildSystemPrompt } from "./system";
import { chapterOrTopicBlock, modifiersBlock, type PromptContext } from "./context";

/**
 * LESSON_PLAN prompt (§10.5). Ideas adapted (MIT): Oak's cycle.instructions.ts (teacherSays
 * must be the actual spoken content, not a meta-instruction; minimise cognitive load; check
 * for understanding built into the explanation) and misconceptions.instructions.ts (succinct
 * misconception + factual correction, 1–3 of them). Shiksha's 5E-style sample plan
 * (data.helper.js) is the target shape: starter → explain → activity → practice → exit.
 */
export function buildLessonPlanPrompt(
  ctx: PromptContext,
  objectives: z.infer<typeof Objectives>,
  opts?: { instruction?: string; repair?: string[]; focusFix?: string },
): { system: string; user: string } {
  const system = buildSystemPrompt(ctx);

  const focusFixLine = opts?.focusFix
    ? `This is a Day-2 lesson. The FIRST section (id S1) must have phase "warmup_fix" and be a short (≤5 minute) re-teach of yesterday's mistake, using this fix plan: ${opts.focusFix}. All other sections follow as normal, and their minutes plus S1's must still sum to ${ctx.periodMinutes}.`
    : "";

  const user = [
    "# Task",
    `Write a full lesson plan for one ${ctx.periodMinutes}-minute period, built from these learning objectives (reuse their ids, do not invent new ones):`,
    JSON.stringify(objectives.objectives.map((o) => ({ id: o.id, text: o.text }))),
    "",
    focusFixLine,
    "",
    "Structure:",
    "- priorKnowledge (2–5 short bullet points): what students already know that this lesson builds on.",
    "- keyLearningPoints (3–6): the actual facts/ideas taught, stated as facts a teacher would say — not instructions like 'explain X'.",
    "- keywords (3–8): {term, definition}. Each definition must be understandable on its own, in the kit's language, without technical language wrapping technical language.",
    "- misconceptions (2–5): each {id: M1/M2/…, misconception (what students wrongly believe, in their own words), correction (a factual correction), pageRef}. These ids will be reused by the exit quiz's wrong options.",
    "- sections (4–8): the lesson's phases in order. Each has {id: S1/S2/…, phase, title, minutes, teacherSays (the actual script — what the teacher would say aloud, not a description of what to say), studentsDo, materials, objectiveIds, pageRefs, checkForUnderstanding?}.",
    `  The minutes across all sections MUST sum to exactly ${ctx.periodMinutes}.`,
    "  Typical phase order: starter → explain → activity → practice → exit_check, optionally wrap_up. Every objective id must be covered by at least one section.",
    "- homework: one line, doable with items available at home.",
    "",
    chapterOrTopicBlock(ctx),
    modifiersBlock(opts?.instruction, opts?.repair),
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
