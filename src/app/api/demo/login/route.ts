import { auth } from "@/lib/auth";

// Signs the caller in as the seeded demo teacher (see prisma/seed.ts) for the
// landing page's "Try demo" button. Returns Better Auth's own response as-is
// so its Set-Cookie header reaches the browser untouched.
export async function POST() {
  return auth.api.signInEmail({
    body: { email: "demo@shikshak.app", password: "demo1234" },
    asResponse: true,
  });
}
