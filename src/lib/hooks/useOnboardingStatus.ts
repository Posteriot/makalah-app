"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCallback } from "react"

/**
 * Hook untuk mengecek dan update status onboarding user.
 * Digunakan untuk pricing flow redesign.
 *
 * @returns {Object}
 * - isLoading: true saat query masih loading
 * - isAuthenticated: true jika user authenticated
 * - hasCompletedOnboarding: true jika user sudah complete onboarding
 * - completeOnboarding: function untuk mark onboarding as completed
 */
export function useOnboardingStatus() {
  const status = useQuery(api.users.getOnboardingStatus)
  const completeOnboardingMutation = useMutation(api.users.completeOnboarding)
  const isLoading = status === undefined
  const isAuthenticated = status?.isAuthenticated ?? false
  const hasCompletedOnboarding = status?.hasCompleted ?? false

  const completeOnboarding = useCallback(async () => {
    // Guard against auth race: mutation can be invoked before Convex identity is ready.
    if (!isAuthenticated) return
    await completeOnboardingMutation()
  }, [completeOnboardingMutation, isAuthenticated])

  return {
    isLoading,
    isAuthenticated,
    hasCompletedOnboarding,
    completeOnboarding,
  }
}
