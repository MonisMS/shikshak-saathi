import Link from "next/link";
import type { z } from "zod";
import { ParentNote } from "@/lib/ai/schemas";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

type ParentNoteData = z.infer<typeof ParentNote>;

/** Compact read view on the main kit page — the full editor + WhatsApp preview lives
 * at /kits/[id]/parent (P8.2). */
export function ParentNoteCard({ kitId, data }: { kitId: string; data: ParentNoteData }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Parent note</CardTitle>
        <CardAction>
          <Link href={`/kits/${kitId}/parent`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Open editor
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="font-medium">Learned today: </span>
          {data.learnedToday}
        </p>
        <p>
          <span className="font-medium">Homework: </span>
          {data.homework}
        </p>
      </CardContent>
    </Card>
  );
}
