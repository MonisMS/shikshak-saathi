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

const BAND_COLOR: Record<MasteryBand, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-rose-500",
};
// Band label always shown alongside the bar so understanding is never read from color alone.
const BAND_LABEL: Record<MasteryBand, string> = {
  green: "Strong",
  amber: "Worth revisiting",
  red: "Needs another explanation",
};

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
      toast.success("5-minute fix added to tomorrow's kit");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the fix");
    } finally {
      setFixing(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">{title} — Understanding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Based on today&apos;s quick check. Nothing here identifies individual students.
        </p>
      </FadeIn>

      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground">How the class understood it</h2>

        <FadeIn index={1}>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Common wrong answers may indicate…</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {misconceptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recurring misconception showed up in this quiz&apos;s wrong answers.</p>
              ) : (
                misconceptions.map((m) => (
                  <div key={m.code} className="space-y-1">
                    <Bar label={`${m.studentCount} students · ${m.label}`} pct={m.percent} colorClass="bg-rose-400" />
                    <p className="text-xs text-muted-foreground">may indicate this — worth revisiting: {m.correction}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn index={2}>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Per-question accuracy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {accuracy.map((a, i) => (
                <Bar key={a.questionId} label={`Q${i + 1}`} pct={a.accuracy} colorClass={BAND_COLOR[bandFor(a.accuracy)]} bandLabel={BAND_LABEL[bandFor(a.accuracy)]} />
              ))}
            </CardContent>
          </Card>
        </FadeIn>

        <FadeIn index={3}>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Per-objective mastery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {mastery.map((m) => (
                <Bar key={m.objectiveId} label={m.objectiveId} pct={m.accuracy} colorClass={BAND_COLOR[m.band]} bandLabel={BAND_LABEL[m.band]} />
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      </div>

      {eligible.length > 0 && (
        <FadeIn index={4} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Plan next lesson</h2>
          <Card className="border-border/70">
            <CardContent className="space-y-3 pt-6">
              <p className="text-sm text-muted-foreground">
                A short reteaching activity for the misconceptions above, ready to drop into tomorrow&apos;s kit.
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
                  {fixing ? "Generating…" : targetKitId ? "Fix added" : "Add 5-min fix to tomorrow"}
                </Button>
                {targetKitId && (
                  <Link href={`/kits/${targetKitId}`} className="block text-sm underline">
                    Open tomorrow&apos;s kit
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
