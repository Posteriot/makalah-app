"use client"

import { useEffect, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  clearFreeLoginGateSessionMarker,
  hasSeenFreeLoginGateForSession,
  isFreeTierForLoginGate,
  markFreeLoginGateSeenForSession,
} from "@/lib/utils/freeLoginGate"

/**
 * Enforce /get-started once per login session for free-tier users.
 * Marker is stored in sessionStorage and cleared on sign-out.
 */
export function FreeLoginGate() {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending: isSessionPending } = useSession()
  const { user, isLoading: isUserLoading } = useCurrentUser()
  const redirectingRef = useRef(false)

  useEffect(() => {
    if (isSessionPending) return

    if (!session) {
      clearFreeLoginGateSessionMarker()
      redirectingRef.current = false
      return
    }

    if (isUserLoading || !user) return
    if (!isFreeTierForLoginGate(user.role, user.subscriptionStatus)) return

    // Never override explicit checkout intent.
    if (pathname.startsWith("/checkout/")) {
      redirectingRef.current = false
      return
    }

    if (pathname === "/get-started") {
      if (!hasSeenFreeLoginGateForSession(session)) {
        markFreeLoginGateSeenForSession(session)
      }
      redirectingRef.current = false
      return
    }

    if (redirectingRef.current) return
    if (hasSeenFreeLoginGateForSession(session)) return

    // Skip get-started redirect on mobile — user stays on intended page
    const isMobile = window.matchMedia("(max-width: 671px)").matches
    if (isMobile) {
      markFreeLoginGateSeenForSession(session)
      return
    }

    markFreeLoginGateSeenForSession(session)
    redirectingRef.current = true
    const queryString =
      typeof window !== "undefined" ? window.location.search.slice(1) : ""
    const returnTo = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(`/get-started?return_to=${encodeURIComponent(returnTo)}`)
  }, [isSessionPending, session, isUserLoading, user, pathname, router])

  return null
}
