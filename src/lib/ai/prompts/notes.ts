import * as z from "zod";

/**
 * Class Notes (Wispr-style): audio chunk → verbatim transcript, then full transcript →
 * structured summary. Standalone prompts — like voice.ts, these don't need the
 * chapter-grounding machinery in system.ts since they only restate what was said.
 */

export const NoteLanguage = z.enum(["auto", "hi", "en"]);
export type NoteLanguage = z.infer<typeof NoteLanguage>;

export const ChunkTranscript = z.object({
  text: z.string().describe("Verbatim transcript of the audio clip; empty string if there is no speech"),
});

export const NoteSummary = z.object({
  title: z.string().describe("Short descriptive title for the whole recording, max ~8 words"),
  overview: z.string().describe("2-3 sentence overview of what was discussed"),
  sections: z
    .array(
      z.object({
        heading: z.string().describe("Short topic heading"),
        bullets: z.array(z.string()).describe("1-5 concise bullet points under this heading"),
      }),
    )
    .describe("2-8 topic sections in the order they were discussed"),
  actionItems: z.array(z.string()).describe("Concrete follow-ups / homework / to-dos mentioned; empty if none"),
});
export type NoteSummary = z.infer<typeof NoteSummary>;

const TRANSCRIBE_SYSTEM = `You are a precise speech-to-text engine for Indian classrooms and staff meetings.
Speakers may use Hindi, English, or a codemix of both. Write Hindi words in Devanagari and English words in Latin script, exactly as spoken.
Never translate, summarise, correct, or add commentary. Omit filler sounds (umm, uh) and background noise.
If the clip has no intelligible speech, return an empty string. Output ONLY JSON matching the schema.`;

export function buildChunkTranscribePrompt(): { system: string; user: string } {
  return {
    system: TRANSCRIBE_SYSTEM,
    user: "Transcribe the attached audio clip verbatim. It is one part of a longer recording, so it may start or end mid-sentence — transcribe exactly what is audible.",
  };
}

const SUMMARY_SYSTEM = `You write clear, skimmable notes from a teacher's recorded class, meeting or voice memo.
Only use facts that appear in the transcript — never invent names, numbers, dates or decisions.
Keep bullets short (one line each), concrete and useful for a busy teacher reading on a phone.
Output ONLY JSON matching the schema.`;

const LANGUAGE_RULE: Record<NoteLanguage, string> = {
  auto: "Write the notes in the same language and script mix the speakers mostly used (e.g. Hinglish in Latin script if that is how they spoke, Devanagari Hindi if they spoke pure Hindi, English if English).",
  hi: "Write the notes in simple Hindi (Devanagari script). Keep common English technical terms as-is.",
  en: "Write the notes in simple English.",
};

export function buildNoteSummaryPrompt(transcript: string, language: NoteLanguage): { system: string; user: string } {
  const user = [
    "# Task",
    "Summarise the transcript below into notes:",
    "- title: a short title for the recording.",
    "- overview: 2-3 sentences on what it was about (mention who explained what to whom if clear).",
    "- sections: group the content into topic sections, each with a bold-worthy heading and 1-5 bullets.",
    "- actionItems: follow-ups, homework or to-dos that were mentioned (empty array if none).",
    "",
    `# Language\n${LANGUAGE_RULE[language]}`,
    "",
    "# Transcript",
    transcript,
  ].join("\n");

  return { system: SUMMARY_SYSTEM, user };
}
