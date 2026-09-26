import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";
import { extractSources, sourceKind, type SourceKind } from "@/lib/sources";
import { listResources, type ResourceGroup, type ResourceKind } from "@/lib/resources";

export const maxDuration = 60;

const MAX_FILES = 12;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

const KIND_FROM_SOURCE: Record<SourceKind, ResourceKind> = { pdf: "pdf", docx: "doc", image: "image", audio: "audio", text: "text" };

export async function GET(req: Request) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const group = new URL(req.url).searchParams.get("group");
  return NextResponse.json({
    resources: await listResources(teacher.id, group === "documents" || group === "recordings" ? (group as ResourceGroup) : undefined),
  });
}

const TranscriptBody = z.object({
  title: z.string().min(1).max(200),
  transcript: z.string().min(1).max(60_000),
  sourceUrl: z.string().url().optional(),
  grade: z.number().int().min(1).max(12).optional(),
  subject: z.string().max(60).optional(),
});

/** multipart `files` (+ optional grade/subject) → one resource per file; or JSON { title, transcript, sourceUrl? } → a recording. */
export async function POST(req: Request) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (req.headers.get("content-type")?.includes("application/json")) {
    const parsed = TranscriptBody.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    const b = parsed.data;
    const created = await prisma.teachingResource.create({
      data: {
        teacherId: teacher.id,
        kind: "audio",
        title: b.title,
        grade: b.grade,
        subject: b.subject,
        sourceUrl: b.sourceUrl,
        pages: [{ page: 1, text: b.transcript }],
      },
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  }

  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File);
  const grade = Number(form?.get("grade")) || undefined;
  const subject = (form?.get("subject") as string | null) || undefined;
  if (files.length === 0) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ error: `Upload at most ${MAX_FILES} files at a time` }, { status: 400 });
  for (const f of files) {
    if (!sourceKind(f)) return NextResponse.json({ error: `${f.name}: use PDF, Word (.docx), images, audio or .txt` }, { status: 400 });
    if (f.size > MAX_FILE_BYTES) return NextResponse.json({ error: `${f.name} is larger than 15 MB` }, { status: 400 });
  }

  try {
    const ids: string[] = [];
    for (const file of files) {
      const pages = await extractSources([file]);
      if (pages.length === 0) continue;
      const created = await prisma.teachingResource.create({
        data: {
          teacherId: teacher.id,
          kind: KIND_FROM_SOURCE[sourceKind(file)!],
          title: file.name.replace(/\.[^.]+$/, ""),
          fileName: file.name,
          grade,
          subject,
          pages,
        },
      });
      ids.push(created.id);
    }
    if (ids.length === 0) return NextResponse.json({ error: "No readable text found in these files" }, { status: 422 });
    return NextResponse.json({ ids }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read the files" }, { status: 500 });
  }
}
