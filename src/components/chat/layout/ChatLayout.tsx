"use client"

import { useState, useCallback, useEffect, type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { usePathname } from "next/navigation"
import { ActivityBar, type PanelType } from "../shell/ActivityBar"
import { ShellHeader } from "../shell/ShellHeader"
import { ChatTabs } from "../shell/ChatTabs"
import { ChatSidebar } from "../ChatSidebar"
import { PanelResizer } from "./PanelResizer"
import { useConversations } from "@/lib/hooks/useConversations"
import { useTabState } from "@/lib/hooks/useTabState"
import { useRouter } from "next/navigation"
import { Id } from "../../../../convex/_generated/dataModel"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

/**
 * ChatLayout - 6-column CSS Grid orchestrator
 *
 * Grid structure:
 * - Column 1: Activity Bar (48px fixed)
 * - Column 2: Sidebar (280px default, resizable)
 * - Column 3: Resizer (4px)
 * - Column 4: Main Content (1fr)
 * - Column 5: Resizer (4px)
 * - Column 6: Panel (360px default, resizable)
 *
 * Grid rows:
 * - Row 1: Header (72px) - spans all columns
 * - Row 2: Content (1fr) - all content area
 *
 * Constraints:
 * - Sidebar: min 180px, max 50% viewport
 * - Panel: min 280px, max 50% viewport
 * - Collapse threshold: 100px
 */

interface ChatLayoutProps {
  conversationId: string | null
  children: ReactNode
  /** Currently selected artifact ID for panel */
  selectedArtifactId?: Id<"artifacts"> | null
  /** Whether artifact panel is open */
  isArtifactPanelOpen?: boolean
  /** Callback when artifact panel toggle is requested */
  onArtifactPanelToggle?: () => void
  /** Callback when artifact is selected */
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
  /** Artifact panel content (passed from parent) */
  artifactPanel?: ReactNode
  /** Number of artifacts (for header badge) */
  artifactCount?: number
}

// Default dimensions
const DEFAULT_SIDEBAR_WIDTH = 280
const DEFAULT_PANEL_WIDTH = 360
const MIN_SIDEBAR_WIDTH = 180
const MIN_PANEL_WIDTH = 280
const COLLAPSE_THRESHOLD = 100

// CSS Variables for dimensions (can be overridden)
const CSS_VARS = {
  "--activity-bar-width": "48px",
  "--sidebar-width": `${DEFAULT_SIDEBAR_WIDTH}px`,
  "--sidebar-min-width": `${MIN_SIDEBAR_WIDTH}px`,
  "--sidebar-max-width": "50%",
  "--panel-width": `${DEFAULT_PANEL_WIDTH}px`,
  "--panel-min-width": `${MIN_PANEL_WIDTH}px`,
  "--panel-max-width": "50%",
  "--header-height": "72px",
  "--tab-bar-height": "36px",
  "--shell-footer-h": "0px",
} as React.CSSProperties

export function ChatLayout({
  conversationId,
  children,
  selectedArtifactId,
  isArtifactPanelOpen = false,
  onArtifactPanelToggle,
  onArtifactSelect,
  artifactPanel,
  artifactCount = 0,
}: ChatLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()

  // Layout state
  const [activePanel, setActivePanel] = useState<PanelType>("chat-history")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [isSidebarResizing, setIsSidebarResizing] = useState(false)
  const [isPanelResizing, setIsPanelResizing] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  // Tab state management
  const {
    tabs,
    activeTabId,
    openTab,
    closeTab,
    closeAllTabs,
    setActiveTab,
    updateTabTitle,
  } = useTabState(pathname)

  // Conversations hook
  const {
    conversations,
    createNewConversation,
    deleteConversation,
    updateConversationTitle,
    isLoading,
  } = useConversations()

  // Auto-open tab when conversation changes
  useEffect(() => {
    if (conversationId && conversations) {
      const conversation = conversations.find((c) => c._id === conversationId)
      if (conversation) {
        // For now, default to "chat" type. Paper session detection can be added later.
        // TODO: Check if conversation has associated paper session to set type as "paper"
        const tabType = "chat" as const
        openTab(conversationId, conversation.title || "New Chat", tabType)
      }
    }
  }, [conversationId, conversations, openTab])

  // Calculate max width (50% of viewport)
  const getMaxWidth = useCallback(() => {
    if (typeof window === "undefined") return 600
    return window.innerWidth * 0.5
  }, [])

  // Sidebar resize handler
  const handleSidebarResize = useCallback(
    (delta: number) => {
      setSidebarWidth((prev) => {
        const newWidth = prev + delta
        const maxWidth = getMaxWidth()

        // Check collapse threshold
        if (newWidth < COLLAPSE_THRESHOLD) {
          setIsSidebarCollapsed(true)
          return MIN_SIDEBAR_WIDTH
        }

        // Ensure not collapsed
        if (isSidebarCollapsed && newWidth >= COLLAPSE_THRESHOLD) {
          setIsSidebarCollapsed(false)
        }

        // Clamp to min/max
        return Math.max(MIN_SIDEBAR_WIDTH, Math.min(newWidth, maxWidth))
      })
    },
    [getMaxWidth, isSidebarCollapsed]
  )

  // Panel resize handler
  const handlePanelResize = useCallback(
    (delta: number) => {
      setPanelWidth((prev) => {
        const newWidth = prev + delta
        const maxWidth = getMaxWidth()

        // Clamp to min/max
        return Math.max(MIN_PANEL_WIDTH, Math.min(newWidth, maxWidth))
      })
    },
    [getMaxWidth]
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

  // New chat handler
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
    // Close tab if open
    closeTab(id)
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
    // Update tab title if open
    updateTabTitle(id, title)
  }

  // Tab change handler (navigate to conversation)
  const handleTabChange = useCallback(
    (tabId: string) => {
      setActiveTab(tabId)
    },
    [setActiveTab]
  )

  // Tab close handler
  const handleTabClose = useCallback(
    (tabId: string) => {
      closeTab(tabId)
    },
    [closeTab]
  )

  // Handle panel expand
  const handleExpandPanel = useCallback(() => {
    if (onArtifactPanelToggle) {
      onArtifactPanelToggle()
    }
  }, [onArtifactPanelToggle])

  // Dynamic grid columns based on collapsed state and resizing
  const getGridTemplateColumns = () => {
    const activityBar = "var(--activity-bar-width)"
    const sidebar = isSidebarCollapsed ? "0px" : `${sidebarWidth}px`
    const leftResizer = isSidebarCollapsed ? "0px" : "4px"
    const main = "1fr"
    const rightResizer = isArtifactPanelOpen ? "4px" : "0px"
    const panel = isArtifactPanelOpen ? `${panelWidth}px` : "0px"

    return `${activityBar} ${sidebar} ${leftResizer} ${main} ${rightResizer} ${panel}`
  }

  return (
    <div
      data-testid="chat-layout"
      className={cn(
        "grid h-[calc(100dvh-var(--shell-footer-h))]",
        // Disable transition during resize for smooth dragging
        !isSidebarResizing &&
          !isPanelResizing &&
          "transition-[grid-template-columns] duration-300 ease-in-out",
        isSidebarCollapsed && "sidebar-collapsed",
        !isArtifactPanelOpen && "panel-collapsed"
      )}
      style={{
        ...CSS_VARS,
        gridTemplateColumns: getGridTemplateColumns(),
        gridTemplateRows: "var(--header-height) 1fr",
      }}
    >
      {/* Row 1: Header (spans all columns) */}
      <ShellHeader
        isPanelCollapsed={!isArtifactPanelOpen}
        onExpandPanel={handleExpandPanel}
        artifactCount={artifactCount}
      />

      {/* Row 2, Column 1: Activity Bar */}
      <ActivityBar
        activePanel={activePanel}
        onPanelChange={handlePanelChange}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* Row 2, Column 2: Sidebar */}
      <aside
        className={cn(
          "flex flex-col border-r bg-sidebar overflow-hidden",
          "hidden md:flex",
          isSidebarCollapsed && "w-0 border-r-0"
        )}
      >
        <ChatSidebar
          activePanel={activePanel}
          conversations={conversations}
          currentConversationId={conversationId}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onUpdateConversationTitle={handleUpdateConversationTitle}
          isLoading={isLoading}
          isCreating={isCreating}
        />
      </aside>

      {/* Row 2, Column 3: Left Resizer (Sidebar-Main) */}
      {!isSidebarCollapsed && (
        <PanelResizer
          position="left"
          onResize={handleSidebarResize}
          onDoubleClick={handleSidebarReset}
          isDragging={isSidebarResizing}
          className="hidden md:flex"
        />
      )}
      {isSidebarCollapsed && <div className="hidden md:block" />}

      {/* Row 2, Column 4: Main Content (with ChatTabs) */}
      <main className="flex flex-col overflow-hidden bg-chat-background">
        {/* Chat Tabs Bar */}
        <ChatTabs
          tabs={tabs}
          activeTabId={activeTabId}
          onTabChange={handleTabChange}
          onTabClose={handleTabClose}
          onCloseAll={closeAllTabs}
        />

        {/* Main Chat Content */}
        <div className="flex-1 overflow-hidden">{children}</div>
      </main>

      {/* Row 2, Column 5: Right Resizer (Main-Panel) */}
      {isArtifactPanelOpen && (
        <PanelResizer
          position="right"
          onResize={handlePanelResize}
          onDoubleClick={handlePanelReset}
          isDragging={isPanelResizing}
          className="hidden md:flex"
        />
      )}
      {!isArtifactPanelOpen && <div className="hidden md:block" />}

      {/* Row 2, Column 6: Artifact Panel */}
      <aside
        className={cn(
          "hidden md:flex flex-col overflow-hidden",
          "border-l bg-card",
          !isArtifactPanelOpen && "w-0 border-l-0"
        )}
      >
        {artifactPanel}
      </aside>

      {/* Mobile Sidebar (Sheet) */}
      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="p-0 w-[300px]">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <ChatSidebar
            className="w-full border-none"
            activePanel={activePanel}
            conversations={conversations}
            currentConversationId={conversationId}
            onNewChat={handleNewChat}
            onDeleteConversation={handleDeleteConversation}
            onUpdateConversationTitle={handleUpdateConversationTitle}
            onCloseMobile={() => setIsMobileOpen(false)}
            isLoading={isLoading}
            isCreating={isCreating}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}

export default ChatLayout
