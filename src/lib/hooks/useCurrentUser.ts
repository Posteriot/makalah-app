"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"

/**
 * Hook to get current Convex user
 * Returns current user object or null if not authenticated
 */
export function useCurrentUser() {
  const { user: clerkUser } = useUser()

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkUserId: clerkUser.id } : "skip"
  )

  return convexUser ?? null
}
