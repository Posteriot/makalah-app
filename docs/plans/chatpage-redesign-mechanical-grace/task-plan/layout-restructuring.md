# Chat Page Layout Restructuring — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure chat page layout dari conversation-tab-centric ke IDE-style architecture dengan artifact tabs, persistent chat input, dan unified top bar controls. Semua fungsionalitas tetap — hanya UI/layout yang berubah.

**Architecture:** Hapus ChatTabs (conversation switching) dari main area. Tambah artifact document tabs di ArtifactPanel. Buat spanning TopBar untuk semua global controls. ChatInput menjadi persistent di semua state termasuk start/empty state. Grid tetap 6-kolom, ditambah TopBar row di atas.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Iconoir (`iconoir-react`), shadcn/ui, Convex real-time

**Reference Docs:**
- `docs/plans/chatpage-redesign-mechanical-grace/existing-state.md` — Current component audit
- `docs/plans/chatpage-redesign-mechanical-grace/chatpage-redesain-context.md` — Design context
- `CLAUDE.md` → Mechanical Grace Design System section

**Branch:** `feat/chatpage-redesign-mechanical-grace` (sudah ada)

---

## Phase 1: Create New Components (Additive, No Breakage)

Semua task di phase ini membuat komponen baru tanpa mengubah existing code. App tetap jalan normal selama phase ini.

---

### Task 1: Create `useArtifactTabs` Hook

**Files:**
- Create: `src/lib/hooks/useArtifactTabs.ts`

**Context:**
Hook ini mengelola state artifact tabs — artifact mana yang terbuka, mana yang aktif. Mirip `useTabState.ts` tapi lebih sederhana: tidak perlu URL sync (artifact bukan route), tidak perlu localStorage (tabs session-only). Data artifact (title, type) didapat dari Convex query di component level.

**Reference:** Baca `src/lib/hooks/useTabState.ts` untuk memahami pattern existing.

**Step 1: Create the hook file**

```typescript
// src/lib/hooks/useArtifactTabs.ts
"use client"

import { useState, useCallback } from "react"
import { Id } from "../../../convex/_generated/dataModel"

/**
 * Artifact tab representing an open artifact document
 */
export interface ArtifactTab {
  /** Artifact ID from Convex */
  id: Id<"artifacts">
  /** Display title (artifact title) */
  title: string
  /** Artifact type (code, outline, section, table, citation, formula) */
  type: string
}

/** Maximum number of open artifact tabs */
const MAX_ARTIFACT_TABS = 8

interface UseArtifactTabsReturn {
  /** Array of open artifact tabs */
  openTabs: ArtifactTab[]
  /** Currently active artifact tab ID */
  activeTabId: Id<"artifacts"> | null
  /** Open a new tab or activate existing. Returns the tab. */
  openTab: (artifact: ArtifactTab) => void
  /** Close a tab by artifact ID */
  closeTab: (id: Id<"artifacts">) => void
  /** Set active tab without opening new */
  setActiveTab: (id: Id<"artifacts">) => void
  /** Close all artifact tabs */
  closeAllTabs: () => void
  /** Update tab title (when artifact title changes) */
  updateTabTitle: (id: Id<"artifacts">, title: string) => void
}

/**
 * useArtifactTabs - Tab state management for artifact panel
 *
 * Manages which artifacts are open as tabs and which is active.
 * Session-only state (no localStorage, no URL sync).
 * Max 8 tabs — oldest tab removed when exceeded.
 */
export function useArtifactTabs(): UseArtifactTabsReturn {
  const [openTabs, setOpenTabs] = useState<ArtifactTab[]>([])
  const [activeTabId, setActiveTabId] = useState<Id<"artifacts"> | null>(null)

  const openTab = useCallback((artifact: ArtifactTab) => {
    setOpenTabs((prev) => {
      // Already open — just activate
      const existing = prev.find((tab) => tab.id === artifact.id)
      if (existing) {
        return prev.map((tab) =>
          tab.id === artifact.id ? { ...tab, title: artifact.title } : tab
        )
      }

      // At max — remove oldest (first) tab
      if (prev.length >= MAX_ARTIFACT_TABS) {
        return [...prev.slice(1), artifact]
      }

      return [...prev, artifact]
    })
    setActiveTabId(artifact.id)
  }, [])

  const closeTab = useCallback((id: Id<"artifacts">) => {
    setOpenTabs((prev) => {
      const index = prev.findIndex((tab) => tab.id === id)
      if (index < 0) return prev
      return [...prev.slice(0, index), ...prev.slice(index + 1)]
    })
    setActiveTabId((prevActive) => {
      if (prevActive !== id) return prevActive
      // Closing active tab — switch to neighbor
      // Use current openTabs via closure for index calculation
      return null // Will be resolved in useEffect or by component
    })
    // Need to compute next active based on current tabs
    setOpenTabs((prev) => {
      // This runs after the removal above
      // If active was the closed tab, pick next neighbor
      setActiveTabId((prevActive) => {
        if (prevActive !== null) return prevActive
        if (prev.length > 0) {
          return prev[prev.length - 1].id
        }
        return null
      })
      return prev
    })
  }, [])

  const closeAllTabs = useCallback(() => {
    setOpenTabs([])
    setActiveTabId(null)
  }, [])

  const updateTabTitle = useCallback((id: Id<"artifacts">, title: string) => {
    setOpenTabs((prev) =>
      prev.map((tab) => (tab.id === id ? { ...tab, title } : tab))
    )
  }, [])

  const setActive = useCallback((id: Id<"artifacts">) => {
    setActiveTabId(id)
  }, [])

  return {
    openTabs,
    activeTabId,
    openTab,
    closeTab,
    setActiveTab: setActive,
    closeAllTabs,
    updateTabTitle,
  }
}

export default useArtifactTabs
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep useArtifactTabs || echo "No errors"`
Expected: No errors related to this file

