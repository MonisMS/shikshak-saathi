// NOTE (team coordination, confirmed with Monis): POST here (generate /
// regenerate a section, roadmap P3.4 / M4) is Monis's — do not add a POST
// handler in this file without checking with him first. This file currently
// only exports PATCH (F19, teacher edits of an already-generated section).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { SECTION_SCHEMAS } from "@/lib/ai/schemas";
import { SectionType, type Prisma } from "@/generated/prisma/client";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; type: string }> }
) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id, type } = await params;
  if (!(type in SECTION_SCHEMAS)) {
    return NextResponse.json({ error: "Unknown section type" }, { status: 400 });
  }
  const sectionType = type as SectionType;

  const kit = await prisma.lessonKit.findFirst({ where: { id, teacherId: teacher.id } });
  if (!kit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const schema = SECTION_SCHEMAS[sectionType];
  const parsed = schema.safeParse(body?.content);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid content" },
      { status: 400 }
    );
  }

  const section = await prisma.kitSection.findUnique({
    where: { kitId_type: { kitId: id, type: sectionType } },
  });
  if (!section) return NextResponse.json({ error: "Section not found" }, { status: 404 });

  const nextVersion = section.version + 1;
  const content = parsed.data as Prisma.InputJsonValue;

  const [updated] = await prisma.$transaction([
    prisma.kitSection.update({
      where: { id: section.id },
      data: { content, editedByTeacher: true, version: nextVersion, status: "READY", error: null },
    }),
    prisma.sectionRevision.create({
      data: { sectionId: section.id, version: nextVersion, content, source: "TEACHER" },
    }),
    prisma.activityLog.create({
      data: { teacherId: teacher.id, type: "SECTION_EDITED", kitId: id, meta: { sectionType } },
    }),
  ]);

  return NextResponse.json({ section: updated });
}
