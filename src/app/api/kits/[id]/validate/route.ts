import { NextResponse } from "next/server";
import { readKitOptions } from "@/lib/kit-source";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { getKitForTeacher } from "@/lib/scope";
import { RevisionSource, SectionStatus, SectionType, type Prisma } from "@/generated/prisma/client";
import { Objectives, LessonPlan, Worksheet, Quiz, MultiGrade } from "@/lib/ai/schemas";
import { validateKit, autoFixTimings, autoFixWorksheetMarks, failedRulesBySection, type ValidateInput } from "@/lib/validate";
import type { ChapterPage } from "@/lib/chapters";
import type { z } from "zod";

/**
 * Runs the deterministic validator (§10.6, no AI) over a kit's current sections,
 * applies the two code-only auto-fixes (R2 timings, R8 marks), stores the result on
 * `LessonKit.validation`, and returns which sections still have a real (non-warning)
 * failure so the client can run one repair round (§10.1 step 5).
 *
 * Note on ownership: this path isn't under `api/kits/[id]/sections/**`, the one carve-out
 * TEAM_TASKS.md's folder list gives Monis inside `api/**`, but the same file's per-person
 * schedule explicitly lists "+ /validate route" under Monis's M7 — built here per that
 * more specific instruction. Flagging this in case Ujjwal was also about to touch this path.
 *
 * See api/kits/[id]/sections/[type]/route.ts for why this uses `getAuthedTeacher()`
 * rather than `requireTeacher()`.
 */

export const maxDuration = 30;

function parseSection<T>(
  schema: z.ZodType<T>,
  sections: { type: SectionType; status: SectionStatus; content: unknown }[],
  type: SectionType,
): T | undefined {
  const section = sections.find((s) => s.type === type);
  if (!section || section.status !== SectionStatus.READY) return undefined;
  const parsed = schema.safeParse(section.content);
  return parsed.success ? parsed.data : undefined;
}

export async function POST(_req: Request, ctx: RouteContext<"/api/kits/[id]/validate">) {
  const { id: kitId } = await ctx.params;

  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const teacherId = teacher.id;

  let kit;
  try {
    kit = await getKitForTeacher(kitId, teacherId);
  } catch {
    return NextResponse.json({ error: "Kit not found" }, { status: 404 });
  }

  const objectives = parseSection(Objectives, kit.sections, SectionType.OBJECTIVES);
  let plan = parseSection(LessonPlan, kit.sections, SectionType.LESSON_PLAN);
  let worksheet = parseSection(Worksheet, kit.sections, SectionType.WORKSHEET);
  const exitQuiz = parseSection(Quiz, kit.sections, SectionType.EXIT_QUIZ);
  const starterQuiz = parseSection(Quiz, kit.sections, SectionType.STARTER_QUIZ);
  const multiGrade = parseSection(MultiGrade, kit.sections, SectionType.MULTIGRADE);

  const baseInput: ValidateInput = {
    objectives,
    plan,
    worksheet,
    exitQuiz,
    starterQuiz,
    multiGrade,
    chapterPages: kit.chapter ? (kit.chapter.pagesEn as ChapterPage[]) : readKitOptions(kit.options).source?.pages,
    periodMinutes: kit.periodMinutes,
    lowResource: kit.lowResource,
    language: kit.language,
  };

  let results = validateKit(baseInput);

  // R2 auto-fix: adjust the longest activity/practice section's minutes.
  const r2 = results.find((r) => r.rule === "R2");
  if (r2 && !r2.ok && plan) {
    const fixedPlan = autoFixTimings(plan, kit.periodMinutes);
    const section = kit.sections.find((s) => s.type === SectionType.LESSON_PLAN)!;
    await prisma.kitSection.update({
      where: { id: section.id },
      data: { content: fixedPlan as Prisma.InputJsonValue, version: section.version + 1 },
    });
    await prisma.sectionRevision.create({
      data: {
        sectionId: section.id,
        version: section.version + 1,
        content: fixedPlan as Prisma.InputJsonValue,
        source: RevisionSource.AI,
        instruction: "auto-fix R2: adjusted section minutes to match the period length",
      },
    });
    plan = fixedPlan;
  }

  // R8 auto-fix: recompute totalMarks.
  const r8 = results.find((r) => r.rule === "R8");
  if (r8 && !r8.ok && worksheet) {
    const fixedWorksheet = autoFixWorksheetMarks(worksheet);
    const section = kit.sections.find((s) => s.type === SectionType.WORKSHEET)!;
    await prisma.kitSection.update({
      where: { id: section.id },
      data: { content: fixedWorksheet as Prisma.InputJsonValue, version: section.version + 1 },
    });
    await prisma.sectionRevision.create({
      data: {
        sectionId: section.id,
        version: section.version + 1,
        content: fixedWorksheet as Prisma.InputJsonValue,
        source: RevisionSource.AI,
        instruction: "auto-fix R8: recomputed totalMarks from the questions",
      },
    });
    worksheet = fixedWorksheet;
  }

  if ((r2 && !r2.ok) || (r8 && !r8.ok)) {
    results = validateKit({ ...baseInput, plan, worksheet });
  }

  await prisma.lessonKit.update({
    where: { id: kit.id },
    data: { validation: results as unknown as Prisma.InputJsonValue },
  });

  return NextResponse.json({ results, failedByType: failedRulesBySection(results) });
}
