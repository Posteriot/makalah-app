"use client"

import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { ContentManager } from "@/components/admin/ContentManager"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import { WarningCircle } from "iconoir-react"

export default function CmsPage() {
  const { user, isLoading } = useCurrentUser()

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <WarningCircle className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>
            Anda tidak memiliki izin untuk mengakses Content Manager.
            Halaman ini hanya dapat diakses oleh Admin atau Superadmin.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="relative isolate left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[color:var(--section-bg-alt)] pt-[var(--header-h)]">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 pt-6 lg:px-8">
        <div className="mx-auto w-full max-w-4xl rounded-shell border-hairline bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8">
          <ContentManager userId={user._id} />
        </div>
      </div>
    </div>
  )
}