**Step 3: Commit**

```bash
git add src/lib/hooks/useArtifactTabs.ts
git commit -m "feat(chat): add useArtifactTabs hook for artifact tab state management"
```

---

### Task 2: Create `TopBar` Component

**Files:**
- Create: `src/components/chat/shell/TopBar.tsx`

**Context:**
TopBar adalah spanning row di atas grid utama. Menggabungkan controls yang sekarang tersebar di ShellHeader, ActivityBar, dan ChatSidebar header.

**Layout:**
```
[Logo icon] [PRO badge] [◫ sidebar toggle]  ←──→  [🔔] [☀] [◫ panel] [User ▾]
```

**Reference:**
- Logo: `src/components/chat/shell/ActivityBar.tsx:199-230`
- Tier badge: `src/components/chat/ChatSidebar.tsx:128-149` (uses `SegmentBadge`)
- Sidebar toggle: `src/components/chat/shell/ActivityBar.tsx:232-260`
- Notification: `src/components/chat/shell/ShellHeader.tsx:50`
- Theme toggle: `src/components/chat/shell/ShellHeader.tsx:53-74`
- Panel toggle: `src/components/chat/shell/ShellHeader.tsx:76-118`
- User dropdown: `src/components/chat/shell/ShellHeader.tsx:121`

**Step 1: Create TopBar component**

```tsx
// src/components/chat/shell/TopBar.tsx
"use client"

import Image from "next/image"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  SunLight,
  HalfMoon,
  SidebarExpand,
  SidebarCollapse,
  FastArrowLeft,
  FastArrowRight,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { NotificationDropdown } from "./NotificationDropdown"
import { UserDropdown } from "@/components/layout/header"
import { SegmentBadge } from "@/components/ui/SegmentBadge"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"

interface TopBarProps {
  /** Whether sidebar is collapsed */
  isSidebarCollapsed: boolean
  /** Callback to toggle sidebar */
  onToggleSidebar: () => void
  /** Whether the artifact panel is collapsed */
  isPanelCollapsed: boolean
  /** Callback to toggle the artifact panel */
  onTogglePanel: () => void
  /** Number of artifacts (0 = panel toggle disabled) */
  artifactCount: number
}

/**
 * TopBar - Full-width top bar spanning all grid columns
 *
 * Left group: Logo icon, Tier badge, Sidebar toggle
 * Right group: Notification, Theme toggle, Panel toggle, User dropdown
 *
 * IDE-style: always visible, compact (40-44px height)
 */
export function TopBar({
  isSidebarCollapsed,
  onToggleSidebar,
  isPanelCollapsed,
  onTogglePanel,
  artifactCount,
}: TopBarProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const { user, isLoading } = useCurrentUser()

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  const hasArtifacts = artifactCount > 0

  return (
    <TooltipProvider delayDuration={300}>
      <header
        className={cn(
          "flex items-center justify-between",
          "h-11 px-3",
          "border-b border-border/50 bg-sidebar",
          "shrink-0"
        )}
      >
        {/* Left Group: Logo + Tier Badge + Sidebar Toggle */}
        <div className="flex items-center gap-2">
          {/* Logo — Home link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/"
                className={cn(
                  "flex items-center justify-center",
                  "w-8 h-8 rounded-action",
                  "hover:bg-sidebar-accent transition-colors"
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
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-mono text-xs">
              Home
            </TooltipContent>
          </Tooltip>

          {/* Tier Badge — only show when user loaded */}
          {!isLoading && user && (
            <SegmentBadge
              role={user.role}
              subscriptionStatus={user.subscriptionStatus}
            />
          )}

          {/* Sidebar Collapse/Expand Toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "w-8 h-8 rounded-action",
                  "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
                  "transition-colors duration-150"
                )}
                onClick={onToggleSidebar}
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                aria-expanded={!isSidebarCollapsed}
              >
                {isSidebarCollapsed ? (
                  <FastArrowRight className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <FastArrowLeft className="h-4 w-4" aria-hidden="true" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="font-mono text-xs">
              {isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Right Group: Notification + Theme + Panel Toggle + User */}
        <div className="flex items-center gap-1.5">
          {/* Notifications */}
          <NotificationDropdown />

          {/* Theme Toggle */}
          {!isLoading && user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={toggleTheme}
                  className={cn(
                    "flex items-center justify-center",
                    "w-8 h-8 rounded-action",
                    "text-muted-foreground hover:text-foreground hover:bg-accent",
                    "transition-colors duration-150"
                  )}
                  aria-label="Toggle theme"
                >
                  <SunLight className="h-4 w-4 hidden dark:block" />
                  <HalfMoon className="h-4 w-4 block dark:hidden" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Toggle theme</TooltipContent>
            </Tooltip>
          )}

          {/* Panel Toggle — always visible, disabled when no artifacts */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={hasArtifacts ? onTogglePanel : undefined}
                disabled={!hasArtifacts}
                className={cn(
                  "relative flex items-center justify-center",
                  "w-8 h-8 rounded-action",
                  "text-muted-foreground hover:text-foreground hover:bg-accent",
                  "transition-colors duration-150",
                  !hasArtifacts && "opacity-30 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground"
                )}
                aria-label={
                  !hasArtifacts
                    ? "No artifacts"
                    : isPanelCollapsed
                      ? `Open artifacts panel (${artifactCount})`
                      : "Close artifacts panel"
                }
              >
                {isPanelCollapsed ? (
                  <SidebarExpand className="h-4 w-4" />
                ) : (
                  <SidebarCollapse className="h-4 w-4" />
                )}
                {/* Artifact count badge — visible when collapsed + has artifacts */}
                {hasArtifacts && isPanelCollapsed && (
                  <span
                    className={cn(
                      "absolute -top-1 -right-1",
                      "min-w-[16px] h-[16px] px-1",
                      "flex items-center justify-center",
                      "text-[9px] font-semibold font-mono",
                      "bg-primary text-primary-foreground",
                      "rounded-full"
                    )}
                  >
                    {artifactCount}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">
              {!hasArtifacts
                ? "No artifacts"
                : isPanelCollapsed
                  ? `Open artifacts (${artifactCount})`
                  : "Close artifacts"}
            </TooltipContent>
          </Tooltip>

          {/* User Dropdown */}
          <UserDropdown />
        </div>
      </header>
    </TooltipProvider>
  )
}

export default TopBar
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep TopBar || echo "No errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/chat/shell/TopBar.tsx
git commit -m "feat(chat): add TopBar component — unified spanning top bar with all global controls"
```

