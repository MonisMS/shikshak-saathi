"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, FileDown, Lightbulb, Loader2, Pencil, RefreshCw, Search, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/components/layout/language-provider";
import { cn } from "@/lib/utils";
import { SOURCE_LABEL, formatDuration, parseTranscript, readMinutes, summaryToText } from "@/lib/note-format";
import type { NoteLanguage, NoteSummary } from "@/lib/ai/prompts/notes";
import { ExportPdfDialog } from "./export-pdf-dialog";

export interface NoteData {
  id: string;
  title: string;
  source: string;
  audioSeconds: number | null;
  summaryLanguage: NoteLanguage;
  transcript: string;
  summary: NoteSummary | null;
  summaryError: string | null;
  myNotes: string;
  createdAt: string;
}

const L = {
  back: { en: "All notes", hi: "सभी नोट्स" },
  myNotes: { en: "My thoughts", hi: "मेरे विचार" },
  transcript: { en: "Transcript", hi: "ट्रांसक्रिप्ट" },
  summary: { en: "Summary", hi: "सारांश" },
  minRead: { en: "MIN READ", hi: "मिनट पढ़ें" },
  search: { en: "Search…", hi: "खोजें…" },
  actionItems: { en: "Action items", hi: "आगे के काम" },
  noSummary: { en: "The summary couldn't be generated.", hi: "सारांश नहीं बन पाया।" },
  generate: { en: "Generate summary", hi: "सारांश बनाएँ" },
  regenerate: { en: "Regenerate", hi: "फिर से बनाएँ" },
  edit: { en: "Edit", hi: "संपादित करें" },
  save: { en: "Save", hi: "सहेजें" },
  cancel: { en: "Cancel", hi: "रद्द करें" },
  myNotesPh: {
    en: "Jot down your own thoughts, reminders or follow-ups for this class…",
    hi: "इस कक्षा के लिए अपने विचार, रिमाइंडर या आगे के काम लिखें…",
  },
  saving: { en: "Saving…", hi: "सहेजा जा रहा है…" },
  saved: { en: "Saved", hi: "सहेजा गया" },
  exportPdf: { en: "Export PDF", hi: "PDF निकालें" },
  delete: { en: "Delete", hi: "हटाएँ" },
  transcriptChanged: { en: "Transcript changed — update the summary?", hi: "ट्रांसक्रिप्ट बदला — सारांश अपडेट करें?" },
  noMatches: { en: "No matches", hi: "कोई मेल नहीं" },
} as const;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Wraps case-insensitive matches of `query` in <mark>. */
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${escapeRegExp(query.trim())})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-sm bg-amber-200 px-0.5 text-foreground dark:bg-amber-500/40">
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function countMatches(text: string, query: string) {
  if (!query.trim()) return 0;
  return (text.match(new RegExp(escapeRegExp(query.trim()), "gi")) ?? []).length;
}

/** "10:20 PM yesterday" / "9:05 AM today" / "12 Sep, 4:10 PM" — computed after mount so SSR (UTC) and the browser's timezone never disagree. */
function relativeLabel(iso: string): string {
  const date = new Date(iso);
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toUpperCase();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayDiff = Math.round((startOfToday.getTime() - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000);
  if (dayDiff === 0) return `${time} today`;
  if (dayDiff === 1) return `${time} yesterday`;
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return `${date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" })}, ${time}`;
}

const noopSubscribe = () => () => {};

function useRelativeTime(iso: string) {
  // Server snapshot is null → the label only renders in the browser, in the teacher's own timezone.
  return useSyncExternalStore(noopSubscribe, () => relativeLabel(iso), () => null);
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          toast.error("Couldn't copy — select the text instead");
        }
      }}
    >
      {copied ? <Check /> : <Copy />}
    </Button>
  );
}

function SearchToggle({ query, setQuery, matches, placeholder, noMatches }: { query: string; setQuery: (q: string) => void; matches: number; placeholder: string; noMatches: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="ghost" size="icon-sm" aria-label={placeholder} title={placeholder} onClick={() => setOpen(true)}>
        <Search />
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} className="h-7 w-36 text-xs sm:w-48" />
      {query.trim() && <span className="text-xs whitespace-nowrap text-muted-foreground">{matches > 0 ? matches : noMatches}</span>}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Close search"
        onClick={() => {
          setQuery("");
          setOpen(false);
        }}
      >
        <X />
      </Button>
    </div>
  );
}

