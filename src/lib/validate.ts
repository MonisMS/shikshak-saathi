import type { z } from "zod";
import type { Objectives, LessonPlan, Worksheet, Quiz, MultiGrade } from "@/lib/ai/schemas";
import { SectionType } from "@/generated/prisma/enums";

/**
 * Deterministic, code-only validator (§10.6, R1–R12) — "AI writes, code checks".
 * Idea adapted (no licence, read only): `references/master-lesson/src/validate/consistency.ts`
 * (one violation per broken rule, plus a short per-rule guidance string sent back to the
 * model on repair) and `.../src/generate/repair.ts` (feedback → one bounded repair attempt).
 * Our rules are the roadmap's own R1–R12, not master-lesson's numbering.
 */

export interface ValidationRuleResult {
  rule: string; // "R1".."R12"
  ok: boolean;
  detail: string;
  /** R4 (quote grounding) is advisory — shown amber, never blocks the teacher. */
  severity?: "warning";
  /** Which section this rule is about, so the UI/repair loop can target it. */
  sections: SectionType[];
}

export interface ValidateInput {
  objectives?: z.infer<typeof Objectives>;
  plan?: z.infer<typeof LessonPlan>;
  worksheet?: z.infer<typeof Worksheet>;
  exitQuiz?: z.infer<typeof Quiz>;
  starterQuiz?: z.infer<typeof Quiz>;
  multiGrade?: z.infer<typeof MultiGrade>;
  /** Page-tagged chapter text, undefined for typed-topic kits (R3/R4 are skipped then). */
  chapterPages?: { page: number; text: string }[];
  periodMinutes: number;
  lowResource: boolean;
  language: "hi" | "en";
}

/** Short guidance sent back to the model on repair — a bare violation message
 * ("W3 answer doesn't match its options") doesn't tell the model what to fix. */
export const RULE_GUIDANCE: Readonly<Record<string, string>> = {
  R1: "Every objective id must appear in at least one lesson section's objectiveIds AND be the objectiveId of at least one worksheet or quiz question.",
  R2: "The minutes of every lesson section must add up to exactly the period length.",
  R3: "Every pageRef must be a page number that actually appears as a [p.N] marker in the chapter text. Never invent one.",
  R4: "Every keyword term should actually appear in the chapter text — don't teach a keyword the chapter never uses.",
  R5: "Every quiz question needs exactly 4 options, exactly one marked correct, and every wrong option needs a misconceptionId that matches an id in the lesson plan's misconceptions.",
  R6: "Every misconception id from the lesson plan must be used by at least one quiz wrong option.",
  R7: "The answer must actually match the question: fill_blank needs one answer per blank ('|'-separated), mcq/assertion_reason answers must be one of the options, match needs at least 3 pairs, case_based needs both caseText and subQuestions.",
  R8: "totalMarks must equal the sum of every question's marks.",
  R9: "In a low-resource kit, no material or activity may mention a projector, laptop, internet, video, printer, tablet or smartboard, and the worksheet must have at most 8 questions.",
  R10: "Hindi output must be mostly Devanagari script; English output must be mostly Latin script — don't mix the wrong script in for the chosen language.",
  R11: "Every id must be unique across the whole kit and match its prefix pattern (O#, M#, S#, W#, Q#).",
  R12: "The multi-grade rotation's minute ranges must cover 0..periodMinutes with no gaps or overlaps, and every grade must get teacher time.",
};

function ok(rule: string, detail: string, sections: SectionType[]): ValidationRuleResult {
  return { rule, ok: true, detail, sections };
}
function fail(rule: string, detail: string, sections: SectionType[], severity?: "warning"): ValidationRuleResult {
  return { rule, ok: false, detail, sections, severity };
}
function skip(rule: string, why: string, sections: SectionType[]): ValidationRuleResult {
  return { rule, ok: true, detail: `Skipped — ${why}`, sections };
}

const devanagariRatio = (s: string): number => {
  const letters = s.match(/\p{L}/gu) ?? [];
  if (!letters.length) return 1;
  return letters.filter((c) => /[ऀ-ॿ]/.test(c)).length / letters.length;
};

