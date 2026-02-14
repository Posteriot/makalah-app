"use client"

import { useEffect, useRef } from "react"
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

  const convexUser = useQuery(
    api.users.getUserByBetterAuthId,
    session?.user?.id ? { betterAuthUserId: session.user.id } : "skip"
  )

  const createAppUser = useMutation(api.users.createAppUser)
  const creationAttemptedRef = useRef(false)

  // Auto-create app user if authenticated but no Convex record yet
  useEffect(() => {
    if (
      session?.user?.id &&
      convexUser === null &&
      !creationAttemptedRef.current
    ) {
      creationAttemptedRef.current = true
      const nameParts = session.user.name?.split(" ") ?? []
      createAppUser({
        betterAuthUserId: session.user.id,
        email: session.user.email,
        firstName: nameParts[0] || undefined,
        lastName: nameParts.slice(1).join(" ") || undefined,
      }).catch((err) => {
        console.error("[useCurrentUser] createAppUser failed:", err)
        creationAttemptedRef.current = false
      })
    }
  }, [session, convexUser, createAppUser])

  // Session still loading
  if (isSessionPending) {
    return { user: null, isLoading: true }
  }

  // User not authenticated
  if (!session) {
    return { user: null, isLoading: false }
  }

  // Convex query still loading (undefined = loading, null = not found)
  if (convexUser === undefined) {
    return { user: null, isLoading: true }
  }

  // User authenticated and data ready
  return { user: convexUser, isLoading: false }
}
