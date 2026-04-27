"use client"

import { useRouter } from "next/navigation"
import { FastArrowLeft } from "iconoir-react"
import { cn } from "@/lib/utils"
import { CreditMeter } from "@/components/billing/CreditMeter"
import { UserDropdown } from "@/components/layout/header/UserDropdown"
import { NaskahSidebar } from "./NaskahSidebar"
import type { NaskahSection, NaskahSectionKey } from "@/lib/naskah/types"

interface NaskahSidebarContainerProps {
  /** When provided, renders the desktop collapse toggle in the header strip. */
  onCollapseSidebar?: () => void
  /** Section outline items rendered inside NaskahSidebar. */
  sections: NaskahSection[]
  /** Keys that should receive the post-refresh highlight. */
  highlightedSectionKeys?: NaskahSectionKey[]
  /** Called when the mobile sheet drawer should close after a nav action. */
  onCloseMobile?: () => void
  className?: string
}

/**
 * NaskahSidebarContainer — chat-parallel wrapper for the naskah section
 * outline.
 *
 * Visual skeleton mirrors `src/components/chat/ChatSidebar.tsx` wrapper +
 * collapse header + content slot + footer structure. Per D-019 the naskah
 * page is a sibling of the chat page with shared shell behavior; this
 * container is the "same aside, different content" side of that promise.
 *
 * What this does NOT include vs chat's ChatSidebar:
 * - No "+ Percakapan Baru" button (resolved as Q1 A — naskah has no new
 *   action, omitting keeps the layout clean without a dead slot).
 * - No SidebarChatHistory / SidebarQueueProgress content — naskah renders
 *   the NaskahSidebar section outline directly.
 * - No manage mode, selection count, or bulk-delete affordances.
 *
 * What this DOES keep for strict chat parity:
 * - Outer `<aside>` classes byte-identical to ChatSidebar's wrapper
 * - Collapse header with `FastArrowLeft` button (desktop only, when
 *   `onCollapseSidebar` provided)
 * - Footer with `CreditMeter` (compact variant) + mobile `UserDropdown`
 *   (resolved as Q5 A — keep both for full parity)
 */
export function NaskahSidebarContainer({
  onCollapseSidebar,
  sections,
  highlightedSectionKeys = [],
  onCloseMobile,
  className,
}: NaskahSidebarContainerProps) {
  const router = useRouter()

  return (
    <aside
      data-testid="naskah-sidebar-container"
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-visible",
        "border-r border-[color:var(--chat-sidebar-border)]",
        "bg-[var(--chat-accent)]",
        "md:overflow-hidden",
        className,
      )}
    >
      {onCollapseSidebar && (
        <div className="flex h-11 shrink-0 items-center justify-end border-b border-[color:var(--chat-sidebar-border)] px-3">
          <button
            type="button"
            onClick={onCollapseSidebar}
            aria-label="Collapse sidebar"
            className={cn(
              "flex items-center justify-center",
              "w-7 h-7 rounded-action",
              "text-[var(--chat-muted-foreground)] hover:bg-[var(--chat-sidebar-accent)] hover:text-[var(--chat-foreground)]",
              "transition-colors duration-150",
            )}
          >
            <FastArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      <div
        data-testid="naskah-sidebar-content"
        className="min-h-0 flex-1 overflow-hidden"
      >
        <NaskahSidebar
          sections={sections}
          highlightedSectionKeys={highlightedSectionKeys}
        />
      </div>

      <div
        data-testid="naskah-sidebar-footer"
        className="shrink-0 border-t border-[color:var(--chat-sidebar-border)] bg-[var(--chat-accent)]"
      >
        <CreditMeter
          variant="compact"
          className="shrink-0 bg-transparent"
          onClick={() => router.push("/subscription/overview")}
        />

        <div className="shrink-0 px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
          <UserDropdown
            variant="compact"
            compactLabel="first-name"
            compactFill
            placement="top-start"
            onActionComplete={onCloseMobile}
          />
        </div>
      </div>
    </aside>
  )
}