---

### Task 3: Create `ArtifactTabs` Component

**Files:**
- Create: `src/components/chat/ArtifactTabs.tsx`

**Context:**
Tab bar untuk artifact panel — mirip ChatTabs tapi untuk artifact documents. Reuse pattern dari `ChatTabs.tsx` (scroll overflow, keyboard nav, fade gradients).

**Reference:** Baca `src/components/chat/shell/ChatTabs.tsx` untuk memahami existing tab pattern.

**Step 1: Create ArtifactTabs component**

```tsx
// src/components/chat/ArtifactTabs.tsx
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
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep ArtifactTabs || echo "No errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/chat/ArtifactTabs.tsx
git commit -m "feat(chat): add ArtifactTabs component — tab bar for switching artifact documents"
```

---

### Task 4: Create `ArtifactToolbar` Component

**Files:**
- Create: `src/components/chat/ArtifactToolbar.tsx`

**Context:**
Toolbar row antara artifact tab bar dan content area. Kiri: metadata (type badge, version, date). Kanan: action buttons (Download, Edit, Refrasa, Copy, Expand). Buttons di-extract dari current `ArtifactPanel.tsx:174-393`.

**Reference:** Baca `src/components/chat/ArtifactPanel.tsx:174-420` untuk memahami existing action buttons.

**Step 1: Create ArtifactToolbar component**

```tsx
// src/components/chat/ArtifactToolbar.tsx
"use client"

import { useState } from "react"
import {
  Download,
  EditPencil,
  MagicWand,
  Copy,
  Check,
  Expand,
  MoreVert,
} from "iconoir-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"

// Artifact type labels (same as ArtifactPanel)
const typeLabels: Record<string, string> = {
  code: "Code",
  outline: "Outline",
  section: "Section",
  table: "Tabel",
  citation: "Sitasi",
  formula: "Formula",
}

interface ArtifactToolbarProps {
  /** Selected artifact data */
  artifact: {
    title: string
    type: string
    version: number
    createdAt: number
  } | null
  /** Callbacks for actions — connected to ArtifactViewer ref */
  onDownload?: (format: "docx" | "pdf" | "txt") => void
  onEdit?: () => void
  onRefrasa?: () => void
  onCopy?: () => void
  onExpand?: () => void
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * ArtifactToolbar - Metadata + action buttons between tabs and content
 *
 * Left: artifact type badge, version, date
 * Right: Download, Edit, Refrasa, Copy, Expand (responsive — collapses to 3-dot menu)
 */
export function ArtifactToolbar({
  artifact,
  onDownload,
  onEdit,
  onRefrasa,
  onCopy,
  onExpand,
}: ArtifactToolbarProps) {
  const [copied, setCopied] = useState(false)

  if (!artifact) return null

  const handleCopy = () => {
    onCopy?.()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        "@container/toolbar",
        "flex items-center justify-between gap-2",
        "h-9 px-3",
        "border-b border-border/50",
        "shrink-0"
      )}
    >
      {/* Left: Metadata */}
      <div className="flex items-center gap-2 min-w-0">
        <Badge
          variant="outline"
          className="text-[10px] font-mono px-1.5 py-0 rounded-badge capitalize shrink-0"
        >
          {typeLabels[artifact.type] || artifact.type}
        </Badge>
        <Badge
          variant="secondary"
          className="text-[10px] font-mono px-1.5 py-0 rounded-badge shrink-0"
        >
          v{artifact.version}
        </Badge>
        <span className="text-[11px] font-mono text-muted-foreground truncate">
          {formatDate(artifact.createdAt)}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Wide view: Individual buttons */}
        <div className="hidden @[320px]/toolbar:flex items-center gap-1">
          {/* Download */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent className="font-mono text-xs">Unduh</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onDownload?.("docx")}>DOCX</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.("pdf")}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.("txt")}>TXT</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Edit */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                <EditPencil className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Edit</TooltipContent>
          </Tooltip>

          {/* Refrasa */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onRefrasa} className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                <MagicWand className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Refrasa</TooltipContent>
          </Tooltip>

          {/* Copy */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Salin</TooltipContent>
          </Tooltip>

          <div className="w-px h-4 bg-border mx-0.5" />

          {/* Expand */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onExpand} className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                <Expand className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent className="font-mono text-xs">Fullscreen</TooltipContent>
          </Tooltip>
        </div>

        {/* Narrow view: 3-dot menu */}
        <div className="flex @[320px]/toolbar:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-action text-muted-foreground hover:bg-accent hover:text-foreground">
                <MoreVert className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger><Download className="h-4 w-4 mr-2" />Unduh</DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => onDownload?.("docx")}>DOCX</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload?.("pdf")}>PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDownload?.("txt")}>TXT</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuItem onClick={onEdit}><EditPencil className="h-4 w-4 mr-2" />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={onRefrasa}><MagicWand className="h-4 w-4 mr-2" />Refrasa</DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 mr-2 text-emerald-500" /> : <Copy className="h-4 w-4 mr-2" />}
                Salin
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onExpand}><Expand className="h-4 w-4 mr-2" />Fullscreen</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}

export default ArtifactToolbar
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep ArtifactToolbar || echo "No errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/chat/ArtifactToolbar.tsx
git commit -m "feat(chat): add ArtifactToolbar component — metadata and action buttons row"
```

