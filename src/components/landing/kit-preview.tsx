"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import { Check } from "lucide-react";

type Status = "queued" | "writing" | "checking" | "ready";

// Timeline (seconds) mirrors the real pipeline order: objectives → plan → worksheet ∥ quiz → parent note.
const ROWS: { label: string; hi: string; meta: string; at: [number, number, number] }[] = [
  { label: "Learning objectives", hi: "सीखने के उद्देश्य", meta: "4 objectives · Bloom-tagged", at: [0.4, 1.7, 2.2] },
  { label: "Lesson plan", hi: "पाठ योजना", meta: "40 min · 5 timed blocks", at: [2.4, 4.1, 4.6] },
  { label: "Worksheet + answer key", hi: "कार्यपत्रक", meta: "7 questions · 20 marks", at: [4.8, 6.2, 6.7] },
  { label: "Exit quiz", hi: "निकास प्रश्नोत्तरी", meta: "3 MCQs · wrong options tagged", at: [4.8, 5.9, 6.4] },
  { label: "Parent note", hi: "अभिभावक संदेश", meta: "Hindi · WhatsApp-length", at: [6.9, 7.7, 8.1] },
];
const LOOP_SECONDS = 12.5;

function statusAt(t: number, [w, c, r]: [number, number, number]): Status {
  if (t < w) return "queued";
  if (t < c) return "writing";
  if (t < r) return "checking";
  return "ready";
}

const PILL: Record<Status, { text: string; cls: string }> = {
  queued: { text: "Queued", cls: "text-(--lp-chalk-4) border-(--lp-line-strong) border-dashed" },
  writing: { text: "Writing", cls: "text-(--lp-saffron) border-(--lp-saffron)/35 bg-(--lp-saffron)/8" },
  checking: { text: "Checking", cls: "text-(--lp-sky) border-(--lp-sky)/35 bg-(--lp-sky)/8" },
  ready: { text: "Ready", cls: "text-(--lp-leaf) border-(--lp-leaf)/35 bg-(--lp-leaf)/8" },
};

export function KitPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "0px 0px -15% 0px" });
  const reduce = useReducedMotion();
  const [t, setT] = useState(0);

  useEffect(() => {
    if (!inView || reduce) return;
    const start = performance.now();
    const id = window.setInterval(() => {
      setT(((performance.now() - start) / 1000) % LOOP_SECONDS);
    }, 100);
    return () => window.clearInterval(id);
  }, [inView, reduce]);

  const now = reduce ? LOOP_SECONDS : t;
  const statuses = ROWS.map((r) => statusAt(now, r.at));
  const readyCount = statuses.filter((s) => s === "ready").length;

  return (
    <div ref={ref} className="overflow-hidden rounded-3xl border border-(--lp-line) bg-(--lp-panel) shadow-[0_30px_60px_-40px_rgb(0_40_20/0.35)]">
      <div className="border-b border-(--lp-line) px-6 py-5">
        <div className="flex items-center gap-2 text-xs text-(--lp-chalk-4)">
          <span className="rounded-full border border-(--lp-line-strong) px-2 py-0.5">Class 7 · Science</span>
          <span>NCERT Curiosity · Ch 2</span>
        </div>
        <p className="mt-3 text-2xl leading-tight text-(--lp-chalk) [font-family:var(--lp-serif)]">
          Exploring Substances: Acidic, Basic, and Neutral
        </p>
        <p className="mt-1 text-[15px] text-(--lp-chalk-3) [font-family:var(--lp-hindi)]" lang="hi">
          पदार्थों का अन्वेषण: अम्लीय, क्षारीय एवं उदासीन
        </p>
      </div>

      <ul>
        {ROWS.map((row, i) => {
          const s = statuses[i];
          return (
            <li key={row.label} className="flex items-center gap-4 border-b border-(--lp-line) px-6 py-4 last:border-b-0">
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] transition-colors duration-500 ${s === "queued" ? "text-(--lp-chalk-4)" : "text-(--lp-chalk)"}`}>
                  {row.label} <span className="ml-1 text-(--lp-chalk-4) [font-family:var(--lp-hindi)]" lang="hi">{row.hi}</span>
                </p>
                <motion.p
                  className="mt-0.5 font-mono text-xs text-(--lp-chalk-3)"
                  animate={{ opacity: s === "ready" ? 1 : 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {row.meta}
                </motion.p>
              </div>
              <span className={`relative inline-flex h-7 w-[6.5rem] shrink-0 items-center justify-center gap-1.5 overflow-hidden rounded-full border text-xs font-medium transition-colors duration-300 ${PILL[s].cls}`}>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={s}
                    className="inline-flex items-center gap-1.5"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                  >
                    {s === "ready" ? (
                      <Check className="size-3.5" aria-hidden />
                    ) : s !== "queued" ? (
                      <span className="size-1.5 animate-pulse rounded-full bg-current" aria-hidden />
                    ) : null}
                    {PILL[s].text}
                  </motion.span>
                </AnimatePresence>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="h-0.5 bg-(--lp-line)">
        <motion.div
          className="h-full origin-left bg-(--lp-leaf)"
          animate={{ scaleX: readyCount / ROWS.length }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
