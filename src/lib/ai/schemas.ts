import * as z from "zod";
import { SectionType } from "@/generated/prisma/enums";

export const Lang = z.enum(["en", "hi"]);
export const Bloom = z.enum(["remember", "understand", "apply", "analyze", "evaluate", "create"]);
export const PageRef = z
  .number()
  .int()
  .min(1)
  .max(400)
  .describe("Printed NCERT page number, must appear as [p.N] in the chapter text");

/* ---------- Input ---------- */
export const KitRequest = z.object({
  chapterId: z.string().optional(), // omitted for typed-topic kits
  topic: z.string().max(2000).optional(),
  grade: z.number().int().min(1).max(12),
  subject: z.string(),
  language: Lang,
  periodMinutes: z.number().int().min(20).max(90).default(40),
  classSize: z.number().int().min(1).max(120).default(40),
  lowResource: z.boolean().default(false), // blackboard + local objects only
  multiGrade: z.array(z.number().int()).optional(), // e.g. [6,7] same room
  teacherNote: z.string().max(500).optional(), // free text / voice transcript
  focusFix: z.array(z.string()).optional(), // misconception ids carried from yesterday
});

/* ---------- Voice intent (F31) ---------- */
export const VoiceIntent = z.object({
  grade: z.number().int().min(1).max(12).optional(),
  subject: z.string().optional(),
  chapterNo: z.number().int().optional(),
  topic: z.string().optional(),
  language: Lang.optional(),
  teacherNote: z.string().optional(),
});

/* ---------- Step 1: Objectives ---------- */
export const LearningObjective = z.object({
  id: z.string().regex(/^O\d+$/),
  text: z.string().describe("Students will be able to … (measurable verb)"),
  bloom: Bloom,
  competency: z.string().describe("NCF/NEP competency phrased briefly"),
  pageRefs: z.array(PageRef).min(1),
});
export const Objectives = z.object({
  chapterSummary: z.string().max(600),
  objectives: z.array(LearningObjective).min(3).max(5),
});

/* ---------- Step 2: Lesson plan (Oak-style fields) ---------- */
export const Misconception = z.object({
  id: z.string().regex(/^M\d+$/),
  misconception: z.string().describe("What students wrongly believe, in their words"),
  correction: z.string(),
  pageRef: PageRef,
});
export const LessonSection = z.object({
  id: z.string().regex(/^S\d+$/),
  phase: z.enum(["warmup_fix", "starter", "explain", "activity", "practice", "exit_check", "wrap_up"]),
  title: z.string(),
  minutes: z.number().int().min(1).max(40),
  teacherSays: z.string().describe("Script the teacher can read aloud"),
  studentsDo: z.string(),
  materials: z.array(z.string()), // lowResource ⇒ only blackboard/chalk/local objects
  objectiveIds: z.array(z.string()), // O1..
  pageRefs: z.array(PageRef),
  checkForUnderstanding: z.string().optional(),
});
export const LessonPlan = z.object({
  title: z.string(),
  learningOutcome: z.string(),
  priorKnowledge: z.array(z.string()).min(2).max(5),
  keyLearningPoints: z.array(z.string()).min(3).max(6),
  keywords: z.array(z.object({ term: z.string(), definition: z.string() })).min(3).max(8),
  misconceptions: z.array(Misconception).min(2).max(5),
  sections: z.array(LessonSection).min(4).max(8), // sum(minutes) === periodMinutes
  homework: z.string(),
});

/* ---------- Blackboard layout (low-resource + multigrade) — own section ---------- */
export const BlackboardLayout = z.object({
  columns: z
    .array(
      z.object({
        heading: z.string(),
        forGrade: z.number().int().optional(), // multigrade: one column per grade
        lines: z.array(z.string()).max(10),
        drawing: z.string().optional().describe("Simple chalk-drawable diagram description"),
      }),
    )
    .min(1)
    .max(3),
});
export const Blackboard = BlackboardLayout;

/* ---------- Step 3: Worksheet (CBSE question types) ---------- */
export const WorksheetQuestion = z.object({
  id: z.string().regex(/^W\d+$/),
  type: z.enum(["mcq", "fill_blank", "true_false", "match", "short_answer", "long_answer", "case_based", "assertion_reason"]),
  prompt: z.string().describe("For fill_blank use ____ for each blank"),
  options: z.array(z.string()).optional(), // mcq / assertion_reason: exactly 4
  matchPairs: z.array(z.object({ left: z.string(), right: z.string() })).optional(),
  caseText: z.string().optional(), // case_based passage
  subQuestions: z.array(z.string()).optional(), // case_based
  answer: z.string().describe("Answer key; for fill_blank, answers separated by ' | ' in blank order"),
  marks: z.number().int().min(1).max(5),
  difficulty: z.enum(["easy", "medium", "hard"]),
  bloom: Bloom,
  objectiveId: z.string(),
  pageRef: PageRef.optional(), // typed-topic kits have no pages
});
export const Worksheet = z.object({
  title: z.string(),
  instructions: z.string(),
  questions: z.array(WorksheetQuestion).min(6).max(15),
  totalMarks: z.number().int(),
});

