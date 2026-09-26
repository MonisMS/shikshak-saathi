import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/session";
import { getKitForTeacher } from "@/lib/scope";
import { getChapterPromptText } from "@/lib/chapters";
import {
  RevisionSource,
  SectionStatus,
  SectionType,
  type Prisma,
} from "@/generated/prisma/client";
import { generateJSON } from "@/lib/ai/gemini";
import { SECTION_SCHEMAS, Objectives, LessonPlan } from "@/lib/ai/schemas";
import { SECTION_DEPS } from "@/lib/ai/pipeline";
import { buildObjectivesPrompt } from "@/lib/ai/prompts/objectives";
import { buildLessonPlanPrompt } from "@/lib/ai/prompts/plan";
import { buildWorksheetPrompt } from "@/lib/ai/prompts/worksheet";
import { buildQuizPrompt } from "@/lib/ai/prompts/quiz";
import type { PromptContext } from "@/lib/ai/prompts/context";

/**
 * Generate or regenerate ONE section of a kit (§10.1, P3.4). Client calls this once
 * per section, in dependency order (`SECTION_DEPS`); sections after LESSON_PLAN run
 * in parallel. The same endpoint handles "regenerate with an instruction" (F20) and
 * the one-shot validator repair round (§10.6) via the request body.
 *
 * ASSUMED CONTRACT for teammate-owned files not yet built (documented here so their
 * real implementation can match what this route calls):
 * - `requireTeacher()` (src/lib/session.ts, Ujjwal, P1.3): resolves to `{ id: string, ... }`
 *   for a logged-in teacher, or throws if there's no session.
 * - `getKitForTeacher(kitId, teacherId)` (src/lib/scope.ts, Ujjwal, P1.3): resolves to the
 *   kit WITH its `sections` relation loaded, or throws if the kit doesn't exist / isn't
 *   owned by this teacher (this route turns that throw into a 404).
 * - `getChapterPromptText(chapterId, pageFrom?, pageTo?)` (src/lib/chapters.ts, Ujjwal,
 *   P3.2): resolves to the page-tagged `[p.N] ...` chapter text, sliced to that page range.
 */

export const maxDuration = 60;

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

  let teacherId: string;
  try {
    const teacher = await requireTeacher();
    teacherId = teacher.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kit = await getKitForTeacher(kitId, teacherId).catch(() => null);
  if (!kit) {
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

  const promptCtx: PromptContext = {
    grade: kit.classroom?.grades[0] ?? kit.chapter?.grade ?? 7,
    subject: kit.classroom?.subject ?? kit.chapter?.subject ?? "General",
    language: kit.language,
    classSize: kit.classSize,
    periodMinutes: kit.periodMinutes,
    lowResource: kit.lowResource,
    chapterText: kit.chapter
      ? await getChapterPromptText(kit.chapter.id, kit.pageFrom ?? undefined, kit.pageTo ?? undefined)
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
      default:
        throw new Error(`No prompt builder yet for ${sectionType} (lands in a later task)`);
    }

    const schema = SECTION_SCHEMAS[sectionType];
    const result = await generateJSON({
      schema,
      system: built.system,
      user: built.user,
      demoCache: kit.chapter ? { chapterId: kit.chapter.id, sectionType } : undefined,
    });

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
          type: existingSection ? "SECTION_REGENERATED" : "SECTION_GENERATED",
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

  let teacherId: string;
  try {
    const teacher = await requireTeacher();
    teacherId = teacher.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const kit = await getKitForTeacher(kitId, teacherId).catch(() => null);
  if (!kit) {
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
