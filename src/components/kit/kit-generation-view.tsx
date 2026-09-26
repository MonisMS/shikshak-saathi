"use client";

import { SectionType } from "@/generated/prisma/enums";
import { Objectives, LessonPlan, Worksheet, Quiz } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useKitGeneration, type KitForGeneration } from "./use-kit-generation";
import { SectionStatusPill } from "./section-status-pill";
import { RegenerateControl } from "./regenerate-control";
import { isQuizStale } from "./quiz-freshness";
import { ObjectivesCard } from "./objectives-card";
import { LessonPlanCard } from "./lesson-plan-card";
import { WorksheetCard } from "./worksheet-card";
import { QuizCard } from "./quiz-card";

const SECTION_TITLES: Record<SectionType, string> = {
  OBJECTIVES: "Objectives",
  LESSON_PLAN: "Lesson plan",
  WORKSHEET: "Worksheet",
  EXIT_QUIZ: "Exit quiz",
  STARTER_QUIZ: "Starter quiz",
  SUMMATIVE: "Summative test",
  MULTIGRADE: "Multi-grade plan",
  BLACKBOARD: "Blackboard layout",
  REMEDIAL: "Remedial activities",
  PARENT_NOTE: "Parent note",
};

// §10.1's display order — Objectives → Plan → the parallel batch → Parent note.
const ORDER: SectionType[] = [
  SectionType.OBJECTIVES,
  SectionType.LESSON_PLAN,
  SectionType.WORKSHEET,
  SectionType.EXIT_QUIZ,
  SectionType.STARTER_QUIZ,
  SectionType.SUMMATIVE,
  SectionType.MULTIGRADE,
  SectionType.BLACKBOARD,
  SectionType.REMEDIAL,
  SectionType.PARENT_NOTE,
];

function SectionBody({
  type,
  content,
  planContent,
  onSave,
  onRegenerate,
}: {
  type: SectionType;
  content: unknown;
  planContent: unknown;
  onSave: (content: unknown) => Promise<void>;
  onRegenerate: () => Promise<void>;
}) {
  switch (type) {
    case SectionType.OBJECTIVES: {
      const parsed = Objectives.safeParse(content);
      return parsed.success ? <ObjectivesCard data={parsed.data} onSave={onSave} /> : null;
    }
    case SectionType.LESSON_PLAN: {
      const parsed = LessonPlan.safeParse(content);
      return parsed.success ? <LessonPlanCard data={parsed.data} onSave={onSave} /> : null;
    }
    case SectionType.WORKSHEET: {
      const parsed = Worksheet.safeParse(content);
      return parsed.success ? <WorksheetCard data={parsed.data} onSave={onSave} /> : null;
    }
    case SectionType.EXIT_QUIZ:
    case SectionType.STARTER_QUIZ: {
      const parsed = Quiz.safeParse(content);
      if (!parsed.success) return null;
      const plan = LessonPlan.safeParse(planContent);
      const stale = plan.success ? isQuizStale(parsed.data, plan.data) : false;
      return (
        <QuizCard
          data={parsed.data}
          title={SECTION_TITLES[type]}
          onSave={onSave}
          stale={stale}
          onRegenerate={onRegenerate}
        />
      );
    }
    default:
      // BLACKBOARD/MULTIGRADE/SUMMATIVE/REMEDIAL/PARENT_NOTE cards land in later tasks (P8/P11/P12).
      return <p className="text-sm text-muted-foreground">This section&apos;s card lands in a later task.</p>;
  }
}

export function KitGenerationView({ kit, title }: { kit: KitForGeneration; title: string }) {
  const { sections, retry, regenerate, save } = useKitGeneration(kit);
  const planContent = sections[SectionType.LESSON_PLAN]?.content;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {ORDER.filter((type) => type in sections).map((type) => {
        const state = sections[type];
        const canEditOrRegenerate = state.status === "done";
        return (
          <div key={type} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{SECTION_TITLES[type]}</h2>
              <div className="flex items-center gap-2">
                <SectionStatusPill status={state.status} />
                {state.status === "failed" && (
                  <Button size="sm" variant="outline" onClick={() => retry(type)}>
                    Retry
                  </Button>
                )}
                {canEditOrRegenerate && (
                  <RegenerateControl onRegenerate={async (instruction) => { await regenerate(type, instruction); }} />
                )}
              </div>
            </div>

            {state.status === "writing" || state.status === "queued" || state.status === "checking" ? (
              <Card>
                <CardContent className="pt-6">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ) : state.status === "failed" ? (
              <Card>
                <CardContent className="pt-6 text-sm text-destructive">{state.error}</CardContent>
              </Card>
            ) : (
              <SectionBody
                type={type}
                content={state.content}
                planContent={planContent}
                onSave={(content) => save(type, content)}
                onRegenerate={async () => { await regenerate(type); }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