/* ---------- Step 4: Formative quiz (misconception-tagged); used by EXIT_QUIZ and STARTER_QUIZ ---------- */
export const QuizOption = z.object({
  id: z.enum(["A", "B", "C", "D"]),
  text: z.string(),
  correct: z.boolean(),
  misconceptionId: z.string().optional().describe("Required for every wrong option: M1..Mn from the lesson plan"),
  whyWrong: z.string().optional().describe("One-line fix hint for the teacher"),
});
export const QuizQuestion = z.object({
  id: z.string().regex(/^Q\d+$/),
  stem: z.string(),
  options: z.array(QuizOption).length(4),
  objectiveId: z.string(),
  pageRef: PageRef.optional(), // typed-topic kits have no pages
  bloom: Bloom,
});
export const Quiz = z.object({
  kind: z.enum(["starter", "exit"]),
  questions: z.array(QuizQuestion).min(3).max(6),
});

/* ---------- Optional: Summative ---------- */
export const Summative = z.object({
  title: z.string(),
  durationMinutes: z.number().int(),
  blueprint: z.array(z.object({ bloom: Bloom, marks: z.number().int() })), // weight by Bloom
  sections: z.array(
    z.object({
      name: z.string(), // "Section A – MCQ (1 mark each)"
      questions: z.array(WorksheetQuestion),
    }),
  ),
  totalMarks: z.number().int(),
});

/* ---------- Remedial (after quiz tally); studentsAffected is tracked on Misconception, not the model ---------- */
export const RemedialActivity = z.object({
  misconceptionId: z.string(),
  title: z.string(),
  minutes: z.number().int().min(3).max(10),
  steps: z.array(z.string()).min(2).max(6),
  materials: z.array(z.string()), // local objects only
  checkQuestion: z.string(), // 1 quick oral re-check
  pageRef: PageRef.optional(),
});
export const RemedialPlan = z.object({
  activities: z.array(RemedialActivity).min(1).max(3),
  groupingSuggestion: z.string(), // e.g. "pair each M2 student with a peer who got Q3 right"
});

/* ---------- Parent note ---------- */
export const ParentNote = z.object({
  language: Lang,
  learnedToday: z.string(),
  homework: z.string(),
  homeActivity: z.string().describe("One activity with household items"),
  askYourChild: z.array(z.string()).max(3),
  whatsappText: z.string().max(700).describe("WhatsApp-length, plain words, no jargon"),
});

/* ---------- Multi-grade variant ---------- */
export const MultiGrade = z.object({
  grades: z
    .array(
      z.object({
        grade: z.number().int(),
        focus: z.string(),
        task: z.string(), // what this grade does while teacher is with the other
        worksheetQuestions: z.array(WorksheetQuestion).min(3).max(6),
      }),
    )
    .min(2)
    .max(3),
  rotation: z.array(
    z.object({
      minuteFrom: z.number().int(),
      minuteTo: z.number().int(),
      teacherWith: z.number().int(), // grade
      othersDo: z.string(),
    }),
  ),
  blackboard: BlackboardLayout, // one column per grade
});

/* ---------- Section schema map (one call per section, no whole-kit schema) ---------- */
export const SECTION_SCHEMAS = {
  [SectionType.OBJECTIVES]: Objectives,
  [SectionType.LESSON_PLAN]: LessonPlan,
  [SectionType.BLACKBOARD]: Blackboard,
  [SectionType.MULTIGRADE]: MultiGrade,
  [SectionType.WORKSHEET]: Worksheet,
  [SectionType.EXIT_QUIZ]: Quiz,
  [SectionType.STARTER_QUIZ]: Quiz,
  [SectionType.SUMMATIVE]: Summative,
  [SectionType.REMEDIAL]: RemedialPlan,
  [SectionType.PARENT_NOTE]: ParentNote,
} as const satisfies Record<SectionType, z.ZodType>;

export type SectionContent<T extends SectionType> = z.infer<(typeof SECTION_SCHEMAS)[T]>;
