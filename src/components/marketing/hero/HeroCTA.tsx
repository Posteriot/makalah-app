"use client"

import { useUser } from "@clerk/nextjs"
import { useOnboardingStatus } from "@/lib/hooks/useOnboardingStatus"
import { SectionCTA } from "@/components/ui/section-cta"

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
    <div className="flex justify-center lg:justify-start w-full mt-4">
      <SectionCTA href={getHref()} isLoading={isLoading}>
        AYO MULAI
      </SectionCTA>
    </div>
  )
}
