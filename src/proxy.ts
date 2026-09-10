import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, DIAS } from "@/lib/campaign/cookie";

/**
 * Remembers which campaign link a visitor arrived on.
 *
 * **Why it lives here and not on the page.** Next only allows writing cookies
 * from the proxy (what used to be called middleware), a Server Action or a
 * Route Handler — a Server Component that calls `cookies().set()` throws at
 * render, which is a 500 on a page somebody opened from a cold email we only
 * get to send once.
 *
 * It also happens to be the right place on its own merits: it runs before the
 * page, so the cookie exists on the very first response, before a single line
 * of JavaScript.
 *
 * **What it does not do: resolve the code.** That needs the Admin SDK and this
 * runs on the edge. All it does is copy the code across so the page can look it
 * up. Deliberately dumb — a middleware that talks to a database runs on every
 * request in the app.
 */
export default function proxy(req: NextRequest) {
  const res = NextResponse.next();
  const id = req.nextUrl.searchParams.get("id");

  // Shape-checked, not trusted: this string is about to become a document id.
  if (id && /^[a-z0-9]{4,32}$/.test(id) && req.cookies.get(COOKIE)?.value !== id) {
    res.cookies.set(COOKIE, id, {
      maxAge: DIAS * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}

/**
 * Only the pages a campaign link can point at. A proxy that matches everything
 * runs on every image and every asset, and this has no business being in that
 * path.
 */
export const config = {
  matcher: ["/l/:path*", "/book", "/pricing"],
};
