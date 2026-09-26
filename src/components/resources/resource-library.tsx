"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AudioLines, ExternalLink, FileText, FileUp, Image as ImageIcon, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/motion/fade-in";
import type { ResourceGroup, ResourceListItem } from "@/lib/resources";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/layout/language-provider";
import { tx, type Lang } from "@/lib/i18n";

const COPY = (lang: Lang): Record<ResourceGroup, { title: string; subtitle: string; accept: string; hint: string; empty: string }> => ({
  documents: {
    title: tx(lang, "Resources", "संसाधन"),
    subtitle: tx(
      lang,
      "Textbook chapters, PDFs, worksheets and photos of pages — ready to build a kit from.",
      "पाठ्यपुस्तक के अध्याय, PDF, वर्कशीट और पन्नों की फ़ोटो — इनसे किट बनाने के लिए तैयार.",
    ),
    accept: ".pdf,.docx,.txt,image/*",
    hint: tx(lang, "PDF, Word (.docx), .txt, or several photos of textbook pages (read with OCR)", "PDF, Word (.docx), .txt, या पाठ्यपुस्तक के पन्नों की कई फ़ोटो (OCR से पढ़ी जाएँगी)"),
    empty: tx(lang, "No resources yet. Upload a chapter PDF or photos of the textbook pages.", "अभी कोई संसाधन नहीं. किसी अध्याय की PDF या पाठ्यपुस्तक के पन्नों की फ़ोटो अपलोड करें."),
  },
  recordings: {
    title: tx(lang, "Recordings", "रिकॉर्डिंग"),
    subtitle: tx(
      lang,
      "Your class and teaching recordings, transcribed — use what you actually said in class to plan the next lesson.",
      "आपकी कक्षा की रिकॉर्डिंग, लिखित रूप में — कक्षा में जो आपने कहा, उसी से अगला पाठ बनाएँ.",
    ),
    accept: "audio/*,.mp3,.m4a,.wav,.ogg,.webm",
    hint: tx(lang, "Audio files (mp3, m4a, wav, webm) — transcribed automatically in Hindi or English", "ऑडियो फ़ाइलें (mp3, m4a, wav, webm) — हिंदी या अंग्रेज़ी में अपने-आप लिखी जाएँगी"),
    empty: tx(lang, "No recordings yet. Upload a class recording to transcribe it.", "अभी कोई रिकॉर्डिंग नहीं. कक्षा की रिकॉर्डिंग अपलोड करें."),
  },
});

function KindIcon({ kind }: { kind: string }) {
  const Icon = kind === "audio" ? AudioLines : kind === "image" ? ImageIcon : FileText;
  const tint = kind === "audio" ? "bg-violet-50 text-violet-700" : kind === "image" ? "bg-amber-50 text-amber-700" : kind === "pdf" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700";
  return (
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", tint)}>
      <Icon className="size-5" />
    </span>
  );
}

function meta(r: ResourceListItem, lang: Lang) {
  const parts: string[] = [];
  if (r.grade) parts.push(tx(lang, `Class ${r.grade}`, `कक्षा ${r.grade}`));
  if (r.subject) parts.push(r.subject);
  if (r.kind === "audio") {
    if (r.audioSeconds) parts.push(tx(lang, `${Math.round(r.audioSeconds / 60)} min`, `${Math.round(r.audioSeconds / 60)} मिनट`));
    parts.push(tx(lang, "Transcript", "ट्रांसक्रिप्ट"));
  } else {
    parts.push(tx(lang, `${r.kind.toUpperCase()} · ${r.pageCount} page${r.pageCount === 1 ? "" : "s"}`, `${r.kind.toUpperCase()} · ${r.pageCount} पन्ने`));
  }
  return parts.join(" · ");
}

function ResourceCard({ r, onDeleted }: { r: ResourceListItem; onDeleted: (id: string) => void }) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [full, setFull] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && full === null) {
      setLoading(true);
      try {
        const res = await fetch(`/api/resources/${r.id}`);
        const data = (await res.json()) as { pages?: { page: number; text: string }[] };
        setFull((data.pages ?? []).map((p) => (r.kind === "audio" ? p.text : `[p.${p.page}]\n${p.text}`)).join("\n\n"));
      } finally {
        setLoading(false);
      }
    }
  }

  async function remove() {
    if (!confirm(tx(lang, `Delete “${r.title}”?`, `“${r.title}” हटाएँ?`))) return;
    const res = await fetch(`/api/resources/${r.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(r.id);
    else toast.error(tx(lang, "Could not delete", "हटाया नहीं जा सका"));
  }

  return (
    <li className="rounded-3xl bg-card p-5 ring-1 ring-foreground/[0.04]">
      <div className="flex items-start gap-4">
        <KindIcon kind={r.kind} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{r.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{meta(r, lang)}</p>
          {!open && r.preview && <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.preview}</p>}
        </div>
        <button type="button" onClick={remove} className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${r.title}`}>
          <Trash2 className="size-4" />
        </button>
      </div>

      {open && (
        <div className="mt-4 max-h-80 overflow-y-auto rounded-2xl bg-muted p-4 text-sm leading-relaxed whitespace-pre-wrap">
          {loading ? <Loader2 className="size-4 animate-spin" /> : full}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`/kits/new?resource=${r.id}`} className={buttonVariants({ size: "sm" })}>
          <Sparkles /> {tx(lang, "Make a kit from this", "इससे किट बनाएँ")}
        </Link>
        <Button size="sm" variant="outline" onClick={toggle}>
          {open ? tx(lang, "Hide", "छिपाएँ") : r.kind === "audio" ? tx(lang, "Read transcript", "ट्रांसक्रिप्ट पढ़ें") : tx(lang, "Read text", "टेक्स्ट पढ़ें")}
        </Button>
        {r.sourceUrl && (
          <a href={r.sourceUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "ghost" })}>
            <ExternalLink /> {r.kind === "audio" ? tx(lang, "Recording", "रिकॉर्डिंग") : tx(lang, "Source", "स्रोत")}
          </a>
        )}
      </div>
    </li>
  );
}

