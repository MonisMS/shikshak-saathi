import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TestDetailView } from "@/components/tests/test-detail-view";
import type { PerQuestionResult } from "@/lib/tests";

export default async function TestDetailPage(props: PageProps<"/tests/[id]">) {
  const { id } = await props.params;
  const teacher = await requireTeacher();

  const publication = await prisma.testPublication.findFirst({
    where: { id, teacherId: teacher.id },
    include: {
      kit: { select: { id: true, title: true } },
      submissions: { orderBy: { submittedAt: "desc" } },
    },
  });
  if (!publication) notFound();

  return (
    <TestDetailView
      test={{
        id: publication.id,
        token: publication.token,
        kitId: publication.kit.id,
        kitTitle: publication.kit.title,
        sectionType: publication.sectionType,
        isOpen: publication.isOpen,
        gradingInstructions: publication.gradingInstructions ?? "",
      }}
      submissions={publication.submissions.map((s) => ({
        id: s.id,
        studentName: s.studentName,
        source: s.source,
        answers: s.answers as Record<string, string>,
        perQuestion: (s.perQuestion as unknown as Record<string, PerQuestionResult>) ?? {},
        autoMarks: s.autoMarks,
        aiMarks: s.aiMarks,
        maxMarks: s.maxMarks,
        evaluatedAt: s.evaluatedAt?.toISOString() ?? null,
        submittedAt: s.submittedAt.toISOString(),
      }))}
    />
  );
}
