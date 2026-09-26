import { requireTeacher } from "@/lib/session";
import { prisma } from "@/lib/db";
import { NewKitForm } from "@/components/kit/new-kit-form";

// ASSUMED CONTRACT: requireTeacher() resolves to { id: string, ... } or throws (see
// api/kits/[id]/sections/[type]/route.ts). Curriculum + classrooms are fetched here
// directly via Prisma (teacherId-scoped in-line) instead of GET /api/curriculum /
// a classrooms-listing API, since neither exists yet (Ujjwal's api/** — this session
// avoided adding new files there per the folder-ownership split).
export default async function NewKitPage() {
  const teacher = await requireTeacher();

  const [chapters, classrooms] = await Promise.all([
    prisma.chapter.findMany({
      orderBy: [{ grade: "asc" }, { subject: "asc" }, { chapterNo: "asc" }],
      select: { id: true, grade: true, subject: true, chapterNo: true, titleEn: true, titleHi: true },
    }),
    prisma.classroom.findMany({
      where: { teacherId: teacher.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, subject: true, grades: true, studentCount: true, isMultiGrade: true, lowResource: true },
    }),
  ]);

  return <NewKitForm chapters={chapters} classrooms={classrooms} />;
}
