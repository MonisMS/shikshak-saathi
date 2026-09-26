# ROADMAP.md — Shikshak Saathi (शिक्षक साथी)

**Hack-e-Awadh 2026 · PS-01 Teacher Lesson Planning Agent · Team NawabiCoders (Lucknow)**
Build day: **Saturday 26 Sep 2026, ~11:00 → submission 16:30 sharp** (target final push 16:20).
**Build model: Claude Sonnet 5** (coding agent in Claude Code / Cursor). Compiled 25 Sep 2026 from three research reports (in `research/`): `agent1-product-flow.md`, `agent2-ai-pipeline.md`, `agent3-stack-execution.md`. Versions, URLs and model IDs were checked live on 25 Sep 2026.

> **One line:** A teacher logs in, picks *Class → Subject → NCERT chapter* (typed or spoken, Hindi or English), and gets learning objectives, a timed lesson plan, a worksheet with answer key and a formative exit quiz. Every item carries NCERT page references and passes code-based checks. After class, the teacher enters quiz results; the app shows which misconceptions the class holds and adds a 5-minute fix to tomorrow's plan, plus a parent homework note on WhatsApp.

---

## 0. HOW TO USE THIS FILE (read first — humans and coding agents)

### 0.1 For the team (humans)
1. Open **§3 Feature Registry**. Every feature has an ID (F01…), a tier and an `Include` box.
   - **Core** features are pre-ticked `[x]`: PS-01 MVP requires them. Don't untick them.
   - **Bonus** and **Stretch** features are unticked `[ ]`. **You decide.** Tick `[x]` the ones you want built.
2. The build phases in **§13** are in **priority order**. The team works top to bottom. A task whose feature is unticked is **skipped**.
3. **Rules reminder:** all code must be written on 26 Sep in a repo created that day. This file is a *plan*. The code snippets in it are references taken from public docs; the coding agent writes the actual files fresh on the day. Tonight, prepare only **data, accounts, slides and printouts** (§17).

### 0.2 For the coding agent (AI model reading this) — HARD RULES
Follow these exactly. If an instruction here conflicts with what you "usually do", **this file wins**.

1. **Work phase by phase, task by task, in the order in §13.** Do not start a task until the previous task's *Acceptance* checks pass.
2. **Only build features ticked `[x]` in §3.** If a task lists `Feature: F37` and F37 is `[ ]`, skip the task and write "SKIPPED (feature off)" in your progress log.
3. **Do not change package versions** from §7.1. Especially:
   - install `prisma@7.10.0` and `@prisma/client@7.10.0` exactly (npm `latest` is an 8.x release candidate — **do not use it**);
   - Next.js 16 uses **`src/proxy.ts`** exporting `proxy()`. **Never create `middleware.ts`.**
4. **Gemini model IDs:** use `gemini-3.8-flash` (main) and `gemini-3.1-flash-lite` (fast). **Never** use `gemini-2.x` / `gemini-1.5` IDs from old tutorials — they are shut down.
5. **Use the SDK `@google/genai`** (`ai.models.generateContent` with `responseMimeType: "application/json"` + `responseJsonSchema`). Do **not** use the old `@google/generative-ai` package.
6. **Every database query on teacher data must filter by `teacherId`** (the logged-in user id). Use helpers in `src/lib/scope.ts` (§13 P1).
7. **Never send student names to the AI.** Use roll numbers / `S01`-style ids only.
8. **Never extract text from Hindi NCERT PDFs with `unpdf`/`pdftotext`** — the output is corrupted (verified). See §11.2.
9. **PDF export = browser print** (`window.print()` + print CSS + Noto Sans Devanagari). Do **not** use `@react-pdf/renderer` or server-side Chromium.
10. After each task: run `npm run build` (or at least `npx tsc --noEmit` + `npm run lint`), fix errors, then **commit** with a conventional message (`feat: …`, `fix: …`, `docs: …`). Push at least every 30 minutes.
11. Keep AI calls **one section per HTTP request** (§10.1). Never generate the whole kit in one call.
12. If you are unsure, pick the simplest option that satisfies the *Acceptance* checks. Do not add libraries not listed in §7.1 without a reason written in the commit message.
13. Maintain `PROGRESS.md` in the repo root: one line per task — `P3.2 ✅ done`, `P6.4 ⏭ skipped (F27 off)`, `P7.1 ⚠️ partial: <why>`.

### 0.3 Build model = Claude Sonnet 5 — how to use references (READ THIS)
This roadmap deliberately contains **specs and references, not full code**. Code you write from memory for fast-moving libraries (Next 16, Prisma 7, Better Auth, `@google/genai`, zod 4) is where hallucinations happen. For every task:

1. **Open every file listed under "Reference" for the task before you write code.** Use the Read tool on the exact path (and line range if one is given). The references live **outside the app repo**:
   - `/home/monis/awadh-hack/research/` — our verified notes with working snippets (`agent1-product-flow.md`, `agent2-ai-pipeline.md`, `agent3-stack-execution.md`). **These are the primary source for code patterns.** Line numbers in this roadmap point into these files.
   - `/home/monis/awadh-hack/references/<repo>/` — shallow clones of the reference repos (list and licences in §19.1).
   - `/home/monis/awadh-hack/research/roadmap-v1-with-code.md` — an older version of this roadmap that has inline code for the Prisma schema, zod schemas, wrapper, auth and extraction. Use it as a **cross-check only**; if it disagrees with this file, **this file wins**.
2. **If a path or line range doesn't match** (files move), search inside that same repo with Grep for the named function or identifier. **Never invent the contents of a reference.** If you can't find it, write `REF NOT FOUND: <path>` in `PROGRESS.md` and implement from the spec text in this roadmap.
3. **Library APIs:** when unsure of a signature, read the installed typings in `node_modules/<pkg>/` (for example `node_modules/@google/genai/dist/*.d.ts`, `node_modules/better-auth/package.json` exports) or the official docs URL given in the task. Do not rely on memory of older versions.
4. **Licences decide what you may do with a reference:**
   - **MIT** (Oak Aila, Shiksha Copilot, QuizScanner): you may **adapt** code, meaning rewrite it into our stack (TypeScript, Next.js, Gemini, our schemas), in small commits. Add a line to `README.md` → *Credits* naming the repo and file.
   - **No licence** (reteach, master-lesson, Edurag-chatbot, ncert-mcp, prompt_distractor_generation_NAACL, Sahayak-AI, chiron): **read for the idea only.** Write our own implementation; don't copy code or prompt text.
   - **Hackathon rule:** all code must be written today, and pre-built projects are disqualified. Never paste whole files or modules from any reference. Adapt function by function into our own files and commit as you go, so the history shows the day's work.
5. **Adapting from Oak (UK):** drop British spelling, "key stage" and UK curriculum wording; use NCERT class, Indian context, and Hindi/English.
6. **Adapting from Python repos** (Shiksha backend, QuizScanner, reteach, Edurag): port the *logic* to TypeScript. Don't add Python services.

---

## 1. PRODUCT SUMMARY

### 1.1 Problem (for slides / README)
- Only **19%** of a teacher's time goes to actual teaching (NIEPA study).
- **1,04,125** schools run with just one teacher (UDISE+ 2024-25). Classes 3–5 often sit in one room.
- **42%** of students study in Hindi medium. Current AI tools are English-first, not NCERT-based, often paid, and assume a projector.
- NEP 2020 / CBSE ask for competency-based questions and regular formative checks → more assessment work.

### 1.2 Solution
One chapter in, a full teaching kit out — then a loop that improves tomorrow's lesson:

```
Teacher picks chapter (type / speak / photo) ──► AI pipeline (one step per section, NCERT-grounded)
   Objectives → Lesson plan (timed) → Worksheet + key → Exit quiz (each wrong option = a known misconception)
        ──► Code checker (objectives covered · minutes add up · page refs real · keys match)
        ──► Teacher edits / regenerates any section ──► Export PDF / Word / print
Teach ──► Enter quiz tally (or scan cards) ──► Misconception map ("12/40 think heat = temperature")
        ──► "Add 5-min fix to tomorrow" ──► Tomorrow's plan starts with the fix ──► Parent note on WhatsApp
```

### 1.3 PS-01 coverage matrix (what the judges check)

| PS-01 item | Our feature IDs | Tier |
|---|---|---|
| Class/subject/chapter input | F07, F08 | Core |
| Defined educational content source | F09 (seeded NCERT chapters, page-tagged) | Core |
| AI-generated lesson plan | F10, F11 | Core |
| Worksheet generation | F14 | Core |
| Formative assessment questions | F15 | Core |
| Editable / exportable output | F19, F20, F24, F25 | Core |
| Bonus: Hindi/English output | F28, F29, F30 | Bonus |
| Bonus: NCERT/DIKSHA RAG | F09 + F23 (page refs) + F66 (DIKSHA panel) | Bonus |
| Bonus: Remedial activity generation | F44, F46, F47, F67 | Bonus |
| Bonus: Parent homework summary | F48, F49, F50 | Bonus |
| Bonus: Voice-based teacher interaction | F31, F32, F33 | Bonus |

---

## 2. LOCKED DECISIONS (do not re-open on the day)

| # | Decision | Why |
|---|---|---|
| D1 | **One role: Teacher.** Many teachers can sign up; each sees only their own classes, kits and results (scoped by `teacherId`). **No student, parent or admin logins.** Parents see a public read-only link. | PS-01 is a teacher tool. Multi-role auth costs hours and adds nothing for the judges. |
| D2 | **Next.js 16 (App Router, TypeScript) full-stack**, Tailwind v4 + shadcn/ui, **Prisma 7.10 + Postgres on Neon**, **Better Auth 1.7** (email + password), **Gemini** via `@google/genai`, **deployed on Vercel**. | One codebase, one deploy, live demo URL for submission. |
| D3 | **No vector DB for the demo.** A chapter is ~16–40 pages ≈ 16k–40k characters → pass the whole chapter text with `[p.N]` page markers in the prompt. pgvector RAG over the full NCERT library goes on the "What comes next" slide. | Faster to build, more accurate for single-chapter tasks. |
| D4 | **Grounding source = English NCERT text**; output language chosen per kit (Hindi/English). Hindi and English editions have **identical page numbers** (verified), so page refs stay valid. Optional: Gemini-transcribed Hindi text (§11.2). | Hindi PDFs extract as garbage. |
| D5 | **One AI call per section**, orchestrated from the browser; sections after the plan run in parallel. | Stays far below Vercel's 300 s limit; "regenerate this section" is the same endpoint; progress UI for free. |
| D6 | **"AI writes, code checks"**: zod validates the shape; a deterministic validator (§10.6) checks content rules; one automatic repair attempt; failures are shown, never hidden. | Trust + a strong slide. |
| D7 | **PDF = browser print**, **DOCX = `docx` library** in the browser. | Correct Hindi shaping, nothing heavy on the server. |
| D9 | **Voice = Sarvam AI** (speech-to-text `saaras:v3` codemix, text-to-speech `bulbul:v3`) with the browser Web Speech API as automatic fallback. **AI fallback = OpenRouter** (DeepSeek v4.1 Flash → GPT-6 Luna → Gemini via OpenRouter) after all Gemini keys fail. Both called with plain `fetch` from server routes; no extra npm packages. | Indian-language speech quality; the demo survives a Gemini outage. |
| D8 | **`DEMO_MODE`** env flag serves cached kit JSON if Gemini / Wi-Fi fails on stage. | Demo safety. |

---

## 3. FEATURE REGISTRY (tick what you want — agents build only `[x]`)

Legend: **Core** = PS-01 MVP, must ship · **Bonus** = PS-01 bonus or our differentiator · **Stretch** = only if ahead of schedule. "Rec." = my recommendation for a 5.5-hour build (★ = strongly recommended, ☆ = nice if time).

### 3.1 Account, onboarding, navigation
| Include | ID | Feature | Tier | Rec. | Phase |
|---|---|---|---|---|---|
| [x] | F01 | Teacher signup / login (email + password, Better Auth) | Core | ★ | P1 |
| [ ] | F02 | Google sign-in | Bonus | | P12 |
| [ ] | F03 | Phone OTP login | Stretch | | P13 |
| [x] | F04 | Seeded demo teacher + "Try demo" button on landing | Core | ★ | P2 |
| [x] | F05 | Onboarding (school, district, classes & subjects, multi-grade groups, language, period length, classroom resources) | Core | ★ | P1 |
| [x] | F06 | Dashboard with stat cards + recent kits (§6) | Core | ★ | P9 |
| [x] | F51b | Landing page with 3-step visual + language switch | Bonus | ★ | P14 |

### 3.2 Content source & input
| Include | ID | Feature | Tier | Rec. | Phase |
|---|---|---|---|---|---|
| [x] | F07 | Chapter picker: Board (NCERT) → Class → Subject → Chapter (+ optional page range / sub-topic) | Core | ★ | P4 |
| [x] | F08 | Typed topic / learning-objective input (+ class + subject) | Core | ★ | P4 |
| [x] | F09 | Seeded NCERT chapter library, page-tagged text (defined content source) | Core | ★ | P2 |
| [ ] | F34 | Photo of textbook page → source text (Gemini vision) | Bonus | ☆ | P12 |
| [ ] | F35 | Upload own chapter PDF (English) → pages | Bonus | | P12 |
| [ ] | F55 | NCERT library browser page (read chapter text by page) | Bonus | ☆ | P12 |
| [x] | F66 | "Related DIKSHA resources" panel (public DIKSHA search API) | Bonus | ★ | P12 |
| [ ] | F68 | Hindi chapter text via one-time Gemini transcription (seed step) | Bonus | ☆ | P2 |

