"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { Button } from "@/components/ui/button"
import { RefreshDouble, Plus, FastArrowLeft, SidebarCollapse, Settings, Xmark } from "iconoir-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import type { ArtifactOpenOptions } from "@/lib/hooks/useArtifactTabs"
import { cn } from "@/lib/utils"
import { SidebarChatHistory } from "./sidebar/SidebarChatHistory"
import { SidebarProgress } from "./sidebar/SidebarProgress"
import type { PanelType } from "./shell/ActivityBar"
import { CreditMeter } from "@/components/billing/CreditMeter"
import { UserDropdown } from "@/components/layout/header/UserDropdown"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"

/**
 * ChatSidebar Props
 *
 * Extended to support multi-state rendering via activePanel prop.
 * Sekarang sidebar hanya punya dua konteks:
 * - Riwayat Percakapan (tree workspace)
 * - Linimasa Progres
 */
interface ChatSidebarProps {
  /** Active panel from Activity Bar */
  activePanel?: PanelType
  /** List of conversations */
  conversations: Array<{
    _id: Id<"conversations">
    title: string
    lastMessageAt: number
  }>
  /** Exact total conversation count */
  totalConversationCount?: number
  /** Currently selected conversation ID */
  currentConversationId: string | null
  /** Callback to create new chat */
  onNewChat: () => void
  /** Callback to delete a conversation */
  onDeleteConversation: (id: Id<"conversations">) => void
  /** Callback to update conversation title */
  onUpdateConversationTitle?: (id: Id<"conversations">, title: string) => Promise<void>
  /** Callback to delete many conversations */
  onDeleteConversations: (ids: Id<"conversations">[]) => Promise<void>
  /** Callback to delete all conversations */
  onDeleteAllConversations: () => Promise<void>
  /** Callback when artifact is selected */
  onArtifactSelect?: (artifactId: Id<"artifacts">, opts?: ArtifactOpenOptions) => void
  /** Currently selected artifact ID in panel */
  activeArtifactId?: Id<"artifacts"> | null
  /** Whether artifact panel is open */
  isArtifactPanelOpen?: boolean
  /** Callback to toggle artifact panel */
  onArtifactPanelToggle?: () => void
  /** Additional CSS classes */
  className?: string
  /** Callback to close mobile sidebar */
  onCloseMobile?: () => void
  /** Loading state for conversations */
  isLoading?: boolean
  /** More conversations available */
  hasMoreConversations?: boolean
  /** Incremental load more callback */
  onLoadMoreConversations?: () => void
  /** Creating new chat state */
  isCreating?: boolean
  /** Callback to collapse sidebar (desktop only) */
  onCollapseSidebar?: () => void
}

/**
 * ChatSidebar - Multi-state container
 *
 * Conditionally renders one of three sidebar states based on activePanel:
 * 1. "chat-history" (default) - SidebarChatHistory tree
 * 2. "progress" - SidebarProgress dengan konteks percakapan aktif
 *
 * Common elements:
 * - Sidebar header with "New Chat" button (only for chat-history)
 * - Sidebar footer with CreditMeter (all tiers, admin-hidden)
 */
