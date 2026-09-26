"use client";

import { useState } from "react";
import type { z } from "zod";
import { Worksheet } from "@/lib/ai/schemas";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListEditor, linesToArray, arrayToLines } from "./list-editor";
import { useLanguage } from "@/components/layout/language-provider";
import { tx } from "@/lib/i18n";

type WorksheetData = z.infer<typeof Worksheet>;
type Question = WorksheetData["questions"][number];

const QUESTION_TYPES: Question["type"][] = [
  "mcq", "fill_blank", "true_false", "match", "short_answer", "long_answer", "case_based", "assertion_reason",
];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const BLOOM_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;

function needsOptions(type: Question["type"]) {
  return type === "mcq" || type === "assertion_reason";
}

function totalMarks(questions: Question[]): number {
  return questions.reduce((sum, q) => sum + q.marks, 0);
}

export function WorksheetCard({
  data,
  onSave,
}: {
  data: WorksheetData;
  onSave?: (next: WorksheetData) => Promise<void>;
}) {
  const { lang } = useLanguage();
  const [showAnswers, setShowAnswers] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<WorksheetData>(data);
  const [saving, setSaving] = useState(false);

  function startEdit() {
    setDraft(data);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    try {
      await onSave?.({ ...draft, totalMarks: totalMarks(draft.questions) });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{draft.title} {tx(lang, "(editing)", "(संपादन)")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>{tx(lang, "Title", "शीर्षक")}</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>{tx(lang, "Instructions", "निर्देश")}</Label>
            <Textarea value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} />
          </div>

          <ListEditor<Question>
            items={draft.questions}
            onChange={(questions) => setDraft({ ...draft, questions })}
            newItem={() => ({
              id: `W${draft.questions.length + 1}`,
              type: "short_answer",
              prompt: "",
              answer: "",
              marks: 1,
              difficulty: "medium",
              bloom: "understand",
              objectiveId: "",
            })}
            addLabel={tx(lang, "Add question", "प्रश्न जोड़ें")}
            renderItem={(q, onChange) => (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{q.id}</Badge>
                  <Select value={q.type} onValueChange={(v) => v && onChange({ ...q, type: v as Question["type"] })}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {QUESTION_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={q.difficulty} onValueChange={(v) => v && onChange({ ...q, difficulty: v as Question["difficulty"] })}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DIFFICULTIES.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={q.bloom} onValueChange={(v) => v && onChange({ ...q, bloom: v as Question["bloom"] })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BLOOM_LEVELS.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input type="number" className="w-16" value={q.marks} onChange={(e) => onChange({ ...q, marks: Number(e.target.value) })} />
                  <span className="text-xs text-muted-foreground">marks</span>
                </div>

                <Textarea value={q.prompt} onChange={(e) => onChange({ ...q, prompt: e.target.value })} placeholder={tx(lang, "Question prompt", "प्रश्न")} />

                {needsOptions(q.type) && (
                  <Textarea
                    value={arrayToLines(q.options ?? [])}
                    onChange={(e) => onChange({ ...q, options: linesToArray(e.target.value) })}
                    placeholder={tx(lang, "Options, one per line (4 for mcq/assertion_reason)", "विकल्प, हर पंक्ति में एक (mcq के लिए 4)")}
                  />
                )}

                {q.type === "case_based" && (
                  <>
                    <Textarea value={q.caseText ?? ""} onChange={(e) => onChange({ ...q, caseText: e.target.value })} placeholder={tx(lang, "Case passage", "केस अनुच्छेद")} />
                    <Textarea
                      value={arrayToLines(q.subQuestions ?? [])}
                      onChange={(e) => onChange({ ...q, subQuestions: linesToArray(e.target.value) })}
                      placeholder={tx(lang, "Sub-questions, one per line", "उप-प्रश्न, हर पंक्ति में एक")}
                    />
                  </>
                )}

                <Input value={q.answer} onChange={(e) => onChange({ ...q, answer: e.target.value })} placeholder={tx(lang, "Answer key", "उत्तर कुंजी")} />
                <Input value={q.objectiveId} onChange={(e) => onChange({ ...q, objectiveId: e.target.value })} placeholder={tx(lang, "Objective id (O1)", "उद्देश्य id (O1)")} />
                <Input
                  type="number"
                  className="w-24"
                  value={q.pageRef ?? ""}
                  onChange={(e) => onChange({ ...q, pageRef: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder={tx(lang, "Page ref", "पृष्ठ")}
                />
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
        <CardTitle>{data.title}</CardTitle>
        <CardAction className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="show-answers" className="text-xs font-normal text-muted-foreground">
              {tx(lang, "Show answers", "उत्तर दिखाएँ")}
            </Label>
            <Switch id="show-answers" checked={showAnswers} onCheckedChange={setShowAnswers} />
          </div>
          {onSave && (
            <Button variant="outline" size="sm" onClick={startEdit}>
              {tx(lang, "Edit", "संपादित करें")}
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{data.instructions}</p>
        <ol className="space-y-4">
          {data.questions.map((q, i) => (
            <li key={q.id} className="rounded-md border p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {i + 1}. {q.prompt}
                </span>
                <div className="flex shrink-0 gap-1">
                  <Badge variant="outline">{q.marks} {tx(lang, "mk", "अंक")}</Badge>
                  <Badge variant="secondary">{q.type.replace("_", " ")}</Badge>
                </div>
              </div>

              {q.caseText && <p className="mb-2 rounded bg-muted p-2 text-sm italic">{q.caseText}</p>}

              {q.options && (
                <ul className="ml-4 list-inside list-disc text-sm text-muted-foreground">
                  {q.options.map((opt, oi) => (
                    <li key={oi}>{opt}</li>
                  ))}
                </ul>
              )}

              {q.matchPairs && (
                <ul className="ml-4 text-sm text-muted-foreground">
                  {q.matchPairs.map((mp, mi) => (
                    <li key={mi}>
                      {mp.left} — {mp.right}
                    </li>
                  ))}
                </ul>
              )}

              {q.subQuestions && (
                <ol className="ml-4 list-inside list-decimal text-sm text-muted-foreground">
                  {q.subQuestions.map((sq, si) => (
                    <li key={si}>{sq}</li>
                  ))}
                </ol>
              )}

              {showAnswers && (
                <p className="mt-2 text-sm text-green-700 dark:text-green-400">
                  <span className="font-medium">{tx(lang, "Answer: ", "उत्तर: ")}</span>
                  {q.answer}
                </p>
              )}
              {q.pageRef && <p className="mt-1 text-xs text-muted-foreground">p.{q.pageRef}</p>}
            </li>
          ))}
        </ol>
        <p className="text-right text-sm font-medium">{tx(lang, "Total", "कुल")}: {data.totalMarks} {tx(lang, "marks", "अंक")}</p>
      </CardContent>
    </Card>
  );
}
