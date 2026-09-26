import type { z } from "zod";
import {
  Objectives,
  LessonPlan,
  Worksheet,
  Quiz,
  Blackboard,
  RemedialPlan,
  ParentNote,
} from "@/lib/ai/schemas";

/**
 * A full mock kit for Class 7 Science Ch 2 (Acids, Bases and Salts), used by
 * A's UI work before the AI pipeline (M3/M4) is wired up.
 */

export const mockObjectives: z.infer<typeof Objectives> = {
  chapterSummary:
    "This chapter introduces acids, bases and salts through everyday examples (lemon juice, soap, baking soda), litmus and pH testing, and the idea of neutralisation.",
  objectives: [
    {
      id: "O1",
      text: "Students will be able to classify common household substances as acidic, basic or neutral using litmus paper.",
      bloom: "apply",
      competency: "Scientific inquiry — classification through observation",
      pageRefs: [18, 19],
    },
    {
      id: "O2",
      text: "Students will be able to explain neutralisation as the reaction between an acid and a base.",
      bloom: "understand",
      competency: "Conceptual understanding of chemical change",
      pageRefs: [22],
    },
    {
      id: "O3",
      text: "Students will be able to relate the pH scale to everyday substances (lemon, soap, milk, antacid).",
      bloom: "apply",
      competency: "Connecting science to daily life (NEP 2020)",
      pageRefs: [20, 21],
    },
    {
      id: "O4",
      text: "Students will be able to describe one safety precaution while handling acids and bases in the lab.",
      bloom: "remember",
      competency: "Safety awareness in scientific practice",
      pageRefs: [23],
    },
  ],
};

export const mockLessonPlan: z.infer<typeof LessonPlan> = {
  title: "Acids, Bases and Salts — Class 7 Science, Ch 2",
  learningOutcome:
    "By the end of the period, students can test common substances with litmus and explain what neutralisation means.",
  priorKnowledge: [
    "Students have tasted sour (khatta) and bitter (kadwa) foods and can describe the difference.",
    "Students have seen soap and washing soda used at home.",
  ],
  keyLearningPoints: [
    "Acids turn blue litmus red; bases turn red litmus blue.",
    "A substance that does not change litmus colour is neutral.",
    "Mixing an acid and a base cancels out their properties — this is neutralisation.",
    "The pH scale runs from 0 (strong acid) to 14 (strong base); 7 is neutral.",
  ],
  keywords: [
    { term: "Acid", definition: "A substance that turns blue litmus red; tastes sour." },
    { term: "Base", definition: "A substance that turns red litmus blue; feels soapy." },
    { term: "Neutralisation", definition: "The reaction of an acid with a base to form a salt and water." },
    { term: "Indicator", definition: "A substance (like litmus) that changes colour to show acid or base." },
  ],
  misconceptions: [
    {
      id: "M1",
      misconception: "Students think all sour-tasting things are dangerous acids.",
      correction: "Many acids (like citric acid in lemons) are safe to eat; danger depends on strength and concentration.",
      pageRef: 19,
    },
    {
      id: "M2",
      misconception: "Students think neutralisation means the mixture disappears or becomes nothing.",
      correction: "Neutralisation forms a new substance — a salt and water — it does not vanish.",
      pageRef: 22,
    },
  ],
  sections: [
    {
      id: "S1",
      phase: "starter",
      title: "Taste and guess",
      minutes: 5,
      teacherSays: "आज हम जानेंगे कि खट्टी और साबुन जैसी चीज़ों में क्या अंतर है। (Today we'll find out what makes things sour or soapy.)",
      studentsDo: "Recall foods that taste sour and things at home that feel soapy.",
      materials: ["blackboard", "chalk"],
      objectiveIds: ["O1"],
      pageRefs: [18],
    },
    {
      id: "S2",
      phase: "explain",
      title: "Litmus test demonstration",
      minutes: 12,
      teacherSays: "Explain that litmus paper is an indicator: blue turns red in acid, red turns blue in base.",
      studentsDo: "Watch the demonstration and note colour changes on the blackboard table.",
      materials: ["litmus paper (or beetroot/turmeric extract as local substitute)", "lemon juice", "soap solution"],
      objectiveIds: ["O1", "O3"],
      pageRefs: [18, 19, 20],
    },
    {
      id: "S3",
      phase: "activity",
      title: "Classify household substances",
      minutes: 10,
      teacherSays: "In pairs, decide whether each substance on the board is acidic, basic or neutral.",
      studentsDo: "Discuss in pairs and write A/B/N against each substance in their notebooks.",
      materials: ["blackboard list of 6 substances"],
      objectiveIds: ["O1", "O3"],
      pageRefs: [20, 21],
    },
    {
      id: "S4",
      phase: "practice",
      title: "Neutralisation — the antacid story",
      minutes: 8,
      teacherSays: "Explain why people take an antacid tablet (a mild base) for acidity — it neutralises excess stomach acid.",
      studentsDo: "Answer: 'What happens when an acid meets a base?' in one sentence.",
      materials: ["blackboard"],
      objectiveIds: ["O2"],
      pageRefs: [22],
      checkForUnderstanding: "Ask 2 students to explain neutralisation in their own words.",
    },
    {
      id: "S5",
      phase: "exit_check",
      title: "Exit quiz",
      minutes: 5,
      teacherSays: "Let's check what we learned today with a few quick questions.",
      studentsDo: "Answer the exit quiz individually.",
      materials: ["worksheet or oral questions"],
      objectiveIds: ["O1", "O2", "O3", "O4"],
      pageRefs: [],
    },
  ],
  homework: "Ask a family member which household items are acidic or basic and note 3 examples in your notebook.",
};