export function ChatSidebar({
  activePanel = "chat-history",
  conversations,
  totalConversationCount,
  currentConversationId,
  onNewChat,
  onDeleteConversation,
  onUpdateConversationTitle,
  onDeleteConversations,
  onDeleteAllConversations,
  onArtifactSelect,
  activeArtifactId,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  className,
  onCloseMobile,
  isLoading,
  hasMoreConversations,
  onLoadMoreConversations,
  isCreating,
  onCollapseSidebar,
}: ChatSidebarProps) {
  const router = useRouter()
  const { user } = useCurrentUser()
  const displayedConversationCount = conversations.length
  const [historyManageRequestNonce, setHistoryManageRequestNonce] = useState(0)
  const [isHistoryManageMode, setIsHistoryManageMode] = useState(false)
  const manageModeConversationCount = useQuery(
    api.conversations.countConversations,
    activePanel === "chat-history" && isHistoryManageMode && user?._id
      ? { userId: user._id }
      : "skip"
  )
  const resolvedTotalConversationCount =
    typeof totalConversationCount === "number"
      ? Math.max(totalConversationCount, displayedConversationCount)
      : typeof manageModeConversationCount === "number"
        ? Math.max(manageModeConversationCount, displayedConversationCount)
      : undefined
  const historyCountLabel = resolvedTotalConversationCount !== undefined
    ? `${displayedConversationCount} dari ${resolvedTotalConversationCount}`
    : hasMoreConversations
      ? `${displayedConversationCount}+`
      : String(displayedConversationCount)

  // Render sidebar content based on active panel
  const renderContent = () => {
    switch (activePanel) {
      case "progress":
        return <SidebarProgress conversationId={currentConversationId} />
      case "chat-history":
      default:
        return (
          <SidebarChatHistory
            conversations={conversations}
            totalConversationCount={resolvedTotalConversationCount}
            currentConversationId={currentConversationId}
            onDeleteConversation={onDeleteConversation}
            onDeleteConversations={onDeleteConversations}
            onDeleteAllConversations={onDeleteAllConversations}
            onUpdateConversationTitle={onUpdateConversationTitle}
            onArtifactSelect={onArtifactSelect}
            activeArtifactId={activeArtifactId}
            isArtifactPanelOpen={isArtifactPanelOpen}
            onArtifactPanelToggle={onArtifactPanelToggle}
            onCloseMobile={onCloseMobile}
            isLoading={isLoading}
            hasMore={hasMoreConversations}
            onLoadMore={onLoadMoreConversations}
            manageRequestNonce={historyManageRequestNonce}
            onManageModeChange={setIsHistoryManageMode}
          />
        )
    }
  }

  return (
    <aside
      className={cn(
        "h-full w-full overflow-visible md:overflow-hidden border-r border-[color:var(--chat-sidebar-border)] bg-[var(--chat-accent)]",
        "flex flex-col",
        className
      )}
    >
      {/* Desktop: Collapse toggle header */}
      {onCollapseSidebar && (
        <div className="flex h-11 shrink-0 items-center justify-end border-b border-[color:var(--chat-sidebar-border)] px-3">
          <button
            onClick={onCollapseSidebar}
            className={cn(
              "flex items-center justify-center",
              "w-7 h-7 rounded-action",
              "text-[var(--chat-muted-foreground)] hover:bg-[var(--chat-sidebar-accent)] hover:text-[var(--chat-foreground)]",
              "transition-colors duration-150"
            )}
            aria-label="Collapse sidebar"
          >
            <FastArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* New Chat button — outline style matching chat toolbar buttons */}
      {activePanel === "chat-history" && (
        <div className="hidden md:block shrink-0 px-2 pt-3 pb-2.5">
          <Button
            onClick={() => {
              onNewChat()
              onCloseMobile?.()
            }}
            className={cn(
              "h-10 w-full items-center justify-center gap-2 rounded-action",
              "border border-[color:var(--chat-sidebar-border)]",
              "bg-[var(--chat-sidebar)] text-[var(--chat-sidebar-foreground)]",
              "px-4 py-0 text-sm font-sans font-medium leading-none",
              "hover:bg-[var(--chat-sidebar-accent)] active:bg-[var(--chat-sidebar-accent)] transition-colors duration-150"
            )}
            aria-label="Start new chat"
            aria-busy={isCreating}
            disabled={isCreating}
          >
            {isCreating ? (
              <span className="inline-flex items-center gap-2 leading-none">
                <RefreshDouble className="h-4 w-4 animate-spin" />
                Membuat...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 leading-none">
                <Plus className="h-4 w-4" />
                Percakapan Baru
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Section header — Riwayat label with count badge */}
      {activePanel === "chat-history" && (
        <div className="shrink-0 flex items-center justify-between bg-[var(--chat-accent)] px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              aria-label="Home"
              className="md:hidden inline-flex h-8 w-8 shrink-0 items-center justify-center text-[var(--chat-sidebar-foreground)] transition-opacity hover:opacity-80"
              onClick={() => onCloseMobile?.()}
            >
              <Image
                src="/logo/makalah_logo_light.svg"
                alt="Makalah"
                width={20}
                height={20}
                className="hidden dark:block"
              />
              <Image
                src="/logo/makalah_logo_dark.svg"
                alt="Makalah"
                width={20}
                height={20}
                className="block dark:hidden"
              />
            </Link>
            <div
              className={cn(
                "min-w-0 rounded-action border px-3 py-1.5 transition-colors duration-150",
                isHistoryManageMode
                  ? "border-[color:color-mix(in_oklab,var(--chat-info)_28%,var(--chat-sidebar-border))] bg-[color:color-mix(in_oklab,var(--chat-info)_8%,var(--chat-sidebar))]"
                  : "border-[color:var(--chat-sidebar-border)] bg-[var(--chat-sidebar)]"
              )}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-sans font-semibold text-[var(--chat-sidebar-foreground)]">
                  Riwayat
                </span>
                <span
                  className={cn(
                    "shrink-0 rounded-badge border px-2 py-0.5 text-[10px] font-mono font-semibold transition-colors duration-150",
                    isHistoryManageMode
                      ? "border-[color:color-mix(in_oklab,var(--chat-info)_24%,var(--chat-border))] bg-[color:color-mix(in_oklab,var(--chat-info)_14%,var(--chat-muted))] text-[color:color-mix(in_oklab,var(--chat-info)_45%,var(--chat-muted-foreground))]"
                      : "border-[color:var(--chat-border)] bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)]"
                  )}
                >
                  {historyCountLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setHistoryManageRequestNonce((current) => current + 1)}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-action transition-colors duration-150",
                isHistoryManageMode
                  ? "text-[var(--chat-muted-foreground)] hover:bg-[var(--chat-sidebar-accent)] hover:text-[var(--chat-foreground)]"
                  : "text-[var(--chat-muted-foreground)] hover:bg-[var(--chat-sidebar-accent)] hover:text-[var(--chat-foreground)]"
              )}
              aria-label={isHistoryManageMode ? "Tutup mode kelola riwayat" : "Buka mode kelola riwayat"}
            >
              {isHistoryManageMode ? (
                <Xmark className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Settings className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
            {/* Mobile: SidebarCollapse to close drawer */}
            <button
              onClick={onCloseMobile}
              className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--chat-muted-foreground)] active:bg-[var(--chat-sidebar-accent)] active:text-[var(--chat-foreground)] transition-colors duration-150"
              aria-label="Close sidebar"
            >
              <SidebarCollapse className="h-5 w-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      )}

      {/* Content — flat scrollable list, same as desktop */}
      <div className="flex-1 flex flex-col overflow-hidden">{renderContent()}</div>

      {/* CreditMeter — same as desktop: border-top separator, transparent bg */}
      <CreditMeter
        variant="compact"
        className="shrink-0 border-t border-[color:var(--chat-sidebar-border)] bg-transparent"
        onClick={() => router.push("/subscription/overview")}
      />

      {/* Mobile-only: User dropdown (replaces single Settings link) */}
      <div className="md:hidden px-4 py-3 border-t border-[color:var(--chat-sidebar-border)]">
        <UserDropdown
          variant="compact"
          compactLabel="first-name"
          compactFill
          placement="top-start"
          onActionComplete={onCloseMobile}
        />
      </div>
    </aside>
  )
}
