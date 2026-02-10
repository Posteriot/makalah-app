"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import {
  ChatBubble,
  Page,
  Xmark,
  NavArrowLeft,
  NavArrowRight,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import type { Tab } from "@/lib/hooks/useTabState"

interface ChatTabsProps {
  /** Array of open tabs */
  tabs: Tab[]
  /** Currently active tab ID */
  activeTabId: string | null
  /** Callback when tab is clicked */
  onTabChange: (tabId: string) => void
  /** Callback when tab close button is clicked */
  onTabClose: (tabId: string) => void
  /** Callback when close all button is clicked */
  onCloseAll: () => void
}

/**
 * Get icon for tab type
 */
function getTabIcon(type: "chat" | "paper") {
  if (type === "paper") {
    return <Page className="h-4 w-4" aria-hidden="true" />
  }
  return <ChatBubble className="h-4 w-4" aria-hidden="true" />
}

/**
 * ChatTabs - VSCode-style tabs for conversation switching
 *
 * Features:
 * - Tab bar height: 36px
 * - Tab with title, close button (x), active state indicator
 * - Scrollable tabs with fade effects on edges
 * - Prev/next navigation buttons for overflow
 * - "Close all tabs" button
 *
 * Accessibility:
 * - Uses role="tablist" with proper aria attributes
 * - Keyboard navigation with arrow keys
 * - Focus visible ring for keyboard users
 * - Delete key to close active tab
 *
 * Note: Tabs are rendered as div elements (not buttons) to avoid nested button issue,
 * with close buttons as separate button elements inside.
 */
