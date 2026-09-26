import type { z } from "zod";
import type { ParentNote } from "@/lib/ai/schemas";

/** Printable parent slip (F49/F50). The interactive editor lands with M10 — this only prints an already-generated note. */
export function PrintParentNote({ title, note }: { title: string; note: z.infer<typeof ParentNote> }) {
  return (
    <article className="space-y-3">
      <header>
        <h1 className="text-xl font-bold">{title}</h1>
        <h2 className="text-lg">Parent note</h2>
      </header>
      <p className="text-sm">
        <strong>आज सीखा / Learned today:</strong> {note.learnedToday}
      </p>
      <p className="text-sm">
        <strong>गृहकार्य / Homework:</strong> {note.homework}
      </p>
      <p className="text-sm">
        <strong>घर पर गतिविधि / Home activity:</strong> {note.homeActivity}
      </p>
      {note.askYourChild.length > 0 && (
        <div className="text-sm">
          <strong>अपने बच्चे से पूछें / Ask your child:</strong>
          <ul className="ml-5 list-disc">
            {note.askYourChild.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
