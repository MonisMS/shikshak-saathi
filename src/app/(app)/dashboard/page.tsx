import Link from "next/link";
import { requireTeacher } from "@/lib/session";
import { getDashboardData } from "@/lib/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardMic } from "@/components/dashboard/dashboard-mic";
import { STATUS_CHIP, statusChipKey } from "@/components/kit/status-chip";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";

/** A row that's a full-width link with a hover background, not a bare underlined string. */
function KitRow({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm transition-colors hover:bg-accent">
      {children}
    </Link>
  );
}

export default async function DashboardPage() {
  const teacher = await requireTeacher();
  const data = await getDashboardData(teacher.id);

  if (data.totalKits === 0) {
    return (
      <FadeIn className="max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">नमस्ते, {teacher.name} जी 👋</h1>
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle className="text-base">Get started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>1. Create your first kit</p>
            <p>2. Teach and enter quiz results</p>
            <p>3. See tomorrow&apos;s fix</p>
            <Link href="/kits/new" className={buttonVariants({ size: "lg", className: "mt-2" })}>
              Create your first kit
            </Link>
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <FadeIn className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">नमस्ते, {teacher.name} जी 👋</h1>
        <div className="flex items-center gap-2">
          <Link href="/kits/new" className={buttonVariants({ size: "lg" })}>
            + Create lesson kit
          </Link>
          <DashboardMic />
        </div>
      </FadeIn>

      <FadeIn index={1} className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Kits this week" value={data.kitsThisWeek} />
        <StatCard label="Total kits" value={data.totalKits} />
        <StatCard label="Worksheets & quizzes generated" value={data.sectionsGenerated} />
        <StatCard
          label="Hours saved"
          value={data.hoursSaved.toFixed(1)}
          tooltip="Estimate: kit = 60 min, worksheet = 20, quiz = 15 (Shiksha Copilot study: 60-90 min -> 60-90 s)"
        />
      </FadeIn>

      {data.todayTomorrowKits.length > 0 && (
        <FadeIn index={2}>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Today / Tomorrow</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {data.todayTomorrowKits.map((k) => (
                <KitRow key={k.id} href={`/kits/${k.id}`}>
                  <span className="min-w-0 truncate">{k.title}</span>
                  <span className="flex shrink-0 items-center gap-2 text-muted-foreground">
                    {k.scheduledFor?.toLocaleDateString()}
                    {k.fixAttached && <Badge variant="secondary">Fix attached</Badge>}
                  </span>
                </KitRow>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {data.pendingResultsKits.length > 0 && (
        <FadeIn index={3}>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Needs follow-up</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {data.pendingResultsKits.map((k) => (
                <KitRow key={k.id} href={`/kits/${k.id}/results`}>
                  <span className="min-w-0 truncate">{k.title}</span>
                  <span className="shrink-0 text-muted-foreground">Enter results →</span>
                </KitRow>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      )}

      {data.topMisconceptions.length > 0 && (
        <FadeIn index={4}>
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-base">Top misconceptions this week</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {data.topMisconceptions.map((m) => (
                <KitRow key={m.id} href={`/kits/${m.kitId}/insights`}>
                  <span className="min-w-0 truncate">{m.label}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {Math.round(m.percent * 100)}% · {m.kitTitle}
                  </span>
                </KitRow>
              ))}
            </CardContent>
          </Card>
        </FadeIn>
      )}

      <FadeIn index={5}>
        <Card className="border-border/70">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent kits</CardTitle>
            <Link href="/kits" className="text-sm text-muted-foreground underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.recentKits.map((k) => {
              const chip = STATUS_CHIP[statusChipKey(k.status, k.hasResults)] ?? STATUS_CHIP.DRAFT;
              return (
                <KitRow key={k.id} href={`/kits/${k.id}`}>
                  <span className="min-w-0 truncate">{k.title}</span>
                  <Badge variant="secondary" className={cn("shrink-0", chip.className)}>
                    {chip.label}
                  </Badge>
                </KitRow>
              );
            })}
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
