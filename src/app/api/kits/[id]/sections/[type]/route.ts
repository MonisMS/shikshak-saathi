import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { getKitForTeacher } from "@/lib/scope";
import { toPromptText, type ChapterPage } from "@/lib/chapters";
import { readKitOptions } from "@/lib/kit-source";
import {
  RevisionSource,
  SectionStatus,
  SectionType,
  type Prisma,
} from "@/generated/prisma/client";
import { generateJSON, MODEL_FAST } from "@/lib/ai/gemini";
import { SECTION_SCHEMAS, Objectives, LessonPlan } from "@/lib/ai/schemas";
import { SECTION_DEPS } from "@/lib/ai/pipeline";
import { buildObjectivesPrompt } from "@/lib/ai/prompts/objectives";
import { buildLessonPlanPrompt } from "@/lib/ai/prompts/plan";
import { buildWorksheetPrompt } from "@/lib/ai/prompts/worksheet";
import { buildQuizPrompt } from "@/lib/ai/prompts/quiz";
import { buildParentNotePrompt } from "@/lib/ai/prompts/parent";
import type { PromptContext } from "@/lib/ai/prompts/context";

/**
 * Generate or regenerate ONE section of a kit (§10.1, P3.4). Client calls this once
 * per section, in dependency order (`SECTION_DEPS`); sections after LESSON_PLAN run
 * in parallel. The same endpoint handles "regenerate with an instruction" (F20) and
 * the one-shot validator repair round (§10.6) via the request body.
 *
 * `getAuthedTeacher()` (src/lib/session.ts) returns the teacher or null (never
 * redirects) — the right choice for API routes, where a redirect() response isn't
 * something a fetch() caller can treat as JSON. `getKitForTeacher()` (src/lib/scope.ts)
 * throws a plain `NotFoundError` when the kit doesn't exist or isn't owned by this
 * teacher; safe to try/catch → 404.
 */

export const maxDuration = 60;

function sliceChapterPages(pages: ChapterPage[], pageFrom: number | null, pageTo: number | null): ChapterPage[] {
  return pages.filter((p) => (pageFrom == null || p.page >= pageFrom) && (pageTo == null || p.page <= pageTo));
}

const bodySchema = z.object({
  instruction: z.string().max(500).optional(),
  repair: z.array(z.string()).optional(),
});

const MINUTES_SAVED: Partial<Record<SectionType, number>> = {
  [SectionType.WORKSHEET]: 20,
  [SectionType.EXIT_QUIZ]: 15,
  [SectionType.STARTER_QUIZ]: 15,
  [SectionType.PARENT_NOTE]: 5,
};

function isSectionType(value: string): value is SectionType {
  return (Object.values(SectionType) as string[]).includes(value);
}

