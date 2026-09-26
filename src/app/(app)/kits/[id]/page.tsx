import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireTeacher } from "@/lib/session";
import { KitGenerationView } from "@/components/kit/kit-generation-view";

// ASSUMED CONTRACT (see the same note in api/kits/[id]/sections/[type]/route.ts):
// requireTeacher() resolves to { id: string, ... } for a logged-in teacher, or throws.
export default async function KitPage(props: PageProps<"/kits/[id]">) {
  const { id } = await props.params;

  let teacherId: string;
  try {
    const teacher = await requireTeacher();
    teacherId = teacher.id;
  } catch {
    notFound(); // proxy.ts (Ujjwal, P1.3) should already redirect before this renders
  }

  // Every query on teacher data is scoped by teacherId in-line here (hard rule §0.2.6) —
  // src/lib/scope.ts is Ujjwal's file and doesn't exist yet.
  const kit = await prisma.lessonKit.findFirst({
    where: { id, teacherId },
    include: { sections: true },
  });
  if (!kit) notFound();

  return (
    <KitGenerationView
      title={kit.title}
      kit={{
        id: kit.id,
        sections: kit.sections.map((s) => ({ type: s.type, status: s.status, content: s.content, error: s.error })),
      }}
    />
  );
}
