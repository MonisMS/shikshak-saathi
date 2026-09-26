"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff, Download, Check, MonitorSmartphone } from "lucide-react";
import { toast } from "sonner";
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

// Chrome fires beforeinstallprompt once, often before React mounts — capture it at module load.
type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferredPrompt: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as InstallPromptEvent;
    installListeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    installListeners.forEach((l) => l());
  });
}

function subscribeInstall(cb: () => void) {
  installListeners.add(cb);
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", cb);
  return () => {
    installListeners.delete(cb);
    mq.removeEventListener("change", cb);
  };
}

function installState(): "installed" | "ready" | "unavailable" {
  if (window.matchMedia("(display-mode: standalone)").matches) return "installed";
  return deferredPrompt ? "ready" : "unavailable";
}

/** Top-bar "Install app" button — makes the PWA feature visible for the demo. */
export function InstallAppButton() {
  const state = useSyncExternalStore(subscribeInstall, installState, () => "unavailable" as const);

  if (state === "installed") {
    return (
      <span className="hidden h-11 items-center gap-1.5 rounded-full bg-muted px-4 text-sm text-primary sm:flex">
        <Check className="size-4" aria-hidden /> App installed
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        if (!deferredPrompt) {
          toast.info("Install Shikshak Saathi", {
            description:
              "Chrome: click the install icon in the address bar, or menu → Cast, save and share → Install. Phone: menu → Add to Home screen.",
          });
          return;
        }
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        installListeners.forEach((l) => l());
      }}
      className="flex h-11 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
      aria-label="Install app"
    >
      <MonitorSmartphone className="size-4" aria-hidden />
      <span className="hidden sm:inline">Install app</span>
    </button>
  );
}
