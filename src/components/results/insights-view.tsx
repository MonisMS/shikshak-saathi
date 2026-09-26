"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/fade-in";
import type { MisconceptionCountRow, ObjectiveMasteryRow, QuestionAccuracyRow, MasteryBand } from "@/lib/misconceptions";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/layout/language-provider";
import { tx, type Lang } from "@/lib/i18n";

const BAND_COLOR: Record<MasteryBand, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
};
// Band label always shown alongside the bar so understanding is never read from color alone.
const BAND_LABEL = (lang: Lang): Record<MasteryBand, string> => ({
  green: tx(lang, "Strong", "मज़बूत"),
  amber: tx(lang, "Worth revisiting", "दोबारा देखना अच्छा रहेगा"),
  red: tx(lang, "Needs another explanation", "फिर से समझाने की ज़रूरत"),
});

function Bar({ label, pct, colorClass, bandLabel }: { label: string; pct: number; colorClass: string; bandLabel?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="min-w-0 truncate">{label}</span>
        <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
          {bandLabel && <span className="text-xs">{bandLabel}</span>}
          <span className="tabular-nums">{Math.round(pct * 100)}%</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className={cn("h-full rounded-full", colorClass)}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, pct * 100)}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function bandFor(accuracy: number): MasteryBand {
  return accuracy >= 0.7 ? "green" : accuracy >= 0.4 ? "amber" : "red";
}

export function InsightsView({
  kitId,
  title,
  misconceptions,
  accuracy,
  mastery,
}: {
  kitId: string;
  title: string;
  misconceptions: MisconceptionCountRow[];
  accuracy: QuestionAccuracyRow[];
  mastery: ObjectiveMasteryRow[];
}) {
  const { lang } = useLanguage();
  const [fixing, setFixing] = useState(false);
  const [targetKitId, setTargetKitId] = useState<string | null>(null);

  // F46/F47: top 2-3 misconceptions with percent >= 10% are eligible for a next-day fix (§10.7).
  const eligible = misconceptions.filter((m) => m.percent >= 0.1).slice(0, 3);

  async function addFix() {
    setFixing(true);
    try {
      const res = await fetch(`/api/kits/${kitId}/fixes`, { method: "POST" });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed (${res.status})`);
      const { targetKitId: nextId } = data as { targetKitId?: string };
      setTargetKitId(nextId ?? null);
      toast.success(tx(lang, "5-minute fix added to tomorrow's kit", "कल की किट में 5 मिनट का सुधार जोड़ दिया गया"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tx(lang, "Could not generate the fix", "सुधार नहीं बन सका"));
    } finally {
      setFixing(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">{title} — {tx(lang, "Understanding", "समझ")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tx(lang, "Based on today's quick check. Nothing here identifies individual students.", "आज की छोटी जाँच के आधार पर. इसमें किसी छात्र की पहचान नहीं है.")}
        </p>
      </FadeIn>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">{tx(lang, "How the class understood it", "कक्षा ने कितना समझा")}</h2>

        <FadeIn index={1}>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">{tx(lang, "Common wrong answers may indicate…", "आम गलत उत्तर ये गलतफ़हमियाँ दिखा सकते हैं…")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {misconceptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tx(lang, "No recurring misconception showed up in this quiz's wrong answers.", "इस प्रश्नोत्तरी के गलत उत्तरों में कोई बार-बार आने वाली गलतफ़हमी नहीं दिखी.")}</p>
              ) : (
                misconceptions.map((m) => (
                  <div key={m.code} className="space-y-1">
                    <Bar label={`${m.studentCount} ${tx(lang, "students", "छात्र")} · ${m.label}`} pct={m.percent} colorClass="bg-rose-400" />
                    <p className="text-xs text-muted-foreground">{tx(lang, "may indicate this — worth revisiting:", "यह गलतफ़हमी हो सकती है — दोबारा समझाएँ:")} {m.correction}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn index={2}>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">{tx(lang, "Per-question accuracy", "हर प्रश्न की सटीकता")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accuracy.map((a, i) => (
                <Bar key={a.questionId} label={`Q${i + 1}`} pct={a.accuracy} colorClass={BAND_COLOR[bandFor(a.accuracy)]} bandLabel={BAND_LABEL(lang)[bandFor(a.accuracy)]} />
              ))}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn index={3}>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">{tx(lang, "Per-objective mastery", "हर उद्देश्य की पकड़")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mastery.map((m) => (
                <Bar key={m.objectiveId} label={m.objectiveId} pct={m.accuracy} colorClass={BAND_COLOR[m.band]} bandLabel={BAND_LABEL(lang)[m.band]} />
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {eligible.length > 0 && (
        <FadeIn index={4} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">{tx(lang, "Plan next lesson", "अगला पाठ तैयार करें")}</h2>
          <Card className="border-border/70">
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm text-muted-foreground">
                {tx(lang, "A short reteaching activity for the misconceptions above, ready to drop into tomorrow's kit.", "ऊपर की गलतफ़हमियों के लिए दोबारा समझाने की छोटी गतिविधि, कल की किट में जोड़ने के लिए तैयार.")}
              </p>
              <ul className="space-y-2">
                {eligible.map((m) => (
                  <li key={m.code} className="rounded-lg border border-border/70 bg-secondary/40 px-3 py-2 text-sm">
                    <span className="font-medium">{m.label}</span>
                    <span className="text-muted-foreground"> — {m.correction}</span>
                  </li>
                ))}
              </ul>
              <div className="space-y-2 pt-1">
                <Button onClick={addFix} disabled={fixing || !!targetKitId} size="lg">
                  {fixing ? tx(lang, "Generating…", "बना रहे हैं…") : targetKitId ? tx(lang, "Fix added", "सुधार जोड़ दिया") : tx(lang, "Add 5-min fix to tomorrow", "कल के लिए 5 मिनट का सुधार जोड़ें")}
                </Button>
                {targetKitId && (
                  <Link href={`/kits/${targetKitId}`} className="block text-sm underline">
                    {tx(lang, "Open tomorrow's kit", "कल की किट खोलें")}
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}
    </div>
  );
}
