import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import { getKitForTeacher } from "@/lib/scope";
import { SectionStatus, SectionType } from "@/generated/prisma/client";
import { LessonPlan, Worksheet, Quiz, ParentNote } from "@/lib/ai/schemas";
import type { DocKind } from "@/lib/export-docx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ExportButtons } from "@/components/kit/export-buttons";

const DOC_LABEL: Record<DocKind, string> = {
  plan: "Teacher's lesson plan",
  worksheet: "Student worksheet",
  answers: "Worksheet answer key",
  quiz: "Exit quiz (student)",
  quizkey: "Exit quiz answer key",
  parent: "Parent note",
};

export default async function ExportPage(props: PageProps<"/kits/[id]/export">) {
  const { id } = await props.params;
  const teacher = await requireTeacher();

  let kit;
  try {
    kit = await getKitForTeacher(id, teacher.id);
  } catch {
    notFound();
  }

  const section = (type: SectionType) => kit.sections.find((s) => s.type === type && s.status === SectionStatus.READY);
  const plan = section(SectionType.LESSON_PLAN);
  const worksheet = section(SectionType.WORKSHEET);
  const quiz = section(SectionType.EXIT_QUIZ);
  const parentNote = section(SectionType.PARENT_NOTE);

  const planData = plan ? LessonPlan.safeParse(plan.content) : undefined;
  const worksheetData = worksheet ? Worksheet.safeParse(worksheet.content) : undefined;
  const quizData = quiz ? Quiz.safeParse(quiz.content) : undefined;
  const parentNoteData = parentNote ? ParentNote.safeParse(parentNote.content) : undefined;

  const available: { kind: DocKind; ready: boolean }[] = [
    { kind: "plan", ready: !!planData?.success },
    { kind: "worksheet", ready: !!worksheetData?.success },
    { kind: "answers", ready: !!worksheetData?.success },
    { kind: "quiz", ready: !!quizData?.success },
    { kind: "quizkey", ready: !!quizData?.success },
    { kind: "parent", ready: !!parentNoteData?.success },
  ];
  const readyDocs = available.filter((d) => d.ready).map((d) => d.kind);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">{kit.title} — Export</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {available.map((d) => (
            <div key={d.kind} className="flex items-center justify-between text-sm">
              <span>{DOC_LABEL[d.kind]}</span>
              <Badge variant={d.ready ? "secondary" : "outline"}>{d.ready ? "Ready" : "Not generated"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/kits/${kit.id}/print?doc=all`} target="_blank" className={buttonVariants({ variant: "outline" })}>
          Print / Save as PDF
        </Link>
        <Link href={`/kits/${kit.id}/print?doc=worksheet&onepage=1`} target="_blank" className={buttonVariants({ variant: "outline" })}>
          One-page worksheet (A4)
        </Link>
        {readyDocs.length > 0 && (
          <ExportButtons
            kitId={kit.id}
            input={{ title: kit.title, plan: planData?.success ? planData.data : undefined, worksheet: worksheetData?.success ? worksheetData.data : undefined, quiz: quizData?.success ? quizData.data : undefined, parentNote: parentNoteData?.success ? parentNoteData.data : undefined }}
            availableDocs={readyDocs}
          />
        )}
      </div>
    </div>
  );
}