export function NoteView({ initialNote }: { initialNote: NoteData }) {
  const router = useRouter();
  const { lang } = useLanguage();
  const [note, setNote] = useState(initialNote);
  const [tab, setTab] = useState<"notes" | "transcript" | "summary">(initialNote.summary ? "summary" : "transcript");
  const [summarizing, setSummarizing] = useState(false);
  const [staleSummary, setStaleSummary] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportKey, setExportKey] = useState(0); // remount the dialog per open so its checkbox defaults re-derive
  const when = useRelativeTime(note.createdAt);

  /* ── Title (inline rename) ── */
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(note.title);

  async function saveTitle() {
    const next = titleDraft.trim();
    setEditingTitle(false);
    if (!next || next === note.title) {
      setTitleDraft(note.title);
      return;
    }
    try {
      const data = await api<{ note: NoteData }>(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      setNote((n) => ({ ...n, title: data.note.title }));
      router.refresh();
    } catch (e) {
      setTitleDraft(note.title);
      toast.error(e instanceof Error ? e.message : "Couldn't rename");
    }
  }

  /* ── Summary ── */
  const [summaryQuery, setSummaryQuery] = useState("");
  const summaryText = useMemo(() => (note.summary ? summaryToText(note.summary) : ""), [note.summary]);

  async function summarize(summaryLanguage: NoteLanguage) {
    setSummarizing(true);
    try {
      const data = await api<{ note: NoteData }>(`/api/notes/${note.id}/summarize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summaryLanguage }),
      });
      setNote((n) => ({ ...n, summary: data.note.summary, summaryError: null, summaryLanguage: data.note.summaryLanguage }));
      setStaleSummary(false);
      setTab("summary");
    } catch (e) {
      setNote((n) => ({ ...n, summaryError: e instanceof Error ? e.message : "Summary failed" }));
      toast.error(e instanceof Error ? e.message : "Summary failed");
    } finally {
      setSummarizing(false);
    }
  }

  /* ── Transcript ── */
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState(note.transcript);
  const [savingTranscript, setSavingTranscript] = useState(false);
  const segments = useMemo(() => parseTranscript(note.transcript), [note.transcript]);

  async function saveTranscript() {
    const next = transcriptDraft.trim();
    if (!next) {
      toast.error("Transcript can't be empty");
      return;
    }
    if (next === note.transcript) {
      setEditingTranscript(false);
      return;
    }
    setSavingTranscript(true);
    try {
      const data = await api<{ note: NoteData }>(`/api/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: next }),
      });
      setNote((n) => ({ ...n, transcript: data.note.transcript }));
      setEditingTranscript(false);
      setStaleSummary(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSavingTranscript(false);
    }
  }

  /* ── My thoughts (debounced autosave) ── */
  const [myNotes, setMyNotes] = useState(note.myNotes);
  const [notesStatus, setNotesStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savedNotesRef = useRef(note.myNotes);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flushNotes = useCallback(
    async (keepalive = false) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const value = pendingRef.current;
      if (value === null || value === savedNotesRef.current) return;
      pendingRef.current = null;
      setNotesStatus("saving");
      try {
        await api(`/api/notes/${initialNote.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ myNotes: value }),
          keepalive,
        });
        savedNotesRef.current = value;
        setNotesStatus("saved");
      } catch {
        pendingRef.current = value; // keep it so the next edit / blur retries
        setNotesStatus("error");
      }
    },
    [initialNote.id],
  );

  function onNotesChange(value: string) {
    setMyNotes(value);
    pendingRef.current = value;
    setNotesStatus("idle");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flushNotes(), 800);
  }

  useEffect(() => {
    const onHide = () => void flushNotes(true);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flushNotes(true); // navigating away inside the app
    };
  }, [flushNotes]);

  async function handleDelete() {
    if (!confirm(lang === "hi" ? "यह नोट हटाएँ? इसे वापस नहीं लाया जा सकता।" : "Delete this note? This cannot be undone.")) return;
    try {
      await api(`/api/notes/${note.id}`, { method: "DELETE" });
      pendingRef.current = null;
      toast.success("Note deleted");
      router.push("/notes");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    }
  }

  const source = SOURCE_LABEL[note.source]?.[lang];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-2">
        <Link href="/notes" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          <ArrowLeft /> {L.back[lang]}
        </Link>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => {
              setExportKey((k) => k + 1);
              setExportOpen(true);
            }}
          >
            <FileDown /> {L.exportPdf[lang]}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={L.delete[lang]} title={L.delete[lang]} onClick={() => void handleDelete()}>
            <Trash2 />
          </Button>
        </div>
      </div>

      {editingTitle ? (
        <Input
          autoFocus
          value={titleDraft}
          maxLength={200}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={() => void saveTitle()}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setTitleDraft(note.title);
              setEditingTitle(false);
            }
          }}
          className="note-serif h-auto py-1 text-3xl md:text-4xl"
        />
      ) : (
        <h1
          className="note-serif group cursor-text text-3xl leading-tight tracking-tight md:text-[2.6rem]"
          onClick={() => setEditingTitle(true)}
          title="Click to rename"
        >
          {note.title}
          <Pencil className="ml-2 inline size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </h1>
      )}
      <p className="mt-2 text-sm text-muted-foreground">
        {when ?? " "}
        {source && <> · {source}</>}
        {note.audioSeconds ? <> · {formatDuration(note.audioSeconds)}</> : null}
      </p>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="mt-6">
        <TabsList variant="line" className="w-full justify-start gap-4 border-b border-border pb-1">
          <TabsTrigger value="notes" className="flex-none px-1 text-[0.95rem]">
            {L.myNotes[lang]}
          </TabsTrigger>
          <TabsTrigger value="transcript" className="flex-none px-1 text-[0.95rem]">
            {L.transcript[lang]}
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex-none px-1 text-[0.95rem]">
            <Sparkles /> {L.summary[lang]}
          </TabsTrigger>
        </TabsList>

        {/* ── My thoughts ── */}
        <TabsContent value="notes" className="pt-4">
          <Textarea
            value={myNotes}
            onChange={(e) => onNotesChange(e.target.value)}
            onBlur={() => void flushNotes()}
            placeholder={L.myNotesPh[lang]}
            maxLength={50_000}
            className="min-h-72 border-none bg-muted/40 p-4 text-[0.95rem] leading-7 shadow-none focus-visible:ring-1"
          />
          <p className="mt-1 h-4 text-right text-xs text-muted-foreground">
            {notesStatus === "saving" && L.saving[lang]}
            {notesStatus === "saved" && L.saved[lang]}
            {notesStatus === "error" && <span className="text-destructive">Not saved — will retry</span>}
          </p>
        </TabsContent>

        {/* ── Transcript ── */}
        <TabsContent value="transcript" className="pt-4">
          <div className="rounded-xl border border-border">
            <div className="flex items-center justify-between gap-2 rounded-t-xl bg-muted/60 px-4 py-2.5">
              <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                {segments.length} {lang === "hi" ? "हिस्से" : segments.length === 1 ? "part" : "parts"}
              </span>
              <div className="flex items-center gap-1">
                {!editingTranscript && (
                  <>
                    <SearchToggle
                      query={transcriptQuery}
                      setQuery={setTranscriptQuery}
                      matches={countMatches(note.transcript, transcriptQuery)}
                      placeholder={L.search[lang]}
                      noMatches={L.noMatches[lang]}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={L.edit[lang]}
                      title={L.edit[lang]}
                      onClick={() => {
                        setTranscriptDraft(note.transcript);
                        setEditingTranscript(true);
                      }}
                    >
                      <Pencil />
                    </Button>
                    <CopyButton text={note.transcript} label="Copy transcript" />
                  </>
                )}
              </div>
            </div>

            {staleSummary && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-amber-50 px-4 py-2 text-sm dark:bg-amber-500/10">
                <span>{L.transcriptChanged[lang]}</span>
                <Button size="sm" disabled={summarizing} onClick={() => void summarize(note.summaryLanguage)}>
                  {summarizing ? <Loader2 className="animate-spin" /> : <RefreshCw />} {L.regenerate[lang]}
                </Button>
              </div>
            )}

            {editingTranscript ? (
              <div className="space-y-3 p-4">
                <Textarea value={transcriptDraft} onChange={(e) => setTranscriptDraft(e.target.value)} maxLength={200_000} className="min-h-96 font-[inherit] leading-7" />
                <div className="flex gap-2">
                  <Button size="sm" disabled={savingTranscript} onClick={() => void saveTranscript()}>
                    {savingTranscript && <Loader2 className="animate-spin" />} {L.save[lang]}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={savingTranscript} onClick={() => setEditingTranscript(false)}>
                    {L.cancel[lang]}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 px-4 py-5 text-[0.95rem] leading-7">
                {segments.map((seg, i) => (
                  <div key={i} className="flex gap-3">
                    {seg.timestamp && <span className="mt-1 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{seg.timestamp}</span>}
                    <p className="whitespace-pre-wrap">
                      <Highlight text={seg.text} query={transcriptQuery} />
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Summary ── */}
        <TabsContent value="summary" className="pt-4">
          {note.summary ? (
            <div className="rounded-xl border border-border">
              <div className="flex items-center justify-between gap-2 rounded-t-xl bg-muted/60 px-4 py-2.5">
                <span className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  <Lightbulb className="size-3.5" /> {readMinutes(summaryText)} {L.minRead[lang]}
                </span>
                <div className="flex items-center gap-1">
                  <SearchToggle query={summaryQuery} setQuery={setSummaryQuery} matches={countMatches(summaryText, summaryQuery)} placeholder={L.search[lang]} noMatches={L.noMatches[lang]} />
                  <CopyButton text={summaryText} label="Copy summary" />
                </div>
              </div>

              <div className="space-y-6 px-4 py-5 text-[0.95rem] leading-7 md:px-6">
                <p>
                  <Highlight text={note.summary.overview} query={summaryQuery} />
                </p>
                {note.summary.sections.map((section, i) => (
                  <section key={i}>
                    <h3 className="mb-1 font-semibold">
                      <Highlight text={section.heading} query={summaryQuery} />
                    </h3>
                    <ul className="ml-5 list-disc space-y-1 marker:text-muted-foreground">
                      {section.bullets.map((b, j) => (
                        <li key={j}>
                          <Highlight text={b} query={summaryQuery} />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
                {note.summary.actionItems.length > 0 && (
                  <section>
                    <h3 className="mb-1 font-semibold">{L.actionItems[lang]}</h3>
                    <ul className="space-y-1">
                      {note.summary.actionItems.map((a, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="mt-[0.45rem] size-3 shrink-0 rounded-[3px] border border-muted-foreground/60" />
                          <span>
                            <Highlight text={a} query={summaryQuery} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
                <span>{lang === "hi" ? "भाषा बदलकर फिर से बनाएँ:" : "Regenerate in:"}</span>
                {(
                  [
                    ["auto", lang === "hi" ? "ऑडियो जैसी" : "Same as audio"],
                    ["hi", "हिंदी"],
                    ["en", "English"],
                  ] as const
                ).map(([value, label]) => (
                  <Button
                    key={value}
                    variant={note.summaryLanguage === value ? "secondary" : "ghost"}
                    size="xs"
                    disabled={summarizing}
                    onClick={() => void summarize(value)}
                  >
                    {label}
                  </Button>
                ))}
                {summarizing && <Loader2 className="size-3.5 animate-spin" />}
              </div>
            </div>
          ) : (
            <div className={cn("flex flex-col items-start gap-3 rounded-xl border border-dashed border-border p-6")}>
              <p className="font-medium">{L.noSummary[lang]}</p>
              {note.summaryError && <p className="line-clamp-3 text-xs text-muted-foreground">{note.summaryError}</p>}
              <Button disabled={summarizing} onClick={() => void summarize(note.summaryLanguage)}>
                {summarizing ? <Loader2 className="animate-spin" /> : <Sparkles />} {L.generate[lang]}
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ExportPdfDialog
        key={exportKey}
        open={exportOpen}
        onOpenChange={setExportOpen}
        noteId={note.id}
        hasSummary={note.summary !== null}
        hasMyNotes={myNotes.trim().length > 0}
        beforeOpen={() => flushNotes()}
      />
    </div>
  );
}
