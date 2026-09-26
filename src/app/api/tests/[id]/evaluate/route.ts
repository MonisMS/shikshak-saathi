import { NextResponse } from "next/server";
import * as z from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { generateJSON } from "@/lib/ai/gemini";
import { buildEvaluatePrompt } from "@/lib/ai/prompts/evaluate";
import { Worksheet, Evaluation, type WorksheetQuestion } from "@/lib/ai/schemas";
import { AI_GRADED_TYPES, type PerQuestionResult } from "@/lib/tests";
import { SectionType } from "@/generated/prisma/enums";

const Body = z.object({ instructionOverride: z.string().max(1000).optional() });

/**
 * Runs AI grading over every submission's not-yet-evaluated open-ended answers
 * (short_answer/long_answer/case_based/assertion_reason — see src/lib/tests.ts).
 * Quiz publications have nothing left to grade (fully auto-scored on submit), so
 * this just marks them evaluated. One Gemini call per submission, not per question.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => ({}))).data ?? {};

  const publication = await prisma.testPublication.findFirst({
    where: { id, teacherId: teacher.id },
    include: { kit: { include: { sections: true } }, submissions: true },
  });
  if (!publication) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const instructions = body.instructionOverride ?? publication.gradingInstructions ?? undefined;

  if (publication.sectionType !== SectionType.WORKSHEET) {
    // Quiz submissions are fully auto-graded already — nothing for AI to add.
    await prisma.testSubmission.updateMany({
      where: { publicationId: id, evaluatedAt: null },
      data: { evaluatedAt: new Date() },
    });
    return NextResponse.json({ ok: true, evaluated: 0, note: "Quizzes are auto-scored; nothing to grade with AI" });
  }

  const section = publication.kit.sections.find((s) => s.type === SectionType.WORKSHEET);
  const worksheet = section ? Worksheet.safeParse(section.content) : undefined;
  if (!worksheet?.success) return NextResponse.json({ error: "Worksheet content missing or invalid" }, { status: 409 });

  const questionsById = new Map<string, z.infer<typeof WorksheetQuestion>>(worksheet.data.questions.map((q) => [q.id, q]));
  const pending = publication.submissions.filter((s) => !s.evaluatedAt);

  let evaluated = 0;
  const errors: string[] = [];

  for (const submission of pending) {
    const answers = submission.answers as unknown as Record<string, string>;
    const perQuestion = (submission.perQuestion as unknown as Record<string, PerQuestionResult>) ?? {};
    const toGrade = worksheet.data.questions.filter((q) => AI_GRADED_TYPES.has(q.type));

    if (toGrade.length > 0) {
      try {
        const { system, user } = buildEvaluatePrompt(
          publication.kit.language,
          toGrade.map((q) => ({ question: q, studentAnswer: answers[q.id] ?? "" })),
          instructions,
        );
        const { data } = await generateJSON({ schema: Evaluation, system, user });
        for (const a of data.answers) {
          const q = questionsById.get(a.questionId);
          if (!q) continue;
          perQuestion[a.questionId] = { marks: Math.min(a.marksAwarded, q.marks), max: q.marks, method: "ai", feedback: a.feedback };
        }
      } catch (e) {
        errors.push(`${submission.studentName}: ${e instanceof Error ? e.message : "evaluation failed"}`);
        continue; // leave this submission ungraded, retry later
      }
    }

    const aiMarks = Object.values(perQuestion)
      .filter((r) => r.method === "ai")
      .reduce((sum, r) => sum + (r.marks ?? 0), 0);

    await prisma.testSubmission.update({
      where: { id: submission.id },
      data: { perQuestion: perQuestion as unknown as Prisma.InputJsonValue, aiMarks, evaluatedAt: new Date() },
    });
    evaluated += 1;
  }

  return NextResponse.json({ ok: true, evaluated, failed: errors.length, errors: errors.slice(0, 5) });
}
