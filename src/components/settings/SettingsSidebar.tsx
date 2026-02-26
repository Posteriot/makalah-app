import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { SETTINGS_SIDEBAR_ITEMS, type SettingsTabId } from "./settingsConfig"

type SettingsSidebarProps = {
  activeTab: SettingsTabId
  onTabChange: (tab: SettingsTabId) => void
}

type SettingsMobileSidebarProps = SettingsSidebarProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SidebarNav({
  activeTab,
  onTabChange,
  closeAfterSelect,
}: SettingsSidebarProps & { closeAfterSelect?: () => void }) {
  return (
    <nav className="space-y-6">
      <div>
        <h3 className="text-signal text-[10px] font-bold text-muted-foreground">
          PENGATURAN AKUN
        </h3>
        <ul className="mt-3 space-y-1">
          {SETTINGS_SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onTabChange(item.id as SettingsTabId)
                    closeAfterSelect?.()
                  }}
                  className={cn(
                    "text-interface flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
                      : "text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-left">
                    {item.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <aside className="hidden md:col-span-4 md:block">
      <div className="mt-4 rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900">
        <SidebarNav activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </aside>
  )
}

export function SettingsMobileSidebar({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
}: SettingsMobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="text-interface font-mono text-sm font-medium text-foreground">
            Pengaturan Akun
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-5 py-5">
          <SidebarNav
            activeTab={activeTab}
            onTabChange={onTabChange}
            closeAfterSelect={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
