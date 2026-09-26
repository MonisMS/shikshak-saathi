import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import { tx } from "@/lib/i18n";
import { getKitForTeacher } from "@/lib/scope";
import { SectionStatus, SectionType } from "@/generated/prisma/client";
import { Quiz } from "@/lib/ai/schemas";
import { TallyGrid } from "@/components/results/tally-grid";

export default async function ResultsPage(props: PageProps<"/kits/[id]/results">) {
  const { id } = await props.params;
  const teacher = await requireTeacher(); // must not be try/catch-wrapped
  const lang = teacher.uiLanguage === "hi" ? "hi" : "en";

  let kit;
  try {
    kit = await getKitForTeacher(id, teacher.id);
  } catch {
    notFound();
  }

  const quizSection = kit.sections.find((s) => s.type === SectionType.EXIT_QUIZ && s.status === SectionStatus.READY);
  const quiz = quizSection ? Quiz.safeParse(quizSection.content) : undefined;

  if (!quiz?.success) {
    return <p className="text-sm text-muted-foreground">{tx(lang, "Generate the exit quiz before recording results.", "परिणाम दर्ज करने से पहले निकास प्रश्नोत्तरी बनाएँ.")}</p>;
  }

  return <TallyGrid kitId={kit.id} title={kit.title} quiz={quiz.data} />;
}
