"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { SidebarExpand, SidebarCollapse } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import { AdminContentSection } from "./AdminContentSection"
import { AdminSidebar, AdminMobileSidebar } from "./AdminSidebar"
import { type AdminTabId, resolveTabId } from "./adminPanelConfig"

interface AdminPanelContainerProps {
  userId: Id<"users">
  userRole: "superadmin" | "admin" | "user"
}

export function AdminPanelContainer({
  userId,
  userRole,
}: AdminPanelContainerProps) {
  const searchParams = useSearchParams()
  const tabParam = resolveTabId(searchParams.get("tab") ?? "overview")
  const [activeTab, setActiveTab] = useState<AdminTabId>(tabParam)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sync activeTab when URL ?tab= param changes (e.g., navigating back from editor)
  useEffect(() => {
    setActiveTab(tabParam)
  }, [tabParam])

  return (
    <div className="admin-container relative isolate left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-background">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 lg:px-8">
        <div className="md:hidden flex justify-end py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Tutup menu admin" : "Buka menu admin"}
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
          <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <AdminContentSection
            activeTab={activeTab}
            userId={userId}
            userRole={userRole}
            onNavigate={setActiveTab}
          />
        </div>
      </div>

      <AdminMobileSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )
}
