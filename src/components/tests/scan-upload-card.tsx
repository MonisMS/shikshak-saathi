"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Printer, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

interface QueueItem {
  id: string;
  name: string;
  status: "processing" | "done" | "failed";
  result?: string;
}

/** Print & scan (offline) path: teacher prints the sheet, students fill it on paper,
 * teacher photographs each filled sheet here. One photo → one Gemini-vision OCR call
 * → one TestSubmission, scored through the same auto-grade/AI-evaluate pipeline as an
 * online submission (src/app/api/tests/[id]/scan/route.ts). */
export function ScanUploadCard({ testId, printHref }: { testId: string; printHref: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const items = Array.from(files);

    for (const file of items) {
      const id = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setQueue((prev) => [{ id, name: file.name, status: "processing" }, ...prev]);

      try {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/tests/${testId}/scan`, { method: "POST", body: form });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error((data as { error?: string })?.error ?? "Could not read this photo");
        const d = data as { studentName: string; uncertainCount: number };
        setQueue((prev) =>
          prev.map((q) => (q.id === id ? { ...q, status: "done", result: d.uncertainCount > 0 ? `${d.studentName} (${d.uncertainCount} unclear)` : d.studentName } : q)),
        );
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed";
        setQueue((prev) => prev.map((q) => (q.id === id ? { ...q, status: "failed", result: message } : q)));
      }
    }

    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Print the sheet, hand it out, then photograph each filled-in copy — a name and marked answers are read automatically and added below, right alongside online submissions.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={printHref} target="_blank" className={buttonVariants({ variant: "outline", size: "sm" })}>
          <Printer className="size-3.5" />
          Print answer sheet
        </Link>
        <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
          <Camera className="size-3.5" />
          Upload photos of filled sheets
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {queue.length > 0 && (
        <ul className="space-y-1">
          {queue.map((q) => (
            <li key={q.id} className="flex items-center gap-2 rounded-md bg-secondary/40 px-3 py-1.5 text-sm">
              {q.status === "processing" && <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />}
              {q.status === "done" && <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" />}
              {q.status === "failed" && <XCircle className="size-3.5 shrink-0 text-rose-600" />}
              <span className="min-w-0 truncate text-muted-foreground">{q.name}</span>
              {q.result && (
                <span className="ml-auto flex shrink-0 items-center gap-1 text-xs">
                  {q.status === "done" && q.result.includes("unclear") && <AlertTriangle className="size-3 text-amber-600" />}
                  {q.result}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
