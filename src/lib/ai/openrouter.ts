import * as z from "zod";

/**
 * AI fallback when every Gemini key/model fails (§10.2, `research/voice-and-fallback.md` §5).
 * Plain `fetch` — no SDK — called only from server code, key never reaches the browser.
 */

const MODELS = (process.env.OPENROUTER_MODELS ?? "")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

function jsonSchemaOf(schema: z.ZodType) {
  const js = z.toJSONSchema(schema) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

export interface OpenRouterResult<T> {
  data: T;
  model: string; // "openrouter:<id>"
  latencyMs: number;
  inTok?: number;
  outTok?: number;
}

export async function generateJSONViaOpenRouter<T extends z.ZodType>(opts: {
  schema: T;
  system: string;
  user: string;
}): Promise<OpenRouterResult<z.infer<T>>> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || MODELS.length === 0) {
    throw new Error("OpenRouter is not configured (OPENROUTER_API_KEY / OPENROUTER_MODELS)");
  }

  let lastError: unknown;

  for (const model of MODELS) {
    const start = Date.now();
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
          "X-Title": "Shikshak Saathi",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: opts.system },
            { role: "user", content: opts.user },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "section", strict: false, schema: jsonSchemaOf(opts.schema) },
          },
          provider: { require_parameters: true },
          temperature: 0.4,
          // Without an explicit cap, some providers default to the model's max (e.g. 65536),
          // which OpenRouter's credit check prices against up front (→ 402 on a small balance)
          // and which also risks a very slow generation. Our JSON sections are all well under this.
          max_tokens: 8000,
        }),
        signal: AbortSignal.timeout(45_000),
      });

      if (!res.ok) {
        lastError = new Error(`OpenRouter ${model} responded HTTP ${res.status}`);
        continue;
      }

      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const content = body.choices?.[0]?.message?.content ?? "";
      const parsed = opts.schema.safeParse(JSON.parse(content));
      if (!parsed.success) {
        lastError = parsed.error;
        continue;
      }

      return {
        data: parsed.data,
        model: `openrouter:${model}`,
        latencyMs: Date.now() - start,
        inTok: body.usage?.prompt_tokens,
        outTok: body.usage?.completion_tokens,
      };
    } catch (e) {
      lastError = e;
      continue;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All OpenRouter models failed");
}
