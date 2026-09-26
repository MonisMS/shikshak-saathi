import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import localFont from "next/font/local";
import { getSessionCookie } from "better-auth/cookies";
import { ArrowRight, Check } from "lucide-react";
import { Hero } from "@/components/landing/hero";
import { KitPreview } from "@/components/landing/kit-preview";
import { LoopPreview } from "@/components/landing/loop-preview";
import { DemoButton } from "@/components/landing/demo-button";
import { Reveal } from "@/components/landing/reveal";

// Self-hosted so the page never depends on reaching Google Fonts at build or demo time.
const serif = localFont({
  src: "./fonts/InstrumentSerif-Regular.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-instrument-serif",
  fallback: ["Georgia", "serif"],
});

const THEME = {
  "--lp-ink": "oklch(0.965 0.004 150)",
  "--lp-panel": "oklch(1 0 0)",
  "--lp-panel-hi": "oklch(0.985 0.006 150)",
  "--lp-chalk": "oklch(0.22 0.02 160)",
  "--lp-chalk-2": "oklch(0.36 0.02 160)",
  "--lp-chalk-3": "oklch(0.48 0.015 160)",
  "--lp-chalk-4": "oklch(0.6 0.01 160)",
  "--lp-line": "oklch(0.22 0.02 160 / 0.08)",
  "--lp-line-strong": "oklch(0.22 0.02 160 / 0.18)",
  "--lp-saffron": "oklch(0.44 0.1 157)",
  "--lp-saffron-hi": "oklch(0.38 0.09 158)",
  "--lp-sky": "oklch(0.52 0.11 245)",
  "--lp-leaf": "oklch(0.56 0.13 152)",
  "--lp-serif": "var(--font-instrument-serif), var(--font-noto-devanagari), Georgia, serif",
  "--lp-hindi": "var(--font-noto-devanagari), var(--font-noto-sans), sans-serif",
  fontFamily: "var(--font-noto-sans), var(--font-noto-devanagari), ui-sans-serif, system-ui, sans-serif",
} as React.CSSProperties;

const CHECKS = [
  "Section minutes add up to your 40-minute period",
  "Every page reference exists in the chapter",
  "Every objective is tested by at least one question",
  "Every wrong option names the misconception behind it",
  "Worksheet answer key matches its questions",
  "Hindi output is actually written in Hindi",
];

const QUIZ_OPTIONS = [
  { key: "A", text: "They form a salt and water", correct: true },
  { key: "B", text: "The mixture disappears completely", tag: "M2 · thinks it vanishes" },
  { key: "C", text: "The acid becomes stronger", tag: "M2 · thinks acids win" },
  { key: "D", text: "Nothing happens", tag: "M2 · no reaction" },
];

const NUMBERS = [
  { value: "19%", text: "of a teacher’s working time goes to actual teaching.", source: "NIEPA" },
  { value: "1,04,125", text: "schools in India run with a single teacher.", source: "UDISE+ 2024–25" },
  { value: "42%", text: "of students study in Hindi medium — most AI tools are English-first.", source: null },
];

function SectionLabel({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-xs tracking-[0.18em] text-(--lp-chalk-3) uppercase">
      <span className="font-mono tracking-normal text-(--lp-chalk-4)">{n}</span>
      <span className="h-px w-6 bg-(--lp-line-strong)" aria-hidden />
      {children}
    </p>
  );
}

function Heading({ children, hi }: { children: React.ReactNode; hi: string }) {
  return (
    <>
      <h2 className="mt-5 text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1] tracking-[-0.01em] text-(--lp-chalk) [font-family:var(--lp-serif)]">
        {children}
      </h2>
      <p className="mt-3 text-xl text-(--lp-chalk-3) [font-family:var(--lp-hindi)]" lang="hi">
        {hi}
      </p>
    </>
  );
}

