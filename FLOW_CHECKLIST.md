# FLOW_CHECKLIST.md — Start-to-end test sheet

Built from `roadmap.md` §3 (ticked features), §4 (user journey) and §5 (pages/APIs), checked against the code on 26 Sep 2026.
`tsc --noEmit` and `npm run lint` both pass, so what's broken is **missing pages/routes and wiring**, not compile errors.

**How to use:** run `npm run dev`, walk the steps in order, fill the **Result** column (✅ / ❌ / ⚠️) and write what you saw in **Notes**.
**Code status** key: 🟢 built and wired · 🟡 built with a known gap · 🔴 missing (will 404 or do nothing)

---

## 0. Pre-flight (do these first or everything below fails)

| # | Check | How | Code status | Result | Notes |
|---|---|---|---|---|---|
| 0.1 | `.env` has DB + auth + AI keys | `DATABASE_URL`, `DIRECT_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GEMINI_API_KEYS`, `OPENROUTER_API_KEY` set | 🟡 `SARVAM_API_KEY` is empty | | |
| 0.2 | `GEMINI_MODEL` value | PROGRESS.md says it was switched to `gemini-3.5-flash` because 3.8 returned 503. Decide which one to use | 🟡 | | |
| 0.3 | DB migrated | `npx prisma migrate dev` → "already in sync" | 🟢 | | |
| 0.4 | DB seeded (4 chapters + demo teacher) | `npm run db:seed` → `c7-sci-02, c7-sci-03, c7-math-01, c6-sci-04` + `demo@shikshak.app` | 🟢 | | |
| 0.5 | Dev server boots | `npm run dev`, open http://localhost:3000 | 🟢 | | |
| 0.6 | Uncommitted work | `git status` shows changes in `dashboard/page.tsx`, `globals.css`, `layout.tsx`, `app-sidebar.tsx`, new `components/motion/` — commit or stash so you know what you're testing | 🟡 | | |

---

## 1. Main flow (the demo path, in order)

