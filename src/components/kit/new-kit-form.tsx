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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MicButton, type VoiceIntentResult } from "@/components/voice/mic-button";
import { FadeIn } from "@/components/motion/fade-in";

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
}: {
  chapters: ChapterOption[];
  classrooms: ClassroomOption[];
  /** Prefills the form from a voice intent handed off by the dashboard's mic (§6). */
  initialIntent?: VoiceIntentResult;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Pick-chapter tab state
  const grades = useMemo(() => Array.from(new Set(chapters.map((c) => c.grade))).sort((a, b) => a - b), [chapters]);
  const [grade, setGrade] = useState<number | undefined>(grades[0]);
  const subjects = useMemo(() => Array.from(new Set(chapters.filter((c) => c.grade === grade).map((c) => c.subject))), [chapters, grade]);
  const [subject, setSubject] = useState<string | undefined>(subjects[0]);
  const chaptersForSubject = useMemo(
    () => chapters.filter((c) => c.grade === grade && c.subject === subject),
    [chapters, grade, subject],
  );
  const [chapterId, setChapterId] = useState<string | undefined>(chaptersForSubject[0]?.id);

  // Type-topic tab state
  const [topic, setTopic] = useState("");
  const [topicGrade, setTopicGrade] = useState(7);
  const [topicSubject, setTopicSubject] = useState("");

  // Shared options
  const [classroomId, setClassroomId] = useState<string | undefined>(classrooms[0]?.id);
  const classroom = classrooms.find((c) => c.id === classroomId);
  const [language, setLanguage] = useState<"hi" | "en">("hi");
  const [periodMinutes, setPeriodMinutes] = useState(40);
  const [classSize, setClassSize] = useState(classroom?.studentCount ?? 40);
  const [lowResource, setLowResource] = useState(classroom?.lowResource ?? true);
  const [scheduledFor, setScheduledFor] = useState("");
  const [includeParentNote, setIncludeParentNote] = useState(true); // F49 is on
  const [teacherNote, setTeacherNote] = useState("");
  const [activeTab, setActiveTab] = useState<"chapter" | "topic">("chapter");

  // F31: "Speaking Hindi fills the form" — try to match a seeded chapter first,
  // fall back to the typed-topic tab when there's no exact grade+subject+chapterNo match.
  function handleVoiceIntent(intent: VoiceIntentResult) {
    if (intent.language) setLanguage(intent.language);

    if (intent.grade && intent.subject) {
      const matchedGrade = grades.find((g) => g === intent.grade);
      const subjectsForGrade = matchedGrade
        ? Array.from(new Set(chapters.filter((c) => c.grade === matchedGrade).map((c) => c.subject)))
        : [];
      const matchedSubject = subjectsForGrade.find((s) => s.toLowerCase() === intent.subject?.toLowerCase());
      const matchedChapter =
        matchedGrade && matchedSubject && intent.chapterNo
          ? chapters.find((c) => c.grade === matchedGrade && c.subject === matchedSubject && c.chapterNo === intent.chapterNo)
          : undefined;

      if (matchedChapter) {
        setGrade(matchedGrade);
        setSubject(matchedSubject);
        setChapterId(matchedChapter.id);
        setActiveTab("chapter");
        toast.success("Filled from voice");
        return;
      }
    }

    if (intent.grade) setTopicGrade(intent.grade);
    if (intent.subject) setTopicSubject(intent.subject);
    if (intent.topic) setTopic(intent.topic);
    if (intent.teacherNote) setTeacherNote(intent.teacherNote);
    setActiveTab("topic");
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
    setSubmitting(true);

    // OBJECTIVES/LESSON_PLAN are added server-side automatically (Ujjwal's POST /api/kits
    // treats them as always-on) — only send the optional ones here.
    const sections = ["WORKSHEET", "EXIT_QUIZ", ...(includeParentNote ? ["PARENT_NOTE"] : [])];

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
      ...(chapterId ? { chapterId } : { topic, grade: topicGrade, subject: topicSubject }),
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
        <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v as "chapter" | "topic")}>
          <TabsList>
            <TabsTrigger value="chapter">Pick chapter</TabsTrigger>
            <TabsTrigger value="topic">Type topic</TabsTrigger>
          </TabsList>

          <TabsContent value="chapter" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select items={grades.map((g) => ({ value: String(g), label: `Class ${g}` }))} value={grade ? String(grade) : undefined} onValueChange={(v) => { setGrade(v ? Number(v) : undefined); setSubject(undefined); setChapterId(undefined); }}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Class" /></SelectTrigger>
                  <SelectContent>
                    {grades.map((g) => (
                      <SelectItem key={g} value={String(g)}>Class {g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Select value={subject} onValueChange={(v) => { setSubject(v ?? undefined); setChapterId(undefined); }}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Chapter</Label>
                <Select items={chaptersForSubject.map((c) => ({ value: c.id, label: `Ch ${c.chapterNo}: ${language === "hi" && c.titleHi ? c.titleHi : c.titleEn}` }))} value={chapterId} onValueChange={(v) => setChapterId(v ?? undefined)}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Chapter" /></SelectTrigger>
                  <SelectContent>
                    {chaptersForSubject.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        Ch {c.chapterNo}: {language === "hi" && c.titleHi ? c.titleHi : c.titleEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="topic" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Input className="h-11" type="number" min={1} max={12} value={topicGrade} onChange={(e) => setTopicGrade(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Subject</Label>
                <Input className="h-11" value={topicSubject} onChange={(e) => setTopicSubject(e.target.value)} placeholder="Science" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Topic / learning objective</Label>
              <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Photosynthesis in green plants" maxLength={2000} />
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
        <StepHeading step={3} title="What should we generate?" />
        <div className="flex items-center gap-2">
          <Checkbox id="parent-note" checked={includeParentNote} onCheckedChange={(v) => setIncludeParentNote(v === true)} />
          <Label htmlFor="parent-note">Include a parent note</Label>
        </div>
        <div className="space-y-1.5">
          <Label>Note to the AI (optional)</Label>
          <Textarea value={teacherNote} onChange={(e) => setTeacherNote(e.target.value)} maxLength={500} placeholder="Anything specific you want covered" />
        </div>
      </FadeIn>

      <FadeIn index={4}>
        <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? "Creating…" : "Generate kit"}
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
