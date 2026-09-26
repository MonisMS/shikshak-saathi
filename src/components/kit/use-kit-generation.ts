"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SectionStatus, SectionType } from "@/generated/prisma/enums";
import type { SectionUiStatus } from "./section-status-pill";
import type { ValidationRuleResult } from "@/lib/validate";

export interface KitSectionInit {
  type: SectionType;
  status: SectionStatus;
  content: unknown;
  error: string | null;
}

export interface KitForGeneration {
  id: string;
  sections: KitSectionInit[];
}

interface SectionState {
  status: SectionUiStatus;
  content?: unknown;
  error?: string;
}

const DB_TO_UI: Record<SectionStatus, SectionUiStatus> = {
  PENDING: "queued",
  GENERATING: "writing",
  READY: "done",
  FAILED: "failed",
};

/** Generated automatically when the kit opens; everything else is on demand. */
export const CORE_SECTIONS: SectionType[] = [SectionType.OBJECTIVES, SectionType.LESSON_PLAN];
/** Offered as "Generate" buttons once the lesson plan is ready — the teacher chooses. */
export const OPTIONAL_SECTIONS: SectionType[] = [SectionType.WORKSHEET, SectionType.EXIT_QUIZ, SectionType.PARENT_NOTE];

async function postSection(kitId: string, type: SectionType, body: Record<string, unknown> = {}) {
  const res = await fetch(`/api/kits/${kitId}/sections/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string })?.error ?? `${type} failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

async function patchSection(kitId: string, type: SectionType, content: unknown) {
  const res = await fetch(`/api/kits/${kitId}/sections/${type}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data as { error?: string })?.error ?? `Save failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

interface ValidateResponse {
  results: ValidationRuleResult[];
  failedByType?: Partial<Record<SectionType, string[]>>;
}

async function postValidate(kitId: string): Promise<ValidateResponse | null> {
  try {
    const res = await fetch(`/api/kits/${kitId}/validate`, { method: "POST" });
    if (!res.ok) return null;
    return (await res.json()) as ValidateResponse;
  } catch {
    return null;
  }
}

export function useKitGeneration(kit: KitForGeneration) {
  const [sections, setSections] = useState<Record<string, SectionState>>(() => {
    const init: Record<string, SectionState> = {};
    for (const s of kit.sections) {
      const ui = DB_TO_UI[s.status];
      const optional = OPTIONAL_SECTIONS.includes(s.type);
      init[s.type] = {
        status: optional && (ui === "queued" || ui === "writing") ? "idle" : ui,
        content: s.content ?? undefined,
        error: s.error ?? undefined,
      };
    }
    for (const type of OPTIONAL_SECTIONS) {
      if (!(type in init)) init[type] = { status: "idle" };
    }
    return init;
  });
  const [checks, setChecks] = useState<ValidationRuleResult[] | null>(null);
  const started = useRef(false);

  const refreshValidation = useCallback(async () => {
    const validation = await postValidate(kit.id);
    if (validation) setChecks(validation.results);
    return validation;
  }, [kit.id]);

  const present = useCallback((type: SectionType) => type in sections, [sections]);

  const runOne = useCallback(
    async (type: SectionType, body?: Record<string, unknown>) => {
      setSections((prev) => ({ ...prev, [type]: { ...prev[type], status: "writing", error: undefined } }));
      try {
        const content = await postSection(kit.id, type, body);
        setSections((prev) => ({ ...prev, [type]: { status: "done", content } }));
        return true;
      } catch (e) {
        setSections((prev) => ({ ...prev, [type]: { status: "failed", error: e instanceof Error ? e.message : String(e) } }));
        return false;
      }
    },
    [kit.id],
  );

  const start = useCallback(async () => {
    const generatedNow: SectionType[] = [];
    for (const type of CORE_SECTIONS) {
      if (!present(type)) continue;
      if (sections[type]?.status === "done") continue; // resume support
      const ok = await runOne(type);
      if (!ok) return;
      generatedNow.push(type);
    }

    const validation = await refreshValidation();
    // One repair attempt, only for sections written in this visit — never silently rewrite reviewed content.
    const repairs = Object.entries(validation?.failedByType ?? {}).filter(
      ([type, rules]) => rules && rules.length > 0 && generatedNow.includes(type as SectionType),
    );
    if (repairs.length === 0) return;
    await Promise.allSettled(repairs.map(([type, rules]) => runOne(type as SectionType, { repair: rules })));
    await refreshValidation();
  }, [present, sections, runOne, refreshValidation]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerate = useCallback(
    async (type: SectionType, instruction?: string) => {
      const success = await runOne(type, instruction ? { instruction } : {});
      if (success) await refreshValidation(); // §5.2: regenerating re-runs the checker (and quiz-staleness depends on it)
      return success;
    },
    [runOne, refreshValidation],
  );

  const save = useCallback(
    async (type: SectionType, content: unknown) => {
      const saved = await patchSection(kit.id, type, content);
      setSections((prev) => ({ ...prev, [type]: { status: "done", content: saved } }));
      await refreshValidation();
    },
    [kit.id, refreshValidation],
  );

  const generate = useCallback(
    async (type: SectionType) => {
      const success = await runOne(type);
      if (success) await refreshValidation();
      return success;
    },
    [runOne, refreshValidation],
  );

  return { sections, checks, generate, regenerate, retry: (type: SectionType) => runOne(type), save };
}
