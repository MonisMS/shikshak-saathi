import { requireTeacher } from "@/lib/session";
import { prisma } from "@/lib/db";
import { KitsListView } from "@/components/kit/kits-list-view";

/** F51: kit history with filters, search, duplicate, delete. */
export default async function KitsPage({ searchParams }: PageProps<"/kits">) {
  const teacher = await requireTeacher();
  const q = (await searchParams).q;
  const initialSearch = typeof q === "string" ? q : "";

  const [kits, classrooms] = await Promise.all([
    prisma.lessonKit.findMany({
      where: { teacherId: teacher.id },
      orderBy: { createdAt: "desc" },
      include: {
        chapter: { select: { titleEn: true, titleHi: true, subject: true } },
        classroom: { select: { id: true, name: true } },
        quizSessions: { select: { id: true }, take: 1 },
      },
    }),
    prisma.classroom.findMany({ where: { teacherId: teacher.id }, select: { id: true, name: true } }),
  ]);

  const rows = kits.map((k) => ({
    id: k.id,
    title: k.title,
    status: k.status,
    hasResults: k.quizSessions.length > 0,
    classroomId: k.classroomId,
    classroomName: k.classroom?.name ?? null,
    subject: k.chapter?.subject ?? null,
    createdAt: k.createdAt.toISOString(),
  }));

  return <KitsListView key={initialSearch} initialKits={rows} classrooms={classrooms} initialSearch={initialSearch} />;
}
