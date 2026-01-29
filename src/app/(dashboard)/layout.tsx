import type { ReactNode } from "react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { GlobalHeader } from "@/components/layout/GlobalHeader"
import { Footer } from "@/components/layout/Footer"

/**
 * Sync Clerk user ke Convex database.
 *
 * Menggunakan timeout 5 detik untuk mencegah infinite hang jika:
 * - Convex service slow/unavailable
 * - Network latency tinggi
 * - Connection issues
 *
 * Jika sync gagal, user tetap bisa access dashboard.
 * Sync akan otomatis retry di request berikutnya karena
 * createUser adalah idempotent operation (upsert).
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

    const primaryEmailAddress =
      user.primaryEmailAddress ?? user.emailAddresses[0]
    const primaryEmail = primaryEmailAddress?.emailAddress
    if (!primaryEmail) return

    const emailVerified =
      primaryEmailAddress?.verification?.status === "verified"
    const firstName = user.firstName ?? undefined
    const lastName = user.lastName ?? undefined

    // Timeout 5 detik untuk mencegah infinite hang
    const syncPromise = fetchMutation(api.users.createUser, {
      clerkUserId: user.id,
      email: primaryEmail,
      firstName,
      lastName,
      emailVerified,
    }, { token: convexToken })

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Convex sync timeout (5s)")), 5000)
    )

    await Promise.race([syncPromise, timeoutPromise])
  } catch (error) {
    // Log error tapi jangan block user dari accessing dashboard
    // Sync akan di-retry otomatis di page/request berikutnya
    console.error("[ensureConvexUser] Sync failed:", error)
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  await ensureConvexUser()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <GlobalHeader />
      <main className="dashboard-main">{children}</main>
      <Footer />
    </div>
  )
}
