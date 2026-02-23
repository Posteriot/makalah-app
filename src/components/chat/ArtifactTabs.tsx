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

function RefrasaBadge() {
  return (
    <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-[var(--chat-warning)] text-[9px] font-mono font-bold text-[var(--chat-warning-foreground)]">
      R
    </span>
  )
}

/** Map artifact type to icon and human label */
const typeMeta: Record<string, { icon: React.ElementType; label: string }> = {
  code: { icon: Code, label: "Code" },
  outline: { icon: List, label: "Outline" },
  section: { icon: Page, label: "Section" },
  table: { icon: Table2Columns, label: "Tabel" },
  citation: { icon: Book, label: "Sitasi" },
  formula: { icon: Calculator, label: "Formula" },
  refrasa: { icon: RefrasaBadge, label: "Refrasa" },
}

function getTabMeta(type: string) {
  return typeMeta[type] ?? { icon: Page, label: "Dokumen" }
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
 * ArtifactTabs - Document navigator for artifact workspace.
 *
 * Redesign goals:
 * - Active tab has stronger hierarchy than non-active tabs.
 * - Overflow remains readable with count + explicit left/right controls.
 * - Closing active tab uses predictable neighbor fallback.
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
    setHasOverflowLeft(scrollLeft > 1)
    setHasOverflowRight(scrollLeft + clientWidth < scrollWidth - 1)
  }, [])

  useEffect(() => {
    checkOverflow()
  }, [checkOverflow, tabs.length])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleResize = () => checkOverflow()
    window.addEventListener("resize", handleResize)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(checkOverflow)
      observer.observe(container)
    }

    return () => {
      window.removeEventListener("resize", handleResize)
      observer?.disconnect()
    }
  }, [checkOverflow])

  useEffect(() => {
    if (!activeTabId) return
    const activeTabEl = tabRefs.current.get(activeTabId)
    activeTabEl?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" })
  }, [activeTabId])

  const focusTab = useCallback((tabId: string) => {
    tabRefs.current.get(tabId)?.focus()
  }, [])

  const activeTabIndex = activeTabId ? tabs.findIndex((tab) => tab.id === activeTabId) : -1
  const hasPrevTab = activeTabIndex > 0
  const hasNextTab = activeTabIndex >= 0 && activeTabIndex < tabs.length - 1

  const activateAdjacentTab = useCallback((direction: "left" | "right") => {
    if (activeTabIndex < 0) return

    const targetIndex = direction === "left" ? activeTabIndex - 1 : activeTabIndex + 1
    const targetTab = tabs[targetIndex]
    if (!targetTab) return

    onTabChange(targetTab.id)
    requestAnimationFrame(() => {
      focusTab(targetTab.id)
    })
  }, [activeTabIndex, tabs, onTabChange, focusTab])

  const closeTabWithFallback = useCallback((tabId: Id<"artifacts">) => {
    const index = tabs.findIndex((tab) => tab.id === tabId)
    if (index < 0) return

    const closingActive = activeTabId === tabId
    const fallbackId =
      tabs[index + 1]?.id ??
      tabs[index - 1]?.id ??
      null

    if (closingActive && fallbackId) {
      onTabChange(fallbackId)
    }

    onTabClose(tabId)

    if (closingActive && fallbackId) {
      requestAnimationFrame(() => {
        focusTab(fallbackId)
      })
    }
  }, [tabs, activeTabId, onTabChange, onTabClose, focusTab])

  const handleTabKeyDown = useCallback(
    (e: React.KeyboardEvent, tabId: Id<"artifacts">, index: number) => {
      switch (e.key) {
        case "Enter":
        case " ":
          e.preventDefault()
          onTabChange(tabId)
          break
        case "ArrowLeft":
          e.preventDefault()
          if (index > 0) {
            const prev = tabs[index - 1]
            onTabChange(prev.id)
            focusTab(prev.id)
          }
          break
        case "ArrowRight":
          e.preventDefault()
          if (index < tabs.length - 1) {
            const next = tabs[index + 1]
            onTabChange(next.id)
            focusTab(next.id)
          }
          break
        case "Home":
          e.preventDefault()
          if (tabs.length > 0) {
            onTabChange(tabs[0].id)
            focusTab(tabs[0].id)
          }
          break
        case "End":
          e.preventDefault()
          if (tabs.length > 0) {
            const last = tabs[tabs.length - 1]
            onTabChange(last.id)
            focusTab(last.id)
          }
          break
        case "Delete":
        case "Backspace":
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault()
            closeTabWithFallback(tabId)
          }
          break
        case "w":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            closeTabWithFallback(tabId)
          }
          break
      }
    },
    [tabs, onTabChange, focusTab, closeTabWithFallback]
  )

  if (tabs.length === 0) return null

  return (
    <div
      className={cn(
        "flex min-h-[50px] items-end bg-inherit",
        "shrink-0"
      )}
      role="tablist"
      aria-label="Navigasi tab artifak"
    >
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-[var(--chat-card)] to-transparent transition-opacity",
            hasOverflowLeft ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />
        <div
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-[var(--chat-card)] to-transparent transition-opacity",
            hasOverflowRight ? "opacity-100" : "opacity-0"
          )}
          aria-hidden="true"
        />

        <div
          ref={scrollContainerRef}
          onScroll={checkOverflow}
          className={cn(
            "flex h-full items-end gap-1 px-1.5 pb-0 pt-1.5 scroll-smooth",
            // Compact panel: disable direct horizontal scroll and hide native scrollbar.
            "overflow-x-hidden",
            // Wider panel can still be scrolled (navigation buttons remain available).
            "@[520px]/artifact:overflow-x-auto",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          {tabs.map((tab, index) => {
            const isActive = activeTabId === tab.id
            const { icon: IconComponent, label } = getTabMeta(tab.type)

            return (
              <div
                key={tab.id}
                ref={(el) => {
                  if (el) tabRefs.current.set(tab.id, el)
                  else tabRefs.current.delete(tab.id)
                }}
                onClick={() => onTabChange(tab.id)}
                onKeyDown={(e) => handleTabKeyDown(e, tab.id, index)}
                role="tab"
                tabIndex={isActive ? 0 : -1}
                aria-selected={isActive}
                aria-label={`${tab.title} (${label})`}
                className={cn(
                  "group relative -mb-px flex min-w-[160px] max-w-[260px] cursor-pointer items-center gap-2 rounded-t-action rounded-b-none border-x border-t border-b-0 px-2.5 py-1",
                  "transition-colors duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--chat-card)]",
                  isActive
                    ? "border-[color:var(--chat-border)] bg-[var(--chat-card)] shadow-sm"
                    : "border-transparent bg-[var(--chat-muted)] hover:border-[color:var(--chat-border)] hover:bg-[var(--chat-accent)]"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center",
                    isActive
                      ? "text-[var(--chat-foreground)]"
                      : "rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-muted)] text-[var(--chat-muted-foreground)]"
                  )}
                >
                  <IconComponent className="h-3.5 w-3.5" aria-hidden="true" />
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[11px] font-medium leading-tight",
                      isActive ? "text-[var(--chat-foreground)]" : "text-[var(--chat-muted-foreground)]"
                    )}
                  >
                    {tab.title}
                  </span>
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    closeTabWithFallback(tab.id)
                  }}
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-badge text-[var(--chat-muted-foreground)] transition-colors",
                    "hover:bg-[var(--chat-destructive)] hover:text-[var(--chat-destructive-foreground)]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                    isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )}
                  aria-label={`Tutup tab ${tab.title}`}
                  tabIndex={-1}
                >
                  <Xmark className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex h-[34px] self-end items-center gap-2 border-l border-[color:var(--chat-border)] px-3 @[520px]/artifact:gap-0.5 @[520px]/artifact:px-2">
        <span className="mr-1 text-[10px] font-mono text-[var(--chat-muted-foreground)]">
          {tabs.length} tab
        </span>
        <button
          type="button"
          onClick={() => activateAdjacentTab("left")}
          disabled={!hasPrevTab}
          className={cn(
            "flex h-7 w-7 items-center justify-center text-[var(--chat-muted-foreground)] transition-colors",
            "rounded-none hover:bg-transparent hover:text-[var(--chat-foreground)]",
            "@[520px]/artifact:rounded-action @[520px]/artifact:hover:bg-[var(--chat-accent)]",
            "disabled:cursor-not-allowed disabled:opacity-35"
          )}
          aria-label="Tab sebelumnya"
        >
          <NavArrowLeft className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => activateAdjacentTab("right")}
          disabled={!hasNextTab}
          className={cn(
            "flex h-7 w-7 items-center justify-center text-[var(--chat-muted-foreground)] transition-colors",
            "rounded-none hover:bg-transparent hover:text-[var(--chat-foreground)]",
            "@[520px]/artifact:rounded-action @[520px]/artifact:hover:bg-[var(--chat-accent)]",
            "disabled:cursor-not-allowed disabled:opacity-35"
          )}
          aria-label="Tab berikutnya"
        >
          <NavArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

export default ArtifactTabs
