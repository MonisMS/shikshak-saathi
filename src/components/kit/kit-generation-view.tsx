"use client";

import { AnimatePresence, motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { SectionType } from "@/generated/prisma/enums";
import { Objectives, LessonPlan, Worksheet, Quiz, ParentNote } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FadeIn } from "@/components/motion/fade-in";
import { useKitGeneration, type KitForGeneration } from "./use-kit-generation";
import { SectionStatusPill } from "./section-status-pill";
import { RegenerateControl } from "./regenerate-control";
import { SaveOfflineButton } from "@/components/pwa/pwa";
import { CheckerPanel } from "./checker-panel";
import { isQuizStale } from "./quiz-freshness";
import { ObjectivesCard } from "./objectives-card";
import { LessonPlanCard } from "./lesson-plan-card";
import { WorksheetCard } from "./worksheet-card";
import { QuizCard } from "./quiz-card";
import { ParentNoteCard } from "./parent-note-card";
import { PublishTestButton } from "./publish-test-button";
import { useLanguage } from "@/components/layout/language-provider";
import { tx, type Lang } from "@/lib/i18n";

const PUBLISHABLE = new Set<SectionType>([SectionType.WORKSHEET, SectionType.EXIT_QUIZ, SectionType.STARTER_QUIZ]);

const SECTION_TITLES: Record<SectionType, { en: string; hi: string }> = {
  OBJECTIVES: { en: "Objectives", hi: "उद्देश्य" },
  LESSON_PLAN: { en: "Lesson plan", hi: "पाठ योजना" },
  WORKSHEET: { en: "Worksheet", hi: "कार्यपत्रक" },
  EXIT_QUIZ: { en: "Exit quiz", hi: "निकास प्रश्नोत्तरी" },
  STARTER_QUIZ: { en: "Starter quiz", hi: "आरंभिक प्रश्नोत्तरी" },
  SUMMATIVE: { en: "Summative test", hi: "सारांश परीक्षा" },
  MULTIGRADE: { en: "Multi-grade plan", hi: "बहु-कक्षा योजना" },
  BLACKBOARD: { en: "Blackboard layout", hi: "श्यामपट योजना" },
  REMEDIAL: { en: "Remedial activities", hi: "उपचारात्मक गतिविधियाँ" },
  PARENT_NOTE: { en: "Parent note", hi: "अभिभावक संदेश" },
};

const OPTIONAL_BLURB: Partial<Record<SectionType, { en: string; hi: string }>> = {
  OBJECTIVES: {
    en: "3–5 learning objectives for this lesson, each tied to its source page.",
    hi: "इस पाठ के 3–5 सीखने के उद्देश्य, हर एक स्रोत के पृष्ठ से जुड़ा।",
  },
  LESSON_PLAN: {
    en: "A timed plan for the period — what you say, what students do, and the misconceptions to watch for.",
    hi: "कालांश की समयबद्ध योजना — आप क्या कहेंगे, विद्यार्थी क्या करेंगे, और किन गलत धारणाओं पर ध्यान दें।",
  },
  WORKSHEET: {
    en: "Practice questions with an answer key, built from your lesson plan.",
    hi: "आपकी पाठ योजना से बने अभ्यास प्रश्न, उत्तर कुंजी के साथ।",
  },
  EXIT_QUIZ: {
    en: "3–5 quick questions where every wrong option points to a misconception. Needed to enter results after class.",
    hi: "3–5 छोटे प्रश्न, जिनका हर गलत विकल्प एक गलत धारणा दिखाता है। कक्षा के बाद परिणाम भरने के लिए ज़रूरी।",
  },
  PARENT_NOTE: {
    en: "A short, WhatsApp-ready note for parents with tonight’s homework and one home activity.",
    hi: "अभिभावकों के लिए WhatsApp पर भेजने लायक छोटा संदेश — आज का गृहकार्य और घर की एक गतिविधि।",
  },
};

