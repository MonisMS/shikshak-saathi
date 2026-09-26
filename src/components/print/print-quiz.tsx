import type { z } from "zod";
import type { Quiz } from "@/lib/ai/schemas";

/** Same quiz question objects for the student copy and the teacher's answer key. */
export function PrintQuiz({
  title,
  quiz,
  teacherView,
}: {
  title: string;
  quiz: z.infer<typeof Quiz>;
  teacherView: boolean;
}) {
  return (
    <article className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">{title}</h1>
        <h2 className="text-lg">
          {quiz.kind === "exit" ? "Exit quiz" : "Starter quiz"}
          {teacherView && " — Answer key"}
        </h2>
        {!teacherView && <p className="mt-2 text-sm">Name: _________________________ &nbsp;&nbsp; Roll no: _______</p>}
      </header>

      <ol className="space-y-3 text-sm">
        {quiz.questions.map((q, i) => (
          <li key={q.id}>
            <p>
              <strong>{i + 1}.</strong> {q.stem}
            </p>
            <ul className="ml-4 list-none">
              {q.options.map((opt) => (
                <li key={opt.id}>
                  {opt.id}. {opt.text}
                  {teacherView && opt.correct && " ✓"}
                  {teacherView && !opt.correct && opt.misconceptionId && ` (${opt.misconceptionId}${opt.whyWrong ? `: ${opt.whyWrong}` : ""})`}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </article>
  );
}
