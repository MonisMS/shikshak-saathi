import type { z } from "zod";
import type { LessonPlan, Quiz } from "@/lib/ai/schemas";

/**
 * F20: "if LESSON_PLAN is regenerated and misconception ids changed, mark EXIT_QUIZ
 * may be out of date". Pure — every wrong option's misconceptionId must still exist
 * in the current plan; if one doesn't, the quiz was written against an older plan.
 */
export function isQuizStale(quiz: z.infer<typeof Quiz>, plan: z.infer<typeof LessonPlan>): boolean {
  const planIds = new Set(plan.misconceptions.map((m) => m.id));
  return quiz.questions.some((q) => q.options.some((opt) => !opt.correct && opt.misconceptionId && !planIds.has(opt.misconceptionId)));
}
