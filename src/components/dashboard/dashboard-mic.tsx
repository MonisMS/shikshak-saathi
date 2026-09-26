"use client";

import { useRouter } from "next/navigation";
import { MicButton, type VoiceIntentResult } from "@/components/voice/mic-button";

/** Dashboard's mic (§6 "Greeting + CTA") hands the parsed intent to /kits/new via
 * query params, since the dashboard itself has no kit form to fill directly. */
export function DashboardMic() {
  const router = useRouter();

  function handleIntent(intent: VoiceIntentResult) {
    const params = new URLSearchParams();
    if (intent.grade) params.set("grade", String(intent.grade));
    if (intent.subject) params.set("subject", intent.subject);
    if (intent.chapterNo) params.set("chapterNo", String(intent.chapterNo));
    if (intent.topic) params.set("topic", intent.topic);
    if (intent.language) params.set("language", intent.language);
    if (intent.teacherNote) params.set("teacherNote", intent.teacherNote);
    router.push(`/kits/new?${params.toString()}`);
  }

  return <MicButton onIntent={handleIntent} />;
}
