"use client"

import { Suspense } from "react"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { SettingsContainer } from "@/components/settings/SettingsContainer"

export default function SettingsPage() {
  const { user, isLoading } = useCurrentUser()

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-mono">Memuat pengaturan...</p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="text-interface text-sm text-muted-foreground p-8">Memuat...</div>}>
      <SettingsContainer />
    </Suspense>
  )
}
