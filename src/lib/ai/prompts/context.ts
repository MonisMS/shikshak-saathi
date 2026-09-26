/** Shared input every section prompt builder needs. Chapter text is loaded and page-sliced
 * by src/lib/chapters.ts (Ujjwal's file) — builders only ever receive the finished string. */
export interface PromptContext {
  grade: number;
  subject: string;
  language: "en" | "hi";
  classSize: number;
  periodMinutes: number;
  lowResource: boolean;
  localContext?: { district?: string; state?: string } | null;
  /** Page-tagged chapter text with [p.N] markers. Omitted for typed-topic kits. */
  chapterText?: string;
  /** Free-typed topic / learning objective, used when there is no chapter. */
  topic?: string;
}

export type NepStage = "foundational" | "preparatory" | "middle" | "secondary" | "senior-secondary";

/** NEP 2020's 5+3+3+4 structure — used instead of UK "key stage" wording. */
export function nepStage(grade: number): NepStage {
  if (grade <= 2) return "foundational";
  if (grade <= 5) return "preparatory";
  if (grade <= 8) return "middle";
  if (grade <= 10) return "secondary";
  return "senior-secondary";
}

const STAGE_LANGUAGE_GUIDANCE: Record<NepStage, string> = {
  foundational:
    "Very short sentences, one idea each, fully concrete words a 6–8 year old understands when read aloud. Define any new word on the spot.",
  preparatory:
    "Plain, everyday language throughout. Keep essential subject vocabulary but drop the academic wrapper around it. Be concrete and specific.",
  middle:
    "Vocabulary is developing but should not reach secondary-board level. Introduce an abstract idea with a concrete, local example first.",
  secondary:
    "Full NCERT/CBSE register for this grade; use subject-specific vocabulary accurately and precisely, matched to board exam command words.",
  "senior-secondary":
    "Full NCERT/CBSE register; subject-specific vocabulary is expected and should be used accurately, matched to board exam command words.",
};

export function stageLanguageGuidance(grade: number): string {
  return STAGE_LANGUAGE_GUIDANCE[nepStage(grade)];
}

/** Appends an optional teacher instruction ("make it easier") and/or validator repair notes. */
export function modifiersBlock(instruction?: string, repair?: string[]): string {
  const parts: string[] = [];
  if (instruction) {
    parts.push(`## Teacher instruction\nThe teacher asked for this change: "${instruction}". Apply it while still satisfying every rule above.`);
  }
  if (repair && repair.length > 0) {
    parts.push(
      `## Repair\nYour previous output failed these checks:\n${repair.map((r) => `- ${r}`).join("\n")}\nFix them and return the full corrected JSON again.`,
    );
  }
  return parts.join("\n\n");
}

/** [p.N] markers a builder can cite, or empty for a typed-topic kit with no chapter. */
export function chapterOrTopicBlock(ctx: PromptContext): string {
  if (ctx.chapterText) {
    return `<chapter>\n${ctx.chapterText}\n</chapter>`;
  }
  // Objectives.pageRefs is required (min 1) even for typed-topic kits (§10.4 only made
  // worksheet/quiz pageRef optional) — so only tell the model to omit it where the
  // schema actually allows omitting it, instead of a blanket claim that doesn't hold.
  return `<topic>\n${ctx.topic ?? "(no topic given)"}\n</topic>\n\nThere is no source chapter for this kit. Leave every OPTIONAL pageRef field (worksheet questions, quiz questions) empty/omitted. Objectives still require at least one pageRef each — since there is no chapter, use 1 as a placeholder page number for every objective rather than inventing a specific-looking page.`;
}
