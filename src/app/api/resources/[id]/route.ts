import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { parsePages } from "@/lib/resources";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const r = await prisma.teachingResource.findFirst({ where: { id, teacherId: teacher.id } });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: r.id, title: r.title, kind: r.kind, sourceUrl: r.sourceUrl, pages: parsePages(r.pages) });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { id } = await params;
  const result = await prisma.teachingResource.deleteMany({ where: { id, teacherId: teacher.id } });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
