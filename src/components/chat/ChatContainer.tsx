"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery } from "convex/react"
import { useSearchParams, useRouter } from "next/navigation"
import { api } from "../../../convex/_generated/api"
import { ChatLayout } from "./layout/ChatLayout"
import { ChatWindow } from "./ChatWindow"
import { ArtifactPanel } from "./ArtifactPanel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { useCleanupEmptyConversations } from "@/lib/hooks/useCleanupEmptyConversations"
import { Id } from "../../../convex/_generated/dataModel"
import { useArtifactTabs } from "@/lib/hooks/useArtifactTabs"
import type { ArtifactOpenOptions } from "@/lib/hooks/useArtifactTabs"
import { MobileArtifactViewer } from "./mobile/MobileArtifactViewer"
import { MobileRefrasaViewer } from "./mobile/MobileRefrasaViewer"
import { useSession } from "@/lib/auth-client"

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
  const containerRenderCount = useRef(0)
  const { user } = useCurrentUser()
  const { data: session, isPending: isSessionPending } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const deepLinkArtifactId = searchParams.get("artifact")
  const deepLinkSourceMessageId = searchParams.get("sourceMessage")
  const deepLinkHandledKey = useRef<string | null>(null)

  // Cleanup empty conversations ONLY on landing page (/chat without ID)
  // Don't cleanup when viewing a specific conversation - prevents deleting newly created ones
  useCleanupEmptyConversations(conversationId === null ? user?._id : null)

  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [mobileArtifactId, setMobileArtifactId] = useState<Id<"artifacts"> | null>(null)
  const [mobileRefrasaId, setMobileRefrasaId] = useState<Id<"artifacts"> | null>(null)
  const [sourceFocusTarget, setSourceFocusTarget] = useState<{
    artifactId: Id<"artifacts">
    sourceMessageId?: Id<"messages">
  } | null>(null)
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
    updateTabId: updateArtifactTabId,
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

  useEffect(() => {
    containerRenderCount.current += 1
    if (process.env.NODE_ENV !== "production") {
      console.info(`[CONTAINER] render #${containerRenderCount.current} conversationId=${conversationId ?? "null"}`)
    }
  })

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

  const [ottGracePeriod, setOttGracePeriod] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).has('ott')
  })

  useEffect(() => {
    if (!ottGracePeriod) return
    if (session) {
      queueMicrotask(() => setOttGracePeriod(false))
      // Strip consumed OTT token from URL
      const url = new URL(window.location.href)
      url.searchParams.delete("ott")
      window.history.replaceState({}, "", url.toString())
      return
    }
    const timer = setTimeout(() => setOttGracePeriod(false), 5000)
    return () => clearTimeout(timer)
  }, [ottGracePeriod, session])

  useEffect(() => {
    if (isSessionPending || session || ottGracePeriod) return

    const redirectPath = `${window.location.pathname}${window.location.search}`
    window.location.replace(
      `/sign-in?redirect_url=${encodeURIComponent(redirectPath)}`
    )
  }, [isSessionPending, session, ottGracePeriod])

  // Deep link: auto-open artifact panel when navigating via ?artifact=<id>
  useEffect(() => {
    if (!deepLinkArtifactId || !artifacts) {
      deepLinkHandledKey.current = null
      return
    }

    const deepLinkKey = `${conversationId ?? "no-conversation"}:${deepLinkArtifactId}:${deepLinkSourceMessageId ?? ""}`
    if (deepLinkHandledKey.current === deepLinkKey) return

    const artifact = artifacts.find((a) => a._id === deepLinkArtifactId)
    if (!artifact) return

    deepLinkHandledKey.current = deepLinkKey
    openArtifactTab({
      id: artifact._id,
      title: artifact.title,
      type: artifact.type,
      origin: "chat",
      sourceConversationId: safeConversationId ?? undefined,
      sourceMessageId: deepLinkSourceMessageId
        ? (deepLinkSourceMessageId as Id<"messages">)
        : undefined,
      sourceKind: artifact.type === "refrasa" ? "refrasa" : "artifact",
    })
    queueMicrotask(() =>
      setSourceFocusTarget({
        artifactId: artifact._id,
        sourceMessageId: deepLinkSourceMessageId
          ? (deepLinkSourceMessageId as Id<"messages">)
          : undefined,
      })
    )
    // Clean up URL search param
    router.replace(`/chat/${conversationId}`, { scroll: false })
  }, [
    artifacts,
    conversationId,
    deepLinkArtifactId,
    deepLinkSourceMessageId,
    openArtifactTab,
    router,
    safeConversationId,
  ])

  // Handler when artifact is created or selected — opens a tab (desktop) or overlay (mobile)
  const handleArtifactSelect = (
    artifactId: Id<"artifacts">,
    opts?: ArtifactOpenOptions
  ) => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setMobileArtifactId(artifactId)
    } else {
      const artifact = artifacts?.find((a) => a._id === artifactId)
      openArtifactTab({
        id: artifactId,
        title: artifact?.title ?? opts?.title ?? "Untitled",
        type: artifact?.type ?? opts?.type ?? "section",
        readOnly: opts?.readOnly,
        sourceConversationId: opts?.sourceConversationId,
        origin: opts?.origin,
        originSessionId: opts?.originSessionId,
        originSessionTitle: opts?.originSessionTitle,
        sourceMessageId: opts?.sourceMessageId,
        sourceKind: opts?.sourceKind,
      })
    }
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
    <>
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
            onOpenTab={openArtifactTab}
            onUpdateTabId={updateArtifactTabId}
          />
        }
      >
        <ChatWindow
          key={conversationId}
          conversationId={conversationId}
          onMobileMenuClick={() => setIsMobileOpen(true)}
          onArtifactSelect={handleArtifactSelect}
          artifacts={artifacts}
          sourceFocusTarget={sourceFocusTarget}
        />
      </ChatLayout>

      {/* Mobile overlays */}
      {mobileArtifactId && (
        <MobileArtifactViewer
          artifactId={mobileArtifactId}
          onClose={() => setMobileArtifactId(null)}
          onRefrasa={(artifactId) => setMobileRefrasaId(artifactId)}
          onOpenArtifact={(artifactId) => setMobileArtifactId(artifactId)}
        />
      )}

      {mobileRefrasaId && user?._id && (
        <MobileRefrasaViewer
          artifactId={mobileRefrasaId}
          userId={user._id}
          onClose={() => setMobileRefrasaId(null)}
        />
      )}
    </>
  )
}
