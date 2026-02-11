"use client"

import { useRef, useState, useEffect, useCallback } from "react"
import {
  Page,
  Code,
  List,
  Table2Columns,
  Book,
  Calculator,
  Xmark,
  NavArrowLeft,
  NavArrowRight,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import type { ArtifactTab } from "@/lib/hooks/useArtifactTabs"
import { Id } from "../../../convex/_generated/dataModel"

/** Map artifact type to Iconoir icon */
const typeIcons: Record<string, React.ElementType> = {
  code: Code,
  outline: List,
  section: Page,
  table: Table2Columns,
  citation: Book,
  formula: Calculator,
}

function getTabIcon(type: string) {
  const IconComponent = typeIcons[type] || Page
  return <IconComponent className="h-3.5 w-3.5" aria-hidden="true" />
}

interface ArtifactTabsProps {
  /** Array of open artifact tabs */
  tabs: ArtifactTab[]
  /** Currently active tab ID */
  activeTabId: Id<"artifacts"> | null
  /** Callback when tab is clicked */
  onTabChange: (tabId: Id<"artifacts">) => void
  /** Callback when tab close button is clicked */
  onTabClose: (tabId: Id<"artifacts">) => void
}

/**
 * ArtifactTabs - Tab bar for switching between open artifact documents
 *
 * Features:
 * - Tab bar height: 36px (matches --tab-bar-height)
 * - Tab with type icon, filename, close button (x)
 * - Scrollable tabs with fade effects on edges
 * - Prev/next navigation for overflow
 * - Keyboard navigation (arrow keys, Home/End, Delete)
 *
 * Styled per Mechanical Grace: font-mono, rounded-action, border-hairline
 */
export function ArtifactTabs({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
}: ArtifactTabsProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const [hasOverflowLeft, setHasOverflowLeft] = useState(false)
  const [hasOverflowRight, setHasOverflowRight] = useState(false)

  const checkOverflow = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    const { scrollLeft, scrollWidth, clientWidth } = container
    setHasOverflowLeft(scrollLeft > 0)
    setHasOverflowRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

  useEffect(() => {
    checkOverflow()
    window.addEventListener("resize", checkOverflow)
    return () => window.removeEventListener("resize", checkOverflow)
  }, [checkOverflow, tabs])

  const scrollLeft = useCallback(() => {
    scrollContainerRef.current?.scrollBy({ left: -200, behavior: "smooth" })
  }, [])

  const scrollRight = useCallback(() => {
    scrollContainerRef.current?.scrollBy({ left: 200, behavior: "smooth" })
  }, [])

  const handleTabClick = useCallback(
    (tabId: Id<"artifacts">) => { onTabChange(tabId) },
    [onTabChange]
  )

  const handleCloseClick = useCallback(
    (e: React.MouseEvent, tabId: Id<"artifacts">) => {
      e.stopPropagation()
      onTabClose(tabId)
    },
    [onTabClose]
  )

  const focusTab = useCallback((tabId: string) => {
    tabRefs.current.get(tabId)?.focus()
  }, [])

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, tabId: Id<"artifacts">, index: number) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault()
          handleTabClick(tabId)
          break
        case "ArrowLeft":
          e.preventDefault()
          if (index > 0) {
            const prev = tabs[index - 1]
            handleTabClick(prev.id)
            focusTab(prev.id)
          }
          break
        case "ArrowRight":
          e.preventDefault()
          if (index < tabs.length - 1) {
            const next = tabs[index + 1]
            handleTabClick(next.id)
            focusTab(next.id)
          }
          break
        case "Home":
          e.preventDefault()
          if (tabs.length > 0) {
            handleTabClick(tabs[0].id)
            focusTab(tabs[0].id)
          }
          break
        case "End":
          e.preventDefault()
          if (tabs.length > 0) {
            const last = tabs[tabs.length - 1]
            handleTabClick(last.id)
            focusTab(last.id)
          }
          break
        case "Delete":
        case "Backspace":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            onTabClose(tabId)
          }
          break
      }
    },
    [tabs, handleTabClick, focusTab, onTabClose]
  )

  if (tabs.length === 0) return null

  return (
    <div
      className={cn(
        "flex items-stretch",
        "h-9 min-h-[36px]",
        "bg-background border-b border-border/50",
        "flex-shrink-0"
      )}
      role="tablist"
      aria-label="Open artifacts"
    >
      {/* Tabs container with fade */}
      <div className="flex-1 relative overflow-hidden">
        {/* Left fade */}
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-8",
            "bg-gradient-to-r from-background to-transparent",
            "pointer-events-none z-10 transition-opacity duration-150",
            hasOverflowLeft ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />
        {/* Right fade */}
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-8",
            "bg-gradient-to-l from-background to-transparent",
            "pointer-events-none z-10 transition-opacity duration-150",
            hasOverflowRight ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />

        {/* Scrollable tabs */}
        <div
          ref={scrollContainerRef}
          onScroll={checkOverflow}
          className="flex items-stretch gap-0 overflow-x-auto scrollbar-none scroll-smooth"
        >
          {tabs.map((tab, index) => (
            <div
              key={tab.id}
              ref={(el) => {
                if (el) tabRefs.current.set(tab.id, el)
                else tabRefs.current.delete(tab.id)
              }}
              onClick={() => handleTabClick(tab.id)}
              onKeyDown={(e) => handleTabKeyDown(e, tab.id, index)}
              role="tab"
              tabIndex={activeTabId === tab.id ? 0 : -1}
              aria-selected={activeTabId === tab.id}
              className={cn(
                "group flex items-center gap-1.5",
                "px-3 h-[35px]",
                "bg-transparent border-b-2 border-transparent",
                "font-mono text-xs cursor-pointer",
                "transition-all duration-150",
                "hover:bg-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                "min-w-[100px] max-w-[200px]",
                // Active state
                activeTabId === tab.id && "bg-card border-b-primary",
                // Separator
                index < tabs.length - 1 &&
                  activeTabId !== tab.id &&
                  "relative after:absolute after:right-0 after:top-2 after:bottom-2 after:w-px after:bg-border"
              )}
            >
              {/* Tab icon */}
              <span
                className={cn(
                  "flex-shrink-0 text-muted-foreground",
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
                  "w-[16px] h-[16px] rounded-action",
                  "text-muted-foreground flex-shrink-0",
                  "opacity-0 group-hover:opacity-100",
                  "hover:bg-destructive hover:text-destructive-foreground",
                  "focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-primary",
                  "transition-all duration-150",
                  activeTabId === tab.id && "opacity-100"
                )}
                aria-label={`Close ${tab.title}`}
                tabIndex={-1}
              >
                <Xmark className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll navigation */}
      {(hasOverflowLeft || hasOverflowRight) && (
        <div className="flex items-center gap-0.5 px-1.5 border-l border-border">
          <button
            type="button"
            onClick={scrollLeft}
            disabled={!hasOverflowLeft}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-action",
              "text-muted-foreground hover:bg-accent hover:text-foreground",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "transition-colors duration-150"
            )}
            aria-label="Scroll tabs left"
          >
            <NavArrowLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={scrollRight}
            disabled={!hasOverflowRight}
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-action",
              "text-muted-foreground hover:bg-accent hover:text-foreground",
              "disabled:opacity-30 disabled:cursor-not-allowed",
              "transition-colors duration-150"
            )}
            aria-label="Scroll tabs right"
          >
            <NavArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}

export default ArtifactTabs