export async function POST(req: Request, ctx: RouteContext<"/api/kits/[id]/sections/[type]">) {
  const { id: kitId, type } = await ctx.params;

  if (!isSectionType(type)) {
    return NextResponse.json({ error: `Unknown section type: ${type}` }, { status: 400 });
  }
  const sectionType = type;

  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const teacherId = teacher.id;

  let kit;
  try {
    kit = await getKitForTeacher(kitId, teacherId);
  } catch {
    return NextResponse.json({ error: "Kit not found" }, { status: 404 });
  }

  const parsedBody = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });
  }
  const { instruction, repair } = parsedBody.data;

  // Step 2: dependencies must all be READY.
  const sectionsByType = new Map(kit.sections.map((s) => [s.type, s]));
  for (const dep of SECTION_DEPS[sectionType]) {
    if (sectionsByType.get(dep)?.status !== SectionStatus.READY) {
      return NextResponse.json({ error: `${dep} must be READY before ${sectionType}` }, { status: 409 });
    }
  }

  // F57 (per-teacher AI rate limit) is off in this build — roadmap.md §3 has it unticked.

  const existingSection = sectionsByType.get(sectionType);
  const sectionId =
    existingSection?.id ??
    (
      await prisma.kitSection.create({
        data: { kitId: kit.id, type: sectionType, status: SectionStatus.GENERATING },
      })
    ).id;

  if (existingSection) {
    await prisma.kitSection.update({ where: { id: sectionId }, data: { status: SectionStatus.GENERATING, error: null } });
  }

  const kitOptions = readKitOptions(kit.options);
  const promptCtx: PromptContext = {
    grade: kit.chapter?.grade ?? kitOptions.grade ?? kit.classroom?.grades[0] ?? 7,
    subject: kit.chapter?.subject ?? kitOptions.subject ?? kit.classroom?.subject ?? "General",
    language: kit.language,
    classSize: kit.classSize,
    periodMinutes: kit.periodMinutes,
    lowResource: kit.lowResource,
    chapterText: kit.chapter
      ? toPromptText(sliceChapterPages(kit.chapter.pagesEn as ChapterPage[], kit.pageFrom, kit.pageTo))
      : kitOptions.source
        ? toPromptText(kitOptions.source.pages)
        : undefined,
    topic: kit.topic ?? undefined,
  };

  try {
    const objectivesContent = () => Objectives.parse(sectionsByType.get(SectionType.OBJECTIVES)!.content);
    const planContent = () => LessonPlan.parse(sectionsByType.get(SectionType.LESSON_PLAN)!.content);

    let built: { system: string; user: string };
    switch (sectionType) {
      case SectionType.OBJECTIVES:
        built = buildObjectivesPrompt(promptCtx, { instruction, repair });
        break;
      case SectionType.LESSON_PLAN:
        built = buildLessonPlanPrompt(promptCtx, objectivesContent(), { instruction, repair });
        break;
      case SectionType.WORKSHEET:
        built = buildWorksheetPrompt(promptCtx, objectivesContent(), planContent(), { instruction, repair });
        break;
      case SectionType.EXIT_QUIZ:
      case SectionType.STARTER_QUIZ:
        built = buildQuizPrompt(
          promptCtx,
          sectionType === SectionType.EXIT_QUIZ ? "exit" : "starter",
          objectivesContent(),
          planContent(),
          { instruction, repair },
        );
        break;
      case SectionType.PARENT_NOTE:
        built = buildParentNotePrompt(promptCtx, planContent(), { instruction, repair });
        break;
      default:
        throw new Error(`No prompt builder yet for ${sectionType} (lands in a later task)`);
    }

    const schema = SECTION_SCHEMAS[sectionType];
    const result = await generateJSON({
      schema,
      system: built.system,
      user: built.user,
      // PARENT_NOTE is a short summary, not full generation — use the fast/cheap model (§7.2).
      model: sectionType === SectionType.PARENT_NOTE ? MODEL_FAST : undefined,
      demoCache: kit.chapter ? { chapterId: kit.chapter.id, sectionType } : undefined,
    });

    // A section row exists from the moment POST /api/kits creates it PENDING, so
    // "existingSection is truthy" is NOT the same as "this has been generated before" —
    // version stays 0 until the first successful generation.
    const isFirstGeneration = (existingSection?.version ?? 0) === 0;
    const nextVersion = (existingSection?.version ?? 0) + 1;

    await prisma.$transaction([
      prisma.kitSection.update({
        where: { id: sectionId },
        data: {
          status: SectionStatus.READY,
          content: result.data as Prisma.InputJsonValue,
          version: nextVersion,
          error: null,
        },
      }),
      prisma.sectionRevision.create({
        data: {
          sectionId,
          version: nextVersion,
          content: result.data as Prisma.InputJsonValue,
          source: RevisionSource.AI,
          instruction,
        },
      }),
      prisma.generationLog.create({
        data: {
          teacherId,
          kitId: kit.id,
          sectionType,
          model: result.model,
          inputTokens: result.inTok,
          outputTokens: result.outTok,
          latencyMs: result.latencyMs,
          ok: true,
          fromCache: result.fromCache,
        },
      }),
      prisma.activityLog.create({
        data: {
          teacherId,
          type: isFirstGeneration ? "SECTION_GENERATED" : "SECTION_REGENERATED",
          kitId: kit.id,
          minutesSavedEstimate: MINUTES_SAVED[sectionType] ?? 0,
        },
      }),
    ]);

    return NextResponse.json(result.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.kitSection.update({
      where: { id: sectionId },
      data: { status: SectionStatus.FAILED, error: message },
    });
    await prisma.generationLog.create({
      data: { teacherId, kitId: kit.id, sectionType, model: "unknown", latencyMs: 0, ok: false, error: message },
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** F19: save a teacher's inline edit to a section. Body is the full section content object. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/kits/[id]/sections/[type]">) {
  const { id: kitId, type } = await ctx.params;

  if (!isSectionType(type)) {
    return NextResponse.json({ error: `Unknown section type: ${type}` }, { status: 400 });
  }
  const sectionType = type;

  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const teacherId = teacher.id;

  let kit;
  try {
    kit = await getKitForTeacher(kitId, teacherId);
  } catch {
    return NextResponse.json({ error: "Kit not found" }, { status: 404 });
  }

  const existingSection = kit.sections.find((s) => s.type === sectionType);
  if (!existingSection) {
    return NextResponse.json({ error: `${sectionType} does not exist on this kit yet` }, { status: 404 });
  }

  const parsedBody = SECTION_SCHEMAS[sectionType].safeParse(await req.json().catch(() => null));
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.message }, { status: 400 });
  }

  const nextVersion = existingSection.version + 1;

  await prisma.$transaction([
    prisma.kitSection.update({
      where: { id: existingSection.id },
      data: {
        content: parsedBody.data as Prisma.InputJsonValue,
        version: nextVersion,
        editedByTeacher: true,
        status: SectionStatus.READY,
        error: null,
      },
    }),
    prisma.sectionRevision.create({
      data: {
        sectionId: existingSection.id,
        version: nextVersion,
        content: parsedBody.data as Prisma.InputJsonValue,
        source: RevisionSource.TEACHER,
      },
    }),
    prisma.activityLog.create({
      data: { teacherId, type: "SECTION_EDITED", kitId: kit.id, minutesSavedEstimate: 0 },
    }),
  ]);

  return NextResponse.json(parsedBody.data);
}
