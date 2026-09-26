import type { z } from "zod";
import type { LessonPlan } from "@/lib/ai/schemas";

const PHASE_LABEL: Record<string, string> = {
  warmup_fix: "Start with: fix",
  starter: "Starter",
  explain: "Explain",
  activity: "Activity",
  practice: "Practice",
  exit_check: "Exit check",
  wrap_up: "Wrap up",
};

/** Teacher's printed lesson plan — script, materials, timings (F24). */
export function PrintPlan({ title, plan }: { title: string; plan: z.infer<typeof LessonPlan> }) {
  return (
    <article className="space-y-4">
      <header>
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="text-sm">Lesson plan — {plan.title}</p>
        <p className="text-sm italic">{plan.learningOutcome}</p>
      </header>

      <section>
        <h2 className="font-semibold">Prior knowledge</h2>
        <ul className="ml-5 list-disc text-sm">
          {plan.priorKnowledge.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Key learning points</h2>
        <ul className="ml-5 list-disc text-sm">
          {plan.keyLearningPoints.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Keywords</h2>
        <dl className="text-sm">
          {plan.keywords.map((k) => (
            <div key={k.term}>
              <dt className="inline font-medium">{k.term}: </dt>
              <dd className="inline">{k.definition}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section>
        <h2 className="font-semibold">Common misconceptions</h2>
        <ul className="ml-5 list-disc text-sm">
          {plan.misconceptions.map((m) => (
            <li key={m.id}>
              <strong>{m.id}.</strong> {m.misconception} — <em>{m.correction}</em> (p.{m.pageRef})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="font-semibold">Timeline</h2>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-1 pr-2">Min</th>
              <th className="py-1 pr-2">Phase</th>
              <th className="py-1">Teacher says / Students do</th>
            </tr>
          </thead>
          <tbody>
            {plan.sections.map((s) => (
              <tr key={s.id} className="border-b align-top">
                <td className="py-1 pr-2">{s.minutes}</td>
                <td className="py-1 pr-2">
                  {PHASE_LABEL[s.phase] ?? s.phase}
                  <br />
                  <span className="font-medium">{s.title}</span>
                </td>
                <td className="py-1">
                  <p>
                    <strong>Teacher:</strong> {s.teacherSays}
                  </p>
                  <p>
                    <strong>Students:</strong> {s.studentsDo}
                  </p>
                  {s.materials.length > 0 && <p className="italic">Materials: {s.materials.join(", ")}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="font-semibold">Homework</h2>
        <p className="text-sm">{plan.homework}</p>
      </section>
    </article>
  );
}
