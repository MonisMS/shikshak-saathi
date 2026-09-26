import { prisma } from "@/lib/db";

/**
 * §6/P9.1: every dashboard widget's data, teacherId-scoped. Shared by the dashboard
 * page (renders it directly) and `GET /api/dashboard` (returns it as JSON) so both
 * stay in sync from one query set.
 */
export async function getDashboardData(teacherId: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setDate(endOfToday.getDate() + 1);
  const endOfTomorrow = new Date(endOfToday);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);

  const [totalKits, kitsThisWeek, sectionsGenerated, minutesSavedAgg, recentKits, todayTomorrowKits, pendingResultsKits, topMisconceptions] =
    await Promise.all([
      prisma.lessonKit.count({ where: { teacherId } }),
      prisma.lessonKit.count({ where: { teacherId, createdAt: { gte: sevenDaysAgo } } }),
      prisma.kitSection.count({ where: { type: { in: ["WORKSHEET", "EXIT_QUIZ"] }, status: "READY", kit: { teacherId } } }),
      prisma.activityLog.aggregate({ where: { teacherId }, _sum: { minutesSavedEstimate: true } }),
      prisma.lessonKit.findMany({
        where: { teacherId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, status: true, quizSessions: { select: { id: true }, take: 1 } },
      }),
      prisma.lessonKit.findMany({
        where: { teacherId, scheduledFor: { gte: startOfToday, lt: endOfTomorrow } },
        orderBy: { scheduledFor: "asc" },
        select: { id: true, title: true, scheduledFor: true, fixesIncluded: { select: { id: true }, take: 1 } },
      }),
      prisma.lessonKit.findMany({
        where: { teacherId, scheduledFor: { lt: startOfToday }, quizSessions: { none: {} } },
        orderBy: { scheduledFor: "desc" },
        take: 5,
        select: { id: true, title: true, scheduledFor: true },
      }),
      prisma.misconception.findMany({
        where: { status: "OPEN", kit: { teacherId } },
        orderBy: { percent: "desc" },
        take: 3,
        select: { id: true, label: true, percent: true, kit: { select: { id: true, title: true } } },
      }),
    ]);

  return {
    totalKits,
    kitsThisWeek,
    sectionsGenerated,
    hoursSaved: (minutesSavedAgg._sum.minutesSavedEstimate ?? 0) / 60,
    recentKits: recentKits.map((k) => ({ id: k.id, title: k.title, status: k.status, hasResults: k.quizSessions.length > 0 })),
    todayTomorrowKits: todayTomorrowKits.map((k) => ({
      id: k.id,
      title: k.title,
      scheduledFor: k.scheduledFor,
      fixAttached: k.fixesIncluded.length > 0,
    })),
    pendingResultsKits,
    topMisconceptions: topMisconceptions.map((m) => ({ id: m.id, label: m.label, percent: m.percent, kitId: m.kit.id, kitTitle: m.kit.title })),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
