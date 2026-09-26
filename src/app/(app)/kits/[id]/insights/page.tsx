import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import { tx } from "@/lib/i18n";
import { getKitForTeacher } from "@/lib/scope";
import { prisma } from "@/lib/db";
import { SectionStatus, SectionType } from "@/generated/prisma/client";
import { Quiz, LessonPlan } from "@/lib/ai/schemas";
import { tallyFromRows, misconceptionCounts, questionAccuracy, objectiveMastery } from "@/lib/misconceptions";
import { InsightsView } from "@/components/results/insights-view";

/**
 * Reads straight from `QuestionTally` rows via Prisma rather than a
 * `GET /api/kits/[id]/insights` endpoint — nothing here needs an API that doesn't
 * exist yet; `misconceptionCounts`/`questionAccuracy`/`objectiveMastery` (mine) are
 * pure, so they run the same whether the tally rows came from Ujjwal's
 * `POST /api/kits/[id]/results` (F40) or anywhere else.
 */
export default async function InsightsPage(props: PageProps<"/kits/[id]/insights">) {
  const { id } = await props.params;
  const teacher = await requireTeacher();
  const lang = teacher.uiLanguage === "hi" ? "hi" : "en";

  let kit;
  try {
    kit = await getKitForTeacher(id, teacher.id);
  } catch {
    notFound();
  }

  const quizSection = kit.sections.find((s) => s.type === SectionType.EXIT_QUIZ && s.status === SectionStatus.READY);
  const planSection = kit.sections.find((s) => s.type === SectionType.LESSON_PLAN && s.status === SectionStatus.READY);
  const quiz = quizSection ? Quiz.safeParse(quizSection.content) : undefined;
  const plan = planSection ? LessonPlan.safeParse(planSection.content) : undefined;

  if (!quiz?.success || !plan?.success) {
    return <p className="text-sm text-muted-foreground">{tx(lang, "Generate the lesson plan and exit quiz first.", "पहले पाठ योजना और निकास प्रश्नोत्तरी बनाएँ.")}</p>;
  }

  const session = await prisma.quizSession.findFirst({
    where: { kitId: kit.id },
    orderBy: { takenAt: "desc" },
    include: { tallies: true },
  });

  if (!session) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{tx(lang, "No quiz results recorded yet.", "अभी कोई परिणाम दर्ज नहीं हुआ.")}</p>
        <Link href={`/kits/${kit.id}/results`} className="text-sm underline">
          {tx(lang, "Enter results", "परिणाम दर्ज करें")}
        </Link>
      </div>
    );
  }

  const tally = tallyFromRows(session.tallies);
  const misconceptions = misconceptionCounts(quiz.data, plan.data, tally, session.studentsPresent);
  const accuracy = questionAccuracy(quiz.data, tally, session.studentsPresent);
  const mastery = objectiveMastery(quiz.data, tally, session.studentsPresent);

  return <InsightsView kitId={kit.id} title={kit.title} misconceptions={misconceptions} accuracy={accuracy} mastery={mastery} />;
}
