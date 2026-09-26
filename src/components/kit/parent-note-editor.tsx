"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/components/layout/language-provider";
import { tx } from "@/lib/i18n";
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
  const { lang } = useLanguage();
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
      toast.success(tx(lang, "Parent note saved", "अभिभावक संदेश सहेजा गया"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tx(lang, "Could not save", "सहेजा नहीं जा सका"));
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
      toast.error((body as { error?: string })?.error ?? tx(lang, `Regenerate failed (${res.status})`, `दोबारा नहीं बन सका (${res.status})`));
      return;
    }
    setDraft(body as ParentNoteData);
  }

  return (
    <div className="grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{tx(lang, "Parent note", "अभिभावक संदेश")}</CardTitle>
          <RegenerateControl onRegenerate={regenerate} />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label>{tx(lang, "Language", "भाषा")}</Label>
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
            <Label>{tx(lang, "Learned today", "आज क्या सीखा")}</Label>
            <Textarea value={draft.learnedToday} onChange={(e) => setDraft({ ...draft, learnedToday: e.target.value })} />
          </div>

          <div className="space-y-1">
            <Label>{tx(lang, "Homework", "गृहकार्य")}</Label>
            <Textarea value={draft.homework} onChange={(e) => setDraft({ ...draft, homework: e.target.value })} />
          </div>

          <div className="space-y-1">
            <Label>{tx(lang, "Home activity", "घर पर गतिविधि")}</Label>
            <Textarea value={draft.homeActivity} onChange={(e) => setDraft({ ...draft, homeActivity: e.target.value })} />
          </div>

          <div className="space-y-1">
            <Label>{tx(lang, "Ask your child", "बच्चे से पूछें")}</Label>
            <ListEditor<string>
              items={draft.askYourChild}
              onChange={(askYourChild) => setDraft({ ...draft, askYourChild: askYourChild.slice(0, 3) })}
              newItem={() => ""}
              addLabel={tx(lang, "Add question", "प्रश्न जोड़ें")}
              renderItem={(q, onChange) => <Textarea value={q} onChange={(e) => onChange(e.target.value)} rows={1} />}
            />
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label>{tx(lang, "WhatsApp message", "WhatsApp संदेश")}</Label>
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
            {saving ? tx(lang, "Saving…", "सहेज रहे हैं…") : tx(lang, "Save", "सहेजें")}
          </Button>
        </CardContent>
      </Card>

      <div className="md:sticky md:top-4">
        <p className="mb-2 text-sm font-medium text-muted-foreground">{tx(lang, "Live WhatsApp preview", "WhatsApp पूर्वावलोकन")}</p>
        <div className="rounded-lg bg-[#e5ddd5] p-4 dark:bg-neutral-900">
          <div className="max-w-[85%] whitespace-pre-wrap rounded-lg rounded-tl-none bg-white p-3 text-sm shadow dark:bg-neutral-800">
            {draft.whatsappText || <span className="text-muted-foreground">{tx(lang, "Nothing to preview yet", "अभी दिखाने को कुछ नहीं")}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
