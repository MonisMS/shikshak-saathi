"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useLanguage } from "@/components/layout/language-provider";
import { tx } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { buildKitDocx, downloadBlob, type DocKind, type KitDocxInput } from "@/lib/export-docx";

export function ExportButtons({ kitId, input, availableDocs }: { kitId: string; input: KitDocxInput; availableDocs: DocKind[] }) {
  const { lang } = useLanguage();
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadWord() {
    setDownloading(true);
    try {
      const blob = await buildKitDocx(input, availableDocs);
      downloadBlob(blob, `${input.title.replace(/[^a-z0-9]+/gi, "_")}.docx`);
      await fetch(`/api/kits/${kitId}/export-log`, { method: "POST" }).catch(() => {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tx(lang, "Could not build the Word document", "Word फ़ाइल नहीं बन सकी"));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Button onClick={handleDownloadWord} disabled={downloading}>
      {downloading ? tx(lang, "Preparing…", "तैयार कर रहे हैं…") : tx(lang, "Download Word (.docx)", "Word (.docx) डाउनलोड करें")}
    </Button>
  );
}
