import type { ReactNode } from "react"
import { auth, currentUser } from "@clerk/nextjs/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"

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

    const primaryEmailAddress =
      user.primaryEmailAddress ?? user.emailAddresses[0]
    const primaryEmail = primaryEmailAddress?.emailAddress
    if (!primaryEmail) return

    const emailVerified =
      primaryEmailAddress?.verification?.status === "verified"
    const firstName = user.firstName ?? undefined
    const lastName = user.lastName ?? undefined

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
    console.error("[ensureConvexUser] Sync failed:", error)
  }
}

export default async function AccountLayout({
  children,
}: {
  children: ReactNode
}) {
  await ensureConvexUser()

  return (
    <div className="min-h-dvh relative bg-background text-foreground flex items-start md:items-center justify-center p-0 md:p-6">
      {/* Industrial Grid Pattern — same as auth layout */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05] z-[1]"
        style={{
          backgroundImage: `
            linear-gradient(var(--border-hairline) 1px, transparent 1px),
            linear-gradient(90deg, var(--border-hairline) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }}
        aria-hidden="true"
      />

      {/* Content Container */}
      <div className="relative z-10 w-full max-w-none md:max-w-5xl flex md:justify-center">
        {children}
      </div>
    </div>
  )
}
