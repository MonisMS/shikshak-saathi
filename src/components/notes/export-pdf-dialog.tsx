"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLanguage } from "@/components/layout/language-provider";

type Part = "summary" | "transcript" | "notes";

const LABELS: Record<Part, { en: string; hi: string }> = {
  summary: { en: "Summary", hi: "सारांश" },
  transcript: { en: "Full transcript", hi: "पूरा ट्रांसक्रिप्ट" },
  notes: { en: "My thoughts", hi: "मेरे विचार" },
};

/**
 * Picks what goes into the PDF, then opens /notes/[id]/print — the browser's own
 * "Save as PDF" is used (like /kits/[id]/print) because it shapes Devanagari correctly.
 */
export function ExportPdfDialog({
  open,
  onOpenChange,
  noteId,
  hasSummary,
  hasMyNotes,
  beforeOpen,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteId: string;
  hasSummary: boolean;
  hasMyNotes: boolean;
  beforeOpen: () => Promise<void>;
}) {
  const { lang } = useLanguage();
  const router = useRouter();
  // The parent remounts this dialog (new `key`) on every open, so these defaults are always fresh.
  const [selected, setSelected] = useState<Record<Part, boolean>>(() => ({ summary: hasSummary, transcript: !hasSummary, notes: hasMyNotes }));

  const available: Record<Part, boolean> = { summary: hasSummary, transcript: true, notes: hasMyNotes };
  const include = (Object.keys(selected) as Part[]).filter((p) => selected[p] && available[p]);

  async function handleExport() {
    const url = `/notes/${noteId}/print?include=${include.join(",")}`;
    // Open synchronously (inside the click) so popup blockers allow it, then navigate once
    // any unsaved "My thoughts" edit has reached the DB the print page reads from.
    const win = window.open("", "_blank");
    await beforeOpen().catch(() => {});
    if (win) win.location.href = url;
    else router.push(url); // popup blocked — open the print view in this tab instead
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{lang === "hi" ? "PDF निकालें" : "Export as PDF"}</DialogTitle>
          <DialogDescription>
            {lang === "hi"
              ? "प्रिंट विंडो में “Save as PDF” चुनें।"
              : "A print view opens — choose “Save as PDF” as the destination."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {(Object.keys(LABELS) as Part[]).map((part) => (
            <label key={part} className={available[part] ? "flex cursor-pointer items-center gap-3" : "flex items-center gap-3 opacity-50"}>
              <Checkbox
                checked={selected[part] && available[part]}
                disabled={!available[part]}
                onCheckedChange={(checked) => setSelected((s) => ({ ...s, [part]: checked === true }))}
              />
              <span className="text-sm">{LABELS[part][lang]}</span>
              {!available[part] && <span className="text-xs text-muted-foreground">{lang === "hi" ? "(खाली)" : "(empty)"}</span>}
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button disabled={include.length === 0} onClick={() => void handleExport()}>
            <FileDown /> {lang === "hi" ? "PDF बनाएँ" : "Create PDF"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
