"use client";

import { useState } from "react";
import type { z } from "zod";
import { LessonPlan } from "@/lib/ai/schemas";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ListEditor, linesToArray, arrayToLines } from "./list-editor";
import { useLanguage } from "@/components/layout/language-provider";
import { tx, type Lang } from "@/lib/i18n";

const PHASE_LABELS: Record<string, { en: string; hi: string }> = {
  warmup_fix: { en: "Start with: fix", hi: "शुरुआत: सुधार" },
  starter: { en: "Starter", hi: "आरंभ" },
  explain: { en: "Explain", hi: "समझाएँ" },
  activity: { en: "Activity", hi: "गतिविधि" },
  practice: { en: "Practice", hi: "अभ्यास" },
  exit_check: { en: "Exit check", hi: "अंतिम जाँच" },
  wrap_up: { en: "Wrap up", hi: "समापन" },
};
const PHASES = Object.keys(PHASE_LABELS);
const phaseLabel = (phase: string, lang: Lang) => PHASE_LABELS[phase]?.[lang];

type PlanData = z.infer<typeof LessonPlan>;
type PlanSection = PlanData["sections"][number];
type Misconception = PlanData["misconceptions"][number];
type Keyword = PlanData["keywords"][number];

function csvToNumbers(s: string): number[] {
  return s.split(",").map((p) => Number(p.trim())).filter((n) => !Number.isNaN(n));
}
function csvToStrings(s: string): string[] {
  return s.split(",").map((p) => p.trim()).filter(Boolean);
}

