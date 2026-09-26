import { prisma } from "@/lib/db";
import type { ActivityType } from "@/generated/prisma/client";

/**
 * §6/P9.1: one place that writes `ActivityLog` rows, so the dashboard's stat cards
 * (kits this week, hours saved, etc.) have consistent data regardless of which
 * route triggered the action.
 */
export async function logActivity(
  teacherId: string,
  type: ActivityType,
  opts?: { kitId?: string; minutesSavedEstimate?: number; meta?: object },
) {
  await prisma.activityLog.create({
    data: {
      teacherId,
      type,
      kitId: opts?.kitId,
      minutesSavedEstimate: opts?.minutesSavedEstimate ?? 0,
      meta: opts?.meta,
    },
  });
}
