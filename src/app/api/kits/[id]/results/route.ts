import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { Quiz, LessonPlan } from "@/lib/ai/schemas";
import { misconceptionCounts } from "@/lib/misconceptions";
import { SectionType, SectionStatus } from "@/generated/prisma/client";

/** F40/P7.1 (Ujjwal, U8). Body matches src/components/results/tally-grid.tsx exactly. */
const ResultsBody = z.object({
  method: z.literal("TALLY"),
  studentsPresent: z.number().int().min(0).max(500),
  tally: z.record(z.string(), z.record(z.string(), z.number().int().min(0))),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: kitId } = await params;
  const kit = await prisma.lessonKit.findFirst({
    where: { id: kitId, teacherId: teacher.id },
    include: { sections: true },
  });
  if (!kit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsedBody = ResultsBody.safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { studentsPresent, tally } = parsedBody.data;

  const quizSection = kit.sections.find((s) => s.type === SectionType.EXIT_QUIZ);
  const planSection = kit.sections.find((s) => s.type === SectionType.LESSON_PLAN);
  if (quizSection?.status !== SectionStatus.READY || planSection?.status !== SectionStatus.READY) {
    return NextResponse.json({ error: "Exit quiz and lesson plan must be READY before recording results" }, { status: 409 });
  }
  const quiz = Quiz.parse(quizSection.content);
  const plan = LessonPlan.parse(planSection.content);

  const session = await prisma.quizSession.create({
    data: {
      kitId: kit.id,
      classroomId: kit.classroomId,
      method: "TALLY",
      studentsPresent,
    },
  });

  const tallyRows = Object.entries(tally).flatMap(([questionId, options]) => {
    const question = quiz.questions.find((q) => q.id === questionId);
    return Object.entries(options).map(([optionKey, count]) => ({
      sessionId: session.id,
      questionId,
      optionKey,
      count,
      isCorrect: question?.options.find((o) => o.id === optionKey)?.correct ?? false,
    }));
  });
  if (tallyRows.length > 0) {
    await prisma.questionTally.createMany({ data: tallyRows });
  }

  const rows = misconceptionCounts(quiz, plan, tally, studentsPresent);
  if (rows.length > 0) {
    await prisma.misconception.createMany({
      data: rows.map((r) => ({
        kitId: kit.id,
        sessionId: session.id,
        code: r.code,
        label: r.label,
        correction: r.correction,
        questionIds: r.questionIds,
        studentCount: r.studentCount,
        percent: r.percent,
        status: "OPEN",
      })),
    });
  }

  await prisma.activityLog.create({
    data: { teacherId: teacher.id, type: "QUIZ_RESULTS_RECORDED", kitId: kit.id },
  });

  return NextResponse.json({ ok: true, sessionId: session.id, misconceptions: rows });
}