export default async function Home() {
  // Silenced, not deleted: the app now starts from /dashboard (which itself sends
  // signed-out visitors to /login). Remove this line to bring the landing page back.
  redirect("/dashboard");

  const signedIn = Boolean(getSessionCookie(await headers()));
  const primaryHref = signedIn ? "/dashboard" : "/signup";
  const primaryLabel = signedIn ? "Open your dashboard" : "Start free";

  return (
    <div
      className={`${serif.variable} relative isolate min-h-dvh overflow-x-clip bg-(--lp-ink) text-(--lp-chalk) antialiased selection:bg-(--lp-saffron) selection:text-(--lp-ink)`}
      style={THEME}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[46rem] bg-[radial-gradient(60%_55%_at_18%_0%,color-mix(in_oklch,var(--lp-leaf)_14%,transparent),transparent_70%)]"
      />

      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <header className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-baseline gap-2.5 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-(--lp-saffron)">
            <span className="text-2xl text-(--lp-chalk) [font-family:var(--lp-hindi)]" lang="hi">शिक्षक साथी</span>
            <span className="hidden text-sm text-(--lp-chalk-4) sm:inline">Shikshak Saathi</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <a href="#kit" className="hidden rounded-full px-3 py-2 text-(--lp-chalk-3) transition-colors hover:text-(--lp-chalk) md:inline">
              The kit
            </a>
            <a href="#after-class" className="hidden rounded-full px-3 py-2 text-(--lp-chalk-3) transition-colors hover:text-(--lp-chalk) md:inline">
              After class
            </a>
            {signedIn ? (
              <Link href="/dashboard" className="ml-2 rounded-full border border-(--lp-line-strong) px-4 py-2 text-(--lp-chalk) transition-colors hover:border-(--lp-chalk-3)">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="rounded-full px-3 py-2 text-(--lp-chalk-3) transition-colors hover:text-(--lp-chalk)">
                  Log in
                </Link>
                <Link href="/signup" className="ml-1 rounded-full border border-(--lp-line-strong) px-4 py-2 text-(--lp-chalk) transition-colors hover:border-(--lp-chalk-3)">
                  Sign up
                </Link>
              </>
            )}
          </nav>
        </header>

        <Hero primaryHref={primaryHref} primaryLabel={primaryLabel} />

        {/* Why */}
        <section className="border-t border-(--lp-line) py-20 md:py-24">
          <Reveal>
            <p className="max-w-2xl text-[clamp(1.6rem,3vw,2.3rem)] leading-[1.2] text-(--lp-chalk-2) [font-family:var(--lp-serif)]">
              Made for the teacher with forty children, one period, a Hindi textbook — and{" "}
              <em className="text-(--lp-chalk) italic">a blackboard, not a projector.</em>
            </p>
          </Reveal>
          <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
            {NUMBERS.map((n, i) => (
              <Reveal key={n.value} delay={i * 0.1} className="border-t border-(--lp-line-strong) pt-6">
                <p className="text-[clamp(3rem,5vw,4.2rem)] leading-none text-(--lp-chalk) [font-family:var(--lp-serif)]">{n.value}</p>
                <p className="mt-4 max-w-[24ch] text-[15px] leading-relaxed text-(--lp-chalk-3)">{n.text}</p>
                {n.source && <p className="mt-3 font-mono text-[11px] tracking-wide text-(--lp-chalk-4) uppercase">{n.source}</p>}
              </Reveal>
            ))}
          </div>
        </section>

        {/* 01 — The kit */}
        <section id="kit" className="scroll-mt-8 border-t border-(--lp-line) py-20 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
            <Reveal>
              <SectionLabel n="01">The kit</SectionLabel>
              <Heading hi="नब्बे मिनट का काम, नब्बे सेकंड में।">
                Ninety seconds, <em className="text-(--lp-chalk-3) italic">not ninety minutes.</em>
              </Heading>
              <p className="mt-6 max-w-md text-[16px] leading-[1.75] text-(--lp-chalk-3)">
                Objectives first, then a plan timed to your period, then the worksheet and the exit quiz side by side.
                Each section lands on its own, so you can edit a line or send one back with a note —{" "}
                <span className="text-(--lp-chalk-2) italic">“isse aasaan banao.”</span>
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <KitPreview />
            </Reveal>
          </div>
        </section>

        {/* 02 — Trust */}
        <section className="border-t border-(--lp-line) py-20 md:py-28">
          <Reveal className="max-w-2xl">
            <SectionLabel n="02">Grounded, then checked</SectionLabel>
            <Heading hi="हर प्रश्न के साथ किताब का पन्ना।">
              The AI writes. <em className="text-(--lp-chalk-3) italic">Plain code checks it.</em>
            </Heading>
            <p className="mt-6 text-[16px] leading-[1.75] text-(--lp-chalk-3)">
              Every question carries the NCERT page it came from. Before you see the kit, a rule checker — not another
              AI — tests it. Anything that fails gets one repair attempt, and whatever is still wrong is shown to you, not hidden.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 lg:grid-cols-2">
            <Reveal className="rounded-3xl border border-(--lp-line) bg-(--lp-panel) p-6 md:p-7">
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-[0.18em] text-(--lp-leaf) uppercase">Exit quiz · Q2</p>
                <span className="rounded-full border border-(--lp-line-strong) px-2.5 py-0.5 font-mono text-xs text-(--lp-chalk-2)">NCERT p.22</span>
              </div>
              <p className="mt-5 text-[1.6rem] leading-tight text-(--lp-chalk) [font-family:var(--lp-serif)]">
                What happens when an acid and a base react together?
              </p>
              <ul className="mt-6 space-y-2">
                {QUIZ_OPTIONS.map((o) => (
                  <li
                    key={o.key}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-[15px] ${
                      o.correct ? "border-(--lp-leaf)/40 bg-(--lp-leaf)/8 text-(--lp-chalk)" : "border-(--lp-line) text-(--lp-chalk-2)"
                    }`}
                  >
                    <span className="font-mono text-xs text-(--lp-chalk-4)">{o.key}</span>
                    <span className="flex-1">{o.text}</span>
                    {o.correct ? (
                      <Check className="size-4 text-(--lp-leaf)" aria-label="Correct answer" />
                    ) : (
                      <span className="hidden font-mono text-[11px] text-(--lp-saffron) sm:inline">{o.tag}</span>
                    )}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.1} className="rounded-3xl border border-(--lp-line) bg-(--lp-panel) p-6 md:p-7">
              <div className="flex items-center justify-between">
                <p className="text-xs tracking-[0.18em] text-(--lp-sky) uppercase">Checker</p>
                <span className="font-mono text-xs text-(--lp-chalk-4)">12 rules · no AI</span>
              </div>
              <ul className="mt-6 divide-y divide-(--lp-line)">
                {CHECKS.map((c, i) => (
                  <Reveal key={c} as="li" delay={0.25 + i * 0.09} y={6} className="flex items-center gap-3 py-3.5 text-[15px] text-(--lp-chalk-2)">
                    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-(--lp-leaf)/15 text-(--lp-leaf)">
                      <Check className="size-3" aria-hidden />
                    </span>
                    {c}
                  </Reveal>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        {/* 03 — After class */}
        <section id="after-class" className="scroll-mt-8 border-t border-(--lp-line) py-20 md:py-28">
          <Reveal className="max-w-2xl">
            <SectionLabel n="03">After class</SectionLabel>
            <Heading hi="कल की शुरुआत, आज की ग़लती से।">
              Enter the quiz tally. <em className="text-(--lp-chalk-3) italic">See what they actually believe.</em>
            </Heading>
            <p className="mt-6 text-[16px] leading-[1.75] text-(--lp-chalk-3)">
              Every wrong option in the exit quiz is tied to a known misconception, so a quick count of hands becomes a map of
              the room. One tap adds a five-minute, blackboard-only fix to the start of tomorrow’s lesson.
            </p>
          </Reveal>
          <div className="mt-14">
            <LoopPreview />
          </div>
        </section>

        {/* 04 — Home */}
        <section className="border-t border-(--lp-line) py-20 md:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <SectionLabel n="04">At home</SectionLabel>
              <Heading hi="घर तक पहुँचे पढ़ाई।">
                A note home, <em className="text-(--lp-chalk-3) italic">in the language home speaks.</em>
              </Heading>
              <p className="mt-6 max-w-md text-[16px] leading-[1.75] text-(--lp-chalk-3)">
                What the class learned, tonight’s homework, and one thing to try with what’s already in the kitchen —
                short enough to send on WhatsApp, simple enough for a parent with no science background.
              </p>
            </Reveal>
            <Reveal delay={0.15} className="flex justify-center lg:justify-end">
              <div className="w-full max-w-sm rounded-3xl border border-(--lp-line) bg-(--lp-panel) p-4">
                <div className="flex items-center gap-3 border-b border-(--lp-line) px-2 pb-3">
                  <span className="grid size-9 place-items-center rounded-full bg-(--lp-saffron)/15 text-sm text-(--lp-saffron) [font-family:var(--lp-hindi)]">७</span>
                  <div>
                    <p className="text-sm text-(--lp-chalk)">Class 7-A Parents</p>
                    <p className="text-xs text-(--lp-chalk-4)">42 members</p>
                  </div>
                </div>
                <div className="mt-4 ml-auto max-w-[88%] rounded-2xl rounded-tr-md bg-[oklch(0.94_0.045_152)] px-4 py-3">
                  <p className="text-[15px] leading-[1.7] text-(--lp-chalk) [font-family:var(--lp-hindi)]" lang="hi">
                    आज कक्षा 7 विज्ञान में बच्चों ने अम्ल-क्षार के बारे में सीखा। घर पर पूछें: नींबू अम्ल है या क्षार? गृहकार्य: घर की 3 चीज़ों
                    को अम्ल/क्षार में बाँटना है।
                  </p>
                  <p className="mt-1.5 text-right font-mono text-[11px] text-(--lp-chalk-3)">4:05 pm ✓✓</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Close */}
        <section className="border-t border-(--lp-line) py-24 text-center md:py-32">
          <Reveal>
            <h2 className="mx-auto max-w-3xl text-[clamp(2.6rem,6vw,4.8rem)] leading-[0.98] text-(--lp-chalk) [font-family:var(--lp-serif)]">
              Tomorrow’s class is <em className="pe-[0.1em] text-(--lp-saffron) italic">one chapter</em> away.
            </h2>
            <p className="mt-4 text-2xl text-(--lp-chalk-3) [font-family:var(--lp-hindi)]" lang="hi">
              कल की कक्षा, बस एक अध्याय दूर।
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3">
              <Link
                href={primaryHref}
                className="group inline-flex h-12 items-center gap-2 rounded-full bg-(--lp-saffron) px-6 text-[15px] font-semibold text-white transition-[transform,background-color] duration-200 hover:bg-(--lp-saffron-hi) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--lp-saffron) active:scale-[0.97]"
              >
                {primaryLabel}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <DemoButton />
            </div>
          </Reveal>
        </section>

        <footer className="flex flex-col gap-3 border-t border-(--lp-line) py-8 text-sm text-(--lp-chalk-4) md:flex-row md:items-center md:justify-between">
          <p>
            <span className="text-(--lp-chalk-3) [font-family:var(--lp-hindi)]" lang="hi">शिक्षक साथी</span> · Built at Hack-e-Awadh 2026 by
            Team NawabiCoders, Lucknow
          </p>
          <p>Lesson content grounded in NCERT textbooks.</p>
        </footer>
      </div>
    </div>
  );
}
