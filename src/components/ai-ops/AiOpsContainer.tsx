"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { SidebarExpand, SidebarCollapse } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import { AiOpsContentSection } from "./AiOpsContentSection"
import { AiOpsSidebar, AiOpsMobileSidebar } from "./AiOpsSidebar"
import { type AiOpsTabId, resolveAiOpsTabId } from "./aiOpsConfig"

interface AiOpsContainerProps {
  userId: Id<"users">
}

export function AiOpsContainer({ userId }: AiOpsContainerProps) {
  const searchParams = useSearchParams()
  const tabParam = resolveAiOpsTabId(searchParams.get("tab") ?? "overview")
  const [activeTab, setActiveTab] = useState<AiOpsTabId>(tabParam)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setActiveTab(tabParam)
  }, [tabParam])

  const handleTabChange = (tab: AiOpsTabId) => {
    setActiveTab(tab)
    const url = tab === "overview" ? "/ai-ops" : `/ai-ops?tab=${tab}`
    window.history.replaceState(null, "", url)
  }

  return (
    <div className="relative isolate left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[color:var(--section-bg-alt)]">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 lg:px-8">
        <div className="flex justify-end py-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Tutup menu" : "Buka menu"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] p-1 text-foreground transition-colors hover:text-foreground/70"
          >
            {sidebarOpen ? (
              <SidebarCollapse className="h-7 w-7" strokeWidth={1.5} />
            ) : (
              <SidebarExpand className="h-7 w-7" strokeWidth={1.5} />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-[16px] pb-2 md:grid-cols-16">
          <AiOpsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
          <AiOpsContentSection activeTab={activeTab} userId={userId} />
        </div>
      </div>

      <AiOpsMobileSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  )
}
