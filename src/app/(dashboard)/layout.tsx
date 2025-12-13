import type { ReactNode } from "react"
import { currentUser } from "@clerk/nextjs/server"
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import Link from "next/link"
import { Settings } from "lucide-react"
import { AdminNavLink } from "@/components/admin/AdminNavLink"

async function ensureConvexUser() {
  const user = await currentUser()
  if (!user) return

  const primaryEmail = user.emailAddresses[0]?.emailAddress
  if (!primaryEmail) return

  // Extract email verification status from Clerk
  const emailVerified =
    user.emailAddresses[0]?.verification?.status === "verified"

  // Extract user name
  const firstName = user.firstName ?? undefined
  const lastName = user.lastName ?? undefined

  // Sync to Convex
  await fetchMutation(api.users.createUser, {
    clerkUserId: user.id,
    email: primaryEmail,
    firstName,
    lastName,
    emailVerified,
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
          <nav className="flex items-center gap-4">
            <Link
              href="/chat"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Chat
            </Link>
            <AdminNavLink />
            <Link
              href="/settings"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Pengaturan</span>
            </Link>
          </nav>
        </header>
      </div>
      <div className="mx-auto max-w-5xl px-6 py-8 sm:px-8">{children}</div>
    </div>
  )
}
