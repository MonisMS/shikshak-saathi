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
