"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { z } from "zod";
import { toast } from "sonner";
import type { Quiz } from "@/lib/ai/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type QuizData = z.infer<typeof Quiz>;

/** F40: per-question A–D +/- counters, correct option highlighted. Saves via
 * POST /api/kits/[id]/results {method:"TALLY", studentsPresent, tally} (Ujjwal's U8). */
export function TallyGrid({ kitId, title, quiz }: { kitId: string; title: string; quiz: QuizData }) {
  const router = useRouter();
  const [studentsPresent, setStudentsPresent] = useState(40);
  const [tally, setTally] = useState<Record<string, Record<string, number>>>(() =>
    Object.fromEntries(quiz.questions.map((q) => [q.id, Object.fromEntries(q.options.map((o) => [o.id, 0]))])),
  );
  const [saving, setSaving] = useState(false);

  function bump(questionId: string, optionId: string, delta: number) {
    setTally((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], [optionId]: Math.max(0, (prev[questionId]?.[optionId] ?? 0) + delta) },
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/kits/${kitId}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "TALLY", studentsPresent, tally }),
      });
      if (!res.ok) {
        const data: unknown = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string })?.error ?? `Failed (${res.status})`);
      }
      toast.success("Results saved");
      router.push(`/kits/${kitId}/insights`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save results");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">{title} — Enter quiz results</h1>

      <div className="max-w-40 space-y-1">
        <Label htmlFor="present">Students present</Label>
        <Input id="present" type="number" min={0} value={studentsPresent} onChange={(e) => setStudentsPresent(Number(e.target.value))} />
      </div>

      {quiz.questions.map((q, i) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {i + 1}. {q.stem}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {q.options.map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-2">
                <span className={cn("text-sm", o.correct && "font-medium text-green-700 dark:text-green-400")}>
                  {o.id}. {o.text}
                  {o.correct && " ✓"}
                </span>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="icon-sm" onClick={() => bump(q.id, o.id, -1)} aria-label="Decrease">
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-6 text-center text-sm tabular-nums">{tally[q.id]?.[o.id] ?? 0}</span>
                  <Button type="button" variant="outline" size="icon-sm" onClick={() => bump(q.id, o.id, 1)} aria-label="Increase">
                    <Plus className="size-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      <Button onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save results"}
      </Button>
    </div>
  );
}
