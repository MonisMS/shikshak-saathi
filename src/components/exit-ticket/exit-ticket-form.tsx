"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TapScale } from "@/components/motion/tap-scale";
import { cn } from "@/lib/utils";

type Confidence = "low" | "mid" | "high";

const FACES: { value: Confidence; emoji: string; label: string }[] = [
  { value: "low", emoji: "😕", label: "Not really" },
  { value: "mid", emoji: "🙂", label: "Kind of" },
  { value: "high", emoji: "😄", label: "Yes!" },
];

/** F-exit-ticket: one screen, two quick inputs, no name/roll number — students open this
 * from a QR code after class. Submits to the public /api/exit-ticket/[kitId] route. */
export function ExitTicketForm({ kitId }: { kitId: string }) {
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    if (!confidence) return;
    setSubmitting(true);
    try {
      await fetch(`/api/exit-ticket/${kitId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confidence, note: note.trim() || undefined }),
      });
    } finally {
      setDone(true);
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-6 py-10 text-center dark:border-emerald-900 dark:bg-emerald-950/40"
      >
        <CheckCircle2 className="size-10 text-emerald-600 dark:text-emerald-400" />
        <p className="text-base font-medium text-emerald-900 dark:text-emerald-200">Thanks — sent to your teacher!</p>
        <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">You can close this page now.</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-medium">How well did you understand today&apos;s class?</p>
        <div className="grid grid-cols-3 gap-2">
          {FACES.map((f) => (
            <TapScale
              key={f.value}
              onClick={() => setConfidence(f.value)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 py-4 transition-colors",
                confidence === f.value ? "border-primary bg-primary/10" : "border-border/70 bg-card",
              )}
            >
              <span className="text-3xl">{f.emoji}</span>
              <span className="text-xs text-muted-foreground">{f.label}</span>
            </TapScale>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="note" className="text-sm font-medium">
          Anything you&apos;re still confused about? <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} rows={3} placeholder="Type here…" />
      </div>

      <AnimatePresence>
        {confidence && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Button size="lg" className="w-full" onClick={submit} disabled={submitting}>
              {submitting ? "Sending…" : "Submit"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
