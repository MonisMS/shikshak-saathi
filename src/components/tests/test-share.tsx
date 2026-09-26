"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

/** QR + copyable link to the public /t/[token] attempt page. */
export function TestShare({ token }: { token: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [url] = useState(() => (typeof window === "undefined" ? null : `${window.location.origin}/t/${token}`));

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
        // eslint-disable-next-line @next/next/no-img-element -- small client-generated data: URL
        <img src={qr} alt="QR code to the test" width={96} height={96} className="rounded-md border border-border/70" />
      ) : (
        <div className="size-24 animate-pulse rounded-md bg-muted" />
      )}
      <div className="min-w-0 space-y-1">
        <p className="text-sm text-muted-foreground">Students scan this or open the link — no login needed.</p>
        <Button type="button" variant="outline" size="sm" onClick={copy} disabled={!url}>
          <Copy className="size-3.5" />
          Copy link
        </Button>
      </div>
    </div>
  );
}
