# TEAM_TASKS.md — who builds what (Hack-e-Awadh, 26 Sep 2026)

This file **overrides the owner letters in `roadmap.md` §13/§14**. Task IDs (P1.2, P7.5 …) refer to `roadmap.md` §13. Only build features that are ticked `[x]` in `roadmap.md` §3.

| Member | Role today | Load |
|---|---|---|
| **Monis** (M) | Repo + deploy + database, frontend, AI backend: every main screen and the whole AI pipeline | Heavy |
| **Ujjwal** (U) | Backend: auth, seed, non-AI APIs, exports, demo mode | Heavy |
| **Ansh** (A) | Small, self-contained pieces in **his own files** (no shared core files), plus slides and the demo video | Light, but real code with his own commits |

**Why Ansh needs real commits:** the rules say every member presents the part they personally built, and the commit history is checked. So Ansh gets small but genuine features he can show and explain: the landing page, Hindi UI strings, the public parent-note page with read-aloud, settings, the help page and the README. They're low-risk because they live in files nobody else edits.

**Folder ownership (avoids merge conflicts):**
- **M:** repo settings, Vercel, Neon, `prisma/schema.prisma` + `prisma/migrations/**` + `prisma.config.ts`, `src/lib/db.ts`, `.env.example`, `src/lib/ai/**`, `src/lib/validate.ts`, `src/lib/misconceptions.ts`, `src/app/(app)/kits/**`, `src/app/(app)/dashboard/**`, `src/components/kit/**`, `src/components/results/**`, `src/components/voice/**`
- **U:** `prisma/seed.ts`, `data/**`, `src/proxy.ts`, `src/lib/{auth,auth-client,session,scope,activity,chapters,export-docx,diksha}.ts`, `src/app/api/**` (except `api/kits/[id]/sections/**` and `api/voice/parse`, which belong to M), including `api/voice/transcribe` + `api/voice/tts` (Sarvam proxies), `src/app/(auth)/**`, `src/app/(app)/onboarding/**` (ask Monis to change the schema; don't edit it directly)
- **A:** `src/app/page.tsx` (landing), `src/app/p/[token]/**`, `src/app/(app)/settings/**`, `src/app/(app)/help/**`, `src/lib/i18n.ts`, `src/components/landing/**`, `README.md`, `LICENSE`, `CREDITS` section, `data/misconceptions-notes.md`, slides, video

---

## Monis — Frontend + AI (heavy)

| # | Time | Task | Roadmap ref | Done when |
|---|---|---|---|---|
| M0 | 11:00–11:25 | **Repo + deploy**: create the public repo, run the scaffold (`roadmap.md` §8), push; create the Neon DB (pooled + direct URLs); link Vercel, set env vars, **first deploy live**. Add Ujjwal + Ansh as collaborators | P0.1, P0.2, §7.3, §8 | Live URL loads; teammates can push |
| M0b | 11:25–11:50 | **Database**: Prisma schema (with the §9 changes) + `prisma.config.ts` + migrate + `src/lib/db.ts` → push so Ujjwal can start auth | P1.1, §9 | Tables visible in Prisma Studio |
| M1 | 11:50–12:10 | `src/lib/ai/schemas.ts` (all zod schemas) + `src/lib/mock/kit.ts` (a full mock kit) → push by 12:10 | P0.4, §10.4 | `tsc` passes |
| M2 | 12:10–12:30 | App shell: fonts (Noto Sans + Devanagari), sidebar layout `(app)/layout.tsx` | P0.3 | `/dashboard` shows the shell |
| M3 | 12:30–13:00 | Gemini wrapper + **OpenRouter fallback** (`research/voice-and-fallback.md` §5) + DEMO_MODE + system prompt + prompt builders (objectives, plan, worksheet, exit quiz) | P3.1, P3.2, §10.2–10.5 | Script prints valid Objectives JSON |
| M4 | 13:00–13:30 | Section route `POST /api/kits/[id]/sections/[type]` (generate + regenerate + repair) | P3.4, §10.1 | 4 sections READY via curl |
| M5 | 13:00–13:45 | `/kits/new` form (chapter picker + typed topic + options) and the kit page: generation orchestration, section cards, status pills | P4.1–P4.3 | **Gate 1 (13:45):** chapter in → kit out on the live URL |
| M6 | 13:30–14:15 | Inline edit + Regenerate button with instruction; mark the quiz "out of date" when the plan changes | P5.1, P5.2 | Edit survives reload; "make it easier" works |
| M7 | 14:00–14:30 | Validator R1–R12 + `/validate` route + CheckerPanel UI + one repair round | P5.3, §10.6 | Red row, then auto-fixed |
| M8 | 14:15–14:45 | Print page `/kits/[id]/print` (plan, worksheet, answers, quiz, quiz key; one-page option) | P6.1, P6.3, §12.1 | Hindi PDF prints correctly |
| M9 | 14:30–15:00 | Results tally UI + insights page + `misconceptionCounts` + FIX prompt + "Add 5-min fix to tomorrow" UI | P7.1 (UI), P7.3, P7.5 (AI + UI), §10.7 | **15:00 gate:** full loop live |
| M10 | 15:00–15:30 | PARENT_NOTE section + `/kits/[id]/parent` editor UI | P8.2 | Note generated in Hindi |
| M11 | 15:00–15:40 | Dashboard page UI (widgets from `/api/dashboard`), Hindi content toggle, **Sarvam mic button** (MediaRecorder → Ujjwal's `/api/voice/transcribe`, Web Speech fallback) + `/api/voice/parse` | P9.1 (UI), P10.1, P10.4, §12.4 | Speaking Hindi fills the form |
| M12 | 15:40–16:05 | Bugs only. Run the demo twice on the live URL | P14.6 | — |
| — | if ahead | Ticked extras: multi-grade (P11.2), blackboard (P11.3), starter quiz (P12.1), summative (P12.2), translate (P10.3) | §13 P10–P12 | — |

**Presents:** architecture + deployment + data model, kit generation live, the checker, and the results → misconception → next-day fix loop.

---

## Ujjwal — Backend + Infra (heavy)

| # | Time | Task | Roadmap ref | Done when |
|---|---|---|---|---|
| U1 | 11:00–11:50 | While Monis sets up the repo/DB: accept the repo invite; read `roadmap.md` §9–§11; prepare `data/chapters.json` from §11.1 and copy the NCERT PDFs into `data/ncert/`; write the seed script's extraction part against local files (unpdf) | P2.1 (prep), §11 | Extraction prints readable English pages locally |
| U3 | 11:50–12:30 | Better Auth + auth route + `proxy.ts` + `requireTeacher` + `scope.ts` helpers; login/signup pages | P1.2, P1.3, P1.4 | Signup/login/logout work; other teachers' kits return 404 |
| U4 | 12:30–13:00 | Onboarding page + `POST /api/onboarding` (profile, classrooms, prefs) | P1.5 | New teacher lands on the dashboard |
| U5 | 12:30–13:15 | Seed: chapters from `data/chapters.json` (unpdf English pages), demo teacher + classrooms, `/api/demo/login`, `GET /api/curriculum`, `GET /api/chapters/[id]` | P2.1, P2.3, P2.4, §11 | `db seed` gives 4 readable chapters; Try demo works |
| U6 | 13:00–13:30 | `POST /api/kits` (create kit + section rows), `GET /api/kits`, `GET /api/kits/[id]`, `PATCH` section edits, delete/duplicate | P3.3, P5.1 (API), P9.2 (API) | Kit rows created and fetched |
| U7 | 13:30–14:00 | Save the first real kit as `data/demo-kits/c7-sci-02.json`; seed 2–3 historical kits with results/misconceptions/fixes for a full dashboard | P2.3 (history) | Demo dashboard shows non-zero stats |
| U8 | 14:00–14:30 | `POST /api/kits/[id]/results` (QuizSession + tallies → call M's `misconceptionCounts` → Misconception rows); attach-to-tomorrow DB logic for fixes (find/create the Day-2 kit) | P7.1 (API), P7.5 (DB part) | Misconception rows saved; Day-2 kit created |
| U9 | 14:00–14:45 | DOCX export (`lib/export-docx.ts`, client-side) + export page buttons | P6.2, P6.4, §12.2 | Hindi DOCX opens in Word |
| U10 | 14:45–15:15 | `logActivity` helper wired into all actions + `GET /api/dashboard` aggregates | P9.1 (API) | JSON has every widget's data |
| U11 | 15:00–15:30 | `POST /api/kits/[id]/parent-note` (share token) + `GET` public note API + view counter; rate limit (F57) if ticked | P8.3 (API), P3.5 | Token URL returns the note logged out |
| U12 | 14:45–15:15 | **Sarvam voice routes**: `POST /api/voice/transcribe` (multipart → `saaras:v3`, `mode=codemix`) and `POST /api/voice/tts` (`bulbul:v3`, speaker `ritu`, chunk ≤2,500 chars) | P10.4, §12.4, `research/voice-and-fallback.md` §1–§3 | curl with a Hindi voice note returns a Devanagari transcript; TTS returns playable audio |
| U12b | 15:30–15:40 | DIKSHA route (if F66 ticked) | P12.4, §11.3 | 3–5 links returned |
| U13 | 15:40–16:05 | DEMO_MODE tested on a second Vercel deployment (Monis gives Vercel access); incognito phone test | P14.2 | Whole demo runs with `DEMO_MODE=true` |

**Presents:** NCERT seeding, login and onboarding, the kit/results/dashboard APIs, Word export, and the parent note link.

---

## Ansh — Light tasks (each one is his own commit)

These are all **isolated files**, so nothing he does can break the core. Each task is small enough to finish and explain.

| # | Time | Task | Files | Done when | Commit message |
|---|---|---|---|---|---|
| A1 | 11:15–11:45 | **LICENSE + README skeleton**: MIT licence with "2026 Team NawabiCoders"; README headings from `roadmap.md` §15.3 filled with the problem + team | `LICENSE`, `README.md` | Both files on GitHub | `docs: add MIT licence and README skeleton` |
| A2 | 11:45–12:30 | **Demo data notes**: 4–5 real misconceptions for Class 7 Science Ch 2 (acids/bases) and Ch 3, in Hindi + English, used to sanity-check AI output | `data/misconceptions-notes.md` | Monis confirms they're useful | `docs: add teacher-verified misconceptions for demo chapters` |
| A3 | 12:30–13:30 | **Landing page** `/`: hero (Hindi + English line), 3-step visual (Chapter → Kit → Next-day fix), buttons **Start free** / **Login** / **Try demo** (Try demo calls `POST /api/demo/login` from Ujjwal) | `src/app/page.tsx`, `src/components/landing/*` | Looks good on laptop + phone | `feat: landing page with try-demo` |
| A4 | 13:30–14:15 | **Hindi UI dictionary** `src/lib/i18n.ts`: `{ en: {...}, hi: {...} }` for sidebar labels, main buttons, page titles (~40 strings) + a `t(key, lang)` helper. Monis wires it in. | `src/lib/i18n.ts` | Every sidebar/button string has a Hindi version | `feat: hindi/english UI strings` |
| A5 | 14:15–15:00 | **Public parent-note page** `/p/[token]`: mobile-first card showing learnedToday, homework, home activity, questions to ask the child; language toggle; big readable Devanagari; a **🔊 सुनें / Listen** button that sends the note text to `/api/voice/tts` and plays the audio (for parents who can't read well). Uses Ujjwal's public API (build against the sample JSON first). | `src/app/p/[token]/page.tsx` | Opens on a phone, no login | `feat: public parent note page` |
| A6 | 15:00–15:30 | **Settings page** `/settings`: form for name, school, district, default language, period length, low-resource default (saves via Ujjwal's user-update call or Better Auth `updateUser`) | `src/app/(app)/settings/page.tsx` | Saving updates the profile | `feat: teacher settings page` |
| A7 | 15:30–15:45 | **Help page** (optional, F70): "How it works" in 4 steps + FAQ | `src/app/(app)/help/page.tsx` | Page renders | `feat: help page` |
| A8 | 15:40–16:05 | **README final**: screenshots, live link, demo login, what works / what doesn't table, contribution note, Credits (Oak Aila, Shiksha Copilot, QuizScanner if used) | `README.md`, `docs/screenshots/*` | Judges can run the app from the README | `docs: final README with screenshots and credits` |
| A9 | all day (parallel) | **Slides** (6, per roadmap §15.2) and the **≤3-min demo video** recording at 15:45 | not in repo | Uploaded, links in README | — |

**Presents:** the landing page and "Try demo", the Hindi interface, and the parent page on a phone. He opens the demo (0:00–0:40 of the script).

### Git basics for Ansh (do this once at 11:00)
```bash
git config --global user.name "Ansh Kumar Vishwakarma"
git config --global user.email "<the email on his GitHub account>"   # must match GitHub so commits count
git clone <repo-url> && cd shikshak-saathi && npm install
# for each task:
git pull --rebase
# ...edit only your files...
git add <your files>
git commit -m "feat: landing page with try-demo"
git push
```
If `git push` is rejected: run `git pull --rebase`, then `git push` again. If there's a conflict in a file that isn't his, stop and call Monis. **Never** `git push --force`.

---

## Sync points (all three, 5 min each)
| Time | Check |
|---|---|
| 11:30 | Repo live + deployed (M); everyone cloned |
| 12:10 | DB migrated + schemas/mock kit pushed (M); LICENSE/README (A) |
| 13:45 | **Gate 1:** chapter → kit on the live URL. Landing page merged |
| 15:00 | **Gate 2:** tally → misconception → fix loop live. Parent page merged |
| 15:40 | **Feature freeze.** Bugs only; README, video, slides |
| 16:20 | **Final push.** Submit at 16:30: repo, live URL, video, slides, contribution note, mentor name |

## Contribution note (paste into README; edit to match reality)
- **Syed Monis Sarwar**: Set up the repo, Vercel deployment and Neon Postgres + Prisma schema; built the frontend screens (kit creation, kit editor with regenerate, checker panel, print layout, results and misconception map, dashboard, Sarvam voice input) and the AI pipeline (Gemini JSON-schema calls with OpenRouter fallback, section prompts in Hindi/English, validator, misconception → next-day fix, parent note generation).
- **Ujjwal Gupta**: Built the backend: NCERT chapter seeding with page text, Better Auth login and route protection, onboarding, kit/results/dashboard APIs, Word export, parent-note sharing, Sarvam voice routes, demo mode.
- **Ansh Kumar Vishwakarma**: Built the landing page with try-demo, the Hindi/English UI strings, the public parent-note page, the settings and help pages, and the README; made the slides and demo video.
