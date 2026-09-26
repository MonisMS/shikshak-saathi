import type { z } from "zod";
import type { Quiz, LessonPlan } from "@/lib/ai/schemas";

/**
 * §10.7 — the tally → misconception counting loop, adapted from
 * `research/agent2-ai-pipeline.md` lines 506–516. Idea only (no licence):
 * `references/reteach/README.md` — a misconception map ("what to reteach") beats a
 * gradebook arranged by student; we don't need reteach's AI clustering step because
 * our quiz distractors are already pre-tagged with a misconceptionId at generation time.
 */

/** { [questionId]: { [optionKey]: count } } — class-level tally (F40; F41 per-student is off). */
export type QuizTally = Record<string, Record<string, number>>;

export interface MisconceptionCountRow {
  code: string;
  label: string;
  correction: string;
  studentCount: number;
  questionIds: string[];
  /** studentCount / studentsPresent, capped at 1.0. UI label: "wrong answers pointing to this misconception". */
  percent: number;
}

/** For every wrong option with a misconceptionId, add its tally count to that
 * misconception. Rows are sorted by studentCount descending. Pure — no DB, no AI. */
export function misconceptionCounts(
  quiz: z.infer<typeof Quiz>,
  plan: z.infer<typeof LessonPlan>,
  tally: QuizTally,
  studentsPresent: number,
): MisconceptionCountRow[] {
  const counts = new Map<string, { studentCount: number; questionIds: Set<string> }>();

  for (const q of quiz.questions) {
    for (const o of q.options) {
      if (o.correct || !o.misconceptionId) continue;
      const n = tally[q.id]?.[o.id] ?? 0;
      if (n === 0) continue;
      const entry = counts.get(o.misconceptionId) ?? { studentCount: 0, questionIds: new Set<string>() };
      entry.studentCount += n;
      entry.questionIds.add(q.id);
      counts.set(o.misconceptionId, entry);
    }
  }

  const byCode = new Map(plan.misconceptions.map((m) => [m.id, m]));

  const rows: MisconceptionCountRow[] = [];
  for (const [code, entry] of counts) {
    const m = byCode.get(code);
    rows.push({
      code,
      label: m?.misconception ?? code,
      correction: m?.correction ?? "",
      studentCount: entry.studentCount,
      questionIds: [...entry.questionIds],
      percent: studentsPresent > 0 ? Math.min(1, entry.studentCount / studentsPresent) : 0,
    });
  }

  return rows.sort((a, b) => b.studentCount - a.studentCount);
}

export interface QuestionAccuracyRow {
  questionId: string;
  correctCount: number;
  accuracy: number; // correctCount / studentsPresent
}

/** Per-question accuracy (P7.3's "per-question accuracy" bars). */
export function questionAccuracy(quiz: z.infer<typeof Quiz>, tally: QuizTally, studentsPresent: number): QuestionAccuracyRow[] {
  return quiz.questions.map((q) => {
    const correctOption = q.options.find((o) => o.correct);
    const correctCount = correctOption ? (tally[q.id]?.[correctOption.id] ?? 0) : 0;
    return { questionId: q.id, correctCount, accuracy: studentsPresent > 0 ? correctCount / studentsPresent : 0 };
  });
}

export type MasteryBand = "green" | "amber" | "red";

export function masteryBand(accuracy: number): MasteryBand {
  if (accuracy >= 0.7) return "green";
  if (accuracy >= 0.4) return "amber";
  return "red";
}

export interface ObjectiveMasteryRow {
  objectiveId: string;
  accuracy: number;
  band: MasteryBand;
}

/** Per-objective mastery (P7.3): average accuracy of every quiz question tagged
 * with that objectiveId. green ≥70%, amber 40–70%, red <40%. */
export function objectiveMastery(quiz: z.infer<typeof Quiz>, tally: QuizTally, studentsPresent: number): ObjectiveMasteryRow[] {
  const perQuestion = new Map(questionAccuracy(quiz, tally, studentsPresent).map((r) => [r.questionId, r.accuracy]));
  const byObjective = new Map<string, number[]>();
  for (const q of quiz.questions) {
    const acc = perQuestion.get(q.id) ?? 0;
    (byObjective.get(q.objectiveId) ?? byObjective.set(q.objectiveId, []).get(q.objectiveId)!).push(acc);
  }
  return [...byObjective.entries()].map(([objectiveId, accuracies]) => {
    const accuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    return { objectiveId, accuracy, band: masteryBand(accuracy) };
  });
}

/** Reshapes stored QuestionTally rows into the {questionId: {optionKey: count}} shape. */
export function tallyFromRows(rows: { questionId: string; optionKey: string; count: number }[]): QuizTally {
  const tally: QuizTally = {};
  for (const r of rows) {
    (tally[r.questionId] ??= {})[r.optionKey] = r.count;
  }
  return tally;
}
