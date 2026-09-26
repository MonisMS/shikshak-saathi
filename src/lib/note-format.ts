import type { NoteSummary } from "@/lib/ai/prompts/notes";

/**
 * Class Notes formatting shared by the on-screen view and the print/PDF page, so both
 * show the same timestamps, reading time and copy text.
 */

export interface TranscriptSegment {
  timestamp: string | null;
  text: string;
}

const TIMESTAMP_LINE = /^\[(\d{1,2}:\d{2}(?::\d{2})?)\]\s*/;

/** Audio transcripts are stored as "[mm:ss] text" paragraphs; pasted ones are plain paragraphs. */
export function parseTranscript(transcript: string): TranscriptSegment[] {
  return transcript
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const match = block.match(TIMESTAMP_LINE);
      return match ? { timestamp: match[1], text: block.slice(match[0].length).trim() } : { timestamp: null, text: block };
    });
}

export function summaryToText(summary: NoteSummary): string {
  const lines = [summary.overview, ""];
  for (const section of summary.sections) {
    lines.push(section.heading, ...section.bullets.map((b) => `• ${b}`), "");
  }
  if (summary.actionItems.length > 0) {
    lines.push("Action items", ...summary.actionItems.map((a) => `☐ ${a}`));
  }
  return lines.join("\n").trim();
}

export function readMinutes(text: string): number {
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return s === 0 ? `${m} min` : `${m} min ${s}s`;
}

export const SOURCE_LABEL: Record<string, { en: string; hi: string }> = {
  record: { en: "Recorded", hi: "रिकॉर्ड किया" },
  upload: { en: "Uploaded audio", hi: "अपलोड ऑडियो" },
  text: { en: "Pasted transcript", hi: "पेस्ट किया गया ट्रांसक्रिप्ट" },
};
