import { NextResponse } from "next/server";
import { getAuthedTeacher } from "@/lib/session";
import { getKitForTeacher } from "@/lib/scope";
import { logActivity } from "@/lib/activity";

/**
 * P6.4/§6: DOCX generation happens entirely client-side (`Packer.toBlob`, no server
 * round-trip) — this tiny endpoint is only so the download can still log
 * `KIT_EXPORTED_DOCX` for the dashboard's stat cards.
 */
export async function POST(_req: Request, ctx: RouteContext<"/api/kits/[id]/export-log">) {
  const { id: kitId } = await ctx.params;

  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    await getKitForTeacher(kitId, teacher.id);
  } catch {
    return NextResponse.json({ error: "Kit not found" }, { status: 404 });
  }

  await logActivity(teacher.id, "KIT_EXPORTED_DOCX", { kitId });
  return NextResponse.json({ ok: true });
}
