"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { DemoButton } from "./demo-button";
import { EASE_OUT } from "./reveal";

type Tone = "saffron" | "sky" | "leaf";

const TONE: Record<Tone, string> = {
  saffron: "text-(--lp-saffron)",
  sky: "text-(--lp-sky)",
  leaf: "text-(--lp-leaf)",
};

function Line({ children, index, className }: { children: React.ReactNode; index: number; className?: string }) {
  return (
    <motion.span
      className={`block ${className ?? ""}`}
      initial={{ opacity: 0, y: 28, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 1, ease: EASE_OUT, delay: 0.15 + index * 0.14 }}
    >
      {children}
    </motion.span>
  );
}

// Coloured words "ink in" a beat after their line lands, like chalk catching the light.
function Ink({ children, tone, delay }: { children: React.ReactNode; tone: Tone; delay: number }) {
  return (
    <motion.em
      className={`italic pe-[0.1em] ${TONE[tone]}`}
      initial={{ opacity: 0.25 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9, ease: "easeOut", delay }}
    >
      {children}
    </motion.em>
  );
}

const PANELS: { tone: Tone; label: string; quote: string; meta: string }[] = [
  {
    tone: "saffron",
    label: "Lesson plan",
    quote: "“Pass a lemon and a bar of soap around. Ask: which one feels like a base?”",
    meta: "Block 1 · 5 min · p.18",
  },
  {
    tone: "sky",
    label: "Worksheet",
    quote: "“Turmeric paper turns red in soap water. Is soap acidic or basic? Why?”",
    meta: "Q3 · 2 marks · answer key",
  },
  {
    tone: "leaf",
    label: "Exit quiz",
    quote: "“12 of 40 think an acid and a base simply disappear when mixed.”",
    meta: "Misconception M2 · p.22",
  },
];

export function Hero({ primaryHref, primaryLabel }: { primaryHref: string; primaryLabel: string }) {
  return (
    <section className="relative pt-16 pb-24 md:pt-24 md:pb-32">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.05 }}
        className="mb-8 flex items-center gap-3 text-[13px] tracking-[0.16em] text-(--lp-chalk-3) uppercase"
      >
        <span className="h-px w-8 shrink-0 bg-(--lp-line-strong)" aria-hidden />
        <span>
          For NCERT classrooms ·{" "}
          <span className="text-[15px] tracking-normal normal-case [font-family:var(--lp-hindi)]" lang="hi">हिंदी</span> & English
        </span>
      </motion.p>

      <h1 className="max-w-[16ch] text-[clamp(2.9rem,7.4vw,6.4rem)] leading-[0.94] tracking-[-0.015em] [font-family:var(--lp-serif)] md:max-w-none">
        <Line index={0} className="text-(--lp-chalk)">
          One chapter in.
        </Line>
        <Line index={1} className="text-(--lp-chalk-2)">
          A <Ink tone="saffron" delay={0.95}>lesson plan</Ink>, a <Ink tone="sky" delay={1.1}>worksheet</Ink>,
        </Line>
        <Line index={2} className="text-(--lp-chalk-2)">
          and a <Ink tone="leaf" delay={1.25}>quiz</Ink> that finds{" "}
          <span className="relative inline-block whitespace-nowrap">
            the gaps.
            <svg
              className="pointer-events-none absolute -bottom-[0.1em] left-0 h-[0.22em] w-[92%] text-(--lp-leaf)"
              viewBox="0 0 220 14"
              preserveAspectRatio="none"
              aria-hidden
            >
              <motion.path
                d="M3 9 C 42 3, 86 12, 124 7 S 190 3, 217 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.75 }}
                transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 1.45 }}
              />
            </svg>
          </span>
        </Line>
      </h1>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.75 }}
        className="mt-7 text-[clamp(1.35rem,2.4vw,1.9rem)] leading-snug text-(--lp-chalk-3) [font-family:var(--lp-hindi)]"
        lang="hi"
      >
        एक अध्याय दें, पूरी कक्षा की तैयारी पाएँ।
      </motion.p>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.9 }}
        className="mt-6 max-w-[36rem] text-[17px] leading-[1.7] text-(--lp-chalk-3)"
      >
        Pick an NCERT chapter — typed or spoken, in Hindi or English. Shikshak Saathi plans the period
        minute by minute, cites the textbook page behind every question, checks its own work, and after
        class shows you which idea the room got wrong.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE_OUT, delay: 1.05 }}
        className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3"
      >
        <Link
          href={primaryHref}
          className="group inline-flex h-12 items-center gap-2 rounded-full bg-(--lp-saffron) px-6 text-[15px] font-semibold text-white transition-[transform,background-color] duration-200 hover:bg-(--lp-saffron-hi) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lp-saffron) active:scale-[0.97]"
        >
          {primaryLabel}
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
        </Link>
        <DemoButton />
      </motion.div>

      <div className="mt-20 grid overflow-hidden rounded-3xl border border-(--lp-line) md:grid-cols-3">
        {PANELS.map((p, i) => (
          <motion.div
            key={p.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: EASE_OUT, delay: 1.3 + i * 0.1 }}
            className="flex flex-col gap-4 border-(--lp-line) bg-(--lp-panel) p-6 transition-colors duration-300 hover:bg-(--lp-panel-hi) max-md:border-b max-md:last:border-b-0 md:border-r md:last:border-r-0 md:p-7"
          >
            <span className={`text-xs tracking-[0.18em] uppercase ${TONE[p.tone]}`}>{p.label}</span>
            <p className="text-[1.35rem] leading-[1.3] text-(--lp-chalk) [font-family:var(--lp-serif)]">{p.quote}</p>
            <span className="mt-auto font-mono text-xs text-(--lp-chalk-4)">{p.meta}</span>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
