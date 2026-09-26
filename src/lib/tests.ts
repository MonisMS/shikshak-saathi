import type { z } from "zod";
import type { WorksheetQuestion, Quiz } from "@/lib/ai/schemas";

type WQuestion = z.infer<typeof WorksheetQuestion>;
type QuizData = z.infer<typeof Quiz>;

export const AUTO_GRADABLE_TYPES = new Set(["mcq", "true_false", "fill_blank", "match"]);
export const AI_GRADED_TYPES = new Set(["short_answer", "long_answer", "case_based", "assertion_reason"]);

export interface PerQuestionResult {
  marks: number | null;
  max: number;
  method: "auto" | "ai";
  feedback?: string;
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Deterministic scoring for question types with one unambiguous correct string.
 * fill_blank answers are "|"-joined per blank, in order — every blank must match.
 * match questions store the answer key as "left=right | left=right ...". */
export function autoGradeWorksheetQuestion(q: WQuestion, studentAnswer: string): PerQuestionResult | null {
  if (!AUTO_GRADABLE_TYPES.has(q.type)) return null;

  if (q.type === "fill_blank") {
    const key = q.answer.split("|").map(normalize);
    const given = studentAnswer.split("|").map(normalize);
    const correct = key.length === given.length && key.every((k, i) => k === given[i]);
    return { marks: correct ? q.marks : 0, max: q.marks, method: "auto" };
  }

  // mcq / true_false / match: single normalized-string comparison against the key.
  const correct = normalize(studentAnswer) === normalize(q.answer);
  return { marks: correct ? q.marks : 0, max: q.marks, method: "auto" };
}

export function worksheetMaxMarks(questions: WQuestion[]): number {
  return questions.reduce((sum, q) => sum + q.marks, 0);
}

/** A printed sheet shows worksheet options as an A/B/C/D list (see PrintWorksheet's
 * `list-[upper-alpha]`), but the underlying answer key is the option's full text, not
 * a letter — so OCR reading a circled "B" off the paper needs mapping back to
 * `options[1]` before it can be compared against the key. Online submissions never
 * hit this (the attempt form stores full option text directly), only scanned ones. */
export function resolveScannedWorksheetAnswer(q: WQuestion, raw: string): string {
  if (!q.options?.length) return raw;
  const letter = raw.trim().replace(/[().]/g, "").toUpperCase();
  if (!/^[A-D]$/.test(letter)) return raw;
  const index = letter.charCodeAt(0) - "A".charCodeAt(0);
  return q.options[index] ?? raw;
}

/** Quiz (MCQ) questions are worth 1 mark each — there's no `marks` field on QuizQuestion. */
export function gradeQuizSubmission(quiz: QuizData, answers: Record<string, string>): { perQuestion: Record<string, PerQuestionResult>; autoMarks: number; maxMarks: number } {
  const perQuestion: Record<string, PerQuestionResult> = {};
  let autoMarks = 0;
  for (const q of quiz.questions) {
    const given = (answers[q.id] ?? "").trim().toUpperCase();
    const correctOption = q.options.find((o) => o.correct);
    const correct = !!correctOption && given === correctOption.id;
    perQuestion[q.id] = { marks: correct ? 1 : 0, max: 1, method: "auto" };
    if (correct) autoMarks += 1;
  }
  return { perQuestion, autoMarks, maxMarks: quiz.questions.length };
}
