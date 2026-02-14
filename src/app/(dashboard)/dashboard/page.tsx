"use client"

import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { AdminPanelContainer } from "@/components/admin/AdminPanelContainer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WarningCircle } from "iconoir-react"

export default function DashboardPage() {
  const { user, isLoading } = useCurrentUser()

  // Loading or not authenticated — show spinner.
  // Route protection is handled by proxy.ts (middleware).
  // During sign-out, session becomes null briefly before navigation;
  // showing spinner prevents a redirect flash to /sign-in.
  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-mono">Memuat dashboard...</p>
        </div>
      </div>
    )
  }

  // Check admin/superadmin role
  const isAdmin = user.role === "admin" || user.role === "superadmin"

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <WarningCircle className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>
            Anda tidak memiliki izin untuk mengakses Dashboard.
            Halaman ini hanya dapat diakses oleh Admin atau Superadmin.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <AdminPanelContainer
      userId={user._id}
      userRole={user.role as "superadmin" | "admin" | "user"}
    />
  )
}
