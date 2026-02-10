import { NavArrowRight } from "iconoir-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { ADMIN_SIDEBAR_ITEMS, type AdminTabId } from "./adminPanelConfig"

type AdminSidebarProps = {
  activeTab: AdminTabId
  onTabChange: (tab: AdminTabId) => void
}

type AdminMobileSidebarProps = AdminSidebarProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SidebarNav({
  activeTab,
  onTabChange,
  closeAfterSelect,
}: AdminSidebarProps & { closeAfterSelect?: () => void }) {
  return (
    <nav className="space-y-6">
      <div>
        <h3 className="text-signal text-[10px] font-bold text-muted-foreground">
          ADMIN PANEL
        </h3>
        <ul className="mt-3 space-y-1">
          {ADMIN_SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onTabChange(item.id)
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
                  {isActive && <NavArrowRight className="h-4 w-4 shrink-0" />}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  return (
    <aside className="hidden md:col-span-4 md:block">
      <div className="mt-4 rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900">
        <SidebarNav activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </aside>
  )
}

export function AdminMobileSidebar({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
}: AdminMobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="text-interface font-mono text-sm font-medium text-foreground">
            Admin Menu
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
