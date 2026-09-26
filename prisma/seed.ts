import "dotenv/config";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { loadChapterMeta, extractChapterEnglishPages } from "@/lib/chapters";

const DEMO_EMAIL = "demo@shikshak.app";
const DEMO_PASSWORD = "demo1234";

async function seedChapters() {
  const chapters = await loadChapterMeta();
  for (const ch of chapters) {
    const pagesEn = await extractChapterEnglishPages(ch);
    await prisma.chapter.upsert({
      where: { id: ch.id },
      create: {
        id: ch.id,
        grade: ch.grade,
        subject: ch.subject,
        bookName: ch.bookName,
        chapterNo: ch.chapterNo,
        titleEn: ch.titleEn,
        titleHi: ch.titleHi,
        sourceUrlEn: ch.sourceUrlEn,
        sourceUrlHi: ch.sourceUrlHi,
        pageStart: ch.pageStart,
        pagesEn,
        isSeeded: true,
      },
      update: {
        titleEn: ch.titleEn,
        titleHi: ch.titleHi,
        sourceUrlEn: ch.sourceUrlEn,
        sourceUrlHi: ch.sourceUrlHi,
        pageStart: ch.pageStart,
        pagesEn,
      },
    });
    console.log(`  chapter ${ch.id}: ${pagesEn.length} pages, first printed page ${pagesEn[0]?.page}`);
  }
  return chapters.length;
}

async function seedDemoTeacher() {
  let user = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });

  if (!user) {
    const signUp = await auth.api.signUpEmail({
      body: {
        name: "Demo Teacher",
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        school: "Govt. Upper Primary School, Barabanki",
        district: "Barabanki",
        schoolType: "Govt",
        preferredLanguage: "hi",
        uiLanguage: "hi",
        defaultPeriodMinutes: 40,
        lowResourceDefault: true,
        onboarded: true,
      },
    });
    user = await prisma.user.findUnique({ where: { id: signUp.user.id } });
    console.log(`  created demo teacher ${DEMO_EMAIL}`);
  } else {
    console.log(`  demo teacher ${DEMO_EMAIL} already exists`);
  }
  if (!user) throw new Error("Failed to create or load demo teacher");
  return user;
}

async function seedDemoClassrooms(teacherId: string) {
  const wanted = [
    {
      name: "Class 7 Science (42)",
      subject: "Science",
      grades: [7],
      studentCount: 42,
      isMultiGrade: false,
    },
    {
      name: "Room 1: Class 6 + 7 (multi-grade)",
      subject: "Science",
      grades: [6, 7],
      studentCount: 55,
      isMultiGrade: true,
    },
  ];

  for (const c of wanted) {
    const existing = await prisma.classroom.findFirst({
      where: { teacherId, name: c.name },
    });
    if (existing) {
      console.log(`  classroom "${c.name}" already exists`);
      continue;
    }
    await prisma.classroom.create({
      data: {
        teacherId,
        name: c.name,
        subject: c.subject,
        grades: c.grades,
        isMultiGrade: c.isMultiGrade,
        studentCount: c.studentCount,
        language: "hi",
        lowResource: true,
      },
    });
    console.log(`  created classroom "${c.name}"`);
  }
}

async function main() {
  console.log("Seeding chapters...");
  const chapterCount = await seedChapters();

  console.log("Seeding demo teacher...");
  const demoTeacher = await seedDemoTeacher();

  console.log("Seeding demo classrooms...");
  await seedDemoClassrooms(demoTeacher.id);

  console.log(`Done. ${chapterCount} chapters seeded.`);
}

main()
  .catch((e) => {
    console.error("SEED FAILED:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
