import { NextResponse } from "next/server";
import { getAuthedTeacher } from "@/lib/session";
import { extractSources, sourceKind } from "@/lib/sources";

export const maxDuration = 60;

const MAX_FILES = 12;
const MAX_FILE_BYTES = 15 * 1024 * 1024;

/** Uploaded PDFs, Word docs, images (OCR) and audio → numbered source pages for a new kit. */
export async function POST(req: Request) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const files = (form?.getAll("files") ?? []).filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "No files uploaded" }, { status: 400 });
  if (files.length > MAX_FILES) return NextResponse.json({ error: `Upload at most ${MAX_FILES} files at a time` }, { status: 400 });

  for (const f of files) {
    if (!sourceKind(f)) return NextResponse.json({ error: `${f.name}: use PDF, Word (.docx), images, audio or .txt` }, { status: 400 });
    if (f.size > MAX_FILE_BYTES) return NextResponse.json({ error: `${f.name} is larger than 15 MB` }, { status: 400 });
  }

  try {
    const pages = await extractSources(files);
    if (pages.length === 0) return NextResponse.json({ error: "No readable text found in these files" }, { status: 422 });
    return NextResponse.json({ pages });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read the files" }, { status: 500 });
  }
}
