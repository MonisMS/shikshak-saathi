import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { generateJSON } from "@/lib/ai/gemini";
import { buildScanPrompt } from "@/lib/ai/prompts/scan";
import { Worksheet, Quiz, ScannedSheet } from "@/lib/ai/schemas";
import { SectionType } from "@/generated/prisma/enums";
import { autoGradeWorksheetQuestion, worksheetMaxMarks, resolveScannedWorksheetAnswer, AI_GRADED_TYPES, type PerQuestionResult } from "@/lib/tests";

export const maxDuration = 60;
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPTED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/heic"]);

/**
 * Print & scan flow: teacher prints the answer sheet, students fill it on paper,
 * teacher photographs each sheet and uploads it here — one photo per request, one
 * TestSubmission per photo, same grading path as an online submission (deterministic
 * question types auto-score immediately, open-ended ones wait for "Evaluate with AI").
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const publication = await prisma.testPublication.findFirst({
    where: { id, teacherId: teacher.id },
    include: { kit: { include: { sections: true } } },
  });
  if (!publication) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "Missing image file" }, { status: 400 });
  if (!ACCEPTED_MIME.has(file.type)) return NextResponse.json({ error: "Upload a JPEG, PNG, WEBP or HEIC photo" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photo is too large (max 4MB) — try a lower-resolution photo" }, { status: 400 });

  const section = publication.kit.sections.find((s) => s.type === publication.sectionType);

  if (publication.sectionType === SectionType.WORKSHEET) {
    const worksheet = Worksheet.safeParse(section?.content);
    if (!worksheet.success) return NextResponse.json({ error: "Worksheet content missing or invalid" }, { status: 409 });

    const { system, user } = buildScanPrompt(
      worksheet.data.questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: q.options })),
    );
    const scanned = await runScan(system, user, file);
    if (!scanned.ok) return NextResponse.json({ error: scanned.error }, { status: 502 });

    const questionsById = new Map(worksheet.data.questions.map((q) => [q.id, q]));
    const answers = Object.fromEntries(
      scanned.data.answers.map((a) => {
        const q = questionsById.get(a.questionId);
        return [a.questionId, q ? resolveScannedWorksheetAnswer(q, a.answer) : a.answer];
      }),
    );
    const perQuestion: Record<string, PerQuestionResult> = {};
    let autoMarks = 0;
    for (const q of worksheet.data.questions) {
      if (AI_GRADED_TYPES.has(q.type)) {
        perQuestion[q.id] = { marks: null, max: q.marks, method: "ai" };
        continue;
      }
      const result = autoGradeWorksheetQuestion(q, answers[q.id] ?? "");
      if (result) {
        perQuestion[q.id] = result;
        autoMarks += result.marks ?? 0;
      }
    }

    const submission = await prisma.testSubmission.create({
      data: {
        publicationId: publication.id,
        studentName: scanned.data.studentName,
        source: "SCAN",
        answers,
        perQuestion: perQuestion as unknown as Prisma.InputJsonValue,
        autoMarks,
        maxMarks: worksheetMaxMarks(worksheet.data.questions),
      },
    });
    const uncertainCount = scanned.data.answers.filter((a) => a.uncertain).length;
    return NextResponse.json({ ok: true, submissionId: submission.id, studentName: scanned.data.studentName, uncertainCount });
  }

  const quiz = Quiz.safeParse(section?.content);
  if (!quiz.success) return NextResponse.json({ error: "Quiz content missing or invalid" }, { status: 409 });

  const { system, user } = buildScanPrompt(quiz.data.questions.map((q) => ({ id: q.id, type: "quiz" as const, prompt: q.stem, options: q.options.map((o) => `${o.id}. ${o.text}`) })));
  const scanned = await runScan(system, user, file);
  if (!scanned.ok) return NextResponse.json({ error: scanned.error }, { status: 502 });

  const answers = Object.fromEntries(scanned.data.answers.map((a) => [a.questionId, a.answer.trim().toUpperCase().slice(0, 1)]));
  const perQuestion: Record<string, PerQuestionResult> = {};
  let autoMarks = 0;
  for (const q of quiz.data.questions) {
    const correctOption = q.options.find((o) => o.correct);
    const correct = !!correctOption && answers[q.id] === correctOption.id;
    perQuestion[q.id] = { marks: correct ? 1 : 0, max: 1, method: "auto" };
    if (correct) autoMarks += 1;
  }

  const submission = await prisma.testSubmission.create({
    data: {
      publicationId: publication.id,
      studentName: scanned.data.studentName,
      source: "SCAN",
      answers,
      perQuestion: perQuestion as unknown as Prisma.InputJsonValue,
      autoMarks,
      maxMarks: quiz.data.questions.length,
      evaluatedAt: new Date(), // MCQ is fully auto-graded, nothing left for AI
    },
  });
  const uncertainCount = scanned.data.answers.filter((a) => a.uncertain).length;
  return NextResponse.json({ ok: true, submissionId: submission.id, studentName: scanned.data.studentName, uncertainCount });
}

async function runScan(system: string, user: string, file: Blob): Promise<{ ok: true; data: import("zod").infer<typeof ScannedSheet> } | { ok: false; error: string }> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const data = Buffer.from(bytes).toString("base64");
    const { data: parsed } = await generateJSON({
      schema: ScannedSheet,
      system,
      user,
      parts: [{ inlineData: { mimeType: file.type, data } }],
    });
    return { ok: true, data: parsed };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not read this photo" };
  }
}