---

## Phase 2: Refactor Existing Components

Phase ini memodifikasi existing components. Perubahan dilakukan satu file per task untuk memudahkan rollback.

---

### Task 5: Refactor ChatWindow — Persistent ChatInput

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

**Context:**
Saat ini ChatInput hanya render di active conversation state (line 599-607). Di start state / empty state (line 398-459), ChatInput tidak ada. Target: ChatInput **selalu visible** di bottom, termasuk saat start state.

**PENTING:** Fungsionalitas tidak berubah. Saat user mengetik di start state tanpa conversationId, existing `handleSubmit` dan `handleStartNewChat` logic sudah handle auto-create conversation.

**Step 1: Restructure ChatWindow render**

Ubah empty/start state agar ChatInput tetap render. Perubahan di `src/components/chat/ChatWindow.tsx`:

**Hapus** return statement start state yang TIDAK include ChatInput (line 398-459) dan ganti dengan:

```tsx
  // Landing page empty state (no conversation selected)
  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden p-4 border-b border-border/50 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onMobileMenuClick} aria-label="Open mobile menu">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Makalah Chat</span>
          <div className="w-9" />
        </div>

        {/* Empty State Content — fills available space above ChatInput */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-6">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-shell bg-slate-200 flex items-center justify-center">
              <Sparks className="w-8 h-8 text-slate-500" />
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h2 className="text-narrative text-xl font-medium tracking-tight">Selamat Datang di Makalah Chat</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Asisten AI untuk membantu riset, menulis makalah ilmiah, dan menjawab pertanyaan akademik.
                Mulai percakapan baru atau pilih dari riwayat di sidebar.
              </p>
            </div>

            {/* Template Cards */}
            <div className="grid grid-cols-1 gap-3 text-left text-sm">
              <div className="flex items-start gap-3 p-3 rounded-shell border-hairline bg-card/90 backdrop-blur-[1px]">
                <Page className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-interface text-sm font-medium">Tulis Makalah</p>
                  <p className="text-interface text-xs text-muted-foreground">Panduan step-by-step menulis paper akademik</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-shell border-hairline bg-card/90 backdrop-blur-[1px]">
                <Search className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-interface text-sm font-medium">Riset & Referensi</p>
                  <p className="text-interface text-xs text-muted-foreground">Cari jurnal dan sumber ilmiah terpercaya</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Persistent ChatInput — always visible, even in start state */}
        <ChatInput
          input={input}
          onInputChange={handleInputChange}
          onSubmit={async (e) => {
            e.preventDefault()
            if (!input.trim()) return
            // Auto-create conversation then send message
            await handleStartNewChat()
          }}
          isLoading={isCreatingChat}
          conversationId={conversationId}
          uploadedFileIds={uploadedFileIds}
          onFileUploaded={handleFileUploaded}
        />
      </div>
    )
  }
```

**CATATAN PENTING:** Logic `handleStartNewChat` yang existing perlu minor adjustment — setelah create conversation dan redirect, message harus terkirim. Ini sudah handled oleh router push + synced conversation, tapi perlu diverifikasi secara visual.

Alternatif lebih simple: hapus tombol "Mulai Percakapan Baru" (line 446-454) karena ChatInput sudah ada. User cukup ketik dan enter — conversation auto-created.

**Step 2: Verify the app runs**

Run: `npm run dev`
- Navigate to `/chat` (start state)
- Verify: ChatInput visible di bottom
- Verify: Ketik sesuatu dan submit → conversation auto-created
- Verify: Existing conversations tetap berfungsi normal

