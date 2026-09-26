"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MicButton, type VoiceIntentResult } from "@/components/voice/mic-button";
import { FadeIn } from "@/components/motion/fade-in";
import { FileUp, Loader2, X } from "lucide-react";
import { NCERT_CATALOG } from "@/lib/ncert-catalog";
import type { ResourceListItem } from "@/lib/resources";
import { AudioLines, FileText } from "lucide-react";

type SourceTab = "chapter" | "topic" | "upload";
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);
const STANDARD_SUBJECTS = ["Science", "Maths", "English", "Hindi", "Social Science", "EVS", "Sanskrit"];
const DOC_ACCEPT = ".pdf,.docx,.txt,image/*";
const AUDIO_ACCEPT = "audio/*,.mp3,.m4a,.wav,.ogg,.webm";
type Page = { page: number; text: string; source?: string };

async function extractPages(files: File[]): Promise<Page[]> {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  const res = await fetch("/api/sources/extract", { method: "POST", body: form });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed (${res.status})`);
  return (data as { pages: Page[] }).pages;
}

interface ChapterPick {
  value: string;
  no: number;
  title: string;
  book: string;
  grounded: boolean;
}

/** Full NCERT chapter list for a class + subject; chapters whose text is in the DB keep their id (grounded). */
function chapterOptions(chapters: ChapterOption[], grade: number, subject: string, language: "hi" | "en"): ChapterPick[] {
  const inDb = chapters.filter((c) => c.grade === grade && c.subject === subject);
  const book = NCERT_CATALOG.find((b) => b.grade === grade && b.subject === subject);
  const picks: ChapterPick[] = (book?.chapters ?? []).map((title, i) => {
    const db = inDb.find((c) => c.chapterNo === i + 1);
    return db
      ? { value: db.id, no: db.chapterNo, title: language === "hi" && db.titleHi ? db.titleHi : db.titleEn, book: book!.book, grounded: true }
      : { value: `cat:${grade}:${subject}:${i + 1}`, no: i + 1, title, book: book!.book, grounded: false };
  });
  for (const db of inDb) {
    if (!picks.some((p) => p.value === db.id)) {
      picks.push({ value: db.id, no: db.chapterNo, title: language === "hi" && db.titleHi ? db.titleHi : db.titleEn, book: "NCERT", grounded: true });
    }
  }
  return picks.sort((a, b) => a.no - b.no);
}

function SourceDropzone({
  onFiles,
  disabled,
  accept,
  hint,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  accept: string;
  hint: string;
}) {
  const [over, setOver] = useState(false);
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (!disabled && e.dataTransfer.files.length) onFiles(Array.from(e.dataTransfer.files));
      }}
      className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed p-4 text-center transition-colors ${
        over ? "border-primary bg-accent" : "border-border hover:border-primary/60"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <FileUp className="size-6 text-primary" />
      <span className="text-sm font-medium">Drop files here or click to choose</span>
      <span className="text-xs text-muted-foreground">{hint}</span>
      <input
        type="file"
        multiple
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          if (e.target.files?.length) onFiles(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
    </label>
  );
}

interface ChapterOption {
  id: string;
  grade: number;
  subject: string;
  chapterNo: number;
  titleEn: string;
  titleHi: string | null;
}

interface ClassroomOption {
  id: string;
  name: string;
  subject: string;
  grades: number[];
  studentCount: number;
  isMultiGrade: boolean;
  lowResource: boolean;
}

export function NewKitForm({
  chapters,
  classrooms,
  initialIntent,
  library = [],
  initialResourceIds = [],
}: {
  chapters: ChapterOption[];
  classrooms: ClassroomOption[];
  library?: ResourceListItem[];
  initialResourceIds?: string[];
  /** Prefills the form from a voice intent handed off by the dashboard's mic (§6). */
  initialIntent?: VoiceIntentResult;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const [language, setLanguage] = useState<"hi" | "en">("hi");

  // Class + subject are shared by all three source tabs.
  const [grade, setGrade] = useState<number>(chapters[0]?.grade ?? classrooms[0]?.grades[0] ?? 7);
  const subjects = useMemo(
    () => Array.from(new Set([...STANDARD_SUBJECTS, ...chapters.map((c) => c.subject)])),
    [chapters],
  );
  const [subject, setSubject] = useState<string>(chapters[0]?.subject ?? "Science");
  const optionsFor = (g: number, subj: string): ChapterPick[] => chapterOptions(chapters, g, subj, language);
  const chaptersForSubject = optionsFor(grade, subject);
  const [chapterId, setChapterId] = useState<string | undefined>(() => chapterOptions(chapters, grade, subject, "hi")[0]?.value);
  const pickedChapter = chaptersForSubject.find((c) => c.value === chapterId);

  const [topic, setTopic] = useState("");

  // Upload tab: files are read into numbered source pages as soon as they're added.
  const [files, setFiles] = useState<File[]>([]);
  const [sourcePages, setSourcePages] = useState<Page[] | null>(null);
  const [reading, setReading] = useState(false);
  const [sourceName, setSourceName] = useState("");

  async function readFiles(next: File[]) {
    setFiles(next);
    setSourcePages(null);
    if (next.length === 0) return;
    if (!sourceName) setSourceName(next[0].name.replace(/\.[^.]+$/, ""));
    setReading(true);
    try {
      setSourcePages(await extractPages(next));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not read the files");
    } finally {
      setReading(false);
    }
  }

  // Optional class recording: pick one from Recordings, or upload audio to transcribe.
  const documents = library.filter((r) => r.kind !== "audio");
  const recordings = library.filter((r) => r.kind === "audio");
  const [materialId, setMaterialId] = useState<string | undefined>(initialResourceIds.find((id) => documents.some((d) => d.id === id)));
  const [recordingId, setRecordingId] = useState<string | undefined>(initialResourceIds.find((id) => recordings.some((d) => d.id === id)));
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPages, setAudioPages] = useState<Page[] | null>(null);
  const [readingAudio, setReadingAudio] = useState(false);

  async function readAudio(file: File | null) {
    setAudioFile(file);
    setAudioPages(null);
    if (!file) return;
    setRecordingId(undefined);
    setReadingAudio(true);
    try {
      setAudioPages(await extractPages([file]));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not transcribe the audio");
      setAudioFile(null);
    } finally {
      setReadingAudio(false);
    }
  }

  // Shared options
  const [classroomId, setClassroomId] = useState<string | undefined>(classrooms[0]?.id);
  const classroom = classrooms.find((c) => c.id === classroomId);
  const [periodMinutes, setPeriodMinutes] = useState(40);
  const [classSize, setClassSize] = useState(classroom?.studentCount ?? 40);
  const [lowResource, setLowResource] = useState(classroom?.lowResource ?? true);
  const [scheduledFor, setScheduledFor] = useState("");
  const [teacherNote, setTeacherNote] = useState("");
  const [activeTab, setActiveTab] = useState<SourceTab>(initialResourceIds.length ? "upload" : "chapter");

  // F31: "Speaking Hindi fills the form" — try to match a seeded chapter first,
  // fall back to the typed-topic tab when there's no exact grade+subject+chapterNo match.
  function handleVoiceIntent(intent: VoiceIntentResult) {
    if (intent.language) setLanguage(intent.language);
    if (intent.grade) setGrade(intent.grade);
    const matchedSubject = intent.subject ? subjects.find((x) => x.toLowerCase() === intent.subject?.toLowerCase()) : undefined;
    if (matchedSubject) setSubject(matchedSubject);
    if (intent.teacherNote) setTeacherNote(intent.teacherNote);

    const matchedChapter =
      intent.grade && matchedSubject && intent.chapterNo
        ? chapters.find((c) => c.grade === intent.grade && c.subject === matchedSubject && c.chapterNo === intent.chapterNo)
        : undefined;
    if (matchedChapter) {
      setChapterId(matchedChapter.id);
      setActiveTab("chapter");
    } else {
      if (intent.topic) setTopic(intent.topic);
      setActiveTab("topic");
    }
    toast.success("Filled from voice");
  }

  const appliedInitialIntent = useRef(false);
  useEffect(() => {
    if (appliedInitialIntent.current || !initialIntent) return;
    appliedInitialIntent.current = true;
    handleVoiceIntent(initialIntent);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialIntent]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeTab === "chapter" && !chapterId) return void toast.error("Pick a chapter, or type a topic / upload material");
    if (activeTab === "topic" && !topic.trim()) return void toast.error("Type the topic you want to teach");
    if (activeTab === "upload" && (reading || readingAudio)) return void toast.error("Still reading your files…");
    if (activeTab === "upload" && !materialId && !sourcePages?.length) return void toast.error("Choose material from Resources or upload it");
    setSubmitting(true);

    // OBJECTIVES/LESSON_PLAN are added server-side automatically (Ujjwal's POST /api/kits
    // treats them as always-on) — only send the optional ones here.
    const sections = ["WORKSHEET", "EXIT_QUIZ", "PARENT_NOTE"];

    const body: Record<string, unknown> = {
      classroomId,
      language,
      periodMinutes,
      classSize,
      lowResource,
      sections,
      teacherNote: teacherNote || undefined,
      // POST /api/kits requires a full ISO datetime (z.string().datetime()), not a bare date.
      scheduledFor: scheduledFor ? new Date(`${scheduledFor}T00:00:00.000Z`).toISOString() : undefined,
      grade,
      subject,
      ...(activeTab === "chapter"
        ? pickedChapter?.grounded
          ? { chapterId }
          : { topic: `Chapter ${pickedChapter?.no}: ${pickedChapter?.title} (NCERT ${pickedChapter?.book}, Class ${grade} ${subject})` }
        : activeTab === "topic"
          ? { topic: topic.trim() }
          : {
              resourceIds: [materialId, recordingId].filter((x): x is string => !!x),
              sourcePages: [...(sourcePages ?? []), ...(audioPages ?? [])],
              sourceName: sourceName.trim() || undefined,
            }),
    };

    try {
      const res = await fetch("/api/kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data: unknown = await res.json();
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Failed (${res.status})`);
      const { id } = data as { id: string };
      router.push(`/kits/${id}?autostart=1`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create the kit");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 pb-10">
      <FadeIn className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">New lesson kit</h1>
        <MicButton onIntent={handleVoiceIntent} />
      </FadeIn>

      <FadeIn index={1} className="space-y-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/[0.04] md:p-6">
        <StepHeading step={1} title="What are you teaching?" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select
              items={GRADES.map((g) => ({ value: String(g), label: `Class ${g}` }))}
              value={String(grade)}
              onValueChange={(v) => {
                const g = Number(v);
                setGrade(g);
                setChapterId(optionsFor(g, subject)[0]?.value);
              }}
            >
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {GRADES.map((g) => (
                  <SelectItem key={g} value={String(g)}>Class {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select
              value={subject}
              onValueChange={(v) => {
                if (!v) return;
                setSubject(v);
                setChapterId(optionsFor(grade, v)[0]?.value);
              }}
            >
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {subjects.map((x) => (
                  <SelectItem key={x} value={x}>{x}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v as SourceTab)} className="pt-2">
          <TabsList className="flex-wrap">
            <TabsTrigger value="chapter">NCERT chapter</TabsTrigger>
            <TabsTrigger value="topic">Type topic</TabsTrigger>
            <TabsTrigger value="upload">Material + recording</TabsTrigger>
          </TabsList>

          <TabsContent value="chapter" className="space-y-3 pt-4">
            {chaptersForSubject.length > 0 ? (
              <div className="space-y-1.5">
                <Label>Chapter</Label>
                <Select
                  items={chaptersForSubject.map((c) => ({ value: c.value, label: `Ch ${c.no}: ${c.title}` }))}
                  value={chapterId}
                  onValueChange={(v) => setChapterId(v ?? undefined)}
                >
                  <SelectTrigger className="h-11"><SelectValue placeholder="Choose a chapter" /></SelectTrigger>
                  <SelectContent>
                    {chaptersForSubject.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        Ch {c.no}: {c.title}
                        {c.grounded && <span className="ml-2 rounded-md bg-accent px-1.5 py-px text-[10px] font-medium text-accent-foreground">full text</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {pickedChapter?.grounded
                    ? `NCERT ${pickedChapter.book} — full chapter text is loaded, so every question cites its page.`
                    : "Generated from the NCERT chapter title. For page-cited questions, add the chapter under “Upload material”."}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                <p>
                  Class {grade} {subject} isn&apos;t in the NCERT library yet. Type the topic, or upload the chapter from your
                  textbook — photos, PDF or notes all work.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setActiveTab("topic")}>Type topic</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setActiveTab("upload")}>Upload material</Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="topic" className="space-y-1.5 pt-4">
            <Label>Topic / learning objective</Label>
            <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Photosynthesis in green plants" maxLength={2000} />
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 pt-4">
            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-medium"><FileText className="size-4 text-rose-600" /> Teaching material</p>
                <span className="text-xs text-muted-foreground">Required</span>
              </div>
              <div className="space-y-1.5">
                <Label>Choose from Resources</Label>
                <Select
                  items={[{ value: "none", label: documents.length ? "— None —" : "Your Resources are empty" }, ...documents.map((d) => ({ value: d.id, label: d.title }))]}
                  value={materialId ?? "none"}
                  onValueChange={(v) => setMaterialId(v && v !== "none" ? v : undefined)}
                >
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{documents.length ? "— None —" : "Your Resources are empty"}</SelectItem>
                    {documents.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-center text-xs text-muted-foreground">or upload new</p>
              <SourceDropzone
                disabled={reading}
                accept={DOC_ACCEPT}
                hint="PDF, Word (.docx), .txt, or several photos of textbook pages"
                onFiles={(added) => readFiles([...files, ...added])}
              />
              {files.length > 0 && (
                <ul className="space-y-1.5">
                  {files.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2 text-sm">
                      <span className="min-w-0 truncate">{f.name}</span>
                      <button
                        type="button"
                        disabled={reading}
                        onClick={() => readFiles(files.filter((_, j) => j !== i))}
                        className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-50"
                        aria-label={`Remove ${f.name}`}
                      >
                        <X className="size-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {reading && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Reading your files…
                </p>
              )}
              {sourcePages && !reading && (
                <p className="text-sm font-medium text-primary">
                  Read {sourcePages.length} page{sourcePages.length === 1 ? "" : "s"} from {files.length} file{files.length === 1 ? "" : "s"}
                </p>
              )}
              {files.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Name this material</Label>
                  <Input className="h-11" value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Chapter 5 notes" maxLength={200} />
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-medium"><AudioLines className="size-4 text-violet-600" /> Class recording</p>
                <span className="text-xs text-muted-foreground">Optional</span>
              </div>
              <p className="text-xs text-muted-foreground">Add what you said in class so the plan builds on it — e.g. the doubts students raised.</p>
              <div className="space-y-1.5">
                <Label>Choose from Recordings</Label>
                <Select
                  items={[{ value: "none", label: recordings.length ? "— None —" : "No recordings yet" }, ...recordings.map((r) => ({ value: r.id, label: r.title }))]}
                  value={recordingId ?? "none"}
                  onValueChange={(v) => {
                    setRecordingId(v && v !== "none" ? v : undefined);
                    if (v && v !== "none") void readAudio(null);
                  }}
                >
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{recordings.length ? "— None —" : "No recordings yet"}</SelectItem>
                    {recordings.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-center text-xs text-muted-foreground">or upload audio</p>
              {audioFile ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    {readingAudio ? <Loader2 className="size-4 animate-spin" /> : <AudioLines className="size-4 text-violet-600" />}
                    {audioFile.name}
                    {readingAudio ? " — transcribing…" : audioPages ? " — transcribed" : ""}
                  </span>
                  <button type="button" disabled={readingAudio} onClick={() => readAudio(null)} className="text-muted-foreground hover:text-destructive" aria-label="Remove audio">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <SourceDropzone
                  accept={AUDIO_ACCEPT}
                  hint="mp3, m4a, wav or webm — transcribed in Hindi or English"
                  onFiles={(added) => void readAudio(added[0] ?? null)}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </FadeIn>

      <FadeIn index={2} className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/[0.04] md:p-6">
        <StepHeading step={2} title="Class context" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Classroom</Label>
            <Select items={classrooms.map((c) => ({ value: c.id, label: c.name }))} value={classroomId} onValueChange={(v) => setClassroomId(v ?? undefined)}>
              <SelectTrigger className="h-11"><SelectValue placeholder="Classroom" /></SelectTrigger>
              <SelectContent>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date to teach</Label>
            <Input className="h-11" type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Period length (minutes)</Label>
            <Input className="h-11" type="number" min={20} max={90} value={periodMinutes} onChange={(e) => setPeriodMinutes(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Class size</Label>
            <Input className="h-11" type="number" min={1} max={120} value={classSize} onChange={(e) => setClassSize(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>Content language</Label>
            <Select items={{ hi: "हिंदी (Hindi)", en: "English" }} value={language} onValueChange={(v) => setLanguage(v as "hi" | "en")}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-secondary/40 px-3 sm:col-span-2">
            <Label htmlFor="low-resource" className="py-3 text-sm leading-snug">
              Low-resource classroom
              <span className="block font-normal text-muted-foreground">Blackboard + local objects only, no projector</span>
            </Label>
            <Switch id="low-resource" checked={lowResource} onCheckedChange={setLowResource} />
          </div>
        </div>
      </FadeIn>

      <FadeIn index={3} className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/[0.04] md:p-6">
        <StepHeading step={3} title="Anything to add?" />
        <p className="text-sm text-muted-foreground">
          We&apos;ll write the objectives and lesson plan first. Once you&apos;ve reviewed them, add a worksheet, exit quiz or
          parent note from the kit page — only the ones you want.
        </p>
        <div className="space-y-1.5">
          <Label>Note to the AI (optional)</Label>
          <Textarea value={teacherNote} onChange={(e) => setTeacherNote(e.target.value)} maxLength={500} placeholder="Anything specific you want covered" />
        </div>
      </FadeIn>

      <FadeIn index={4}>
        <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? "Creating…" : "Create lesson plan"}
        </Button>
      </FadeIn>
    </form>
  );
}

function StepHeading({ step, title }: { step: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {step}
      </span>
      <h2 className="text-sm font-semibold">{title}</h2>
    </div>
  );
}
