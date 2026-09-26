"use client";

import { useRef, useState } from "react";
import { Mic, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface VoiceIntentResult {
  grade?: number;
  subject?: string;
  chapterNo?: number;
  topic?: string;
  language?: "hi" | "en";
  teacherNote?: string;
}

/** Minimal Web Speech API shape — not in this project's TS lib target (§12.4 fallback). */
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    SpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

type MicState = "idle" | "recording" | "processing";

const MAX_RECORDING_MS = 25_000;

async function transcribeViaSarvam(blob: Blob): Promise<string> {
  const form = new FormData();
  form.append("file", blob, "speech.webm");
  const res = await fetch("/api/voice/transcribe", { method: "POST", body: form });
  if (!res.ok) throw new Error(`transcribe failed (${res.status})`);
  const data = (await res.json()) as { transcript?: string };
  if (!data.transcript) throw new Error("empty transcript");
  return data.transcript;
}

function transcribeViaWebSpeech(): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      reject(new Error("Web Speech API not available in this browser"));
      return;
    }
    const recognition = new Ctor();
    recognition.lang = "hi-IN";
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) resolve(transcript);
      else reject(new Error("no speech recognised"));
    };
    recognition.onerror = () => reject(new Error("speech recognition error"));
    recognition.onend = () => {
      /* resolved/rejected already via onresult/onerror */
    };
    recognition.start();
  });
}

/**
 * F31/F32 mic button (§12.4): MediaRecorder → Sarvam speech-to-text (Ujjwal's
 * /api/voice/transcribe) → this session's /api/voice/parse (VoiceIntent). On any
 * failure of the Sarvam path (including "not built yet" — a 404), falls back
 * automatically to the browser's own Web Speech API and shows a small badge.
 */
export function MicButton({ onIntent }: { onIntent: (intent: VoiceIntentResult) => void }) {
  const [state, setState] = useState<MicState>("idle");
  const [usedFallback, setUsedFallback] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function parseAndApply(transcript: string) {
    const res = await fetch("/api/voice/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript }),
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error((data as { error?: string })?.error ?? `parse failed (${res.status})`);
    onIntent(data as VoiceIntentResult);
  }

  async function handleSarvamAudio(blob: Blob) {
    try {
      const transcript = await transcribeViaSarvam(blob);
      await parseAndApply(transcript);
    } catch {
      setUsedFallback(true);
      try {
        const transcript = await transcribeViaWebSpeech();
        await parseAndApply(transcript);
      } catch (e2) {
        toast.error(e2 instanceof Error ? e2.message : "Could not understand that — try again");
      }
    } finally {
      setState("idle");
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("processing");
        void handleSarvamAudio(new Blob(chunks, { type: "audio/webm" }));
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setState("recording");
      setUsedFallback(false);
      timeoutRef.current = setTimeout(() => stopRecording(), MAX_RECORDING_MS);
    } catch {
      toast.error("Couldn't access the microphone");
    }
  }

  function stopRecording() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    mediaRecorderRef.current?.stop();
  }

  function handleClick() {
    if (state === "idle") void startRecording();
    else if (state === "recording") stopRecording();
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={state === "recording" ? "destructive" : "outline"}
        size="icon"
        onClick={handleClick}
        disabled={state === "processing"}
        aria-label={state === "recording" ? "Stop recording" : "Speak"}
      >
        {state === "processing" ? <Loader2 className="size-4 animate-spin" /> : <Mic className={cn("size-4", state === "recording" && "animate-pulse")} />}
      </Button>
      {state === "recording" && <span className="text-xs text-muted-foreground">सुन रहे हैं…</span>}
      {state === "processing" && <span className="text-xs text-muted-foreground">समझ रहे हैं…</span>}
      {usedFallback && state !== "idle" && (
        <Badge variant="outline" className="text-xs">
          browser voice
        </Badge>
      )}
    </div>
  );
}
