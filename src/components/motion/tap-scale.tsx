"use client";

import { motion } from "motion/react";

/** Wraps a large touch target (tally +/- buttons, big MCQ option buttons) with a small
 * press-down scale so taps feel acknowledged on a phone, even before the state updates. */
export function TapScale({
  children,
  className,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ duration: 0.1 }}
      className={className}
    >
      {children}
    </motion.button>
  );
}
