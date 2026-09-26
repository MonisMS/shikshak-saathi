"use client";

import { motion } from "motion/react";

/** Minimalist enter animation for cards/rows/sections — a small rise + fade, nothing bouncy.
 * `index` staggers a list (each item ~40ms after the previous) without needing a parent variant. */
export function FadeIn({
  children,
  index = 0,
  className,
}: {
  children: React.ReactNode;
  index?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
