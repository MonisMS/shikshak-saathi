import type { z } from "zod";
import type { Objectives, LessonPlan } from "@/lib/ai/schemas";
import { buildSystemPrompt } from "./system";
import { chapterOrTopicBlock, modifiersBlock, type PromptContext } from "./context";

/**
 * WORKSHEET prompt (§10.5). Ideas adapted (MIT): Oak's comprehension worksheet builder
 * (question variety, one worksheet the pupil actually completes) and Shiksha's
 * question_paper_prompts.yaml (objective+Bloom alignment per question, no two questions
 * testing the same fact, complexity scaled to grade). CBSE question types per §3.3/F14.
 */
export function buildWorksheetPrompt(
  ctx: PromptContext,
  objectives: z.infer<typeof Objectives>,
  plan: z.infer<typeof LessonPlan>,
  opts?: { difficulty?: "easy" | "medium" | "hard"; instruction?: string; repair?: string[] },
): { system: string; user: string } {
  const system = buildSystemPrompt(ctx);

  const user = [
    "# Task",
    "Write a student worksheet of 6–15 questions covering these objectives (reuse their ids):",
    JSON.stringify(objectives.objectives.map((o) => ({ id: o.id, text: o.text }))),
    "",
    "Use this lesson's key learning points and keywords so the worksheet matches what was actually taught:",
    JSON.stringify({ keyLearningPoints: plan.keyLearningPoints, keywords: plan.keywords }),
    "",
    "Rules:",
    "- Mix question types: mcq, fill_blank, true_false, match, short_answer, long_answer, case_based, assertion_reason. Do not use only one type.",
    "- mcq and assertion_reason questions need exactly 4 options; exactly one is correct.",
    "- No two questions test the same fact in the same way — vary what each one checks.",
    `- Overall difficulty: ${opts?.difficulty ?? "medium"} (a few easier warm-up questions are fine even on a harder worksheet).`,
    "- answer must be an unambiguous answer key entry a teacher can mark against; for fill_blank, separate multiple blanks with ' | ' in order.",
    "- Every question needs a real pageRef from the chapter text (omit only if there is no chapter).",
    "- Give each question an id: W1, W2, W3 … and set totalMarks to the sum of every question's marks.",
    "",
    chapterOrTopicBlock(ctx),
    modifiersBlock(opts?.instruction, opts?.repair),
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
