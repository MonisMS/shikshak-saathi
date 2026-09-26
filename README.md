# Shikshak Saathi — शिक्षक साथी

> **Hack-e-Awadh 2026 · PS-01 Teacher Lesson Planning Agent · Team NawabiCoders, Lucknow**

**One chapter in, a full teaching kit out.**
_एक अध्याय दें, पूरी कक्षा की तैयारी पाएँ।_

---

## 🧩 Problem

- Only **19%** of a teacher's time goes to actual teaching (NIEPA study).
- **1,04,125** schools in India run with just one teacher (UDISE+ 2024-25).
- **42%** of students study in Hindi medium — but current AI tools are English-first, not NCERT-based, often paid, and assume a projector.
- NEP 2020 / CBSE demand competency-based questions and regular formative checks → more work for already-stretched teachers.

---

## 💡 Solution

A teacher picks a class, subject, and NCERT chapter — and gets:

```
Chapter selected
  → Learning objectives (Bloom-tagged, NCERT page refs)
  → Timed lesson plan (teacher script, materials, prior knowledge, keywords)
  → Worksheet + answer key (MCQ, fill-blank, short answer)
  → Formative exit quiz (each wrong option tagged to a known misconception)
  → Export as PDF or Word

After class:
  → Teacher enters quiz results
  → App shows which misconceptions the class holds
  → Generates a 5-min fix for tomorrow's lesson
  → Sends a parent homework note via WhatsApp
```

---

## 🚀 Live Demo

- **App:** *(link added after deployment)*
- **Demo login:** `demo@shikshak.app` / `demo1234`

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend + Backend | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Database | Prisma 7.10 + PostgreSQL (Neon) |
| Auth | Better Auth 1.7 |
| AI | Google Gemini via `@google/genai` (with OpenRouter fallback) |
| Voice | Sarvam AI (speech-to-text `saaras:v3`, TTS `bulbul:v3`) |
| Deployment | Vercel |

---

## ⚙️ Run Locally

```bash
git clone https://github.com/MonisMS/shikshak-saathi.git
cd shikshak-saathi
npm install
cp .env.example .env        # fill in your keys
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 👥 Team NawabiCoders

| Name | Role |
|---|---|
| **Syed Monis Sarwar** | Frontend + AI pipeline (kit generation, checker, dashboard, voice input) |
| **Ujjwal Gupta** | Backend (auth, NCERT seeding, APIs, Word export, Sarvam voice routes) |
| **Ansh Kumar Vishwakarma** | Landing page, Hindi UI strings, public parent-note page, settings, README, slides & demo video |

---

## 🏗️ What Works

| Feature | Status |
|---|---|
| NCERT chapter picker + typed topic input | ✅ |
| AI lesson kit generation (objectives, plan, worksheet, quiz) | ✅ |
| Inline edit + regenerate any section | ✅ |
| Validator (code-based checks, auto-repair) | ✅ |
| PDF export (browser print) + Word export | ✅ |
| Quiz result tally + misconception map | ✅ |
| Next-day 5-min fix generation | ✅ |
| Parent note + WhatsApp share | ✅ |
| Hindi / English output | ✅ |
| Voice input (Sarvam AI + Web Speech fallback) | ✅ |
| Demo mode (cached kits, works offline) | ✅ |

---

## 📚 Credits

- [Oak Aila](https://github.com/oaknational/oak-ai-lesson-assistant) — lesson plan schema and section agent patterns (MIT)
- [Shiksha Copilot](https://github.com/Shiksha-Copilot) — section dependency graph, question paper prompts (MIT)
- [QuizScanner](https://github.com/) — quiz parsing ideas (MIT)

---

## 📄 License

MIT © 2026 Team NawabiCoders
