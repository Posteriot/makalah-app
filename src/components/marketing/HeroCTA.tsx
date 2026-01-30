"use client"

import Link from "next/link"
import { useUser } from "@clerk/nextjs"
import { Rocket } from "lucide-react"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"

/**
 * HeroCTA Component
 *
 * Smart CTA button that determines destination based on user state:
 * - Not signed in → /sign-up
 * - Signed in + completed onboarding → /chat
 * - Signed in + not completed onboarding → /get-started
 */
export function HeroCTA() {
  const { isSignedIn, isLoaded: isUserLoaded } = useUser()
  const { hasCompletedOnboarding, isLoading: isOnboardingLoading } = useOnboardingStatus()

  // Determine destination based on auth and onboarding state
  const getHref = (): string => {
    if (!isSignedIn) {
      return "/sign-up"
    }

    if (hasCompletedOnboarding) {
      return "/chat"
    }

    return "/get-started"
  }

  // Show loading state while checking auth/onboarding
  const isLoading = !isUserLoaded || (isSignedIn && isOnboardingLoading)

  return (
    <Link
      href={getHref()}
      className="btn-brand text-base px-6 py-3 inline-flex items-center gap-2"
      aria-busy={isLoading}
    >
      <Rocket className="w-5 h-5" />
      <span>Ayo Mulai!</span>
    </Link>
  )
}
