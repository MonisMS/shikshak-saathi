import { prisma } from "@/lib/db";
import { SourcePage, type SourcePageData } from "@/lib/kit-source";
import * as z from "zod";

export type ResourceGroup = "documents" | "recordings";

export const RESOURCE_KINDS = ["pdf", "doc", "image", "text", "audio"] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];

const Pages = z.array(SourcePage);

export function kindsFor(group: ResourceGroup): ResourceKind[] {
  return group === "recordings" ? ["audio"] : ["pdf", "doc", "image", "text"];
}

export function parsePages(pages: unknown): SourcePageData[] {
  const parsed = Pages.safeParse(pages);
  return parsed.success ? parsed.data : [];
}

export async function listResources(teacherId: string, group?: ResourceGroup) {
  const rows = await prisma.teachingResource.findMany({
    where: { teacherId, ...(group ? { kind: { in: kindsFor(group) } } : {}) },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => {
    const pages = parsePages(r.pages);
    return {
      id: r.id,
      kind: r.kind as ResourceKind,
      title: r.title,
      grade: r.grade,
      subject: r.subject,
      sourceUrl: r.sourceUrl,
      fileName: r.fileName,
      audioSeconds: r.audioSeconds,
      pageCount: pages.length,
      preview: pages[0]?.text.slice(0, 280) ?? "",
      createdAt: r.createdAt.toISOString(),
    };
  });
}

export type ResourceListItem = Awaited<ReturnType<typeof listResources>>[number];

/** Merges the chosen resources (teacher-owned only) into one numbered set of source pages for a kit. */
export async function sourcePagesFromResources(teacherId: string, ids: string[]) {
  const rows = await prisma.teachingResource.findMany({ where: { teacherId, id: { in: ids } } });
  const ordered = ids.map((id) => rows.find((r) => r.id === id)).filter((r) => r !== undefined);
  const pages: SourcePageData[] = [];
  for (const r of ordered) {
    for (const p of parsePages(r.pages)) {
      if (pages.length >= 400) break;
      pages.push({ page: pages.length + 1, text: p.text, source: r.title });
    }
  }
  return { pages, titles: ordered.map((r) => r.title) };
}
