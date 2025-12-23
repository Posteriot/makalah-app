"use client"

import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"

/**
 * Hook to get current Convex user
 * ALWAYS returns object { user, isLoading } - never null
 */
export function useCurrentUser() {
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser()

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser?.id ? { clerkUserId: clerkUser.id } : "skip"
  )

  // Clerk belum selesai initialize
  if (!isClerkLoaded) {
    return { user: null, isLoading: true }
  }

  // User tidak authenticated
  if (!clerkUser) {
    return { user: null, isLoading: false }
  }

  // Convex query masih loading (undefined = loading, null = not found)
  if (convexUser === undefined) {
    return { user: null, isLoading: true }
  }

  // User authenticated dan data ready
  return { user: convexUser, isLoading: false }
}