function sectionsTotalMinutes(plan: z.infer<typeof LessonPlan>): number {
  return plan.sections.reduce((sum, s) => sum + s.minutes, 0);
}

function allQuestions(worksheet?: z.infer<typeof Worksheet>, ...quizzes: (z.infer<typeof Quiz> | undefined)[]) {
  return [
    ...(worksheet?.questions.map((q) => ({ objectiveId: q.objectiveId })) ?? []),
    ...quizzes.flatMap((q) => q?.questions.map((qq) => ({ objectiveId: qq.objectiveId })) ?? []),
  ];
}

function ruleObjectiveCoverage(input: ValidateInput): ValidationRuleResult {
  const { objectives, plan, worksheet, exitQuiz, starterQuiz } = input;
  const sections = [SectionType.OBJECTIVES, SectionType.LESSON_PLAN];
  if (!objectives || !plan) return skip("R1", "objectives or lesson plan not ready", sections);

  const questions = allQuestions(worksheet, exitQuiz, starterQuiz);
  const uncovered = objectives.objectives.filter((o) => {
    const inSection = plan.sections.some((s) => s.objectiveIds.includes(o.id));
    const inQuestion = questions.some((q) => q.objectiveId === o.id);
    return !(inSection && inQuestion);
  });

  return uncovered.length === 0
    ? ok("R1", "Every objective is taught in the plan and assessed by a question", sections)
    : fail("R1", `Not taught + assessed: ${uncovered.map((o) => o.id).join(", ")}`, sections);
}

function ruleTimings(input: ValidateInput): ValidationRuleResult {
  const sections = [SectionType.LESSON_PLAN];
  if (!input.plan) return skip("R2", "lesson plan not ready", sections);
  const total = sectionsTotalMinutes(input.plan);
  return total === input.periodMinutes
    ? ok("R2", `Sections sum to ${input.periodMinutes} minutes`, sections)
    : fail("R2", `Sections sum to ${total} minutes, expected ${input.periodMinutes}`, sections);
}

/** R2 auto-fix: put the difference on the longest activity/practice section. */
export function autoFixTimings(plan: z.infer<typeof LessonPlan>, periodMinutes: number): z.infer<typeof LessonPlan> {
  const diff = periodMinutes - sectionsTotalMinutes(plan);
  if (diff === 0) return plan;
  const candidates = plan.sections.filter((s) => s.phase === "activity" || s.phase === "practice");
  const pool = candidates.length > 0 ? candidates : plan.sections;
  const target = pool.reduce((a, b) => (b.minutes > a.minutes ? b : a));
  return {
    ...plan,
    sections: plan.sections.map((s) => (s.id === target.id ? { ...s, minutes: Math.max(1, s.minutes + diff) } : s)),
  };
}

function collectPageRefs(input: ValidateInput): number[] {
  const refs: number[] = [];
  input.objectives?.objectives.forEach((o) => refs.push(...o.pageRefs));
  input.plan?.sections.forEach((s) => refs.push(...s.pageRefs));
  input.plan?.misconceptions.forEach((m) => refs.push(m.pageRef));
  input.worksheet?.questions.forEach((q) => { if (q.pageRef) refs.push(q.pageRef); });
  [input.exitQuiz, input.starterQuiz].forEach((quiz) => quiz?.questions.forEach((q) => { if (q.pageRef) refs.push(q.pageRef); }));
  return refs;
}

function ruleRealPages(input: ValidateInput): ValidationRuleResult {
  const sections = [SectionType.OBJECTIVES, SectionType.LESSON_PLAN, SectionType.WORKSHEET, SectionType.EXIT_QUIZ, SectionType.STARTER_QUIZ];
  if (!input.chapterPages) return skip("R3", "typed-topic kit has no chapter", sections);
  const validPages = new Set(input.chapterPages.map((p) => p.page));
  const bad = [...new Set(collectPageRefs(input).filter((p) => !validPages.has(p)))];
  return bad.length === 0
    ? ok("R3", "Every page reference exists in the chapter", sections)
    : fail("R3", `Page(s) not in the chapter: ${bad.join(", ")}`, sections);
}

