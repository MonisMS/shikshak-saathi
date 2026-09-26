import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Next 16 renamed middleware.ts -> proxy.ts. Cheap cookie-presence check only; the
// real check is requireTeacher() inside each server component/route handler (Next's
// own guidance: proxy matchers can silently miss routes, so always re-verify).
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/classrooms/:path*",
    "/library/:path*",
    "/kits/:path*",
    "/notes/:path*",
    "/schedule/:path*",
    "/settings/:path*",
    "/onboarding/:path*",
  ],
};
