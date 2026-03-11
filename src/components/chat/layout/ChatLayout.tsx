"use client"

import { useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { ActivityBar, type PanelType } from "../shell/ActivityBar"
import { TopBar } from "../shell/TopBar"
import { ChatSidebar } from "../ChatSidebar"
import { PanelResizer } from "@/components/ui/PanelResizer"
import { useConversations } from "@/lib/hooks/useConversations"
import { useRouter } from "next/navigation"
import { Id } from "../../../../convex/_generated/dataModel"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ConversationManagerPanel } from "../workspace-panel/ConversationManagerPanel"
import { PaperSessionsManagerPanel } from "../workspace-panel/PaperSessionsManagerPanel"

/**
 * ChatLayout - 6-column CSS Grid orchestrator
 *
 * Grid structure:
 * - Column 1: Activity Bar (48px fixed)
 * - Column 2: Sidebar (280px default, resizable)
 * - Column 3: Resizer (2px)
 * - Column 4: Main Content (1fr)
 * - Column 5: Resizer (2px)
 * - Column 6: Panel (480px default, resizable)
 *
 * Grid rows:
 * - Single row, full height. Header is inside main column (not spanning all columns)
 *
 * Constraints:
 * - Sidebar: min 180px, max dynamic (guarantees 640px main content)
 * - Panel: min 280px, max dynamic (guarantees 640px main content)
 * - Collapse threshold: 100px
 */

interface ChatLayoutProps {
  conversationId: string | null
  children: ReactNode
  /** Whether artifact panel is open */
  isArtifactPanelOpen?: boolean
  /** Callback when artifact panel toggle is requested */
  onArtifactPanelToggle?: () => void
  /** Callback when artifact is selected */
  onArtifactSelect?: (artifactId: Id<"artifacts">, opts?: { readOnly?: boolean; sourceConversationId?: Id<"conversations">; title?: string; type?: string }) => void
  /** Currently active artifact in panel */
  activeArtifactId?: Id<"artifacts"> | null
  /** Artifact panel content (passed from parent) */
  artifactPanel?: ReactNode
  /** Number of artifacts (for header badge) */
  artifactCount?: number
  /** Mobile sidebar open state (controlled) */
  mobileSidebarOpen?: boolean
  /** Mobile sidebar open state change (controlled) */
  onMobileSidebarOpenChange?: (open: boolean) => void
}

// Default dimensions
const DEFAULT_SIDEBAR_WIDTH = 280
const DEFAULT_PANEL_WIDTH = 480
const MIN_SIDEBAR_WIDTH = 180
const MIN_PANEL_WIDTH = 280
const COLLAPSE_THRESHOLD = 100
const MIN_MAIN_CONTENT_WIDTH = 640
const ACTIVITY_BAR_WIDTH = 48
const RESIZER_WIDTH = 2

// CSS Variables for dimensions (can be overridden)
const CSS_VARS = {
  "--activity-bar-width": "48px",
  "--sidebar-width": `${DEFAULT_SIDEBAR_WIDTH}px`,
  "--sidebar-min-width": `${MIN_SIDEBAR_WIDTH}px`,
  "--sidebar-max-width": "50%",
  "--panel-width": `${DEFAULT_PANEL_WIDTH}px`,
  "--panel-min-width": `${MIN_PANEL_WIDTH}px`,
  "--panel-max-width": "50%",
  "--shell-footer-h": "0px",
} as React.CSSProperties

