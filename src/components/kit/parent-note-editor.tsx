"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { z } from "zod";
import { ParentNote } from "@/lib/ai/schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ListEditor } from "./list-editor";
import { RegenerateControl } from "./regenerate-control";

type ParentNoteData = z.infer<typeof ParentNote>;

/**
 * P8.2 editor: language selector, editable text, a live WhatsApp preview that updates
 * as the teacher types (before saving). The actual wa.me share button + public
 * /p/[token] page are F50/P8.3 — Ujjwal's.
 */
export function ParentNoteEditor({ kitId, data }: { kitId: string; data: ParentNoteData }) {
  const [draft, setDraft] = useState<ParentNoteData>(data);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/kits/${kitId}/sections/PARENT_NOTE`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const body: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string })?.error ?? `Save failed (${res.status})`);
      setDraft(body as ParentNoteData);
      toast.success("Parent note saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function regenerate(instruction?: string) {
    const res = await fetch(`/api/kits/${kitId}/sections/PARENT_NOTE`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(instruction ? { instruction } : {}),
    });
    const body: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error((body as { error?: string })?.error ?? `Regenerate failed (${res.status})`);
      return;
    }
    setDraft(body as ParentNoteData);
  }

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Parent note</CardTitle>
          <RegenerateControl onRegenerate={regenerate} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>Language</Label>
            <Select value={draft.language} onValueChange={(v) => v && setDraft({ ...draft, language: v as ParentNoteData["language"] })}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label>Learned today</Label>
            <Textarea value={draft.learnedToday} onChange={(e) => setDraft({ ...draft, learnedToday: e.target.value })} />
          </div>

          <div className="space-y-1">
            <Label>Homework</Label>
            <Textarea value={draft.homework} onChange={(e) => setDraft({ ...draft, homework: e.target.value })} />
          </div>

          <div className="space-y-1">
            <Label>Home activity</Label>
            <Textarea value={draft.homeActivity} onChange={(e) => setDraft({ ...draft, homeActivity: e.target.value })} />
          </div>

          <div className="space-y-1">
            <Label>Ask your child</Label>
            <ListEditor<string>
              items={draft.askYourChild}
              onChange={(askYourChild) => setDraft({ ...draft, askYourChild: askYourChild.slice(0, 3) })}
              newItem={() => ""}
              addLabel="Add question"
              renderItem={(q, onChange) => <Textarea value={q} onChange={(e) => onChange(e.target.value)} rows={1} />}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>WhatsApp message</Label>
              <span className={`text-xs ${draft.whatsappText.length > 700 ? "text-destructive" : "text-muted-foreground"}`}>
                {draft.whatsappText.length}/700
              </span>
            </div>
            <Textarea
              value={draft.whatsappText}
              onChange={(e) => setDraft({ ...draft, whatsappText: e.target.value })}
              rows={6}
              maxLength={700}
            />
          </div>

          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </Card>

      <div className="md:sticky md:top-4">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Live WhatsApp preview</p>
        <div className="rounded-lg bg-[#e5ddd5] p-4 dark:bg-neutral-900">
          <div className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-tl-none bg-white p-3 text-sm shadow dark:bg-neutral-800">
            {draft.whatsappText || <span className="text-muted-foreground">Nothing to preview yet</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
