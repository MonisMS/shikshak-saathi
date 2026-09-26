import type { WorksheetQuestion } from "@/lib/ai/schemas";
import type { z } from "zod";

type Question = z.infer<typeof WorksheetQuestion>;

/**
 * Grades one student's open-ended worksheet answers (short_answer, long_answer,
 * case_based, assertion_reason — the types that can't be auto-scored by exact match).
 * mcq/true_false/fill_blank/match are scored deterministically before this ever runs.
 */
export function buildEvaluatePrompt(
  language: "hi" | "en",
  questions: { question: Question; studentAnswer: string }[],
  teacherInstructions: string | undefined,
): { system: string; user: string } {
  const system = [
    "# Identity",
    "You are grading a school student's handwritten-then-transcribed worksheet answers for an NCERT-aligned lesson.",
    "Be fair and consistent: give partial credit for a partially correct or partially complete answer, do not require the exact wording of the answer key, and judge on understanding, not phrasing.",
    "Never award more than a question's max marks. Award 0 for a blank or entirely off-topic answer.",
    language === "hi"
      ? "Write feedback in simple Hindi."
      : "Write feedback in simple Indian English.",
  ].join("\n");

  const user = [
    "# Task",
    "For each question below, compare the student's answer against the answer key and award marks out of the question's max marks. Give one short line of feedback per question — specific enough that the student understands what they got right or missed.",
    teacherInstructions ? `\n# Teacher's grading instructions (follow these)\n${teacherInstructions}` : "",
    "",
    "# Questions",
    JSON.stringify(
      questions.map(({ question, studentAnswer }) => ({
        questionId: question.id,
        type: question.type,
        prompt: question.prompt,
        answerKey: question.answer,
        maxMarks: question.marks,
        studentAnswer: studentAnswer || "(left blank)",
      })),
    ),
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
