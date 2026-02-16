"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { ChatLayout } from "./layout/ChatLayout"
import { ChatWindow } from "./ChatWindow"
import { ArtifactPanel } from "./ArtifactPanel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useCleanupEmptyConversations } from "@/lib/hooks/useCleanupEmptyConversations"
import { Id } from "../../../convex/_generated/dataModel"
import { useArtifactTabs } from "@/lib/hooks/useArtifactTabs"

interface ChatContainerProps {
  conversationId: string | null
}

/**
 * ChatContainer - Main container for chat page
 *
 * Integrates:
 * - ChatLayout (6-column CSS Grid with Activity Bar, Sidebar, Tabs, Resizers)
 * - ChatWindow (messages, input, empty state)
 * - ArtifactPanel (artifact viewer with tabs)
 *
 * State Management:
 * - Artifact tab state via useArtifactTabs (multi-tab model)
 * - Panel is open when there are open artifact tabs
 * - Passes artifact tab props to ArtifactPanel
 *
 * Preserved Functionality:
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

  // Artifact tab state management (multi-tab model)
  const {
    openTabs: artifactTabs,
    activeTabId: activeArtifactTabId,
    openTab: openArtifactTab,
    closeTab: closeArtifactTab,
    setActiveTab: setActiveArtifactTab,
    closeAllTabs: closeAllArtifactTabs,
    updateTabTitle: updateArtifactTabTitle,
  } = useArtifactTabs()

  // Panel is open when there are open tabs
  const artifactPanelOpen = artifactTabs.length > 0

  // Query artifacts for count (used in header badge) and for looking up artifact details
  const artifacts = useQuery(
    api.artifacts.listByConversation,
    safeConversationId && user?._id
      ? { conversationId: safeConversationId, userId: user._id }
      : "skip"
  )
  const artifactCount = artifacts?.length ?? 0

  // Sync tab titles when Convex artifact data updates (fixes stale "Loading..." titles)
  useEffect(() => {
    if (!artifacts) return
    for (const tab of artifactTabs) {
      const artifact = artifacts.find((a) => a._id === tab.id)
      if (artifact && artifact.title !== tab.title) {
        updateArtifactTabTitle(tab.id, artifact.title)
      }
    }
  }, [artifacts, artifactTabs, updateArtifactTabTitle])

  // Handler when artifact is created or selected — opens a tab
  const handleArtifactSelect = (artifactId: Id<"artifacts">) => {
    // Look up artifact data from the query to get real title and type
    const artifact = artifacts?.find((a) => a._id === artifactId)
    openArtifactTab({
      id: artifactId,
      title: artifact?.title ?? "Loading...",
      type: artifact?.type ?? "section",
    })
  }

  // Toggle artifact panel — close all tabs when open, open most recent when closed
  const toggleArtifactPanel = () => {
    if (artifactPanelOpen) {
      closeAllArtifactTabs()
    } else if (artifacts && artifacts.length > 0) {
      const latest = artifacts[0]
      openArtifactTab({
        id: latest._id,
        title: latest.title ?? "Untitled",
        type: latest.type ?? "section",
      })
    }
  }

  return (
    <ChatLayout
      conversationId={conversationId}
      isArtifactPanelOpen={artifactPanelOpen}
      onArtifactPanelToggle={toggleArtifactPanel}
      onArtifactSelect={handleArtifactSelect}
      activeArtifactId={activeArtifactTabId}
      artifactCount={artifactCount}
      mobileSidebarOpen={isMobileOpen}
      onMobileSidebarOpenChange={setIsMobileOpen}
      artifactPanel={
        <ArtifactPanel
          key={conversationId ?? "no-conversation"}
          conversationId={safeConversationId}
          isOpen={artifactPanelOpen}
          onToggle={toggleArtifactPanel}
          openTabs={artifactTabs}
          activeTabId={activeArtifactTabId}
          onTabChange={setActiveArtifactTab}
          onTabClose={closeArtifactTab}
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
