"use client";

import { motion } from "motion/react";

const STRIPES = "repeating-linear-gradient(135deg, var(--muted-foreground) 0 1.5px, transparent 1.5px 7px)";
const SHADES = ["oklch(0.62 0.13 155)", "oklch(0.44 0.1 157)", "oklch(0.3 0.07 160)"];

export function WeekBars({ days }: { days: { label: string; count: number; isToday: boolean }[] }) {
  const max = Math.max(1, ...days.map((d) => d.count));
  return (
    <div className="flex h-44 items-end justify-between gap-2 sm:gap-3">
      {days.map((d, i) => {
        const h = d.count === 0 ? 45 : 45 + (d.count / max) * 55;
        const bg = d.count === 0 ? undefined : d.isToday ? SHADES[2] : SHADES[d.count === max ? 1 : 0];
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative flex h-36 w-full max-w-14 items-end">
              {d.count > 0 && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium">
                  {d.count}
                </span>
              )}
              <motion.div
                className="w-full origin-bottom rounded-full"
                style={{ height: `${h}%`, background: bg ?? STRIPES, opacity: d.count === 0 ? 0.35 : 1 }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 + i * 0.05 }}
              />
            </div>
            <span className={d.isToday ? "text-xs font-semibold text-foreground" : "text-xs text-muted-foreground"}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
