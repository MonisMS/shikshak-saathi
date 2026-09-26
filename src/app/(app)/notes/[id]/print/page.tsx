import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireTeacher, getAuthedTeacher } from "@/lib/session";
import { getNoteForTeacher } from "@/lib/notes";
import { NoteSummary } from "@/lib/ai/prompts/notes";
import { SOURCE_LABEL, formatDuration, parseTranscript } from "@/lib/note-format";
import { PrintTrigger } from "@/components/print/print-trigger";

const PARTS = ["summary", "transcript", "notes"] as const;
type Part = (typeof PARTS)[number];

function parseInclude(raw: string | string[] | undefined): Set<Part> {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const wanted = (value ?? "summary").split(",").filter((p): p is Part => (PARTS as readonly string[]).includes(p));
  return new Set(wanted.length > 0 ? wanted : ["summary"]);
}

/** The PDF file name defaults to the page title, so "Save as PDF" names it after the note. */
export async function generateMetadata(props: PageProps<"/notes/[id]/print">): Promise<Metadata> {
  const { id } = await props.params;
  const teacher = await getAuthedTeacher();
  if (!teacher) return { title: "Class note" };
  try {
    const note = await getNoteForTeacher(id, teacher.id);
    return { title: note.title };
  } catch {
    return { title: "Class note" };
  }
}

export default async function NotePrintPage(props: PageProps<"/notes/[id]/print">) {
  const { id } = await props.params;
  const include = parseInclude((await props.searchParams).include);

  // requireTeacher() redirects to /login on no session — must not be try/catch-wrapped.
  const teacher = await requireTeacher();

  let note;
  try {
    note = await getNoteForTeacher(id, teacher.id);
  } catch {
    notFound();
  }

  const summary = NoteSummary.safeParse(note.summary);
  const showSummary = include.has("summary") && summary.success;
  const showTranscript = include.has("transcript");
  const showNotes = include.has("notes") && note.myNotes.trim().length > 0;
  if (!showSummary && !showTranscript && !showNotes) notFound();

  const created = note.createdAt.toLocaleString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
  const meta = [created, SOURCE_LABEL[note.source]?.en, note.audioSeconds ? formatDuration(note.audioSeconds) : null].filter(Boolean).join(" · ");

  return (
    <article className="mx-auto max-w-[180mm] text-[10.5pt] leading-relaxed text-black print:max-w-none">
      <PrintTrigger />
      <header className="mb-6 border-b border-neutral-300 pb-4">
        <p className="text-[8pt] tracking-widest text-neutral-500 uppercase">शिक्षक साथी · Shikshak Saathi — Class note</p>
        <h1 className="note-serif mt-2 text-[22pt] leading-tight">{note.title}</h1>
        <p className="mt-1 text-[9pt] text-neutral-600">{meta}</p>
      </header>

      {showSummary && (
        <section className="space-y-4">
          <h2 className="text-[8pt] font-semibold tracking-widest text-neutral-500 uppercase">Summary · सारांश</h2>
          <p>{summary.data.overview}</p>
          {summary.data.sections.map((s, i) => (
            <div key={i} className="break-inside-avoid">
              <h3 className="font-semibold">{s.heading}</h3>
              <ul className="ml-5 list-disc space-y-0.5">
                {s.bullets.map((b, j) => (
                  <li key={j}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
          {summary.data.actionItems.length > 0 && (
            <div className="break-inside-avoid">
              <h3 className="font-semibold">Action items · आगे के काम</h3>
              <ul className="space-y-0.5">
                {summary.data.actionItems.map((a, i) => (
                  <li key={i}>☐ {a}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {showNotes && (
        <section className={showSummary ? "mt-8 border-t border-neutral-300 pt-4" : undefined}>
          <h2 className="mb-2 text-[8pt] font-semibold tracking-widest text-neutral-500 uppercase">My thoughts · मेरे विचार</h2>
          <p className="whitespace-pre-wrap">{note.myNotes}</p>
        </section>
      )}

      {showTranscript && (
        <section className={showSummary || showNotes ? "page-break pt-2 print:pt-0" : undefined}>
          <h2 className="mb-3 text-[8pt] font-semibold tracking-widest text-neutral-500 uppercase">Transcript · ट्रांसक्रिप्ट</h2>
          <div className="space-y-2.5">
            {parseTranscript(note.transcript).map((seg, i) => (
              <div key={i} className="flex gap-3">
                {seg.timestamp && <span className="w-12 shrink-0 pt-px font-mono text-[8.5pt] text-neutral-500">{seg.timestamp}</span>}
                <p className="whitespace-pre-wrap">{seg.text}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
