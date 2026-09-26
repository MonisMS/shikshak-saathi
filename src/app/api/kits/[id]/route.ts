import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const kit = await prisma.lessonKit.findFirst({
    where: { id, teacherId: teacher.id },
    include: { sections: true, chapter: true, classroom: true },
  });
  if (!kit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ kit });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const result = await prisma.lessonKit.deleteMany({ where: { id, teacherId: teacher.id } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
