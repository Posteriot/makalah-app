"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"

/**
 * Hook to check if waitlist mode is currently active.
 * Uses Convex reactivity — updates instantly when admin toggles.
 */
export function useWaitlistMode() {
  const waitlistMode = useQuery(api.appConfig.getWaitlistMode)

  return {
    isWaitlistMode: waitlistMode ?? false,
    isLoading: waitlistMode === undefined,
  }
}
