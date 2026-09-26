import { NextResponse } from "next/server";
import * as z from "zod";
import { nanoid } from "nanoid";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { SectionStatus, SectionType } from "@/generated/prisma/enums";

const PUBLISHABLE_TYPES = [SectionType.WORKSHEET, SectionType.EXIT_QUIZ, SectionType.STARTER_QUIZ] as const;

const PublishBody = z.object({
  kitId: z.string(),
  sectionType: z.enum(PUBLISHABLE_TYPES),
  gradingInstructions: z.string().max(1000).optional(),
});

/** Publish a WORKSHEET/quiz section as a student-attemptable test with a public link + QR.
 * Reuses an existing open publication for the same kit+section instead of creating a
 * duplicate, so re-clicking "Publish" doesn't fragment submissions across links. */
export async function POST(req: Request) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = PublishBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  const body = parsed.data;

  const kit = await prisma.lessonKit.findFirst({ where: { id: body.kitId, teacherId: teacher.id } });
  if (!kit) return NextResponse.json({ error: "Kit not found" }, { status: 404 });

  const section = await prisma.kitSection.findUnique({ where: { kitId_type: { kitId: body.kitId, type: body.sectionType } } });
  if (!section || section.status !== SectionStatus.READY) {
    return NextResponse.json({ error: "That section isn't generated yet" }, { status: 409 });
  }

  const existing = await prisma.testPublication.findFirst({
    where: { kitId: body.kitId, sectionType: body.sectionType, isOpen: true },
  });
  if (existing) {
    const updated = body.gradingInstructions === undefined
      ? existing
      : await prisma.testPublication.update({ where: { id: existing.id }, data: { gradingInstructions: body.gradingInstructions } });
    return NextResponse.json({ id: updated.id, token: updated.token });
  }

  const publication = await prisma.testPublication.create({
    data: {
      kitId: body.kitId,
      teacherId: teacher.id,
      sectionType: body.sectionType,
      token: nanoid(12),
      gradingInstructions: body.gradingInstructions,
    },
  });

  return NextResponse.json({ id: publication.id, token: publication.token }, { status: 201 });
}

/** List every test the teacher has published, most recent first. */
export async function GET() {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const publications = await prisma.testPublication.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" },
    include: {
      kit: { select: { id: true, title: true } },
      submissions: { select: { id: true, evaluatedAt: true } },
    },
  });

  return NextResponse.json({
    tests: publications.map((p) => ({
      id: p.id,
      token: p.token,
      kitId: p.kit.id,
      kitTitle: p.kit.title,
      sectionType: p.sectionType,
      isOpen: p.isOpen,
      createdAt: p.createdAt,
      submissionCount: p.submissions.length,
      evaluatedCount: p.submissions.filter((s) => s.evaluatedAt).length,
    })),
  });
}
