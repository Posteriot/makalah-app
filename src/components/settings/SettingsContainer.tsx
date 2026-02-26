"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { SidebarExpand, SidebarCollapse } from "iconoir-react"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import { SettingsContentSection } from "./SettingsContentSection"
import { SettingsSidebar, SettingsMobileSidebar } from "./SettingsSidebar"
import { type SettingsTabId, resolveSettingsTab } from "./settingsConfig"

export function SettingsContainer() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const tabParam = resolveSettingsTab(searchParams.get("tab"))
  const [activeTab, setActiveTab] = useState<SettingsTabId>(tabParam)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setActiveTab(tabParam)
  }, [tabParam])

  const handleTabChange = useCallback((tab: SettingsTabId) => {
    setActiveTab(tab)
    router.replace(`/settings?tab=${tab}`, { scroll: false })
  }, [router])

  return (
    <div className="admin-container relative isolate left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-background">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 lg:px-8">
        <div className="md:hidden flex justify-end py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Tutup menu pengaturan" : "Buka menu pengaturan"}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-action p-1 text-foreground transition-colors hover:text-foreground/70"
          >
            {sidebarOpen ? (
              <SidebarCollapse className="h-7 w-7" strokeWidth={1.5} />
            ) : (
              <SidebarExpand className="h-7 w-7" strokeWidth={1.5} />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-comfort pb-2 md:grid-cols-16">
          <SettingsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
          <SettingsContentSection activeTab={activeTab} />
        </div>
      </div>

      <SettingsMobileSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  )
}
