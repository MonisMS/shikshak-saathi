import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireTeacher } from "@/lib/session";
import { buttonVariants } from "@/components/ui/button";
import { NewNoteForm } from "@/components/notes/new-note-form";

export default async function NewNotePage() {
  await requireTeacher();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/notes" className={buttonVariants({ variant: "ghost", size: "sm" })}>
        <ArrowLeft /> Class notes
      </Link>
      <div>
        <h1 className="note-serif text-3xl tracking-tight">New class note · नया नोट</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record, upload audio, or paste a transcript — you&apos;ll get a clean transcript and a summary you can export as PDF.
        </p>
      </div>
      <NewNoteForm />
    </div>
  );
}
