import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";

export async function GET() {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const chapters = await prisma.chapter.findMany({
    orderBy: [{ grade: "asc" }, { subject: "asc" }, { chapterNo: "asc" }],
    select: { id: true, grade: true, subject: true, chapterNo: true, titleEn: true, titleHi: true },
  });

  const groups = new Map<string, { grade: number; subject: string; chapters: typeof chapters }>();
  for (const ch of chapters) {
    const key = `${ch.grade}::${ch.subject}`;
    if (!groups.has(key)) groups.set(key, { grade: ch.grade, subject: ch.subject, chapters: [] });
    groups.get(key)!.chapters.push(ch);
  }

  const result = Array.from(groups.values()).map((g) => ({
    grade: g.grade,
    subject: g.subject,
    chapters: g.chapters.map(({ id, chapterNo, titleEn, titleHi }) => ({ id, chapterNo, titleEn, titleHi })),
  }));

  return NextResponse.json(result);
}
