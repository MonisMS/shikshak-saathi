import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { summarizeTranscript } from "@/lib/notes";
import { NoteLanguage, NoteSummary } from "@/lib/ai/prompts/notes";

/** Class Notes list + create. Creating a note also summarises it in the same request. */
export const maxDuration = 60;

export async function GET() {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const notes = await prisma.classNote.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, source: true, audioSeconds: true, summary: true, createdAt: true },
  });

  return NextResponse.json({
    notes: notes.map(({ summary, ...n }) => {
      const parsed = NoteSummary.safeParse(summary);
      return { ...n, overview: parsed.success ? parsed.data.overview : null };
    }),
  });
}

const createSchema = z.object({
  title: z.string().trim().max(200).optional(),
  transcript: z.string().trim().min(1, "Transcript is empty").max(200_000),
  source: z.enum(["record", "upload", "text"]),
  audioSeconds: z.number().int().min(0).max(24 * 3600).optional(),
  summaryLanguage: NoteLanguage.default("auto"),
});

export async function POST(req: Request) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }
  const body = parsed.data;

  // A failed summary must not lose the transcript — save the note either way and let the UI offer a retry.
  let summary: NoteSummary | null = null;
  let summaryError: string | null = null;
  try {
    summary = await summarizeTranscript(teacher.id, body.transcript, body.summaryLanguage);
  } catch (e) {
    summaryError = e instanceof Error ? e.message : String(e);
  }

  const fallbackTitle = `Class note — ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}`;
  const note = await prisma.classNote.create({
    data: {
      teacherId: teacher.id,
      title: body.title || summary?.title.trim() || fallbackTitle,
      source: body.source,
      audioSeconds: body.audioSeconds,
      summaryLanguage: body.summaryLanguage,
      transcript: body.transcript,
      summary: summary ?? undefined,
      summaryError,
    },
  });

  await logActivity(teacher.id, "VOICE_USED", { meta: { feature: "class-note", noteId: note.id, source: body.source } }).catch(() => {});

  return NextResponse.json({ note }, { status: 201 });
}
