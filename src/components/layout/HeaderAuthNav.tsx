"use client"

import Link from "next/link"
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs"
import { FileText, User } from "lucide-react"
import { AccountStatusPage } from "@/components/user/AccountStatusPage"

/**
 * Client component untuk auth navigation di header.
 *
 * Kenapa client component?
 * - SignedIn/SignedOut perlu reactive terhadap auth state changes
 * - Di Server Component, mereka hanya baca auth state saat render
 * - Di Client Component, mereka subscribe ke ClerkProvider context
 *   dan akan re-render ketika auth state berubah (login/logout)
 */
export function HeaderAuthNav() {
  return (
    <>
      <SignedIn>
        <Link
          href="/dashboard"
          className="hidden text-muted-foreground hover:text-foreground sm:inline-block"
        >
          Dashboard
        </Link>
        <UserButton afterSignOutUrl="/">
          {/* Custom menu items - sebelum Manage account */}
          <UserButton.MenuItems>
            <UserButton.Link
              label="Papers"
              labelIcon={<FileText className="h-4 w-4" />}
              href="/dashboard/papers"
            />
          </UserButton.MenuItems>
          {/* Custom page untuk Status Akun (Role & Subscription) */}
          <UserButton.UserProfilePage
            label="Status Akun"
            url="status"
            labelIcon={<User className="h-4 w-4" />}
          >
            <AccountStatusPage />
          </UserButton.UserProfilePage>
        </UserButton>
      </SignedIn>
      <SignedOut>
        <Link
          href="/sign-in"
          className="text-muted-foreground hover:text-foreground"
        >
          Sign in
        </Link>
      </SignedOut>
    </>
  )
}