export function ChatLayout({
  conversationId,
  children,
  isArtifactPanelOpen = false,
  onArtifactPanelToggle,
  onArtifactSelect,
  activeArtifactId,
  artifactPanel,
  artifactCount = 0,
  mobileSidebarOpen,
  onMobileSidebarOpenChange,
}: ChatLayoutProps) {
  const router = useRouter()
  const [workspacePanelMode, setWorkspacePanelMode] = useState<
    "conversation-manager" | "paper-sessions-manager" | null
  >(null)
  const preservedArtifactRef = useRef<{
    wasOpen: boolean
    artifactId: Id<"artifacts"> | null
  }>({
    wasOpen: false,
    artifactId: null,
  })

  // Layout state
  const [activePanel, setActivePanel] = useState<PanelType>("chat-history")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [internalMobileOpen, setInternalMobileOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)

  const isMobileOpen = mobileSidebarOpen ?? internalMobileOpen
  const setIsMobileOpen = onMobileSidebarOpenChange ?? setInternalMobileOpen
  const isConversationManagerOpen = workspacePanelMode === "conversation-manager"
  const isWorkspacePanelOpen = workspacePanelMode !== null
  const activeRightPanelMode =
    workspacePanelMode ?? (isArtifactPanelOpen ? "artifact" : null)
  const isRightPanelOpen = activeRightPanelMode !== null

  // Conversations hook
  const {
    conversations,
    totalConversationCount,
    createNewConversation,
    deleteConversation,
    updateConversationTitle,
    isLoading,
  } = useConversations()

  // Auto-collapse sidebar in empty state, auto-expand when conversation is active
  useEffect(() => {
    if (conversationId === null) {
      // Empty state: collapse sidebar to focus on welcome screen
      setIsSidebarCollapsed(true)
    } else {
      // Active conversation: expand sidebar to show context
      setIsSidebarCollapsed(false)
    }
  }, [conversationId])

  useEffect(() => {
    if (typeof window === "undefined") return
    const media = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsMobileViewport(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  useEffect(() => {
    if (!isWorkspacePanelOpen || !isArtifactPanelOpen) return

    const preservedArtifact = preservedArtifactRef.current
    if (!preservedArtifact.wasOpen) {
      setWorkspacePanelMode(null)
      return
    }

    if (activeArtifactId && activeArtifactId !== preservedArtifact.artifactId) {
      setWorkspacePanelMode(null)
    }
  }, [activeArtifactId, isArtifactPanelOpen, isWorkspacePanelOpen])

  useEffect(() => {
    if (!isWorkspacePanelOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWorkspacePanelMode(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isWorkspacePanelOpen])

  // Sidebar max width — derived from MIN_MAIN_CONTENT_WIDTH guarantee
  const getSidebarMaxWidth = useCallback(() => {
    if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH
    const resizerLeft = RESIZER_WIDTH
    const resizerRight = isRightPanelOpen ? RESIZER_WIDTH : 0
    const currentPanel = isRightPanelOpen ? panelWidth : 0
    const available =
      window.innerWidth - ACTIVITY_BAR_WIDTH - resizerLeft - resizerRight - currentPanel - MIN_MAIN_CONTENT_WIDTH
    return Math.max(MIN_SIDEBAR_WIDTH, available)
  }, [isRightPanelOpen, panelWidth])

  // Panel max width — considers sidebar width and guarantees min main content
  const getPanelMaxWidth = useCallback(() => {
    if (typeof window === "undefined") return 600
    const resizerLeft = isSidebarCollapsed ? 0 : RESIZER_WIDTH
    const resizerRight = RESIZER_WIDTH
    const currentSidebar = isSidebarCollapsed ? 0 : sidebarWidth
    const available =
      window.innerWidth - ACTIVITY_BAR_WIDTH - resizerLeft - resizerRight - currentSidebar - MIN_MAIN_CONTENT_WIDTH
    return Math.max(MIN_PANEL_WIDTH, available)
  }, [isSidebarCollapsed, sidebarWidth])

  // Auto-clamp sidebar when artifact panel opens or resizes
  useEffect(() => {
    if (typeof window === "undefined" || isSidebarCollapsed) return
    const maxSidebar = getSidebarMaxWidth()
    if (sidebarWidth > maxSidebar) {
      setSidebarWidth(maxSidebar)
    }
  }, [isRightPanelOpen, panelWidth, getSidebarMaxWidth, sidebarWidth, isSidebarCollapsed])

  // Auto-clamp panel when sidebar expands or resizes
  useEffect(() => {
    if (typeof window === "undefined" || !isRightPanelOpen) return
    const maxPanel = getPanelMaxWidth()
    if (panelWidth > maxPanel) {
      setPanelWidth(maxPanel)
    }
  }, [isSidebarCollapsed, sidebarWidth, getPanelMaxWidth, panelWidth, isRightPanelOpen])

  // Sidebar resize handler
  const handleSidebarResize = useCallback(
    (delta: number) => {
      setSidebarWidth((prev) => {
        const newWidth = prev + delta
        const maxWidth = getSidebarMaxWidth()

        // Check collapse threshold
        if (newWidth < COLLAPSE_THRESHOLD) {
          setIsSidebarCollapsed(true)
          return MIN_SIDEBAR_WIDTH
        }

        // Always sync collapse state — avoids stale closure reads
        setIsSidebarCollapsed(false)

        // Clamp to min/max
        return Math.max(MIN_SIDEBAR_WIDTH, Math.min(newWidth, maxWidth))
      })
    },
    [getSidebarMaxWidth]
  )

  // Panel resize handler
  const handlePanelResize = useCallback(
    (delta: number) => {
      setPanelWidth((prev) => {
        const newWidth = prev + delta
        const maxWidth = getPanelMaxWidth()

        // Clamp to min/max
        return Math.max(MIN_PANEL_WIDTH, Math.min(newWidth, maxWidth))
      })
    },
    [getPanelMaxWidth]
  )

  // Reset sidebar to default
  const handleSidebarReset = useCallback(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
    setIsSidebarCollapsed(false)
  }, [])

  // Reset panel to default
  const handlePanelReset = useCallback(() => {
    setPanelWidth(DEFAULT_PANEL_WIDTH)
  }, [])

  // Sidebar toggle handler
  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev)
  }, [])

  // Panel change handler - auto expand sidebar if collapsed
  const handlePanelChange = useCallback(
    (panel: PanelType) => {
      setActivePanel(panel)
      // Auto-expand sidebar if it was collapsed
      if (isSidebarCollapsed) {
        setIsSidebarCollapsed(false)
      }
    },
    [isSidebarCollapsed]
  )

  // New chat handler - create conversation and redirect
  const handleNewChat = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
      const newId = await createNewConversation()
      if (newId) {
        router.push(`/chat/${newId}`)
      }
    } finally {
      setIsCreating(false)
    }
  }

  // Delete conversation handler
  const handleDeleteConversation = async (id: string) => {
    // Delete from database
    await deleteConversation(id as Id<"conversations">)
    // If we deleted current conversation, navigate away
    if (conversationId === id) {
      router.push("/chat")
    }
  }

  // Update conversation title handler
  const handleUpdateConversationTitle = async (
    id: Id<"conversations">,
    title: string
  ) => {
    await updateConversationTitle(id, title)
  }

  // Handle panel expand
  const handleExpandPanel = useCallback(() => {
    if (isWorkspacePanelOpen) {
      setWorkspacePanelMode(null)
      if (!isArtifactPanelOpen && onArtifactPanelToggle) {
        onArtifactPanelToggle()
      }
      return
    }
    if (onArtifactPanelToggle) {
      onArtifactPanelToggle()
    }
  }, [isArtifactPanelOpen, isWorkspacePanelOpen, onArtifactPanelToggle])

  const handleOpenConversationManager = useCallback(() => {
    preservedArtifactRef.current = {
      wasOpen: isArtifactPanelOpen,
      artifactId: activeArtifactId ?? null,
    }
    setWorkspacePanelMode("conversation-manager")
  }, [activeArtifactId, isArtifactPanelOpen])

  const handleOpenPaperSessionsManager = useCallback(() => {
    preservedArtifactRef.current = {
      wasOpen: isArtifactPanelOpen,
      artifactId: activeArtifactId ?? null,
    }
    setWorkspacePanelMode("paper-sessions-manager")
  }, [activeArtifactId, isArtifactPanelOpen])

  const handleCloseConversationManager = useCallback(() => {
    setWorkspacePanelMode(null)
  }, [])

  const handleClosePaperSessionsManager = useCallback(() => {
    setWorkspacePanelMode(null)
  }, [])

  // Dynamic grid columns based on collapsed state and resizing
  const getGridTemplateColumns = () => {
    const activityBar = "var(--activity-bar-width)"
    const sidebar = isSidebarCollapsed ? "0px" : `${sidebarWidth}px`
    const leftResizer = isSidebarCollapsed ? "0px" : `${RESIZER_WIDTH}px`
    const main = "1fr"
    const rightResizer = isRightPanelOpen ? `${RESIZER_WIDTH}px` : "0px"
    const panel = isRightPanelOpen ? `${panelWidth}px` : "0px"

    return `${activityBar} ${sidebar} ${leftResizer} ${main} ${rightResizer} ${panel}`
  }

  const chatInlinePadding = !isSidebarCollapsed && isRightPanelOpen
    ? "max(3rem, calc((100% - var(--chat-main-content-max-width)) / 2))"
    : "max(1rem, calc((100% - var(--chat-main-content-max-width)) / 2))"

  return (
    <div
      className="flex flex-col h-dvh"
      style={CSS_VARS as React.CSSProperties}
    >
      {/* ═══════════════════════════════════════════════════════
          MOBILE LAYOUT (< md) — simple single-column flex
          No CSS Grid, no ActivityBar, no TopBar, no side panels.
          Sidebar accessible via Sheet drawer only.
         ═══════════════════════════════════════════════════════ */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden md:hidden bg-[var(--chat-background)]">
        {children}
      </div>

      {/* ═══════════════════════════════════════════════════════
          DESKTOP LAYOUT (≥ md) — 6-column CSS Grid
          ActivityBar | Sidebar | Resizer | Main | Resizer | Panel
         ═══════════════════════════════════════════════════════ */}
      <div
        data-testid="chat-layout"
        className={cn(
          "hidden md:grid flex-1 min-h-0 overflow-hidden",
          "transition-[grid-template-columns] duration-300 ease-in-out",
          isSidebarCollapsed && "sidebar-collapsed",
          !isRightPanelOpen && "panel-collapsed"
        )}
        style={{
          gridTemplateColumns: getGridTemplateColumns(),
          "--chat-main-content-max-width": "760px",
          "--chat-input-pad-x": chatInlinePadding,
        } as React.CSSProperties}
      >
        {/* Column 1: Activity Bar */}
        <ActivityBar
          activePanel={activePanel}
          onPanelChange={handlePanelChange}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />

        {/* Column 2: Sidebar */}
        <aside
          className={cn(
            "flex flex-col overflow-hidden bg-[var(--chat-accent)]",
            isSidebarCollapsed && "w-0"
          )}
        >
          <ChatSidebar
            activePanel={activePanel}
            conversations={conversations}
            totalConversationCount={totalConversationCount}
            currentConversationId={conversationId}
            onNewChat={handleNewChat}
            onDeleteConversation={handleDeleteConversation}
            onUpdateConversationTitle={handleUpdateConversationTitle}
            onArtifactSelect={onArtifactSelect}
            activeArtifactId={activeArtifactId}
            isArtifactPanelOpen={isArtifactPanelOpen}
            onArtifactPanelToggle={onArtifactPanelToggle}
            isLoading={isLoading}
            isCreating={isCreating}
            onCollapseSidebar={handleToggleSidebar}
            onOpenConversationManager={handleOpenConversationManager}
            onOpenPaperSessionsManager={handleOpenPaperSessionsManager}
          />
        </aside>

        {/* Column 3: Left Resizer */}
        {!isSidebarCollapsed ? (
          <PanelResizer
            position="left"
            onResize={handleSidebarResize}
            onDoubleClick={handleSidebarReset}
          />
        ) : (
          <div />
        )}

        {/* Column 4: Main Content */}
        <main className="flex flex-col overflow-hidden bg-[var(--chat-background)]">
          <TopBar
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
            isPanelCollapsed={activeRightPanelMode !== "artifact"}
            onTogglePanel={handleExpandPanel}
            artifactCount={artifactCount}
          />
          <div className="flex-1 overflow-hidden">{children}</div>
        </main>

        {/* Column 5: Right Resizer */}
        {isRightPanelOpen ? (
          <PanelResizer
            position="right"
            onResize={handlePanelResize}
            onDoubleClick={handlePanelReset}
          />
        ) : (
          <div />
        )}

        {/* Column 6: Right Workspace Panel */}
        <aside
          className={cn(
            "flex flex-col overflow-hidden",
            "border-l border-[color:var(--chat-border)] bg-[var(--chat-card)]",
            !isRightPanelOpen && "w-0 border-l-0"
          )}
        >
          {activeRightPanelMode === "conversation-manager" ? (
            <ConversationManagerPanel
              currentConversationId={conversationId}
              onClose={handleCloseConversationManager}
            />
          ) : activeRightPanelMode === "paper-sessions-manager" ? (
            <PaperSessionsManagerPanel
              currentConversationId={conversationId}
              onClose={handleClosePaperSessionsManager}
              onArtifactSelect={onArtifactSelect}
            />
          ) : (
            artifactPanel
          )}
        </aside>
      </div>

      {/* Mobile Sidebar Sheet */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-[300px] [&>button]:hidden" data-chat-scope="">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <ChatSidebar
            className="w-full border-none"
            activePanel={activePanel}
            conversations={conversations}
            totalConversationCount={totalConversationCount}
            currentConversationId={conversationId}
            onNewChat={handleNewChat}
            onDeleteConversation={handleDeleteConversation}
            onUpdateConversationTitle={handleUpdateConversationTitle}
            onArtifactSelect={onArtifactSelect}
            activeArtifactId={activeArtifactId}
            isArtifactPanelOpen={isArtifactPanelOpen}
            onArtifactPanelToggle={onArtifactPanelToggle}
            onCloseMobile={() => setIsMobileOpen(false)}
            isLoading={isLoading}
            isCreating={isCreating}
            onPanelChange={handlePanelChange}
          />
        </SheetContent>
      </Sheet>

      <Sheet open={isMobileViewport && isConversationManagerOpen} onOpenChange={(open) => {
        if (!open) {
          handleCloseConversationManager()
        }
      }}>
        <SheetContent
          side="right"
          className="md:hidden w-[92vw] max-w-[420px] p-0 [&>[data-slot='sheet-close']]:hidden"
          data-chat-scope=""
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Kelola Percakapan</SheetTitle>
          </SheetHeader>
          <ConversationManagerPanel
            currentConversationId={conversationId}
            onClose={handleCloseConversationManager}
          />
        </SheetContent>
      </Sheet>

    </div>
  )
}
