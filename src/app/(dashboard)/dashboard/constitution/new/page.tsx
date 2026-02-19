"use client"

import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ConstitutionEditor } from "@/components/admin/ConstitutionEditor"

export default function NewConstitutionPage() {
  const { user, isLoading } = useCurrentUser()

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground font-mono">Memuat...</p>
        </div>
      </div>
    )
  }

  const isAdmin = user.role === "admin" || user.role === "superadmin"
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">Akses ditolak.</p>
      </div>
    )
  }

  return <ConstitutionEditor userId={user._id} />
}