function AddTranscript({ onAdded }: { onAdded: () => void }) {
  const { lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, transcript, sourceUrl: url || undefined }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? tx(lang, "Could not save", "सहेजा नहीं जा सका"));
      setOpen(false);
      setTitle("");
      setUrl("");
      setTranscript("");
      onAdded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tx(lang, "Could not save", "सहेजा नहीं जा सका"));
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus /> {tx(lang, "Paste a transcript or audio link", "ट्रांसक्रिप्ट या ऑडियो लिंक चिपकाएँ")}
      </Button>
    );
  }
  return (
    <div className="space-y-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/[0.04]">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>{tx(lang, "Title", "शीर्षक")}</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={tx(lang, "e.g. 7-A Science, 24 Sep — Litmus", "जैसे 7-A विज्ञान, 24 सितंबर — लिटमस")} />
        </div>
        <div className="space-y-1.5">
          <Label>{tx(lang, "Audio link (optional)", "ऑडियो लिंक (वैकल्पिक)")}</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>{tx(lang, "Transcript", "ट्रांसक्रिप्ट")}</Label>
        <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={6} placeholder={tx(lang, "Paste what was said in class…", "कक्षा में जो कहा गया, यहाँ चिपकाएँ…")} />
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving || !title.trim() || !transcript.trim()}>
          {saving ? tx(lang, "Saving…", "सहेज रहे हैं…") : tx(lang, "Save recording", "रिकॉर्डिंग सहेजें")}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          {tx(lang, "Cancel", "रद्द करें")}
        </Button>
      </div>
    </div>
  );
}

export function ResourceLibrary({ group, initial }: { group: ResourceGroup; initial: ResourceListItem[] }) {
  const { lang } = useLanguage();
  const copy = COPY(lang)[group];
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [over, setOver] = useState(false);

  async function refresh() {
    const res = await fetch(`/api/resources?group=${group}`);
    if (res.ok) setItems(((await res.json()) as { resources: ResourceListItem[] }).resources);
    router.refresh();
  }

  async function upload(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      const res = await fetch("/api/resources", { method: "POST", body: form });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed (${res.status})`);
      toast.success(group === "recordings" ? tx(lang, "Transcribed and saved", "लिखकर सहेज लिया गया") : tx(lang, "Saved to your resources", "आपके संसाधनों में सहेजा गया"));
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tx(lang, "Upload failed", "अपलोड नहीं हुआ"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-4xl space-y-5">
      <FadeIn>
        <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{copy.subtitle}</p>
      </FadeIn>

      <FadeIn index={1} className="space-y-3">
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void upload(Array.from(e.dataTransfer.files));
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-2 border-dashed bg-card p-8 text-center transition-colors",
            over ? "border-primary bg-accent" : "border-border hover:border-primary/60",
            uploading && "pointer-events-none opacity-70",
          )}
        >
          {uploading ? <Loader2 className="size-7 animate-spin text-primary" /> : <FileUp className="size-7 text-primary" />}
          <span className="font-medium">
            {uploading
              ? group === "recordings"
                ? tx(lang, "Transcribing…", "लिख रहे हैं…")
                : tx(lang, "Reading your files…", "आपकी फ़ाइलें पढ़ रहे हैं…")
              : group === "recordings"
                ? tx(lang, "Upload class recordings", "कक्षा की रिकॉर्डिंग अपलोड करें")
                : tx(lang, "Upload resources", "संसाधन अपलोड करें")}
          </span>
          <span className="text-xs text-muted-foreground">{copy.hint}</span>
          <input
            type="file"
            multiple
            accept={copy.accept}
            className="sr-only"
            onChange={(e) => {
              void upload(Array.from(e.target.files ?? []));
              e.target.value = "";
            }}
          />
        </label>
        {group === "recordings" && <AddTranscript onAdded={refresh} />}
      </FadeIn>

      <FadeIn index={2}>
        {items.length === 0 ? (
          <p className="rounded-3xl bg-card p-6 text-sm text-muted-foreground">{copy.empty}</p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {items.map((r) => (
              <ResourceCard key={r.id} r={r} onDeleted={(id) => setItems((prev) => prev.filter((x) => x.id !== id))} />
            ))}
          </ul>
        )}
      </FadeIn>
    </div>
  );
}