### 3.3 Generation (the kit)
| Include | ID | Feature | Tier | Rec. | Phase |
|---|---|---|---|---|---|
| [x] | F10 | Learning objectives (3–5, Bloom-tagged, page refs) | Core | ★ | P3 |
| [x] | F11 | Lesson plan: timed sections summing to period length; teacher script; materials | Core | ★ | P3 |
| [x] | F12 | Plan extras: prior knowledge, key learning points, keywords/glossary | Core | ★ | P3 |
| [x] | F13 | Common misconceptions list in the plan (ids M1…) — feeds the quiz | Core | ★ | P3 |
| [x] | F14 | Worksheet with answer key (MCQ, fill-blank, short answer, case-based / assertion-reason) | Core | ★ | P3 |
| [x] | F15 | Formative exit quiz (3–5 MCQs; every wrong option tagged with a misconception + fix hint) | Core | ★ | P3 |
| [ ] | F16 | Starter quiz (prior-knowledge check) | Bonus | ☆ | P12 |
| [ ] | F17 | Summative chapter test (CBSE pattern, Bloom blueprint, marks) | Bonus | | P12 |
| [x] | F18 | Section-by-section generation with status pills (queued → writing → checking → done/failed) | Core | ★ | P4 |
| [ ] | F18b | Streaming "typing" effect for the lesson plan | Stretch | | P13 |
| [ ] | F38 | Difficulty levels / differentiated worksheet (easy/medium/hard variants) | Bonus | | P11 |
| [ ] | F39 | Local-context examples (district/state aware) | Bonus | ☆ | P3 (prompt flag) |
| [ ] | F61 | Blackboard layout section (what to write where, chalk diagram description) | Bonus | ☆ | P11 |
| [ ] | F64 | Cost/time meter per kit (tokens, seconds, ₹) | Stretch | ☆ | P13 |

### 3.4 Review, edit, trust
| Include | ID | Feature | Tier | Rec. | Phase |
|---|---|---|---|---|---|
| [x] | F19 | Inline edit of every section (fields & lists) | Core | ★ | P5 |
| [x] | F20 | Regenerate one section with an optional instruction ("make it easier") | Core | ★ | P5 |
| [ ] | F21 | Section version history + undo last regenerate | Stretch | | P13 |
| [x] | F22 | Checker panel: deterministic validator rules (green/red) + one auto-repair | Core | ★ | P5 |
| [x] | F23 | NCERT page-ref chips on questions + source-text drawer | Bonus | ★ | P5 |
| [ ] | F56 | Refine box (free-text instruction applied to a chosen section) | Bonus | | P5 |
| [ ] | F57 | Per-teacher AI rate limit + basic content-safety check on inputs | Bonus | ☆ | P3 |

### 3.5 Export
| Include | ID | Feature | Tier | Rec. | Phase |
|---|---|---|---|---|---|
| [x] | F24 | Export PDF (browser print; teacher plan, student worksheet, answer key, quiz, parent note) | Core | ★ | P6 |
| [x] | F25 | Export DOCX (Word) | Core | ★ | P6 |
| [ ] | F26 | One-page A4 low-resource print layout | Bonus | ☆ | P6 |
| [ ] | F27 | PPTX slides export | Stretch | | P13 |
| [ ] | F60 | Google Docs / Drive / Classroom export | Stretch | | P13 |
| [ ] | F65 | QR code on worksheet → parent note link | Stretch | | P13 |

### 3.6 Language & voice
| Include | ID | Feature | Tier | Rec. | Phase |
|---|---|---|---|---|---|
| [x] | F28 | Content language per kit: Hindi / English (/ Bilingual) | Bonus | ★ | P10 |
| [ ] | F29 | Hindi UI (header toggle हिंदी / EN, dictionary-based) | Bonus | ☆ | P10 |
| [ ] | F30 | Translate one section Hindi↔English | Bonus | ☆ | P10 |
| [x] | F31 | Voice input via **Sarvam AI** speech-to-text (`saaras:v3`, codemix Hindi/English) → fills the kit form; browser Web Speech API as automatic fallback | Bonus | ★ | P10 |
| [ ] | F32 | Voice on the regenerate box and refine box ("isse aasaan banao") using the same Sarvam mic | Bonus | ☆ | P10 |
| [ ] | F33 | Read-aloud via **Sarvam TTS** (`bulbul:v3`, Hindi voice) on the parent note page and the teacher script | Bonus | ☆ | P10 |

### 3.7 Classroom modes
| Include | ID | Feature | Tier | Rec. | Phase |
|---|---|---|---|---|---|
| [ ] | F36 | Multi-grade plan: one timeline with lanes per grade, per-grade tasks & worksheets, split blackboard | Bonus | ☆ | P11 |
| [x] | F37 | Low-resource mode: blackboard + local objects only, works for 50+ students | Bonus | ★ | P11 (prompt flag, cheap) |

