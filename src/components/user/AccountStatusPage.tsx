"use client"

import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { RoleBadge } from "@/components/admin/RoleBadge"

/**
 * Custom page untuk Clerk UserProfile yang menampilkan
 * Status Akun (Role & Subscription) dari Convex database.
 *
 * Digunakan di dalam <UserButton.UserProfilePage />
 */
export function AccountStatusPage() {
  const { user, isLoading } = useCurrentUser()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-muted-foreground">Memuat...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          Data tidak tersedia. Silakan refresh halaman.
        </p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Status Akun</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Informasi akun Anda di Makalah App
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm font-medium">Email</span>
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </div>

        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm font-medium">Role</span>
          <RoleBadge role={user.role as "superadmin" | "admin" | "user"} />
        </div>

        <div className="flex items-center justify-between py-2 border-b">
          <span className="text-sm font-medium">Subscription</span>
          <span className="text-sm text-muted-foreground capitalize">
            {user.subscriptionStatus || "Free"}
          </span>
        </div>
      </div>
    </div>
  )
}
