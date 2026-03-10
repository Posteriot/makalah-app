"use client"

import { Book, ChatBubble, Database, Page } from "iconoir-react"
import { cn } from "@/lib/utils"

const WORKSPACE_MANAGER_ITEMS = [
  {
    key: "conversations",
    label: "Percakapan",
    description: "Aktif",
    icon: ChatBubble,
    isActive: true,
  },
  {
    key: "paper",
    label: "Paper",
    description: "Coming soon",
    icon: Page,
    isActive: false,
  },
  {
    key: "attachments",
    label: "Lampiran",
    description: "Coming soon",
    icon: Book,
    isActive: false,
  },
  {
    key: "knowledge-base",
    label: "Knowledge Base",
    description: "Coming soon",
    icon: Database,
    isActive: false,
  },
] as const

export function WorkspaceManagerSidebar() {
  return (
    <aside className="w-full shrink-0 md:w-[240px]">
      <div className="rounded-shell border border-[color:var(--chat-sidebar-border)] bg-[var(--chat-sidebar)] p-3">
        <div className="px-2 pb-3 pt-1">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--chat-muted-foreground)]">
            Workspace Manager
          </p>
        </div>
        <nav className="space-y-1.5" aria-label="Workspace modules">
          {WORKSPACE_MANAGER_ITEMS.map((item) => {
            const Icon = item.icon

            return (
              <button
                key={item.key}
                type="button"
                disabled={!item.isActive}
                className={cn(
                  "flex w-full items-center gap-3 rounded-action border px-3 py-2.5 text-left transition-colors",
                  item.isActive
                    ? "border-[color:var(--chat-sidebar-border)] bg-[var(--chat-sidebar-accent)] text-[var(--chat-sidebar-accent-foreground)]"
                    : "border-transparent bg-transparent text-[var(--chat-muted-foreground)] opacity-100"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.label}</span>
                  <span className="block text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--chat-muted-foreground)]">
                    {item.description}
                  </span>
                </span>
              </button>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
