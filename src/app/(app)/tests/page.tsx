import { requireTeacher } from "@/lib/session";
import { prisma } from "@/lib/db";
import { TestsListView } from "@/components/tests/tests-list-view";

/** Every WORKSHEET/quiz the teacher has published for students to attempt online. */
export default async function TestsPage() {
  const teacher = await requireTeacher();

  const publications = await prisma.testPublication.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" },
    include: {
      kit: { select: { id: true, title: true } },
      submissions: { select: { id: true, evaluatedAt: true } },
    },
  });

  const tests = publications.map((p) => ({
    id: p.id,
    token: p.token,
    kitId: p.kit.id,
    kitTitle: p.kit.title,
    sectionType: p.sectionType,
    isOpen: p.isOpen,
    createdAt: p.createdAt.toISOString(),
    submissionCount: p.submissions.length,
    evaluatedCount: p.submissions.filter((s) => s.evaluatedAt).length,
  }));

  return <TestsListView tests={tests} />;
}
