"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

/** F-exit-ticket: QR + copyable link to the public /ticket/[kitId] page, so a teacher
 * can put it on the board at the end of class. Generated client-side (no server round-trip). */
export function ExitTicketShare({ kitId }: { kitId: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [url] = useState(() => (typeof window === "undefined" ? null : `${window.location.origin}/ticket/${kitId}`));

  useEffect(() => {
    if (!url) return;
    void QRCode.toDataURL(url, { margin: 1, width: 160 }).then(setQr);
  }, [url]);

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy — select and copy the link manually");
    }
  }

  return (
    <div className="flex items-center gap-4">
      {qr ? (
        // eslint-disable-next-line @next/next/no-img-element -- small client-generated data: URL, not a Next-optimizable remote image
        <img src={qr} alt="QR code to the student exit ticket" width={96} height={96} className="rounded-md border border-border/70" />
      ) : (
        <div className="size-24 animate-pulse rounded-md bg-muted" />
      )}
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">Students scan this at the end of class — no login, no name needed.</p>
        <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!url}>
          <Copy className="size-3.5" />
          Copy link
        </Button>
      </div>
    </div>
  );
}
