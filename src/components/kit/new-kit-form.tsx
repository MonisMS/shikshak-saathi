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
import { useLanguage } from "@/components/layout/language-provider";
import { tx } from "@/lib/i18n";
import { FileUp, Loader2, X } from "lucide-react";
import { NCERT_CATALOG } from "@/lib/ncert-catalog";
import type { ResourceListItem } from "@/lib/resources";
import { AudioLines, FileText } from "lucide-react";

type SourceTab = "chapter" | "topic" | "upload";

function normSubject(subject?: string): string | undefined {
  if (!subject) return undefined;
  const s = subject.trim().toLowerCase();
  if (s.startsWith("math")) return "Maths";
  if (s.startsWith("sci")) return "Science";
  if (s.startsWith("social") || s === "sst") return "Social Science";
  if (s.startsWith("eng")) return "English";
  if (s.startsWith("hin")) return "Hindi";
  if (s === "evs") return "EVS";
  if (s.startsWith("sans")) return "Sanskrit";
  return subject.trim();
}
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
  const { lang: ui } = useLanguage();
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
      <span className="text-sm font-medium">{tx(ui, "Drop files here or click to choose", "फ़ाइलें यहाँ छोड़ें या चुनने के लिए क्लिक करें")}</span>
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
  initialClassroomId,
}: {
  chapters: ChapterOption[];
  classrooms: ClassroomOption[];
  library?: ResourceListItem[];
  initialResourceIds?: string[];
  initialClassroomId?: string;
  /** Prefills the form from a voice intent handed off by the dashboard's mic (§6). */
  initialIntent?: VoiceIntentResult;
}) {
  const router = useRouter();
  const { lang: ui } = useLanguage();
  const [submitting, setSubmitting] = useState(false);

  const [language, setLanguage] = useState<"hi" | "en">("hi");

  // Class + subject are shared by all three source tabs.
  const startClassroom = classrooms.find((c) => c.id === initialClassroomId) ?? classrooms[0];
  const [grade, setGrade] = useState<number>(startClassroom?.grades[0] ?? chapters[0]?.grade ?? 7);
  const subjects = useMemo(
    () => Array.from(new Set([...STANDARD_SUBJECTS, ...chapters.map((c) => c.subject)])),
    [chapters],
  );
  const [subject, setSubject] = useState<string>(normSubject(startClassroom?.subject) ?? chapters[0]?.subject ?? "Science");
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
      toast.error(err instanceof Error ? err.message : tx(ui, "Could not read the files", "फ़ाइलें पढ़ी नहीं जा सकीं"));
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
      toast.error(err instanceof Error ? err.message : tx(ui, "Could not transcribe the audio", "ऑडियो का ट्रांसक्रिप्ट नहीं बन सका"));
      setAudioFile(null);
    } finally {
      setReadingAudio(false);
    }
  }

  // Shared options
  const [classroomId, setClassroomId] = useState<string | undefined>(startClassroom?.id);
  const classroom = classrooms.find((c) => c.id === classroomId);
  const [periodMinutes, setPeriodMinutes] = useState(40);
  const [classSize, setClassSize] = useState(classroom?.studentCount ?? 40);
  const [lowResource, setLowResource] = useState(classroom?.lowResource ?? true);
  function pickClassroom(id: string | undefined) {
    setClassroomId(id);
    const c = classrooms.find((x) => x.id === id);
    if (!c) return;
    const g = c.grades[0] ?? grade;
    const subj = normSubject(c.subject) ?? subject;
    setGrade(g);
    setSubject(subj);
    setChapterId(optionsFor(g, subj)[0]?.value);
    setClassSize(c.studentCount);
    setLowResource(c.lowResource);
  }
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
    toast.success(tx(ui, "Filled from voice", "आवाज़ से भरा गया"));
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
    if (activeTab === "chapter" && !chapterId) return void toast.error(tx(ui, "Pick a chapter, or type a topic / upload material", "अध्याय चुनें, या विषय लिखें / सामग्री अपलोड करें"));
    if (activeTab === "topic" && !topic.trim()) return void toast.error(tx(ui, "Type the topic you want to teach", "जो विषय पढ़ाना है, वह लिखें"));
    if (activeTab === "upload" && (reading || readingAudio)) return void toast.error(tx(ui, "Still reading your files…", "फ़ाइलें अभी पढ़ी जा रही हैं…"));
    if (activeTab === "upload" && !materialId && !sourcePages?.length) return void toast.error(tx(ui, "Choose material from Resources or upload it", "संसाधनों से सामग्री चुनें या अपलोड करें"));
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
      toast.error(err instanceof Error ? err.message : tx(ui, "Could not create the kit", "किट नहीं बन सकी"));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6 pb-10">
      <FadeIn className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{tx(ui, "New lesson kit", "नई पाठ किट")}</h1>
        <MicButton onIntent={handleVoiceIntent} />
      </FadeIn>

      <FadeIn index={1} className="space-y-3 rounded-3xl bg-card p-5 ring-1 ring-foreground/[0.04] md:p-6">
        <StepHeading step={1} title={tx(ui, "What are you teaching?", "आप क्या पढ़ा रहे हैं?")} />
        {classrooms.length > 0 && (
          <div className="space-y-1.5">
            <Label>{tx(ui, "Which class?", "कौन-सी कक्षा?")}</Label>
            <Select items={classrooms.map((c) => ({ value: c.id, label: c.name }))} value={classroomId} onValueChange={(v) => pickClassroom(v ?? undefined)}>
              <SelectTrigger className="h-11"><SelectValue placeholder={tx(ui, "Choose your class", "अपनी कक्षा चुनें")} /></SelectTrigger>
              <SelectContent>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tx(ui, "Class, subject and class size are filled in from your class — change them below if needed.", "कक्षा, विषय और बच्चों की संख्या आपकी कक्षा से भर दी गई है — ज़रूरत हो तो नीचे बदलें।")}
            </p>
          </div>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{tx(ui, "Class", "कक्षा")}</Label>
            <Select
              items={GRADES.map((g) => ({ value: String(g), label: tx(ui, `Class ${g}`, `कक्षा ${g}`) }))}
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
                  <SelectItem key={g} value={String(g)}>{tx(ui, `Class ${g}`, `कक्षा ${g}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{tx(ui, "Subject", "विषय")}</Label>
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
            <TabsTrigger value="chapter">{tx(ui, "NCERT chapter", "NCERT अध्याय")}</TabsTrigger>
            <TabsTrigger value="topic">{tx(ui, "Type topic", "विषय लिखें")}</TabsTrigger>
            <TabsTrigger value="upload">{tx(ui, "Material + recording", "सामग्री + रिकॉर्डिंग")}</TabsTrigger>
          </TabsList>

          <TabsContent value="chapter" className="space-y-3 pt-4">
            {chaptersForSubject.length > 0 ? (
              <div className="space-y-1.5">
                <Label>{tx(ui, "Chapter", "अध्याय")}</Label>
                <Select
                  items={chaptersForSubject.map((c) => ({ value: c.value, label: `Ch ${c.no}: ${c.title}` }))}
                  value={chapterId}
                  onValueChange={(v) => setChapterId(v ?? undefined)}
                >
                  <SelectTrigger className="h-11"><SelectValue placeholder={tx(ui, "Choose a chapter", "अध्याय चुनें")} /></SelectTrigger>
                  <SelectContent>
                    {chaptersForSubject.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        Ch {c.no}: {c.title}
                        {c.grounded && <span className="ml-2 rounded-md bg-accent px-1.5 py-px text-[10px] font-medium text-accent-foreground">{tx(ui, "full text", "पूरा पाठ")}</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {pickedChapter?.grounded
                    ? tx(ui, `NCERT ${pickedChapter.book} — full chapter text is loaded, so every question cites its page.`, `NCERT ${pickedChapter.book} — पूरा अध्याय उपलब्ध है, हर प्रश्न के साथ पृष्ठ संख्या होगी।`)
                    : tx(ui, "Generated from the NCERT chapter title. For page-cited questions, add the chapter under “Upload material”.", "NCERT अध्याय के नाम से बनेगा। पृष्ठ संख्या वाले प्रश्नों के लिए अध्याय “सामग्री + रिकॉर्डिंग” में जोड़ें।")}
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                <p>
                  {tx(
                    ui,
                    `Class ${grade} ${subject} isn't in the NCERT library yet. Type the topic, or upload the chapter from your textbook — photos, PDF or notes all work.`,
                    `कक्षा ${grade} ${subject} अभी NCERT सूची में नहीं है। विषय लिखें, या किताब का अध्याय अपलोड करें — फ़ोटो, PDF या नोट्स, सब चलेगा।`,
                  )}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={() => setActiveTab("topic")}>{tx(ui, "Type topic", "विषय लिखें")}</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setActiveTab("upload")}>{tx(ui, "Upload material", "सामग्री अपलोड करें")}</Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="topic" className="space-y-1.5 pt-4">
            <Label>{tx(ui, "Topic / learning objective", "विषय / सीखने का उद्देश्य")}</Label>
            <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={tx(ui, "e.g. Photosynthesis in green plants", "जैसे: हरे पौधों में प्रकाश संश्लेषण")} maxLength={2000} />
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 pt-4">
            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-medium"><FileText className="size-4 text-rose-600" /> {tx(ui, "Teaching material", "पढ़ाने की सामग्री")}</p>
                <span className="text-xs text-muted-foreground">{tx(ui, "Required", "ज़रूरी")}</span>
              </div>
              <div className="space-y-1.5">
                <Label>{tx(ui, "Choose from Resources", "संसाधनों से चुनें")}</Label>
                <Select
                  items={[{ value: "none", label: documents.length ? tx(ui, "— None —", "— कोई नहीं —") : tx(ui, "Your Resources are empty", "संसाधन खाली हैं") }, ...documents.map((d) => ({ value: d.id, label: d.title }))]}
                  value={materialId ?? "none"}
                  onValueChange={(v) => setMaterialId(v && v !== "none" ? v : undefined)}
                >
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{documents.length ? tx(ui, "— None —", "— कोई नहीं —") : tx(ui, "Your Resources are empty", "संसाधन खाली हैं")}</SelectItem>
                    {documents.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-center text-xs text-muted-foreground">{tx(ui, "or upload new", "या नई फ़ाइल अपलोड करें")}</p>
              <SourceDropzone
                disabled={reading}
                accept={DOC_ACCEPT}
                hint={tx(ui, "PDF, Word (.docx), .txt, or several photos of textbook pages", "PDF, Word (.docx), .txt, या किताब के पन्नों की कई फ़ोटो")}
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
                  <Loader2 className="size-4 animate-spin" /> {tx(ui, "Reading your files…", "फ़ाइलें पढ़ी जा रही हैं…")}
                </p>
              )}
              {sourcePages && !reading && (
                <p className="text-sm font-medium text-primary">
                  {tx(ui, `Read ${sourcePages.length} page${sourcePages.length === 1 ? "" : "s"} from ${files.length} file${files.length === 1 ? "" : "s"}`, `${files.length} फ़ाइल से ${sourcePages.length} पन्ने पढ़े गए`)}
                </p>
              )}
              {files.length > 0 && (
                <div className="space-y-1.5">
                  <Label>{tx(ui, "Name this material", "इस सामग्री का नाम")}</Label>
                  <Input className="h-11" value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder={tx(ui, "e.g. Chapter 5 notes", "जैसे: अध्याय 5 के नोट्स")} maxLength={200} />
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 font-medium"><AudioLines className="size-4 text-violet-600" /> {tx(ui, "Class recording", "कक्षा की रिकॉर्डिंग")}</p>
                <span className="text-xs text-muted-foreground">{tx(ui, "Optional", "वैकल्पिक")}</span>
              </div>
              <p className="text-xs text-muted-foreground">{tx(ui, "Add what you said in class so the plan builds on it — e.g. the doubts students raised.", "कक्षा में जो पढ़ाया, वह जोड़ें ताकि योजना उसी पर आगे बढ़े — जैसे बच्चों के सवाल।")}</p>
              <div className="space-y-1.5">
                <Label>{tx(ui, "Choose from Recordings", "रिकॉर्डिंग से चुनें")}</Label>
                <Select
                  items={[{ value: "none", label: recordings.length ? tx(ui, "— None —", "— कोई नहीं —") : tx(ui, "No recordings yet", "अभी कोई रिकॉर्डिंग नहीं") }, ...recordings.map((r) => ({ value: r.id, label: r.title }))]}
                  value={recordingId ?? "none"}
                  onValueChange={(v) => {
                    setRecordingId(v && v !== "none" ? v : undefined);
                    if (v && v !== "none") void readAudio(null);
                  }}
                >
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{recordings.length ? tx(ui, "— None —", "— कोई नहीं —") : tx(ui, "No recordings yet", "अभी कोई रिकॉर्डिंग नहीं")}</SelectItem>
                    {recordings.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-center text-xs text-muted-foreground">{tx(ui, "or upload audio", "या ऑडियो अपलोड करें")}</p>
              {audioFile ? (
                <div className="flex items-center justify-between gap-3 rounded-xl bg-muted px-3 py-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    {readingAudio ? <Loader2 className="size-4 animate-spin" /> : <AudioLines className="size-4 text-violet-600" />}
                    {audioFile.name}
                    {readingAudio ? tx(ui, " — transcribing…", " — ट्रांसक्रिप्ट बन रहा है…") : audioPages ? tx(ui, " — transcribed", " — ट्रांसक्रिप्ट तैयार") : ""}
                  </span>
                  <button type="button" disabled={readingAudio} onClick={() => readAudio(null)} className="text-muted-foreground hover:text-destructive" aria-label="Remove audio">
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <SourceDropzone
                  accept={AUDIO_ACCEPT}
                  hint={tx(ui, "mp3, m4a, wav or webm — transcribed in Hindi or English", "mp3, m4a, wav या webm — हिंदी या अंग्रेज़ी में ट्रांसक्रिप्ट")}
                  onFiles={(added) => void readAudio(added[0] ?? null)}
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      </FadeIn>

      <FadeIn index={2} className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/[0.04] md:p-6">
        <StepHeading step={2} title={tx(ui, "Class context", "कक्षा की जानकारी")} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{tx(ui, "Date to teach", "पढ़ाने की तारीख़")}</Label>
            <Input className="h-11" type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{tx(ui, "Period length (minutes)", "पीरियड की अवधि (मिनट)")}</Label>
            <Input className="h-11" type="number" min={20} max={90} value={periodMinutes} onChange={(e) => setPeriodMinutes(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>{tx(ui, "Class size", "बच्चों की संख्या")}</Label>
            <Input className="h-11" type="number" min={1} max={120} value={classSize} onChange={(e) => setClassSize(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label>{tx(ui, "Content language", "सामग्री की भाषा")}</Label>
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
              {tx(ui, "Low-resource classroom", "कम संसाधन वाली कक्षा")}
              <span className="block font-normal text-muted-foreground">{tx(ui, "Blackboard + local objects only, no projector", "सिर्फ़ ब्लैकबोर्ड और आसपास की चीज़ें, प्रोजेक्टर नहीं")}</span>
            </Label>
            <Switch id="low-resource" checked={lowResource} onCheckedChange={setLowResource} />
          </div>
        </div>
      </FadeIn>

      <FadeIn index={3} className="space-y-4 rounded-3xl bg-card p-5 ring-1 ring-foreground/[0.04] md:p-6">
        <StepHeading step={3} title={tx(ui, "Anything to add?", "कुछ और जोड़ना है?")} />
        <p className="text-sm text-muted-foreground">
          {tx(
            ui,
            "We'll write the objectives and lesson plan first. Once you've reviewed them, add a worksheet, exit quiz or parent note from the kit page — only the ones you want.",
            "पहले उद्देश्य और पाठ योजना बनेगी। उन्हें देखने के बाद किट पेज से कार्यपत्रक, निकास क्विज़ या अभिभावक संदेश जोड़ें — सिर्फ़ जो आप चाहें।",
          )}
        </p>
        <div className="space-y-1.5">
          <Label>{tx(ui, "Note to the AI (optional)", "AI के लिए निर्देश (वैकल्पिक)")}</Label>
          <Textarea value={teacherNote} onChange={(e) => setTeacherNote(e.target.value)} maxLength={500} placeholder={tx(ui, "Anything specific you want covered", "कोई ख़ास बात जो शामिल करनी हो")} />
        </div>
      </FadeIn>

      <FadeIn index={4}>
        <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? tx(ui, "Creating…", "बन रही है…") : tx(ui, "Create lesson plan", "पाठ योजना बनाएँ")}
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
