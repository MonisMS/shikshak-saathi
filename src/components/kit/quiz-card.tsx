"use client";

import { useState } from "react";
import type { z } from "zod";
import { Quiz } from "@/lib/ai/schemas";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ListEditor } from "./list-editor";
import { useLanguage } from "@/components/layout/language-provider";
import { tx } from "@/lib/i18n";

type QuizData = z.infer<typeof Quiz>;
type Question = QuizData["questions"][number];
type Option = Question["options"][number];
const OPTION_IDS: Option["id"][] = ["A", "B", "C", "D"];

export function QuizCard({
  data,
  title,
  onSave,
  stale,
  onRegenerate,
}: {
  data: QuizData;
  title?: string;
  onSave?: (next: QuizData) => Promise<void>;
  /** True when the lesson plan changed and this quiz's misconception ids may no longer match (F20). */
  stale?: boolean;
  onRegenerate?: () => Promise<void>;
}) {
  const { lang } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<QuizData>(data);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  function startEdit() {
    setDraft(data);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      await onSave?.(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      await onRegenerate?.();
    } finally {
      setRegenerating(false);
    }
  }

  const heading = title ?? (data.kind === "exit" ? tx(lang, "Exit quiz", "निकास प्रश्नोत्तरी") : tx(lang, "Starter quiz", "आरंभिक प्रश्नोत्तरी"));

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{heading} {tx(lang, "(editing)", "(संपादन)")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ListEditor<Question>
            items={draft.questions}
            onChange={(questions) => setDraft({ ...draft, questions })}
            newItem={() => ({
              id: `Q${draft.questions.length + 1}`,
              stem: "",
              objectiveId: "",
              bloom: "understand",
              options: OPTION_IDS.map((id, i) => ({ id, text: "", correct: i === 0 })),
            })}
            addLabel={tx(lang, "Add question", "प्रश्न जोड़ें")}
            renderItem={(q, onChange) => (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{q.id}</Badge>
                  <Input value={q.objectiveId} onChange={(e) => onChange({ ...q, objectiveId: e.target.value })} placeholder={tx(lang, "Objective id", "उद्देश्य id")} className="w-32" />
                  <Input
                    type="number"
                    value={q.pageRef ?? ""}
                    onChange={(e) => onChange({ ...q, pageRef: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder={tx(lang, "Page ref", "पृष्ठ")}
                    className="w-24"
                  />
                </div>
                <Textarea value={q.stem} onChange={(e) => onChange({ ...q, stem: e.target.value })} placeholder={tx(lang, "Question stem", "प्रश्न")} />
                <div className="space-y-2">
                  {q.options.map((opt, oi) => (
                    <div key={opt.id} className="flex items-center gap-2">
                      <Badge
                        variant={opt.correct ? "default" : "outline"}
                        className="w-6 shrink-0 cursor-pointer justify-center"
                        onClick={() =>
                          onChange({
                            ...q,
                            options: q.options.map((o, j) => ({ ...o, correct: j === oi })),
                          })
                        }
                      >
                        {opt.id}
                      </Badge>
                      <Input
                        value={opt.text}
                        onChange={(e) =>
                          onChange({ ...q, options: q.options.map((o, j) => (j === oi ? { ...o, text: e.target.value } : o)) })
                        }
                        placeholder={opt.correct ? tx(lang, "Correct answer", "सही उत्तर") : tx(lang, "Distractor", "गलत विकल्प")}
                        className="flex-1"
                      />
                      {!opt.correct && (
                        <>
                          <Input
                            value={opt.misconceptionId ?? ""}
                            onChange={(e) =>
                              onChange({ ...q, options: q.options.map((o, j) => (j === oi ? { ...o, misconceptionId: e.target.value } : o)) })
                            }
                            placeholder="M-id"
                            className="w-20"
                          />
                          <Input
                            value={opt.whyWrong ?? ""}
                            onChange={(e) =>
                              onChange({ ...q, options: q.options.map((o, j) => (j === oi ? { ...o, whyWrong: e.target.value } : o)) })
                            }
                            placeholder={tx(lang, "Why wrong", "क्यों गलत")}
                            className="w-40"
                          />
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          />

          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? tx(lang, "Saving…", "सहेजा जा रहा है…") : tx(lang, "Save", "सहेजें")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
              {tx(lang, "Cancel", "रद्द करें")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{heading}</CardTitle>
        {onSave && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={startEdit}>
              {tx(lang, "Edit", "संपादित करें")}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {stale && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>{tx(lang, "This quiz may be out of date", "यह प्रश्नोत्तरी पुरानी हो सकती है")}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-2">
              <span>{tx(lang, "The lesson plan changed since this quiz was written.", "यह प्रश्नोत्तरी बनने के बाद पाठ योजना बदल गई है।")}</span>
              {onRegenerate && (
                <Button size="sm" variant="outline" onClick={regenerate} disabled={regenerating}>
                  {regenerating ? tx(lang, "Regenerating…", "बनाया जा रहा है…") : tx(lang, "Regenerate", "फिर से बनाएँ")}
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}
        <ol className="space-y-4">
          {data.questions.map((q, i) => (
            <li key={q.id} className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">
                {i + 1}. {q.stem}
              </p>
              <ul className="space-y-1">
                {q.options.map((opt) => (
                  <li
                    key={opt.id}
                    className={cn(
                      "flex items-start gap-2 rounded px-2 py-1 text-sm",
                      opt.correct ? "bg-green-50 dark:bg-green-950" : "bg-transparent",
                    )}
                  >
                    <span className="font-medium">{opt.id}.</span>
                    <span className="flex-1">{opt.text}</span>
                    {!opt.correct && opt.misconceptionId && (
                      <Badge variant="outline" title={opt.whyWrong}>
                        {opt.misconceptionId}
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
              {q.pageRef && <p className="mt-1 text-xs text-muted-foreground">p.{q.pageRef}</p>}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
