"use client"

import Link from "next/link"
import { Book, ChatBubble, Database, HomeSimpleDoor, Page, NavArrowRight } from "iconoir-react"
import { cn } from "@/lib/utils"

export type WorkspaceManagerTabId = "overview" | "conversations"

const WORKSPACE_MANAGER_ITEMS = [
  {
    key: "overview",
    label: "Overview",
    icon: HomeSimpleDoor,
    isActive: true,
  },
  {
    key: "conversations",
    label: "Percakapan",
    icon: ChatBubble,
    isActive: true,
  },
  {
    key: "paper",
    label: "Paper",
    icon: Page,
    isActive: false,
  },
  {
    key: "attachments",
    label: "Lampiran",
    icon: Book,
    isActive: false,
  },
  {
    key: "knowledge-base",
    label: "Knowledge Base",
    icon: Database,
    isActive: false,
  },
] as const

interface WorkspaceManagerSidebarProps {
  activeTab: WorkspaceManagerTabId
  onTabChange: (tab: WorkspaceManagerTabId) => void
}

export function WorkspaceManagerSidebar({
  activeTab,
  onTabChange,
}: WorkspaceManagerSidebarProps) {
  return (
    <aside className="w-full shrink-0 self-start">
      <div className="flex flex-col rounded-shell border border-[color:var(--chat-border)] bg-[var(--chat-card)] p-4">
        <div className="px-2 pb-3 pt-1">
          <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-[var(--chat-muted-foreground)]">
            Workspace Manager
          </p>
        </div>
        <nav className="space-y-1.5" aria-label="Workspace modules">
          {WORKSPACE_MANAGER_ITEMS.map((item) => {
            const Icon = item.icon
            const isSelected = item.isActive && activeTab === item.key

            return (
              <button
                key={item.key}
                type="button"
                disabled={!item.isActive}
                onClick={() => {
                  if (item.isActive) {
                    onTabChange(item.key as WorkspaceManagerTabId)
                  }
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-action border px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "border-[color:var(--chat-border)] bg-[var(--chat-sidebar-accent)] text-[var(--chat-sidebar-accent-foreground)]"
                    : item.isActive
                      ? "border-transparent bg-transparent text-[var(--chat-muted-foreground)] hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)]"
                      : "border-transparent bg-transparent text-[var(--chat-muted-foreground)] opacity-100"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{item.label}</span>
                </span>
                {isSelected && <NavArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
              </button>
            )
          })}
        </nav>
        <div className="mt-6 border-t border-[color:var(--chat-border)] pt-4">
          <Link
            href="/chat"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--chat-muted-foreground)] transition-colors hover:text-[var(--chat-sidebar-foreground)]"
          >
            ← Kembali ke chat
          </Link>
        </div>
      </div>
    </aside>
  )
}