**Step 3: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat(chat): make ChatInput persistent in start state — always visible bottom bar"
```

---

### Task 6: Refactor ArtifactPanel — Replace Dropdown with Tabs + Toolbar

**Files:**
- Modify: `src/components/chat/ArtifactPanel.tsx`

**Context:**
Ganti Collapsible dropdown selector (line 447-546) dan header actions (line 156-441) dengan ArtifactTabs + ArtifactToolbar. ArtifactViewer tetap. Close button dihapus (panel close via TopBar).

**Props change:** ArtifactPanel sekarang menerima tab-related props dari ChatContainer.

**Step 1: Update ArtifactPanel props and imports**

Di `src/components/chat/ArtifactPanel.tsx`, ubah imports dan interface:

```tsx
// Remove these imports (no longer needed):
// - Collapsible, CollapsibleContent, CollapsibleTrigger
// - Badge
// - NavArrowDown
// - MoreVert, Code, List, Table2Columns, Book, Calculator (moved to ArtifactTabs/ArtifactToolbar)
// - Download, EditPencil, MagicWand, Copy, Check (moved to ArtifactToolbar)
// - Xmark (close button removed)

// Add these imports:
import { ArtifactTabs } from "./ArtifactTabs"
import { ArtifactToolbar } from "./ArtifactToolbar"
import type { ArtifactTab } from "@/lib/hooks/useArtifactTabs"
import { Id } from "../../../convex/_generated/dataModel"

interface ArtifactPanelProps {
  conversationId: Id<"conversations"> | null
  isOpen: boolean
  onToggle: () => void
  // Tab-related props (new)
  openTabs: ArtifactTab[]
  activeTabId: Id<"artifacts"> | null
  onTabChange: (tabId: Id<"artifacts">) => void
  onTabClose: (tabId: Id<"artifacts">) => void
}
```

**Step 2: Replace the panel body**

Replace everything between `return (` and closing `)` with:

```tsx
  // Only render when panel is open
  if (!isOpen) return null

  // Find active artifact data from query
  const activeArtifact = activeTabId
    ? artifacts?.find((a) => a._id === activeTabId)
    : null

  return (
    <div
      className={cn(
        "@container/artifact",
        "flex flex-col h-full w-full",
        "bg-card rounded-shell border border-border/50",
        "transition-all duration-300 ease-in-out"
      )}
    >
      {/* Artifact Tabs */}
      <ArtifactTabs
        tabs={openTabs}
        activeTabId={activeTabId}
        onTabChange={onTabChange}
        onTabClose={onTabClose}
      />

      {/* Artifact Toolbar — metadata + actions */}
      <ArtifactToolbar
        artifact={
          activeArtifact
            ? {
                title: activeArtifact.title,
                type: activeArtifact.type,
                version: activeArtifact.version,
                createdAt: activeArtifact.createdAt ?? activeArtifact._creationTime,
              }
            : null
        }
        onDownload={(format) => {
          viewerRef.current?.setDownloadFormat(format)
          viewerRef.current?.download()
        }}
        onEdit={() => viewerRef.current?.startEdit()}
        onRefrasa={() => viewerRef.current?.triggerRefrasa()}
        onCopy={() => viewerRef.current?.copy()}
        onExpand={() => setIsFullsizeOpen(true)}
      />

      {/* Main viewer area */}
      <div className="flex-1 overflow-hidden">
        {activeTabId ? (
          <ArtifactViewer ref={viewerRef} artifactId={activeTabId} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
            <Page className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-[13px] text-muted-foreground max-w-[200px]">
              {openTabs.length > 0
                ? "Pilih tab artifact di atas"
                : "Buka artifact dari Paper Sessions di sidebar"}
            </p>
          </div>
        )}
      </div>

      {/* Fullsize Modal */}
      {activeTabId && (
        <FullsizeArtifactModal
          artifactId={activeTabId}
          isOpen={isFullsizeOpen}
          onClose={() => setIsFullsizeOpen(false)}
        />
      )}
    </div>
  )
```

**Step 3: Remove unused code**

Hapus dari ArtifactPanel:
- `isArtifactListOpen` state (line 117)
- `copied` state (line 124)
- Semua `typeIcons`, `typeLabels`, `formatDate` declarations (moved to ArtifactTabs/ArtifactToolbar)
- Seluruh header JSX (line 156-441)
- Seluruh Collapsible block (line 447-546)

**Step 4: Verify no type errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Mungkin ada errors di ChatContainer karena props berubah — ini di-fix di Task 7

**Step 5: Commit**

```bash
git add src/components/chat/ArtifactPanel.tsx
git commit -m "refactor(chat): replace ArtifactPanel dropdown with ArtifactTabs + ArtifactToolbar"
```

---

### Task 7: Refactor ChatContainer — Update Artifact State Model

**Files:**
- Modify: `src/components/chat/ChatContainer.tsx`

**Context:**
Update ArtifactState dari single `selectedId` ke `openTabs[]` + `activeTabId`. Integrate `useArtifactTabs` hook. Pass tab props ke ArtifactPanel.

**Step 1: Update ChatContainer**

Di `src/components/chat/ChatContainer.tsx`:

```tsx
// Add import
import { useArtifactTabs, type ArtifactTab } from "@/lib/hooks/useArtifactTabs"

