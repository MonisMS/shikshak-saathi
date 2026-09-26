import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Next.js 16 renamed middleware.ts to proxy.ts. This is a cheap cookie-presence
// check only — every server component/route still calls requireTeacher()
// (src/lib/session.ts), which re-verifies the session against the DB.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/kits/:path*",
    "/classrooms/:path*",
    "/library/:path*",
    "/schedule/:path*",
    "/settings/:path*",
    "/onboarding",
  ],
};
