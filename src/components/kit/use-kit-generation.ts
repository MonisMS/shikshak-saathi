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

/** OBJECTIVES → LESSON_PLAN → (everything else in parallel) → PARENT_NOTE → validate/repair (§10.1). */
const PIPELINE_ORDER: SectionType[][] = [
  [SectionType.OBJECTIVES],
  [SectionType.LESSON_PLAN],
  [
    SectionType.WORKSHEET,
    SectionType.EXIT_QUIZ,
    SectionType.STARTER_QUIZ,
    SectionType.SUMMATIVE,
    SectionType.MULTIGRADE,
    SectionType.BLACKBOARD,
    SectionType.REMEDIAL,
  ],
  [SectionType.PARENT_NOTE],
];

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
      init[s.type] = { status: DB_TO_UI[s.status], content: s.content ?? undefined, error: s.error ?? undefined };
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

  const runIfNeeded = useCallback(
    async (type: SectionType) => {
      if (!present(type)) return true; // this kit didn't select this section
      if (sections[type]?.status === "done") return true; // resume support
      return runOne(type);
    },
    [present, sections, runOne],
  );

  const start = useCallback(async () => {
    const [objectivesStep, planStep, parallelStep, parentNoteStep] = PIPELINE_ORDER;

    const objectivesOk = await runIfNeeded(objectivesStep[0]);
    if (!objectivesOk) return;

    if (present(planStep[0])) {
      const planOk = await runIfNeeded(planStep[0]);
      if (!planOk) return;
    }

    await Promise.allSettled(parallelStep.filter(present).map((type) => runIfNeeded(type)));
    await Promise.allSettled(parentNoteStep.filter(present).map((type) => runIfNeeded(type)));

    setSections((prev) => {
      const next = { ...prev };
      for (const type of Object.keys(next)) {
        if (next[type].status === "done") next[type] = { ...next[type], status: "checking" };
      }
      return next;
    });

    const validation = await refreshValidation();
    const failedByType = validation?.failedByType ?? {};

    const anyRepair = Object.values(failedByType).some((rules) => rules && rules.length > 0);
    await Promise.allSettled(
      Object.entries(failedByType).map(async ([type, rules]) => {
        if (!rules || rules.length === 0) return;
        await runOne(type as SectionType, { repair: rules });
      }),
    );
    if (anyRepair) await refreshValidation(); // show what's still red after the one repair attempt

    setSections((prev) => {
      const next = { ...prev };
      for (const type of Object.keys(next)) {
        if (next[type].status === "checking") next[type] = { ...next[type], status: "done" };
      }
      return next;
    });
  }, [runIfNeeded, present, runOne, refreshValidation]);

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

  return { sections, checks, regenerate, retry: (type: SectionType) => runOne(type), save };
}
