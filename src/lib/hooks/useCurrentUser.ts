"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "@/lib/auth-client"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"

/**
 * Hook to get current Convex user
 * ALWAYS returns object { user, isLoading } - never null
 * Also auto-creates app user record if authenticated but no Convex record
 */
export function useCurrentUser() {
  const { data: session, isPending: isSessionPending } = useSession()
  const sessionUserId = session?.user?.id ?? null

  const convexUser = useQuery(
    api.users.getUserByBetterAuthId,
    sessionUserId ? { betterAuthUserId: sessionUserId } : "skip"
  )

  const createAppUser = useMutation(api.users.createAppUser)
  const creationAttemptedRef = useRef(false)
  const lastKnownUserSessionIdRef = useRef<string | null>(sessionUserId)

  // Cache user only for the active session. The cache may smooth brief Convex
  // revalidation, but it must not survive logout or a session switch.
  const [lastKnownUser, setLastKnownUser] = useState(convexUser ?? null)

  useEffect(() => {
    if (!sessionUserId) {
      lastKnownUserSessionIdRef.current = null
      setLastKnownUser(null)
      creationAttemptedRef.current = false
      return
    }

    if (lastKnownUserSessionIdRef.current !== sessionUserId) {
      lastKnownUserSessionIdRef.current = sessionUserId
      setLastKnownUser(null)
      creationAttemptedRef.current = false
    }
  }, [sessionUserId])

  useEffect(() => {
    if (!convexUser || !sessionUserId) return
    lastKnownUserSessionIdRef.current = sessionUserId
    setLastKnownUser(convexUser)
  }, [convexUser, sessionUserId])

  const cachedUser =
    sessionUserId && lastKnownUserSessionIdRef.current === sessionUserId
      ? lastKnownUser
      : null

  // Auto-create app user if authenticated but no Convex record yet
  useEffect(() => {
    if (
      sessionUserId &&
      session?.user &&
      convexUser === null &&
      !creationAttemptedRef.current
    ) {
      creationAttemptedRef.current = true
      const nameParts = session.user.name?.split(" ") ?? []
      createAppUser({
        betterAuthUserId: sessionUserId,
        email: session.user.email,
        firstName: nameParts[0] || undefined,
        lastName: nameParts.slice(1).join(" ") || undefined,
      }).catch((err) => {
        console.error("[useCurrentUser] createAppUser failed:", err)
        creationAttemptedRef.current = false
      })
    }
  }, [session, sessionUserId, convexUser, createAppUser])

  // Session still loading — return cached user if available
  if (isSessionPending) {
    return cachedUser
      ? { user: cachedUser, isLoading: false }
      : { user: null, isLoading: true }
  }

  // User not authenticated
  if (!session) {
    return { user: null, isLoading: false }
  }

  // Convex query still loading — return cached user if available
  if (convexUser === undefined) {
    return cachedUser
      ? { user: cachedUser, isLoading: false }
      : { user: null, isLoading: true }
  }

  // User authenticated and data ready
  return { user: convexUser, isLoading: false }
}
