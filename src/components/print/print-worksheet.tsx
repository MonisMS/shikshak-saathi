import type { z } from "zod";
import type { Worksheet } from "@/lib/ai/schemas";

/**
 * Renders the SAME worksheet question objects for both the student worksheet
 * (`showAnswers=false`) and the answer key (`showAnswers=true`) — the master-lesson
 * pattern (idea only, no licence, `references/master-lesson/src/derive/answerKey.ts`):
 * one source of questions, two views, so they can never disagree.
 */
export function PrintWorksheet({
  title,
  worksheet,
  showAnswers,
}: {
  title: string;
  worksheet: z.infer<typeof Worksheet>;
  showAnswers: boolean;
}) {
  return (
    <article className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">{title}</h1>
        <h2 className="text-lg">
          {worksheet.title}
          {showAnswers && " — Answer key"}
        </h2>
        <p className="text-sm">{worksheet.instructions}</p>
        {!showAnswers && (
          <p className="mt-2 text-sm">
            Name: _________________________ &nbsp;&nbsp; Roll no: _______
          </p>
        )}
      </header>

      <ol className="space-y-3 text-sm">
        {worksheet.questions.map((q, i) => (
          <li key={q.id}>
            <p>
              <strong>
                {i + 1}. ({q.marks} {q.marks === 1 ? "mark" : "marks"})
              </strong>{" "}
              {q.prompt}
            </p>
            {q.caseText && <p className="ml-4 italic">{q.caseText}</p>}
            {q.options && (
              <ul className="ml-4 list-inside list-[upper-alpha]">
                {q.options.map((opt, oi) => (
                  <li key={oi}>{opt}</li>
                ))}
              </ul>
            )}
            {q.matchPairs && (
              <table className="ml-4">
                <tbody>
                  {q.matchPairs.map((mp, mi) => (
                    <tr key={mi}>
                      <td className="pr-4">{mp.left}</td>
                      <td>{showAnswers ? mp.right : "________________"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {q.subQuestions && (
              <ol className="ml-4 list-inside list-decimal">
                {q.subQuestions.map((sq, si) => (
                  <li key={si}>{sq}</li>
                ))}
              </ol>
            )}
            {showAnswers ? (
              <p className="ml-4 font-medium">Answer: {q.answer}</p>
            ) : (
              q.type !== "match" && <p className="ml-4">Answer: _____________________________</p>
            )}
          </li>
        ))}
      </ol>

      <p className="text-right text-sm font-semibold">Total: {worksheet.totalMarks} marks</p>
    </article>
  );
}
