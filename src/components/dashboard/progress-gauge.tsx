"use client";

import { motion } from "motion/react";

// Semicircle from (10,100) to (190,100), radius 90.
const ARC = "M 10 100 A 90 90 0 0 1 190 100";

export function ProgressGauge({ withResults, ready, total }: { withResults: number; ready: number; total: number }) {
  const safe = Math.max(total, 1);
  const a = withResults / safe;
  const b = ready / safe;
  const pct = Math.round(a * 100);

  return (
    <div>
      <div className="relative mx-auto w-full max-w-[16rem]">
        <svg viewBox="0 0 200 110" className="w-full overflow-visible">
          <defs>
            <pattern id="gauge-stripes" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--muted-foreground)" strokeWidth="1.6" opacity="0.5" />
            </pattern>
          </defs>
          <path d={ARC} fill="none" stroke="url(#gauge-stripes)" strokeWidth="22" strokeLinecap="round" />
          {a + b > 0 && <motion.path
            d={ARC}
            fill="none"
            stroke="oklch(0.3 0.07 160)"
            strokeWidth="22"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: Math.min(1, a + b) }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />}
          {a > 0 && <motion.path
            d={ARC}
            fill="none"
            stroke="oklch(0.44 0.1 157)"
            strokeWidth="22"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: a }}
            transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />}
        </svg>
        <div className="absolute inset-x-0 bottom-0 text-center">
          <p className="text-4xl font-semibold tracking-tight">{pct}%</p>
          <p className="text-xs text-muted-foreground">kits with results</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[oklch(0.44_0.1_157)]" />Results in</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[oklch(0.3_0.07_160)]" />Ready to teach</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[repeating-linear-gradient(135deg,var(--muted-foreground)_0_1px,transparent_1px_3px)]" />Draft</span>
      </div>
    </div>
  );
}
