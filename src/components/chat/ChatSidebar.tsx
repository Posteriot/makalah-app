"use client"

import { Button } from "@/components/ui/button"
import { Loader2Icon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { Id } from "../../../convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { SidebarChatHistory } from "./sidebar/SidebarChatHistory"
import { SidebarPaperSessions } from "./sidebar/SidebarPaperSessions"
import { SidebarProgress } from "./sidebar/SidebarProgress"
import type { PanelType } from "./shell/ActivityBar"

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
  /** Additional CSS classes */
  className?: string
  /** Callback to close mobile sidebar */
  onCloseMobile?: () => void
  /** Loading state for conversations */
  isLoading?: boolean
  /** Creating new chat state */
  isCreating?: boolean
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
 * - Sidebar footer for upgrade CTA (BPP/Gratis users only)
 */
export function ChatSidebar({
  activePanel = "chat-history",
  conversations,
  currentConversationId,
  onNewChat,
  onDeleteConversation,
  onUpdateConversationTitle,
  className,
  onCloseMobile,
  isLoading,
  isCreating,
}: ChatSidebarProps) {
  const { user } = useCurrentUser()
  const router = useRouter()

  // Determine if user needs upgrade CTA (BPP or Gratis)
  const showUpgradeCTA =
    user &&
    user.role !== "admin" &&
    user.role !== "superadmin" &&
    (user.subscriptionStatus === "bpp" || user.subscriptionStatus === "free")

  // Render sidebar content based on active panel
  const renderContent = () => {
    switch (activePanel) {
      case "paper":
        return (
          <SidebarPaperSessions
            currentConversationId={currentConversationId}
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
        "w-full h-full flex flex-col bg-sidebar overflow-hidden",
        className
      )}
    >
      {/* Header - Only show New Chat for chat-history panel */}
      {activePanel === "chat-history" && (
        <div className="pt-4 px-4 pb-3 border-b shrink-0">
          <Button
            onClick={() => {
              onNewChat()
              onCloseMobile?.()
            }}
            className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-gray-900 font-medium rounded-[10px] gap-2 text-sm"
            aria-label="Start new chat"
            aria-busy={isCreating}
            disabled={isCreating}
          >
            {isCreating ? (
              <>
                <Loader2Icon className="h-4 w-4 animate-spin" />
                Membuat...
              </>
            ) : (
              <>
                <PlusIcon className="h-4 w-4" />
                Percakapan Baru
              </>
            )}
          </Button>
        </div>
      )}

      {/* Section Label - Only show for chat-history panel */}
      {activePanel === "chat-history" && (
        <div className="py-2 px-4 text-xs text-muted-foreground">
          Conversations <span className="ml-2">{conversations.length}</span>
        </div>
      )}

      {/* Content - Conditionally rendered based on activePanel */}
      <div className="flex-1 flex flex-col overflow-hidden">{renderContent()}</div>

      {/* Footer - Upgrade CTA for BPP/Gratis users */}
      {showUpgradeCTA && (
        <div className="p-3 border-t shrink-0">
          <Button
            variant="default"
            size="sm"
            className={cn(
              "w-full font-semibold",
              user.subscriptionStatus === "bpp"
                ? "bg-orange-500 hover:bg-orange-600"
                : "bg-yellow-500 hover:bg-yellow-600 text-black"
            )}
            onClick={() => router.push("/price")}
          >
            Upgrade
          </Button>
        </div>
      )}
    </aside>
  )
}

export default ChatSidebar