function ruleQuoteGrounding(input: ValidateInput): ValidationRuleResult {
  const sections = [SectionType.LESSON_PLAN];
  if (!input.chapterPages || !input.plan) return skip("R4", "typed-topic kit or plan not ready", sections);
  const chapterText = input.chapterPages.map((p) => p.text).join(" ").toLowerCase();
  const keywords = input.plan.keywords;
  if (keywords.length === 0) return ok("R4", "No keywords to check", sections);
  const missing = keywords.filter((k) => !chapterText.includes(k.term.toLowerCase()));
  const coverage = (keywords.length - missing.length) / keywords.length;
  return coverage >= 0.7
    ? ok("R4", `${Math.round(coverage * 100)}% of keywords appear in the chapter text`, sections)
    : fail("R4", `Only ${Math.round(coverage * 100)}% of keywords appear in the chapter text: ${missing.map((m) => m.term).join(", ")}`, sections, "warning");
}

function ruleMcqShape(input: ValidateInput): ValidationRuleResult {
  const sections = [SectionType.EXIT_QUIZ, SectionType.STARTER_QUIZ];
  const quizzes = [input.exitQuiz, input.starterQuiz].filter((q): q is z.infer<typeof Quiz> => !!q);
  if (quizzes.length === 0) return skip("R5", "no quiz ready yet", sections);
  const misconceptionIds = new Set(input.plan?.misconceptions.map((m) => m.id) ?? []);

  const issues: string[] = [];
  for (const quiz of quizzes) {
    for (const q of quiz.questions) {
      const correctCount = q.options.filter((o) => o.correct).length;
      if (q.options.length !== 4 || correctCount !== 1) {
        issues.push(`${q.id}: ${q.options.length} options, ${correctCount} correct (need 4 and 1)`);
        continue;
      }
      for (const opt of q.options) {
        if (!opt.correct && (!opt.misconceptionId || !misconceptionIds.has(opt.misconceptionId))) {
          issues.push(`${q.id} option ${opt.id}: missing/unknown misconceptionId`);
        }
      }
    }
  }
  return issues.length === 0
    ? ok("R5", "Every quiz question has 4 options, 1 correct, and valid misconception ids", sections)
    : fail("R5", issues.join("; "), sections);
}

function ruleMisconceptionCoverage(input: ValidateInput): ValidationRuleResult {
  const sections = [SectionType.EXIT_QUIZ, SectionType.STARTER_QUIZ];
  if (!input.plan) return skip("R6", "lesson plan not ready", sections);
  const quizzes = [input.exitQuiz, input.starterQuiz].filter((q): q is z.infer<typeof Quiz> => !!q);
  if (quizzes.length === 0) return skip("R6", "no quiz ready yet", sections);
  const used = new Set(quizzes.flatMap((quiz) => quiz.questions.flatMap((q) => q.options.map((o) => o.misconceptionId))).filter(Boolean));
  const unused = input.plan.misconceptions.filter((m) => !used.has(m.id));
  return unused.length === 0
    ? ok("R6", "Every misconception is used by a quiz distractor", sections)
    : fail("R6", `Not used by any quiz distractor: ${unused.map((m) => m.id).join(", ")}`, sections);
}

function ruleAnswerKeyMatches(input: ValidateInput): ValidationRuleResult {
  const sections = [SectionType.WORKSHEET];
  if (!input.worksheet) return skip("R7", "worksheet not ready", sections);
  const issues: string[] = [];
  for (const q of input.worksheet.questions) {
    if (q.type === "fill_blank") {
      const blanks = (q.prompt.match(/____/g) ?? []).length;
      const slots = q.answer.split("|").length;
      if (blanks > 0 && blanks !== slots) issues.push(`${q.id}: ${blanks} blanks but ${slots} answers`);
    } else if (q.type === "mcq" || q.type === "assertion_reason") {
      if (q.options && !q.options.includes(q.answer)) issues.push(`${q.id}: answer isn't one of the options`);
    } else if (q.type === "match") {
      if (!q.matchPairs || q.matchPairs.length < 3) issues.push(`${q.id}: fewer than 3 match pairs`);
    } else if (q.type === "case_based") {
      if (!q.caseText || !q.subQuestions || q.subQuestions.length === 0) issues.push(`${q.id}: missing caseText/subQuestions`);
    }
  }
  return issues.length === 0
    ? ok("R7", "Every answer matches its question", sections)
    : fail("R7", issues.join("; "), sections);
}

