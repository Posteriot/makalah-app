"use client"

import { useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  ChatBubble,
  Page,
  GitBranch,
} from "iconoir-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Panel types for Activity Bar navigation
 */
export type PanelType = "chat-history" | "paper" | "progress"

interface ActivityBarProps {
  /** Currently active panel */
  activePanel: PanelType
  /** Callback when panel changes */
  onPanelChange: (panel: PanelType) => void
  /** Whether sidebar is collapsed */
  isSidebarCollapsed: boolean
  /** Callback to toggle sidebar */
  onToggleSidebar: () => void
}

interface ActivityBarItemProps {
  panel: PanelType
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
}

function ActivityBarItem({
  panel,
  icon,
  label,
  isActive,
  onClick,
}: ActivityBarItemProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-action border border-transparent transition-all duration-150",
            "text-[var(--chat-sidebar-foreground)] hover:bg-[var(--chat-sidebar-accent)] hover:text-[var(--chat-sidebar-accent-foreground)]",
            "focus-visible:ring-2 focus-visible:ring-muted-foreground/40 focus-visible:ring-offset-1 focus-visible:ring-offset-[color:var(--chat-sidebar)]",
            isActive &&
              "border-[color:var(--chat-sidebar-border)] bg-[var(--chat-sidebar-accent)] text-[var(--chat-sidebar-accent-foreground)]"
          )}
          onClick={onClick}
          aria-label={`${label} panel`}
          aria-pressed={isActive}
          aria-describedby={`activity-bar-item-${panel}-desc`}
          data-panel={panel}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8} id={`activity-bar-item-${panel}-desc`} className="font-mono text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * ActivityBar - Vertical navigation bar
 *
 * Located at the leftmost side of the chat layout (48px width).
 * Provides panel switching between:
 * 1. Chat History - List of conversations
 * 2. Paper Sessions - Paper session folders with artifacts
 * 3. Progress - Paper milestone timeline
 *
 * Accessibility:
 * - Uses role="navigation" with aria-label
 * - Each button has aria-label and aria-pressed
 * - Keyboard navigation with arrow keys
 * - Focus visible ring for keyboard users
 */
export function ActivityBar({
  activePanel,
  onPanelChange,
  isSidebarCollapsed,
  onToggleSidebar,
}: ActivityBarProps) {
  // Handle panel click - auto expand sidebar if collapsed
  const handlePanelClick = useCallback(
    (panel: PanelType) => {
      if (isSidebarCollapsed) {
        onToggleSidebar()
      }
      onPanelChange(panel)
    },
    [isSidebarCollapsed, onToggleSidebar, onPanelChange]
  )

  // Keyboard navigation for activity bar
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const panels: PanelType[] = ["chat-history", "paper", "progress"]
      const currentIndex = panels.indexOf(activePanel)

      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
          e.preventDefault()
          const nextIndex = (currentIndex + 1) % panels.length
          handlePanelClick(panels[nextIndex])
          // Focus the next button
          const nextButton = document.querySelector(
            `[data-panel="${panels[nextIndex]}"]`
          ) as HTMLElement
          nextButton?.focus()
          break
        case "ArrowUp":
        case "ArrowLeft":
          e.preventDefault()
          const prevIndex =
            currentIndex === 0 ? panels.length - 1 : currentIndex - 1
          handlePanelClick(panels[prevIndex])
          // Focus the previous button
          const prevButton = document.querySelector(
            `[data-panel="${panels[prevIndex]}"]`
          ) as HTMLElement
          prevButton?.focus()
          break
        case "Home":
          e.preventDefault()
          handlePanelClick(panels[0])
          const firstButton = document.querySelector(
            `[data-panel="${panels[0]}"]`
          ) as HTMLElement
          firstButton?.focus()
          break
        case "End":
          e.preventDefault()
          handlePanelClick(panels[panels.length - 1])
          const lastButton = document.querySelector(
            `[data-panel="${panels[panels.length - 1]}"]`
          ) as HTMLElement
          lastButton?.focus()
          break
      }
    },
    [activePanel, handlePanelClick]
  )

  const panelItems: Array<{
    panel: PanelType
    icon: React.ReactNode
    label: string
  }> = [
    {
      panel: "chat-history",
      icon: <ChatBubble className="h-5 w-5" aria-hidden="true" />,
      label: "Chat History",
    },
    {
      panel: "paper",
      icon: <Page className="h-5 w-5" aria-hidden="true" />,
      label: "Sesi paper",
    },
    {
      panel: "progress",
      icon: <GitBranch className="h-5 w-5" aria-hidden="true" />,
      label: "Linimasa progres",
    },
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <nav
        role="navigation"
        aria-label="Sidebar navigation"
        className={cn(
          "flex flex-col items-center gap-0 py-0",
          "w-[var(--activity-bar-width)] min-w-[48px]",
          "border-r border-[color:var(--chat-sidebar-border)] bg-[var(--chat-sidebar)]"
        )}
        data-testid="activity-bar"
        onKeyDown={handleKeyDown}
      >
        {/* Logo */}
        <Link
          href="/"
          className={cn(
            "flex items-center justify-center",
            "h-11 w-full rounded-none border-b border-[color:var(--chat-sidebar-border)]",
            "hover:bg-[var(--chat-sidebar-accent)] transition-colors"
          )}
          aria-label="Home"
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

        {/* Panel Navigation Items */}
        <div
          role="tablist"
          aria-label="Panel selection"
          aria-orientation="vertical"
          className="mt-3 flex flex-col items-center gap-1"
        >
          {panelItems.map((item) => (
            <ActivityBarItem
              key={item.panel}
              panel={item.panel}
              icon={item.icon}
              label={item.label}
              isActive={activePanel === item.panel}
              onClick={() => handlePanelClick(item.panel)}
            />
          ))}
        </div>
      </nav>
    </TooltipProvider>
  )
}
