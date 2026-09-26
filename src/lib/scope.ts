import { prisma } from "@/lib/db";

/** A plain thrown error (not a Next-internal redirect/notFound) — safe to try/catch
 * in both Route Handlers and Server Components. */
export class NotFoundError extends Error {}

/** Every DB query on teacher data must filter by teacherId (roadmap §0.2.6) — these
 * helpers exist so nobody forgets. Throws when the row doesn't exist or isn't owned
 * by this teacher, so a teacher can never fetch another teacher's kit by guessing an id. */
export async function getKitForTeacher(kitId: string, teacherId: string) {
  const kit = await prisma.lessonKit.findFirst({
    where: { id: kitId, teacherId },
    include: { sections: true, chapter: true, classroom: true },
  });
  if (!kit) throw new NotFoundError(`Kit ${kitId} not found for this teacher`);
  return kit;
}

export async function getClassroomForTeacher(classroomId: string, teacherId: string) {
  const classroom = await prisma.classroom.findFirst({ where: { id: classroomId, teacherId } });
  if (!classroom) throw new NotFoundError(`Classroom ${classroomId} not found for this teacher`);
  return classroom;
}
