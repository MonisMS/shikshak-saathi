import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthedTeacher } from "@/lib/session";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const chapter = await prisma.chapter.findUnique({ where: { id } });
  if (!chapter) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ chapter });
}
