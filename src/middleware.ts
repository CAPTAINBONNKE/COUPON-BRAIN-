import { NextResponse, type NextRequest } from "next/server";

import { VISITOR_COOKIE } from "@/lib/visitor-constants";

/**
 * Runs on every page request.
 *
 * 1. Issues the anonymous analytics cookie. It is httpOnly, holds a random
 *    opaque value and is only ever stored salted+hashed in the database — it is
 *    not a tracking identifier that can be read back from a dump.
 * 2. Applies baseline security headers.
 *
 * NOTE: X-Frame-Options / a restrictive CSP `frame-ancestors` are deliberately
 * NOT set here — this app is embedded in preview iframes. Add them in
 * production if the app is never meant to be framed.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  if (!request.cookies.get(VISITOR_COOKIE)?.value) {
    response.cookies.set({
      name: VISITOR_COOKIE,
      value: crypto.randomUUID(),
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  }

  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals and static assets, so the cookie exists
     * before any route handler or page reads it.
     */
    "/((?!_next/static|_next/image|favicon.ico|og.png|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
