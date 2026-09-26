"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import { Plus } from "lucide-react";
import { EASE_OUT } from "./reveal";

const PRESENT = 40;
const BARS = [
  { n: 12, text: "think an acid and a base simply “disappear” when mixed", code: "M2", top: true },
  { n: 7, text: "think every sour thing is a dangerous acid", code: "M1", top: false },
  { n: 4, text: "think pH 7 means strongly acidic or basic", code: "M3", top: false },
];

const FIX_STEPS = [
  "Draw a beaker of acid and a beaker of base on the blackboard.",
  "Join them with an arrow into one beaker marked “salt + water”.",
  "Ask: did the acid vanish, or become something new? Take two answers.",
];

export function LoopPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -20% 0px" });

  return (
    <div ref={ref} className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
      <div className="rounded-3xl border border-(--lp-line) bg-(--lp-panel) p-6 md:p-7">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-xs tracking-[0.18em] text-(--lp-chalk-3) uppercase">Exit quiz · Class 7-A</p>
          <p className="font-mono text-xs text-(--lp-chalk-4)">{PRESENT} present</p>
        </div>

        <ul className="mt-6 space-y-6">
          {BARS.map((b, i) => (
            <li key={b.code}>
              <p className="text-[15px] leading-snug text-(--lp-chalk-2)">
                <span className={`text-2xl [font-family:var(--lp-serif)] ${b.top ? "text-(--lp-saffron)" : "text-(--lp-chalk)"}`}>
                  {b.n}/{PRESENT}
                </span>{" "}
                {b.text}
              </p>
              <div className="mt-2.5 flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-(--lp-line)">
                  <motion.div
                    className={`h-full origin-left rounded-full ${b.top ? "bg-(--lp-saffron)" : "bg-(--lp-chalk-4)"}`}
                    style={{ width: `${(b.n / PRESENT) * 100}%` }}
                    initial={{ scaleX: 0 }}
                    animate={inView ? { scaleX: 1 } : undefined}
                    transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.2 + i * 0.15 }}
                  />
                </div>
                <span className="w-7 font-mono text-xs text-(--lp-chalk-4)">{b.code}</span>
              </div>
            </li>
          ))}
        </ul>

        <motion.div
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-(--lp-leaf) px-4 py-2 text-sm font-semibold text-white"
          initial={{ opacity: 0, y: 8 }}
          animate={inView ? { opacity: 1, y: 0, scale: [1, 1, 0.95, 1] } : undefined}
          transition={{
            opacity: { duration: 0.5, delay: 1.1 },
            y: { duration: 0.5, ease: EASE_OUT, delay: 1.1 },
            scale: { duration: 0.35, times: [0, 0.3, 0.6, 1], delay: 1.9 },
          }}
        >
          <Plus className="size-4" aria-hidden />
          Add 5-min fix to tomorrow
        </motion.div>
      </div>

      <motion.div
        className="relative rounded-3xl border border-(--lp-leaf)/30 bg-[linear-gradient(180deg,color-mix(in_oklch,var(--lp-leaf)_7%,transparent),transparent_60%)] p-6 md:p-7"
        initial={{ opacity: 0, x: 24 }}
        animate={inView ? { opacity: 1, x: 0 } : undefined}
        transition={{ duration: 0.9, ease: EASE_OUT, delay: 2.2 }}
      >
        <p className="text-xs tracking-[0.18em] text-(--lp-leaf) uppercase">Tomorrow · first 5 minutes</p>
        <p className="mt-4 text-[1.9rem] leading-tight text-(--lp-chalk) [font-family:var(--lp-serif)]">
          Start with: <em className="italic">“Where does it go?”</em>
        </p>
        <ol className="mt-5 space-y-3">
          {FIX_STEPS.map((step, i) => (
            <motion.li
              key={step}
              className="flex gap-3 text-[15px] leading-relaxed text-(--lp-chalk-2)"
              initial={{ opacity: 0, y: 6 }}
              animate={inView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.6, ease: EASE_OUT, delay: 2.6 + i * 0.12 }}
            >
              <span className="font-mono text-xs leading-[1.75rem] text-(--lp-leaf)">{i + 1}</span>
              {step}
            </motion.li>
          ))}
        </ol>
        <p className="mt-6 border-t border-(--lp-line) pt-4 font-mono text-xs text-(--lp-chalk-4)">
          chalk · blackboard · no printouts · p.22
        </p>
      </motion.div>
    </div>
  );
}
