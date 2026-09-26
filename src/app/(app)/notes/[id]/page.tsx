import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import { getNoteForTeacher } from "@/lib/notes";
import { NoteLanguage, NoteSummary } from "@/lib/ai/prompts/notes";
import { NoteView } from "@/components/notes/note-view";

export default async function NotePage(props: PageProps<"/notes/[id]">) {
  const { id } = await props.params;
  // requireTeacher() redirects to /login on no session — must not be try/catch-wrapped.
  const teacher = await requireTeacher();

  let note;
  try {
    note = await getNoteForTeacher(id, teacher.id);
  } catch {
    notFound();
  }

  const summary = NoteSummary.safeParse(note.summary);

  return (
    <NoteView
      initialNote={{
        id: note.id,
        title: note.title,
        source: note.source,
        audioSeconds: note.audioSeconds,
        summaryLanguage: NoteLanguage.catch("auto").parse(note.summaryLanguage),
        transcript: note.transcript,
        summary: summary.success ? summary.data : null,
        summaryError: note.summaryError,
        myNotes: note.myNotes,
        createdAt: note.createdAt.toISOString(),
      }}
    />
  );
}