export const mockBlackboard: z.infer<typeof Blackboard> = {
  columns: [
    {
      heading: "Acids vs Bases",
      lines: [
        "Acid: sour taste, turns blue litmus RED",
        "Base: soapy feel, turns red litmus BLUE",
        "Neutral: no colour change",
        "Acid + Base = Salt + Water (neutralisation)",
      ],
      drawing: "Two circles labelled 'Acid' and 'Base' with an arrow between them labelled 'neutralisation → salt + water'.",
    },
  ],
};

export const mockWorksheet: z.infer<typeof Worksheet> = {
  title: "Worksheet — Acids, Bases and Salts",
  instructions: "Answer all questions in your notebook. Use full sentences where asked.",
  questions: [
    {
      id: "W1",
      type: "mcq",
      prompt: "Which of these turns blue litmus paper red?",
      options: ["Lemon juice", "Soap solution", "Baking soda solution", "Plain water"],
      answer: "Lemon juice",
      marks: 1,
      difficulty: "easy",
      bloom: "remember",
      objectiveId: "O1",
      pageRef: 18,
    },
    {
      id: "W2",
      type: "fill_blank",
      prompt: "A substance that does not change the colour of litmus is called ____.",
      answer: "neutral",
      marks: 1,
      difficulty: "easy",
      bloom: "remember",
      objectiveId: "O1",
      pageRef: 19,
    },
    {
      id: "W3",
      type: "true_false",
      prompt: "Neutralisation means an acid and a base cancel out to form a new substance.",
      answer: "True",
      marks: 1,
      difficulty: "easy",
      bloom: "understand",
      objectiveId: "O2",
      pageRef: 22,
    },
    {
      id: "W4",
      type: "short_answer",
      prompt: "Explain in 2 sentences why a person takes an antacid tablet when they have acidity.",
      answer: "Stomach acidity means excess acid; an antacid tablet is a mild base that neutralises the extra acid and relieves discomfort.",
      marks: 2,
      difficulty: "medium",
      bloom: "understand",
      objectiveId: "O2",
      pageRef: 22,
    },
    {
      id: "W5",
      type: "match",
      prompt: "Match each substance to whether it is acidic or basic.",
      matchPairs: [
        { left: "Lemon juice", right: "Acidic" },
        { left: "Soap", right: "Basic" },
        { left: "Vinegar", right: "Acidic" },
        { left: "Washing soda", right: "Basic" },
      ],
      answer: "Lemon juice–Acidic | Soap–Basic | Vinegar–Acidic | Washing soda–Basic",
      marks: 2,
      difficulty: "medium",
      bloom: "apply",
      objectiveId: "O3",
      pageRef: 21,
    },
    {
      id: "W6",
      type: "case_based",
      prompt: "Read the passage and answer the questions below.",
      caseText:
        "Reena's mother added a spoon of baking soda to a pan where she had accidentally spilled a strong-smelling vinegar solution. Reena noticed bubbles and the smell reduced.",
      subQuestions: [
        "Was the vinegar acting as an acid or a base?",
        "What type of reaction happened when baking soda was added?",
      ],
      answer: "1. Acid. 2. Neutralisation reaction (baking soda, a mild base, neutralised the acidic vinegar).",
      marks: 2,
      difficulty: "hard",
      bloom: "analyze",
      objectiveId: "O2",
      pageRef: 22,
    },
  ],
  totalMarks: 10,
};

