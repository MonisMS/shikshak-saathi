import "dotenv/config";
import { prisma } from "@/lib/db";

const DEMO_EMAIL = "demo@shikshak.app";
const SEED_MARK = "seed:demo";

const RECORDINGS = [
  {
    title: "7-A Science — Litmus test class (24 Sep)",
    grade: 7,
    subject: "Science",
    audioSeconds: 38 * 60,
    transcript: `Good morning bachchon. Aaj hum ek chhota sa experiment karenge. Sabke paas do strips hain — neeli aur laal. Isko litmus paper kehte hain. Litmus lichens se banta hai, yaad hai pichhli baar humne padha tha?

Achha, Riya, tum nimbu ka ras lo aur ek boond neeli strip par daalo. Dekho kya hua? Haan, neeli strip laal ho gayi. Iska matlab nimbu ka ras acidic hai.

Ab sabun ka paani laal strip par daalo. Laal strip neeli ho gayi — toh sabun ka paani basic hai.

Kuch bachche keh rahe hain ki cheeni ka ghol bhi acidic hai kyunki woh khane ki cheez hai. Nahi beta. Cheeni ke ghol se na neeli strip badli na laal. Jo kisi ko nahi badalta, woh neutral hota hai.

Ek baat dhyan se suno — kabhi bhi koi anjaan cheez chakh ke mat dekhna ki woh acid hai ya nahi. Isiliye toh hum indicator use karte hain.

Homework: ghar ki paanch cheezon ki list banao aur likho ki woh acidic, basic ya neutral ho sakti hain.

Kal hum dekhenge ki acid aur base milte hain toh kya hota hai. Kaafi bachchon ko lagta hai dono gayab ho jaate hain — kal isi par baat karenge.`,
  },
  {
    title: "Room 1 (6+7) — Magnets: poles and compass (23 Sep)",
    grade: 6,
    subject: "Science",
    audioSeconds: 35 * 60,
    transcript: `Chalo, aaj magnet ke saath khelte hain. Class 6 wale meri taraf, Class 7 wale apni worksheet karo.

Yeh ek bar magnet hai. Iske do sire hain — North pole aur South pole. Maine isko dhaage se latkaya hai. Dekho, ghoomte ghoomte yeh ek hi disha mein ruk gaya — north-south. Sooraj kidhar ugta hai? Us taraf east hai, toh yeh north hua.

Ab do magnet lete hain. North ko North ke paas laao. Kya hua? Door bhaag raha hai. Isko repulsion kehte hain. North aur South paas laao — chipak gaye. Yeh attraction hai.

Aman ne poocha ki agar magnet tod dein toh kya sirf North pole wala tukda milega? Bahut achha sawaal. Nahi — har tukde mein dono pole honge. Akela pole kabhi nahi milta.

Ek aur galti jo bahut bachche karte hain: lohe ki rod magnet ki taraf kheenchi gayi, toh kya woh magnet hai? Zaroori nahi. Lohe ko toh magnet kheenchta hi hai. Magnet hone ka pakka saboot hai repulsion.

Compass ki sui bhi ek chhota magnet hai, isiliye woh north dikhati hai.

Class 7, apni worksheet ke teen sawaal ho gaye? Ab main aapke paas aati hoon.`,
  },
  {
    title: "7-A Maths — Lakh aur crore (22 Sep)",
    grade: 7,
    subject: "Maths",
    audioSeconds: 40 * 60,
    transcript: `Aaj ki kahani Chintamani ke kisan Eshwarappa ki hai. Unhone suna ki pehle hamare desh mein lagbhag ek lakh kism ke chawal hote the. Ek lakh kitna bada hota hai?

Board par dekho: 99,999 sabse bada paanch-ankon ka number hai. Isme ek jodo — 1,00,000. Yeh ek lakh hai. Kitne zero? Paanch.

Ab das lakh aur uske baad sau lakh — sau lakh ko ek crore kehte hain. 1,00,00,000. Saat zero. Kai bachche chhe zero likh rahe hain — woh das lakh hai, crore nahi.

International system mein commas alag jagah lagte hain. Humara 1,00,000 wahan 100,000 likha jaata hai — number wahi hai, sirf comma alag. Das lakh ko wahan one million kehte hain.

Ek sawaal: 75,000 bada hai ya 1,06,000? Kuch ne kaha 75,000 kyunki saat bada hai ek se. Pehle ank gino — 1,06,000 mein chhe ank hain, toh woh bada hai.

Homework: akhbaar mein koi bada number dhoondo aur use Indian aur International dono tarah se padho.`,
  },
];

async function main() {
  const teacher = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!teacher) throw new Error(`Run npm run db:seed first — ${DEMO_EMAIL} not found`);

  const removed = await prisma.teachingResource.deleteMany({ where: { teacherId: teacher.id, fileName: { startsWith: SEED_MARK } } });
  console.log(`Removed ${removed.count} previously seeded items`);

  const chapters = await prisma.chapter.findMany({ orderBy: [{ grade: "asc" }, { chapterNo: "asc" }] });
  for (const ch of chapters) {
    const pages = (ch.pagesEn as { page: number; text: string }[]).map((p) => ({ page: p.page, text: p.text }));
    await prisma.teachingResource.create({
      data: {
        teacherId: teacher.id,
        kind: "pdf",
        title: `NCERT Class ${ch.grade} ${ch.subject} Ch ${ch.chapterNo} — ${ch.titleEn}`,
        grade: ch.grade,
        subject: ch.subject,
        sourceUrl: ch.sourceUrlEn,
        fileName: `${SEED_MARK}:${ch.id}.pdf`,
        pages,
      },
    });
    console.log(`  resource: ${ch.titleEn} (${pages.length} pages)`);
  }

  for (const [i, r] of RECORDINGS.entries()) {
    await prisma.teachingResource.create({
      data: {
        teacherId: teacher.id,
        kind: "audio",
        title: r.title,
        grade: r.grade,
        subject: r.subject,
        audioSeconds: r.audioSeconds,
        fileName: `${SEED_MARK}:recording-${i + 1}`,
        pages: [{ page: 1, text: r.transcript }],
      },
    });
    console.log(`  recording: ${r.title}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
