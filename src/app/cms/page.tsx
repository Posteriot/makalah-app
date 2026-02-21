"use client"

import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { CmsShell } from "@/components/cms/CmsShell"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WarningCircle } from "iconoir-react"

export default function CmsPage() {
  const { user, isLoading } = useCurrentUser()

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-mono">Memuat CMS...</p>
        </div>
      </div>
    )
  }

  const isAdmin = user.role === "admin" || user.role === "superadmin"

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-dvh">
        <div className="max-w-2xl p-6">
          <Alert variant="destructive">
            <WarningCircle className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Anda tidak memiliki izin untuk mengakses Content Manager.
              Halaman ini hanya dapat diakses oleh Admin atau Superadmin.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return <CmsShell userId={user._id} />
}
