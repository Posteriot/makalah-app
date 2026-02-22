# AI Ops Admin Panel Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure `/ai-ops` from single-scroll layout to sidebar + tabbed content matching admin panel style.

**Architecture:** Create config-driven tab system (mirror `adminPanelConfig.ts`), sidebar component (mirror `AdminSidebar.tsx`), content router (mirror `AdminContentSection.tsx`), and rewrite container as shell grid. All 13 existing panel components reused as-is. Styling tokens hardcoded from admin panel — NOT from globals.css.

**Tech Stack:** Next.js App Router, React 19, Convex `useQuery`, Tailwind CSS 4, Iconoir icons, `useSearchParams` for URL sync.

**Design doc:** `docs/plans/2026-02-23-ai-ops-admin-panel-redesign-design.md`

---

### Task 1: Create `aiOpsConfig.ts` — Tab Configuration

**Files:**
- Create: `src/components/ai-ops/aiOpsConfig.ts`

**Reference:** Read `src/components/admin/adminPanelConfig.ts` for the exact pattern.

**Step 1: Create the config file**

```typescript
import {
  Activity,
  Brain,
  Code,
  Dashboard,
  List,
  Page,
  StatsReport,
  Timer,
  WarningTriangle,
} from "iconoir-react"
import type { ComponentType, SVGProps } from "react"

type IconoirIcon = ComponentType<SVGProps<SVGSVGElement>>

export interface AiOpsSidebarChild {
  id: string
  label: string
  icon: IconoirIcon
  headerTitle: string
  headerDescription: string
  headerIcon: IconoirIcon
}

export interface AiOpsSidebarItem {
  id: string
  label: string
  icon: IconoirIcon
  headerTitle: string
  headerDescription: string
  headerIcon: IconoirIcon
  children?: AiOpsSidebarChild[]
  defaultChildId?: string
}

export const AI_OPS_SIDEBAR_ITEMS: AiOpsSidebarItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Dashboard,
    headerTitle: "AI Ops Dashboard",
    headerDescription: "Ringkasan kesehatan paper workflow dan model AI",
    headerIcon: Dashboard,
  },
  {
    id: "paper",
    label: "Paper Workflow",
    icon: Page,
    headerTitle: "Paper Workflow",
    headerDescription: "Observability paper sessions, memory, dan artefak",
    headerIcon: Page,
    defaultChildId: "paper.sessions",
    children: [
      {
        id: "paper.sessions",
        label: "Sesi",
        icon: List,
        headerTitle: "Sesi Paper",
        headerDescription: "Daftar sesi paper workflow dan detail per sesi",
        headerIcon: List,
      },
      {
        id: "paper.memory",
        label: "Memory",
        icon: Brain,
        headerTitle: "Memory Health",
        headerDescription: "Kesehatan memory digest dan dropped keys",
        headerIcon: Brain,
      },
      {
        id: "paper.artifacts",
        label: "Artefak",
        icon: Code,
        headerTitle: "Artifact Sync",
        headerDescription: "Status sinkronisasi artefak paper",
        headerIcon: Code,
      },
    ],
  },
  {
    id: "model",
    label: "Model Health",
    icon: Activity,
    headerTitle: "Model Health",
    headerDescription: "Monitoring kesehatan provider AI, tool, dan latensi",
    headerIcon: Activity,
    defaultChildId: "model.overview",
    children: [
      {
        id: "model.overview",
        label: "Ringkasan",
        icon: StatsReport,
        headerTitle: "Ringkasan Model",
        headerDescription: "Overview stats dan kesehatan per provider",
        headerIcon: StatsReport,
      },
      {
        id: "model.tools",
        label: "Tool & Latensi",
        icon: Timer,
        headerTitle: "Tool & Latensi",
        headerDescription: "Kesehatan per tool dan distribusi latensi",
        headerIcon: Timer,
      },
      {
        id: "model.failures",
        label: "Kegagalan",
        icon: WarningTriangle,
        headerTitle: "Kegagalan & Failover",
        headerDescription: "Riwayat kegagalan dan timeline perpindahan server",
        headerIcon: WarningTriangle,
      },
    ],
  },
]

export type AiOpsTabId =
  | "overview"
  | "paper.sessions"
  | "paper.memory"
  | "paper.artifacts"
  | "model.overview"
  | "model.tools"
  | "model.failures"

export function findAiOpsTabConfig(
  tabId: string
): AiOpsSidebarItem | AiOpsSidebarChild | undefined {
  for (const item of AI_OPS_SIDEBAR_ITEMS) {
    if (item.id === tabId) return item
    if (item.children) {
      const child = item.children.find((c) => c.id === tabId)
      if (child) return child
    }
  }
  return undefined
}

export function resolveAiOpsTabId(tabId: string): AiOpsTabId {
  const item = AI_OPS_SIDEBAR_ITEMS.find((i) => i.id === tabId)
  if (item?.defaultChildId) {
    return item.defaultChildId as AiOpsTabId
  }
  return tabId as AiOpsTabId
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to `aiOpsConfig.ts`

**Step 3: Commit**

```bash
git add src/components/ai-ops/aiOpsConfig.ts
git commit -m "feat(ai-ops): add tab configuration for admin panel redesign"
```

---

### Task 2: Create `AiOpsSidebar.tsx` — Sidebar Component

**Files:**
- Create: `src/components/ai-ops/AiOpsSidebar.tsx`

**Reference:** Read `src/components/admin/AdminSidebar.tsx` for the exact pattern. Copy the structure but use `AI_OPS_SIDEBAR_ITEMS` and `AiOpsTabId`. Hardcode the same styling tokens.

**Step 1: Create the sidebar file**

```typescript
"use client"

