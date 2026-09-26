import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const Body = z.object({
  confidence: z.enum(["low", "mid", "high"]),
  note: z.string().max(500).optional(),
});

/**
 * Public, unauthenticated — a student opens this from a QR code, no login.
 * There's no `ExitTicketResponse` Prisma model (this session was scoped to UI only,
 * not schema changes), so this can't persist to a queryable table yet. It confirms the
 * kit is real, logs the submission server-side so it isn't silently dropped, and returns
 * success so the student-facing flow works end to end. Swap the console.log for a real
 * write once a teammate adds the model.
 */
export async function POST(req: Request, { params }: { params: Promise<{ kitId: string }> }) {
  const { kitId } = await params;
  const kit = await prisma.lessonKit.findUnique({ where: { id: kitId }, select: { id: true } });
  if (!kit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid submission" }, { status: 400 });

  console.log("[exit-ticket]", kitId, parsed.data);

  return NextResponse.json({ ok: true });
}
