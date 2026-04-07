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

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Allow cross-domain OTT verification through (BetterAuth OAuth/magic-link callback)
  // ConvexBetterAuthProvider handles OTT → session cookie exchange on the client
  if (request.nextUrl.searchParams.has("ott")) {
    return NextResponse.next()
  }

  // Cookie-presence check only — no external calls.
  // Real auth validation happens client-side via useConvexAuth() and server-side
  // via getToken(). Middleware only gates obviously-unauthenticated requests
  // (no cookie at all) to avoid external service dependency per-request.
  const sessionCookie = request.cookies.get("ba_session")?.value
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
