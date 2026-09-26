"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Publishes a WORKSHEET/quiz section as a student-attemptable test (a shareable
 * link + QR, AI-assisted grading) and takes the teacher straight to its results page. */
export function PublishTestButton({ kitId, sectionType }: { kitId: string; sectionType: "WORKSHEET" | "EXIT_QUIZ" | "STARTER_QUIZ" }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);

  async function publish() {
    setPublishing(true);
    try {
      const res = await fetch("/api/tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kitId, sectionType }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string })?.error ?? "Could not publish");
      router.push(`/tests/${(data as { id: string }).id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not publish");
      setPublishing(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={publish} disabled={publishing}>
      <Send className="size-3.5" />
      {publishing ? "Publishing…" : "Publish as a test"}
    </Button>
  );
}
