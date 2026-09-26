import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

// Every query on teacher-owned data must go through one of these so a
// teacher can never read or modify another teacher's rows by guessing an id.

export async function getKitForTeacher(kitId: string, teacherId: string) {
  const kit = await prisma.lessonKit.findFirst({
    where: { id: kitId, teacherId },
    include: { sections: true },
  });
  if (!kit) notFound();
  return kit;
}

export async function getClassroomForTeacher(classroomId: string, teacherId: string) {
  const classroom = await prisma.classroom.findFirst({
    where: { id: classroomId, teacherId },
  });
  if (!classroom) notFound();
  return classroom;
}
