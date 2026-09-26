import { notFound } from "next/navigation";
import { requireTeacher } from "@/lib/session";
import { prisma } from "@/lib/db";
import { PrintTrigger } from "@/components/print/print-trigger";

/** Results report for a published test — opens the print dialog so the teacher can "Save as PDF". */
export default async function TestResultsPrintPage(props: PageProps<"/tests/[id]/print">) {
  const { id } = await props.params;
  // requireTeacher() redirects to /login on no session — must not be try/catch-wrapped.
  const teacher = await requireTeacher();

  const publication = await prisma.testPublication.findFirst({
    where: { id, teacherId: teacher.id },
    include: { kit: { select: { title: true } }, submissions: { orderBy: { studentName: "asc" } } },
  });
  if (!publication) notFound();

  const rows = publication.submissions.map((s) => {
    const total = s.autoMarks + (s.aiMarks ?? 0);
    return {
      id: s.id,
      name: s.studentName,
      total,
      max: s.maxMarks,
      pct: s.maxMarks > 0 ? Math.round((total / s.maxMarks) * 100) : 0,
      graded: s.evaluatedAt !== null,
      submittedAt: s.submittedAt,
    };
  });
  const avg = rows.length ? Math.round(rows.reduce((sum, r) => sum + r.pct, 0) / rows.length) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 bg-white p-8 text-black">
      <PrintTrigger />
      <header className="space-y-1 border-b pb-4">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Shikshak Saathi · Test results</p>
        <h1 className="text-2xl font-semibold">{publication.kit.title}</h1>
        <p className="text-sm text-neutral-600">
          {publication.sectionType === "WORKSHEET" ? "Worksheet" : "Quiz"} · {rows.length} response
          {rows.length === 1 ? "" : "s"} · Class average {avg}% · Printed {new Date().toLocaleDateString("en-IN")}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-sm text-neutral-600">No submissions yet.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-2">#</th>
              <th className="py-2 pr-2">Student</th>
              <th className="py-2 pr-2 text-right">Marks</th>
              <th className="py-2 pr-2 text-right">%</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b break-inside-avoid">
                <td className="py-2 pr-2 text-neutral-500">{i + 1}</td>
                <td className="py-2 pr-2 font-medium">{r.name}</td>
                <td className="py-2 pr-2 text-right">
                  {r.total}/{r.max}
                </td>
                <td className="py-2 pr-2 text-right">{r.pct}%</td>
                <td className="py-2 pr-2">{r.graded ? "Graded" : "Pending"}</td>
                <td className="py-2 text-neutral-600">{r.submittedAt.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