export function ChatTabs({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onCloseAll,
}: ChatTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [hasOverflowLeft, setHasOverflowLeft] = useState(false)
  const [hasOverflowRight, setHasOverflowRight] = useState(false)

  // Check for overflow and update fade states
  const checkOverflow = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const { scrollLeft, scrollWidth, clientWidth } = container
    setHasOverflowLeft(scrollLeft > 0)
    setHasOverflowRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

  // Check overflow on mount and resize
  useEffect(() => {
    checkOverflow()
    window.addEventListener("resize", checkOverflow)
    return () => window.removeEventListener("resize", checkOverflow)
  }, [checkOverflow, tabs])

  // Scroll navigation
  const scrollLeft = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.scrollBy({ left: -200, behavior: "smooth" })
  }, [])

  const scrollRight = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    container.scrollBy({ left: 200, behavior: "smooth" })
  }, [])

  // Handle tab click
  const handleTabClick = useCallback(
    (tabId: string) => {
      onTabChange(tabId)
    },
    [onTabChange]
  )

  // Handle close click (prevent event bubbling to tab click)
  const handleCloseClick = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation()
      onTabClose(tabId)
    },
    [onTabClose]
  )

  // Focus a tab element
  const focusTab = useCallback((tabId: string) => {
    const tabElement = tabRefs.current.get(tabId)
    tabElement?.focus()
  }, [])

  // Keyboard navigation for tabs
  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, tabId: string, index: number) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault()
          handleTabClick(tabId)
          break
        case "ArrowLeft":
          e.preventDefault()
          if (index > 0) {
            const prevTab = tabs[index - 1]
            handleTabClick(prevTab.id)
            focusTab(prevTab.id)
          }
          break
        case "ArrowRight":
          e.preventDefault()
          if (index < tabs.length - 1) {
            const nextTab = tabs[index + 1]
            handleTabClick(nextTab.id)
            focusTab(nextTab.id)
          }
          break
        case "Home":
          e.preventDefault()
          if (tabs.length > 0) {
            const firstTab = tabs[0]
            handleTabClick(firstTab.id)
            focusTab(firstTab.id)
          }
          break
        case "End":
          e.preventDefault()
          if (tabs.length > 0) {
            const lastTab = tabs[tabs.length - 1]
            handleTabClick(lastTab.id)
            focusTab(lastTab.id)
          }
          break
        case "Delete":
        case "Backspace":
          // Close tab with Delete or Backspace (common pattern)
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            onTabClose(tabId)
          }
          break
      }
    },
    [tabs, handleTabClick, focusTab, onTabClose]
  )

  // Don't render if no tabs
  if (tabs.length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-stretch",
        "h-9 min-h-[36px]",
        "bg-background border-b border-border/50",
        "flex-shrink-0"
      )}
      role="tablist"
      aria-label="Open conversations"
    >
      {/* Tabs Wrapper with fade effects */}
      <div
        className={cn(
          "flex-1 relative overflow-hidden",
          hasOverflowLeft && "before:opacity-100",
          hasOverflowRight && "after:opacity-100"
        )}
      >
        {/* Left fade gradient */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-8",
            "bg-gradient-to-r from-background to-transparent",
            "pointer-events-none z-10",
            "transition-opacity duration-150",
            hasOverflowLeft ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />

        {/* Right fade gradient */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-8",
            "bg-gradient-to-l from-background to-transparent",
            "pointer-events-none z-10",
            "transition-opacity duration-150",
            hasOverflowRight ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />

        {/* Scrollable tabs container */}
        <div
          ref={scrollContainerRef}
          onScroll={checkOverflow}
          className={cn(
            "flex items-stretch gap-0",
            "overflow-x-auto scrollbar-none",
            "scroll-smooth"
          )}
        >
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              ref={(el) => {
                if (el) {
                  tabRefs.current.set(tab.id, el)
                } else {
                  tabRefs.current.delete(tab.id)
                }
              }}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id, index)}
              role="tab"
              tabIndex={activeTabId === tab.id ? 0 : -1}
              aria-selected={activeTabId === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              className={cn(
                "group flex items-center gap-1.5",
                "px-3 h-[35px] rounded-t-[6px]",
                "bg-transparent border-b-2 border-transparent",
                "font-mono text-sm cursor-pointer",
                "transition-all duration-150",
                "hover:bg-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                // Responsive sizing
                "flex-1 min-w-[140px] max-w-[320px]",
                // Active state - Amber-500 underline per Mechanical Grace spec
                activeTabId === tab.id && "bg-card border-b-amber-500",
                // Separator line between tabs (except last)
                index < tabs.length - 1 &&
                  activeTabId !== tab.id &&
                  "relative after:absolute after:right-0 after:top-2 after:bottom-2 after:w-px after:bg-border"
              )}
            >
              {/* Tab icon */}
              <span
                className={cn(
                  "flex-shrink-0",
                  "text-muted-foreground",
                  activeTabId === tab.id && "text-primary"
                )}
              >
                {getTabIcon(tab.type)}
              </span>

              {/* Tab title */}
              <span
                className={cn(
                  "flex-1 truncate text-left",
                  "text-muted-foreground",
                  activeTabId === tab.id && "text-foreground"
                )}
              >
                {tab.title}
              </span>

              {/* Close button */}
              <button
                type="button"
                onClick={(e) => handleCloseClick(e, tab.id)}
                className={cn(
                  "flex items-center justify-center",
                  "w-[18px] h-[18px] rounded",
                  "text-muted-foreground flex-shrink-0",
                  "opacity-0 group-hover:opacity-100",
                  "hover:bg-destructive hover:text-white",
                  "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary",
                  "transition-all duration-150",
                  activeTabId === tab.id && "opacity-100"
                )}
                aria-label={`Close ${tab.title} tab`}
                tabIndex={-1}
              >
                <Xmark className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation buttons */}
      <div
        className="flex items-center gap-0.5 px-2 border-l border-border"
        role="group"
        aria-label="Tab navigation controls"
      >
        {/* Scroll left */}
        <button
          type="button"
          onClick={scrollLeft}
          disabled={!hasOverflowLeft}
          className={cn(
            "flex items-center justify-center",
            "w-6 h-6 rounded",
            "text-muted-foreground",
            "hover:bg-accent hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-primary",
            "disabled:opacity-30 disabled:cursor-not-allowed",
            "transition-colors duration-150"
          )}
          aria-label="Scroll tabs left"
        >
          <NavArrowLeft className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Scroll right */}
        <button
          type="button"
          onClick={scrollRight}
          disabled={!hasOverflowRight}
          className={cn(
            "flex items-center justify-center",
            "w-6 h-6 rounded",
            "text-muted-foreground",
            "hover:bg-accent hover:text-foreground",
            "focus-visible:ring-2 focus-visible:ring-primary",
            "disabled:opacity-30 disabled:cursor-not-allowed",
            "transition-colors duration-150"
          )}
          aria-label="Scroll tabs right"
        >
          <NavArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>

        {/* Divider */}
        <div className="w-px h-4 bg-border mx-1" aria-hidden="true" />

        {/* Close all */}
        <button
          type="button"
          onClick={onCloseAll}
          className={cn(
            "flex items-center justify-center",
            "w-6 h-6 rounded",
            "text-muted-foreground",
            "hover:bg-destructive hover:text-white",
            "focus-visible:ring-2 focus-visible:ring-primary",
            "transition-colors duration-150"
          )}
          aria-label="Close all tabs"
        >
          <Xmark className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default ChatTabs
