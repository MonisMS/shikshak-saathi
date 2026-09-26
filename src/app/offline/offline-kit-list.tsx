"use client";

import { useEffect, useState } from "react";
import { readSavedKits } from "@/components/pwa/pwa";

export function OfflineKitList() {
  const [kits, setKits] = useState<[string, string][]>([]);
  // localStorage is client-only, so this has to run after mount.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setKits(Object.entries(readSavedKits())), []);

  if (kits.length === 0) {
    return <p className="text-sm text-muted-foreground">No kits saved yet. Open a kit while online to save it.</p>;
  }
  return (
    <ul className="space-y-2">
      {kits.map(([id, title]) => (
        <li key={id} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3">
          {/* Plain <a>: full page loads are what the service worker serves from cache. */}
          <a href={`/kits/${id}`} className="font-medium hover:underline">
            {title}
          </a>
          <a href={`/kits/${id}/print`} className="text-sm text-muted-foreground hover:underline">
            Print
          </a>
        </li>
      ))}
    </ul>
  );
}