// Replace artifactStateByConversation with useArtifactTabs
// Remove: useState for artifactStateByConversation
// Remove: conversationKey, currentArtifactState, updateArtifactState

// Add after useCleanupEmptyConversations:
const {
  openTabs: artifactTabs,
  activeTabId: activeArtifactTabId,
  openTab: openArtifactTab,
  closeTab: closeArtifactTab,
  setActiveTab: setActiveArtifactTab,
  closeAllTabs: closeAllArtifactTabs,
} = useArtifactTabs()

// Artifact panel is open if there are any open tabs
const artifactPanelOpen = artifactTabs.length > 0

// Replace handleArtifactSelect:
const handleArtifactSelect = (artifactId: Id<"artifacts">) => {
  // Find artifact data from query
  const artifact = artifacts?.find((a) => a._id === artifactId)
  if (!artifact) return

  openArtifactTab({
    id: artifactId,
    title: artifact.title,
    type: artifact.type,
  })
}

// Replace toggleArtifactPanel:
const toggleArtifactPanel = () => {
  if (artifactPanelOpen) {
    closeAllArtifactTabs()
  }
  // If closed with no tabs, do nothing (panel opens when artifact selected)
}

// Update ArtifactPanel props in return:
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
```

**Step 2: Update selectedArtifactId references**

Ganti semua `selectedArtifactId` dengan `activeArtifactTabId` di seluruh file.

**Step 3: Verify no type errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors (atau minimal — mungkin perlu adjustment di prop types)

**Step 4: Verify the app runs**

Run: `npm run dev`
- Open conversation with paper session
- Click artifact in sidebar Paper Sessions → should open as tab in ArtifactPanel
- Click another artifact → opens as second tab
- Switch between tabs → viewer updates
- Close a tab → switches to neighbor

**Step 5: Commit**

```bash
git add src/components/chat/ChatContainer.tsx
git commit -m "refactor(chat): update ChatContainer to use useArtifactTabs — multi-tab artifact state"
```

---

## Phase 3: Layout Integration

Phase ini mengubah layout grid dan memindahkan controls.

---

### Task 8: Refactor ChatLayout — Add TopBar, Remove ShellHeader + ChatTabs

**Files:**
- Modify: `src/components/chat/layout/ChatLayout.tsx`

**Context:**
Ini adalah task integrasi terbesar. Tambah TopBar di atas grid, hapus ShellHeader dan ChatTabs dari main column.

**Step 1: Update imports**

```tsx
// Remove:
import { ShellHeader } from "../shell/ShellHeader"
import { ChatTabs } from "../shell/ChatTabs"
import { useTabState } from "@/lib/hooks/useTabState"

// Add:
import { TopBar } from "../shell/TopBar"
```

**Step 2: Remove useTabState and related code**

Hapus dari ChatLayout:
- Seluruh `useTabState(pathname)` block (line 104-112)
- `handleTabChange` callback (line 257-262)
- `handleTabClose` callback (line 265-270)
- `useEffect` auto-open tab (line 124-134)
- `updateTabTitle` usage di `handleUpdateConversationTitle`

**Step 3: Remove CSS variable**

```tsx
// Remove from CSS_VARS:
"--tab-bar-height": "36px",  // No longer needed in main column
"--header-height": "72px",   // ShellHeader removed
// Keep --shell-header-h if used elsewhere, or add --topbar-height
```

**Step 4: Update the JSX return**

Ganti isi return dengan:

```tsx
  return (
    <div
      className="flex flex-col h-dvh"
      style={CSS_VARS}
    >
      {/* TopBar — full width, above grid */}
      <TopBar
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        isPanelCollapsed={!isArtifactPanelOpen}
        onTogglePanel={handleExpandPanel}
        artifactCount={artifactCount}
      />

      {/* Grid Content — same 6-column structure */}
      <div
        data-testid="chat-layout"
        className={cn(
          "grid flex-1 min-h-0 overflow-hidden",
          "transition-[grid-template-columns] duration-300 ease-in-out",
          isSidebarCollapsed && "sidebar-collapsed",
          !isArtifactPanelOpen && "panel-collapsed"
        )}
        style={{
          gridTemplateColumns: getGridTemplateColumns(),
        }}
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
            "flex flex-col border-r border-border/50 bg-sidebar overflow-hidden",
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
            onArtifactSelect={onArtifactSelect}
            isArtifactPanelOpen={isArtifactPanelOpen}
            onArtifactPanelToggle={onArtifactPanelToggle}
            isLoading={isLoading}
            isCreating={isCreating}
          />
        </aside>

        {/* Column 3: Left Resizer */}
        {!isSidebarCollapsed && (
          <PanelResizer
            position="left"
            onResize={handleSidebarResize}
            onDoubleClick={handleSidebarReset}
            className="hidden md:flex"
          />
        )}
        {isSidebarCollapsed && <div className="hidden md:block" />}

        {/* Column 4: Main Content — NO ShellHeader, NO ChatTabs */}
        <main className="flex flex-col overflow-hidden bg-[color:var(--section-bg-alt)]">
          <div className="flex-1 overflow-hidden">{children}</div>
        </main>

        {/* Column 5: Right Resizer */}
        {isArtifactPanelOpen && (
          <PanelResizer
            position="right"
            onResize={handlePanelResize}
            onDoubleClick={handlePanelReset}
            className="hidden md:flex"
          />
        )}
        {!isArtifactPanelOpen && <div className="hidden md:block" />}

        {/* Column 6: Artifact Panel */}
        <aside
          className={cn(
            "hidden md:flex flex-col overflow-hidden",
            "border-l border-border/50 bg-card",
            !isArtifactPanelOpen && "w-0 border-l-0"
          )}
        >
          {artifactPanel}
        </aside>
      </div>

      {/* Mobile Sidebar Sheet */}
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
            onArtifactSelect={onArtifactSelect}
            isArtifactPanelOpen={isArtifactPanelOpen}
            onArtifactPanelToggle={onArtifactPanelToggle}
            onCloseMobile={() => setIsMobileOpen(false)}
            isLoading={isLoading}
            isCreating={isCreating}
          />
        </SheetContent>
      </Sheet>

      {/* Footer */}
      <ChatMiniFooter />
    </div>
  )
