"use client"

import type { ReactNode } from "react"
import { useSelectedLayoutSegments } from "next/navigation"

/**
 * Onboarding Layout
 * - Route protection handled by proxy.ts (middleware), not here
 * - proxy.ts also allows OTT params through for BetterAuth cross-domain auth flow
 * - User sync handled by useCurrentUser hook (client-side)
 * - Header intentionally NOT here — rendered by page component so existing
 *   users being redirected only see a blank page + spinner, not the onboarding UI.
 * - Checkout pages render full-bleed and should not inherit the centered onboarding shell.
 */
export default function OnboardingLayout({
  children,
}: {
  children: ReactNode
}) {
  const segments = useSelectedLayoutSegments()
  const isCheckoutRoute = segments.includes("checkout")

  if (isCheckoutRoute) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-background onboarding-bg">
      <main>
        <div className="mx-auto max-w-[600px] px-6 py-12">
          {children}
        </div>
      </main>
    </div>
  )
}
