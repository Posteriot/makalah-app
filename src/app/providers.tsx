"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { ConvexReactClient } from "convex/react"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ThemeProvider } from "next-themes"
import { ThemeEnforcer } from "@/components/theme/ThemeEnforcer"
import { authClient, useSession } from "@/lib/auth-client"
import { TooltipProvider } from "@/components/ui/tooltip"

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL

const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null

/**
 * Bridges cross-domain BetterAuth session to a browser cookie for server-side use.
 *
 * Problem: crossDomainClient stores session in localStorage (not browser cookies).
 * The actual cookie name includes __Secure- prefix (from HTTPS baseURL) which
 * can't be set via document.cookie on HTTP localhost.
 *
 * Solution: Read ALL stored cookies from localStorage and encode the full cookie
 * string into a regular `ba_session` cookie. Server-side code (auth-server.ts)
 * reads this and forwards it as `Better-Auth-Cookie` header to Convex.
 */
function SessionCookieSync() {
  const { data: session, isPending } = useSession()

  useEffect(() => {
    const clearSessionCookie = () => {
      document.cookie =
        "ba_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }

    if (isPending) return

    if (session) {
      // Don't set ba_session while 2FA verification is pending —
      // prevents access to protected routes before OTP is verified
      if (sessionStorage.getItem("pending_2fa")) {
        return
      }

      // Read stored cookies from crossDomainClient's localStorage
      // Key: `${storagePrefix}_cookie` → default "better-auth_cookie"
      const stored = localStorage.getItem("better-auth_cookie")
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Record<
            string,
            { value: string; expires: string | null }
          >
          // Build cookie string in same format as crossDomainClient's getCookie():
          // "; __Secure-better-auth.session_token=xxx; ..."
          let cookieStr = ""
          for (const [name, cookie] of Object.entries(parsed)) {
            if (!cookie?.value) continue
            if (cookie.expires && new Date(cookie.expires) < new Date()) continue
            cookieStr += `; ${name}=${cookie.value}`
          }
          if (cookieStr) {
            document.cookie = `ba_session=${encodeURIComponent(cookieStr)}; path=/; SameSite=Lax`
          } else {
            clearSessionCookie()
          }
        } catch {
          clearSessionCookie()
        }
      } else {
        clearSessionCookie()
      }
    } else {
      clearSessionCookie()
    }
  }, [session, isPending])

  return null
}

/**
 * Cross-tab session invalidation.
 *
 * Two mechanisms:
 * 1. `storage` event — fires in OTHER tabs when localStorage changes
 * 2. `visibilitychange` — when tab becomes visible, re-check localStorage
 *
 * When sign-out clears `better-auth_cookie` to `{}`, either listener
 * detects it and redirects to `/sign-in`.
 */
function CrossTabSessionSync() {
  useEffect(() => {
    let redirecting = false
    const SESSION_COOKIE_KEY = "better-auth_cookie"
    const SESSION_BROADCAST_KEY = "better-auth.message"
    const PUBLIC_ROUTES = [
      "/",
      "/sign-in",
      "/sign-up",
      "/verify-2fa",
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
        (route) => pathname === route || pathname.startsWith(`${route}/`)
      )
    }

    function doSignOutRedirect() {
      if (redirecting) return
      redirecting = true
      document.cookie =
        "ba_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      if (isPublicRoute(window.location.pathname)) return
      const redirectPath = `${window.location.pathname}${window.location.search}`
      window.location.replace(
        `/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`
      )
    }

    function isSessionCleared(): boolean {
      const stored = localStorage.getItem(SESSION_COOKIE_KEY)
      return !stored || stored === "{}" || stored === ""
    }

    function handleStorageChange(e: StorageEvent) {
      if (e.key !== SESSION_COOKIE_KEY && e.key !== SESSION_BROADCAST_KEY) return
      if (isSessionCleared()) {
        doSignOutRedirect()
      }
    }

    function handleSessionRefresh() {
      if (isSessionCleared()) {
        doSignOutRedirect()
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return
      handleSessionRefresh()
    }

    window.addEventListener("storage", handleStorageChange)
    window.addEventListener("focus", handleSessionRefresh)
    window.addEventListener("pageshow", handleSessionRefresh)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("focus", handleSessionRefresh)
      window.removeEventListener("pageshow", handleSessionRefresh)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delayDuration={0}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        <ThemeEnforcer />
        {convexClient ? (
          <ConvexBetterAuthProvider
            client={convexClient}
            authClient={authClient}
          >
            <SessionCookieSync />
            <CrossTabSessionSync />
            {children}
          </ConvexBetterAuthProvider>
        ) : (
          children
        )}
      </ThemeProvider>
    </TooltipProvider>
  )
}
