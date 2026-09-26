import * as z from "zod";
import JSZip from "jszip";
import { getDocumentProxy, extractText } from "unpdf";
import { generateJSON, MODEL_FAST } from "@/lib/ai/gemini";
import type { SourcePageData } from "@/lib/kit-source";

const PAGE_CHARS = 2500;
const MAX_TOTAL_CHARS = 60_000;

const Extracted = z.object({ pages: z.array(z.string()).min(1) });

const DEVANAGARI = /[ऀ-ॿ]/;

function chunk(text: string): string[] {
  const clean = text.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) return [];
  const out: string[] = [];
  let buf = "";
  for (const para of clean.split(/\n\n+/)) {
    if (buf && buf.length + para.length > PAGE_CHARS) {
      out.push(buf);
      buf = "";
    }
    buf = buf ? `${buf}\n\n${para}` : para;
  }
  if (buf) out.push(buf);
  return out;
}

async function geminiExtract(kind: "ocr" | "pdf" | "audio", mimeType: string, bytes: Buffer): Promise<string[]> {
  const system =
    kind === "audio"
      ? "You transcribe classroom or teacher audio recordings. Write down exactly what is said, in the language spoken (Hindi in Devanagari, English in Latin script). Do not summarise."
      : "You transcribe teaching material exactly as printed or handwritten, keeping the original language and script (Hindi in Devanagari). Do not summarise, translate or add anything. Skip page headers, footers and page numbers.";
  const user =
    kind === "audio"
      ? "Transcribe this recording. Return {\"pages\": [...]}, splitting the transcript into chunks of about 2,000 characters."
      : kind === "pdf"
        ? "Transcribe this document. Return {\"pages\": [...]} with one string per page of the document, in order."
        : "Transcribe all text in this image, including diagrams' labels. Return {\"pages\": [\"<all text>\"]}.";
  const result = await generateJSON({
    schema: Extracted,
    system,
    user,
    model: MODEL_FAST,
    parts: [{ inlineData: { mimeType, data: bytes.toString("base64") } }],
  });
  return result.data.pages.map((p) => p.trim()).filter(Boolean);
}

async function extractPdf(bytes: Buffer): Promise<string[]> {
  try {
    const pdf = await getDocumentProxy(new Uint8Array(bytes));
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = text.map((t) => t.replace(/\s+\n/g, "\n").trim());
    const total = pages.join("").length;
    // Hindi PDFs extract as garbage and scanned PDFs extract as nothing — both go to OCR instead.
    if (total > 200 && !pages.some((p) => DEVANAGARI.test(p))) return pages.filter(Boolean);
  } catch {
    // fall through to OCR
  }
  return geminiExtract("pdf", "application/pdf", bytes);
}

async function extractDocx(bytes: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) throw new Error("This Word file has no readable text");
  const text = xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return chunk(text);
}

export type SourceKind = "pdf" | "docx" | "image" | "audio" | "text";

export function sourceKind(file: File): SourceKind | null {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".docx")) return "docx";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/") || /\.(mp3|m4a|wav|ogg|webm|aac)$/.test(name)) return "audio";
  if (file.type.startsWith("text/") || name.endsWith(".txt")) return "text";
  return null;
}

/** Turns uploaded files into numbered source pages, in upload order. */
export async function extractSources(files: File[]): Promise<SourcePageData[]> {
  const perFile = await Promise.all(
    files.map(async (file) => {
      const kind = sourceKind(file);
      const bytes = Buffer.from(await file.arrayBuffer());
      let texts: string[];
      switch (kind) {
        case "pdf":
          texts = await extractPdf(bytes);
          break;
        case "docx":
          texts = await extractDocx(bytes);
          break;
        case "image":
          texts = await geminiExtract("ocr", file.type || "image/jpeg", bytes);
          break;
        case "audio":
          texts = await geminiExtract("audio", file.type || "audio/mpeg", bytes);
          break;
        case "text":
          texts = chunk(bytes.toString("utf8"));
          break;
        default:
          throw new Error(`${file.name}: unsupported file type`);
      }
      return texts.map((text) => ({ text, source: file.name }));
    }),
  );

  const pages: SourcePageData[] = [];
  let total = 0;
  for (const entry of perFile.flat()) {
    if (total >= MAX_TOTAL_CHARS || pages.length >= 400) break;
    const text = entry.text.slice(0, MAX_TOTAL_CHARS - total);
    total += text.length;
    pages.push({ page: pages.length + 1, text, source: entry.source });
  }
  return pages;
}