| # | Step (roadmap §4) | URL / API | Feature | What should happen | Code status | Result | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Landing page | `/` → `src/app/page.tsx` | F51b, F04 | Hero in Hindi+English, 3-step visual, **Start free / Login / Try demo** buttons | 🔴 **Still the default create-next-app template** (Next.js logo, Vercel links). No way to reach login/demo from `/` | | |
| 2 | Sign up | `/signup` → `POST /api/auth/sign-up/email` | F01 | Create account → redirect to `/onboarding` | 🟢 | | |
| 3 | Log in | `/login` → Better Auth | F01 | Login → `/dashboard` (or `/onboarding` if not onboarded) | 🟢 | | |
| 4 | Try demo | `/login` "Try demo" → `POST /api/demo/login` | F04 | Logs in as seeded demo teacher → `/dashboard` | 🟢 (button only on `/login`, not on landing) | | |
| 5 | Route protection | `src/proxy.ts` | F01 | Logged-out visit to `/dashboard` or `/kits/*` → redirect `/login` | 🟢 | | |
| 6 | Onboarding (3 steps) | `/onboarding` → `POST /api/onboarding` | F05 | About you → classrooms (incl. multi-grade) → preferences; saves, then `/dashboard` | 🟢 | | |
| 7 | Dashboard | `/dashboard` → `src/lib/dashboard.ts` | F06 | Greeting, New kit button + mic, 4 stat cards, recent kits, pending results, top misconceptions | 🟡 page has uncommitted edits — re-check it renders | | |
| 8 | Sidebar nav | `nav-links.ts` | — | Dashboard / New kit / My kits / Settings | 🔴 **Settings links to `/settings`, which doesn't exist → 404** | | |
| 9 | New kit — pick chapter | `/kits/new` → `new-kit-form.tsx` | F07 | Class → Subject → Chapter cascade from DB; page range optional | 🟢 | | |
| 10 | New kit — type topic | same, "Type topic" tab | F08 | Topic + class + subject instead of chapter | 🟢 | | |
| 11 | New kit — voice | Mic → `POST /api/voice/transcribe` → `POST /api/voice/parse` | F31 | Speak "Class 7 science chapter 2 Hindi" → form fills | 🟡 **`/api/voice/transcribe` doesn't exist** and `SARVAM_API_KEY` is empty → should fall back to browser Web Speech (Chrome only). Test in Chrome | | |
| 12 | New kit — options | same form | F28, F37, F49 | Classroom, date, period length, Hindi/English, low-resource switch, parent-note checkbox | 🟢 | | |
| 13 | Generate kit | `POST /api/kits` | F07/F08 | Creates kit + PENDING section rows → redirect to `/kits/[id]` | 🟢 | | |
| 14 | Objectives generated | `POST /api/kits/[id]/sections/OBJECTIVES` | F10 | 3–5 Bloom-tagged objectives with page refs; pill goes writing → done | 🟢 | | |
| 15 | Lesson plan generated | `…/sections/LESSON_PLAN` | F11, F12, F13, F48 | Timed sections summing to period length, teacher script, misconceptions M1…, keywords, homework | 🟢 | | |
| 16 | Worksheet + exit quiz (parallel) | `…/sections/WORKSHEET`, `…/EXIT_QUIZ` | F14, F15 | Worksheet with answer key; 3–5 MCQs, every wrong option tagged with a misconception | 🟢 | | |
| 17 | Parent note generated | `…/sections/PARENT_NOTE` | F49 | Only if checkbox ticked; short Hindi/English note | 🟢 | | |
| 18 | Status pills + resume | `use-kit-generation.ts` | F18 | Cards appear one by one; refreshing mid-way resumes only the remaining sections | 🟢 | | |
| 19 | Checker panel + auto-repair | `POST /api/kits/[id]/validate` | F22 | Rules R1–R12 green/red in left pane; one automatic repair round | 🟢 | | |
| 20 | Page-ref chips + source drawer | section cards | F23 | Chips show `p.N` on questions; click → drawer with chapter text | 🟡 chips render; **no source-text drawer found** (no Sheet/drawer in kit cards, `GET /api/chapters/[id]` exists but unused by UI) | | |
| 21 | DIKSHA resources panel | `GET /api/kits/[id]/diksha` | F66 | Related DIKSHA resources in left pane | 🔴 **Not built** (no route, no component) | | |
| 22 | Inline edit | `PATCH /api/kits/[id]/sections/[type]` | F19 | Edit → Save persists; checker re-runs | 🟢 | | |
| 23 | Regenerate with instruction | `POST …/sections/[type]` `{instruction}` | F20 | "make it easier" → section rewritten; stale quiz warning if plan changed | 🟢 | | |
| 24 | Export page | `/kits/[id]/export` | F24, F25 | Checklist Ready/Not generated; Print, One-page, Download Word | 🟢 | | |
| 25 | Print / PDF | `/kits/[id]/print?doc=all` | F24 | A4 print layout, Hindi renders correctly, answer key on separate page | 🟢 | | |
| 26 | Word export | client-side `export-docx.ts` | F25 | `.docx` downloads, Hindi text readable in Word | 🟢 | | |
| 27 | *(teacher teaches offline)* | — | — | — | — | — | — |
| 28 | Enter quiz results | `/kits/[id]/results` → `POST /api/kits/[id]/results` | F40 | Tally grid, +/− per option, students present; save creates misconception rows | 🟢 (409 unless EXIT_QUIZ + LESSON_PLAN are READY) | | |
| 29 | Insights / misconception map | `/kits/[id]/insights` | F44 | "12/40 think X" bars, per-question accuracy, per-objective mastery | 🟢 | | |
| 30 | Add 5-min fix to tomorrow | `POST /api/kits/[id]/fixes` | F46 | Generates remedial activities, saves FixActivity rows, returns `targetKitId` | 🟢 | | |
| 31 | Day-2 kit starts with the fix | Day-2 kit → LESSON_PLAN generation | F47 | Plan's first block is "Start with: fix for yesterday's mistake" | 🔴 **Broken:** fixes route creates the Day-2 kit, but the section route never passes `focusFix` to `buildLessonPlanPrompt` (`src/app/api/kits/[id]/sections/[type]/route.ts:127`), so the Day-2 plan is a normal plan with no fix | | |
| 32 | Parent note editor | `/kits/[id]/parent` | F49 | Edit fields, language, live WhatsApp preview, save | 🟢 | | |
| 33 | WhatsApp share + public link | `wa.me` button, `/p/[token]`, `POST /api/kits/[id]/parent-note` | F50 | Share on WhatsApp, Copy, public read-only page with view counter | 🔴 **Not built** — editor has preview only; no share button, no token, no `/p/[token]` page | | |
| 34 | My kits (history) | `/kits` → `GET /api/kits` | F51 | List with filters/search, duplicate, delete | 🟢 | | |
| 35 | Hindi/English UI toggle | top bar, `i18n.ts` | F29 | Toggle switches UI strings | 🟢 (latest commit) | | |
| 36 | Settings | `/settings` | F62a | Profile, preferences, defaults | 🔴 **Not built** | | |
| 37 | Demo safety mode | `DEMO_MODE=true` → `data/demo-kits/<chapterId>.json` | D8 | Cached kits served if Gemini/Wi-Fi fails | 🔴 **`data/demo-kits/` folder doesn't exist** — DEMO_MODE has nothing to serve | | |
| 38 | Deploy | Vercel | — | Public live URL for submission | 🟡 Preview is behind Vercel SSO; no prod deploy yet (PROGRESS.md P0.2) | | |

---

## 2. Fix list, in priority order

| Priority | # | Problem | Where | Suggested fix |
|---|---|---|---|---|
| P1 | 1 | Landing page is the Next.js template | `src/app/page.tsx` | Replace with hero + 3-step visual + Start free / Login / Try demo |
| P1 | 31 | Day-2 plan ignores the fix | `sections/[type]/route.ts` LESSON_PLAN case | Load `FixActivity` rows where `targetKitId = kit.id` and pass them as `focusFix` to `buildLessonPlanPrompt` |
| P1 | 8, 36 | Settings link → 404 | `nav-links.ts` / `src/app/(app)/settings/page.tsx` | Build a simple settings page, or remove the link |
| P1 | 38 | No public demo URL | Vercel | Prod deploy or disable Preview protection |
| P2 | 33 | No WhatsApp share / public parent page | `parent-note-editor.tsx`, new `src/app/p/[token]/page.tsx` | `wa.me/?text=` button + share token + public page |
| P2 | 37 | DEMO_MODE has no cache | `data/demo-kits/` | Save one fully generated kit per chapter as JSON keyed by SectionType |
| P2 | 11 | Sarvam transcribe route missing | `src/app/api/voice/transcribe/route.ts` | Build it, or accept Web Speech fallback (Chrome only) |
| P3 | 20 | No source-text drawer on page chips | kit cards | Chip click → Sheet showing `GET /api/chapters/[id]` page text |
| P3 | 21 | DIKSHA panel missing | new route + component | Build, or untick F66 in roadmap |

---

## 3. Features that are OFF in roadmap §3 (not bugs — don't test)
F02, F03, F16, F17, F18b, F21, F26, F27, F30, F32–F36, F38, F39, F41–F43, F45, F52–F61, F62–F65, F67–F70.