import Link from "next/link"
import { NavArrowRight } from "iconoir-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { AI_OPS_SIDEBAR_ITEMS, type AiOpsTabId } from "./aiOpsConfig"

type AiOpsSidebarProps = {
  activeTab: AiOpsTabId
  onTabChange: (tab: AiOpsTabId) => void
}

type AiOpsMobileSidebarProps = AiOpsSidebarProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SidebarNav({
  activeTab,
  onTabChange,
  closeAfterSelect,
}: AiOpsSidebarProps & { closeAfterSelect?: () => void }) {
  return (
    <nav className="space-y-6">
      <div>
        <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          AI OPS
        </h3>
        <ul className="mt-3 space-y-1">
          {AI_OPS_SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const isParentActive =
              item.children && activeTab.startsWith(item.id + ".")

            const itemClasses = cn(
              "font-mono text-sm flex w-full items-center gap-3 rounded-[8px] px-3 py-2 transition-colors",
              isActive || isParentActive
                ? "bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
                : "text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50"
            )

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    const targetId = item.defaultChildId ?? item.id
                    onTabChange(targetId as AiOpsTabId)
                    if (!item.children) {
                      closeAfterSelect?.()
                    }
                  }}
                  className={itemClasses}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-left">
                    {item.label}
                  </span>
                  {(isActive || isParentActive) && (
                    <NavArrowRight className="h-4 w-4 shrink-0" />
                  )}
                </button>

                {item.children && isParentActive && (
                  <ul className="ml-7 mt-1 space-y-0.5 border-l border-border pl-3">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon
                      const isChildActive = activeTab === child.id

                      return (
                        <li key={child.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onTabChange(child.id as AiOpsTabId)
                              closeAfterSelect?.()
                            }}
                            className={cn(
                              "font-mono text-xs flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 transition-colors",
                              isChildActive
                                ? "text-foreground font-medium"
                                : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                            <span className="flex-1 truncate text-left">
                              {child.label}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </div>

      {/* Back link */}
      <div className="border-t border-border pt-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          ← Admin Panel
        </Link>
      </div>
    </nav>
  )
}

export function AiOpsSidebar({ activeTab, onTabChange }: AiOpsSidebarProps) {
  return (
    <aside className="hidden md:col-span-4 md:block">
      <div className="mt-4 rounded-[16px] border-[0.5px] border-border bg-card/90 p-[16px] backdrop-blur-[1px] dark:bg-slate-900">
        <SidebarNav activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </aside>
  )
}

export function AiOpsMobileSidebar({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
}: AiOpsMobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="font-mono text-sm font-medium text-foreground">
            AI Ops Menu
          </SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-5 py-5">
          <SidebarNav
            activeTab={activeTab}
            onTabChange={onTabChange}
            closeAfterSelect={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/components/ai-ops/AiOpsSidebar.tsx
git commit -m "feat(ai-ops): add sidebar component for admin panel layout"
```

---

### Task 3: Create `AiOpsContentSection.tsx` — Content Router

**Files:**
- Create: `src/components/ai-ops/AiOpsContentSection.tsx`

**Reference:** Read `src/components/admin/AdminContentSection.tsx` for the pattern. This component renders the header + routes to correct content based on active tab. It also manages query fetching with `"skip"` for inactive tabs.

**Step 1: Create the content section file**

```typescript
"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { cn } from "@/lib/utils"
import { AI_OPS_SIDEBAR_ITEMS, findAiOpsTabConfig, type AiOpsTabId } from "./aiOpsConfig"

// Existing panels — reused as-is
import { MemoryHealthPanel } from "./panels/MemoryHealthPanel"
import { WorkflowProgressPanel } from "./panels/WorkflowProgressPanel"
import { ArtifactSyncPanel } from "./panels/ArtifactSyncPanel"
import { InsightBanner } from "./panels/InsightBanner"
import { SessionListPanel } from "./panels/SessionListPanel"
import { DroppedKeysPanel } from "./panels/DroppedKeysPanel"
import { OverviewStatsPanel } from "./panels/OverviewStatsPanel"
import { ProviderHealthPanel } from "./panels/ProviderHealthPanel"
import { ToolHealthPanel } from "./panels/ToolHealthPanel"
import { LatencyDistributionPanel } from "./panels/LatencyDistributionPanel"
import { RecentFailuresPanel } from "./panels/RecentFailuresPanel"
import { FailoverTimelinePanel } from "./panels/FailoverTimelinePanel"

type Period = "1h" | "24h" | "7d"

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "1h", label: "1j" },
  { value: "24h", label: "24j" },
  { value: "7d", label: "7h" },
]

type AiOpsContentSectionProps = {
  activeTab: AiOpsTabId
  userId: Id<"users">
}

export function AiOpsContentSection({
  activeTab,
  userId,
}: AiOpsContentSectionProps) {
  const [period, setPeriod] = useState<Period>("24h")

  const currentTab =
    findAiOpsTabConfig(activeTab) ?? AI_OPS_SIDEBAR_ITEMS[0]
  const HeaderIcon = currentTab.headerIcon

  const isModelTab = activeTab.startsWith("model.")

  // ── Paper workflow queries (skip when not on relevant tab) ──
  const isOverview = activeTab === "overview"
  const isPaperTab = activeTab.startsWith("paper.") || isOverview

  const memoryHealth = useQuery(
    api.aiOps.getMemoryHealthStats,
    isPaperTab || isOverview ? {} : "skip"
  )
  const workflowProgress = useQuery(
    api.aiOps.getWorkflowProgressStats,
    isOverview || activeTab === "paper.sessions" ? {} : "skip"
  )
  const artifactSync = useQuery(
    api.aiOps.getArtifactSyncStats,
    isOverview || activeTab === "paper.artifacts" ? {} : "skip"
  )
  const sessions = useQuery(
    api.aiOps.getSessionList,
    activeTab === "paper.sessions" ? { limit: 20 } : "skip"
  )
  const droppedKeys = useQuery(
    api.aiOps.getDroppedKeysAggregation,
    activeTab === "paper.memory" ? {} : "skip"
  )

  // ── Model health queries (skip when not on model tab) ──
  const overviewStats = useQuery(
    api.aiTelemetry.getOverviewStats,
    activeTab === "model.overview"
      ? { requestorUserId: userId, period }
      : "skip"
  )
  const providerHealth = useQuery(
    api.aiTelemetry.getProviderHealth,
    activeTab === "model.overview"
      ? { requestorUserId: userId, period }
      : "skip"
  )
  const toolHealth = useQuery(
    api.aiTelemetry.getToolHealth,
    activeTab === "model.tools"
      ? { requestorUserId: userId, period }
      : "skip"
  )
  const latencyDistribution = useQuery(
    api.aiTelemetry.getLatencyDistribution,
    activeTab === "model.tools"
      ? { requestorUserId: userId, period }
      : "skip"
  )
  const recentFailures = useQuery(
    api.aiTelemetry.getRecentFailures,
    activeTab === "model.failures"
      ? { requestorUserId: userId, limit: 20 }
      : "skip"
  )
  const failoverTimeline = useQuery(
    api.aiTelemetry.getFailoverTimeline,
    activeTab === "model.failures"
      ? { requestorUserId: userId, period }
      : "skip"
  )

  return (
    <main className="col-span-1 pt-4 md:col-span-12">
      <div className="mx-auto w-full max-w-4xl rounded-[16px] border-[0.5px] border-border bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="space-y-2">
            <h1 className="flex items-center gap-2 text-2xl font-medium tracking-tight text-foreground">
              <HeaderIcon className="h-6 w-6 text-foreground" />
              {currentTab.headerTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {currentTab.headerDescription}
            </p>
          </div>

          {/* Period toggle — only on model tabs */}
          {isModelTab && (
            <div className="flex items-center gap-1 rounded-[8px] border border-border p-0.5">
              {PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setPeriod(opt.value)}
                  className={cn(
                    "rounded-[8px] px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest transition-colors",
                    period === opt.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Tab: Overview ── */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <MemoryHealthPanel data={memoryHealth} />
              <WorkflowProgressPanel data={workflowProgress} />
              <ArtifactSyncPanel data={artifactSync} />
            </div>
            <InsightBanner
              memoryHealth={memoryHealth}
              workflowProgress={workflowProgress}
              artifactSync={artifactSync}
            />
          </div>
        )}

        {/* ── Tab: Paper > Sesi ── */}
        {activeTab === "paper.sessions" && (
          <SessionListPanel sessions={sessions} />
        )}

        {/* ── Tab: Paper > Memory ── */}
        {activeTab === "paper.memory" && (
          <div className="space-y-6">
            <MemoryHealthPanel data={memoryHealth} />
            <DroppedKeysPanel data={droppedKeys} />
          </div>
        )}

        {/* ── Tab: Paper > Artefak ── */}
        {activeTab === "paper.artifacts" && (
          <ArtifactSyncPanel data={artifactSync} />
        )}

        {/* ── Tab: Model > Ringkasan ── */}
        {activeTab === "model.overview" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <OverviewStatsPanel data={overviewStats ?? undefined} />
            <ProviderHealthPanel data={providerHealth ?? undefined} />
          </div>
        )}

        {/* ── Tab: Model > Tool & Latensi ── */}
        {activeTab === "model.tools" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ToolHealthPanel data={toolHealth ?? undefined} />
            <LatencyDistributionPanel data={latencyDistribution ?? undefined} />
          </div>
        )}

        {/* ── Tab: Model > Kegagalan ── */}
        {activeTab === "model.failures" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <RecentFailuresPanel data={recentFailures ?? undefined} />
            <FailoverTimelinePanel data={failoverTimeline ?? undefined} />
          </div>
        )}
      </div>
    </main>
  )
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/components/ai-ops/AiOpsContentSection.tsx
git commit -m "feat(ai-ops): add content section with tab routing and lazy queries"
```

---

### Task 4: Rewrite `AiOpsContainer.tsx` — Shell Grid Layout

**Files:**
- Modify: `src/components/ai-ops/AiOpsContainer.tsx`

**Reference:** Read `src/components/admin/AdminPanelContainer.tsx` for the shell grid pattern.

**Step 1: Rewrite the container**

Replace the entire file content with:

```typescript
"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { SidebarExpand, SidebarCollapse } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import { AiOpsContentSection } from "./AiOpsContentSection"
import { AiOpsSidebar, AiOpsMobileSidebar } from "./AiOpsSidebar"
import { type AiOpsTabId, resolveAiOpsTabId } from "./aiOpsConfig"

interface AiOpsContainerProps {
  userId: Id<"users">
}

export function AiOpsContainer({ userId }: AiOpsContainerProps) {
  const searchParams = useSearchParams()
  const tabParam = resolveAiOpsTabId(searchParams.get("tab") ?? "overview")
  const [activeTab, setActiveTab] = useState<AiOpsTabId>(tabParam)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Sync activeTab when URL ?tab= param changes
  useEffect(() => {
    setActiveTab(tabParam)
  }, [tabParam])

  // Update URL when tab changes (without full navigation)
  const handleTabChange = (tab: AiOpsTabId) => {
    setActiveTab(tab)
    const url = tab === "overview" ? "/ai-ops" : `/ai-ops?tab=${tab}`
    window.history.replaceState(null, "", url)
  }

  return (
    <div className="relative isolate left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-[color:var(--section-bg-alt)]">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 lg:px-8">
        <div className="flex justify-end py-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Tutup menu" : "Buka menu"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] p-1 text-foreground transition-colors hover:text-foreground/70"
          >
            {sidebarOpen ? (
              <SidebarCollapse className="h-7 w-7" strokeWidth={1.5} />
            ) : (
              <SidebarExpand className="h-7 w-7" strokeWidth={1.5} />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-[16px] pb-2 md:grid-cols-16">
          <AiOpsSidebar activeTab={activeTab} onTabChange={handleTabChange} />
          <AiOpsContentSection activeTab={activeTab} userId={userId} />
        </div>
      </div>

      <AiOpsMobileSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />
    </div>
  )
}
```

**Step 2: Update `page.tsx` to pass userId**

Modify `src/app/(dashboard)/ai-ops/page.tsx` — the container now needs `userId`:

```typescript
"use client"

import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { AiOpsContainer } from "@/components/ai-ops/AiOpsContainer"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WarningCircle } from "iconoir-react"

export default function AiOpsPage() {
  const { user, isLoading } = useCurrentUser()

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-mono">Memuat AI Ops...</p>
        </div>
      </div>
    )
  }

  const isAdmin = user.role === "admin" || user.role === "superadmin"

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Alert variant="destructive">
          <WarningCircle className="h-4 w-4" />
          <AlertTitle>Akses Ditolak</AlertTitle>
          <AlertDescription>
            Halaman ini hanya dapat diakses oleh Admin atau Superadmin.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <AiOpsContainer userId={user._id} />
}
```

**Step 3: Delete `ModelHealthSection.tsx`**

Delete `src/components/ai-ops/ModelHealthSection.tsx` — its functionality is now in `AiOpsContentSection.tsx`.

**Step 4: Verify build passes**

Run: `npm run build`
Expected: Build succeeds without errors.

**Step 5: Commit**

```bash
git add src/components/ai-ops/AiOpsContainer.tsx src/app/\(dashboard\)/ai-ops/page.tsx
git rm src/components/ai-ops/ModelHealthSection.tsx
git commit -m "feat(ai-ops): rewrite container as admin panel shell with sidebar + tabbed content"
```

---

### Task 5: Visual Verification & Polish

**Step 1: Start dev servers**

```bash
npm run dev       # Terminal 1
npm run convex:dev # Terminal 2
```

**Step 2: Verify Overview tab**

Go to `/ai-ops`. Expected:
- Sidebar on left with 3 groups (Overview, Paper Workflow, Model Health)
- Content on right showing 3-col stats + InsightBanner
- DottedPattern background
- "← Admin Panel" link in sidebar

**Step 3: Verify Paper tabs**

Click "Paper Workflow" → should expand children. Click "Sesi" → session list. Click "Memory" → memory health + dropped keys. Click "Artefak" → artifact sync.

**Step 4: Verify Model Health tabs**

Click "Model Health" → should expand children. Click "Ringkasan" → overview stats + provider health with period toggle in header. Click "Tool & Latensi" → tool health + latency. Click "Kegagalan" → failures + failover timeline.

**Step 5: Verify URL sync**

- Navigate to `/ai-ops?tab=model.tools` directly. Expected: Tool & Latensi tab active.
- Click tabs and verify URL updates.

**Step 6: Verify mobile**

Resize to mobile width. Expected: Sidebar hidden, hamburger button visible. Click → Sheet opens with nav.

**Step 7: Verify admin dashboard link**

Go to `/dashboard`, click "Buka AI Ops". Expected: navigates to `/ai-ops` showing Overview tab.

**Step 8: Commit any polish fixes**

```bash
git add -A
git commit -m "fix(ai-ops): visual polish after admin panel redesign"
```
