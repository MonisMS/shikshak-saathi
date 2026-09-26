"use client";

import { useEffect } from "react";

/** Waits for web fonts (Noto Sans Devanagari) to be ready, then opens the print dialog (§12.1). */
export function PrintTrigger() {
  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      if (!cancelled) window.print();
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
