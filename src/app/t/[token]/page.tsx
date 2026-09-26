import { prisma } from "@/lib/db";
import { Worksheet, Quiz } from "@/lib/ai/schemas";
import { SectionType } from "@/generated/prisma/enums";
import { TestAttemptForm } from "@/components/tests/test-attempt-form";

/** Public, unauthenticated — a student opens this from a QR code or link.
 * Mirrors the redaction in /api/t/[token]: no answer key or correct flag ever
 * reaches the client, worksheet or quiz. */
export default async function TestAttemptPage(props: PageProps<"/t/[token]">) {
  const { token } = await props.params;

  const publication = await prisma.testPublication.findUnique({
    where: { token },
    include: { kit: { include: { sections: true } } },
  });

  if (!publication) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-muted-foreground">This link isn&apos;t valid anymore.</p>
      </div>
    );
  }

  const section = publication.kit.sections.find((s) => s.type === publication.sectionType);

  if (publication.sectionType === SectionType.WORKSHEET) {
    const parsed = Worksheet.safeParse(section?.content);
    if (!parsed.success) return <NotReady />;
    return (
      <TestAttemptForm
        token={token}
        kitTitle={publication.kit.title}
        isOpen={publication.isOpen}
        kind="worksheet"
        title={parsed.data.title}
        instructions={parsed.data.instructions}
        worksheetQuestions={parsed.data.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options,
          matchLeft: q.matchPairs?.map((p) => p.left),
          caseText: q.caseText,
          subQuestions: q.subQuestions,
          marks: q.marks,
        }))}
      />
    );
  }

  const parsed = Quiz.safeParse(section?.content);
  if (!parsed.success) return <NotReady />;
  return (
    <TestAttemptForm
      token={token}
      kitTitle={publication.kit.title}
      isOpen={publication.isOpen}
      kind="quiz"
      quizQuestions={parsed.data.questions.map((q) => ({
        id: q.id,
        stem: q.stem,
        options: q.options.map((o) => ({ id: o.id, text: o.text })),
      }))}
    />
  );
}

function NotReady() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
      <p className="text-sm text-muted-foreground">This test isn&apos;t ready yet — check back later.</p>
    </div>
  );
}
