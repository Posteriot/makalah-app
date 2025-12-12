import type { ReactNode } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"

async function ensureConvexUser() {
  const user = await currentUser()
  if (!user) return

  const primaryEmail = user.emailAddresses[0]?.emailAddress
  if (!primaryEmail) return

  await fetchMutation(api.users.createUser, {
    clerkUserId: user.id,
    email: primaryEmail,
  })
}

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode
}) {
  await ensureConvexUser()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b bg-card/40">
        <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 sm:px-8">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Makalah App
            </span>
            <span className="text-xs text-muted-foreground">Dashboard</span>
          </div>
        </header>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">{children}</div>
    </div>
  )
}
