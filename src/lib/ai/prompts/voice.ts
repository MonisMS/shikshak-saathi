/**
 * Voice → kit-form intent (F31, §12.4). Small, standalone prompt — it doesn't need
 * buildSystemPrompt's chapter/grounding machinery since it only extracts structured
 * fields from a short spoken transcript, it doesn't generate teaching content.
 */
const SYSTEM = `You turn a teacher's spoken (or typed) request into structured fields for a lesson-kit form.
The teacher may speak in Hindi, English, or a codemix of both (Hindi words in Devanagari, English words as-is).
Extract only what was actually said — never guess a field that wasn't mentioned; omit it instead.
Output ONLY JSON matching the schema.`;

export function buildVoiceParsePrompt(transcript: string): { system: string; user: string } {
  const user = [
    "# Task",
    "Extract these fields from the transcript below, omitting any that weren't mentioned:",
    "- grade: the class/grade number (1-12) if mentioned.",
    "- subject: the subject name if mentioned (e.g. Science, Mathematics, Hindi).",
    "- chapterNo: the chapter number if mentioned.",
    "- topic: a specific topic/sub-topic if the teacher named one instead of a chapter.",
    '- language: "hi" if they want the kit content in Hindi, "en" if English, omit if not mentioned.',
    "- teacherNote: any other instruction or preference they mentioned that doesn't fit the fields above.",
    "",
    `Transcript: "${transcript}"`,
  ].join("\n");

  return { system: SYSTEM, user };
}
