"use client"

import { Suspense } from "react"
import { SettingsContainer } from "@/components/settings/SettingsContainer"

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-mono">Memuat pengaturan...</p>
        </div>
      </div>
    }>
      <SettingsContainer />
    </Suspense>
  )
}
