"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ChatLayout } from "./layout/ChatLayout"
import { ChatWindow } from "./ChatWindow"
import { ArtifactPanel } from "./ArtifactPanel"
import { Id } from "../../../convex/_generated/dataModel"

interface ChatContainerProps {
  conversationId: string | null
}

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
  const router = useRouter()
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false)
  const [selectedArtifactId, setSelectedArtifactId] = useState<Id<"artifacts"> | null>(null)

  // Handler when artifact is created or selected
  const handleArtifactSelect = useCallback((artifactId: Id<"artifacts">) => {
    setSelectedArtifactId(artifactId)
    setArtifactPanelOpen(true)
  }, [])

  // Toggle artifact panel
  const toggleArtifactPanel = useCallback(() => {
    setArtifactPanelOpen((prev) => !prev)
  }, [])

  // Reset artifact state when conversation changes or is deleted
  const resetArtifactState = useCallback(() => {
    setArtifactPanelOpen(false)
    setSelectedArtifactId(null)
  }, [])

  return (
    <ChatLayout
      conversationId={conversationId}
      isArtifactPanelOpen={artifactPanelOpen}
      onArtifactPanelToggle={toggleArtifactPanel}
      selectedArtifactId={selectedArtifactId}
      onArtifactSelect={handleArtifactSelect}
      artifactPanel={
        <ArtifactPanel
          key={conversationId ?? "no-conversation"}
          conversationId={conversationId as Id<"conversations"> | null}
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
        onMobileMenuClick={() => {
          // Mobile menu is handled by ChatLayout's Sheet
          // This is a no-op but kept for compatibility
        }}
        onArtifactSelect={handleArtifactSelect}
      />
    </ChatLayout>
  )
}

export default ChatContainer
