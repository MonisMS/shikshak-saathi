import {
  Document,
  Header,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { z } from "zod";
import type { LessonPlan, Worksheet, Quiz, ParentNote } from "@/lib/ai/schemas";

/**
 * DOCX export (F25, §12.2), client-side only (`Packer.toBlob`, no server round-trip).
 * Structure adapted (MIT, idea + shape only — the Angular DI wrappers aren't needed)
 * from `references/Shiksha-Copilot/.../lesson-docx-generator.service.ts` +
 * `docx-utility.service.ts`: a Header table per section, HEADING_1/HEADING_2 structure,
 * one `Document` section per document so each starts on its own page.
 *
 * Devanagari shaping: Word applies Indic shaping to the complex-script (`cs`) font slot,
 * not `ascii`/`hAnsi` — every TextRun uses the exact font block from §5.2's reference.
 */

const DOCX_FONT = { ascii: "Calibri", hAnsi: "Calibri", cs: "Nirmala UI" };

function run(text: string, bold = false): TextRun {
  return new TextRun({ text, bold, font: DOCX_FONT, boldComplexScript: bold, sizeComplexScript: 24, size: 24 });
}

function para(text: string, bold = false): Paragraph {
  return new Paragraph({ children: [run(text, bold)], spacing: { before: 80, after: 80 } });
}

function heading1(text: string): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [run(text, true)], spacing: { after: 200 } });
}

function heading2(text: string): Paragraph {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, children: [run(text, true)], spacing: { before: 160, after: 100 } });
}

function kitHeader(title: string): { default: Header } {
  return {
    default: new Header({
      children: [
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [new TableCell({ children: [para(title, true)] })],
            }),
          ],
        }),
        new Paragraph({ text: "", spacing: { after: 120 } }),
      ],
    }),
  };
}

type PlanData = z.infer<typeof LessonPlan>;
type WorksheetData = z.infer<typeof Worksheet>;
type QuizData = z.infer<typeof Quiz>;
type ParentNoteData = z.infer<typeof ParentNote>;

const PHASE_LABEL: Record<string, string> = {
  warmup_fix: "Start with: fix",
  starter: "Starter",
  explain: "Explain",
  activity: "Activity",
  practice: "Practice",
  exit_check: "Exit check",
  wrap_up: "Wrap up",
};

function planSection(title: string, plan: PlanData) {
  return {
    headers: kitHeader(title),
    children: [
      heading1("Lesson Plan"),
      para(plan.title, true),
      para(plan.learningOutcome),
      heading2("Prior Knowledge"),
      ...plan.priorKnowledge.map((p) => para(`• ${p}`)),
      heading2("Key Learning Points"),
      ...plan.keyLearningPoints.map((p) => para(`• ${p}`)),
      heading2("Keywords"),
      ...plan.keywords.map((k) => para(`${k.term}: ${k.definition}`)),
      heading2("Common Misconceptions"),
      ...plan.misconceptions.map((m) => para(`${m.id}. ${m.misconception} — ${m.correction} (p.${m.pageRef})`)),
      heading2("Timeline"),
      ...plan.sections.flatMap((s) => [
        para(`${s.minutes} min · ${PHASE_LABEL[s.phase] ?? s.phase} · ${s.title}`, true),
        para(`Teacher: ${s.teacherSays}`),
        para(`Students: ${s.studentsDo}`),
        ...(s.materials.length ? [para(`Materials: ${s.materials.join(", ")}`)] : []),
      ]),
      heading2("Homework"),
      para(plan.homework),
    ],
  };
}

function worksheetSection(title: string, worksheet: WorksheetData, showAnswers: boolean) {
  return {
    headers: kitHeader(title),
    children: [
      heading1(showAnswers ? "Worksheet — Answer Key" : "Worksheet"),
      para(worksheet.title, true),
      para(worksheet.instructions),
      ...worksheet.questions.flatMap((q, i) => {
        const lines = [para(`${i + 1}. (${q.marks} ${q.marks === 1 ? "mark" : "marks"}) ${q.prompt}`, true)];
        if (q.caseText) lines.push(para(q.caseText));
        if (q.options) lines.push(...q.options.map((o, oi) => para(`${String.fromCharCode(65 + oi)}. ${o}`)));
        if (q.matchPairs) lines.push(...q.matchPairs.map((mp) => para(`${mp.left} — ${showAnswers ? mp.right : "________"}`)));
        if (q.subQuestions) lines.push(...q.subQuestions.map((sq, si) => para(`${si + 1}. ${sq}`)));
        if (showAnswers) lines.push(para(`Answer: ${q.answer}`, true));
        return lines;
      }),
      para(`Total: ${worksheet.totalMarks} marks`, true),
    ],
  };
}

function quizSection(title: string, quiz: QuizData, teacherView: boolean) {
  return {
    headers: kitHeader(title),
    children: [
      heading1(`${quiz.kind === "exit" ? "Exit" : "Starter"} Quiz${teacherView ? " — Answer Key" : ""}`),
      ...quiz.questions.flatMap((q, i) => [
        para(`${i + 1}. ${q.stem}`, true),
        ...q.options.map((o) => {
          const suffix = teacherView && o.correct ? " (correct)" : teacherView && o.misconceptionId ? ` (${o.misconceptionId})` : "";
          return para(`${o.id}. ${o.text}${suffix}`);
        }),
      ]),
    ],
  };
}

function parentNoteSection(title: string, note: ParentNoteData) {
  return {
    headers: kitHeader(title),
    children: [
      heading1("Parent Note"),
      para(`Learned today: ${note.learnedToday}`),
      para(`Homework: ${note.homework}`),
      para(`Home activity: ${note.homeActivity}`),
      ...(note.askYourChild.length ? [heading2("Ask your child"), ...note.askYourChild.map((q) => para(`• ${q}`))] : []),
    ],
  };
}

export type DocKind = "plan" | "worksheet" | "answers" | "quiz" | "quizkey" | "parent";

export interface KitDocxInput {
  title: string;
  plan?: PlanData;
  worksheet?: WorksheetData;
  quiz?: QuizData;
  parentNote?: ParentNoteData;
}

/** Builds one Document with one docx `section` (own page) per requested, available doc. */
export async function buildKitDocx(input: KitDocxInput, docs: DocKind[]): Promise<Blob> {
  const sections = docs.flatMap((doc) => {
    if (doc === "plan" && input.plan) return [planSection(input.title, input.plan)];
    if (doc === "worksheet" && input.worksheet) return [worksheetSection(input.title, input.worksheet, false)];
    if (doc === "answers" && input.worksheet) return [worksheetSection(input.title, input.worksheet, true)];
    if (doc === "quiz" && input.quiz) return [quizSection(input.title, input.quiz, false)];
    if (doc === "quizkey" && input.quiz) return [quizSection(input.title, input.quiz, true)];
    if (doc === "parent" && input.parentNote) return [parentNoteSection(input.title, input.parentNote)];
    return [];
  });

  if (sections.length === 0) sections.push({ headers: kitHeader(input.title), children: [para("Nothing to export yet.")] });

  const doc = new Document({ sections });
  return Packer.toBlob(doc);
}

/** Triggers a browser download of the blob — no server round-trip. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
