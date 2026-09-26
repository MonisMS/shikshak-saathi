import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, Plus } from "lucide-react";
import { requireTeacher } from "@/lib/session";
import { getDashboardData } from "@/lib/dashboard";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardMic } from "@/components/dashboard/dashboard-mic";
import { WeekBars } from "@/components/dashboard/week-bars";
import { ProgressGauge } from "@/components/dashboard/progress-gauge";
import { STATUS_CHIP, statusChipKey } from "@/components/kit/status-chip";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";

const DAY = ["S", "M", "T", "W", "T", "F", "S"];
const ICON_TINTS = [
  "bg-emerald-50 text-emerald-700",
  "bg-sky-50 text-sky-700",
  "bg-amber-50 text-amber-700",
  "bg-violet-50 text-violet-700",
  "bg-rose-50 text-rose-700",
];

function Panel({ title, action, className, children }: { title: string; action?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("rounded-3xl bg-card p-5 ring-1 ring-foreground/[0.04]", className)}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Header({ name }: { name: string }) {
  return (
    <FadeIn className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Dashboard</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">नमस्ते, {name} जी — plan, teach and follow up, one chapter at a time.</p>
      </div>
      <div className="flex items-center gap-2">
        <Link href="/kits/new" className={buttonVariants({ size: "lg" })}>
          <Plus /> New lesson kit
        </Link>
        <Link href="/kits" className={buttonVariants({ size: "lg", variant: "outline" })}>
          My kits
        </Link>
        <DashboardMic />
      </div>
    </FadeIn>
  );
}

export default async function DashboardPage() {
  const teacher = await requireTeacher();
  const data = await getDashboardData(teacher.id);

  if (data.totalKits === 0) {
    return (
      <div className="space-y-6">
        <Header name={teacher.name} />
        <FadeIn index={1} className="grid gap-4 md:grid-cols-3">
          {[
            { n: "1", t: "Create your first kit", d: "Pick an NCERT chapter — typed or spoken." },
            { n: "2", t: "Teach and enter quiz results", d: "A quick tally after the exit quiz." },
            { n: "3", t: "See tomorrow’s fix", d: "A 5-minute reteach for the top misconception." },
          ].map((s, i) => (
            <div
              key={s.n}
              className={cn(
                "rounded-3xl p-6",
                i === 0
                  ? "bg-[radial-gradient(130%_120%_at_0%_0%,oklch(0.5_0.12_155),oklch(0.33_0.08_158)_75%)] text-white"
                  : "bg-card ring-1 ring-foreground/[0.04]",
              )}
            >
              <span className={cn("grid size-9 place-items-center rounded-full text-sm font-semibold", i === 0 ? "bg-white text-primary" : "bg-accent text-accent-foreground")}>
                {s.n}
              </span>
              <p className="mt-5 text-lg font-semibold">{s.t}</p>
              <p className={cn("mt-1 text-sm", i === 0 ? "text-white/75" : "text-muted-foreground")}>{s.d}</p>
            </div>
          ))}
        </FadeIn>
        <FadeIn index={2}>
          <Link href="/kits/new" className={buttonVariants({ size: "lg" })}>
            Create your first kit <ArrowRight />
          </Link>
        </FadeIn>
      </div>
    );
  }

  const todayIdx = data.kitsPerDay.length - 1;
  const days = data.kitsPerDay.map((d, i) => ({ label: DAY[new Date(d.date).getDay()], count: d.count, isToday: i === todayIdx }));
  const next = data.todayTomorrowKits[0];
  const pending = data.pendingResultsKits[0];

  return (
    <div className="space-y-4">
      <Header name={teacher.name} />

      <FadeIn index={1} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard hero label="Total kits" value={data.totalKits} note={`${data.kitsThisWeek} created this week`} href="/kits" />
        <StatCard label="Kits this week" value={data.kitsThisWeek} note="Last 7 days" href="/kits" />
        <StatCard label="Worksheets & quizzes" value={data.sectionsGenerated} note="Generated and checked" href="/kits" />
        <StatCard
          label="Hours saved"
          value={data.hoursSaved.toFixed(1)}
          note="Estimated planning time"
          href="/kits"
          tooltip="Estimate: kit = 60 min, worksheet = 20, quiz = 15 (Shiksha Copilot study: 60-90 min -> 60-90 s)"
        />
      </FadeIn>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <FadeIn index={2} className="lg:col-span-2">
          <Panel title="Kits this week" className="h-full">
            <WeekBars days={days} />
          </Panel>
        </FadeIn>

        <FadeIn index={3}>
          <Panel title={!next && pending ? "Needs follow-up" : "Up next"} className="h-full">
            {next ? (
              <>
                <p className="text-xl leading-snug font-semibold text-primary">{next.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {next.scheduledFor ? new Date(next.scheduledFor).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }) : "Scheduled"}
                  {next.fixAttached && " · fix attached"}
                </p>
                <Link href={`/kits/${next.id}`} className={buttonVariants({ size: "lg", className: "mt-6 w-full bg-[oklch(0.3_0.07_160)]" })}>
                  <BookOpen /> Open lesson
                </Link>
              </>
            ) : pending ? (
              <>
                <p className="text-xl leading-snug font-semibold text-primary">{pending.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">Taught — quiz results not entered yet.</p>
                <Link href={`/kits/${pending.id}/results`} className={buttonVariants({ size: "lg", className: "mt-6 w-full bg-[oklch(0.3_0.07_160)]" })}>
                  <ClipboardCheck /> Enter results
                </Link>
              </>
            ) : (
              <>
                <p className="text-xl leading-snug font-semibold text-primary">You’re all caught up</p>
                <p className="mt-2 text-sm text-muted-foreground">Set a teaching date on a kit to see it here.</p>
                <Link href="/kits/new" className={buttonVariants({ size: "lg", className: "mt-6 w-full bg-[oklch(0.3_0.07_160)]" })}>
                  <Plus /> Plan a lesson
                </Link>
              </>
            )}
          </Panel>
        </FadeIn>

        <FadeIn index={4} className="xl:row-span-2">
          <Panel
            title="Recent kits"
            className="h-full"
            action={
              <Link href="/kits/new" className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Plus /> New
              </Link>
            }
          >
            <ul className="space-y-1">
              {data.recentKits.map((k, i) => {
                const chip = STATUS_CHIP[statusChipKey(k.status, k.hasResults)] ?? STATUS_CHIP.DRAFT;
                return (
                  <li key={k.id}>
                    <Link href={`/kits/${k.id}`} className="-mx-2 flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-muted">
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", ICON_TINTS[i % ICON_TINTS.length])}>
                        <BookOpen className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{k.title}</span>
                        <span className={cn("mt-1 inline-block rounded-md px-1.5 py-px text-[10px] font-medium", chip.className)}>{chip.label}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href="/kits" className="mt-4 flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              View all kits <ArrowRight className="size-3.5" />
            </Link>
          </Panel>
        </FadeIn>

        <FadeIn index={5} className="lg:col-span-2">
          <Panel title="Top misconceptions this week" className="h-full">
            {data.topMisconceptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Enter exit-quiz results after class to see what your students got wrong.</p>
            ) : (
              <ul className="space-y-4">
                {data.topMisconceptions.map((m) => (
                  <li key={m.id}>
                    <Link href={`/kits/${m.kitId}/insights`} className="group block">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-medium group-hover:text-primary">{m.label}</p>
                        <span className="shrink-0 text-sm font-semibold text-primary">{Math.round(m.percent * 100)}%</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{m.kitTitle}</p>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(4, Math.round(m.percent * 100))}%` }} />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {data.pendingResultsKits.length > 0 && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">Waiting for results</p>
                <ul className="space-y-1">
                  {data.pendingResultsKits.map((k) => (
                    <li key={k.id}>
                      <Link href={`/kits/${k.id}/results`} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-muted">
                        <span className="min-w-0 truncate">{k.title}</span>
                        <span className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-px text-[10px] font-medium text-rose-700">Pending</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </FadeIn>

        <FadeIn index={6}>
          <Panel title="Teaching progress" className="h-full">
            <ProgressGauge withResults={data.kitsWithResults} ready={data.readyKits} total={data.totalKits} />
          </Panel>
        </FadeIn>
      </div>
    </div>
  );
}
