import { readFile } from "node:fs/promises";
import path from "node:path";
import * as z from "zod";
import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import type { SectionType } from "@/generated/prisma/client";
import { generateJSONViaOpenRouter } from "./openrouter";

/**
 * Gemini wrapper (§10.2). Reference: `research/agent2-ai-pipeline.md` lines 123–226
 * (SDK choice, generateJSON shape, schema tips) + `research/agent3-stack-execution.md`
 * lines 703–752 (why one call per section, key/model fallback order) +
 * `research/voice-and-fallback.md` §5 (OpenRouter as the cross-provider fallback).
 */

const KEYS = (process.env.GEMINI_API_KEYS ?? "")
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

export const MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash";
export const MODEL_FAST = process.env.GEMINI_MODEL_FAST ?? "gemini-3.1-flash-lite";
const MODEL_FALLBACK = "gemini-3.5-flash"; // tried once after every key is rate-limited

const DEMO_MODE = process.env.DEMO_MODE === "true";

function jsonSchemaOf(schema: z.ZodType) {
  const js = z.toJSONSchema(schema) as Record<string, unknown>;
  delete js.$schema; // keep payload minimal, per the docs' schema-size warning
  return js;
}

/** 429/RESOURCE_EXHAUSTED and 5xx are worth rotating to the next key for; anything else isn't. */
function isRetryableGeminiError(e: unknown): boolean {
  if (e instanceof ApiError) return e.status === 429 || e.status >= 500;
  return /429|RESOURCE_EXHAUSTED/i.test(e instanceof Error ? e.message : String(e));
}

export interface GenerateJSONResult<T> {
  data: T;
  model: string; // e.g. "gemini-3.8-flash" or "openrouter:deepseek/deepseek-v4.1-flash" or "demo-cache"
  latencyMs: number;
  inTok?: number;
  outTok?: number;
  fromCache: boolean;
}

async function loadDemoSection(chapterId: string, sectionType: SectionType): Promise<unknown> {
  try {
    const file = path.join(process.cwd(), "data", "demo-kits", `${chapterId}.json`);
    const raw = await readFile(file, "utf-8");
    const json = JSON.parse(raw) as Record<string, unknown>;
    return json[sectionType];
  } catch {
    return undefined;
  }
}

interface GeminiCallOpts<T extends z.ZodType> {
  schema: T;
  system: string;
  user: string;
  parts?: { inlineData: { mimeType: string; data: string } }[];
  model: string;
  apiKey: string;
}

/** One key + one model. Retries once on a zod shape failure before giving up on this key. */
async function callGemini<T extends z.ZodType>(
  opts: GeminiCallOpts<T>,
): Promise<{ data: z.infer<T>; latencyMs: number; inTok?: number; outTok?: number }> {
  const client = new GoogleGenAI({ apiKey: opts.apiKey });
  const start = Date.now();

  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.models.generateContent({
      model: opts.model,
      contents: [{ role: "user", parts: [{ text: opts.user }, ...(opts.parts ?? [])] }],
      config: {
        systemInstruction: opts.system,
        responseMimeType: "application/json",
        responseJsonSchema: jsonSchemaOf(opts.schema),
        temperature: 0.4,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    });

    const parsed = opts.schema.safeParse(JSON.parse(res.text ?? "{}"));
    if (parsed.success) {
      return {
        data: parsed.data,
        latencyMs: Date.now() - start,
        inTok: res.usageMetadata?.promptTokenCount,
        outTok: res.usageMetadata?.candidatesTokenCount,
      };
    }
    if (attempt === 1) throw parsed.error; // one retry on shape failure, then give up on this key
  }
  /* istanbul ignore next — loop always returns or throws */
  throw new Error("unreachable");
}

export async function generateJSON<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  user: string;
  parts?: { inlineData: { mimeType: string; data: string } }[];
  model?: string;
  /** DEMO_MODE cache lookup key — omit to always call a real model. */
  demoCache?: { chapterId: string; sectionType: SectionType };
}): Promise<GenerateJSONResult<z.infer<T>>> {
  if (DEMO_MODE && opts.demoCache) {
    const cached = await loadDemoSection(opts.demoCache.chapterId, opts.demoCache.sectionType);
    if (cached !== undefined) {
      const parsed = opts.schema.safeParse(cached);
      if (parsed.success) {
        await new Promise((resolve) => setTimeout(resolve, 1500)); // still looks live on stage
        return { data: parsed.data, model: "demo-cache", latencyMs: 1500, fromCache: true };
      }
    }
  }

  const hasFiles = (opts.parts?.length ?? 0) > 0;
  const model = opts.model ?? MODEL;
  let lastError: unknown;

  if (KEYS.length === 0 && hasFiles) {
    throw new Error("File input (PDF/image/audio) requires Gemini; no GEMINI_API_KEYS configured");
  }

  for (const apiKey of KEYS) {
    try {
      const result = await callGemini({ schema: opts.schema, system: opts.system, user: opts.user, parts: opts.parts, model, apiKey });
      return { ...result, model, fromCache: false };
    } catch (e) {
      lastError = e;
      if (!isRetryableGeminiError(e)) break; // a non-rate-limit failure won't fix itself on another key
    }
  }

  if (KEYS.length > 0) {
    try {
      const result = await callGemini({ schema: opts.schema, system: opts.system, user: opts.user, parts: opts.parts, model: MODEL_FALLBACK, apiKey: KEYS[0] });
      return { ...result, model: MODEL_FALLBACK, fromCache: false };
    } catch (e) {
      lastError = e;
    }
  }

  if (hasFiles) {
    // PDF/image/audio input is Gemini-only — OpenRouter can't take inlineData here.
    throw lastError instanceof Error ? lastError : new Error("Gemini file input failed");
  }

  try {
    const result = await generateJSONViaOpenRouter({ schema: opts.schema, system: opts.system, user: opts.user });
    return { ...result, fromCache: false };
  } catch (e) {
    lastError = e;
  }

  throw lastError instanceof Error ? lastError : new Error("All Gemini keys and OpenRouter models failed");
}
