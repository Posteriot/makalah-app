"use client"

import Link from "next/link"
import { useUser } from "@clerk/nextjs"
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
    <div className="flex justify-center lg:justify-start w-full">
      <Link
        href={getHref()}
        className="btn-brand font-sans text-[12px] font-medium px-3 py-1.5 inline-flex items-center"
        aria-busy={isLoading}
      >
        AYO MULAI
      </Link>
    </div>
  )
}
