"use client";

import { useState } from "react";
import type { z } from "zod";
import { Objectives } from "@/lib/ai/schemas";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { ListEditor } from "./list-editor";

const BLOOM_COLOR: Record<string, string> = {
  remember: "bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300",
  understand: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  apply: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300",
  analyze: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  evaluate: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300",
  create: "bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300",
};

const BLOOM_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;

type ObjectivesData = z.infer<typeof Objectives>;
type Objective = ObjectivesData["objectives"][number];

function nextObjectiveId(existing: Objective[]): string {
  const n = existing.length + 1;
  return `O${n}`;
}

export function ObjectivesCard({
  data,
  onSave,
}: {
  data: ObjectivesData;
  onSave?: (next: ObjectivesData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ObjectivesData>(data);
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

  if (!editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Learning objectives</CardTitle>
          {onSave && (
            <CardAction>
              <Button variant="outline" size="sm" onClick={startEdit}>
                Edit
              </Button>
            </CardAction>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{data.chapterSummary}</p>
          <ul className="space-y-3">
            {data.objectives.map((o) => (
              <li key={o.id} className="flex items-start gap-2">
                <Badge variant="secondary" className={BLOOM_COLOR[o.bloom]}>
                  {o.bloom}
                </Badge>
                <div className="flex-1">
                  <p className="text-sm">{o.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.competency}
                    {o.pageRefs.length > 0 && <> · p.{o.pageRefs.join(", p.")}</>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning objectives (editing)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Chapter summary</Label>
          <Textarea
            value={draft.chapterSummary}
            maxLength={600}
            onChange={(e) => setDraft({ ...draft, chapterSummary: e.target.value })}
          />
        </div>

        <ListEditor<Objective>
          items={draft.objectives}
          onChange={(objectives) => setDraft({ ...draft, objectives })}
          newItem={() => ({
            id: nextObjectiveId(draft.objectives),
            text: "",
            bloom: "understand",
            competency: "",
            pageRefs: [],
          })}
          addLabel="Add objective"
          renderItem={(o, onChange) => (
            <>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{o.id}</Badge>
                <Select value={o.bloom} onValueChange={(v) => v && onChange({ ...o, bloom: v as Objective["bloom"] })}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BLOOM_LEVELS.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Textarea value={o.text} onChange={(e) => onChange({ ...o, text: e.target.value })} placeholder="Students will be able to…" />
              <Input value={o.competency} onChange={(e) => onChange({ ...o, competency: e.target.value })} placeholder="NCF/NEP competency" />
              <Input
                value={o.pageRefs.join(", ")}
                onChange={(e) =>
                  onChange({ ...o, pageRefs: e.target.value.split(",").map((s) => Number(s.trim())).filter((n) => !Number.isNaN(n)) })
                }
                placeholder="Page refs, comma separated"
              />
            </>
          )}
        />

        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
