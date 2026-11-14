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

// Open the app directly without showing a login page. Keep existing sessions.
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  const destination = new URL("/dashboard", request.url);
  if (session) {
    return Response.redirect(destination, 303);
  }

  const response = await POST();
  if (!response.ok) return response;

  const headers = new Headers(response.headers);
  headers.delete("content-type");
  headers.delete("content-length");
  headers.set("location", destination.toString());
  headers.set("cache-control", "no-store");
  return new Response(null, { status: 303, headers });
}
