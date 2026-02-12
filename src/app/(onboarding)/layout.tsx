import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { OnboardingHeader } from "@/components/onboarding/OnboardingHeader"

function isDynamicServerUsageError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false

  const maybeError = error as { digest?: unknown; description?: unknown }

  return (
    maybeError.digest === "DYNAMIC_SERVER_USAGE" ||
    (typeof maybeError.description === "string" &&
      maybeError.description.includes("Dynamic server usage"))
  )
}

/**
 * Sync Clerk user ke Convex database.
 * Fallback mechanism jika webhook gagal atau untuk new signups.
 * Critical untuk onboarding karena redirect terjadi sebelum webhook selesai.
 */
async function ensureConvexUser() {
  try {
    const { userId: clerkUserId, getToken } = await auth()
    if (!clerkUserId) return

    let convexToken: string | null = null
    try {
      convexToken = await getToken({ template: "convex" })
    } catch {
      return
    }
    if (!convexToken) return

    const user = await currentUser()
    if (!user) return

    const primaryEmailAddress = user.primaryEmailAddress ?? user.emailAddresses[0]
    const primaryEmail = primaryEmailAddress?.emailAddress
    if (!primaryEmail) return

    const emailVerified = primaryEmailAddress?.verification?.status === "verified"

    const syncPromise = fetchMutation(api.users.createUser, {
      clerkUserId: user.id,
      email: primaryEmail,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      emailVerified,
    }, { token: convexToken })

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Convex sync timeout (5s)")), 5000)
    )

    await Promise.race([syncPromise, timeoutPromise])
  } catch (error) {
    if (isDynamicServerUsageError(error)) return
    console.error("[ensureConvexUser] Onboarding layout sync failed:", error)
  }
}

/**
 * Onboarding Layout
 * - Auth protected (redirects to /sign-in if not authenticated)
 * - Ensures user exists in Convex before rendering
 * - Minimal header with logo and close button
 * - Centered content container (max-width 600px)
 */
export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { userId } = await auth()

  // Protected route - redirect to sign-in if not authenticated
  if (!userId) {
    redirect("/sign-in")
  }

  // Ensure user exists in Convex before rendering onboarding pages
  await ensureConvexUser()

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
