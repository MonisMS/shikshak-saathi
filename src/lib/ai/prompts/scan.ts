import type { WorksheetQuestion } from "@/lib/ai/schemas";
import type { z } from "zod";

type Question =
  | { id: string; type: "mcq"; prompt: string; options: string[] }
  | { id: string; type: "quiz"; prompt: string; options: string[] }
  | Pick<z.infer<typeof WorksheetQuestion>, "id" | "type" | "prompt" | "options">;

/**
 * Reads a photographed/scanned physical answer sheet: the student's name and, per
 * question, whichever option they circled/bubbled or whatever they wrote in a blank.
 * One Gemini vision call per uploaded photo (`parts: [{inlineData}]` in gemini.ts).
 */
export function buildScanPrompt(questions: Question[]): { system: string; user: string } {
  const system = [
    "# Identity",
    "You are reading a photograph of a physical answer sheet filled in by hand by a school student — a printed worksheet or MCQ quiz they answered on paper.",
    "Read the student's name from the top of the sheet, and for every question, work out what the student marked or wrote.",
    "For a multiple-choice question, look for a circled, ticked, or otherwise clearly-marked option letter (A/B/C/D) or the option text underlined/circled — report the option letter if the sheet shows letters, otherwise the option text.",
    "For a written-answer question, transcribe exactly what the student wrote, as best you can read it.",
    "If a question was left blank or the mark is genuinely unreadable, use an empty string and set uncertain to true. Never guess an answer you can't actually see evidence for.",
  ].join("\n");

  const user = [
    "# Questions on this sheet",
    JSON.stringify(questions.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: "options" in q ? q.options : undefined }))),
    "",
    "Read the attached photo and return the student's name and their answer to every question listed above, in the same order.",
  ].join("\n");

  return { system, user };
}
