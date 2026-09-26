import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import { tx } from "@/lib/i18n";
import { getKitForTeacher } from "@/lib/scope";
import { SectionStatus, SectionType } from "@/generated/prisma/client";
import { LessonPlan, Worksheet, Quiz, ParentNote } from "@/lib/ai/schemas";
import type { DocKind } from "@/lib/export-docx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ExportButtons } from "@/components/kit/export-buttons";
import { ExitTicketShare } from "@/components/kit/exit-ticket-share";

const DOC_LABEL: Record<DocKind, { en: string; hi: string }> = {
  plan: { en: "Teacher's lesson plan", hi: "शिक्षक की पाठ योजना" },
  worksheet: { en: "Student worksheet", hi: "छात्र वर्कशीट" },
  answers: { en: "Worksheet answer key", hi: "वर्कशीट उत्तर कुंजी" },
  quiz: { en: "Exit quiz (student)", hi: "निकास प्रश्नोत्तरी (छात्र)" },
  quizkey: { en: "Exit quiz answer key", hi: "निकास प्रश्नोत्तरी उत्तर कुंजी" },
  parent: { en: "Parent note", hi: "अभिभावक संदेश" },
};

export default async function ExportPage(props: PageProps<"/kits/[id]/export">) {
  const { id } = await props.params;
  const teacher = await requireTeacher();
  const lang = teacher.uiLanguage === "hi" ? "hi" : "en";

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
      <h1 className="text-2xl font-semibold tracking-tight">{kit.title} — {tx(lang, "Export", "डाउनलोड / प्रिंट")}</h1>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{tx(lang, "Documents", "दस्तावेज़")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {available.map((d) => (
            <div key={d.kind} className="flex items-center justify-between text-sm">
              <span>{DOC_LABEL[d.kind][lang]}</span>
              <Badge variant={d.ready ? "secondary" : "outline"}>{d.ready ? tx(lang, "Ready", "तैयार") : tx(lang, "Not generated", "नहीं बना")}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/kits/${kit.id}/print?doc=all`} target="_blank" className={buttonVariants({ variant: "outline" })}>
          {tx(lang, "Print / Save as PDF", "प्रिंट / PDF सहेजें")}
        </Link>
        <Link href={`/kits/${kit.id}/print?doc=worksheet&onepage=1`} target="_blank" className={buttonVariants({ variant: "outline" })}>
          {tx(lang, "One-page worksheet (A4)", "एक पन्ने की वर्कशीट (A4)")}
        </Link>
        {readyDocs.length > 0 && (
          <ExportButtons
            kitId={kit.id}
            input={{ title: kit.title, plan: planData?.success ? planData.data : undefined, worksheet: worksheetData?.success ? worksheetData.data : undefined, quiz: quizData?.success ? quizData.data : undefined, parentNote: parentNoteData?.success ? parentNoteData.data : undefined }}
            availableDocs={readyDocs}
          />
        )}
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{tx(lang, "Student exit ticket", "छात्र निकास टिकट")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ExitTicketShare kitId={kit.id} />
        </CardContent>
      </Card>
    </div>
  );
}