export const mockExitQuiz: z.infer<typeof Quiz> = {
  kind: "exit",
  questions: [
    {
      id: "Q1",
      stem: "Which of these is a basic (not acidic) substance?",
      options: [
        { id: "A", text: "Lemon juice", correct: false, misconceptionId: "M1", whyWrong: "Lemon juice is acidic, not basic — remind them of the litmus test result." },
        { id: "B", text: "Soap solution", correct: true },
        { id: "C", text: "Vinegar", correct: false, misconceptionId: "M1", whyWrong: "Vinegar is a common acid used in cooking." },
        { id: "D", text: "Orange juice", correct: false, misconceptionId: "M1", whyWrong: "Citrus juices are acidic." },
      ],
      objectiveId: "O1",
      pageRef: 20,
      bloom: "remember",
    },
    {
      id: "Q2",
      stem: "What happens when an acid and a base react together?",
      options: [
        { id: "A", text: "They form a salt and water (neutralisation)", correct: true },
        { id: "B", text: "The mixture disappears completely", correct: false, misconceptionId: "M2", whyWrong: "Nothing disappears — a new substance (salt + water) is formed." },
        { id: "C", text: "The acid becomes stronger", correct: false, misconceptionId: "M2", whyWrong: "The acid is neutralised, not strengthened." },
        { id: "D", text: "Nothing happens", correct: false, misconceptionId: "M2", whyWrong: "A real chemical reaction takes place — bubbles or heat may be observed." },
      ],
      objectiveId: "O2",
      pageRef: 22,
      bloom: "understand",
    },
    {
      id: "Q3",
      stem: "On the pH scale, a value of 7 means the substance is:",
      options: [
        { id: "A", text: "Strongly acidic", correct: false },
        { id: "B", text: "Neutral", correct: true },
        { id: "C", text: "Strongly basic", correct: false },
        { id: "D", text: "Not measurable", correct: false },
      ],
      objectiveId: "O3",
      pageRef: 21,
      bloom: "remember",
    },
  ],
};

export const mockRemedialPlan: z.infer<typeof RemedialPlan> = {
  activities: [
    {
      misconceptionId: "M2",
      title: "5-minute fix: 'Where does it go?'",
      minutes: 5,
      steps: [
        "Draw a beaker of acid and a beaker of base on the blackboard.",
        "Draw an arrow showing them combining into one new beaker labelled 'salt + water'.",
        "Ask: 'Did the acid disappear, or did it become something new?' and take 2 answers.",
      ],
      materials: ["chalk", "blackboard"],
      checkQuestion: "If you mix an acid and a base, what two things do you get? (salt and water)",
      pageRef: 22,
    },
  ],
  groupingSuggestion: "Pair each student who missed Q2 with a neighbour who answered it correctly, for 2 minutes of peer explanation.",
};

export const mockParentNote: z.infer<typeof ParentNote> = {
  language: "hi",
  learnedToday: "आज बच्चों ने सीखा कि कौन-सी चीज़ें अम्लीय (खट्टी) हैं और कौन-सी क्षारीय (साबुन जैसी) हैं, और लिटमस पेपर से इसकी जांच कैसे करते हैं।",
  homework: "घर पर 3 चीज़ें खोजें जो खट्टी या साबुन जैसी हों और उन्हें नोटबुक में लिखें।",
  homeActivity: "नींबू के रस और साबुन के पानी से हल्दी के कागज़ पर रंग बदलने का प्रयोग करें (घर पर उपलब्ध चीज़ों से)।",
  askYourChild: [
    "नींबू में कौन-सा गुण होता है — अम्ल या क्षार?",
    "साबुन और नींबू मिलाने पर क्या होगा?",
  ],
  whatsappText:
    "आज कक्षा 7 विज्ञान में बच्चों ने अम्ल-क्षार के बारे में सीखा। घर पर पूछें: नींबू अम्ल है या क्षार? गृहकार्य: घर की 3 चीज़ों को अम्ल/क्षार में बाँटना है।",
};

export const mockKit = {
  objectives: mockObjectives,
  plan: mockLessonPlan,
  blackboard: mockBlackboard,
  worksheet: mockWorksheet,
  exitQuiz: mockExitQuiz,
  remedial: mockRemedialPlan,
  parentNote: mockParentNote,
};
