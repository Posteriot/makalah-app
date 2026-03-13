"use client"

import { useState, useCallback, useEffect, type ReactElement, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { PanelResizer } from "@/components/ui/PanelResizer"
import { cn } from "@/lib/utils"
import { ChatSidebar } from "../ChatSidebar"
import { ActivityBar, type PanelType } from "../shell/ActivityBar"
import { TopBar } from "../shell/TopBar"
import { useConversations } from "@/lib/hooks/useConversations"
import { Id } from "../../../../convex/_generated/dataModel"
import type { ArtifactOpenOptions } from "@/lib/hooks/useArtifactTabs"

interface ChatLayoutProps {
  conversationId: string | null
  children: ReactNode
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onArtifactSelect?: (artifactId: Id<"artifacts">, opts?: ArtifactOpenOptions) => void
  activeArtifactId?: Id<"artifacts"> | null
  artifactPanel?: ReactElement
  artifactCount?: number
  mobileSidebarOpen?: boolean
  onMobileSidebarOpenChange?: (open: boolean) => void
}

const DEFAULT_SIDEBAR_WIDTH = 280
const DEFAULT_PANEL_WIDTH = 480
const MIN_SIDEBAR_WIDTH = 180
const MIN_PANEL_WIDTH = 280
const COLLAPSE_THRESHOLD = 100
const MIN_MAIN_CONTENT_WIDTH = 640
const ACTIVITY_BAR_WIDTH = 48
const RESIZER_WIDTH = 2

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
  const [activePanel, setActivePanel] = useState<PanelType>("chat-history")
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_SIDEBAR_WIDTH)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [internalMobileOpen, setInternalMobileOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const isMobileOpen = mobileSidebarOpen ?? internalMobileOpen
  const setIsMobileOpen = onMobileSidebarOpenChange ?? setInternalMobileOpen
  const isRightPanelOpen = isArtifactPanelOpen

  const {
    conversations,
    totalConversationCount,
    createNewConversation,
    deleteConversation,
    bulkDeleteConversations,
    deleteAllConversations,
    updateConversationTitle,
    isLoading,
    hasMore,
    loadMore,
  } = useConversations()

  useEffect(() => {
    setIsSidebarCollapsed(conversationId === null)
  }, [conversationId])

  const getSidebarMaxWidth = useCallback(() => {
    if (typeof window === "undefined") return DEFAULT_SIDEBAR_WIDTH
    const resizerLeft = RESIZER_WIDTH
    const resizerRight = isRightPanelOpen ? RESIZER_WIDTH : 0
    const currentPanel = isRightPanelOpen ? panelWidth : 0
    const available =
      window.innerWidth -
      ACTIVITY_BAR_WIDTH -
      resizerLeft -
      resizerRight -
      currentPanel -
      MIN_MAIN_CONTENT_WIDTH
    return Math.max(MIN_SIDEBAR_WIDTH, available)
  }, [isRightPanelOpen, panelWidth])

  const getPanelMaxWidth = useCallback(() => {
    if (typeof window === "undefined") return DEFAULT_PANEL_WIDTH
    const resizerLeft = isSidebarCollapsed ? 0 : RESIZER_WIDTH
    const resizerRight = RESIZER_WIDTH
    const currentSidebar = isSidebarCollapsed ? 0 : sidebarWidth
    const available =
      window.innerWidth -
      ACTIVITY_BAR_WIDTH -
      resizerLeft -
      resizerRight -
      currentSidebar -
      MIN_MAIN_CONTENT_WIDTH
    return Math.max(MIN_PANEL_WIDTH, available)
  }, [isSidebarCollapsed, sidebarWidth])

  useEffect(() => {
    if (typeof window === "undefined" || isSidebarCollapsed) return
    const maxSidebar = getSidebarMaxWidth()
    if (sidebarWidth > maxSidebar) {
      setSidebarWidth(maxSidebar)
    }
  }, [getSidebarMaxWidth, isSidebarCollapsed, isRightPanelOpen, panelWidth, sidebarWidth])

  useEffect(() => {
    if (typeof window === "undefined" || !isRightPanelOpen) return
    const maxPanel = getPanelMaxWidth()
    if (panelWidth > maxPanel) {
      setPanelWidth(maxPanel)
    }
  }, [getPanelMaxWidth, isRightPanelOpen, isSidebarCollapsed, panelWidth, sidebarWidth])

  const handleSidebarResize = useCallback((delta: number) => {
    setSidebarWidth((prev) => {
      const nextWidth = prev + delta
      const maxWidth = getSidebarMaxWidth()

      if (nextWidth < COLLAPSE_THRESHOLD) {
        setIsSidebarCollapsed(true)
        return MIN_SIDEBAR_WIDTH
      }

      setIsSidebarCollapsed(false)
      return Math.max(MIN_SIDEBAR_WIDTH, Math.min(nextWidth, maxWidth))
    })
  }, [getSidebarMaxWidth])

  const handlePanelResize = useCallback((delta: number) => {
    setPanelWidth((prev) => {
      const nextWidth = prev + delta
      const maxWidth = getPanelMaxWidth()
      return Math.max(MIN_PANEL_WIDTH, Math.min(nextWidth, maxWidth))
    })
  }, [getPanelMaxWidth])

  const handleSidebarReset = useCallback(() => {
    setSidebarWidth(DEFAULT_SIDEBAR_WIDTH)
    setIsSidebarCollapsed(false)
  }, [])

  const handlePanelReset = useCallback(() => {
    setPanelWidth(DEFAULT_PANEL_WIDTH)
  }, [])

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarCollapsed((prev) => !prev)
  }, [])

  const handlePanelChange = useCallback((panel: PanelType) => {
    setActivePanel(panel)
    if (isSidebarCollapsed) {
      setIsSidebarCollapsed(false)
    }
  }, [isSidebarCollapsed])

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

  const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id as Id<"conversations">)
    if (conversationId === id) {
      router.push("/chat")
    }
  }

  const handleDeleteConversations = async (ids: Id<"conversations">[]) => {
    await bulkDeleteConversations(ids)
    if (conversationId && ids.some((id) => String(id) === conversationId)) {
      router.push("/chat")
    }
  }

  const handleDeleteAllConversations = async () => {
    await deleteAllConversations()
    if (conversationId) {
      router.push("/chat")
    }
  }

  const handleUpdateConversationTitle = async (
    id: Id<"conversations">,
    title: string
  ) => {
    await updateConversationTitle(id, title)
  }

  const getGridTemplateColumns = () => {
    const activityBar = "var(--activity-bar-width)"
    const sidebar = isSidebarCollapsed ? "0px" : `${sidebarWidth}px`
    const leftResizer = isSidebarCollapsed ? "0px" : `${RESIZER_WIDTH}px`
    const main = "1fr"
    const rightResizer = isRightPanelOpen ? `${RESIZER_WIDTH}px` : "0px"
    const panel = isRightPanelOpen ? `${panelWidth}px` : "0px"
    return `${activityBar} ${sidebar} ${leftResizer} ${main} ${rightResizer} ${panel}`
  }

  const chatInlinePadding =
    !isSidebarCollapsed && isRightPanelOpen
      ? "max(3rem, calc((100% - var(--chat-main-content-max-width)) / 2))"
      : "max(1rem, calc((100% - var(--chat-main-content-max-width)) / 2))"

  return (
    <div className="flex h-dvh flex-col" style={CSS_VARS as React.CSSProperties}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--chat-background)] md:hidden">
        {children}
      </div>

      <div
        data-testid="chat-layout"
        className={cn(
          "hidden min-h-0 flex-1 overflow-hidden md:grid",
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
        <ActivityBar
          activePanel={activePanel}
          onPanelChange={handlePanelChange}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
        />

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
            onDeleteConversations={handleDeleteConversations}
            onDeleteAllConversations={handleDeleteAllConversations}
            onUpdateConversationTitle={handleUpdateConversationTitle}
            onArtifactSelect={onArtifactSelect}
            activeArtifactId={activeArtifactId}
            isArtifactPanelOpen={isArtifactPanelOpen}
            onArtifactPanelToggle={onArtifactPanelToggle}
            isLoading={isLoading}
            hasMoreConversations={hasMore}
            onLoadMoreConversations={loadMore}
            isCreating={isCreating}
            onCollapseSidebar={handleToggleSidebar}
          />
        </aside>

        {!isSidebarCollapsed ? (
          <PanelResizer
            position="left"
            onResize={handleSidebarResize}
            onDoubleClick={handleSidebarReset}
          />
        ) : (
          <div />
        )}

        <main className="flex flex-col overflow-hidden bg-[var(--chat-background)]">
          <TopBar
            isSidebarCollapsed={isSidebarCollapsed}
            onToggleSidebar={handleToggleSidebar}
            artifactCount={artifactCount}
          />
          <div className="flex-1 overflow-hidden">{children}</div>
        </main>

        {isRightPanelOpen ? (
          <PanelResizer
            position="right"
            onResize={handlePanelResize}
            onDoubleClick={handlePanelReset}
          />
        ) : (
          <div />
        )}

        <aside
          className={cn(
            "flex flex-col overflow-hidden border-l border-[color:var(--chat-border)] bg-[var(--chat-card)]",
            !isRightPanelOpen && "w-0 border-l-0"
          )}
        >
          {artifactPanel}
        </aside>
      </div>

      <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
        <SheetContent side="left" className="w-[300px] p-0 [&>button]:hidden" data-chat-scope="">
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
            onDeleteConversations={handleDeleteConversations}
            onDeleteAllConversations={handleDeleteAllConversations}
            onUpdateConversationTitle={handleUpdateConversationTitle}
            onArtifactSelect={onArtifactSelect}
            activeArtifactId={activeArtifactId}
            isArtifactPanelOpen={isArtifactPanelOpen}
            onArtifactPanelToggle={onArtifactPanelToggle}
            onCloseMobile={() => setIsMobileOpen(false)}
            isLoading={isLoading}
            hasMoreConversations={hasMore}
            onLoadMoreConversations={loadMore}
            isCreating={isCreating}
            onPanelChange={handlePanelChange}
          />
        </SheetContent>
      </Sheet>
    </div>
  )
}
