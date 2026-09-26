import "dotenv/config";
import { prisma } from "@/lib/db";
async function main() {
  await prisma.lessonKit.deleteMany({ where: { id: "cmui14n6000025lfjdii21ixl" } });
  await prisma.classroom.deleteMany({ where: { name: "Class 7-A Science" } });
  await prisma.user.deleteMany({ where: { email: "integration-teacher@example.com" } });
  console.log("cleaned up");
}
main().then(() => prisma.$disconnect());
