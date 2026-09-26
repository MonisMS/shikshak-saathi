import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import { getKitForTeacher } from "@/lib/scope";
import { logActivity } from "@/lib/activity";
import { SectionStatus, SectionType } from "@/generated/prisma/client";
import { LessonPlan, Worksheet, Quiz, ParentNote } from "@/lib/ai/schemas";
import { PrintTrigger } from "@/components/print/print-trigger";
import { PrintPlan } from "@/components/print/print-plan";
import { PrintWorksheet } from "@/components/print/print-worksheet";
import { PrintQuiz } from "@/components/print/print-quiz";
import { PrintParentNote } from "@/components/print/print-parent-note";

export default async function PrintPage(props: PageProps<"/kits/[id]/print">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const rawDoc = Array.isArray(sp.doc) ? sp.doc[0] : sp.doc;
  const doc = rawDoc ?? "all";
  const onepage = (Array.isArray(sp.onepage) ? sp.onepage[0] : sp.onepage) === "1";

  // requireTeacher() redirects to /login on no session — must not be try/catch-wrapped.
  const teacher = await requireTeacher();

  let kit;
  try {
    kit = await getKitForTeacher(id, teacher.id);
  } catch {
    notFound();
  }

  const section = (type: SectionType) => kit.sections.find((s) => s.type === type && s.status === SectionStatus.READY);

  const planSection = section(SectionType.LESSON_PLAN);
  const worksheetSection = section(SectionType.WORKSHEET);
  const quizSection = section(SectionType.EXIT_QUIZ);
  const parentSection = section(SectionType.PARENT_NOTE);

  const plan = planSection ? LessonPlan.safeParse(planSection.content) : undefined;
  const worksheet = worksheetSection ? Worksheet.safeParse(worksheetSection.content) : undefined;
  const quiz = quizSection ? Quiz.safeParse(quizSection.content) : undefined;
  const parentNote = parentSection ? ParentNote.safeParse(parentSection.content) : undefined;

  const docs: React.ReactNode[] = [];
  const wantsAll = doc === "all";

  if ((doc === "plan" || wantsAll) && plan?.success) {
    docs.push(<PrintPlan key="plan" title={kit.title} plan={plan.data} />);
  }
  if ((doc === "worksheet" || wantsAll) && worksheet?.success) {
    docs.push(<PrintWorksheet key="worksheet" title={kit.title} worksheet={worksheet.data} showAnswers={false} />);
  }
  if ((doc === "answers" || wantsAll) && worksheet?.success) {
    docs.push(<PrintWorksheet key="answers" title={kit.title} worksheet={worksheet.data} showAnswers={true} />);
  }
  if ((doc === "quiz" || wantsAll) && quiz?.success) {
    docs.push(<PrintQuiz key="quiz" title={kit.title} quiz={quiz.data} teacherView={false} />);
  }
  if ((doc === "quizkey" || wantsAll) && quiz?.success) {
    docs.push(<PrintQuiz key="quizkey" title={kit.title} quiz={quiz.data} teacherView={true} />);
  }
  if ((doc === "parent" || wantsAll) && parentNote?.success) {
    docs.push(<PrintParentNote key="parent" title={kit.title} note={parentNote.data} />);
  }

  if (docs.length === 0) notFound();

  // P6.4: "log KIT_EXPORTED_PDF when print is opened" — this page's own load IS that open.
  await logActivity(teacher.id, "KIT_EXPORTED_PDF", { kitId: kit.id });

  return (
    <div className={onepage ? "text-xs leading-tight" : "text-sm leading-normal"}>
      <PrintTrigger />
      {docs.map((node, i) => (
        <div key={i} className={i > 0 ? "page-break" : undefined}>
          {node}
        </div>
      ))}
    </div>
  );
}
