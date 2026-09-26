import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * F66/U12b (§11.3). DIKSHA's public search API needs no auth. Reference:
 * `research/agent2-ai-pipeline.md` lines 96-119 (verified request/response shape).
 */

export interface DikshaResult {
  name: string;
  identifier: string;
  primaryCategory?: string;
  mimeType?: string;
  playUrl: string;
}

export type Medium = "English" | "Hindi";

export async function searchDiksha(opts: {
  query: string;
  grade: number;
  subject: string;
  medium: Medium;
}): Promise<DikshaResult[]> {
  const res = await fetch("https://diksha.gov.in/api/content/v1/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      request: {
        query: opts.query,
        filters: {
          gradeLevel: [`Class ${opts.grade}`],
          subject: [opts.subject],
          medium: [opts.medium],
        },
        limit: 5,
        fields: ["name", "identifier", "primaryCategory", "mimeType"],
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) throw new Error(`DIKSHA responded HTTP ${res.status}`);

  const data = (await res.json()) as {
    result?: { content?: { name: string; identifier: string; primaryCategory?: string; mimeType?: string }[] };
  };
  const content = data.result?.content ?? [];

  return content.slice(0, 5).map((c) => ({
    name: c.name,
    identifier: c.identifier,
    primaryCategory: c.primaryCategory,
    mimeType: c.mimeType,
    playUrl: `https://diksha.gov.in/play/content/${c.identifier}`,
  }));
}

/** Static fallback when the government API is unreachable (unknown uptime). */
export async function loadDikshaFallback(): Promise<DikshaResult[]> {
  try {
    const raw = await readFile(path.join(process.cwd(), "data", "diksha-cache.json"), "utf-8");
    return JSON.parse(raw) as DikshaResult[];
  } catch {
    return [];
  }
}
