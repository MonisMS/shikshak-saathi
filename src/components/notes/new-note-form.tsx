"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Square, Upload, FileText, Loader2, RotateCcw, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/components/layout/language-provider";
import { cn } from "@/lib/utils";
import { AudioPrepError, MAX_AUDIO_SECONDS, formatTimestamp, prepareAudioChunks, probeDuration, type AudioChunk } from "@/lib/audio-chunks";
import type { NoteLanguage } from "@/lib/ai/prompts/notes";

type Mode = "record" | "upload" | "text";
type Stage =
  | { kind: "idle" }
  | { kind: "preparing" }
  | { kind: "transcribing"; done: number; total: number }
  | { kind: "partial"; failed: number; total: number }
  | { kind: "summarizing" };

const MAX_FILE_BYTES = 200 * 1024 * 1024;
const CONCURRENCY = 3;
const RETRIES = 2;

const L = {
  title: { en: "Title (optional)", hi: "शीर्षक (वैकल्पिक)" },
  titlePh: { en: "Leave empty and AI will name it", hi: "खाली छोड़ें, AI नाम देगा" },
  lang: { en: "Summary language", hi: "सारांश की भाषा" },
  auto: { en: "Same as audio", hi: "ऑडियो जैसी" },
  record: { en: "Record", hi: "रिकॉर्ड" },
  upload: { en: "Upload audio", hi: "ऑडियो अपलोड" },
  paste: { en: "Paste transcript", hi: "ट्रांसक्रिप्ट पेस्ट" },
  startRec: { en: "Start recording", hi: "रिकॉर्डिंग शुरू करें" },
  stopRec: { en: "Stop", hi: "रोकें" },
  recording: { en: "Recording…", hi: "रिकॉर्ड हो रहा है…" },
  discard: { en: "Discard", hi: "हटाएँ" },
  chooseFile: { en: "Choose an audio file", hi: "ऑडियो फ़ाइल चुनें" },
  fileHint: { en: "MP3, M4A, WAV, WebM, OGG — up to 60 minutes", hi: "MP3, M4A, WAV, WebM, OGG — 60 मिनट तक" },
  pastePh: { en: "Paste the transcript of your class or meeting here…", hi: "अपनी कक्षा या बैठक का ट्रांसक्रिप्ट यहाँ पेस्ट करें…" },
  create: { en: "Create notes", hi: "नोट्स बनाएँ" },
  preparing: { en: "Preparing audio…", hi: "ऑडियो तैयार हो रहा है…" },
  transcribing: { en: "Transcribing", hi: "ट्रांसक्राइब हो रहा है" },
  summarizing: { en: "Writing summary…", hi: "सारांश लिखा जा रहा है…" },
  retryFailed: { en: "Retry failed parts", hi: "असफल हिस्से फिर से" },
  continueAnyway: { en: "Continue without them", hi: "इनके बिना आगे बढ़ें" },
  startOver: { en: "Start over", hi: "फिर से शुरू करें" },
} as const;

function pickRecorderMime(): string | undefined {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return candidates.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m));
}

