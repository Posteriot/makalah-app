"use client"

import { Button } from "@/components/ui/button"
import { RefreshDouble, Plus, FastArrowLeft, Settings, SidebarCollapse } from "iconoir-react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { SidebarChatHistory } from "./sidebar/SidebarChatHistory"
import { SidebarPaperSessions } from "./sidebar/SidebarPaperSessions"
import { SidebarProgress } from "./sidebar/SidebarProgress"
import type { PanelType } from "./shell/ActivityBar"
import { CreditMeter } from "@/components/billing/CreditMeter"
import { UserDropdown } from "@/components/layout/header/UserDropdown"

/**
 * ChatSidebar Props
 *
 * Extended to support multi-state rendering via activePanel prop.
 * Now acts as a container that conditionally renders different sidebar content.
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
  /** Callback when artifact is selected */
  onArtifactSelect?: (artifactId: Id<"artifacts">, opts?: { readOnly?: boolean; sourceConversationId?: Id<"conversations">; title?: string; type?: string }) => void
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
  /** Creating new chat state */
  isCreating?: boolean
  /** Callback to collapse sidebar (desktop only) */
  onCollapseSidebar?: () => void
  /** Callback when panel tab changes (mobile drawer tabs) */
  onPanelChange?: (panel: PanelType) => void
  /** Callback to open conversation manager workspace panel */
  onOpenConversationManager?: () => void
  /** Callback to open paper sessions workspace panel */
  onOpenPaperSessionsManager?: () => void
}

/**
 * ChatSidebar - Multi-state container
 *
 * Conditionally renders one of three sidebar states based on activePanel:
 * 1. "chat-history" (default) - SidebarChatHistory with conversation list
 * 2. "paper" - SidebarPaperSessions with paper session folders
 * 3. "progress" - SidebarProgress with paper milestone timeline
 *
 * Common elements:
 * - Sidebar header with "New Chat" button (only for chat-history)
 * - Sidebar footer with CreditMeter (all tiers, admin-hidden)
 */
export function ChatSidebar({
  activePanel = "chat-history",
  conversations,
  totalConversationCount = 0,
  currentConversationId,
  onNewChat,
  onDeleteConversation,
  onUpdateConversationTitle,
  onArtifactSelect,
  activeArtifactId,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  className,
  onCloseMobile,
  isLoading,
  isCreating,
  onCollapseSidebar,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPanelChange,
  onOpenConversationManager,
  onOpenPaperSessionsManager,
}: ChatSidebarProps) {
  const router = useRouter()
  const displayedConversationCount = conversations.length
  const resolvedTotalConversationCount = Math.max(
    totalConversationCount,
    displayedConversationCount
  )
  const historyCountLabel = `${displayedConversationCount} dari ${resolvedTotalConversationCount}`

  // Render sidebar content based on active panel
  const renderContent = () => {
    switch (activePanel) {
      case "paper":
        return (
          <SidebarPaperSessions
            currentConversationId={currentConversationId}
            onArtifactSelect={onArtifactSelect}
            activeArtifactId={activeArtifactId}
            isArtifactPanelOpen={isArtifactPanelOpen}
            onArtifactPanelToggle={onArtifactPanelToggle}
            onOpenPaperSessionsManager={onOpenPaperSessionsManager}
            onCloseMobile={onCloseMobile}
          />
        )
      case "progress":
        return <SidebarProgress conversationId={currentConversationId} />
      case "chat-history":
      default:
        return (
          <SidebarChatHistory
            conversations={conversations}
            currentConversationId={currentConversationId}
            onDeleteConversation={onDeleteConversation}
            onUpdateConversationTitle={onUpdateConversationTitle}
            onCloseMobile={onCloseMobile}
            isLoading={isLoading}
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
            <div className="min-w-0 rounded-action border border-[color:var(--chat-sidebar-border)] bg-[var(--chat-sidebar)] px-3 py-1.5">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate text-sm font-sans font-semibold text-[var(--chat-sidebar-foreground)]">
                  Riwayat
                </span>
                <span className="shrink-0 rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-muted)] px-2 py-0.5 text-[10px] font-mono font-semibold text-[var(--chat-muted-foreground)]">
                  {historyCountLabel}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-action bg-transparent",
                "text-[var(--chat-muted-foreground)] transition-colors duration-150",
                "hover:bg-[var(--chat-sidebar-accent)] hover:text-[var(--chat-foreground)]"
              )}
              aria-label="Buka Kelola Percakapan"
              title="Buka Kelola Percakapan"
              onClick={() => {
                onOpenConversationManager?.()
                onCloseMobile?.()
              }}
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
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
