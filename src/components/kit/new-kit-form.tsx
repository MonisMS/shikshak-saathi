"use client";

import { useMemo, useState } from "react";
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

export function NewKitForm({ chapters, classrooms }: { chapters: ChapterOption[]; classrooms: ClassroomOption[] }) {
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
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">New lesson kit</h1>

      <Tabs defaultValue="chapter">
        <TabsList>
          <TabsTrigger value="chapter">Pick chapter</TabsTrigger>
          <TabsTrigger value="topic">Type topic</TabsTrigger>
        </TabsList>

        <TabsContent value="chapter" className="space-y-4 pt-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Class</Label>
              <Select value={grade ? String(grade) : undefined} onValueChange={(v) => { setGrade(v ? Number(v) : undefined); setSubject(undefined); setChapterId(undefined); }}>
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g} value={String(g)}>Class {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={(v) => { setSubject(v ?? undefined); setChapterId(undefined); }}>
                <SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Chapter</Label>
              <Select value={chapterId} onValueChange={(v) => setChapterId(v ?? undefined)}>
                <SelectTrigger><SelectValue placeholder="Chapter" /></SelectTrigger>
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
            <div className="space-y-1">
              <Label>Class</Label>
              <Input type="number" min={1} max={12} value={topicGrade} onChange={(e) => setTopicGrade(Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label>Subject</Label>
              <Input value={topicSubject} onChange={(e) => setTopicSubject(e.target.value)} placeholder="Science" />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Topic / learning objective</Label>
            <Textarea value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Photosynthesis in green plants" maxLength={2000} />
          </div>
        </TabsContent>
      </Tabs>

      <div className="space-y-4 rounded-md border p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Classroom</Label>
            <Select value={classroomId} onValueChange={(v) => setClassroomId(v ?? undefined)}>
              <SelectTrigger><SelectValue placeholder="Classroom" /></SelectTrigger>
              <SelectContent>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Date to teach</Label>
            <Input type="date" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Period length (minutes)</Label>
            <Input type="number" min={20} max={90} value={periodMinutes} onChange={(e) => setPeriodMinutes(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Class size</Label>
            <Input type="number" min={1} max={120} value={classSize} onChange={(e) => setClassSize(Number(e.target.value))} />
          </div>
          <div className="space-y-1">
            <Label>Content language</Label>
            <Select value={language} onValueChange={(v) => setLanguage(v as "hi" | "en")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="low-resource">Low-resource classroom (blackboard + local objects only)</Label>
          <Switch id="low-resource" checked={lowResource} onCheckedChange={setLowResource} />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox id="parent-note" checked={includeParentNote} onCheckedChange={(v) => setIncludeParentNote(v === true)} />
          <Label htmlFor="parent-note">Include a parent note</Label>
        </div>

        <div className="space-y-1">
          <Label>Note to the AI (optional)</Label>
          <Textarea value={teacherNote} onChange={(e) => setTeacherNote(e.target.value)} maxLength={500} placeholder="Anything specific you want covered" />
        </div>
      </div>

      <Button type="submit" disabled={submitting}>
        {submitting ? "Creating…" : "Generate kit"}
      </Button>
    </form>
  );
}
