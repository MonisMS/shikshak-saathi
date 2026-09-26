import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const ClassroomInput = z.object({
  name: z.string().min(1),
  subject: z.string().min(1),
  grades: z.array(z.number().int().min(1).max(12)).min(1),
  studentCount: z.number().int().min(1).max(200),
  isMultiGrade: z.boolean(),
  language: z.enum(["hi", "en"]),
  lowResource: z.boolean(),
});

const OnboardingBody = z.object({
  school: z.string().min(1),
  district: z.string().min(1),
  schoolType: z.enum(["Govt", "Private", "Aided"]),
  preferredLanguage: z.enum(["hi", "en"]),
  defaultPeriodMinutes: z.number().int().min(20).max(90),
  lowResourceDefault: z.boolean(),
  classrooms: z.array(ClassroomInput).min(1),
});

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = OnboardingBody.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const teacherId = session.user.id;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: teacherId },
      data: {
        school: body.school,
        district: body.district,
        schoolType: body.schoolType,
        preferredLanguage: body.preferredLanguage,
        defaultPeriodMinutes: body.defaultPeriodMinutes,
        lowResourceDefault: body.lowResourceDefault,
        onboarded: true,
      },
    }),
    prisma.classroom.createMany({
      data: body.classrooms.map((c) => ({
        teacherId,
        name: c.name,
        subject: c.subject,
        grades: c.grades,
        isMultiGrade: c.isMultiGrade,
        studentCount: c.studentCount,
        language: c.language,
        lowResource: c.lowResource,
      })),
    }),
    prisma.activityLog.create({
      data: { teacherId, type: "SIGNED_UP" },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
