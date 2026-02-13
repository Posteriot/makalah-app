import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api",
  "/about",
  "/pricing",
  "/blog",
  "/documentation",
  "/waiting-list",
  "/privacy",
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

  // Lightweight cookie check — real auth validation happens per-page via <Authenticated>
  // BetterAuth stores session in cookies
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token")

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
