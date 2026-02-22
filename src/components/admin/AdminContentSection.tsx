import { StatsReport } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import { AIProviderManager } from "./AIProviderManager"
import { AdminOverviewContent } from "./AdminOverviewContent"
import { StyleConstitutionManager } from "./StyleConstitutionManager"
import { SystemHealthPanel } from "./SystemHealthPanel"
import { SystemPromptsManager } from "./SystemPromptsManager"
import { UserList } from "./UserList"
import { WaitlistEntries } from "./WaitlistEntries"
import { WaitlistSettings } from "./WaitlistSettings"
import { ADMIN_SIDEBAR_ITEMS, findTabConfig, type AdminTabId } from "./adminPanelConfig"

type AdminContentSectionProps = {
  activeTab: AdminTabId
  userId: Id<"users">
  userRole: "superadmin" | "admin" | "user"
  onNavigate: (tab: AdminTabId) => void
}

export function AdminContentSection({
  activeTab,
  userId,
  userRole,
  onNavigate,
}: AdminContentSectionProps) {
  const currentTab =
    findTabConfig(activeTab) ??
    ADMIN_SIDEBAR_ITEMS[0]
  const HeaderIcon = currentTab.headerIcon

  return (
    <main className="col-span-1 pt-4 md:col-span-12">
      <div className="mx-auto w-full max-w-4xl rounded-shell border-hairline bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-narrative flex items-center gap-2 text-2xl font-medium tracking-tight text-foreground md:text-3xl">
            <HeaderIcon className="h-6 w-6 text-foreground" />
            {currentTab.headerTitle}
          </h1>
          <p className="text-narrative text-sm text-muted-foreground">
            {currentTab.headerDescription}
          </p>
        </div>

        {activeTab === "overview" && (
          <AdminOverviewContent userId={userId} onNavigate={onNavigate} />
        )}

        {activeTab === "users" && (
          <UserList userId={userId} currentUserRole={userRole} />
        )}

        {activeTab === "prompts" && (
          <div className="space-y-6">
            <SystemHealthPanel userId={userId} />
            <SystemPromptsManager userId={userId} />
          </div>
        )}

        {activeTab === "providers" && (
          <div className="space-y-6">
            <AIProviderManager userId={userId} />
          </div>
        )}

        {activeTab === "refrasa" && (
          <div className="space-y-6">
            <StyleConstitutionManager userId={userId} />
          </div>
        )}

        {activeTab === "waitlist.entries" && (
          <WaitlistEntries userId={userId} />
        )}

        {activeTab === "waitlist.settings" && (
          <WaitlistSettings userId={userId} />
        )}

        {activeTab === "stats" && (
          <div className="rounded-shell border-main border border-border bg-card/60">
            <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-shell border-main border border-border bg-card">
                <StatsReport className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-interface mb-2 text-base font-medium text-foreground">
                Fitur Statistik
              </h3>
              <p className="text-narrative mb-4 max-w-md text-sm text-muted-foreground">
                Fitur statistik akan segera hadir. Anda akan dapat melihat analitik
                penggunaan aplikasi, statistik pengguna, dan metrik performa.
              </p>
              <span className="text-signal rounded-badge border border-sky-500/30 bg-sky-500/15 px-2.5 py-1 text-[10px] font-bold text-sky-500">
                COMING SOON
              </span>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
