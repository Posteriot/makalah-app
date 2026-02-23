"use client"

import { Button } from "@/components/ui/button"
import { RefreshDouble, Plus, FastArrowLeft } from "iconoir-react"
import { useRouter } from "next/navigation"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { SidebarChatHistory } from "./sidebar/SidebarChatHistory"
import { SidebarPaperSessions } from "./sidebar/SidebarPaperSessions"
import { SidebarProgress } from "./sidebar/SidebarProgress"
import type { PanelType } from "./shell/ActivityBar"
import { CreditMeter } from "@/components/billing/CreditMeter"

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
  /** Currently selected conversation ID */
  currentConversationId: string | null
  /** Callback to create new chat */
  onNewChat: () => void
  /** Callback to delete a conversation */
  onDeleteConversation: (id: Id<"conversations">) => void
  /** Callback to update conversation title */
  onUpdateConversationTitle?: (id: Id<"conversations">, title: string) => Promise<void>
  /** Callback when artifact is selected */
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
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
}: ChatSidebarProps) {
  const router = useRouter()

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
        "h-full w-full overflow-hidden border-r border-[color:var(--chat-sidebar-border)] bg-[var(--chat-accent)]",
        "flex flex-col",
        className
      )}
    >
      {/* Sidebar Header — Collapse toggle */}
      {onCollapseSidebar && (
        <div className="flex h-11 shrink-0 items-center justify-end border-b border-[color:var(--chat-sidebar-border)] px-3">
          <button
            onClick={onCollapseSidebar}
            className={cn(
              "flex items-center justify-center",
              "w-7 h-7 rounded-action",
              "text-[var(--chat-muted-foreground)] hover:bg-[var(--chat-accent)] hover:text-[var(--chat-foreground)]",
              "transition-colors duration-150"
            )}
            aria-label="Collapse sidebar"
          >
            <FastArrowLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Header - Only show New Chat for chat-history panel */}
      {activePanel === "chat-history" && (
        <div className="shrink-0 px-3 pb-3 pt-3">
          <Button
            onClick={() => {
              onNewChat()
              onCloseMobile?.()
            }}
            className={cn(
              "h-10 w-full items-center justify-center gap-2 rounded-action border border-[color:var(--chat-sidebar-border)] bg-[var(--chat-sidebar-primary)] px-4 py-0 text-sm font-medium leading-none text-[var(--chat-sidebar-primary-foreground)]",
              "hover:opacity-90"
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

      {/* Section Label - Only show for chat-history panel */}
      {activePanel === "chat-history" && (
        <div className="px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-widest text-[var(--chat-muted-foreground)]">
          Riwayat <span className="ml-2 font-mono">{conversations.length}</span>
        </div>
      )}

      {/* Content - Conditionally rendered based on activePanel */}
      <div className="flex-1 flex flex-col overflow-hidden">{renderContent()}</div>

      {/* Credit Meter — border-top only, seamless with sidebar bg */}
      <CreditMeter
        variant="compact"
        className="shrink-0 border-t-[0.5px] border-[color:var(--chat-border)] bg-transparent"
        onClick={() => router.push("/subscription/overview")}
      />
    </aside>
  )
}

export default ChatSidebar
