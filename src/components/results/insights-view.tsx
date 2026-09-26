"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MisconceptionCountRow, ObjectiveMasteryRow, QuestionAccuracyRow, MasteryBand } from "@/lib/misconceptions";
import { cn } from "@/lib/utils";

const BAND_COLOR: Record<MasteryBand, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

function Bar({ label, pct, colorClass }: { label: string; pct: number; colorClass: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted-foreground">{Math.round(pct * 100)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${Math.min(100, pct * 100)}%` }} />
      </div>
    </div>
  );
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
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">{title} — Insights</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Misconception map</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {misconceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No misconceptions surfaced from this quiz&apos;s wrong answers.</p>
          ) : (
            misconceptions.map((m) => (
              <div key={m.code} className="space-y-1">
                <Bar label={`${m.studentCount} students · ${m.label}`} pct={m.percent} colorClass="bg-red-500" />
                <p className="text-xs text-muted-foreground">wrong answers pointing to this misconception — {m.correction}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-question accuracy</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {accuracy.map((a, i) => (
            <Bar key={a.questionId} label={`Q${i + 1}`} pct={a.accuracy} colorClass={BAND_COLOR[a.accuracy >= 0.7 ? "green" : a.accuracy >= 0.4 ? "amber" : "red"]} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-objective mastery</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mastery.map((m) => (
            <Bar key={m.objectiveId} label={m.objectiveId} pct={m.accuracy} colorClass={BAND_COLOR[m.band]} />
          ))}
        </CardContent>
      </Card>

      {eligible.length > 0 && (
        <div className="space-y-2">
          <Button onClick={addFix} disabled={fixing || !!targetKitId}>
            {fixing ? "Generating…" : targetKitId ? "Fix added" : "Add 5-min fix to tomorrow"}
          </Button>
          {targetKitId && (
            <Link href={`/kits/${targetKitId}`} className="block text-sm underline">
              Open tomorrow&apos;s kit
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
