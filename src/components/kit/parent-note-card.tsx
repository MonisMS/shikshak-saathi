"use client";

import Link from "next/link";
import { useLanguage } from "@/components/layout/language-provider";
import { tx } from "@/lib/i18n";
import type { z } from "zod";
import { ParentNote } from "@/lib/ai/schemas";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

type ParentNoteData = z.infer<typeof ParentNote>;

/** Compact read view on the main kit page — the full editor + WhatsApp preview lives
 * at /kits/[id]/parent (P8.2). */
export function ParentNoteCard({ kitId, data }: { kitId: string; data: ParentNoteData }) {
  const { lang } = useLanguage();
  return (
    <Card>
      <CardHeader>
        <CardTitle>{tx(lang, "Parent note", "अभिभावक संदेश")}</CardTitle>
        <CardAction>
          <Link href={`/kits/${kitId}/parent`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {tx(lang, "Open editor", "संपादक खोलें")}
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="font-medium">{tx(lang, "Learned today: ", "आज क्या सीखा: ")}</span>
          {data.learnedToday}
        </p>
        <p>
          <span className="font-medium">{tx(lang, "Homework: ", "गृहकार्य: ")}</span>
          {data.homework}
        </p>
      </CardContent>
    </Card>
  );
}
