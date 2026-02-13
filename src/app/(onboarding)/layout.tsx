import { isAuthenticated } from "@/lib/auth-server"
import { redirect } from "next/navigation"
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader"

/**
 * Onboarding Layout
 * - Auth protected (redirects to /sign-in if not authenticated)
 * - User sync handled by useCurrentUser hook (client-side)
 * - Minimal header with logo and close button
 * - Centered content container (max-width 600px)
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await isAuthenticated()

  // Protected route - redirect to sign-in if not authenticated
  if (!session) {
    redirect("/sign-in")
  }

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
