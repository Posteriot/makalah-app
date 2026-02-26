"use client"

import { useSession } from "@/lib/auth-client"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { SETTINGS_SIDEBAR_ITEMS, findSettingsTabConfig, type SettingsTabId } from "./settingsConfig"
import { ProfileTab } from "./ProfileTab"
import { SecurityTab } from "./SecurityTab"
import { StatusTab } from "./StatusTab"

type SettingsContentSectionProps = {
  activeTab: SettingsTabId
}

export function SettingsContentSection({ activeTab }: SettingsContentSectionProps) {
  const { data: session, isPending } = useSession()
  const { user: convexUser, isLoading: isConvexLoading } = useCurrentUser()

  const currentTab = findSettingsTabConfig(activeTab) ?? SETTINGS_SIDEBAR_ITEMS[0]
  const HeaderIcon = currentTab.headerIcon
  const primaryEmail = convexUser?.email ?? session?.user?.email ?? ""

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

        {isPending && (
          <div className="text-interface text-sm text-muted-foreground">Memuat...</div>
        )}

        {activeTab === "profile" && (
          <ProfileTab
            convexUser={convexUser}
            session={session}
            isLoading={isConvexLoading || isPending}
          />
        )}

        {activeTab === "security" && (
          <SecurityTab
            session={session}
            isLoading={isConvexLoading || isPending}
          />
        )}

        {activeTab === "status" && (
          <StatusTab
            primaryEmail={primaryEmail}
            convexUser={convexUser}
            isConvexLoading={isConvexLoading}
          />
        )}
      </div>
    </main>
  )
}
