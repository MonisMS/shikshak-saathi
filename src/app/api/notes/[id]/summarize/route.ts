import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { summarizeTranscript } from "@/lib/notes";
import { NoteLanguage } from "@/lib/ai/prompts/notes";

/** Re-runs the summary — after a failed first attempt, a transcript edit, or a language switch. */
export const maxDuration = 60;

const bodySchema = z.object({ summaryLanguage: NoteLanguage.optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = bodySchema.safeParse((await req.json().catch(() => null)) ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { id } = await params;
  const existing = await prisma.classNote.findFirst({ where: { id, teacherId: teacher.id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const summaryLanguage = parsed.data.summaryLanguage ?? NoteLanguage.catch("auto").parse(existing.summaryLanguage);

  try {
    const summary = await summarizeTranscript(teacher.id, existing.transcript, summaryLanguage);
    const note = await prisma.classNote.update({
      where: { id: existing.id },
      data: { summary, summaryError: null, summaryLanguage },
    });
    return NextResponse.json({ note });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await prisma.classNote.update({ where: { id: existing.id }, data: { summaryError: message } });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