```

**Step 5: Verify the app runs**

Run: `npm run dev`
- Verify: TopBar visible di atas dengan logo, tier badge, sidebar toggle, notification, theme, panel toggle, user dropdown
- Verify: No ChatTabs visible di main area
- Verify: Chat messages area full height
- Verify: Sidebar toggle works from TopBar
- Verify: Panel toggle works (disabled when no artifacts, enabled when artifacts exist)
- Verify: Theme toggle works
- Verify: User dropdown works

**Step 6: Commit**

```bash
git add src/components/chat/layout/ChatLayout.tsx
git commit -m "refactor(chat): integrate TopBar, remove ShellHeader and ChatTabs from main layout"
```

---

### Task 9: Modify ActivityBar — Remove Logo and Sidebar Toggle

**Files:**
- Modify: `src/components/chat/shell/ActivityBar.tsx`

**Context:**
Logo dan sidebar toggle sudah pindah ke TopBar. ActivityBar hanya perlu panel navigation items. Sidebar toggle di ActivityBar tetap ada sebagai fallback (auto-expand saat panel clicked), tapi tombol visual-nya dihapus.

**Step 1: Remove logo and sidebar toggle button from JSX**

Di `src/components/chat/shell/ActivityBar.tsx`:

Hapus:
- Logo Link block (line 199-230) — termasuk Image imports
- Sidebar Toggle Button block (line 232-260)
- `FastArrowLeft`, `FastArrowRight` dari imports
- `Image` import dari `next/image`
- `Link` import dari `next/link`

**Pertahankan:**
- `onToggleSidebar` di props (dipakai di `handlePanelClick` untuk auto-expand)
- `isSidebarCollapsed` di props (dipakai di `handlePanelClick`)
- Seluruh panel navigation items
- Keyboard navigation logic

**Step 2: Update nav className**

Tambah `pt-2` ke nav karena logo tidak ada lagi:

```tsx
<nav
  className={cn(
    "flex flex-col items-center py-2 gap-1",
    "w-[var(--activity-bar-width)] min-w-[48px]",
    "border-r border-border/50 bg-sidebar"
  )}
>
  {/* Panel Navigation Items — langsung tanpa logo/toggle */}
  <div role="tablist" ...>
    {panelItems.map(...)}
  </div>
</nav>
```

**Step 3: Verify**

Run: `npm run dev`
- Verify: ActivityBar hanya menampilkan 3 panel icons (Chat History, Paper Sessions, Progress)
- Verify: Klik panel icon saat sidebar collapsed → sidebar auto-expand (logic tetap)

**Step 4: Commit**

```bash
git add src/components/chat/shell/ActivityBar.tsx
git commit -m "refactor(chat): remove logo and sidebar toggle from ActivityBar — moved to TopBar"
```

---

### Task 10: Modify ChatSidebar — Remove Brand Header

**Files:**
- Modify: `src/components/chat/ChatSidebar.tsx`

**Context:**
Brand header (logo image + SegmentBadge) sudah pindah ke TopBar. Sidebar mulai langsung dari content (New Chat button / panel content).

**Step 1: Remove brand header block**

Di `src/components/chat/ChatSidebar.tsx`, hapus:

```tsx
// Hapus block ini (line 128-149):
{/* Brand Header — visible for all panels */}
<div className="flex items-center gap-2 px-4 pt-3 pb-2 shrink-0">
  <Image ... />
  <Image ... />
  {user && <SegmentBadge ... />}
