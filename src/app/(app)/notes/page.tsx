import { requireTeacher } from "@/lib/session";
import { prisma } from "@/lib/db";
import { NoteSummary } from "@/lib/ai/prompts/notes";
import { NotesList } from "@/components/notes/notes-list";

/** Class Notes history (Wispr-style audio → transcript + summary). */
export default async function NotesPage() {
  const teacher = await requireTeacher();

  const notes = await prisma.classNote.findMany({
    where: { teacherId: teacher.id },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, source: true, audioSeconds: true, summary: true, createdAt: true },
  });

  const rows = notes.map((n) => {
    const summary = NoteSummary.safeParse(n.summary);
    return {
      id: n.id,
      title: n.title,
      source: n.source,
      audioSeconds: n.audioSeconds,
      overview: summary.success ? summary.data.overview : null,
      createdAt: n.createdAt.toISOString(),
    };
  });

  return <NotesList initialNotes={rows} />;
}
