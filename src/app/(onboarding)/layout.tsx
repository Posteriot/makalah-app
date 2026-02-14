import type { ReactNode } from "react"

/**
 * Onboarding Layout
 * - Route protection handled by proxy.ts (middleware), not here
 * - proxy.ts also allows OTT params through for BetterAuth cross-domain auth flow
 * - User sync handled by useCurrentUser hook (client-side)
 * - Header intentionally NOT here — rendered by page component so existing
 *   users being redirected only see a blank page + spinner, not the onboarding UI.
 * - Centered content container (max-width 600px)
 */
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-background onboarding-bg">
      <main>
        <div className="max-w-[600px] mx-auto px-6 py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
