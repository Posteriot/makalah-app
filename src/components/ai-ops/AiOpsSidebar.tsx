"use client"

import Link from "next/link"
import { NavArrowRight } from "iconoir-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { AI_OPS_SIDEBAR_ITEMS, type AiOpsTabId } from "./aiOpsConfig"

type AiOpsSidebarProps = {
  activeTab: AiOpsTabId
  onTabChange: (tab: AiOpsTabId) => void
}

type AiOpsMobileSidebarProps = AiOpsSidebarProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SidebarNav({
  activeTab,
  onTabChange,
  closeAfterSelect,
}: AiOpsSidebarProps & { closeAfterSelect?: () => void }) {
  return (
    <nav className="space-y-6">
      <div>
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          AI OPS
        </h3>
        <ul className="mt-3 space-y-1">
          {AI_OPS_SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const isParentActive =
              item.children && activeTab.startsWith(item.id + ".")

            const itemClasses = cn(
              "font-mono text-sm flex w-full items-center gap-3 rounded-[8px] px-3 py-2 transition-colors",
              isActive || isParentActive
                ? "bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
                : "text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50"
            )

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    const targetId = item.defaultChildId ?? item.id
                    onTabChange(targetId as AiOpsTabId)
                    if (!item.children) {
                      closeAfterSelect?.()
                    }
                  }}
                  className={itemClasses}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-left">
                    {item.label}
                  </span>
                  {(isActive || isParentActive) && (
                    <NavArrowRight className="h-4 w-4 shrink-0" />
                  )}
                </button>

                {item.children && isParentActive && (
                  <ul className="ml-7 mt-1 space-y-0.5 border-l border-border pl-3">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon
                      const isChildActive = activeTab === child.id

                      return (
                        <li key={child.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onTabChange(child.id as AiOpsTabId)
                              closeAfterSelect?.()
                            }}
                            className={cn(
                              "font-mono text-xs flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 transition-colors",
                              isChildActive
                                ? "text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 truncate text-left">
                              {child.label}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="border-t border-border pt-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Admin Panel
        </Link>
      </div>
    </nav>
  )
}

export function AiOpsSidebar({ activeTab, onTabChange }: AiOpsSidebarProps) {
  return (
    <aside className="hidden md:col-span-4 md:block">
      <div className="mt-4 rounded-[16px] border-[0.5px] border-border bg-card/90 p-[16px] backdrop-blur-[1px] dark:bg-slate-900">
        <SidebarNav activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </aside>
  )
}

export function AiOpsMobileSidebar({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
}: AiOpsMobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="font-mono text-sm font-medium text-foreground">
            AI Ops Menu
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
