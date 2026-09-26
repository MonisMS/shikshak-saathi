import { NextResponse } from "next/server";
import * as z from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { Worksheet, Quiz } from "@/lib/ai/schemas";
import { SectionType } from "@/generated/prisma/enums";
import { autoGradeWorksheetQuestion, gradeQuizSubmission, worksheetMaxMarks, AI_GRADED_TYPES, type PerQuestionResult } from "@/lib/tests";

const Body = z.object({
  studentName: z.string().min(1).max(120),
  answers: z.record(z.string(), z.string()),
});

/** Public, unauthenticated submission. Deterministic question types are scored right
 * here; open-ended ones wait for the teacher's "Evaluate with AI" pass. */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const publication = await prisma.testPublication.findUnique({
    where: { token },
    include: { kit: { include: { sections: true } } },
  });
  if (!publication) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!publication.isOpen) return NextResponse.json({ error: "This test is closed" }, { status: 409 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  const { studentName, answers } = parsed.data;

  const section = publication.kit.sections.find((s) => s.type === publication.sectionType);

  if (publication.sectionType === SectionType.WORKSHEET) {
    const worksheet = Worksheet.safeParse(section?.content);
    if (!worksheet.success) return NextResponse.json({ error: "Not available" }, { status: 409 });

    const perQuestion: Record<string, PerQuestionResult> = {};
    let autoMarks = 0;
    for (const q of worksheet.data.questions) {
      const given = answers[q.id] ?? "";
      if (AI_GRADED_TYPES.has(q.type)) {
        perQuestion[q.id] = { marks: null, max: q.marks, method: "ai" };
        continue;
      }
      const result = autoGradeWorksheetQuestion(q, given);
      if (result) {
        perQuestion[q.id] = result;
        autoMarks += result.marks ?? 0;
      }
    }

    const submission = await prisma.testSubmission.create({
      data: {
        publicationId: publication.id,
        studentName,
        answers,
        perQuestion: perQuestion as unknown as Prisma.InputJsonValue,
        autoMarks,
        maxMarks: worksheetMaxMarks(worksheet.data.questions),
      },
    });
    return NextResponse.json({ ok: true, submissionId: submission.id });
  }

  const quiz = Quiz.safeParse(section?.content);
  if (!quiz.success) return NextResponse.json({ error: "Not available" }, { status: 409 });

  const { perQuestion, autoMarks, maxMarks } = gradeQuizSubmission(quiz.data, answers);
  const submission = await prisma.testSubmission.create({
    data: {
      publicationId: publication.id,
      studentName,
      answers,
      perQuestion: perQuestion as unknown as Prisma.InputJsonValue,
      autoMarks,
      maxMarks,
      evaluatedAt: new Date(), // fully auto-graded, nothing left for AI
    },
  });
  return NextResponse.json({ ok: true, submissionId: submission.id, score: `${autoMarks}/${maxMarks}` });
}
