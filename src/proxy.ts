import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api(.*)",
  // Marketing pages
  "/about",
  "/pricing",
  "/blog(.*)",
  "/documentation(.*)",
  "/auth/waiting-list",
])

// Note: Admin routes don't need special middleware handling
// Permission checks are done at the page level
// const isAdminRoute = createRouteMatcher(["/admin(.*)"])

export default clerkMiddleware(async (auth, request) => {
  const { userId } = await auth()

  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  if (!userId) {
    const signInUrl = new URL("/sign-in", request.url)
    const redirectPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
    signInUrl.searchParams.set("redirect_url", redirectPath)
    return NextResponse.redirect(signInUrl)
  }

  // Admin routes: let page handle permission check
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