export function LessonPlanCard({
  data,
  onSave,
}: {
  data: PlanData;
  onSave?: (next: PlanData) => Promise<void>;
}) {
  const { lang } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PlanData>(data);
  const [saving, setSaving] = useState(false);

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

  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tx(lang, "Lesson plan (editing)", "पाठ योजना (संपादन)")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <Label>{tx(lang, "Title", "शीर्षक")}</Label>
            <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>{tx(lang, "Learning outcome", "सीखने का परिणाम")}</Label>
            <Textarea value={draft.learningOutcome} onChange={(e) => setDraft({ ...draft, learningOutcome: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>{tx(lang, "Prior knowledge (one per line)", "पूर्व ज्ञान (हर पंक्ति में एक)")}</Label>
            <Textarea
              value={arrayToLines(draft.priorKnowledge)}
              onChange={(e) => setDraft({ ...draft, priorKnowledge: linesToArray(e.target.value) })}
            />
          </div>
          <div className="space-y-1">
            <Label>{tx(lang, "Key learning points (one per line)", "मुख्य बिंदु (हर पंक्ति में एक)")}</Label>
            <Textarea
              value={arrayToLines(draft.keyLearningPoints)}
              onChange={(e) => setDraft({ ...draft, keyLearningPoints: linesToArray(e.target.value) })}
            />
          </div>

          <div className="space-y-1">
            <Label>{tx(lang, "Keywords", "मुख्य शब्द")}</Label>
            <ListEditor<Keyword>
              items={draft.keywords}
              onChange={(keywords) => setDraft({ ...draft, keywords })}
              newItem={() => ({ term: "", definition: "" })}
              addLabel={tx(lang, "Add keyword", "शब्द जोड़ें")}
              renderItem={(k, onChange) => (
                <>
                  <Input value={k.term} onChange={(e) => onChange({ ...k, term: e.target.value })} placeholder={tx(lang, "Term", "शब्द")} />
                  <Input value={k.definition} onChange={(e) => onChange({ ...k, definition: e.target.value })} placeholder={tx(lang, "Definition", "परिभाषा")} />
                </>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label>{tx(lang, "Misconceptions", "गलत धारणाएँ")}</Label>
            <ListEditor<Misconception>
              items={draft.misconceptions}
              onChange={(misconceptions) => setDraft({ ...draft, misconceptions })}
              newItem={() => ({ id: `M${draft.misconceptions.length + 1}`, misconception: "", correction: "", pageRef: 1 })}
              addLabel={tx(lang, "Add misconception", "गलत धारणा जोड़ें")}
              renderItem={(m, onChange) => (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{m.id}</Badge>
                    <Input
                      type="number"
                      className="w-24"
                      value={m.pageRef}
                      onChange={(e) => onChange({ ...m, pageRef: Number(e.target.value) })}
                    />
                  </div>
                  <Textarea value={m.misconception} onChange={(e) => onChange({ ...m, misconception: e.target.value })} placeholder={tx(lang, "What students wrongly believe", "विद्यार्थी क्या गलत समझते हैं")} />
                  <Textarea value={m.correction} onChange={(e) => onChange({ ...m, correction: e.target.value })} placeholder={tx(lang, "Correction", "सुधार")} />
                </>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label>{tx(lang, "Sections (minutes should sum to the period length)", "चरण (मिनटों का जोड़ कालांश के बराबर हो)")}</Label>
            <ListEditor<PlanSection>
              items={draft.sections}
              onChange={(sections) => setDraft({ ...draft, sections })}
              newItem={() => ({
                id: `S${draft.sections.length + 1}`,
                phase: "activity",
                title: "",
                minutes: 5,
                teacherSays: "",
                studentsDo: "",
                materials: [],
                objectiveIds: [],
                pageRefs: [],
              })}
              addLabel={tx(lang, "Add section", "चरण जोड़ें")}
              renderItem={(s, onChange) => (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{s.id}</Badge>
                    <Select value={s.phase} onValueChange={(v) => v && onChange({ ...s, phase: v as PlanSection["phase"] })}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PHASES.map((p) => (
                          <SelectItem key={p} value={p}>{phaseLabel(p, lang)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input type="number" className="w-20" value={s.minutes} onChange={(e) => onChange({ ...s, minutes: Number(e.target.value) })} />
                    <span className="text-xs text-muted-foreground">{tx(lang, "min", "मिनट")}</span>
                  </div>
                  <Input value={s.title} onChange={(e) => onChange({ ...s, title: e.target.value })} placeholder={tx(lang, "Title", "शीर्षक")} />
                  <Textarea value={s.teacherSays} onChange={(e) => onChange({ ...s, teacherSays: e.target.value })} placeholder={tx(lang, "Teacher says…", "शिक्षक कहेंगे…")} />
                  <Textarea value={s.studentsDo} onChange={(e) => onChange({ ...s, studentsDo: e.target.value })} placeholder={tx(lang, "Students do…", "विद्यार्थी करेंगे…")} />
                  <Input
                    value={s.materials.join(", ")}
                    onChange={(e) => onChange({ ...s, materials: csvToStrings(e.target.value) })}
                    placeholder={tx(lang, "Materials, comma separated", "सामग्री, कॉमा से अलग")}
                  />
                  <Input
                    value={s.objectiveIds.join(", ")}
                    onChange={(e) => onChange({ ...s, objectiveIds: csvToStrings(e.target.value) })}
                    placeholder={tx(lang, "Objective ids, comma separated (O1, O2)", "उद्देश्य id, कॉमा से अलग (O1, O2)")}
                  />
                  <Input
                    value={s.pageRefs.join(", ")}
                    onChange={(e) => onChange({ ...s, pageRefs: csvToNumbers(e.target.value) })}
                    placeholder={tx(lang, "Page refs, comma separated", "पृष्ठ संख्या, कॉमा से अलग")}
                  />
                </>
              )}
            />
          </div>

          <div className="space-y-1">
            <Label>{tx(lang, "Homework", "गृहकार्य")}</Label>
            <Textarea value={draft.homework} onChange={(e) => setDraft({ ...draft, homework: e.target.value })} />
          </div>

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

  const totalMinutes = data.sections.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{data.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{data.learningOutcome}</p>
        {onSave && (
          <CardAction>
            <Button variant="outline" size="sm" onClick={startEdit}>
              {tx(lang, "Edit", "संपादित करें")}
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <section>
          <h4 className="mb-1 text-sm font-semibold">{tx(lang, "Prior knowledge", "पूर्व ज्ञान")}</h4>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {data.priorKnowledge.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="mb-1 text-sm font-semibold">{tx(lang, "Key learning points", "मुख्य बिंदु")}</h4>
          <ul className="list-inside list-disc text-sm text-muted-foreground">
            {data.keyLearningPoints.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </section>

        <section>
          <h4 className="mb-1 text-sm font-semibold">{tx(lang, "Keywords", "मुख्य शब्द")}</h4>
          <dl className="space-y-1 text-sm">
            {data.keywords.map((k) => (
              <div key={k.term}>
                <dt className="inline font-medium">{k.term}: </dt>
                <dd className="inline text-muted-foreground">{k.definition}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h4 className="mb-1 text-sm font-semibold">{tx(lang, "Misconceptions", "गलत धारणाएँ")}</h4>
          <ul className="space-y-1 text-sm">
            {data.misconceptions.map((m) => (
              <li key={m.id}>
                <Badge variant="outline" className="mr-1">
                  {m.id}
                </Badge>
                <span className="text-muted-foreground">{m.misconception}</span> — <span>{m.correction}</span>
              </li>
            ))}
          </ul>
        </section>

        <Separator />

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold">{tx(lang, "Timeline", "समय-सारिणी")}</h4>
            <span className="text-xs text-muted-foreground">{totalMinutes} {tx(lang, "min total", "मिनट कुल")}</span>
          </div>
          <ol className="space-y-4">
            {data.sections.map((s) => (
              <li key={s.id} className="rounded-md border p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {phaseLabel(s.phase, lang) ?? s.phase}: {s.title}
                  </span>
                  <Badge variant="secondary">{s.minutes} {tx(lang, "min", "मिनट")}</Badge>
                </div>
                <p className="text-sm">
                  <span className="font-medium">{tx(lang, "Teacher says: ", "शिक्षक कहेंगे: ")}</span>
                  {s.teacherSays}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{tx(lang, "Students do: ", "विद्यार्थी करेंगे: ")}</span>
                  {s.studentsDo}
                </p>
                {s.materials.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">{tx(lang, "Materials: ", "सामग्री: ")}{s.materials.join(", ")}</p>
                )}
                {s.checkForUnderstanding && (
                  <p className="mt-1 text-xs italic text-muted-foreground">{tx(lang, "Check: ", "जाँच: ")}{s.checkForUnderstanding}</p>
                )}
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h4 className="mb-1 text-sm font-semibold">{tx(lang, "Homework", "गृहकार्य")}</h4>
          <p className="text-sm text-muted-foreground">{data.homework}</p>
        </section>
      </CardContent>
    </Card>
  );
}
