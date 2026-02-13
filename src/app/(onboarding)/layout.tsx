import type { ReactNode } from "react"
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader"

/**
 * Onboarding Layout
 * - Route protection handled by proxy.ts (middleware), not here
 * - proxy.ts also allows OTT params through for BetterAuth cross-domain auth flow
 * - User sync handled by useCurrentUser hook (client-side)
 * - Minimal header with logo and close button
 * - Centered content container (max-width 600px)
 */
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background onboarding-bg">
      <OnboardingHeader />
      <main className="pt-16">
        <div className="max-w-[600px] mx-auto px-6 py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
