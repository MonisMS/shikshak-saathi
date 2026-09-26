"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** F20: regenerate with an optional free-text instruction ("make it easier"). */
export function RegenerateControl({
  onRegenerate,
  disabled,
}: {
  onRegenerate: (instruction?: string) => Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    try {
      await onRegenerate(instruction || undefined);
      setOpen(false);
      setInstruction("");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={disabled}>
        <RefreshCw className="size-4" /> Regenerate
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder='Optional instruction, e.g. "make it easier"'
        className="w-64"
      />
      <Button size="sm" onClick={run} disabled={busy}>
        {busy ? "Regenerating…" : "Go"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
        Cancel
      </Button>
    </div>
  );
}
