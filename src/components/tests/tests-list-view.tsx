"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Copy, ClipboardCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";

interface TestRow {
  id: string;
  token: string;
  kitId: string;
  kitTitle: string;
  sectionType: string;
  isOpen: boolean;
  createdAt: string;
  submissionCount: number;
  evaluatedCount: number;
}

const SECTION_LABEL: Record<string, string> = {
  WORKSHEET: "Worksheet",
  EXIT_QUIZ: "Exit quiz",
  STARTER_QUIZ: "Starter quiz",
};

export function TestsListView({ tests }: { tests: TestRow[] }) {
  async function copyLink(token: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/t/${token}`);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy — copy it from the test's page instead");
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tests & Quizzes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Worksheets and quizzes you&apos;ve published for students to attempt online, with AI-assisted grading.
        </p>
      </div>

      {tests.length === 0 ? (
        <FadeIn>
          <Card className="border-dashed border-border/70">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <ClipboardCheck className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No tests published yet. Open a kit&apos;s worksheet or exit quiz and use &quot;Publish as a test&quot; to get a shareable link and QR code.
              </p>
              <Link href="/kits" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-2" })}>
                Go to my kits
              </Link>
            </CardContent>
          </Card>
        </FadeIn>
      ) : (
        <div className="space-y-2">
          {tests.map((t, i) => (
            <FadeIn key={t.id} index={i}>
              <Card className="border-border/70">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/tests/${t.id}`} className="font-medium underline underline-offset-2">
                        {t.kitTitle}
                      </Link>
                      <Badge variant="secondary">{SECTION_LABEL[t.sectionType] ?? t.sectionType}</Badge>
                      <Badge variant={t.isOpen ? "secondary" : "outline"} className={t.isOpen ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : ""}>
                        {t.isOpen ? "Open" : "Closed"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.submissionCount} response{t.submissionCount === 1 ? "" : "s"} · {t.evaluatedCount}/{t.submissionCount} evaluated
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => copyLink(t.token)}>
                      <Copy className="size-3.5" />
                      Copy link
                    </Button>
                    <Link href={`/tests/${t.id}`} className={buttonVariants({ size: "sm" })}>
                      View results
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}