function ruleWorksheetMarks(input: ValidateInput): ValidationRuleResult {
  const sections = [SectionType.WORKSHEET];
  if (!input.worksheet) return skip("R8", "worksheet not ready", sections);
  const sum = input.worksheet.questions.reduce((s, q) => s + q.marks, 0);
  return sum === input.worksheet.totalMarks
    ? ok("R8", `totalMarks (${input.worksheet.totalMarks}) matches the questions`, sections)
    : fail("R8", `totalMarks is ${input.worksheet.totalMarks}, questions sum to ${sum}`, sections);
}

/** R8 auto-fix: recompute totalMarks from the questions. */
export function autoFixWorksheetMarks(worksheet: z.infer<typeof Worksheet>): z.infer<typeof Worksheet> {
  return { ...worksheet, totalMarks: worksheet.questions.reduce((s, q) => s + q.marks, 0) };
}

const FORBIDDEN_LOW_RESOURCE_WORDS = ["projector", "laptop", "internet", "video", "printer", "tablet", "smartboard"];

function ruleLowResource(input: ValidateInput): ValidationRuleResult {
  const sections = [SectionType.LESSON_PLAN, SectionType.WORKSHEET];
  if (!input.lowResource) return skip("R9", "low-resource mode is off", sections);
  const issues: string[] = [];
  const materialsText = (input.plan?.sections.flatMap((s) => s.materials) ?? []).join(" ").toLowerCase();
  for (const word of FORBIDDEN_LOW_RESOURCE_WORDS) {
    if (materialsText.includes(word)) issues.push(`materials mention "${word}"`);
  }
  if (input.worksheet && input.worksheet.questions.length > 8) {
    issues.push(`worksheet has ${input.worksheet.questions.length} questions, low-resource max is 8`);
  }
  return issues.length === 0
    ? ok("R9", "Blackboard/chalk/local-object materials only, worksheet ≤ 8 questions", sections)
    : fail("R9", issues.join("; "), sections);
}

function collectLanguageFields(input: ValidateInput): { label: string; text: string }[] {
  const fields: { label: string; text: string }[] = [];
  if (input.objectives) {
    fields.push({ label: "chapterSummary", text: input.objectives.chapterSummary });
    input.objectives.objectives.forEach((o) => fields.push({ label: o.id, text: o.text }));
  }
  if (input.plan) {
    fields.push({ label: "title", text: input.plan.title }, { label: "learningOutcome", text: input.plan.learningOutcome }, { label: "homework", text: input.plan.homework });
    input.plan.sections.forEach((s) => fields.push({ label: `${s.id} teacherSays`, text: s.teacherSays }, { label: `${s.id} studentsDo`, text: s.studentsDo }));
  }
  if (input.worksheet) {
    input.worksheet.questions.forEach((q) => fields.push({ label: q.id, text: q.prompt }));
  }
  [input.exitQuiz, input.starterQuiz].forEach((quiz) => quiz?.questions.forEach((q) => fields.push({ label: q.id, text: q.stem })));
  return fields.filter((f) => f.text.trim().length >= 8); // skip ids/short tokens where script mix is meaningless
}

function ruleLanguage(input: ValidateInput): ValidationRuleResult {
  const sections = [SectionType.OBJECTIVES, SectionType.LESSON_PLAN, SectionType.WORKSHEET, SectionType.EXIT_QUIZ, SectionType.STARTER_QUIZ];
  const fields = collectLanguageFields(input);
  if (fields.length === 0) return skip("R10", "no generated text yet", sections);
  const bad = fields.filter((f) => {
    const ratio = devanagariRatio(f.text);
    return input.language === "hi" ? ratio < 0.6 : ratio > 0.1;
  });
  return bad.length === 0
    ? ok("R10", `All text matches the ${input.language === "hi" ? "Hindi" : "English"} language setting`, sections)
    : fail("R10", `Wrong script in: ${bad.slice(0, 5).map((f) => f.label).join(", ")}${bad.length > 5 ? "…" : ""}`, sections);
}

