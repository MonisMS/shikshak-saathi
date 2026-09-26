import { buildSystemPrompt } from "./system";
import { chapterOrTopicBlock, modifiersBlock, type PromptContext } from "./context";

/**
 * OBJECTIVES prompt (§10.5). Ideas adapted (MIT): Oak's learningOutcome.instructions.ts
 * (pupil-facing, single-lesson scope, narrow a broad title down) and Shiksha's
 * blooms_taxonomy.yaml (verb bank per Bloom level, compressed here to stay small per call).
 */
export function buildObjectivesPrompt(
  ctx: PromptContext,
  opts?: { instruction?: string; repair?: string[] },
): { system: string; user: string } {
  const system = buildSystemPrompt(ctx);

  const user = [
    "# Task",
    "Write 3–5 learning objectives for this single lesson period (not a whole unit). Each objective must be:",
    "- Achievable within one class period",
    '- Phrased as "Students will be able to <measurable verb> …"',
    "- Tagged with exactly one Bloom level, chosen with this verb bank:",
    "  remember: identify, name, state, recall · understand: explain, describe, summarise · apply: use, solve, classify, complete · analyze: compare, categorise, distinguish · evaluate: judge, justify, assess · create: design, compose, construct",
    "- Backed by at least one real page reference from the chapter text (omit pageRefs only if there is no chapter).",
    "",
    "Also write a chapterSummary (max 600 characters) in the kit's output language, summarising only what is in the chapter text.",
    "",
    "Give each objective a short id: O1, O2, O3 … in the order you list them.",
    "",
    chapterOrTopicBlock(ctx),
    modifiersBlock(opts?.instruction, opts?.repair),
  ]
    .filter(Boolean)
    .join("\n");

  return { system, user };
}
