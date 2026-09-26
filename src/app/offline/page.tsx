import { OfflineKitList } from "./offline-kit-list";

export const metadata = { title: "Offline — Shikshak Saathi" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-4 py-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">आप ऑफ़लाइन हैं</h1>
        <p className="text-muted-foreground">
          You&apos;re offline. Kits you opened or saved on this device are still available below.
        </p>
      </div>
      <OfflineKitList />
    </main>
  );
}
