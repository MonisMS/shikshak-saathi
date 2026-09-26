import { requireTeacher } from "@/lib/session";
import { prisma } from "@/lib/db";
import { NewKitForm } from "@/components/kit/new-kit-form";
import { listResources } from "@/lib/resources";
import type { VoiceIntentResult } from "@/components/voice/mic-button";

// Curriculum + classrooms are fetched here directly via Prisma (teacherId-scoped
// in-line) instead of GET /api/curriculum / a classrooms-listing API, since neither
// exists yet (Ujjwal's api/** — this session avoided adding new files there per the
// folder-ownership split).
export default async function NewKitPage(props: PageProps<"/kits/new">) {
  const teacher = await requireTeacher();
  const sp = await props.searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

  const initialIntent: VoiceIntentResult = {
    grade: one(sp.grade) ? Number(one(sp.grade)) : undefined,
    subject: one(sp.subject),
    chapterNo: one(sp.chapterNo) ? Number(one(sp.chapterNo)) : undefined,
    topic: one(sp.topic),
    language: one(sp.language) === "hi" || one(sp.language) === "en" ? (one(sp.language) as "hi" | "en") : undefined,
    teacherNote: one(sp.teacherNote),
  };
  const hasInitialIntent = Object.values(initialIntent).some((v) => v !== undefined);

  const [chapters, classrooms, library] = await Promise.all([
    prisma.chapter.findMany({
      orderBy: [{ grade: "asc" }, { subject: "asc" }, { chapterNo: "asc" }],
      select: { id: true, grade: true, subject: true, chapterNo: true, titleEn: true, titleHi: true },
    }),
    prisma.classroom.findMany({
      where: { teacherId: teacher.id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, subject: true, grades: true, studentCount: true, isMultiGrade: true, lowResource: true },
    }),
    listResources(teacher.id),
  ]);
  const preselected = one(sp.resource);

  return (
    <NewKitForm
      chapters={chapters}
      classrooms={classrooms}
      library={library}
      initialResourceIds={preselected && library.some((r) => r.id === preselected) ? [preselected] : []}
      initialIntent={hasInitialIntent ? initialIntent : undefined}
    />
  );
}
