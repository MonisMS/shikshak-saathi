import "dotenv/config";
import { prisma } from "@/lib/db";
async function main() {
  const teacher = await prisma.user.findUniqueOrThrow({ where: { email: "demo@shikshak.app" } });
  const classroom = await prisma.classroom.findFirst({ where: { teacherId: teacher.id, name: "Class 7 Science (42)" } });
  console.log(JSON.stringify({ teacherId: teacher.id, classroomId: classroom?.id }));
}
main().then(() => prisma.$disconnect());
