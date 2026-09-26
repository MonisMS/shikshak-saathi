import Link from "next/link";
import { requireTeacher } from "@/lib/session";
import { getDashboardData } from "@/lib/dashboard";
import { KitStatus } from "@/generated/prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardMic } from "@/components/dashboard/dashboard-mic";

const STATUS_CHIP: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Draft", className: "bg-muted text-muted-foreground" },
  GENERATING: { label: "Generating", className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" },
  READY: { label: "Ready", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  FAILED: { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
  RESULTS_IN: { label: "Results in", className: "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300" },
};

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
          <CardContent className="space-y-2">
            {data.todayTomorrowKits.map((k) => (
              <div key={k.id} className="flex items-center justify-between text-sm">
                <Link href={`/kits/${k.id}`} className="underline">
                  {k.title}
                </Link>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{k.scheduledFor?.toLocaleDateString()}</span>
                  {k.fixAttached && <Badge variant="secondary">Fix attached</Badge>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.pendingResultsKits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.pendingResultsKits.map((k) => (
              <div key={k.id} className="flex items-center justify-between text-sm">
                <span>{k.title}</span>
                <Link href={`/kits/${k.id}/results`} className="underline">
                  Enter results
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {data.topMisconceptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top misconceptions this week</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topMisconceptions.map((m) => (
              <div key={m.id} className="flex items-center justify-between text-sm">
                <span>{m.label}</span>
                <Link href={`/kits/${m.kitId}/insights`} className="text-muted-foreground underline">
                  {Math.round(m.percent * 100)}% · {m.kitTitle}
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent kits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recentKits.map((k) => {
            const chipKey = k.hasResults ? "RESULTS_IN" : k.status;
            const chip = STATUS_CHIP[chipKey] ?? STATUS_CHIP[KitStatus.DRAFT];
            return (
              <div key={k.id} className="flex items-center justify-between text-sm">
                <Link href={`/kits/${k.id}`} className="underline">
                  {k.title}
                </Link>
                <Badge variant="secondary" className={chip.className}>
                  {chip.label}
                </Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
