"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff, Download, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const TITLES_KEY = "ss-offline-kits";

/** Registers /sw.js in production only (a service worker fights Turbopack HMR in dev). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-amber-100 px-4 py-2 text-sm text-amber-900 print:hidden">
      <WifiOff className="size-4 shrink-0" aria-hidden />
      आप ऑफ़लाइन हैं — सहेजी गई किट अभी भी खुलेंगी। / You&apos;re offline — saved kits still open.
    </div>
  );
}

export function readSavedKits(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(TITLES_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function rememberKit(id: string, title: string) {
  try {
    localStorage.setItem(TITLES_KEY, JSON.stringify({ ...readSavedKits(), [id]: title }));
  } catch {}
}

/** Called on logout: drop saved kit pages + titles so the next user of a shared phone can't see them. */
export function clearOfflineKits() {
  try {
    localStorage.removeItem(TITLES_KEY);
  } catch {}
  navigator.serviceWorker?.controller?.postMessage({ type: "CLEAR_PAGES" });
}

export function SaveOfflineButton({ kitId, title }: { kitId: string; title: string }) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    // Opening a kit online already caches it (sw.js), so record it for the /offline list.
    if (!navigator.serviceWorker?.controller) return;
    rememberKit(kitId, title);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState("saved");
  }, [kitId, title]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "KIT_SAVED" && e.data.id === kitId) setState("saved");
    };
    navigator.serviceWorker?.addEventListener("message", onMsg);
    return () => navigator.serviceWorker?.removeEventListener("message", onMsg);
  }, [kitId]);

  return (
    <Button
      size="sm"
      variant="outline"
      className="print:hidden"
      disabled={state === "saving"}
      onClick={() => {
        const sw = navigator.serviceWorker?.controller;
        if (!sw) return;
        setState("saving");
        rememberKit(kitId, title);
        sw.postMessage({ type: "SAVE_KIT", id: kitId });
      }}
    >
      {state === "saved" ? <Check className="size-4" /> : <Download className="size-4" />}
      {state === "saved" ? "Saved offline" : state === "saving" ? "Saving…" : "Save for offline"}
    </Button>
  );
}
