import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";

/**
 * Better Auth 1.7.6 (§2 of research/agent3-stack-execution.md). Teacher = User, stored
 * in our own Postgres so FK relations to LessonKit/Classroom just work — no external
 * auth provider to sync during the demo.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, autoSignIn: true, minPasswordLength: 6 },
  user: {
    additionalFields: {
      school: { type: "string", required: false },
      district: { type: "string", required: false },
      preferredLanguage: { type: "string", required: false, defaultValue: "hi" },
      schoolType: { type: "string", required: false },
      uiLanguage: { type: "string", required: false, defaultValue: "en" },
      defaultPeriodMinutes: { type: "number", required: false, defaultValue: 40 },
      lowResourceDefault: { type: "boolean", required: false, defaultValue: true },
      onboarded: { type: "boolean", required: false, defaultValue: false },
    },
  },
  plugins: [nextCookies()], // must be last — lets server actions/route handlers set auth cookies
});
