"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { toast } from "sonner";
import { AnimatePresence, motion } from "motion/react";
import { WifiOff, Minus, Plus, Check } from "lucide-react";
import type { Quiz } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TapScale } from "@/components/motion/tap-scale";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/layout/language-provider";
import { tx } from "@/lib/i18n";

type QuizData = z.infer<typeof Quiz>;
const OFFLINE_KEY_PREFIX = "shikshak-pending-results-";

/** F40: live quick-check — one question at a time, large tap targets, works on a
 * phone during class. Same POST /api/kits/[id]/results {method:"TALLY", ...} contract
 * as before, just paced question-by-question instead of one long scrolling form.
 * If the save fails (e.g. offline), the tally is queued in localStorage and flushed
 * automatically the next time the browser comes back online. */
export function TallyGrid({ kitId, title, quiz }: { kitId: string; title: string; quiz: QuizData }) {
  const router = useRouter();
  const { lang } = useLanguage();
  const [studentsPresent, setStudentsPresent] = useState(40);
  const [tally, setTally] = useState<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(quiz.questions.map((q) => [q.id, Object.fromEntries(q.options.map((o) => [o.id, 0]))])),
  );
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void flushQueued(kitId);
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [kitId]);

  const question = quiz.questions[index];
  const isLast = index === quiz.questions.length - 1;
  const responsesThisQuestion = Object.values(tally[question.id] ?? {}).reduce((a, b) => a + b, 0);

  function bump(optionId: string, delta: number) {
    setTally((prev) => ({
      ...prev,
      [question.id]: { ...prev[question.id], [optionId]: Math.max(0, (prev[question.id]?.[optionId] ?? 0) + delta) },
    }));
  }

  function goNext() {
    if (!isLast) setIndex((i) => i + 1);
    else void finish();
  }

  function skip() {
    if (!isLast) setIndex((i) => i + 1);
    else void finish();
  }

  async function finish() {
    setSaving(true);
    const payload = { method: "TALLY", studentsPresent, tally };
    try {
      if (!navigator.onLine) throw new Error("offline");
      const res = await fetch(`/api/kits/${kitId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? `Failed (${res.status})`);
      }
      toast.success(tx(lang, "Results saved", "परिणाम सहेजे गए"));
      router.push(`/kits/${kitId}/insights`);
    } catch {
      localStorage.setItem(OFFLINE_KEY_PREFIX + kitId, JSON.stringify(payload));
      toast.message(tx(lang, "Saved on this phone — will sync when you're back online", "इस फ़ोन पर सहेजा गया — इंटरनेट आने पर भेज दिया जाएगा"));
      router.push(`/kits/${kitId}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      {!online && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <WifiOff className="size-4 shrink-0" />
          {tx(lang, "Offline — your taps are saved on this phone and will sync later.", "ऑफ़लाइन — आपकी गिनती इस फ़ोन पर सहेजी है, बाद में भेज दी जाएगी.")}
        </div>
      )}

      <div className="space-y-1">
        <h1 className="text-lg font-semibold leading-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {tx(lang, `Question ${index + 1} of ${quiz.questions.length}`, `प्रश्न ${index + 1} / ${quiz.questions.length}`)}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-primary"
            animate={{ width: `${((index + 1) / quiz.questions.length) * 100}%` }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card px-3 py-2">
        <Label htmlFor="present" className="text-sm text-muted-foreground">
          {tx(lang, "Students present", "उपस्थित छात्र")}
        </Label>
        <Input
          id="present"
          type="number"
          min={0}
          value={studentsPresent}
          onChange={(e) => setStudentsPresent(Number(e.target.value))}
          className="h-9 w-20 text-right"
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="space-y-3 rounded-xl border border-border/70 bg-card p-4"
        >
          <p className="text-base font-medium leading-snug">{question.stem}</p>

          <div className="space-y-2">
            {question.options.map((o) => {
              const count = tally[question.id]?.[o.id] ?? 0;
              return (
                <div
                  key={o.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                    o.correct ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40" : "border-border/70",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium">
                      {o.id}. {o.text}
                    </span>
                    {o.correct && (
                      <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        <Check className="size-2.5" /> {tx(lang, "Correct", "सही")}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <TapScale
                      onClick={() => bump(o.id, -1)}
                      className="flex size-10 items-center justify-center rounded-full border border-border bg-background text-foreground disabled:opacity-40"
                      disabled={count === 0}
                    >
                      <Minus className="size-4" />
                    </TapScale>
                    <span className="w-6 text-center text-base font-semibold tabular-nums">{count}</span>
                    <TapScale
                      onClick={() => bump(o.id, 1)}
                      className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Plus className="size-4" />
                    </TapScale>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-right text-xs text-muted-foreground">{tx(lang, `${responsesThisQuestion} responses recorded`, `${responsesThisQuestion} उत्तर दर्ज`)}</p>
        </motion.div>
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="lg" className="flex-1" onClick={skip} disabled={saving}>
          {tx(lang, "Skip question", "प्रश्न छोड़ें")}
        </Button>
        <Button type="button" size="lg" className="flex-1" onClick={goNext} disabled={saving}>
          {isLast ? (saving ? tx(lang, "Finishing…", "पूरा कर रहे हैं…") : tx(lang, "Finish check", "जाँच पूरी करें")) : tx(lang, "Next question", "अगला प्रश्न")}
        </Button>
      </div>
    </div>
  );
}

async function flushQueued(kitId: string) {
  const key = OFFLINE_KEY_PREFIX + kitId;
  const raw = localStorage.getItem(key);
  if (!raw) return;
  try {
    const res = await fetch(`/api/kits/${kitId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: raw,
    });
    if (res.ok) {
      localStorage.removeItem(key);
      toast.success("Earlier offline results synced");
    }
  } catch {
    // still offline or the request failed — leave it queued, we'll retry on the next "online" event.
  }
}
