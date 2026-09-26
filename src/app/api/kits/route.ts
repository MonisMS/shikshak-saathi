import { NextResponse } from "next/server";
import { SourcePage } from "@/lib/kit-source";
import * as z from "zod";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import type { KitStatus } from "@/generated/prisma/client";

const OptionalSectionType = z.enum([
  "WORKSHEET",
  "EXIT_QUIZ",
  "STARTER_QUIZ",
  "SUMMATIVE",
  "MULTIGRADE",
  "BLACKBOARD",
  "REMEDIAL",
  "PARENT_NOTE",
]);

const DEFAULT_OPTIONAL_SECTIONS = ["WORKSHEET", "EXIT_QUIZ"] as const;
const ALWAYS_ON_SECTIONS = ["OBJECTIVES", "LESSON_PLAN"] as const;

const CreateKitBody = z
  .object({
    chapterId: z.string().optional(),
    topic: z.string().max(2000).optional(),
    classroomId: z.string().optional(),
    language: z.enum(["hi", "en"]),
    periodMinutes: z.number().int().min(20).max(90).default(40),
    classSize: z.number().int().min(1).max(200).default(40),
    lowResource: z.boolean().default(false),
    targetGrades: z.array(z.number().int()).optional(),
    teacherNote: z.string().max(500).optional(),
    sections: z.array(OptionalSectionType).optional(),
    scheduledFor: z.string().datetime().optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    localContext: z.boolean().optional(),
    grade: z.number().int().min(1).max(12).optional(),
    subject: z.string().max(60).optional(),
    sourceName: z.string().max(200).optional(),
    sourcePages: z.array(SourcePage).min(1).max(400).optional(),
  })
  .refine((b) => b.chapterId || b.topic || b.sourcePages, {
    message: "Pick a chapter, type a topic or upload material",
  });

export async function POST(req: Request) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = CreateKitBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const body = parsed.data;

  if (body.classroomId) {
    const classroom = await prisma.classroom.findFirst({
      where: { id: body.classroomId, teacherId: teacher.id },
    });
    if (!classroom) return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
  }

  const sourceName = body.sourceName?.trim() || "Uploaded material";
  let title = body.topic ?? (body.sourcePages ? sourceName : "Untitled kit");
  if (!body.chapterId && body.grade && body.subject) title = `Class ${body.grade} ${body.subject} — ${title}`;
  if (body.chapterId) {
    const chapter = await prisma.chapter.findUnique({ where: { id: body.chapterId } });
    if (!chapter) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    title = `Class ${chapter.grade} ${chapter.subject} Ch ${chapter.chapterNo} — ${chapter.titleEn}`;
  }

  const optionalSections = body.sections?.length ? body.sections : [...DEFAULT_OPTIONAL_SECTIONS];
  const sectionTypes = Array.from(new Set([...ALWAYS_ON_SECTIONS, ...optionalSections]));

  const kit = await prisma.lessonKit.create({
    data: {
      teacherId: teacher.id,
      classroomId: body.classroomId,
      chapterId: body.chapterId,
      title,
      language: body.language,
      periodMinutes: body.periodMinutes,
      classSize: body.classSize,
      lowResource: body.lowResource,
      targetGrades: body.targetGrades ?? [],
      topic: body.topic,
      teacherNote: body.teacherNote,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
      options: {
        sections: optionalSections,
        difficulty: body.difficulty,
        localContext: body.localContext,
        grade: body.grade,
        subject: body.subject,
        ...(body.sourcePages && !body.chapterId ? { source: { name: sourceName, pages: body.sourcePages } } : {}),
      },
      sections: { create: sectionTypes.map((type) => ({ type })) },
    },
  });

  await prisma.activityLog.create({
    data: { teacherId: teacher.id, type: "KIT_CREATED", kitId: kit.id, minutesSavedEstimate: 60 },
  });

  return NextResponse.json({ id: kit.id }, { status: 201 });
}

export async function GET(req: Request) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const classroomId = searchParams.get("classroomId") ?? undefined;
  const status = searchParams.get("status") as KitStatus | null;
  const q = searchParams.get("q") ?? undefined;

  const kits = await prisma.lessonKit.findMany({
    where: {
      teacherId: teacher.id,
      ...(classroomId ? { classroomId } : {}),
      ...(status ? { status } : {}),
      ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      chapter: { select: { titleEn: true, titleHi: true } },
      classroom: { select: { name: true } },
    },
  });

  return NextResponse.json({ kits });
}
