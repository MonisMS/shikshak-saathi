import { readFile } from "node:fs/promises";
import path from "node:path";
import { getDocumentProxy, extractText } from "unpdf";

export type ChapterPage = { page: number; text: string };

export type ChapterMeta = {
  id: string;
  grade: number;
  subject: string;
  bookName: string;
  chapterNo: number;
  titleEn: string;
  titleHi: string | null;
  sourceUrlEn: string;
  sourceUrlHi: string | null;
  pdfEn: string;
  pdfHi: string | null;
  pageStart: number;
};

// NCERT English PDFs repeat running headers and duplicate heading layers, e.g.
// "2.1 Nature — Our Science Laboratory2.1 Nature — Our Science Laboratory..."
// The running header text differs per book (verified: Curiosity uses
// "Curiosity | Textbook of Science | Grade N"; Ganita Prakash uses
// "Ganita Prakash | Grade N"), so every known book's header is stripped.
const RUNNING_HEADERS = [
  /Curiosity \| Textbook of Science \| Grade \d+\s*\d*/g,
  /Ganita Prakash \| Grade \d+\s*\d*/g,
];

function cleanEnglish(t: string) {
  let out = t;
  for (const header of RUNNING_HEADERS) out = out.replace(header, "");
  return out
    .replace(/(.{12,120}?)\1+/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractPages(pdfPath: string, pageStart: number): Promise<ChapterPage[]> {
  const pdf = await getDocumentProxy(new Uint8Array(await readFile(pdfPath)));
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((t, i) => ({
    page: pageStart + i,
    text: cleanEnglish(t),
  }));
}

export function toPromptText(pages: ChapterPage[]) {
  return pages.map((p) => `[p.${p.page}]\n${p.text}`).join("\n\n");
}

export async function loadChapterMeta(): Promise<ChapterMeta[]> {
  const raw = await readFile(path.join(process.cwd(), "data", "chapters.json"), "utf-8");
  return JSON.parse(raw);
}

export async function extractChapterEnglishPages(chapter: ChapterMeta): Promise<ChapterPage[]> {
  const pdfPath = path.join(process.cwd(), "data", "ncert", chapter.pdfEn);
  return extractPages(pdfPath, chapter.pageStart);
}
