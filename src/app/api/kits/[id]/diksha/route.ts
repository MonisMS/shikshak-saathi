import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { searchDiksha, loadDikshaFallback, type DikshaResult, type Medium } from "@/lib/diksha";
import type { Prisma } from "@/generated/prisma/client";

/** F66/U12b: "Related DIKSHA resources" panel. Cached on LessonKit.diksha so
 * repeat visits don't re-hit the government API (unknown uptime, §11.3). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: kitId } = await params;
  const kit = await prisma.lessonKit.findFirst({
    where: { id: kitId, teacherId: teacher.id },
    include: { chapter: true, classroom: true },
  });
  if (!kit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (kit.diksha) {
    return NextResponse.json({ results: kit.diksha as unknown as DikshaResult[], cached: true });
  }

  const query = kit.chapter?.titleEn ?? kit.topic ?? kit.title;
  const grade = kit.classroom?.grades[0] ?? kit.chapter?.grade ?? 7;
  const subject = kit.classroom?.subject ?? kit.chapter?.subject ?? "Science";
  const medium: Medium = kit.language === "hi" ? "Hindi" : "English";

  let results: DikshaResult[];
  let fromFallback = false;
  try {
    results = await searchDiksha({ query, grade, subject, medium });
    // A live call with zero hits is as unhelpful to the teacher as a network
    // failure — chapter titles often don't match DIKSHA's indexed wording
    // (e.g. "Acidic/Basic" vs their "Acids/Bases"), so fall back to the
    // curated cache rather than showing an empty panel.
    if (results.length === 0) {
      results = await loadDikshaFallback();
      fromFallback = true;
    }
  } catch {
    results = await loadDikshaFallback();
    fromFallback = true;
  }

  await prisma.lessonKit.update({
    where: { id: kit.id },
    data: { diksha: results as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ results, cached: false, fromFallback });
}