### 3.8 The loop: results → misconceptions → fix (our differentiator)
| Include | ID | Feature | Tier | Rec. | Phase |
|---|---|---|---|---|---|
| [x] | F40 | Quiz result tally entry (per question × option counts, students present) | Bonus | ★ | P7 |
| [ ] | F41 | Per-student result grid (roll numbers only) | Bonus | | P7 |
| [ ] | F42 | ArUco answer-card scan (Plickers-style, browser camera) + printable cards | Stretch | | P13 |
| [ ] | F43 | OMR sheet photo → answers (Gemini vision) | Stretch | | P13 |
| [x] | F44 | Misconception map / insights page (by misconception, by question, per-objective mastery) | Bonus | ★ | P7 |
| [ ] | F45 | Suggested student groups for reteach (needs F41) | Bonus | | P7 |
| [x] | F46 | Next-day fix generation (5-min remedial, blackboard-only) for top misconceptions | Bonus | ★ | P7 |
| [x] | F47 | Attach fix to tomorrow's kit (auto-create Day-2 kit whose plan starts with the fix) | Bonus | ★ | P7 |
| [ ] | F67 | Pre-emptive remedial activities section (before results, from the plan's misconceptions) | Bonus | ☆ | P12 |
| [ ] | F63 | Prerequisite hint in fix ("revisit Class 6 Ch 4") | Stretch | | P13 |

### 3.9 Parents & homework
| Include | ID | Feature | Tier | Rec. | Phase |
|---|---|---|---|---|---|
| [x] | F48 | Homework in lesson plan (already in plan schema; shown as its own card) | Bonus | ★ | P8 |
| [x] | F49 | Parent note (Hindi/English, WhatsApp-length, one household activity) | Bonus | ★ | P8 |
| [x] | F50 | WhatsApp share (`wa.me` link) + public read-only page `/p/[token]` + view counter | Bonus | ★ | P8 |

### 3.10 Library, classes, planning
| Include | ID | Feature | Tier | Rec. | Phase |
|---|---|---|---|---|---|
| [x] | F51 | Kit history list with filters, search, duplicate kit for another class, delete | Core | ★ | P9 |
| [ ] | F52 | Classrooms page + class mastery trend | Bonus | ☆ | P9 |
| [ ] | F53 | Weekly schedule view (which kit on which day) | Bonus | | P12 |
| [ ] | F54 | Syllabus coverage progress per class | Bonus | | P9 |
| [x] | F62a | Settings page (profile, preferences, defaults) | Core | ★ | P9 |

### 3.11 Other stretch ideas (kept so nothing is lost)
| Include | ID | Feature | Tier | Phase |
|---|---|---|---|---|
| [ ] | F58 | Offline PWA: installable, cached kits viewable without internet | Stretch | P13 |
| [ ] | F59 | Streak / gamified teacher stats | Stretch | P13 |
| [ ] | F62 | Teaching-style profile learned from teacher edits | Stretch | P13 |
| [ ] | F69 | Blackboard diagram as SVG | Stretch | P13 |
| [ ] | F70 | Help page with sample kit | Stretch | P14 |

**Recommended set if you want my pick:** all Core + F28, F31, F37, F40, F44, F46, F47, F48, F49, F50, F23, F66, F51b. Then, if time allows: F36, F61, F16, F30, F29, F68, F57, F64.

---

## 4. USER JOURNEY (end to end)

1. **Landing `/`** — hero "एक अध्याय दें, पूरी कक्षा की तैयारी पाएँ — One chapter in, a full teaching kit out", 3-step visual (Chapter → Kit → Next-day fix), **Start free**, **Login**, **Try demo** (logs into seeded demo teacher).
2. **Signup `/signup` / Login `/login`** — email + password. After signup → onboarding. After login → dashboard (or onboarding if `onboarded=false`).
3. **Onboarding `/onboarding`** (3 steps with progress bar):
   1. About you: name, school, district/state, school type (Govt / Private / Aided).
   2. What you teach: create classrooms — e.g. "Class 7-A Science, 42 students"; "Do you teach more than one class in the same room?" → multi-grade classroom with grades `[3,4,5]`.
   3. Preferences: content language (Hindi / English), period length (default 40), classroom resources (blackboard only / charts / projector / smartphone) → sets low-resource default.
4. **Dashboard `/dashboard`** — greeting, **+ New lesson kit** button (and mic), Today/Tomorrow, stat cards, pending results, top misconceptions, recent kits (§6).
5. **New kit `/kits/new`** — input tabs: **Pick chapter** · **Type topic** · **Speak** · **Photo** · **Upload PDF**. Options: classroom, date to teach, period length, language, multi-grade, low-resource, which sections to include (worksheet, exit quiz, starter quiz, homework/parent note, summative, blackboard, remedial). **Generate kit** → creates kit → redirects to `/kits/[id]`.
6. **Kit page `/kits/[id]`** — two panes:
   - Right: section cards appear in order with status pills (Objectives → Lesson plan → Worksheet ∥ Exit quiz ∥ optional sections → Parent note).
   - Left: kit summary (class, chapter, NCERT source link, pages), **Checker panel** (green/red rules), refine box, DIKSHA resources.
7. **Review & edit** — per section: **Edit**, **Regenerate** (+ instruction), **Translate**, page chips (click → source text drawer).
8. **Export `/kits/[id]/export`** — checklist of documents; buttons **Print / Save as PDF** and **Download Word**; one-page A4 option.
9. *(teacher teaches the lesson offline)*
10. **Results `/kits/[id]/results`** — tally grid: each quiz question × options A–D with +/− counters and "students present"; optional per-student grid; optional **Scan cards**.
11. **Insights `/kits/[id]/insights`** — "7/40 students think *plants take food from soil*" bars, per-question accuracy, per-objective mastery; **Add 5-min fix to tomorrow**.
12. **Next-day fix** — generates remedial activity for top 1–2 misconceptions → attaches to tomorrow's kit for the same classroom (creates a Day-2 kit if none). Day-2 plan shows a highlighted **"Start with: Fix for yesterday's mistake"** block.
13. **Parent note `/kits/[id]/parent`** — editable note (≤ 90 words, Hindi/English), **Share on WhatsApp**, **Copy**, **Print slip**; public page **`/p/[token]`** (no login, mobile-first).
14. **History `/kits`**, **Classrooms `/classrooms`**, **Library `/library`**, **Schedule `/schedule`**, **Settings `/settings`**.

---

## 5. PAGES & API ROUTES

### 5.1 Pages (App Router under `src/app`)
| URL | File | Purpose | Features | Auth |
|---|---|---|---|---|
| `/` | `page.tsx` | Landing | F51b, F04 | public |
| `/login`, `/signup` | `(auth)/login/page.tsx`, `(auth)/signup/page.tsx` | Auth forms | F01 | public |
| `/onboarding` | `(app)/onboarding/page.tsx` | 3-step setup | F05 | teacher |
| `/dashboard` | `(app)/dashboard/page.tsx` | Home & stats | F06 | teacher |
| `/kits` | `(app)/kits/page.tsx` | History | F51 | teacher |
| `/kits/new` | `(app)/kits/new/page.tsx` | Create kit | F07, F08, F31, F34, F35 | teacher |
| `/kits/[id]` | `(app)/kits/[id]/page.tsx` | Generate + review + edit | F10–F23 | teacher |
| `/kits/[id]/export` | `(app)/kits/[id]/export/page.tsx` | Export options | F24–F26 | teacher |
| `/kits/[id]/print` | `(app)/kits/[id]/print/page.tsx` | Print layout (`?doc=plan\|worksheet\|answers\|quiz\|quizkey\|parent\|all&onepage=1`) | F24, F26 | teacher |
| `/kits/[id]/results` | `(app)/kits/[id]/results/page.tsx` | Tally / per-student entry | F40, F41 | teacher |
| `/kits/[id]/scan` | `(app)/kits/[id]/scan/page.tsx` | Camera card scan | F42 | teacher |
| `/kits/[id]/cards` | `(app)/kits/[id]/cards/page.tsx` | Printable ArUco cards | F42 | teacher |
| `/kits/[id]/insights` | `(app)/kits/[id]/insights/page.tsx` | Misconception map + fix | F44–F47 | teacher |
| `/kits/[id]/parent` | `(app)/kits/[id]/parent/page.tsx` | Parent note editor + share | F49, F50 | teacher |
| `/p/[token]` | `p/[token]/page.tsx` | Public parent note | F50 | **public** |
| `/classrooms`, `/classrooms/[id]` | `(app)/classrooms/...` | Classes, roster, trends | F52, F54 | teacher |
| `/library` | `(app)/library/page.tsx` | NCERT chapter browser | F55 | teacher |
| `/schedule` | `(app)/schedule/page.tsx` | Week view | F53 | teacher |
| `/settings` | `(app)/settings/page.tsx` | Profile, prefs | F62a | teacher |

`(app)/layout.tsx` = sidebar shell (Dashboard, New kit, My kits, Classrooms, Library, Schedule, Settings) + `requireTeacher()` + redirect to `/onboarding` if not onboarded.

### 5.2 API routes (`src/app/api/...`, Node runtime, `export const maxDuration = 60` on AI routes)
| Method & path | Purpose | Feature |
|---|---|---|
| `GET/POST /api/auth/[...all]` | Better Auth handler | F01 |
| `POST /api/demo/login` | Sign in as seeded demo teacher | F04 |
| `POST /api/onboarding` | Save profile + classrooms + prefs | F05 |
| `GET /api/curriculum` | Tree: grade → subject → chapters (from `Chapter` table) | F07 |
| `GET /api/chapters/[id]` | Chapter meta + pages (source drawer, library) | F23, F55 |
| `POST /api/kits` | Create kit + section rows (PENDING) → `{id}` | F07/F08 |
| `GET /api/kits` / `GET /api/kits/[id]` | List / fetch kit with sections | F51 |
| `DELETE /api/kits/[id]` · `POST /api/kits/[id]/duplicate` | Manage | F51 |
| `POST /api/kits/[id]/sections/[type]` | **Generate or regenerate ONE section** (body `{instruction?}`) | F10–F17, F20, F36, F61, F67 |
| `PATCH /api/kits/[id]/sections/[type]` | Save teacher edits (zod-validated) | F19 |
| `POST /api/kits/[id]/validate` | Run validator → store `kit.validation` | F22 |
| `POST /api/kits/[id]/translate` | Translate a section (body `{type, to}`) | F30 |
| `GET /api/kits/[id]/diksha` | DIKSHA related resources (cached) | F66 |
| `POST /api/voice/parse` | Transcript → `{grade, subject, chapterNo, language, teacherNote}` | F31 |
| `POST /api/voice/transcribe` | Audio (webm) → Sarvam speech-to-text → `{transcript, language_code}` | F31, F32 |
| `POST /api/voice/tts` | `{text, lang}` → Sarvam text-to-speech → base64 WAV | F33 |
| `POST /api/ocr` | Textbook photo → text | F34 |
| `POST /api/uploads/chapter-pdf` | Custom PDF → Chapter row | F35 |
| `POST /api/kits/[id]/results` · `GET` | Save / read quiz session + tallies; computes misconceptions | F40, F41 |
| `GET /api/kits/[id]/insights` | Aggregated misconception stats | F44 |
| `POST /api/kits/[id]/fixes` | Generate fix activities + attach to tomorrow's kit | F46, F47 |
| `POST /api/kits/[id]/parent-note` | Generate/save parent note + share token | F49, F50 |
| `GET /api/dashboard` | All widget data in one call | F06 |
| `POST /api/scan/omr` | OMR photo → answers | F43 |

Export needs no API: DOCX is built client-side (`Packer.toBlob`), PDF is the print page.

---

## 6. DASHBOARD (F06)

| Widget | Shows | Data source | Tier |
|---|---|---|---|
| Greeting + CTA | "नमस्ते, {name} जी" + **New lesson kit** + mic | User | Core |
| Stat cards (4) | Kits this week · Total kits · Worksheets & quizzes generated · **Hours saved** (sum of `ActivityLog.minutesSavedEstimate` / 60; tooltip: "estimate: kit = 60 min, worksheet = 20, quiz = 15; Shiksha Copilot study: 60–90 min → 60–90 s") | LessonKit, ActivityLog | Core |
| Recent kits | Last 5 with status chip (Draft / Ready / Taught / Results in) | LessonKit (+ QuizSession exists → "Results in") | Core |
| Today / Tomorrow | Kits with `scheduledFor` today / next school day; "Fix attached" badge | LessonKit.scheduledFor, FixActivity | Bonus |
| Pending results | Kits scheduled in the past with no QuizSession → "Enter results" | LessonKit, QuizSession | Bonus |
| Top misconceptions this week | Top 3 OPEN misconceptions with % and class → link to insights | Misconception | Bonus |
| Class mastery | Per classroom: average exit-quiz accuracy over the last 5 kits + sparkline (recharts) | QuestionTally | Bonus |
| Syllabus progress | Chapters with a kit / chapters in library, per class-subject | LessonKit vs Chapter | Bonus |
| Parent notes | Notes shared + total views | ParentNote.views | Stretch |
| Streak | Days in a row with activity | ActivityLog | Stretch |
| AI cost | ₹ spent this week (tokens × price) | GenerationLog | Stretch |

**Empty state** (new teacher): checklist "1. Create your first kit · 2. Teach and enter quiz results · 3. See tomorrow's fix" + button "Try a sample kit (Class 7 Science Ch 2)".

---

## 7. TECH STACK

### 7.1 Versions (npm, verified 25 Sep 2026) — do not change
| Package | Version | Purpose |
|---|---|---|
| `next` / `create-next-app` | 16.3.6 | App (uses `proxy.ts`, not `middleware.ts`) |
| `react` | 19.3.0 | |
| `tailwindcss` | 4.3.x | CSS-first config (no tailwind.config.js) |
| `shadcn` CLI | 4.21.0 | UI components |
| `prisma`, `@prisma/client`, `@prisma/adapter-pg` | **7.10.0 (pinned)** | ORM (driver adapter required in v7) |
| `pg` | 8.23.0 | Postgres driver |
| `better-auth` | 1.7.6 | Auth |
| `@google/genai` | 2.24.0 | Gemini |
| `zod` | 4.6.5 | Schemas + `z.toJSONSchema()` |
| `unpdf` | 1.8.1 | English PDF text per page |
| `docx` | 9.7.2 | Word export |
| `recharts` | 3.10.1 | Charts |
| `sonner` | 2.0.8 | Toasts (via shadcn) |
| `nanoid` | 6.0.1 | Share tokens |
| `qrcode` | 1.5.4 | QR (F65) |
| `js-aruco2` | 2.0.0 | Card scan (F42) — check its LICENSE first |
| `dotenv`, `tsx` | 18.0.4, 4.23.15 | Prisma config + seed |
| Node | ≥ 22 | |

### 7.2 Gemini models
| Use | Model ID |
|---|---|
| All generation steps | `gemini-3.8-flash` (`GEMINI_MODEL`) |
| Small calls: parent note, translate, voice parse, repair | `gemini-3.1-flash-lite` (`GEMINI_MODEL_FAST`) |
| Fallback 1 (same provider) | `gemini-3.5-flash` (next Gemini key first) |
| **Fallback 2: OpenRouter** (different provider) | `deepseek/deepseek-v4.1-flash` → `openai/gpt-6-luna` → `google/gemini-3.8-flash` (all support JSON-schema output; verified 26 Sep). Details: `research/voice-and-fallback.md` §5 |
| Voice | **Sarvam AI**: speech-to-text `saaras:v3` (mode `codemix`), text-to-speech `bulbul:v3`. Details: `research/voice-and-fallback.md` §1–§4 |
Config for all: `thinkingConfig: { thinkingLevel: "LOW" }` (3.5+ models reject `thinkingBudget`). Free tier = Google may train on prompts → never send student names. Rate limits are visible only at https://aistudio.google.com/rate-limit — each member makes their own key in a **separate Google Cloud project**.

### 7.3 Environment variables (`.env` locally, same in Vercel)
```bash
DATABASE_URL="postgresql://...-pooler...neon.tech/shikshak?sslmode=require"   # pooled, app runtime
DIRECT_URL="postgresql://...neon.tech/shikshak?sslmode=require"               # direct, migrations
BETTER_AUTH_SECRET="<openssl rand -base64 32>"
BETTER_AUTH_URL="http://localhost:3000"         # Vercel: https://<app>.vercel.app
NEXT_PUBLIC_APP_URL="http://localhost:3000"
GEMINI_API_KEYS="key1,key2,key3"                # rotated on 429
GEMINI_MODEL="gemini-3.8-flash"
GEMINI_MODEL_FAST="gemini-3.1-flash-lite"
DEMO_MODE="false"                               # "true" → cached kits from data/demo-kits
OPENROUTER_API_KEY="..."                        # AI fallback (load a few $ of credit)
OPENROUTER_MODELS="deepseek/deepseek-v4.1-flash,openai/gpt-6-luna,google/gemini-3.8-flash"
SARVAM_API_KEY="..."                            # voice: speech-to-text + text-to-speech
RATE_LIMIT_PER_HOUR="40"                        # AI calls per teacher per hour (F57)
```
Create `.env.example` with the same keys and empty values. Neon region: Singapore (or Mumbai if offered); Vercel function region `bom1`.

### 7.4 Folder structure
```
shikshak-saathi/
├─ LICENSE (MIT) · README.md · PROGRESS.md · roadmap.md (copy of this file)
├─ prisma.config.ts
├─ prisma/ schema.prisma · migrations/ · seed.ts
├─ data/
│  ├─ ncert/            # chapter PDFs (downloaded night before — data)
│  ├─ chapters.json     # chapter metadata table (§11.2)
│  ├─ diksha-cache.json # static fallback for F66
│  └─ demo-kits/        # cached kit JSON per chapter (DEMO_MODE + seed)
├─ src/
│  ├─ proxy.ts
│  ├─ generated/prisma/ (gitignored)
│  ├─ app/  (see §5)
│  ├─ lib/
│  │  ├─ db.ts · auth.ts · auth-client.ts · session.ts · scope.ts · activity.ts
│  │  ├─ ai/gemini.ts · ai/schemas.ts · ai/prompts/{system,objectives,plan,worksheet,quiz,starter,summative,multigrade,blackboard,remedial,fix,parent,translate,voice}.ts
│  │  ├─ ai/pipeline.ts      # which sections depend on which
│  │  ├─ validate.ts         # validator rules R1–R12
│  │  ├─ misconceptions.ts   # tally → counts (pure)
│  │  ├─ chapters.ts         # load chapter + toPromptText
│  │  ├─ export-docx.ts
│  │  ├─ i18n.ts             # UI strings hi/en (F29)
│  │  └─ diksha.ts
│  └─ components/ ui/ (shadcn) · kit/* · dashboard/* · voice/MicButton.tsx · results/* · print/*
```

---

## 8. SCAFFOLD COMMANDS (Phase P0 — run on the day)

```bash
npx create-next-app@16.3.6 shikshak-saathi --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --agents-md
# (if --agents-md is rejected, drop it)
cd shikshak-saathi
npx shadcn@latest init        # Neutral, CSS variables: yes
npx shadcn@latest add button card input label textarea select tabs dialog dropdown-menu badge table skeleton progress separator sheet form sonner checkbox radio-group tooltip avatar alert switch
npm i -D prisma@7.10.0 tsx dotenv @types/pg @types/qrcode
npm i @prisma/client@7.10.0 @prisma/adapter-pg@7.10.0 pg better-auth@1.7.6 @google/genai@2.24.0 zod@4.6.5 unpdf@1.8.1 docx@9.7.2 recharts nanoid qrcode
npx prisma@7.10.0 init --datasource-provider postgresql
```
package.json scripts to add: `"postinstall": "prisma generate"`, `"db:seed": "tsx prisma/seed.ts"`. Add `/src/generated` to `.gitignore`. If `next build` complains about Prisma wasm/client, add `serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg"]` to `next.config.ts`.

---

## 9. DATA MODEL (Prisma 7.10)

**Base reference (read it in full before writing `schema.prisma`):** `research/agent3-stack-execution.md` lines 278–701 (§3.1 `prisma.config.ts`, §3.2 `src/lib/db.ts`, §3.3 full `schema.prisma`, notes). Write our schema from that reference, then apply **exactly these changes**:

| Model / enum | Change vs the reference |
|---|---|
| `enum SectionType` | Values = `OBJECTIVES LESSON_PLAN WORKSHEET EXIT_QUIZ STARTER_QUIZ SUMMATIVE MULTIGRADE BLACKBOARD REMEDIAL PARENT_NOTE` (the reference's single `QUIZ` is split into `EXIT_QUIZ` + `STARTER_QUIZ`). |
| `User` | Add `schoolType String?`, `uiLanguage String? @default("en")`, `defaultPeriodMinutes Int? @default(40)`, `lowResourceDefault Boolean? @default(true)`, `onboarded Boolean? @default(false)`. These must also be declared as `additionalFields` in `src/lib/auth.ts`. |
| `Chapter` | `id String @id` (a slug like `c7-sci-02`; uploads use `cuid()` in code). Replace `language`, `title`, `sourceUrl`, `pages` with `titleEn String`, `titleHi String?`, `sourceUrlEn String`, `sourceUrlHi String?`, `pagesEn Json`, `pagesHi Json?`. Remove `@@unique([grade, subject, language, chapterNo])` and use `@@index([grade, subject])`. |
| `LessonKit` | `chapterId String?` (optional: typed-topic kits have no chapter). Rename `focusTopic` → `topic`, `teacherNotes` → `teacherNote`. Add `pageFrom Int?`, `pageTo Int?`, `classSize Int @default(40)`, `options Json?` (`{sections, difficulty, localContext}`), `scheduledFor DateTime?`, `diksha Json?`. Add `@@index([classroomId, scheduledFor])`. |
| `Misconception` | Add `correction String?`. |
| `FixActivity` | `materials Json` (string array), `checkQuestion String`. |
| `ParentNote.content` | Stores the zod `ParentNote` object (§10.4). |
| everything else | Keep as in the reference. |

Rules: Postgres only (array columns → no SQLite). Local fallback = Docker Postgres (`docker run -d -e POSTGRES_PASSWORD=pg -p 5432:5432 postgres:17`) or a second Neon branch. The generated client import is `@/generated/prisma/client`, and the driver adapter is `@prisma/adapter-pg` (both shown in the reference §3.2).

---

## 10. AI PIPELINE

### 10.1 Orchestration (client-driven, one call per section)
```
POST /api/kits  → LessonKit(status GENERATING) + KitSection rows (PENDING) for selected types
Client (kit page) runs:
  1. OBJECTIVES
  2. LESSON_PLAN                           (needs objectives; creates misconceptions M1..Mn)
  3. in parallel (Promise.allSettled):
       WORKSHEET · EXIT_QUIZ · STARTER_QUIZ? · SUMMATIVE? · MULTIGRADE? · BLACKBOARD? · REMEDIAL?
  4. PARENT_NOTE?                          (needs plan.homework; fast model)
  5. POST /api/kits/:id/validate           (code, no AI) → sections with failed rules are called ONCE
                                             more with {repair: failedRules}, then validate again
  6. kit.status = READY (or FAILED if OBJECTIVES/LESSON_PLAN failed)
```
Dependencies (`src/lib/ai/pipeline.ts`, a plain object map):
OBJECTIVES → none · LESSON_PLAN → OBJECTIVES · WORKSHEET, EXIT_QUIZ, MULTIGRADE → OBJECTIVES + LESSON_PLAN · STARTER_QUIZ, BLACKBOARD, REMEDIAL, PARENT_NOTE → LESSON_PLAN · SUMMATIVE → OBJECTIVES.

Section route `POST /api/kits/[id]/sections/[type]` steps: (1) `requireTeacher` + load the kit scoped to the teacher; (2) check deps are READY, else 409; (3) rate-limit check (F57); (4) set the section GENERATING; (5) build the prompt from chapter text + dependent sections + kit options + optional `instruction`/`repair`; (6) `generateJSON` with that section's schema; (7) save content, `version+1`, add `SectionRevision(source AI)`; (8) log `GenerationLog` + `ActivityLog`; (9) return content. On error: section FAILED with the message; the UI shows Retry.
Why this design and the Vercel limits: `research/agent3-stack-execution.md` lines 703–752.
Idea source (read, don't copy): Shiksha's section dependency graph `references/Shiksha-Copilot/shiksha-api/durable-functions/core/models/dag.py` and its regenerate-with-feedback query builder `.../core/regen_query_generator.py`.

### 10.2 Gemini wrapper `src/lib/ai/gemini.ts`
**Reference:** `research/agent2-ai-pipeline.md` lines 123–226 (models, SDK choice, the `generateJSON` code, PDF/image/audio input, streaming). Write the wrapper from that reference with these requirements:
- Package `@google/genai` 2.24.0; call `ai.models.generateContent` with `config.responseMimeType = "application/json"`, `config.responseJsonSchema = z.toJSONSchema(schema)` (delete `$schema`), `systemInstruction`, `temperature 0.4`, `thinkingConfig: { thinkingLevel: "LOW" }`.
- Keys from `GEMINI_API_KEYS` (comma list). On 429 / `RESOURCE_EXHAUSTED`, switch to the next key; after all keys fail, try model `gemini-3.5-flash` once.
- Parse `res.text` → `schema.safeParse`; on a shape failure, retry once.
- **OpenRouter fallback:** if every Gemini key/model fails, call OpenRouter (`src/lib/ai/openrouter.ts`, plain `fetch`) with the **same system + user prompt** and `response_format: { type: "json_schema", json_schema: { name, strict: false, schema } }`, `provider: { require_parameters: true }`. Try each model in `OPENROUTER_MODELS` in order; validate with the same zod schema. Exact request/response shape, why `strict: false`, and model list: `research/voice-and-fallback.md` §5. Log the model as `openrouter:<id>` in `GenerationLog`. Calls that send files (PDF transcription, photo OCR, OMR) are Gemini-only; there, show "try again" instead of falling back.
- Return `{ data, model, latencyMs, inTok: res.usageMetadata?.promptTokenCount, outTok: res.usageMetadata?.candidatesTokenCount }` so the route can write `GenerationLog`.
- Export `MODEL = process.env.GEMINI_MODEL ?? "gemini-3.8-flash"` and `MODEL_FAST = process.env.GEMINI_MODEL_FAST ?? "gemini-3.1-flash-lite"`.
- **DEMO_MODE:** if `process.env.DEMO_MODE === "true"` and `data/demo-kits/<chapterId>.json` has the section, wait 1500 ms and return it (`fromCache: true`). Reference: `research/agent3-stack-execution.md` lines 729–734.
- If unsure about an SDK field name, read the typings in `node_modules/@google/genai/dist/` (search for `responseJsonSchema`, `thinkingConfig`). **Do not guess.**

### 10.3 Shared system prompt `src/lib/ai/prompts/system.ts`
**Reference:** `research/agent2-ai-pipeline.md` lines 448–458. Ideas worth adapting (MIT): Shiksha's lesson-plan system prompt `references/Shiksha-Copilot/shiksha-api/durable-functions/core/agents/gpt_agent.py` (no made-up details, classroom-ready) and Oak's voice/age guidance `references/oak-ai-lesson-assistant/packages/aila/src/lib/agentic-system/agents/sectionAgents/shared/identityAndVoice.ts` and `.../shared/keyStageLanguageGuidance.ts`.
Content it must contain: grounding in `<chapter>` text only; page markers `[p.N]` and "never invent page numbers"; class grade; language instruction (hi → simple Hindi in Devanagari, NCERT Hindi terms, English term once in brackets allowed; en → simple Indian English); class size and period; the low-resource line (no projector/internet; blackboard, chalk, local objects; works for 50+ students); the optional local-context line (district/state examples, F39); "Output ONLY JSON matching the schema". For a typed-topic kit with no chapter, use `<topic>` instead and let pageRefs be empty.

### 10.4 Schemas `src/lib/ai/schemas.ts` (zod v4)
**Reference:** `research/agent2-ai-pipeline.md` lines 228–422 (every schema, with comments). Write the file from that reference, then apply **exactly these changes**:
- Rename `LearningObjectives` → `Objectives`.
- `LessonPlan`: **remove** `blackboardPlan` (the blackboard is its own section, `Blackboard`, same shape as `BlackboardLayout`).
- `WorksheetQuestion.pageRef` and `QuizQuestion.pageRef` → `.optional()` (typed-topic kits have no pages).
- Rename `FormativeQuiz` → `Quiz` (used by both EXIT_QUIZ and STARTER_QUIZ); rename `SummativeAssessment` → `Summative`.
- `MultiGradeVariant` → `MultiGrade`, where each `grades[]` item is `{ grade, focus, task, worksheetQuestions: WorksheetQuestion[] (3–6) }` instead of id lists.
- `RemedialActivity`: remove `studentsAffected` (the code tracks it on `Misconception`).
- `ParentNote` = `{ language, learnedToday, homework, homeActivity, askYourChild: string[] (≤3), whatsappText (≤700 chars) }`.
- Add `VoiceIntent = { grade?, subject?, chapterNo?, topic?, language?, teacherNote? }`.
- Drop the whole-kit `LessonKit` schema (the DB stores one section per row). Add `SECTION_SCHEMAS` mapping each `SectionType` → schema (`REMEDIAL` → `RemedialPlan`).
- Rules: no `z.discriminatedUnion` in schemas sent to Gemini; use `.int().min().max()` on numbers (reference lines 193–198).
Idea sources for richer fields (read only for ideas; the MIT code may be adapted): Oak's plan schema `references/oak-ai-lesson-assistant/packages/aila/src/protocol/schema.ts` (CompletedLessonPlanSchema ~line 390), and the misconception and quiz schemas in `.../sectionAgents/misconceptionsAgent/misconceptions.schema.ts` and `.../exitQuizAgent/exitQuiz.schema.ts`.

### 10.5 Per-section prompts
**Reference for our prompts:** `research/agent2-ai-pipeline.md` lines 460–475 (a table with the inputs and key instructions for every step, plus regenerate). Prompt text worth reading for each section before writing ours (all MIT; adapt the wording, don't paste whole files):

| Our section | Read first |
|---|---|
| OBJECTIVES | Oak `…/sectionAgents/learningOutcomeAgent/learningOutcome.instructions.ts`; Shiksha Bloom verbs `references/Shiksha-Copilot/shiksha-api/app-service/prompts/blooms_taxonomy.yaml` |
| LESSON_PLAN | Oak `…/sectionAgents/cycleAgent/cycle.instructions.ts`, `…/priorKnowledgeAgent/`, `…/keyLearningPointsAgent/`, `…/keywordsAgent/`; Oak pedagogy rules `references/oak-ai-lesson-assistant/packages/core/src/prompts/lesson-assistant/parts/body.ts`; Shiksha's 5E sample plan as a target format `references/Shiksha-Copilot/shiksha-website/shiksha-backend/helper/data.helper.js` |
| misconceptions (inside LESSON_PLAN) | Oak `…/sectionAgents/misconceptionsAgent/misconceptions.instructions.ts` (52 lines) |
| EXIT_QUIZ / STARTER_QUIZ | Oak `…/sectionAgents/shared/quizQuestionDesign.instructions.ts` (43 lines: distractor rules), `…/exitQuizAgent/exitQuiz.instructions.ts`, `…/starterQuizAgent/starterQuiz.instructions.ts`. Idea only (no licence): misconception-labelled distractor prompts in `references/prompt_distractor_generation_NAACL/PromptFactory.py` lines 132–190 |
| WORKSHEET | Oak `references/oak-ai-lesson-assistant/packages/teaching-materials/src/documents/teachingMaterials/comprehension/buildComprehensionPrompt.ts`; Shiksha question rules `references/Shiksha-Copilot/shiksha-api/app-service/prompts/question_paper_prompts.yaml` (135 lines) |
| SUMMATIVE | Shiksha `question_paper_prompts.yaml` + blueprint logic `references/Shiksha-Copilot/shiksha-api/app-service/app/services/question_paper_service.py` (`_build_generation_slots`); CBSE test patterns (idea only) `references/ncert-mcp/src/tools/question_paper.py` lines 1–60 |
| REMEDIAL / FIX | Oak `…/sectionAgents/additionalMaterialsAgent/additionalMaterials.instructions.ts` |
| PARENT_NOTE / homework | same additionalMaterials file (homework option) |
| Regenerate / "make it easier" | Oak modify options `references/oak-ai-lesson-assistant/apps/nextjs/src/components/AppComponents/Chat/drop-down-section/action-button.types.ts`; Oak prompt parts `.../agents/sharedPromptParts/currentSectionValue.part.ts`, `userMessage.part.ts`; Shiksha `.../durable-functions/core/regen_query_generator.py` |
| Translate | Shiksha idea: walk the JSON and translate only string leaves, `references/Shiksha-Copilot/components/translation/inference/inference.py` (`translate_text`, `infer_on_data`) — we do it with one Gemini call instead |
| Input safety (F57) | Oak `references/oak-ai-lesson-assistant/packages/core/src/utils/ailaModeration/moderationPrompt.ts` + `moderationCategories.json`; Shiksha's India-specific refusal list `references/Shiksha-Copilot/shiksha-api/app-service/prompts/chat_prompts.yaml` (~line 32) |

Oak paths above that start with `…/sectionAgents/` mean `references/oak-ai-lesson-assistant/packages/aila/src/lib/agentic-system/agents/sectionAgents/`.
Oak writes British English for UK schools: drop the British spelling and UK "key stage" wording and use NCERT grade and Indian context instead.

### 10.6 Validator `src/lib/validate.ts` (plain TypeScript, no AI)
**Reference:** `research/agent2-ai-pipeline.md` lines 477–504 (rules R1–R12 with implementation sketches + `devanagariRatio`). Each rule returns `{ rule, ok, detail, section }`; the UI shows green/red rows. Auto-fix R2 (put the minute difference on the longest `activity`/`practice` section) and R8 (recompute totalMarks). Repair loop: re-call the failing section once with "Your previous output failed these checks: …", then show what is still red. **Never block the teacher.**
Idea source (no licence, read only): `references/master-lesson/src/validate/consistency.ts` (rule-per-violation style, 205 lines) and `references/master-lesson/src/generate/repair.ts` (44 lines: feedback → one bounded repair). Shiksha's LLM validator prompt (MIT) `references/Shiksha-Copilot/shiksha-api/durable-functions/core/agents/validator_agent.py` is an optional extra "AI review" step, but our rules are code.

### 10.7 Tally → misconceptions → fix
**Reference:** `research/agent2-ai-pipeline.md` lines 506–516 (the counting loop). Implement `misconceptionCounts(quiz, plan, tally, studentsPresent)` in `src/lib/misconceptions.ts` as a **pure function**: for every wrong option with a `misconceptionId`, add `tally[Q][option]` to that misconception, record the question ids, and return rows `{code, label, correction, studentCount, questionIds, percent}` sorted by `studentCount` descending. Cap `percent` at 1.0 and label the UI "wrong answers pointing to this misconception". With per-student data (F41), count distinct roll numbers instead.
Fix flow (`POST /api/kits/[id]/fixes`): take the top 2–3 misconceptions with `percent ≥ 0.10` → FIX prompt (schema `RemedialPlan`) → save `FixActivity` rows → find the next kit for the same classroom with `scheduledFor` later than this kit's; if there is none, create a Day-2 kit (`basedOnKitId`, same chapter, `dayNumber+1`, `scheduledFor` = next day, status DRAFT) → set `targetKitId` and misconception status `FIX_PLANNED`. When the Day-2 LESSON_PLAN is generated, pass its fixes as `focusFix` so section S1 is `warmup_fix`. The Day-2 kit page shows a highlighted "Start with: fix for yesterday's mistake" card.
Idea source (no licence, read only): `references/reteach/README.md` (why a misconception map beats a gradebook) and `references/reteach/run.py` (Stage-1 error tagging prompt at line 167, Stage-2 clustering prompt at line 288, quote validation at line 403; **the prompts are in Chinese**). We don't need the AI clustering because our distractors are pre-tagged; reteach only adds value if we later analyse free-text answers.

---

## 11. CONTENT SOURCE (NCERT)

### 11.1 URL pattern and demo chapters
**Reference:** `research/agent2-ai-pipeline.md` lines 9–44. It has the verified book-code scheme (`<class><lang><book><vol>`, e.g. `gecu1` = Class 7 English Curiosity; `h` = Hindi), the 4 demo chapters with their English + Hindi PDF URLs, PDF page counts and printed `pageStart`, and why Class 7 Science Ch 2 (`c7-sci-02`) is the main demo chapter. Put that table into `data/chapters.json` as `{id, grade, subject, bookName, chapterNo, titleEn, titleHi, sourceUrlEn, sourceUrlHi, pdfEn, pdfHi, pageStart}`. The PDFs are downloaded the night before into `data/ncert/`; never fetch ncert.nic.in live during the demo.

### 11.2 Extraction
- **English:** `research/agent2-ai-pipeline.md` lines 46–79 (tested `unpdf` code: `getDocumentProxy` + `extractText(pdf, { mergePages: false })`, printed page = `pageStart + index`, the `cleanEnglish` regexes for running headers and duplicated headings, and `toPromptText` producing `[p.N]` blocks). Idea source (no licence): `references/Edurag-chatbot/backend/rag_pipeline.py` `extract_text_from_pdf` at line 48 (keeping page numbers as chunk metadata; that code is Python/PyMuPDF, ours is TypeScript/unpdf).
- **Hindi:** `research/agent2-ai-pipeline.md` lines 81–94. **Never extract Hindi NCERT PDFs** (Kokila CID fonts → corrupted Devanagari). The default is to ground on the English text and write the output in Hindi (pages are identical). F68: transcribe once in the seed with Gemini PDF input, see `research/agent2-ai-pipeline.md` lines 200–215. Idea source (MIT): Shiksha's LLM page-to-markdown extraction `references/Shiksha-Copilot/shiksha-ingestion/pipeline_steps/step_3_text_extraction_llm.py`.
- **Uploaded PDFs (F35):** same English path. Shiksha's table-of-contents and chapter-splitting steps (`references/Shiksha-Copilot/shiksha-ingestion/pipeline_steps/step_0_toc_page_finding.py`, `step_1_toc_extraction.py`, `step_2_pdf_splitting.py`) show how to handle a whole book. We only accept single-chapter PDFs.

### 11.3 DIKSHA (F66)
**Reference:** `research/agent2-ai-pipeline.md` lines 96–119 (verified POST `https://diksha.gov.in/api/content/v1/search`, no auth; request filters `gradeLevel`/`subject`/`medium`; results `result.content[]` with `identifier`; play link `https://diksha.gov.in/play/content/<identifier>`). Cache the results in `LessonKit.diksha`; fall back to `data/diksha-cache.json`.

---

## 12. EXPORT, VOICE, SHARE, SCAN

### 12.1 PDF (F24, F26) — browser print
**Reference:** `research/agent2-ai-pipeline.md` lines 520–536. Page `/kits/[id]/print?doc=plan|worksheet|answers|quiz|quizkey|parent|all&onepage=1` renders clean HTML, waits for `document.fonts.ready`, then calls `window.print()`. Print CSS: `@page { size: A4; margin: 12mm }`, `.page-break { break-before: page }`, hide the nav. Fonts `Noto_Sans` + `Noto_Sans_Devanagari` from `next/font/google`. The worksheet and the answer key render **the same question objects** (answers hidden vs shown), so they can never disagree. Idea source (no licence, read only): `references/master-lesson/src/derive/answerKey.ts` (33 lines) and `src/derive/worksheets.ts`. **Do not** use its `src/render/pdf.ts` (Playwright on the server). Oak's export shaping (MIT): `references/oak-ai-lesson-assistant/packages/exports/src/dataHelpers/prepLessonPlanForDocs.ts`.

### 12.2 DOCX (F25)
**Reference:** `research/agent2-ai-pipeline.md` lines 538–554 (`docx` 9.7.2, `TextRun` font `{ ascii: "Calibri", hAnsi: "Calibri", cs: "Nirmala UI" }` so Devanagari is shaped, `Packer.toBlob` in the browser). **Best code reference (MIT, Angular/TypeScript, client-side, same `docx` library):** `references/Shiksha-Copilot/shiksha-website/shiksha-frontend/src/app/shared/services/lesson-docx-generator.service.ts` (208 lines) + `docx-utility.service.ts`. Adapt the structure to our plan/worksheet/answer-key shapes (the Angular DI wrappers are not needed).

### 12.3 WhatsApp + public page (F50)
`research/agent2-ai-pipeline.md` lines 556–562: `https://wa.me/?text=${encodeURIComponent(text + "\n" + url)}`, no API needed. Add a **Copy** button. `/p/[token]` increments `views`, is mobile-first, and shows a language toggle if both languages exist.

### 12.4 Voice (F31, F32, F33) — Sarvam AI
**Reference (verified, read fully):** `research/voice-and-fallback.md` §1–§4.
- **Mic (F31/F32):** `components/voice/MicButton.tsx` records with `MediaRecorder` (`audio/webm`, max 25 s) → `POST /api/voice/transcribe` (server) → Sarvam `POST https://api.sarvam.ai/speech-to-text` with header `api-subscription-key`, multipart `file`, `model=saaras:v3`, `mode=codemix`, `language_code=unknown` → `{transcript}` → `POST /api/voice/parse` (fast model, `VoiceIntent`) → prefill the kit form. The same mic is used on the regenerate/refine box.
- **Automatic fallback:** if the transcribe route returns an error, the MicButton switches to the browser Web Speech API (`webkitSpeechRecognition`, `lang="hi-IN"`) and shows a small "browser voice" badge.
- **Read-aloud (F33):** `POST /api/voice/tts` → Sarvam `POST https://api.sarvam.ai/text-to-speech`, `model=bulbul:v3`, speaker `ritu` or `priya` (lowercase), `pace 0.9`, text ≤ 2,500 chars (chunk longer text) → `audios[0]` base64 WAV → play in the browser. **Check the language field name on the doc page** (`language_code` vs `target_language_code`; see the reference §2). Fallback: `speechSynthesis` with a `hi-IN` voice.
- **Never call Sarvam from the browser** (the key must stay secret). Needs HTTPS for the mic (Vercel OK).
- Idea source (no licence): `references/Sahayak-AI/services/transcription_service.py`.

### 12.5 Card scan (F42) & OMR (F43) — stretch
**Reference:** `research/agent2-ai-pipeline.md` lines 580–605. **Logic reference (MIT, Python/OpenCV → port the idea to `js-aruco2` in the browser):**
- Answer from marker rotation: `references/QuizScanner/quizscanner/aruco.py` `answer_from_corners` at line 91 (dictionary `DICT_4X4_250` at line 21).
- Printable card layout (marker id = student, letters on 4 sides): `references/QuizScanner/quizscanner/cards.py`.
- Majority vote and locking answers across frames: `references/QuizScanner/quizscanner/session.py`.
- Live teacher panel UI: `references/QuizScanner/quizscanner/web/teacher.js`, `teacher.html`.
Comments are in Polish. Check `js-aruco2`'s dictionary support; if `DICT_4X4_250` is unavailable, use its `ARUCO_MIP_36h12` and print cards with the same library. OMR (F43): photo → Gemini vision → `{roll, answers}`; `Udayraj123/OMRChecker` is Python and not cloned.

### 12.6 Visual aids (F69) and photo input (F34)
Idea sources (no licence, read only): `references/Sahayak-AI/agents/visual_agent.py` (system prompt for "return only SVG" blackboard diagrams) and `references/Sahayak-AI/agents/textbook_agent.py` (textbook-page photo → practice material by difficulty).

---

## 13. BUILD PHASES (priority order — agents execute top to bottom)

Each task: **ID · Feature(s) · Owner · Files · Steps · Acceptance.** Owners: **M** = Monis (AI/full stack), **U** = Ujjwal (infra/data/devops), **A** = Ansh (UI/UX). Parallel work is fine across owners; within one owner, go in order.

### P0 — Setup (11:00–11:30)
- **P0.1 · U · Scaffold.** Create the app at `/home/monis/awadh-hack/shikshak-saathi/` (a sibling of `research/` and `references/`, so those folders are never committed). Run §8 commands. Add LICENSE (MIT, "2026 Team NawabiCoders"), `.env.example`, `PROGRESS.md`, copy `roadmap.md`. Create a public GitHub repo, push. **Accept:** `npm run dev` shows the Next page; repo public with first commit.
- **P0.2 · U · Neon + Vercel.** Create a Neon DB (pooled + direct URLs). Link a Vercel project, set env vars, deploy. **Accept:** live URL loads.
- **P0.3 · A · Theme & shell.** shadcn theme, fonts (Noto Sans + Noto Sans Devanagari via `next/font/google`), `(app)/layout.tsx` sidebar (links from §5.1), top bar with language switch placeholder. **Accept:** `/dashboard` renders the empty shell.
- **P0.4 · M · Schemas first.** Write `src/lib/ai/schemas.ts` (§10.4) exactly and push by 11:45. Also `src/lib/mock/kit.ts`: a full mock kit object typed with these schemas, for A's UI work. **Accept:** `npx tsc --noEmit` passes.

### P1 — Auth, onboarding, scoping (11:30–12:30)
- **P1.1 · U · Prisma.** Paste the §9 schema; `npx prisma migrate dev --name init`; create `src/lib/db.ts`. **Accept:** migration applied on Neon; `npx prisma studio` shows tables.
- **P1.2 · U · Better Auth (F01).** Reference: `research/agent3-stack-execution.md` lines 183–276 (why Better Auth; `src/lib/auth.ts` with `prismaAdapter` + `emailAndPassword` + `nextCookies()`; the `api/auth/[...all]` route via `toNextJsHandler`; `auth-client.ts` via `createAuthClient` from `better-auth/react`; the table generation command). Add every extra User field from §9 to `user.additionalFields` (types `string` / `number` / `boolean`, `required: false`, defaults as in §9). If you run `npx auth@latest generate`, diff the output against §9 and keep §9. If an import path fails, check `node_modules/better-auth/package.json` `exports`, or https://www.better-auth.com/docs/integrations/next . **Do not use NextAuth patterns.** **Accept:** signup, login and logout work locally.
- **P1.3 · U · Protection.** Reference: `research/agent3-stack-execution.md` lines 240–272 (`requireTeacher()` in `src/lib/session.ts` using `auth.api.getSession({ headers: await headers() })`; `src/proxy.ts` exporting `function proxy(request)`, which checks `getSessionCookie` from `better-auth/cookies`, plus the `config.matcher` list). Our matcher list: `/dashboard`, `/kits`, `/classrooms`, `/library`, `/schedule`, `/settings` (each with `/:path*`) and `/onboarding`. File name **`src/proxy.ts`, never `middleware.ts`** (Next 16: https://nextjs.org/docs/app/api-reference/file-conventions/proxy).
  `src/lib/scope.ts`: `getKitForTeacher(kitId, teacherId)`, `getClassroomForTeacher(...)`; they throw 404 when not owned. **Accept:** logged out → `/dashboard` redirects to `/login`; teacher B gets 404 on teacher A's kit id.
- **P1.4 · A · Auth pages (F01).** `/login`, `/signup` with shadcn form + `authClient.signUp.email / signIn.email`, errors shown with sonner. **Accept:** full signup → redirect to `/onboarding`.
- **P1.5 · A+U · Onboarding (F05).** 3-step page per §4 step 3 → `POST /api/onboarding` updates the user fields, creates Classroom rows, sets `onboarded=true`, logs `SIGNED_UP`. `(app)/layout.tsx` redirects to `/onboarding` when `onboarded` is false. **Accept:** new teacher completes onboarding and lands on the dashboard; classrooms exist in the DB.

### P2 — Content source & seed (12:00–13:15, U)
- **P2.1 · F09 · Chapter seed.** `data/chapters.json` from §11.1. `prisma/seed.ts`: for each chapter, extract English pages with unpdf (§11.2) → upsert `Chapter` (id = slug, pagesEn). **Accept:** `npx prisma db seed` creates 4 chapters; `pagesEn[0].page === pageStart`; text is readable English.
- **P2.2 · F68 · Hindi transcription** (only if ticked). Add to the seed behind a flag `SEED_HINDI=1` (§11.2). **Accept:** `pagesHi` holds readable Devanagari for `c7-sci-02`.
- **P2.3 · F04 · Demo teacher.** Seed `demo@shikshak.app / demo1234` (use Better Auth's `auth.api.signUpEmail` in the seed so the password hash is correct), onboarded, school "Govt. Upper Primary School, Barabanki", classrooms "Class 7 Science (42)" and "Room 1: Class 6 + 7 (multi-grade)". Later (after P3 works) add 2–3 historical kits from `data/demo-kits/*.json` with quiz sessions, misconceptions and fixes so the dashboard is full. `POST /api/demo/login` signs in as the demo teacher. **Accept:** "Try demo" on landing opens a populated dashboard.
- **P2.4 · GET /api/curriculum** returning `{grade, subject, chapters:[{id, chapterNo, titleEn, titleHi}]}[]`. **Accept:** JSON lists the 4 chapters grouped.

### P3 — AI core (11:45–13:30, M)
- **P3.1 · Gemini wrapper** `src/lib/ai/gemini.ts` (§10.2) + `DEMO_MODE` helper. **Accept:** a small script generates `Objectives` for `c7-sci-02` and prints valid JSON.
- **P3.2 · Prompts.** `prompts/system.ts` (§10.3) + one builder per section (§10.5) returning `{system, user}`. `src/lib/chapters.ts`: load a chapter, slice the page range, `toPromptText`. **Accept:** builders unit-callable; the prompt contains `[p.7]` markers.
- **P3.3 · Create kit** `POST /api/kits`: zod-validate the body (`chapterId | topic`, classroomId, language, periodMinutes, classSize, lowResource, targetGrades, teacherNote, sections[], scheduledFor, difficulty, localContext). Create LessonKit + KitSection rows (always OBJECTIVES, LESSON_PLAN; plus the selected ones; WORKSHEET and EXIT_QUIZ selected by default). Log `KIT_CREATED` (minutesSavedEstimate 60). **Accept:** returns `{id}`; rows exist.
- **P3.4 · Section route** `POST /api/kits/[id]/sections/[type]` per §10.1 steps 1–9, including regenerate (`instruction`) and repair (`repair`). `maxDuration = 60`. **Accept:** calling OBJECTIVES → LESSON_PLAN → WORKSHEET → EXIT_QUIZ in order with curl produces 4 READY sections; quiz wrong options carry M ids.
- **P3.5 · F57 · Rate limit** (if ticked): count GenerationLog rows for this teacher in the last hour > `RATE_LIMIT_PER_HOUR` → 429 with a friendly message. Reject inputs > 2,000 chars. **Accept:** limit enforced.
- **P3.6 · F39 · Local context** (if ticked): pass district/state into the system prompt when `options.localContext` is true.
- **Gate 13:30:** on the deployed URL, a kit for `c7-sci-02` generates objectives, plan, worksheet and exit quiz. Save that kit's section JSON as `data/demo-kits/c7-sci-02.json` (DEMO_MODE cache).

### P4 — Kit creation & generation UI (12:00–13:30, A)
- **P4.1 · F07, F08 · `/kits/new`.** Tabs: Pick chapter (cascading selects from `/api/curriculum`, optional page range), Type topic. Options panel (classroom, date, period, language, low-resource switch, multi-grade toggle visible only for multi-grade classrooms, section checkboxes, difficulty). Submit → `POST /api/kits` → router push `/kits/[id]?autostart=1`. **Accept:** form posts valid data.
- **P4.2 · F18 · Generation orchestration** on `/kits/[id]`: client hook `useKitGeneration(kit)` runs §10.1 order (skip READY sections), parallel stage via `Promise.allSettled`, then validate. Section cards show skeleton + status pill (queued / writing / checking / done / failed + Retry). **Accept:** sections appear one by one; refreshing the page mid-way resumes the remaining sections.
- **P4.3 · Section renderers** (read mode): ObjectivesCard (Bloom badges), LessonPlanCard (timeline with minutes, teacherSays, studentsDo, materials; misconceptions list; keywords; prior knowledge; homework), WorksheetCard (questions by type, answers hidden with a "Show answers" toggle), QuizCard (options; wrong options show the misconception tag + whyWrong in teacher view). Build against the mock kit first. **Accept:** the mock kit renders fully; the real kit renders the same.

### P5 — Edit, regenerate, checker (13:30–14:30)
- **P5.1 · F19 · A+M · Inline edit.** Edit mode per card: text inputs/textarea for strings, add/remove rows for arrays, question editor. Save → `PATCH /api/kits/[id]/sections/[type]` → zod validate → save, `editedByTeacher=true`, SectionRevision(TEACHER), log `SECTION_EDITED`. **Accept:** an edit survives reload.
- **P5.2 · F20 · Regenerate** button + optional instruction input (with mic if F31) → `POST .../sections/[type]` with `{instruction}` → card updates → re-run validate. If LESSON_PLAN is regenerated and misconception ids changed, mark EXIT_QUIZ "may be out of date" with a one-click regenerate. **Accept:** "make it easier" changes the worksheet.
- **P5.3 · F22 · M · Validator** `src/lib/validate.ts` (R1–R12 per §10.6) + `POST /api/kits/[id]/validate` (stores `kit.validation`, applies auto-fixes R2/R8) + one repair round from the client. **A:** CheckerPanel with green/red rows and the section each rule belongs to. **Accept:** a deliberately broken plan (minutes ≠ period) shows red, then gets auto-adjusted.
- **P5.4 · F23 · Page chips** "p.34" on objectives, plan sections and questions → Sheet/drawer showing `GET /api/chapters/[id]` page text with the page highlighted. **Accept:** clicking a chip shows the right page.
- **P5.5 · F56 · Refine box** (if ticked): choose section + instruction → same as regenerate.

### P6 — Export (14:00–15:00)
- **P6.1 · F24 · A · Print page** per §12.1 with docs: plan, worksheet, answers, quiz (student), quizkey (teacher, with misconception tags), parent, all. **Accept:** Chrome "Save as PDF" of a Hindi kit shows correct conjuncts (क्ष, त्र, श्र).
- **P6.2 · F25 · U · DOCX** `src/lib/export-docx.ts` builds plan + worksheet + answer key (§12.2); download button on `/kits/[id]/export`. Log `KIT_EXPORTED_DOCX`. **Accept:** file opens in Word/Google Docs and Hindi is readable.
- **P6.3 · F26 · One-page A4** option (`onepage=1`). **Accept:** worksheet fits one page in print preview.
- **P6.4 · `/kits/[id]/export`** page: document checklist + buttons; log `KIT_EXPORTED_PDF` when print is opened.

### P7 — The loop: results → misconceptions → fix (14:00–15:00)
- **P7.1 · F40 · A · Tally grid** `/kits/[id]/results`: students present input; for each exit-quiz question, options A–D with +/− counters (correct option highlighted); Save → `POST /api/kits/[id]/results` `{method:"TALLY", studentsPresent, tally}`. **M:** route creates QuizSession + QuestionTally rows, runs `misconceptionCounts` (§10.7), upserts Misconception rows (status OPEN), logs `QUIZ_RESULTS_RECORDED`. **Accept:** after saving, Misconception rows with counts exist.
- **P7.2 · F41 · Per-student grid** (if ticked): rows = roll numbers 1..studentCount, columns = questions, each cell a select A–D → StudentResponse rows; tallies derived from them; `rollNos` filled on misconceptions.
- **P7.3 · F44 · A · Insights** `/kits/[id]/insights`: horizontal bars "N students · X% — *misconception*" (+ correction line), per-question accuracy, per-objective mastery (green ≥ 70%, amber 40–70%, red < 40%, from the questions' objectiveId). **Accept:** matches the entered tally.
- **P7.4 · F45 · Groups** (if F41): group roll numbers by their top misconception; show "Group A (M2): 3, 7, 12…".
- **P7.5 · F46, F47 · M · Fix** `POST /api/kits/[id]/fixes` per §10.7 (FIX prompt → FixActivity → attach/create Day-2 kit). UI: **Add 5-min fix to tomorrow** → toast → link "Open tomorrow's kit". Day-2 kit page: highlighted **Start with** card listing the fix steps; its LESSON_PLAN gets `focusFix` so section S1 is `warmup_fix`. Log `FIX_ADDED`. **Accept (Gate 15:00):** tally → insights → fix → Day-2 plan starts with the fix, on the live URL.

### P8 — Parent note (15:00–15:40)
- **P8.1 · F48 · Homework card** from `plan.homework` on the kit page.
- **P8.2 · F49 · M · PARENT_NOTE section** (fast model) + `/kits/[id]/parent` editor (language selector, editable text, live WhatsApp preview). `POST /api/kits/[id]/parent-note` saves ParentNote with `shareToken = nanoid(12)`.
- **P8.3 · F50 · U · Share + public page** (§12.3). Log `PARENT_NOTE_SHARED`. **Accept:** WhatsApp opens with Hindi text + link; `/p/<token>` works logged out on a phone.

### P9 — Dashboard, history, classrooms, settings (15:00–15:40, A + U)
- **P9.1 · F06 · U · `GET /api/dashboard`** returning every widget's data (§6) for the teacher (ActivityLog helper `logActivity(teacherId, type, {kitId, minutesSavedEstimate})` wired into all actions: kit 60, worksheet 20, quiz 15, parent note 5). **A:** widgets for the ticked features; recharts for class mastery. **Accept:** demo teacher's dashboard shows non-zero stats.
- **P9.2 · F51 · `/kits`** list with filters (class, subject, status), search, Duplicate (copy the kit + sections to another classroom), Delete.
- **P9.3 · F52, F54 · `/classrooms`** cards + detail (roster of roll numbers, results history, mastery trend, syllabus coverage).
- **P9.4 · F62a · `/settings`**: profile, school, defaults (language, period, low-resource), UI language.

### P10 — Language & voice
- **P10.1 · F28 · Content language** already flows through prompts; add the Language select to the kit form and a badge on the kit. Validator R10 active. **Accept:** a Hindi kit is fully Devanagari (except names/terms in brackets).
- **P10.2 · F29 · Hindi UI**: `src/lib/i18n.ts` dictionary `{en:{...}, hi:{...}}` for nav, buttons, headings; `useT()` reads `user.uiLanguage` (header toggle saves it). **Accept:** toggling switches the sidebar and main buttons.
- **P10.3 · F30 · Translate** button per section → `/api/kits/[id]/translate` (fast model, same schema) → saves as a new revision.
- **P10.4 · F31, F32, F33 · Voice (Sarvam)** per §12.4: `/api/voice/transcribe` + `/api/voice/tts` routes (thin Sarvam proxies), MicButton on `/kits/new` (fills the form via `/api/voice/parse`), the dashboard CTA and the regenerate box; 🔊 Listen button on the parent note and teacher script. Log `VOICE_USED`. **Accept:** saying "कक्षा 7 विज्ञान अध्याय 2 हिंदी में" in Chrome selects Class 7 → Science → Ch 2 → Hindi.

### P11 — Classroom modes
- **P11.1 · F37 · Low-resource**: switch in the kit form (default from classroom), prompt flag (§10.3), R9 active, "Blackboard-only" badge. **Accept:** materials contain only local objects.
- **P11.2 · F36 · Multi-grade**: for a multi-grade classroom the form shows grades; MULTIGRADE section (§10.5) rendered as a timeline with one lane per grade + tabs of per-grade worksheets + blackboard columns; R12 active; print one worksheet per grade. **Accept:** Class 6 + 7 kit shows the rotation with no gaps.
- **P11.3 · F61 · BLACKBOARD** section card: 1–3 columns drawn as a dark "board" UI.
- **P11.4 · F38 · Differentiated worksheet**: difficulty select → WORKSHEET prompt; optional "Generate easy + hard versions" (two extra WORKSHEET calls stored in `options.variants`).

### P12 — Extra bonus features
- **P12.1 · F16 · STARTER_QUIZ** section + card + print.
- **P12.2 · F17 · SUMMATIVE** section + card + print (sections A/B/C, blueprint table).
- **P12.3 · F67 · REMEDIAL** (pre-emptive) section card.
- **P12.4 · F66 · DIKSHA panel** `src/lib/diksha.ts` + `GET /api/kits/[id]/diksha` (§11.3) → panel with 3–5 links (name, type icon).
- **P12.5 · F34 · Photo input**: camera/file input → downscale to ≤ 1600 px on the client → `/api/ocr` (Gemini vision: "transcribe this textbook page") → used as the topic/source text for the kit.
- **P12.6 · F35 · PDF upload**: English PDF ≤ 4 MB → unpdf → Chapter(isSeeded=false, uploadedById).
- **P12.7 · F55 · `/library`**: chapter tree + page viewer.
- **P12.8 · F53 · `/schedule`**: week grid (Mon–Sat) listing kits by `scheduledFor`; change a kit's date via a select.
- **P12.9 · F02 · Google sign-in** via Better Auth social provider (needs Google OAuth client id/secret).

### P13 — Stretch
F42 ArUco scan (§12.5) · F43 OMR photo · F18b streaming plan text (`generateContentStream`) · F21 revision history UI + undo · F27 PPTX (e.g. `pptxgenjs`) · F32 server STT · F33 read-aloud · F58 PWA (manifest + service worker caching `/kits/[id]` pages) · F59 streak · F60 Google Docs export · F62 teaching-style profile · F63 prerequisite hint · F64 cost meter (tokens × price from GenerationLog, shown on the kit page) · F65 QR code on the worksheet (`qrcode` → `/p/[token]`) · F69 SVG blackboard diagram · F03 phone OTP.

### P14 — Polish, demo safety, submission (15:40–16:20)
- **P14.1 · F51b** landing page final (hero, 3-step visual, Try demo). **F70** help page (if ticked).
- **P14.2 · DEMO_MODE** tested on the live URL (set env, redeploy, run the whole demo). Keep a second Vercel deployment with `DEMO_MODE=true`.
- **P14.3 · Empty/error states** everywhere (no kits, section failed, rate-limited, offline).
- **P14.4 · Mobile check** at 375 px width for dashboard, kit page, results, `/p/[token]`.
- **P14.5 · README** (§15.3), contribution note (§15.4), screenshots, `PROGRESS.md` final.
- **P14.6 · Feature freeze at 15:40**; bugs only after that. Final push **by 16:20**.

---

## 14. TIMELINE & TEAM SPLIT (11:00 → 16:30)

> **Superseded by `TEAM_TASKS.md`** (final split: Monis = frontend + AI, Ujjwal = backend + infra, Ansh = light isolated tasks). Where this section or the owner letters in §13 disagree with `TEAM_TASKS.md`, follow `TEAM_TASKS.md`.


| Time | Monis (AI) | Ujjwal (Infra/Data) | Ansh (UI) | Checkpoint |
|---|---|---|---|---|
| 11:00–11:30 | Confirm rules with mentor; P0.4 schemas | P0.1, P0.2 | P0.3 | First deploy live |
| 11:30–12:30 | P3.1, P3.2 | P1.1–P1.3 | P1.4, start P4.1 on mock data | auth + schemas pushed |
| 12:30–13:30 | P3.3, P3.4 | P2.1, P2.3 (teacher), P2.4, P1.5 API | P4.1–P4.3, P1.5 UI | **13:30 Gate: chapter in → kit out (live)** |
| 13:30–14:00 | Lunch (staggered); save demo kit JSON | Lunch; P2.3 demo history | Lunch; P5.1/P5.2 UI | |
| 14:00–15:00 | P5.3, P7.1 API, P7.5 | P6.2, P9.1 API, logActivity | P6.1, P7.1 UI, P7.3 | **15:00 Gate: full loop works once** |
| 15:00–15:40 | P8.2, P10.1, ticked P11/P12 items | P8.3, P14.2 | P9 UI, P10.4 mic, mobile | |
| 15:40–16:05 | Bugs only; run demo twice | README, LICENSE, contribution note | Screenshots → slides; record ≤ 3-min video | Feature freeze |
| 16:05–16:25 | Rehearse own part | Final deploy, incognito phone test | Rehearse own part | **Final push by 16:20** |
| 16:30 | Submit: repo link, live URL, video, slides, contribution note, mentor name | | | |

Commit hygiene (the commit history is judged): each member commits from their own GitHub account, small commits every 20–40 min, conventional messages, `git pull --rebase` before push. Folder ownership avoids conflicts: M → `src/lib/ai`, `src/lib/validate.ts`, `src/lib/misconceptions.ts`, AI routes · U → `prisma/`, `src/lib/{db,auth,session,scope,activity,export-docx,diksha}.ts`, infra · A → `src/app/**/page.tsx`, `src/components/**`.

**Reality check:** 5.5 hours fits all Core features plus roughly 6–10 Bonus features. The phase order is the priority order, so whatever is unfinished at 15:40 is the lowest priority. The registry keeps everything so you can choose.

---

## 15. DEMO, SLIDES, README, CONTRIBUTIONS

### 15.1 Demo script (3 min)
| Time | Who | Screen | Line |
|---|---|---|---|
| 0:00–0:20 | Ansh | Landing → Try demo | "Meet Sunita ji, a Hindi-medium teacher in a single-teacher school near Barabanki. Classes 6 and 7 sit in one room." |
| 0:20–0:40 | Ansh | Dashboard | "Her dashboard shows what she planned, what her class got wrong, and time saved." |
| 0:40–1:25 | Monis | New kit → mic: "कक्षा 7 विज्ञान, अध्याय 2, हिंदी में" → sections fill; checker all green | "Every section is its own AI step, grounded in the NCERT chapter — every question shows its textbook page, and our code checks the AI." |
| 1:25–1:45 | Ansh | Edit a question; regenerate worksheet "make it easier"; Print → PDF in Hindi; Word | "The teacher stays in control — edit, redo one part, print on one A4 page." |
| 1:45–2:25 | Monis | Seeded taught kit → Results tally (12/40 chose B on Q2) → Insights → Add 5-min fix → Day-2 kit starts with the fix | "Each wrong option is a known mistake. Tomorrow's plan starts by fixing exactly that." |
| 2:25–2:45 | Ujjwal | Parent note → WhatsApp → open `/p/…` on phone | "Parents get a short Hindi homework note on WhatsApp — no app needed." |
| 2:45–3:00 | Ujjwal | Architecture / cost | "Live on Vercel + Neon, about ₹1 of AI per kit, works for any NCERT chapter we load." |
Backup: `DEMO_MODE=true` deployment + the recorded video open in a tab + phone hotspot.

### 15.2 Slides (≤ 6)
1. **Problem** — stats from §1.1.
2. **Solution** — chapter in → kit out; Hindi/English; voice; the next-day fix loop diagram.
3. **Technical approach** — Next.js on Vercel → per-section Gemini calls with JSON schemas → code validator → Neon Postgres → exports. "AI writes, code checks."
4. **What we built today** — screenshots + PS-01 MVP/bonus checklist (§1.3) with ✅/⚠️.
5. **Why us / impact** — vs Shiksha Copilot, Oak Aila, DIKSHA (NCERT page refs, multi-grade, fix loop, Hindi + voice, free); cost per kit; time saved.
6. **What comes next** — full NCERT library with pgvector RAG, DIKSHA content in plans, card/OMR scanning, offline PWA, Sarvam/Bhashini voice, state pilots.

### 15.3 README template
```markdown
# शिक्षक साथी · Shikshak Saathi
AI lesson-planning assistant for Indian school teachers — NCERT chapter in, full teaching kit out, in Hindi or English.
Hack-e-Awadh 2026 · PS-01 Teacher Lesson Planning Agent · Team NawabiCoders · Mentor: <name>

**Live demo:** <url> (demo login: demo@shikshak.app / demo1234) · **Video:** <link> · **Slides:** <link>

## Problem
## What it does
## How it works (approach)
## Tech stack
Next.js 16 · TypeScript · Tailwind v4 + shadcn/ui · Better Auth · Prisma 7 + Neon Postgres · Google Gemini (@google/genai) · Vercel
## Run locally
1. `git clone … && cd shikshak-saathi && npm install`
2. `cp .env.example .env` and fill it in
3. `npx prisma migrate deploy && npx prisma db seed`
4. `npm run dev` → http://localhost:3000 (demo@shikshak.app / demo1234)
Set `DEMO_MODE=true` to run without a Gemini key (cached kits).
## What works / what doesn't
| Feature | Status |
|---|---|
| … | ✅ / ⚠️ / ❌ |
Known limitations: only N NCERT chapters loaded; Hindi voice uses browser speech recognition (Chrome); …
## Team & contributions
## Licence
MIT — see LICENSE
```

### 15.4 Contribution note (edit to match what each person actually built)
- **Syed Monis Sarwar** — AI pipeline: Gemini client with JSON-schema outputs, section prompts (Hindi/English), the validator, the quiz → misconception → next-day fix logic, parent-note generation.
- **Ujjwal Gupta** — Repo and deployment, Neon Postgres + Prisma schema, NCERT chapter seeding with page text, Better Auth login and route protection, Word export, dashboard data, demo mode.
- **Ansh Kumar Vishwakarma** — All screens: onboarding, dashboard, kit wizard with Hindi voice input, kit editor with inline editing and regeneration, print/PDF layout, results and misconception views, public parent page; slides and demo video.

---

## 16. RISKS & CUT ORDER

| Risk | Mitigation |
|---|---|
| Gemini 429 / free-tier limits | 3 keys from 3 projects, rotation, fallback model, DEMO_MODE, build UI against mock JSON (don't spam regenerate) |
| Prisma installs 8.x RC | Pin 7.10.0 everywhere |
| Prisma 7 build error on Vercel | `postinstall: prisma generate`, `serverExternalPackages`, deploy early and often |
| `middleware.ts` from old tutorials | Next 16 uses `src/proxy.ts` |
| Garbled Hindi source | English grounding + Hindi output; optional Gemini transcription |
| Hindi breaks in PDF | Browser print + Noto Sans Devanagari |
| Invalid JSON / hallucinated pages | JSON schema + zod + validator R3 + one repair |
| Voice fails in a noisy hall | Sarvam first, browser Web Speech as fallback; typing always works; use `keyterms` (saaras:v4) or rehearse the phrase |
| Gemini down / rate-limited on stage | OpenRouter fallback (DeepSeek → GPT-6 Luna → Gemini via OpenRouter), then DEMO_MODE cache |
| Sarvam credits run out | Check the balance tonight; the automatic fallback to browser speech keeps the mic working |
| Wi-Fi down | Phone hotspot, DEMO_MODE, recorded video |
| Merge conflicts | Folder ownership (§14), small commits |
| Scope creep | Gates at 13:30 and 15:00, freeze at 15:40, cut order below |

**Cut order when behind (drop from the top):** card/OMR scan → summative → streaming → blackboard section → revision history UI → per-student grid → multi-grade → QR code → DOCX (keep PDF) → voice → dashboard charts (keep stat cards) → public parent page (keep WhatsApp text).
**Never cut:** login, chapter selection, objectives → plan → worksheet → exit quiz with page refs, edit + regenerate one section, PDF export, Hindi/English, tally → misconception → fix in tomorrow's plan, live URL, README + LICENSE.

---

## 17. NIGHT-BEFORE CHECKLIST (25 Sep — data, accounts, planning only; NO app code)
- [ ] Tick features in §3 as a team.
- [ ] **Sarvam API key** (dashboard.sarvam.ai): check credits and rate limits; test one speech-to-text call with a Hindi voice note.
- [ ] **OpenRouter API key** + a few dollars of credit; test one call with `deepseek/deepseek-v4.1-flash`.
- [ ] Accounts: GitHub (all 3 can push to one repo created tomorrow), Vercel, Neon project (note pooled + direct URLs), **one Gemini key per member in separate Google Cloud projects**; check limits at aistudio.google.com/rate-limit.
- [ ] Download the 8 PDFs in §11.1 into a `demo-data/` folder (moved into the repo tomorrow).
- [ ] Write 3–5 real misconceptions per demo chapter from your own knowledge (to sanity-check AI output).
- [ ] Slides draft (§15.2) with screenshot placeholders; demo script rehearsed on paper; decide who says what.
- [ ] Printouts: 5 blank tally sheets; ArUco cards only if F42 is ticked (ask the mentor whether printed cards count as prep).
- [ ] Machines: Node ≥ 22, git, gh, VS Code, Chrome, Docker (Ujjwal), Hindi input enabled on one laptop, phone hotspot, screen recorder.
- [ ] Ask the mentor at 11:00: are downloaded PDFs and this roadmap OK as prep? Note the answer.
- [ ] Sleep.

---

## 18. KICKOFF PROMPT FOR THE CODING AGENT (paste at 11:00 into Claude Sonnet 5)

```
You are  building "Shikshak Saathi" for a 5.5-hour hackathon. The full spec is roadmap.md in this repo.
1. Read roadmap.md completely before writing code. Obey §0.2 HARD RULES and §0.3 (how to use references).
2. Build only features ticked [x] in §3. Execute the tasks in §13 in order, P0 → P14.
3. For each task: FIRST open every reference it names (research/*.md line ranges, references/<repo>/<path>,
   and the matching rows of §19). Then implement in OUR stack, verify the task's "Accept" criteria,
   run `npx tsc --noEmit && npm run lint` (`npm run build` at the end of each phase), fix errors,
   commit with a conventional message, and append a line to PROGRESS.md.
4. Never write library code from memory when a reference or node_modules typings exist. Never invent
   the contents of a reference file; if a path is missing, grep that repo, else log "REF NOT FOUND" and
   follow the roadmap spec text.
5. MIT references may be adapted (rewritten into our TypeScript/Next/Gemini code, credited in README).
   Unlicensed references are ideas only. Never paste whole files.
6. Use exact versions (§7.1), model IDs (§7.2), and the schema/validator specs (§9, §10.4, §10.6).
7. Every DB query on teacher data filters by teacherId. Never send student names to the AI.
8. If something is impossible, pick the simplest working alternative, note why in PROGRESS.md, continue.
References root: /home/monis/awadh-hack/research and /home/monis/awadh-hack/references
My role today: <Monis | Ujjwal | Ansh>. My task list is in TEAM_TASKS.md (it overrides owners in roadmap §13/§14).
Do only my tasks, in order, and edit only files in my folder-ownership list.
Start with the first unfinished task for my role.
```

---

## 19. REFERENCE MAP (feature → what to read → what to take)

Paths are relative to `/home/monis/awadh-hack/`. `OAK` = `references/oak-ai-lesson-assistant`, `SC` = `references/Shiksha-Copilot`, `SA` = `OAK/packages/aila/src/lib/agentic-system/agents/sectionAgents`. Licence: **MIT** = adapt allowed (credit in README) · **none** = idea only.

### 19.1 Reference repos (cloned, `--depth 1`)
| Folder in `references/` | Upstream | Licence | Language | Best for |
|---|---|---|---|---|
| `oak-ai-lesson-assistant` | github.com/oaknational/oak-ai-lesson-assistant | MIT | TS / Next.js | Lesson-plan structure, section prompts, quiz/distractor rules, modify options, moderation, two-pane UI |
| `Shiksha-Copilot` | github.com/microsoft/Shiksha-Copilot | MIT | Python + Angular TS | Indian context, question-paper blueprint, Bloom verbs, DOCX/PPT export (client-side TS), chapter picker, safety list |
| `QuizScanner` | github.com/PiotrKajor/QuizScanner | MIT | Python / OpenCV | ArUco card scanning logic (F42) |
| `master-lesson` | github.com/andrewduggan-voom/master-lesson | none | TS | Consistency validator + repair; worksheet/answer key derived from one object |
| `reteach` | github.com/jacobuku/reteach | none | Python + HTML | Misconception-map idea and UI regrouping (prompts in Chinese) |
| `Edurag-chatbot` | github.com/kunwardhruv/Edurag-chatbot | none | Python + Next.js | Page-numbered chunks, citation-first answers |
| `ncert-mcp` | github.com/hatchedland/ncert-mcp | none | Python | Bloom tagging, CBSE test patterns, prerequisite graph |
| `prompt_distractor_generation_NAACL` | github.com/umass-ml4ed/prompt_distractor_generation_NAACL | none | Python | Misconception-tagged distractor prompts |
| `Sahayak-AI` | github.com/VvSdC/Sahayak-AI | none | Python | Textbook photo → worksheet, SVG blackboard visuals |
| `chiron` | github.com/JovannyEspinal/chiron | none | Python | Reviewer-agent prompts, student-text guardrails |

### 19.2 By feature
| Feature | Read (in this order) | Take | Licence |
|---|---|---|---|
| **P0/P1 scaffold, env, auth, proxy** (F01) | `research/agent3-stack-execution.md` lines 8–276 | Exact commands, versions, env list, Better Auth setup, `proxy.ts` | ours |
| **Onboarding & dashboard** (F05, F06) | `research/agent1-product-flow.md` lines 37–46 and 168–186; `SC/shiksha-website/shiksha-frontend/src/app/view/user/dashboard/dashboard.component.html` | Onboarding fields; widget list; dashboard layout idea | ours / MIT |
| **Chapter picker** (F07) | `SC/shiksha-website/shiksha-frontend/src/app/view/user/content-generation/lesson-content-list/lesson-content-list.component.html` + `.ts` | Board → class → subject → chapter cascade UX (rebuild with shadcn Select) | MIT |
| **Content source / seed** (F09, F68) | `research/agent2-ai-pipeline.md` lines 9–94; `references/Edurag-chatbot/backend/rag_pipeline.py` line 48 | unpdf extraction, page offsets, header cleanup; Hindi via Gemini transcription | ours / none |
| **Gemini wrapper** | `research/agent2-ai-pipeline.md` lines 123–226 | `generateJSON`, key rotation, model IDs, PDF/image/audio parts | ours |
| **OpenRouter fallback** | `research/voice-and-fallback.md` §5; https://openrouter.ai/docs/guides/features/structured-outputs | Request/response shape, `strict: false`, `require_parameters`, model order | ours |
| **Schemas** (F10–F17) | `research/agent2-ai-pipeline.md` lines 228–422, then §10.4 changes; `OAK/packages/aila/src/protocol/schema.ts` (~line 390) | All zod schemas; Oak field ideas | ours / MIT |
| **Objectives** (F10) | `SA/learningOutcomeAgent/learningOutcome.instructions.ts`; `SC/shiksha-api/app-service/prompts/blooms_taxonomy.yaml` | Measurable-outcome wording; Bloom verbs and question stems | MIT |
| **Lesson plan** (F11–F13) | `SA/cycleAgent/cycle.instructions.ts`; `SA/priorKnowledgeAgent/`, `SA/keyLearningPointsAgent/`, `SA/keywordsAgent/`; `SA/misconceptionsAgent/misconceptions.instructions.ts`; `OAK/packages/core/src/prompts/lesson-assistant/parts/body.ts`; `SC/shiksha-website/shiksha-backend/helper/data.helper.js` | Section-by-section pedagogy rules, misconception rules, a full Indian sample plan as target format | MIT |
| **Worksheet** (F14, F38) | `OAK/packages/teaching-materials/src/documents/teachingMaterials/comprehension/buildComprehensionPrompt.ts` + `schema.ts`; `SC/shiksha-api/app-service/prompts/question_paper_prompts.yaml` | Question-writing rules, CBSE question types, no-duplicate rule, HOTS | MIT |
| **Exit / starter quiz** (F15, F16) | `SA/shared/quizQuestionDesign.instructions.ts`; `SA/exitQuizAgent/exitQuiz.instructions.ts` + `exitQuiz.schema.ts`; `SA/starterQuizAgent/`; idea: `references/prompt_distractor_generation_NAACL/PromptFactory.py` lines 132–190 | Distractor-design rules; tag each distractor with a misconception + feedback | MIT / none |
| **Summative test** (F17) | `SC/shiksha-api/app-service/app/services/question_paper_service.py` (`_build_generation_slots`, `get_question_distribution`); `SC/shiksha-api/app-service/app/models/question_paper.py`; idea: `references/ncert-mcp/src/tools/question_paper.py` lines 1–60 | Blueprint → slots → batched generation; CBSE section patterns | MIT / none |
| **Section generation route + pipeline** (F18) | §10.1; `research/agent3-stack-execution.md` lines 703–752; `SC/shiksha-api/durable-functions/core/models/dag.py`; `SC/shiksha-api/durable-functions/README.md` | One call per section, dependency map, parallel stage | ours / MIT |
| **Kit page UI (two panes, sections stream in)** (F18, F19) | `OAK/apps/nextjs/src/components/AppComponents/Chat/chat-layout.tsx`, `chat-right-hand-side-lesson.tsx`, `chat-lessonPlanDisplay.tsx`, `lesson-plan-section/index.tsx`, `drop-down-section/drop-down-section-content.tsx`; `SC/shiksha-website/shiksha-frontend/src/app/view/user/content-generation/inspect-lesson-plan/inspect-lesson-plan.component.html` | Layout and section-card pattern (rebuild with shadcn; don't pull Oak's chat state machine) | MIT |
| **Regenerate / "make it easier"** (F20, F56) | `OAK/apps/nextjs/src/components/AppComponents/Chat/drop-down-section/action-button.types.ts`, `modify-button.tsx`; `OAK/packages/aila/src/lib/agentic-system/agents/sharedPromptParts/currentSectionValue.part.ts`, `userMessage.part.ts`; `SC/shiksha-website/shiksha-frontend/src/app/shared/components/regenerate-popup/`; `SC/shiksha-api/durable-functions/core/regen_query_generator.py` | Option list (easier / harder / shorter / more detail / other); prompt = current section value + teacher request | MIT |
| **Validator + repair** (F22) | `research/agent2-ai-pipeline.md` lines 477–504; idea: `references/master-lesson/src/validate/consistency.ts`, `references/master-lesson/src/generate/repair.ts`; optional AI check: `SC/shiksha-api/durable-functions/core/agents/validator_agent.py` | Rules R1–R12, violation list → one bounded repair | ours / none / MIT |
| **Page chips + source drawer** (F23) | `references/Edurag-chatbot/frontend/src/app/chat/page.tsx` (how citations are shown) | Citation display idea | none |
| **Print / PDF** (F24, F26) | `research/agent2-ai-pipeline.md` lines 520–536; idea: `references/master-lesson/src/derive/answerKey.ts`, `src/derive/worksheets.ts`, `src/render/html.ts` | Print CSS; worksheet and key rendered from the same objects | ours / none |
| **DOCX** (F25) | `SC/shiksha-website/shiksha-frontend/src/app/shared/services/lesson-docx-generator.service.ts`, `docx-utility.service.ts`; `research/agent2-ai-pipeline.md` lines 538–554 | Client-side `docx` document building; `cs` font for Hindi | MIT / ours |
| **PPTX** (F27) | `SC/shiksha-website/shiksha-frontend/src/app/shared/services/lesson-ppt-generator.service.ts`, `ppt-utility.service.ts` | Client-side slides from a lesson plan | MIT |
| **Oak-style exports** (reference only) | `OAK/packages/exports/src/dataHelpers/prepLessonPlanForDocs.ts`, `exportDocsWorksheet.ts` | How plan fields map to document sections (theirs targets Google Docs; ours doesn't) | MIT |
| **Hindi output & translate** (F28, F30) | §10.3; `SC/components/translation/inference/inference.py` (`translate_text`, `infer_on_data`) | Translate string leaves only, keep ids/structure | ours / MIT |
| **Hindi UI** (F29) | `SC/shiksha-website/shiksha-frontend/src/assets/i18n/en.json`, `kn.json`; `SC/shiksha-website/shiksha-frontend/src/app/shared/components/language-switcher/` | Dictionary-per-language + header switcher pattern | MIT |
| **Voice** (F31–F33) | `research/voice-and-fallback.md` §1–§4; https://docs.sarvam.ai/api-reference-docs/speech-to-text/transcribe ; https://docs.sarvam.ai/api-reference-docs/text-to-speech/convert ; idea: `references/Sahayak-AI/services/transcription_service.py` | Sarvam STT (saaras:v3 codemix) + TTS (bulbul:v3), Web Speech fallback | ours / none |
| **Multi-grade & blackboard** (F36, F61) | `research/agent1-product-flow.md` lines 188–201; idea: `references/Sahayak-AI/agents/visual_agent.py` (SVG diagram prompt) | Rotation lanes, one board column per grade | ours / none |
| **Low-resource** (F37) | §10.3 low-resource line; validator R9 | Prompt flag + rule | ours |
| **Results tally → misconceptions** (F40, F41, F44, F45) | §10.7; `research/agent2-ai-pipeline.md` lines 506–516; idea: `references/reteach/README.md`, `references/reteach/index.html` (regroup animation), `references/reteach/run.py` lines 288–410 | Pure counting function; "by misconception" view; groups; privacy (roll numbers only) | ours / none |
| **Next-day fix & remedial** (F46, F47, F67) | §10.7; `SA/additionalMaterialsAgent/additionalMaterials.instructions.ts` | 5-minute fix activity; attach to Day-2 kit | ours / MIT |
| **Card scan** (F42) | `references/QuizScanner/quizscanner/aruco.py` (line 21 dictionary, line 91 `answer_from_corners`), `cards.py`, `session.py`, `web/teacher.js`; `research/agent2-ai-pipeline.md` lines 580–596 | Rotation → answer mapping, printable cards, frame voting (port to js-aruco2) | MIT |
| **OMR photo** (F43) | `research/agent2-ai-pipeline.md` lines 597–602 | Gemini vision on a bubble strip | ours |
| **Parent note & WhatsApp** (F48–F50) | `research/agent2-ai-pipeline.md` lines 556–562; `SA/additionalMaterialsAgent/additionalMaterials.instructions.ts` (homework) | `wa.me` link, public token page | ours / MIT |
| **DIKSHA panel** (F66) | `research/agent2-ai-pipeline.md` lines 96–119 | Verified search request + play URL | ours |
| **Photo of textbook page** (F34) | `research/agent2-ai-pipeline.md` lines 200–215; idea: `references/Sahayak-AI/agents/textbook_agent.py` | Image `inlineData` → text / practice | ours / none |
| **Input safety & rate limit** (F57) | `OAK/packages/core/src/utils/ailaModeration/moderationPrompt.ts`, `moderationCategories.json`, `moderationSchema.ts`; `SC/shiksha-api/app-service/prompts/chat_prompts.yaml` (~line 32); idea: `references/chiron/src/chiron/guardrails.py` | Categories + India-specific refusal list; one cheap moderation call on free-text inputs | MIT / none |
| **Prerequisite hint** (F63) | idea: `references/ncert-mcp/src/curriculum_graph.py` lines 52–80 | Prompt for "topic A needs topic B" | none |
| **Reviewer loop (optional quality pass)** | idea: `references/chiron/src/chiron/prompts/reviewer_questions.txt`, `reviewer_plan.txt` | Checklist-style review prompt | none |
| **Schedule** (F53) | `SC/shiksha-website/shiksha-frontend/src/app/view/user/schedule/schedule-view/` | Week view idea | MIT |
| **Demo script, slides, README, risks** | `research/agent3-stack-execution.md` lines 754–917 | Hour plan, demo lines, templates, cut order | ours |

### 19.3 What NOT to take
- Oak's chat/agentic runtime (`packages/aila/src/lib/agentic-system/execution/*`, JSON-patch protocol): too big. We use one REST call per section.
- Oak's Google Docs/Slides export (`packages/exports/src/gSuite/*`) and Doppler/Clerk setup.
- Shiksha's Azure Durable Functions, Azure AI Search and fine-tuned translation model: infrastructure we don't have.
- master-lesson's `src/render/pdf.ts` (Playwright) and anything Anthropic-SDK specific.
- Any vector-DB code (Qdrant/FAISS in Shiksha, ncert-mcp, Edurag). The whole chapter fits in context (D3).
