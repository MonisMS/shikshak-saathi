# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev              # Next.js dev server (Turbopack)
npm run build             # production build — also type-checks and prerenders
npm run lint              # eslint (flat config, eslint-config-next)
npx tsc --noEmit          # type-check only, faster than a full build
npx prisma migrate dev --name <name>   # apply a schema change (uses DIRECT_URL)
npx prisma generate       # regenerate the client into src/generated/prisma (also runs on postinstall)
npx next typegen          # regenerate Next's typed-route helpers (PageProps<'/...'>, RouteContext<'/...'>) after adding/renaming a route — needed before tsc will recognize a new dynamic route
npm run db:seed           # tsx prisma/seed.ts
```

There is no test script/framework in this repo. Verification is `tsc --noEmit` + `lint` + `build`, plus manually exercising routes (e.g. with `curl` against a real session cookie) since most of the app requires a live Postgres + a real Gemini key to do anything meaningful.

## Architecture

This is a Next.js 16 App Router app (`src/proxy.ts`, **not** `middleware.ts` — Next 16 renamed it) built for a one-day hackathon by three people; the git history alternates between contributors and things are still being wired together. Auth is Better Auth 1.7.6, DB is Prisma 7.10 + Postgres (Neon), AI is Gemini via `@google/genai` with an OpenRouter fallback.

### Auth: two different session helpers, not interchangeable

`src/lib/session.ts` exports two functions and picking the wrong one breaks things silently:

- `requireTeacher()` — for Server Components/pages. Calls `redirect("/login")` internally on no session. **Never wrap a call to this in try/catch** — `redirect()` throws a special Next error that must propagate up to Next's router; catching it turns a login redirect into a generic error.
- `getAuthedTeacher()` — for Route Handlers (API routes). Returns the user or `null`; never redirects, because a redirect response isn't something a `fetch()` caller can treat as JSON. Routes check for `null` and return their own `401 NextResponse.json`.

`src/lib/scope.ts` has `getKitForTeacher(kitId, teacherId)` / `getClassroomForTeacher(...)` — both throw a plain `NotFoundError` (safe to try/catch, unlike the redirect above) when the row doesn't exist or isn't owned by that teacher. Every query on teacher-owned data must filter by `teacherId`, either through these helpers or an inline `where: { teacherId }`.

### AI pipeline (`src/lib/ai/`)

- `schemas.ts` — every section's zod schema, plus `SECTION_SCHEMAS: Record<SectionType, ZodType>` keyed by the Prisma `SectionType` enum. **Import `SectionType`/other Prisma enums from `@/generated/prisma/enums`, not `@/generated/prisma/client`, in anything reachable from a `"use client"` component.** The full client pulls in Node-only internals (`pg`, engine loading) that Turbopack cannot bundle for the browser — this has broken production builds before (`the chunking context ... does not support external modules`). `enums.ts` is a pure object file made for exactly this.
- `gemini.ts` — `generateJSON({schema, system, user, model?, demoCache?})`: rotates through `GEMINI_API_KEYS` on 429/5xx, falls back to `gemini-3.5-flash`, then to OpenRouter (`openrouter.ts`, plain `fetch`, no SDK), then to a `DEMO_MODE` cache read from `data/demo-kits/<chapterId>.json`. Free-tier Gemini rate-limits hard on a single key under repeated calls — a 500 with `"OpenRouter is not configured"` during manual testing usually just means the Gemini key got rate-limited and there's no real `OPENROUTER_API_KEY` set; retry after a pause rather than assuming a bug.
- `pipeline.ts` — `SECTION_DEPS`: which sections need which other sections READY first (OBJECTIVES → LESSON_PLAN → everything else in parallel → PARENT_NOTE).
- `prompts/*.ts` — one builder per section, each returning `{system, user}`. `context.ts` holds the shared `PromptContext` type and per-grade language-register text (NEP 2020 stage names — foundational/preparatory/middle/secondary/senior-secondary — not UK "key stage" wording, since some prompt logic was adapted from a UK-schools reference project).
- Chapter text is pre-extracted into `Chapter.pagesEn` (JSON) at seed time (`src/lib/chapters.ts`); prompt builders receive already-loaded `chapterText: string`, they don't fetch chapters themselves.

### One route drives all section generation

`POST /api/kits/[id]/sections/[type]` generates or regenerates a single section (body `{instruction?}` for "regenerate with an instruction", `{repair?: string[]}` for the validator's one repair attempt); `PATCH` on the same route saves a teacher's manual edit. The client polls/orchestrates section-by-section (see `src/components/kit/use-kit-generation.ts`) rather than one endpoint generating a whole kit — each Gemini call is its own request, sections after `LESSON_PLAN` run in parallel.

`src/lib/validate.ts` (rules `R1`–`R12`) is deterministic, no AI — it runs after generation, auto-fixes what it can (retiming sections to match the period length, recomputing worksheet totals), and returns per-section failures that get fed back into one repair regeneration.

`src/lib/misconceptions.ts` is pure analytics over a quiz's tally data (`{questionId: {optionKey: count}}`) — turns wrong answers into a ranked misconception list, per-question accuracy, and per-objective mastery bands. It has no DB/AI dependency, so it's usable anywhere the tally data is available.

### Reference material lives outside this repo

`roadmap.md`, `TEAM_TASKS.md`, `research/`, and `references/` (cloned reference repos with mixed licenses) are sibling directories one level up (`../roadmap.md` etc.), not part of this git repo — they're the hackathon's build spec and prior-art references, deliberately excluded from version control. Code patterns adapted from a `references/*` repo are credited in `README.md`'s Credits section; check a reference's license before adapting more than an idea from it.
