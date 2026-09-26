import type { z } from "zod";
import type { Objectives, LessonPlan } from "@/lib/ai/schemas";
import { buildSystemPrompt } from "./system";
import { chapterOrTopicBlock, modifiersBlock, type PromptContext } from "./context";

/**
 * EXIT_QUIZ / STARTER_QUIZ prompt (§10.5). Ideas adapted (MIT): Oak's
 * quizQuestionDesign.instructions.ts (no negative phrasing, no true/false, distractors
 * plausible/same-category/similar length, alphabetical-ish ordering not required here
 * since options are lettered A–D). Idea only (no licence): the distractor↔misconception
 * pairing in prompt_distractor_generation_NAACL/PromptFactory.py — every wrong option
 * carries the specific misconception it reveals, not a generic "incorrect" label.
 */
export function buildQuizPrompt(
  ctx: PromptContext,
  kind: "starter" | "exit",
  objectives: z.infer<typeof Objectives>,
  plan: z.infer<typeof LessonPlan>,
  opts?: { instruction?: string; repair?: string[] },
): { system: string; user: string } {
  const system = buildSystemPrompt(ctx);

  const purposeLine =
    kind === "starter"
      ? "This is a STARTER quiz, given before teaching, to check what students already know coming in."
      : "This is the EXIT quiz, given at the end of the period, to check what was actually learned.";

  const user = [
    "# Task",
    `Write a ${kind} formative quiz of 3–6 MCQ questions. Set "kind": "${kind}".`,
    purposeLine,
    "",
    "Each question needs exactly 4 options (A–D), exactly one correct. Every wrong option MUST carry a misconceptionId reusing one of these ids from the lesson plan, plus a one-line whyWrong hint the teacher can say on the spot:",
    JSON.stringify(plan.misconceptions.map((m) => ({ id: m.id, misconception: m.misconception }))),
    "",
    "Question design rules:",
    "- No negative phrasing ('which of these is NOT…').",
    "- No 'all of the above' / 'none of the above'.",
    "- Distractors must be plausible: same category as the correct answer, similar length, no option that gives away the answer by wording.",
    "- Each question ties to one objective id (reuse from this list, don't invent new ones):",
    JSON.stringify(objectives.objectives.map((o) => ({ id: o.id, text: o.text }))),
    "- No two questions test the exact same fact.",
    "- Give each question an id: Q1, Q2, Q3 …",
    "- A real pageRef per question where a chapter exists.",
    "",
    chapterOrTopicBlock(ctx),
    modifiersBlock(opts?.instruction, opts?.repair),
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
