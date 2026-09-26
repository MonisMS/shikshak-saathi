import Link from "next/link";
import { requireTeacher } from "@/lib/session";
import { getDashboardData } from "@/lib/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardMic } from "@/components/dashboard/dashboard-mic";
import { STATUS_CHIP, statusChipKey } from "@/components/kit/status-chip";
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
      <div className="max-w-xl space-y-6">
        <h1 className="text-2xl font-semibold">नमस्ते, {teacher.name} जी 👋</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Get started</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p>1. Create your first kit</p>
            <p>2. Teach and enter quiz results</p>
            <p>3. See tomorrow&apos;s fix</p>
            <Link href="/kits/new" className={buttonVariants({ className: "mt-2" })}>
              Create your first kit
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">नमस्ते, {teacher.name} जी 👋</h1>
        <div className="flex items-center gap-2">
          <Link href="/kits/new" className={buttonVariants()}>
            + New lesson kit
          </Link>
          <DashboardMic />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Kits this week" value={data.kitsThisWeek} />
        <StatCard label="Total kits" value={data.totalKits} />
        <StatCard label="Worksheets & quizzes generated" value={data.sectionsGenerated} />
        <StatCard
          label="Hours saved"
          value={data.hoursSaved.toFixed(1)}
          tooltip="Estimate: kit = 60 min, worksheet = 20, quiz = 15 (Shiksha Copilot study: 60-90 min -> 60-90 s)"
        />
      </div>

      {data.todayTomorrowKits.length > 0 && (
        <Card>
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
      )}

      {data.pendingResultsKits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending results</CardTitle>
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
      )}

      {data.topMisconceptions.length > 0 && (
        <Card>
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
      )}

      <Card>
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
    </div>
  );
}