function friendlyError(error: string | undefined, lang: Lang): string {
  if (!error) return tx(lang, "Something went wrong. Try again.", "कुछ गड़बड़ हो गई। फिर से कोशिश करें।");
  if (/HTTP 40[12]|429|quota|RESOURCE_EXHAUSTED|rate.?limit|not configured|UNAVAILABLE|503/i.test(error)) {
    return tx(
      lang,
      "The AI service is busy or out of quota right now. Wait a minute and press Retry.",
      "AI सेवा अभी व्यस्त है या उसका कोटा खत्म हो गया है। एक मिनट रुककर फिर से कोशिश करें।",
    );
  }
  if (/must be READY/i.test(error)) {
    return tx(lang, "Generate the lesson plan first, then try this section again.", "पहले पाठ योजना बनाएँ, फिर यह भाग दोबारा बनाएँ।");
  }
  return error;
}

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
  kitId,
  content,
  planContent,
  onSave,
  onRegenerate,
}: {
  type: SectionType;
  kitId: string;
  content: unknown;
  planContent: unknown;
  onSave: (content: unknown) => Promise<void>;
  onRegenerate: () => Promise<void>;
}) {
  const { lang } = useLanguage();
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
          title={SECTION_TITLES[type][lang]}
          onSave={onSave}
          stale={stale}
          onRegenerate={onRegenerate}
        />
      );
    }
    case SectionType.PARENT_NOTE: {
      const parsed = ParentNote.safeParse(content);
      return parsed.success ? <ParentNoteCard kitId={kitId} data={parsed.data} /> : null;
    }
    default:
      // BLACKBOARD/MULTIGRADE/SUMMATIVE/REMEDIAL cards land in later tasks (P11/P12).
      return <p className="text-sm text-muted-foreground">{tx(lang, "This section’s card lands in a later task.", "इस भाग का कार्ड बाद में आएगा।")}</p>;
  }
}

export function KitGenerationView({ kit, title }: { kit: KitForGeneration; title: string }) {
  const { lang } = useLanguage();
  const { sections, checks, generate, regenerate, save } = useKitGeneration(kit);
  const planContent = sections[SectionType.LESSON_PLAN]?.content;
  const planReady = sections[SectionType.LESSON_PLAN]?.status === "done";

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-4 lg:sticky lg:top-4">
        <CheckerPanel results={checks} />
      </div>

      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <SaveOfflineButton kitId={kit.id} title={title} />
        </div>
        {ORDER.filter((type) => type in sections).map((type, index) => {
        const state = sections[type];
        const canEditOrRegenerate = state.status === "done";
        return (
          <FadeIn key={type} index={index} className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">{SECTION_TITLES[type][lang]}</h2>
              <div className="flex items-center gap-2">
                <SectionStatusPill status={state.status} />
                {canEditOrRegenerate && (
                  <RegenerateControl onRegenerate={async (instruction) => { await regenerate(type, instruction); }} />
                )}
                {canEditOrRegenerate && PUBLISHABLE.has(type) && (
                  <PublishTestButton kitId={kit.id} sectionType={type as "WORKSHEET" | "EXIT_QUIZ" | "STARTER_QUIZ"} />
                )}
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              {state.status === "idle" ? (
                <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <div className="flex flex-col gap-4 rounded-3xl border border-dashed border-border bg-card/60 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <p className="max-w-md text-sm text-muted-foreground">
                      {OPTIONAL_BLURB[type]?.[lang]}
                      {!planReady &&
                        type !== SectionType.OBJECTIVES &&
                        type !== SectionType.LESSON_PLAN &&
                        tx(lang, " The lesson plan will be created first.", " पहले पाठ योजना बनेगी।")}
                    </p>
                    <Button onClick={() => generate(type)} className="shrink-0">
                      <Sparkles /> {tx(lang, `Generate ${SECTION_TITLES[type].en.toLowerCase()}`, `${SECTION_TITLES[type].hi} बनाएँ`)}
                    </Button>
                  </div>
                </motion.div>
              ) : state.status === "writing" || state.status === "queued" || state.status === "checking" ? (
                <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Card className="border-border/70">
                    <CardContent className="pt-6">
                      <Skeleton className="h-24 w-full" />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : state.status === "failed" ? (
                <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Card className="border-border/70">
                    <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-destructive">{friendlyError(state.error, lang)}</p>
                      <Button size="sm" onClick={() => generate(type)} className="shrink-0">{tx(lang, "Retry", "फिर से कोशिश करें")}</Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div key="body" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <SectionBody
                    type={type}
                    kitId={kit.id}
                    content={state.content}
                    planContent={planContent}
                    onSave={(content) => save(type, content)}
                    onRegenerate={async () => { await regenerate(type); }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </FadeIn>
        );
        })}
      </div>
    </div>
  );
}
