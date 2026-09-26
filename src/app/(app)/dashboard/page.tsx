import Link from "next/link";
import { ArrowRight, BookOpen, ClipboardCheck, Plus } from "lucide-react";
import { requireTeacher } from "@/lib/session";
import { getDashboardData } from "@/lib/dashboard";
import { prisma } from "@/lib/db";
import { buttonVariants } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { DashboardMic } from "@/components/dashboard/dashboard-mic";
import { WeekBars } from "@/components/dashboard/week-bars";
import { ProgressGauge } from "@/components/dashboard/progress-gauge";
import { STATUS_CHIP, statusChipKey } from "@/components/kit/status-chip";
import { FadeIn } from "@/components/motion/fade-in";
import { cn } from "@/lib/utils";
import { tx, type Lang } from "@/lib/i18n";

const DAY = { en: ["S", "M", "T", "W", "T", "F", "S"], hi: ["र", "सो", "मं", "बु", "गु", "शु", "श"] };
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

function Header({ name, lang, classQuery }: { name: string; lang: Lang; classQuery: string }) {
  return (
    <FadeIn className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{tx(lang, "Dashboard", "डैशबोर्ड")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          नमस्ते, {name} जी — {tx(lang, "plan, teach and follow up, one chapter at a time.", "योजना बनाएँ, पढ़ाएँ और फ़ॉलो-अप करें — एक-एक अध्याय।")}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link href={`/kits/new${classQuery.replace("class=", "classroom=")}`} className={buttonVariants({ size: "lg" })}>
          <Plus /> {tx(lang, "New lesson kit", "नई पाठ किट")}
        </Link>
        <Link href={`/kits${classQuery}`} className={buttonVariants({ size: "lg", variant: "outline" })}>
          {tx(lang, "My kits", "मेरी किट्स")}
        </Link>
        <DashboardMic />
      </div>
    </FadeIn>
  );
}

function ClassSwitcher({ classrooms, active, lang }: { classrooms: { id: string; name: string }[]; active?: string; lang: Lang }) {
  if (classrooms.length < 2) return null;
  const pill = (on: boolean) =>
    cn(
      "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors",
      on ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground ring-1 ring-foreground/[0.06] hover:text-foreground",
    );
  return (
    <nav aria-label={tx(lang, "Classes", "कक्षाएँ")} className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      <Link href="/dashboard" className={pill(!active)}>
        {tx(lang, "All classes", "सभी कक्षाएँ")}
      </Link>
      {classrooms.map((c) => (
        <Link key={c.id} href={`/dashboard?class=${c.id}`} className={pill(active === c.id)}>
          {c.name}
        </Link>
      ))}
    </nav>
  );
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const teacher = await requireTeacher();
  const requested = (await props.searchParams).class;
  const requestedClass = typeof requested === "string" ? requested : undefined;
  // Both queries are teacherId-scoped, so a bogus ?class= just yields an empty, not someone else's, dashboard.
  const [classrooms, data] = await Promise.all([
    prisma.classroom.findMany({ where: { teacherId: teacher.id }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    getDashboardData(teacher.id, requestedClass),
  ]);
  const activeClass = classrooms.find((c) => c.id === requestedClass)?.id;
  const classQuery = activeClass ? `?class=${activeClass}` : "";

  const lang: Lang = teacher.uiLanguage === "hi" ? "hi" : "en";

  if (data.totalKits === 0) {
    return (
      <div className="space-y-6">
        <Header name={teacher.name} lang={lang} classQuery={classQuery} />
        <ClassSwitcher classrooms={classrooms} active={activeClass} lang={lang} />
        <FadeIn index={1} className="grid gap-4 md:grid-cols-3">
          {[
            { n: "1", t: tx(lang, "Create your first kit", "अपनी पहली किट बनाएँ"), d: tx(lang, "Pick an NCERT chapter — typed or spoken.", "NCERT अध्याय चुनें — लिखकर या बोलकर।") },
            { n: "2", t: tx(lang, "Teach and enter quiz results", "पढ़ाएँ और क्विज़ के परिणाम भरें"), d: tx(lang, "A quick tally after the exit quiz.", "निकास क्विज़ के बाद जल्दी से गिनती।") },
            { n: "3", t: tx(lang, "See tomorrow’s fix", "कल का सुधार देखें"), d: tx(lang, "A 5-minute reteach for the top misconception.", "सबसे आम गलतफ़हमी के लिए 5 मिनट की दोबारा पढ़ाई।") },
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
          <Link href={`/kits/new${classQuery.replace("class=", "classroom=")}`} className={buttonVariants({ size: "lg" })}>
            {tx(lang, "Create your first kit", "अपनी पहली किट बनाएँ")} <ArrowRight />
          </Link>
        </FadeIn>
      </div>
    );
  }

  const todayIdx = data.kitsPerDay.length - 1;
  const days = data.kitsPerDay.map((d, i) => ({ label: DAY[lang][new Date(d.date).getDay()], count: d.count, isToday: i === todayIdx }));
  const next = data.todayTomorrowKits[0];
  const pending = data.pendingResultsKits[0];

  return (
    <div className="space-y-4">
      <Header name={teacher.name} lang={lang} classQuery={classQuery} />
        <ClassSwitcher classrooms={classrooms} active={activeClass} lang={lang} />

      <FadeIn index={1} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard hero label={tx(lang, "Total kits", "कुल किट्स")} value={data.totalKits} note={tx(lang, `${data.kitsThisWeek} created this week`, `इस हफ़्ते ${data.kitsThisWeek} बनीं`)} href="/kits" />
        <StatCard label={tx(lang, "Kits this week", "इस हफ़्ते की किट्स")} value={data.kitsThisWeek} note={tx(lang, "Last 7 days", "पिछले 7 दिन")} href="/kits" />
        <StatCard label={tx(lang, "Worksheets & quizzes", "कार्यपत्रक और क्विज़")} value={data.sectionsGenerated} note={tx(lang, "Generated and checked", "बनाए और जाँचे गए")} href="/kits" />
        <StatCard
          label={tx(lang, "Hours saved", "बचे हुए घंटे")}
          value={data.hoursSaved.toFixed(1)}
          note={tx(lang, "Estimated planning time", "योजना में बचा अनुमानित समय")}
          href="/kits"
          tooltip="Estimate: kit = 60 min, worksheet = 20, quiz = 15 (Shiksha Copilot study: 60-90 min -> 60-90 s)"
        />
      </FadeIn>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
        <FadeIn index={2} className="lg:col-span-2">
          <Panel title={tx(lang, "Kits this week", "इस हफ़्ते की किट्स")} className="h-full">
            <WeekBars days={days} />
          </Panel>
        </FadeIn>

        <FadeIn index={3}>
          <Panel title={!next && pending ? tx(lang, "Needs follow-up", "फ़ॉलो-अप बाकी") : tx(lang, "Up next", "आगे क्या है")} className="h-full">
            {next ? (
              <>
                <p className="text-xl leading-snug font-semibold text-primary">{next.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {next.scheduledFor ? new Date(next.scheduledFor).toLocaleDateString(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "long", day: "numeric", month: "short" }) : tx(lang, "Scheduled", "तय है")}
                  {next.fixAttached && tx(lang, " · fix attached", " · सुधार जुड़ा है")}
                </p>
                <Link href={`/kits/${next.id}`} className={buttonVariants({ size: "lg", className: "mt-6 w-full bg-[oklch(0.3_0.07_160)]" })}>
                  <BookOpen /> {tx(lang, "Open lesson", "पाठ खोलें")}
                </Link>
              </>
            ) : pending ? (
              <>
                <p className="text-xl leading-snug font-semibold text-primary">{pending.title}</p>
                <p className="mt-2 text-sm text-muted-foreground">{tx(lang, "Taught — quiz results not entered yet.", "पढ़ा दिया — क्विज़ परिणाम अभी नहीं भरे।")}</p>
                <Link href={`/kits/${pending.id}/results`} className={buttonVariants({ size: "lg", className: "mt-6 w-full bg-[oklch(0.3_0.07_160)]" })}>
                  <ClipboardCheck /> {tx(lang, "Enter results", "परिणाम भरें")}
                </Link>
              </>
            ) : (
              <>
                <p className="text-xl leading-snug font-semibold text-primary">{tx(lang, "You’re all caught up", "सब काम पूरा है")}</p>
                <p className="mt-2 text-sm text-muted-foreground">{tx(lang, "Set a teaching date on a kit to see it here.", "किसी किट पर पढ़ाने की तारीख़ डालें, वह यहाँ दिखेगी।")}</p>
                <Link href="/kits/new" className={buttonVariants({ size: "lg", className: "mt-6 w-full bg-[oklch(0.3_0.07_160)]" })}>
                  <Plus /> {tx(lang, "Plan a lesson", "पाठ की योजना बनाएँ")}
                </Link>
              </>
            )}
          </Panel>
        </FadeIn>

        <FadeIn index={4} className="xl:row-span-2">
          <Panel
            title={tx(lang, "Recent kits", "हाल की किट्स")}
            className="h-full"
            action={
              <Link href="/kits/new" className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Plus /> {tx(lang, "New", "नई")}
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
                        <span className={cn("mt-1 inline-block rounded-md px-1.5 py-px text-[10px] font-medium", chip.className)}>{chip.label[lang]}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <Link href="/kits" className="mt-4 flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              {tx(lang, "View all kits", "सभी किट्स देखें")} <ArrowRight className="size-3.5" />
            </Link>
          </Panel>
        </FadeIn>

        <FadeIn index={5} className="lg:col-span-2">
          <Panel title={tx(lang, "Top misconceptions this week", "इस हफ़्ते की मुख्य गलतफ़हमियाँ")} className="h-full">
            {data.topMisconceptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tx(lang, "Enter exit-quiz results after class to see what your students got wrong.", "कक्षा के बाद निकास क्विज़ के परिणाम भरें — पता चलेगा बच्चे कहाँ गलत समझे।")}</p>
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
                <p className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">{tx(lang, "Waiting for results", "परिणाम बाकी")}</p>
                <ul className="space-y-1">
                  {data.pendingResultsKits.map((k) => (
                    <li key={k.id}>
                      <Link href={`/kits/${k.id}/results`} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-1.5 text-sm hover:bg-muted">
                        <span className="min-w-0 truncate">{k.title}</span>
                        <span className="shrink-0 rounded-md border border-rose-200 bg-rose-50 px-1.5 py-px text-[10px] font-medium text-rose-700">{tx(lang, "Pending", "बाकी")}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        </FadeIn>

        <FadeIn index={6}>
          <Panel title={tx(lang, "Teaching progress", "पढ़ाई की प्रगति")} className="h-full">
            <ProgressGauge withResults={data.kitsWithResults} ready={data.readyKits} total={data.totalKits} lang={lang} />
          </Panel>
        </FadeIn>
      </div>
    </div>
  );
}
