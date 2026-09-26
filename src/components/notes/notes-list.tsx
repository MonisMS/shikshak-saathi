"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Mic, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/components/layout/language-provider";
import { SOURCE_LABEL, formatDuration } from "@/lib/note-format";

export interface NoteRow {
  id: string;
  title: string;
  source: string;
  audioSeconds: number | null;
  overview: string | null;
  createdAt: string;
}

export function NotesList({ initialNotes }: { initialNotes: NoteRow[] }) {
  const { lang } = useLanguage();
  const [notes, setNotes] = useState(initialNotes);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((n) => n.title.toLowerCase().includes(q) || n.overview?.toLowerCase().includes(q));
  }, [notes, search]);

  async function handleDelete(id: string) {
    if (!confirm(lang === "hi" ? "यह नोट हटाएँ? इसे वापस नहीं लाया जा सकता।" : "Delete this note? This cannot be undone.")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/notes/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Failed (${res.status})`);
      }
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast.success("Note deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="note-serif text-3xl tracking-tight">{lang === "hi" ? "कक्षा नोट्स" : "Class notes"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {lang === "hi"
              ? "कक्षा या बैठक रिकॉर्ड करें — ट्रांसक्रिप्ट, सारांश और PDF पाएँ।"
              : "Record a class or meeting — get a transcript, a summary and a PDF."}
          </p>
        </div>
        <Link href="/notes/new" className={buttonVariants()}>
          <Plus /> {lang === "hi" ? "नया नोट" : "New note"}
        </Link>
      </div>

      {notes.length > 0 && <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={lang === "hi" ? "नोट्स खोजें…" : "Search notes…"} />}

      {notes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Mic className="size-8 text-muted-foreground" />
            <p className="font-medium">{lang === "hi" ? "अभी कोई नोट नहीं" : "No notes yet"}</p>
            <Link href="/notes/new" className={buttonVariants({ variant: "outline" })}>
              {lang === "hi" ? "पहला नोट बनाएँ" : "Create your first note"}
            </Link>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">{lang === "hi" ? "कोई नोट मेल नहीं खाता।" : "No notes match."}</p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {filtered.map((n) => (
            <li key={n.id} className="group flex items-start gap-3 p-4 hover:bg-muted/40">
              <Link href={`/notes/${n.id}`} className="min-w-0 flex-1">
                <p className="note-serif truncate text-lg">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}
                  {SOURCE_LABEL[n.source] && <> · {SOURCE_LABEL[n.source][lang]}</>}
                  {n.audioSeconds ? <> · {formatDuration(n.audioSeconds)}</> : null}
                </p>
                {n.overview && <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{n.overview}</p>}
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete note"
                disabled={busyId === n.id}
                onClick={() => void handleDelete(n.id)}
                className="opacity-60 group-hover:opacity-100"
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
