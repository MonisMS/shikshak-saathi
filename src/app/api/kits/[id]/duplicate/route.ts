import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const source = await prisma.lessonKit.findFirst({
    where: { id, teacherId: teacher.id },
    include: { sections: true },
  });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const copy = await prisma.lessonKit.create({
    data: {
      teacherId: teacher.id,
      classroomId: source.classroomId,
      chapterId: source.chapterId,
      title: `${source.title} (copy)`,
      language: source.language,
      periodMinutes: source.periodMinutes,
      lowResource: source.lowResource,
      targetGrades: source.targetGrades,
      topic: source.topic,
      teacherNote: source.teacherNote,
      pageFrom: source.pageFrom,
      pageTo: source.pageTo,
      classSize: source.classSize,
      options: source.options ?? undefined,
      sections: { create: source.sections.map((s) => ({ type: s.type })) },
    },
  });

  return NextResponse.json({ id: copy.id }, { status: 201 });
}
