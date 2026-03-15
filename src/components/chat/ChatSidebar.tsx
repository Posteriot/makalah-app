"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { Button } from "@/components/ui/button"
import { RefreshDouble, Plus, FastArrowLeft } from "iconoir-react"
import { useRouter } from "next/navigation"
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
  /** Incremental loading state for conversation pagination */
  isLoadingMore?: boolean
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
  isLoadingMore,
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
  const [selectionCount, setSelectionCount] = useState(0)
  const [isAllSelected, setIsAllSelected] = useState(false)
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
  const historyCountLabel = isHistoryManageMode
    ? (() => {
        const total = resolvedTotalConversationCount ?? displayedConversationCount
        const selected = isAllSelected ? total : selectionCount
        return `${selected} dari ${total}`
      })()
    : resolvedTotalConversationCount !== undefined
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
            isLoadingMore={isLoadingMore}
            hasMore={hasMoreConversations}
            onLoadMore={onLoadMoreConversations}
            manageRequestNonce={historyManageRequestNonce}
            onManageModeChange={setIsHistoryManageMode}
            onSelectionCountChange={(count, isAll) => {
              setSelectionCount(count)
              setIsAllSelected(isAll)
            }}
            manageHeaderLabel={historyCountLabel}
            onToggleManageMode={() => setHistoryManageRequestNonce((current) => current + 1)}
          />
        )
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full min-h-0 w-full flex-col overflow-visible border-r border-[color:var(--chat-sidebar-border)] bg-[var(--chat-accent)] md:overflow-hidden",
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
        <div className="hidden md:block shrink-0 px-3 pb-3 pt-3">
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

      {/* Content — Riwayat header now rendered inside SidebarChatHistory for both modes */}
      <div data-testid="chat-sidebar-content" className="min-h-0 flex-1 overflow-hidden">
        {renderContent()}
      </div>

      <div
        data-testid="chat-sidebar-footer"
        className="shrink-0 border-t border-[color:var(--chat-sidebar-border)] bg-[var(--chat-accent)]"
      >
        <CreditMeter
          variant="compact"
          className="shrink-0 bg-transparent"
          onClick={() => router.push("/subscription/overview")}
        />

        {/* Mobile-only: User dropdown (replaces single Settings link) */}
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
