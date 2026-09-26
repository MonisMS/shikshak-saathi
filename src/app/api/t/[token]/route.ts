import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { Worksheet, Quiz } from "@/lib/ai/schemas";
import { SectionType } from "@/generated/prisma/enums";

/** Public, unauthenticated — a student opens this from a QR code or link. Strips
 * every answer key / correct flag before it ever leaves the server. */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const publication = await prisma.testPublication.findUnique({
    where: { token },
    include: { kit: { include: { sections: true } } },
  });
  if (!publication) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const section = publication.kit.sections.find((s) => s.type === publication.sectionType);

  if (publication.sectionType === SectionType.WORKSHEET) {
    const parsed = Worksheet.safeParse(section?.content);
    if (!parsed.success) return NextResponse.json({ error: "Not available" }, { status: 409 });
    return NextResponse.json({
      kitTitle: publication.kit.title,
      sectionType: publication.sectionType,
      isOpen: publication.isOpen,
      title: parsed.data.title,
      instructions: parsed.data.instructions,
      questions: parsed.data.questions.map((q) => ({
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: q.options,
        matchPairs: q.matchPairs?.map((p) => p.left), // right-hand side is the answer key — never sent
        caseText: q.caseText,
        subQuestions: q.subQuestions,
        marks: q.marks,
      })),
    });
  }

  const parsed = Quiz.safeParse(section?.content);
  if (!parsed.success) return NextResponse.json({ error: "Not available" }, { status: 409 });
  return NextResponse.json({
    kitTitle: publication.kit.title,
    sectionType: publication.sectionType,
    isOpen: publication.isOpen,
    questions: parsed.data.questions.map((q) => ({
      id: q.id,
      stem: q.stem,
      options: q.options.map((o) => ({ id: o.id, text: o.text })), // `correct` withheld
    })),
  });
}
