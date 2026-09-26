import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { generateJSON } from "@/lib/ai/gemini";
import { RemedialPlan } from "@/lib/ai/schemas";
import { buildFixPrompt } from "@/lib/ai/prompts/fix";
import type { PromptContext } from "@/lib/ai/prompts/context";
import type { Prisma } from "@/generated/prisma/client";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** F46/F47/P7.5 DB part (Ujjwal, U8). Response shape `{targetKitId}` matches
 * src/components/results/insights-view.tsx's addFix() exactly. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: kitId } = await params;
  const kit = await prisma.lessonKit.findFirst({
    where: { id: kitId, teacherId: teacher.id },
    include: { classroom: true, chapter: true },
  });
  if (!kit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const eligible = (
    await prisma.misconception.findMany({
      where: { kitId: kit.id, status: "OPEN" },
      orderBy: { percent: "desc" },
    })
  )
    .filter((m) => m.percent >= 0.1)
    .slice(0, 3);

  if (eligible.length === 0) {
    return NextResponse.json({ error: "No misconceptions eligible for a fix yet" }, { status: 400 });
  }

  const ctx: PromptContext = {
    grade: kit.classroom?.grades[0] ?? kit.chapter?.grade ?? 7,
    subject: kit.classroom?.subject ?? kit.chapter?.subject ?? "General",
    language: kit.language,
    classSize: kit.classSize,
    periodMinutes: kit.periodMinutes,
    lowResource: true, // fixes are always blackboard-only (F46)
  };

  const built = buildFixPrompt(
    ctx,
    eligible.map((m) => ({ code: m.code, label: m.label, correction: m.correction ?? "" })),
  );
  const result = await generateJSON({ schema: RemedialPlan, system: built.system, user: built.user });

  let targetKit = await prisma.lessonKit.findFirst({
    where: {
      classroomId: kit.classroomId,
      scheduledFor: { gt: kit.scheduledFor ?? new Date() },
    },
    orderBy: { scheduledFor: "asc" },
  });

  if (!targetKit) {
    const baseDate = kit.scheduledFor ?? new Date();
    targetKit = await prisma.lessonKit.create({
      data: {
        teacherId: kit.teacherId,
        classroomId: kit.classroomId,
        chapterId: kit.chapterId,
        title: `${kit.title} (Day ${kit.dayNumber + 1})`,
        language: kit.language,
        periodMinutes: kit.periodMinutes,
        dayNumber: kit.dayNumber + 1,
        lowResource: kit.lowResource,
        classSize: kit.classSize,
        basedOnKitId: kit.id,
        scheduledFor: new Date(baseDate.getTime() + MS_PER_DAY),
        status: "DRAFT",
        sections: { create: [{ type: "OBJECTIVES" }, { type: "LESSON_PLAN" }] },
      },
    });
  }

  const byCode = new Map(eligible.map((m) => [m.code, m]));

  await prisma.$transaction([
    ...result.data.activities.map((activity) => {
      const misconception = byCode.get(activity.misconceptionId);
      if (!misconception) throw new Error(`Generated fix references unknown misconception ${activity.misconceptionId}`);
      return prisma.fixActivity.create({
        data: {
          misconceptionId: misconception.id,
          targetKitId: targetKit.id,
          title: activity.title,
          minutes: activity.minutes,
          steps: activity.steps as Prisma.InputJsonValue,
          materials: activity.materials as Prisma.InputJsonValue,
          checkQuestion: activity.checkQuestion,
          language: kit.language,
          status: "ADDED",
        },
      });
    }),
    prisma.misconception.updateMany({
      where: { id: { in: eligible.map((m) => m.id) } },
      data: { status: "FIX_PLANNED" },
    }),
    prisma.activityLog.create({
      data: { teacherId: teacher.id, type: "FIX_ADDED", kitId: targetKit.id },
    }),
  ]);

  return NextResponse.json({ targetKitId: targetKit.id });
}
