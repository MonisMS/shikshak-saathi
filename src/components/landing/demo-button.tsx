"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { toast } from "sonner";

export function DemoButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function openDemo() {
    setLoading(true);
    try {
      const res = await fetch("/api/demo/login", { method: "POST" });
      if (!res.ok) throw new Error();
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("The demo classroom couldn't open. Try again in a moment.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={openDemo}
      disabled={loading}
      className="group inline-flex h-12 items-center gap-2.5 rounded-full px-3 text-[15px] font-medium text-(--lp-chalk) transition-colors hover:text-(--lp-saffron) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lp-saffron) disabled:opacity-60"
    >
      <span className="grid size-7 place-items-center rounded-full border border-(--lp-line-strong) transition-colors group-hover:border-(--lp-chalk-3)">
        <Play className="size-3 translate-x-px fill-current" aria-hidden />
      </span>
      {loading ? "Opening the demo classroom…" : "Try the demo classroom"}
    </button>
  );
}
