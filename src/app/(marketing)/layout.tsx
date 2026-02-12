import { GlobalHeader } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { auth, currentUser } from "@clerk/nextjs/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"

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
 * Fallback mechanism jika webhook gagal atau untuk existing users.
 */
async function ensureConvexUser() {
  try {
    const { userId: clerkUserId, getToken } = await auth()
    if (!clerkUserId) return

    // Wrap getToken in try-catch - dapat throw saat logout/session invalid
    let convexToken: string | null = null
    try {
      convexToken = await getToken({ template: "convex" })
    } catch {
      // Session invalid (logout in progress), skip sync
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

    const timeoutMs = 10000
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    const timeoutPromise = new Promise<"timeout">((resolve) => {
      timeoutId = setTimeout(() => resolve("timeout"), timeoutMs)
    })

    const result = await Promise.race([syncPromise.then(() => "synced" as const), timeoutPromise])

    if (timeoutId) clearTimeout(timeoutId)

    if (result === "timeout") {
      console.warn(`[ensureConvexUser] Convex sync timeout (${timeoutMs}ms)`)
      return
    }
  } catch (error) {
    if (isDynamicServerUsageError(error)) return
    console.error("[ensureConvexUser] Marketing layout sync failed:", error)
  }
}

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await ensureConvexUser()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalHeader />
      <main className="global-main">{children}</main>
      <Footer />
    </div>
  )
}