async function transcribeChunk(chunk: AudioChunk): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    try {
      const form = new FormData();
      form.append("file", chunk.wav, `chunk-${chunk.index}.wav`);
      const res = await fetch("/api/notes/transcribe-chunk", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (res.status === 401) throw Object.assign(new Error("Your session expired — please log in again"), { fatal: true });
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      return data.text ?? "";
    } catch (e) {
      lastError = e;
      if ((e as { fatal?: boolean }).fatal) throw e;
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw lastError;
}

export function NewNoteForm() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [mode, setMode] = useState<Mode>("record");
  const [title, setTitle] = useState("");
  const [summaryLanguage, setSummaryLanguage] = useState<NoteLanguage>("auto");
  const [stage, setStage] = useState<Stage>({ kind: "idle" });

  // Audio input (recorded or uploaded) — one at a time.
  const [audio, setAudio] = useState<{ blob: Blob; name: string; url: string; source: "record" | "upload" } | null>(null);
  const [pasted, setPasted] = useState("");

  // Recording state
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Transcription state kept across a "retry failed parts" round.
  const chunksRef = useRef<AudioChunk[]>([]);
  const textsRef = useRef<(string | null)[]>([]);
  const durationRef = useRef(0);

  const busy = stage.kind !== "idle" && stage.kind !== "partial";
  const locked = stage.kind !== "idle"; // inputs stay frozen while a "retry failed parts" choice is pending

  useEffect(() => {
    if (!busy && !recording) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy, recording]);

  // Release the mic and object URL if the teacher navigates away mid-recording.
  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        rec.onstop = null;
        rec.stop();
        rec.stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    const url = audio?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [audio?.url]);

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("This browser can't record audio — upload a file instead");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      toast.error("Couldn't access the microphone — check the browser permission");
      return;
    }
    const mimeType = pickRecorderMime();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const parts: BlobPart[] = [];
    const startedAt = Date.now();
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) parts.push(e.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (tickRef.current) clearInterval(tickRef.current);
      setRecording(false);
      const blob = new Blob(parts, { type: recorder.mimeType || mimeType || "audio/webm" });
      if (blob.size === 0) {
        toast.error("Nothing was recorded — try again");
        return;
      }
      setAudio({ blob, name: `Recording ${formatTimestamp((Date.now() - startedAt) / 1000)}`, url: URL.createObjectURL(blob), source: "record" });
    };
    recorder.start(1000); // 1s timeslices so a long recording isn't one giant buffer at stop
    recorderRef.current = recorder;
    setAudio(null);
    setElapsed(0);
    setRecording(true);
    tickRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(secs);
      if (secs >= MAX_AUDIO_SECONDS && recorder.state === "recording") {
        recorder.stop();
        toast.info("Reached the 60-minute limit — recording stopped");
      }
    }, 500);
  }

  function stopRecording() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      toast.error("File is larger than 200 MB");
      return;
    }
    const duration = await probeDuration(file);
    if (duration !== null && duration > MAX_AUDIO_SECONDS + 1) {
      toast.error("Audio is longer than 60 minutes — please trim it");
      return;
    }
    setAudio({ blob: file, name: file.name, url: URL.createObjectURL(file), source: "upload" });
  }

  async function createNote(transcript: string, source: Mode, audioSeconds?: number) {
    setStage({ kind: "summarizing" });
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() || undefined, transcript, source, audioSeconds, summaryLanguage }),
    });
    const data = (await res.json().catch(() => ({}))) as { note?: { id: string; summaryError: string | null }; error?: string };
    if (!res.ok || !data.note) throw new Error(data.error ?? `Could not save the note (${res.status})`);
    if (data.note.summaryError) toast.warning("Transcript saved, but the summary failed — you can retry from the note");
    router.push(`/notes/${data.note.id}`);
  }

  /** Transcribes every chunk that doesn't have text yet; returns how many still failed. */
  async function runTranscription(): Promise<number> {
    const chunks = chunksRef.current;
    const pending = chunks.filter((c) => textsRef.current[c.index] === null);
    let done = chunks.length - pending.length;
    let failed = 0;
    setStage({ kind: "transcribing", done, total: chunks.length });

    let cursor = 0;
    const worker = async () => {
      while (cursor < pending.length) {
        const chunk = pending[cursor++];
        try {
          textsRef.current[chunk.index] = chunk.silent ? "" : await transcribeChunk(chunk);
        } catch (e) {
          if ((e as { fatal?: boolean }).fatal) throw e;
          failed++;
        }
        done++;
        setStage({ kind: "transcribing", done, total: chunks.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pending.length) }, worker));
    return failed;
  }

  function assembleTranscript(): string {
    return chunksRef.current
      .map((c) => {
        const text = textsRef.current[c.index]?.trim();
        return text ? `[${formatTimestamp(c.startSeconds)}] ${text}` : null;
      })
      .filter(Boolean)
      .join("\n\n");
  }

  async function finishAudio() {
    const transcript = assembleTranscript();
    if (!transcript) throw new Error("No speech was detected in this audio");
    await createNote(transcript, audio!.source, Math.round(durationRef.current));
  }

  async function handleSubmit() {
    try {
      if (mode === "text") {
        if (!pasted.trim()) {
          toast.error("Paste a transcript first");
          return;
        }
        await createNote(pasted.trim(), "text");
        return;
      }

      if (!audio) {
        toast.error(mode === "record" ? "Record something first" : "Choose an audio file first");
        return;
      }
      setStage({ kind: "preparing" });
      const { chunks, durationSeconds } = await prepareAudioChunks(audio.blob);
      chunksRef.current = chunks;
      textsRef.current = chunks.map(() => null);
      durationRef.current = durationSeconds;

      const failed = await runTranscription();
      if (failed > 0) {
        setStage({ kind: "partial", failed, total: chunks.length });
        return;
      }
      await finishAudio();
    } catch (e) {
      toast.error(e instanceof AudioPrepError || e instanceof Error ? e.message : "Something went wrong");
      setStage({ kind: "idle" });
    }
  }

  async function retryFailed() {
    try {
      const failed = await runTranscription();
      if (failed > 0) {
        setStage({ kind: "partial", failed, total: chunksRef.current.length });
        return;
      }
      await finishAudio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setStage({ kind: "idle" });
    }
  }

  async function continueWithout() {
    try {
      await finishAudio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
      setStage({ kind: "idle" });
    }
  }

  const canSubmit = !busy && !recording && (mode === "text" ? pasted.trim().length > 0 : audio !== null);
  const pastedWords = pasted.split(/\s+/).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="note-title">{L.title[lang]}</Label>
          <Input id="note-title" value={title} maxLength={200} disabled={locked} placeholder={L.titlePh[lang]} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{L.lang[lang]}</Label>
          <div className="flex rounded-lg border border-input p-0.5" role="radiogroup" aria-label={L.lang[lang]}>
            {(
              [
                ["auto", L.auto[lang]],
                ["hi", "हिंदी"],
                ["en", "English"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={summaryLanguage === value}
                disabled={locked}
                onClick={() => setSummaryLanguage(value)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm transition-colors",
                  summaryLanguage === value ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Tabs value={mode} onValueChange={(v) => !locked && !recording && setMode(v as Mode)}>
        <TabsList className="w-full sm:w-fit">
          <TabsTrigger value="record" disabled={locked || recording}>
            <Mic /> {L.record[lang]}
          </TabsTrigger>
          <TabsTrigger value="upload" disabled={locked || recording}>
            <Upload /> {L.upload[lang]}
          </TabsTrigger>
          <TabsTrigger value="text" disabled={locked || recording}>
            <FileText /> {L.paste[lang]}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="record">
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-8">
              {recording ? (
                <>
                  <div className="flex items-center gap-2 text-destructive">
                    <span className="size-2.5 animate-pulse rounded-full bg-destructive" />
                    {L.recording[lang]}
                  </div>
                  <div className="font-mono text-3xl tabular-nums">{formatTimestamp(elapsed)}</div>
                  <Button variant="destructive" size="lg" onClick={stopRecording}>
                    <Square /> {L.stopRec[lang]}
                  </Button>
                </>
              ) : audio?.source === "record" ? (
                <AudioPreview audio={audio} disabled={locked} onDiscard={() => setAudio(null)} discardLabel={L.discard[lang]} />
              ) : (
                <>
                  <Button size="lg" className="h-14 rounded-full px-6" disabled={locked} onClick={() => void startRecording()}>
                    <Mic className="size-5" /> {L.startRec[lang]}
                  </Button>
                  <p className="text-xs text-muted-foreground">{lang === "hi" ? "60 मिनट तक" : "Up to 60 minutes"}</p>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="upload">
          <Card>
            <CardContent className="py-6">
              {audio?.source === "upload" ? (
                <AudioPreview audio={audio} disabled={locked} onDiscard={() => setAudio(null)} discardLabel={L.discard[lang]} />
              ) : (
                <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-input px-4 py-10 text-center hover:bg-muted/50">
                  <Upload className="size-6 text-muted-foreground" />
                  <span className="font-medium">{L.chooseFile[lang]}</span>
                  <span className="text-xs text-muted-foreground">{L.fileHint[lang]}</span>
                  <input
                    type="file"
                    accept="audio/*,video/mp4,video/webm,.mp3,.m4a,.wav,.webm,.ogg,.opus,.aac"
                    className="sr-only"
                    disabled={locked}
                    onChange={(e) => {
                      void handleFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="text">
          <Textarea
            value={pasted}
            disabled={locked}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={L.pastePh[lang]}
            className="min-h-64"
            maxLength={200_000}
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">{pastedWords} words</p>
        </TabsContent>
      </Tabs>

      {stage.kind === "idle" && (
        <Button size="lg" disabled={!canSubmit} onClick={() => void handleSubmit()}>
          {L.create[lang]}
        </Button>
      )}

      {(stage.kind === "preparing" || stage.kind === "transcribing" || stage.kind === "summarizing") && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {stage.kind === "preparing" && L.preparing[lang]}
              {stage.kind === "transcribing" && `${L.transcribing[lang]} — ${stage.done} / ${stage.total}`}
              {stage.kind === "summarizing" && L.summarizing[lang]}
            </div>
            <Progress value={stage.kind === "transcribing" ? Math.round((stage.done / stage.total) * 100) : stage.kind === "summarizing" ? 100 : null} />
          </CardContent>
        </Card>
      )}

      {stage.kind === "partial" && (
        <Card className="border-amber-500/50">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <span>
                {lang === "hi"
                  ? `${stage.total} में से ${stage.failed} हिस्से ट्रांसक्राइब नहीं हो पाए।`
                  : `${stage.failed} of ${stage.total} parts couldn't be transcribed.`}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void retryFailed()}>
                <RotateCcw /> {L.retryFailed[lang]}
              </Button>
              {stage.failed < stage.total && (
                <Button variant="outline" onClick={() => void continueWithout()}>
                  {L.continueAnyway[lang]}
                </Button>
              )}
              <Button variant="ghost" onClick={() => setStage({ kind: "idle" })}>
                {L.startOver[lang]}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AudioPreview({
  audio,
  disabled,
  onDiscard,
  discardLabel,
}: {
  audio: { name: string; url: string; blob: Blob };
  disabled: boolean;
  onDiscard: () => void;
  discardLabel: string;
}) {
  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="truncate font-medium">{audio.name}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{(audio.blob.size / (1024 * 1024)).toFixed(1)} MB</span>
      </div>
      <audio controls src={audio.url} className="w-full" />
      <Button variant="ghost" size="sm" className="self-start" disabled={disabled} onClick={onDiscard}>
        <Trash2 /> {discardLabel}
      </Button>
    </div>
  );
}