</div>
```

Hapus juga imports yang tidak lagi dipakai:
- `Image` dari `next/image`
- `SegmentBadge` dari `@/components/ui/SegmentBadge`
- `getEffectiveTier` dari `@/lib/utils/subscription` (jika hanya dipakai untuk SegmentBadge — cek `showUpgradeCTA` masih pakai)

**CATATAN:** `getEffectiveTier` masih dipakai di `showUpgradeCTA` (line 87-88), jadi **jangan hapus** import-nya.

**Step 2: Verify**

Run: `npm run dev`
- Verify: Sidebar tidak ada logo "Makalah" + PRO badge lagi
- Verify: Sidebar langsung mulai dari "Percakapan Baru" button (chat-history) atau panel header (paper/progress)
- Verify: Upgrade CTA di footer tetap ada untuk non-PRO users

**Step 3: Commit**

```bash
git add src/components/chat/ChatSidebar.tsx
git commit -m "refactor(chat): remove brand header from ChatSidebar — moved to TopBar"
```

---

## Phase 4: Cleanup

---

### Task 11: Deprecate ShellHeader + Clean Up Unused Code

**Files:**
- Delete or deprecate: `src/components/chat/shell/ShellHeader.tsx`
- Modify: `src/components/chat/layout/ChatLayout.tsx` (verify no remaining imports)

**Context:**
ShellHeader sudah sepenuhnya digantikan oleh TopBar. Semua fungsinya (notification, theme, panel toggle, user dropdown) sudah ada di TopBar.

**Step 1: Verify ShellHeader is not imported anywhere**

Run: `grep -r "ShellHeader" src/ --include="*.tsx" --include="*.ts"`
Expected: Hanya muncul di file ShellHeader.tsx sendiri (dan mungkin barrel exports)

**Step 2: Delete ShellHeader if no references**

```bash
rm src/components/chat/shell/ShellHeader.tsx
```

**Step 3: Verify ChatTabs usage**

Run: `grep -r "ChatTabs" src/ --include="*.tsx" --include="*.ts"`

Jika ChatTabs tidak lagi di-import di manapun, file bisa di-retire (tapi **jangan hapus dulu** — mungkin ada referensi di tests atau documentation).

**Step 4: Verify useTabState usage**

Run: `grep -r "useTabState" src/ --include="*.tsx" --include="*.ts"`

Jika useTabState tidak lagi dipakai (karena conversation tab management dihapus), pertimbangkan untuk menandai sebagai deprecated. **Jangan hapus** karena mungkin dipakai kembali.

**Step 5: Verify the full app**

Run: `npm run dev`
- Full E2E check:
  - `/chat` start state: TopBar visible, ChatInput persistent, no ChatTabs
  - Navigate ke conversation: Messages visible, full height, no ShellHeader
  - Open Paper Sessions → click artifact: Opens as tab in ArtifactPanel
  - Open multiple artifacts: Multiple tabs, switchable
  - Close artifact tab: Switches to neighbor
  - Panel toggle in TopBar: Works (disabled when no artifacts)
  - Sidebar toggle in TopBar: Works
  - Theme toggle: Works
  - Notification dropdown: Works
  - User dropdown: Works
  - Mobile view: Sheet sidebar still works

Run: `npm run build`
Expected: Build passes with no errors

**Step 6: Commit**

```bash
git add -A
git commit -m "chore(chat): remove deprecated ShellHeader — fully replaced by TopBar"
```

---

## Verification Checklist

Setelah semua task selesai, verifikasi:

- [ ] TopBar: Logo icon, tier badge, sidebar toggle (left) + notification, theme, panel toggle, user dropdown (right)
- [ ] TopBar: Panel toggle disabled saat tidak ada artifact
- [ ] TopBar: Panel toggle enabled + count badge saat ada artifact
- [ ] Main area: Tidak ada ChatTabs, tidak ada ShellHeader
- [ ] ChatWindow: ChatInput visible di start state (`/chat`)
- [ ] ChatWindow: ChatInput visible di active state (`/chat/[id]`)
- [ ] ArtifactPanel: Tab bar muncul saat ada artifact terbuka
- [ ] ArtifactPanel: Multiple tabs bisa dibuka
- [ ] ArtifactPanel: Tab switching mengubah ArtifactViewer content
- [ ] ArtifactPanel: Close tab (×) bekerja
- [ ] ArtifactPanel: Toolbar row (metadata kiri, actions kanan) visible
- [ ] ArtifactPanel: Download, Edit, Refrasa, Copy, Expand actions bekerja
- [ ] Sidebar: Tidak ada brand header (logo + badge)
- [ ] Sidebar: Paper Sessions → klik artifact → buka sebagai tab di panel
- [ ] ActivityBar: Hanya panel icons (no logo, no sidebar toggle)
- [ ] Mobile: Sheet sidebar tetap berfungsi
- [ ] Light mode: Semua elemen visible dan readable
- [ ] Dark mode: Semua elemen visible dan readable
- [ ] `npm run build`: No errors
- [ ] `npm run lint`: No new lint errors

---

## File Impact Summary

| Action | File | Task |
|--------|------|------|
| **Create** | `src/lib/hooks/useArtifactTabs.ts` | 1 |
| **Create** | `src/components/chat/shell/TopBar.tsx` | 2 |
| **Create** | `src/components/chat/ArtifactTabs.tsx` | 3 |
| **Create** | `src/components/chat/ArtifactToolbar.tsx` | 4 |
| **Modify** | `src/components/chat/ChatWindow.tsx` | 5 |
| **Modify** | `src/components/chat/ArtifactPanel.tsx` | 6 |
| **Modify** | `src/components/chat/ChatContainer.tsx` | 7 |
| **Modify** | `src/components/chat/layout/ChatLayout.tsx` | 8 |
| **Modify** | `src/components/chat/shell/ActivityBar.tsx` | 9 |
| **Modify** | `src/components/chat/ChatSidebar.tsx` | 10 |
| **Delete** | `src/components/chat/shell/ShellHeader.tsx` | 11 |

**Total: 4 create, 6 modify, 1 delete = 11 files**
