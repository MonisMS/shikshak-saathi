import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Use in every server component, route handler and server action that needs the
 * logged-in teacher. Redirects to /login if there's no session.
 *
 * IMPORTANT: `redirect()` throws internally — never wrap a call to this in try/catch
 * (Next's own docs: "redirect... should be called outside the try block"). That applies
 * in Route Handlers too, not just pages.
 */
export async function requireTeacher() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session.user; // { id, name, email, school, preferredLanguage, uiLanguage, onboarded, ... }
}

// Use in API route handlers instead of requireTeacher(): a redirect() response
// from a route handler isn't something a fetch() caller can handle as JSON, so
// routes check for null and return a 401 themselves.
export async function getAuthedTeacher() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}
