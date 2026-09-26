import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";

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
  plugins: [nextCookies()],
});
