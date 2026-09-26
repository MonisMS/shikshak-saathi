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

const COPY: Record<ResourceGroup, { title: string; subtitle: string; accept: string; hint: string; empty: string }> = {
  documents: {
    title: "Resources",
    subtitle: "Textbook chapters, PDFs, worksheets and photos of pages — ready to build a kit from.",
    accept: ".pdf,.docx,.txt,image/*",
    hint: "PDF, Word (.docx), .txt, or several photos of textbook pages (read with OCR)",
    empty: "No resources yet. Upload a chapter PDF or photos of the textbook pages.",
  },
  recordings: {
    title: "Recordings",
    subtitle: "Your class and teaching recordings, transcribed — use what you actually said in class to plan the next lesson.",
    accept: "audio/*,.mp3,.m4a,.wav,.ogg,.webm",
    hint: "Audio files (mp3, m4a, wav, webm) — transcribed automatically in Hindi or English",
    empty: "No recordings yet. Upload a class recording to transcribe it.",
  },
};

function KindIcon({ kind }: { kind: string }) {
  const Icon = kind === "audio" ? AudioLines : kind === "image" ? ImageIcon : FileText;
  const tint = kind === "audio" ? "bg-violet-50 text-violet-700" : kind === "image" ? "bg-amber-50 text-amber-700" : kind === "pdf" ? "bg-rose-50 text-rose-700" : "bg-sky-50 text-sky-700";
  return (
    <span className={cn("grid size-11 shrink-0 place-items-center rounded-2xl", tint)}>
      <Icon className="size-5" />
    </span>
  );
}

function meta(r: ResourceListItem) {
  const parts: string[] = [];
  if (r.grade) parts.push(`Class ${r.grade}`);
  if (r.subject) parts.push(r.subject);
  if (r.kind === "audio") {
    if (r.audioSeconds) parts.push(`${Math.round(r.audioSeconds / 60)} min`);
    parts.push("Transcript");
  } else {
    parts.push(`${r.kind.toUpperCase()} · ${r.pageCount} page${r.pageCount === 1 ? "" : "s"}`);
  }
  return parts.join(" · ");
}

function ResourceCard({ r, onDeleted }: { r: ResourceListItem; onDeleted: (id: string) => void }) {
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
    if (!confirm(`Delete “${r.title}”?`)) return;
    const res = await fetch(`/api/resources/${r.id}`, { method: "DELETE" });
    if (res.ok) onDeleted(r.id);
    else toast.error("Could not delete");
  }

  return (
    <li className="rounded-3xl bg-card p-5 ring-1 ring-foreground/[0.04]">
      <div className="flex items-start gap-4">
        <KindIcon kind={r.kind} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{r.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{meta(r)}</p>
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
          <Sparkles /> Make a kit from this
        </Link>
        <Button size="sm" variant="outline" onClick={toggle}>
          {open ? "Hide" : r.kind === "audio" ? "Read transcript" : "Read text"}
        </Button>
        {r.sourceUrl && (
          <a href={r.sourceUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "ghost" })}>
            <ExternalLink /> {r.kind === "audio" ? "Recording" : "Source"}
          </a>
        )}
      </div>
    </li>
  );
}

function AddTranscript({ onAdded }: { onAdded: () => void }) {
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
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? "Could not save");
      setOpen(false);
      setTitle("");
      setUrl("");
      setTranscript("");
      onAdded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Plus /> Paste a transcript or audio link
      </Button>
    );
  }
  return (
    <div className="space-y-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/[0.04]">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 7-A Science, 24 Sep — Litmus" />
        </div>
        <div className="space-y-1.5">
          <Label>Audio link (optional)</Label>
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Transcript</Label>
        <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={6} placeholder="Paste what was said in class…" />
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={saving || !title.trim() || !transcript.trim()}>
          {saving ? "Saving…" : "Save recording"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function ResourceLibrary({ group, initial }: { group: ResourceGroup; initial: ResourceListItem[] }) {
  const copy = COPY[group];
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
      toast.success(group === "recordings" ? "Transcribed and saved" : "Saved to your resources");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
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
            {uploading ? (group === "recordings" ? "Transcribing…" : "Reading your files…") : group === "recordings" ? "Upload class recordings" : "Upload resources"}
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
