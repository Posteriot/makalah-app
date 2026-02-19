import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/verify-2fa",
  "/api",
  "/about",
  "/pricing",
  "/blog",
  "/documentation",
  "/waitinglist",
  "/privacy",
  "/security",
  "/terms",
]

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Allow cross-domain OTT verification through (BetterAuth OAuth/magic-link callback)
  // ConvexBetterAuthProvider handles OTT → session cookie exchange on the client
  if (request.nextUrl.searchParams.has("ott")) {
    return NextResponse.next()
  }

  // Lightweight cookie check — real auth validation happens via Convex queries.
  // With cross-domain auth, the real session lives in localStorage.
  // SessionCookieSync encodes the session into a `ba_session` browser cookie.
  const sessionCookie = request.cookies.get("ba_session")

  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url)
    const redirectPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
    signInUrl.searchParams.set("redirect_url", redirectPath)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
