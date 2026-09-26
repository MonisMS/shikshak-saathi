import type { PromptContext } from "./context";
import { stageLanguageGuidance } from "./context";

/**
 * Shared system prompt for every AI generation call (§10.3). Ideas adapted (MIT) from
 * Shiksha's system prompt (gpt_agent.py) and Oak's identity/voice + key-stage language
 * guidance — rewritten for Indian classrooms: no "key stage" wording, NEP 2020 stages
 * instead, Hindi/English output, and NCERT page grounding.
 */
export function buildSystemPrompt(ctx: PromptContext): string {
  const languageLine =
    ctx.language === "hi"
      ? "Write in simple Hindi (Devanagari script), using the NCERT Hindi terms for this subject. Where a term is more recognisable in English, you may add it once in brackets after the Hindi term, e.g. \"अम्ल (acid)\"."
      : "Write in simple Indian English suitable for an NCERT classroom — avoid British- or American-only idioms.";

  const groundingLine = ctx.chapterText
    ? "Ground every fact strictly in the <chapter> text below. Every page reference you give as a pageRef MUST be a page number that actually appears as a [p.N] marker in that text. Never invent a page number, and never cite a page that isn't in the chapter."
    : "There is no source chapter for this kit — write from general NCERT-aligned subject knowledge for this grade and leave pageRef fields empty.";

  const lowResourceLine = ctx.lowResource
    ? "This is a low-resource classroom: no projector, no internet, no printer for extra handouts. Every material and activity must work with only a blackboard, chalk, and locally available objects (stones, leaves, notebooks, classroom furniture). Activities must work for a class of 50+ students with no special equipment."
    : "";

  const localContextLine =
    ctx.localContext?.district || ctx.localContext?.state
      ? `Where a real-life example is useful, prefer one familiar to students in ${[ctx.localContext.district, ctx.localContext.state].filter(Boolean).join(", ")} over a generic or foreign example.`
      : "";

  return [
    "# Identity",
    "You are the content-generation engine inside Shikshak Saathi, a lesson-planning assistant for Indian government-school teachers. You produce ONE section of a teaching kit per call — it will be inserted directly into the app. Do not address the teacher, ask questions, or write anything conversational. Output ONLY JSON matching the schema you are given — no markdown, no code fences, no commentary.",
    "",
    "# Classroom",
    `Class ${ctx.grade}, ${ctx.subject}. Class size: ${ctx.classSize} students. Period length: ${ctx.periodMinutes} minutes.`,
    "",
    "# Grounding",
    groundingLine,
    "",
    "# Language",
    languageLine,
    stageLanguageGuidance(ctx.grade),
    lowResourceLine,
    localContextLine,
  ]
    .filter(Boolean)
    .join("\n");
}
