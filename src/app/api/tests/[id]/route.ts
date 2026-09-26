import { NextResponse } from "next/server";
import * as z from "zod";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const publication = await prisma.testPublication.findFirst({
    where: { id, teacherId: teacher.id },
    include: {
      kit: { select: { id: true, title: true } },
      submissions: { orderBy: { submittedAt: "desc" } },
    },
  });
  if (!publication) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ publication });
}

const PatchBody = z.object({
  gradingInstructions: z.string().max(1000).optional(),
  isOpen: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const parsed = PatchBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  const result = await prisma.testPublication.updateMany({ where: { id, teacherId: teacher.id }, data: parsed.data });
  if (result.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ ok: true });
}
