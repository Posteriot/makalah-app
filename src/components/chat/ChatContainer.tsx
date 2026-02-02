"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { ChatLayout } from "./layout/ChatLayout"
import { ChatWindow } from "./ChatWindow"
import { ArtifactPanel } from "./ArtifactPanel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useCleanupEmptyConversations } from "@/lib/hooks/useCleanupEmptyConversations"
import { Id } from "../../../convex/_generated/dataModel"

interface ChatContainerProps {
  conversationId: string | null
}

type ArtifactState = { isOpen: boolean; selectedId: Id<"artifacts"> | null }

/**
 * ChatContainer - Main container for chat page
 *
 * Integrates:
 * - ChatLayout (6-column CSS Grid with Activity Bar, Sidebar, Tabs, Resizers)
 * - ChatWindow (messages, input, empty state)
 * - ArtifactPanel (artifact viewer with list)
 *
 * State Management:
 * - Artifact panel open/close state
 * - Selected artifact ID
 * - Passes artifact panel to ChatLayout as prop
 *
 * Preserved Functionality:
 * - Artifact panel state management
 * - Artifact selection handler
 * - Mobile sidebar integration (handled by ChatLayout)
 * - useConversations integration (handled by ChatLayout)
 */
export function ChatContainer({ conversationId }: ChatContainerProps) {
  const { user } = useCurrentUser()

  // Cleanup empty conversations ONLY on landing page (/chat without ID)
  // Don't cleanup when viewing a specific conversation - prevents deleting newly created ones
  useCleanupEmptyConversations(conversationId === null ? user?._id : null)

  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const isValidConvexId = (value: string | null): value is string =>
    typeof value === "string" && /^[a-z0-9]{32}$/.test(value)
  const safeConversationId = isValidConvexId(conversationId)
    ? (conversationId as Id<"conversations">)
    : null

  const [artifactStateByConversation, setArtifactStateByConversation] = useState<
    Record<string, ArtifactState>
  >({})

  const conversationKey = safeConversationId ?? "no-conversation"
  const currentArtifactState = artifactStateByConversation[conversationKey] ?? {
    isOpen: false,
    selectedId: null,
  }
  const artifactPanelOpen = currentArtifactState.isOpen
  const selectedArtifactId = currentArtifactState.selectedId

  // Query artifacts for count (used in header badge)
  const artifacts = useQuery(
    api.artifacts.listByConversation,
    safeConversationId && user?._id
      ? { conversationId: safeConversationId, userId: user._id }
      : "skip"
  )
  const artifactCount = artifacts?.length ?? 0

  // Handler when artifact is created or selected
  const updateArtifactState = (updater: (state: ArtifactState) => ArtifactState) => {
    setArtifactStateByConversation((prev) => {
      const prevState = prev[conversationKey] ?? { isOpen: false, selectedId: null }
      return {
        ...prev,
        [conversationKey]: updater(prevState),
      }
    })
  }

  const handleArtifactSelect = (artifactId: Id<"artifacts">) => {
    updateArtifactState((state) => ({
      ...state,
      selectedId: artifactId,
      isOpen: true,
    }))
  }

  // Toggle artifact panel
  const toggleArtifactPanel = () => {
    updateArtifactState((state) => ({
      ...state,
      isOpen: !state.isOpen,
    }))
  }

  return (
    <ChatLayout
      conversationId={conversationId}
      isArtifactPanelOpen={artifactPanelOpen}
      onArtifactPanelToggle={toggleArtifactPanel}
      onArtifactSelect={handleArtifactSelect}
      artifactCount={artifactCount}
      mobileSidebarOpen={isMobileOpen}
      onMobileSidebarOpenChange={setIsMobileOpen}
      artifactPanel={
        <ArtifactPanel
          key={conversationId ?? "no-conversation"}
          conversationId={safeConversationId}
          isOpen={artifactPanelOpen}
          onToggle={toggleArtifactPanel}
          selectedArtifactId={selectedArtifactId}
          onSelectArtifact={handleArtifactSelect}
        />
      }
    >
      <ChatWindow
        key={conversationId}
        conversationId={conversationId}
        onMobileMenuClick={() => setIsMobileOpen(true)}
        onArtifactSelect={handleArtifactSelect}
      />
    </ChatLayout>
  )
}

export default ChatContainer
