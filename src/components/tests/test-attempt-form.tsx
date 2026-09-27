"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TapScale } from "@/components/motion/tap-scale";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";

interface WorksheetQ {
  id: string;
  type: string;
  prompt: string;
  options?: string[];
  matchLeft?: string[];
  caseText?: string;
  subQuestions?: string[];
  marks: number;
}
interface QuizQ {
  id: string;
  stem: string;
  options: { id: string; text: string }[];
}

type Props =
  | {
      token: string;
      kitTitle: string;
      isOpen: boolean;
      kind: "worksheet";
      title: string;
      instructions: string;
      worksheetQuestions: WorksheetQ[];
    }
  | { token: string; kitTitle: string; isOpen: boolean; kind: "quiz"; quizQuestions: QuizQ[] };

export function TestAttemptForm(props: Props) {
  const [studentName, setStudentName] = useState("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  function setAnswer(id: string, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/t/${props.token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentName: studentName.trim(), answers }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? "Could not submit");
      // replace, not push: Back from the result page mustn't land on a re-submittable form.
      const score = (data as { score?: string }).score;
      router.replace(`/t/${props.token}/submitted${score ? `?score=${encodeURIComponent(score)}` : ""}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not submit");
      setSubmitting(false);
    }
  }

  if (!props.isOpen) {
    return (
      <Centered>
        <p className="text-sm text-muted-foreground">This test is closed and no longer accepting responses.</p>
      </Centered>
    );
  }

  const nameGiven = studentName.trim().length > 0;

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <form onSubmit={submit} className="mx-auto max-w-md space-y-6">
        <FadeIn className="space-y-1 text-center">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{props.kitTitle}</p>
          <h1 className="text-lg font-semibold leading-snug">{props.kind === "worksheet" ? props.title : "Exit quiz"}</h1>
          {props.kind === "worksheet" && props.instructions && <p className="text-sm text-muted-foreground">{props.instructions}</p>}
        </FadeIn>

        <FadeIn index={1} className="space-y-1.5">
          <Label htmlFor="student-name">Your name</Label>
          <Input id="student-name" className="h-11" value={studentName} onChange={(e) => setStudentName(e.target.value)} required maxLength={120} placeholder="Full name" />
        </FadeIn>

        {props.kind === "quiz"
          ? props.quizQuestions.map((q, i) => (
              <FadeIn key={q.id} index={i + 2} className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
                <p className="text-sm font-medium">
                  {i + 1}. {q.stem}
                </p>
                <div className="space-y-2">
                  {q.options.map((o) => (
                    <TapScale
                      key={o.id}
                      onClick={() => setAnswer(q.id, o.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-left text-sm",
                        answers[q.id] === o.id ? "border-primary bg-primary/10" : "border-border/70 bg-background",
                      )}
                    >
                      <span className="font-medium">{o.id}.</span> {o.text}
                    </TapScale>
                  ))}
                </div>
              </FadeIn>
            ))
          : props.worksheetQuestions.map((q, i) => (
              <FadeIn key={q.id} index={i + 2} className="space-y-2 rounded-xl border border-border/70 bg-card p-4">
                <p className="text-xs text-muted-foreground">
                  Question {i + 1} · {q.marks} mark{q.marks === 1 ? "" : "s"}
                </p>
                {q.caseText && <p className="rounded-md bg-secondary/40 p-2 text-sm text-muted-foreground">{q.caseText}</p>}
                <p className="text-sm font-medium">{q.prompt}</p>
                {q.subQuestions?.map((sq, si) => (
                  <p key={si} className="text-sm text-muted-foreground">
                    {si + 1}) {sq}
                  </p>
                ))}

                {q.type === "mcq" || q.type === "assertion_reason" ? (
                  <div className="space-y-2">
                    {q.options?.map((opt) => (
                      <TapScale
                        key={opt}
                        onClick={() => setAnswer(q.id, opt)}
                        className={cn(
                          "flex w-full items-center rounded-lg border-2 px-3 py-2.5 text-left text-sm",
                          answers[q.id] === opt ? "border-primary bg-primary/10" : "border-border/70 bg-background",
                        )}
                      >
                        {opt}
                      </TapScale>
                    ))}
                  </div>
                ) : q.type === "true_false" ? (
                  <div className="grid grid-cols-2 gap-2">
                    {["True", "False"].map((opt) => (
                      <TapScale
                        key={opt}
                        onClick={() => setAnswer(q.id, opt)}
                        className={cn(
                          "rounded-lg border-2 py-2.5 text-sm font-medium",
                          answers[q.id] === opt ? "border-primary bg-primary/10" : "border-border/70 bg-background",
                        )}
                      >
                        {opt}
                      </TapScale>
                    ))}
                  </div>
                ) : q.type === "match" ? (
                  <div className="space-y-1">
                    {q.matchLeft?.map((l) => (
                      <p key={l} className="text-xs text-muted-foreground">
                        {l}
                      </p>
                    ))}
                    <Textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      rows={2}
                      placeholder="Write your matches, e.g. A-3, B-1, C-4"
                    />
                  </div>
                ) : q.type === "fill_blank" ? (
                  <Input
                    className="h-11"
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    placeholder="If there are multiple blanks, separate with |"
                  />
                ) : (
                  <Textarea
                    value={answers[q.id] ?? ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    rows={q.type === "long_answer" || q.type === "case_based" ? 5 : 3}
                    placeholder="Your answer"
                  />
                )}
              </FadeIn>
            ))}

        <FadeIn index={100}>
          <Button type="submit" size="lg" className="w-full" disabled={submitting || !nameGiven}>
            {submitting ? "Submitting…" : "Submit"}
          </Button>
        </FadeIn>
      </form>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">{children}</div>;
}
