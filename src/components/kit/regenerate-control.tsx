"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/layout/language-provider";
import { tx } from "@/lib/i18n";

/** F20: regenerate with an optional free-text instruction ("make it easier"). */
export function RegenerateControl({
  onRegenerate,
  disabled,
}: {
  onRegenerate: (instruction?: string) => Promise<void>;
  disabled?: boolean;
}) {
  const { lang } = useLanguage();
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
        <RefreshCw className="size-4" /> {tx(lang, "Regenerate", "फिर से बनाएँ")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        placeholder={tx(lang, 'Optional instruction, e.g. "make it easier"', 'निर्देश (वैकल्पिक), जैसे "इसे आसान बनाओ"')}
        className="w-64"
      />
      <Button size="sm" onClick={run} disabled={busy}>
        {busy ? tx(lang, "Regenerating…", "बनाया जा रहा है…") : tx(lang, "Go", "बनाएँ")}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
        {tx(lang, "Cancel", "रद्द करें")}
      </Button>
    </div>
  );
}
