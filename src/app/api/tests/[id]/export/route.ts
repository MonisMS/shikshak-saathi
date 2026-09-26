import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import type { PerQuestionResult } from "@/lib/tests";

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const publication = await prisma.testPublication.findFirst({
    where: { id, teacherId: teacher.id },
    include: { kit: { select: { title: true } }, submissions: { orderBy: { submittedAt: "asc" } } },
  });
  if (!publication) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const questionIds = Array.from(
    new Set(publication.submissions.flatMap((s) => Object.keys((s.perQuestion as unknown as Record<string, PerQuestionResult>) ?? {}))),
  ).sort();

  const header = ["Student", "Total", "Max", "Submitted at", ...questionIds.map((q) => `${q} marks`)];
  const rows = publication.submissions.map((s) => {
    const perQuestion = (s.perQuestion as unknown as Record<string, PerQuestionResult>) ?? {};
    const total = s.autoMarks + (s.aiMarks ?? 0);
    return [
      csvCell(s.studentName),
      String(total),
      String(s.maxMarks),
      csvCell(s.submittedAt.toISOString()),
      ...questionIds.map((q) => String(perQuestion[q]?.marks ?? "")),
    ].join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");
  const filename = `${publication.kit.title.replace(/[^a-z0-9]+/gi, "-")}-results.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