function ruleIds(input: ValidateInput): ValidationRuleResult {
  const sections = [SectionType.OBJECTIVES, SectionType.LESSON_PLAN, SectionType.WORKSHEET, SectionType.EXIT_QUIZ, SectionType.STARTER_QUIZ];
  const tagged: { id: string; re: RegExp }[] = [];
  input.objectives?.objectives.forEach((o) => tagged.push({ id: o.id, re: /^O\d+$/ }));
  input.plan?.misconceptions.forEach((m) => tagged.push({ id: m.id, re: /^M\d+$/ }));
  input.plan?.sections.forEach((s) => tagged.push({ id: s.id, re: /^S\d+$/ }));
  input.worksheet?.questions.forEach((q) => tagged.push({ id: q.id, re: /^W\d+$/ }));
  [input.exitQuiz, input.starterQuiz].forEach((quiz) => quiz?.questions.forEach((q) => tagged.push({ id: q.id, re: /^Q\d+$/ })));

  if (tagged.length === 0) return skip("R11", "no generated content yet", sections);

  const issues: string[] = [];
  const seen = new Set<string>();
  for (const { id, re } of tagged) {
    if (!re.test(id)) issues.push(`"${id}" doesn't match ${re}`);
    if (seen.has(id)) issues.push(`duplicate id "${id}"`);
    seen.add(id);
  }
  return issues.length === 0
    ? ok("R11", "All ids are unique and well-formed", sections)
    : fail("R11", issues.join("; "), sections);
}

function ruleMultiGradeRotation(input: ValidateInput): ValidationRuleResult {
  const sections = [SectionType.MULTIGRADE];
  if (!input.multiGrade) return skip("R12", "not a multi-grade kit", sections);
  const sorted = [...input.multiGrade.rotation].sort((a, b) => a.minuteFrom - b.minuteFrom);
  let cursor = 0;
  for (const r of sorted) {
    if (r.minuteFrom !== cursor) {
      return fail("R12", `Gap or overlap at minute ${cursor} (next block starts at ${r.minuteFrom})`, sections);
    }
    cursor = r.minuteTo;
  }
  if (cursor !== input.periodMinutes) {
    return fail("R12", `Rotation covers 0–${cursor}, period is ${input.periodMinutes} minutes`, sections);
  }
  const missingGrades = input.multiGrade.grades.filter((g) => !sorted.some((r) => r.teacherWith === g.grade));
  return missingGrades.length === 0
    ? ok("R12", "Rotation covers the whole period with no gaps and every grade gets teacher time", sections)
    : fail("R12", `Grade(s) never get teacher time: ${missingGrades.map((g) => g.grade).join(", ")}`, sections);
}

export function validateKit(input: ValidateInput): ValidationRuleResult[] {
  return [
    ruleObjectiveCoverage(input),
    ruleTimings(input),
    ruleRealPages(input),
    ruleQuoteGrounding(input),
    ruleMcqShape(input),
    ruleMisconceptionCoverage(input),
    ruleAnswerKeyMatches(input),
    ruleWorksheetMarks(input),
    ruleLowResource(input),
    ruleLanguage(input),
    ruleIds(input),
    ruleMultiGradeRotation(input),
  ];
}

/** Groups failed (non-warning) rules by the section(s) they concern, for the repair round. */
export function failedRulesBySection(results: ValidationRuleResult[]): Partial<Record<SectionType, string[]>> {
  const bySection: Partial<Record<SectionType, string[]>> = {};
  for (const r of results) {
    if (r.ok || r.severity === "warning") continue;
    for (const section of r.sections) {
      const guidance = RULE_GUIDANCE[r.rule];
      const line = guidance ? `[${r.rule}] ${r.detail} — ${guidance}` : `[${r.rule}] ${r.detail}`;
      (bySection[section] ??= []).push(line);
    }
  }
  return bySection;
}
