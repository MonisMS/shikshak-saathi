"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/motion/fade-in";
import { TestShare } from "./test-share";
import { ScanUploadCard } from "./scan-upload-card";
import { cn } from "@/lib/utils";
import type { PerQuestionResult } from "@/lib/tests";

interface TestMeta {
  id: string;
  token: string;
  kitId: string;
  kitTitle: string;
  sectionType: string;
  isOpen: boolean;
  gradingInstructions: string;
}

interface SubmissionRow {
  id: string;
  studentName: string;
  source: "ONLINE" | "SCAN";
  answers: Record<string, string>;
  perQuestion: Record<string, PerQuestionResult>;
  autoMarks: number;
  aiMarks: number | null;
  maxMarks: number;
  evaluatedAt: string | null;
  submittedAt: string;
}

const SECTION_LABEL: Record<string, string> = {
  WORKSHEET: "Worksheet",
  EXIT_QUIZ: "Exit quiz",
  STARTER_QUIZ: "Starter quiz",
};

export function TestDetailView({ test, submissions }: { test: TestMeta; submissions: SubmissionRow[] }) {
  const router = useRouter();
  const [instructions, setInstructions] = useState(test.gradingInstructions);
  const [isOpen, setIsOpen] = useState(test.isOpen);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const ungraded = submissions.filter((s) => !s.evaluatedAt).length;
  const isWorksheet = test.sectionType === "WORKSHEET";

  async function saveInstructions() {
    setSavingInstructions(true);
    try {
      const res = await fetch(`/api/tests/${test.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradingInstructions: instructions }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Grading instructions saved");
    } catch {
      toast.error("Could not save instructions");
    } finally {
      setSavingInstructions(false);
    }
  }

  async function toggleOpen(next: boolean) {
    setIsOpen(next);
    try {
      const res = await fetch(`/api/tests/${test.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isOpen: next }),
      });
      if (!res.ok) throw new Error("Failed");
    } catch {
      setIsOpen(!next);
      toast.error("Could not update");
    }
  }

  async function evaluate() {
    setEvaluating(true);
    try {
      const res = await fetch(`/api/tests/${test.id}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? "Failed");
      const d = data as { evaluated: number; failed: number };
      toast.success(d.failed > 0 ? `Graded ${d.evaluated}, ${d.failed} failed — retry those` : `Graded ${d.evaluated} submission${d.evaluated === 1 ? "" : "s"}`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6 pb-10">
      <FadeIn className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/kits/${test.kitId}`} className="text-sm text-muted-foreground underline underline-offset-2">
            {test.kitTitle}
          </Link>
          <Badge variant="secondary">{SECTION_LABEL[test.sectionType] ?? test.sectionType}</Badge>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Results</h1>
      </FadeIn>

      <FadeIn index={1} className="space-y-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          How students attempt this — pick either, or both
        </h2>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Option 1 · Online link (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <TestShare token={test.token} />
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-secondary/40 px-3 py-2.5">
              <Label htmlFor="test-open" className="text-sm">
                Accepting new online responses
              </Label>
              <Switch id="test-open" checked={isOpen} onCheckedChange={toggleOpen} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Option 2 · Print, fill on paper, scan</CardTitle>
          </CardHeader>
          <CardContent>
            <ScanUploadCard
              testId={test.id}
              printHref={`/kits/${test.kitId}/print?doc=${test.sectionType === "WORKSHEET" ? "worksheet" : "quiz"}&onepage=1`}
            />
          </CardContent>
        </Card>
      </FadeIn>

      {isWorksheet && (
        <FadeIn index={2}>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Grading instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Extra instructions for the AI when it grades open-ended answers (short/long answer, case-based). MCQ, true/false, fill-in-the-blank and match questions are always scored automatically.
              </p>
              <Textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="e.g. Be lenient on spelling. Give half marks for a partially correct explanation. Full marks only if the diagram is mentioned."
              />
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={saveInstructions} disabled={savingInstructions}>
                  {savingInstructions ? "Saving…" : "Save instructions"}
                </Button>
                <Button size="sm" onClick={evaluate} disabled={evaluating || submissions.length === 0}>
                  <Sparkles className="size-3.5" />
                  {evaluating ? "Evaluating…" : ungraded > 0 ? `Evaluate with AI (${ungraded} pending)` : "Re-evaluate with AI"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <FadeIn index={3} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {submissions.length} response{submissions.length === 1 ? "" : "s"}
          </h2>
          {submissions.length > 0 && (
            <div className="flex gap-2">
              <a href={`/api/tests/${test.id}/export`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                Export CSV
              </a>
              <a
                href={`/tests/${test.id}/print`}
                target="_blank"
                rel="noopener"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Export PDF
              </a>
            </div>
          )}
        </div>

        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one has submitted yet. Share the link, or print and scan — either shows up here.</p>
        ) : (
          <div className="space-y-2">
            {submissions.map((s) => {
              const total = s.autoMarks + (s.aiMarks ?? 0);
              const open = expanded === s.id;
              return (
                <Card key={s.id} className="border-border/70">
                  <button
                    type="button"
                    onClick={() => setExpanded(open ? null : s.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate text-sm font-medium">{s.studentName}</span>
                      {s.source === "SCAN" && (
                        <Badge variant="outline" className="shrink-0 text-xs">
                          Scanned
                        </Badge>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {total}/{s.maxMarks}
                      </span>
                      {!s.evaluatedAt && (
                        <Badge variant="outline" className="text-amber-700 dark:text-amber-300">
                          Ungraded
                        </Badge>
                      )}
                      <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                    </span>
                  </button>
                  {open && (
                    <CardContent className="space-y-2 border-t border-border/70 pt-3">
                      {Object.entries(s.perQuestion).map(([qId, r]) => (
                        <div key={qId} className="rounded-md bg-secondary/40 px-3 py-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{qId}</span>
                            <span className="tabular-nums text-muted-foreground">
                              {r.marks ?? "—"}/{r.max}
                            </span>
                          </div>
                          <p className="mt-1 text-muted-foreground">Answer: {s.answers[qId] || "(blank)"}</p>
                          {r.feedback && <p className="mt-1 text-muted-foreground">{r.feedback}</p>}
                        </div>
                      ))}
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </FadeIn>
    </div>
  );
}
