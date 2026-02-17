"use client"

import type { ReactNode } from "react"
import { useEffect } from "react"
import { ConvexReactClient } from "convex/react"
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react"
import { ThemeProvider } from "next-themes"
import { ThemeEnforcer } from "@/components/theme/ThemeEnforcer"
import { FreeLoginGate } from "@/components/onboarding/FreeLoginGate"
import { authClient, useSession } from "@/lib/auth-client"

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
          }
        } catch {
          // If parsing fails, set a marker so proxy.ts at least allows access
          document.cookie = "ba_session=1; path=/; SameSite=Lax"
        }
      }
    } else {
      document.cookie =
        "ba_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
    }
  }, [session, isPending])

  return null
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
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
          <FreeLoginGate />
          {children}
        </ConvexBetterAuthProvider>
      ) : (
        children
      )}
    </ThemeProvider>
  )
}
