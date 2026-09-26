import { NextResponse } from "next/server";
import { getAuthedTeacher } from "@/lib/session";
import { getDashboardData } from "@/lib/dashboard";

/** P9.1: every widget's data in one JSON call, teacherId-scoped. */
export async function GET() {
  const teacher = await getAuthedTeacher();
  if (!teacher) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const data = await getDashboardData(teacher.id);
  return NextResponse.json(data);
}
