# Settings Fullpage Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign halaman Settings dari card-based centered layout ke fullpage layout yang mirror arsitektur Admin Panel.

**Architecture:** Pindahkan route dari `(account)/settings` ke `(dashboard)/settings`. Buat 3 komponen baru (SettingsContainer, SettingsSidebar, SettingsContentSection) + config file yang mirror pola admin panel. Tab content components (ProfileTab, SecurityTab, StatusTab) tetap dipakai tanpa perubahan logic.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Sheet), Iconoir icons

---

### Task 1: Create settingsConfig.ts

**Files:**
- Create: `src/components/settings/settingsConfig.ts`
- Reference: `src/components/admin/adminPanelConfig.ts`

**Step 1: Create config file**

```ts
import {
  BadgeCheck,
  Shield,
  User as UserIcon,
} from "iconoir-react"
import type { ComponentType, SVGProps } from "react"

type IconoirIcon = ComponentType<SVGProps<SVGSVGElement>>

export interface SettingsSidebarItem {
  id: string
  label: string
  icon: IconoirIcon
  headerTitle: string
  headerDescription: string
  headerIcon: IconoirIcon
}

export const SETTINGS_SIDEBAR_ITEMS: SettingsSidebarItem[] = [
  {
    id: "profile",
    label: "Profil",
    icon: UserIcon,
    headerTitle: "Profil",
    headerDescription: "Atur nama dan avatar akun Anda.",
    headerIcon: UserIcon,
  },
  {
    id: "security",
    label: "Keamanan",
    icon: Shield,
    headerTitle: "Keamanan",
    headerDescription: "Update password dan kontrol sesi.",
    headerIcon: Shield,
  },
  {
    id: "status",
    label: "Status Akun",
    icon: BadgeCheck,
    headerTitle: "Status Akun",
    headerDescription: "Ringkasan akses akun Anda di Makalah AI.",
    headerIcon: BadgeCheck,
  },
]

export type SettingsTabId = "profile" | "security" | "status"

const VALID_TABS: SettingsTabId[] = ["profile", "security", "status"]

export function resolveSettingsTab(tabParam: string | null): SettingsTabId {
  if (tabParam && VALID_TABS.includes(tabParam as SettingsTabId)) {
    return tabParam as SettingsTabId
  }
  return "profile"
}

export function findSettingsTabConfig(
  tabId: string
): SettingsSidebarItem | undefined {
  return SETTINGS_SIDEBAR_ITEMS.find((item) => item.id === tabId)
}
```

**Step 2: Commit**

```bash
git add src/components/settings/settingsConfig.ts
git commit -m "feat(settings): add settings tab config"
```

---

### Task 2: Create SettingsSidebar.tsx

**Files:**
- Create: `src/components/settings/SettingsSidebar.tsx`
- Reference: `src/components/admin/AdminSidebar.tsx`

**Step 1: Create sidebar component**

Mirror `AdminSidebar` structure. Desktop = `aside col-span-4` with nav. Mobile = `Sheet` slide-in.

```tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { SETTINGS_SIDEBAR_ITEMS, type SettingsTabId } from "./settingsConfig"

type SettingsSidebarProps = {
  activeTab: SettingsTabId
  onTabChange: (tab: SettingsTabId) => void
}

type SettingsMobileSidebarProps = SettingsSidebarProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SidebarNav({
  activeTab,
  onTabChange,
  closeAfterSelect,
}: SettingsSidebarProps & { closeAfterSelect?: () => void }) {
  return (
    <nav className="space-y-6">
      <div>
        <h3 className="text-signal text-[10px] font-bold text-muted-foreground">
          PENGATURAN AKUN
        </h3>
        <ul className="mt-3 space-y-1">
          {SETTINGS_SIDEBAR_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => {
                    onTabChange(item.id as SettingsTabId)
                    closeAfterSelect?.()
                  }}
                  className={cn(
                    "text-interface flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition-colors",
                    isActive
                      ? "bg-slate-900/60 text-slate-100 dark:bg-slate-200/10 dark:text-slate-100"
                      : "text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate text-left">
                    {item.label}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}

export function SettingsSidebar({ activeTab, onTabChange }: SettingsSidebarProps) {
  return (
    <aside className="hidden md:col-span-4 md:block">
      <div className="mt-4 rounded-shell border-hairline bg-card/90 p-comfort backdrop-blur-[1px] dark:bg-slate-900">
        <SidebarNav activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </aside>
  )
}

export function SettingsMobileSidebar({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
}: SettingsMobileSidebarProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-72 p-0">
        <SheetHeader className="border-b border-border px-5 py-4 pr-12">
          <SheetTitle className="text-interface font-mono text-sm font-medium text-foreground">
            Pengaturan Akun
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

**Step 2: Commit**

```bash
git add src/components/settings/SettingsSidebar.tsx
git commit -m "feat(settings): add settings sidebar with mobile sheet"
```

---

### Task 3: Create SettingsContentSection.tsx

**Files:**
- Create: `src/components/settings/SettingsContentSection.tsx`
- Reference: `src/components/admin/AdminContentSection.tsx`

**Step 1: Create content section component**

```tsx
"use client"

import { useSession } from "@/lib/auth-client"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { SETTINGS_SIDEBAR_ITEMS, findSettingsTabConfig, type SettingsTabId } from "./settingsConfig"
import { ProfileTab } from "./ProfileTab"
import { SecurityTab } from "./SecurityTab"
import { StatusTab } from "./StatusTab"

type SettingsContentSectionProps = {
  activeTab: SettingsTabId
}

export function SettingsContentSection({ activeTab }: SettingsContentSectionProps) {
  const { data: session, isPending } = useSession()
  const { user: convexUser, isLoading: isConvexLoading } = useCurrentUser()

  const currentTab = findSettingsTabConfig(activeTab) ?? SETTINGS_SIDEBAR_ITEMS[0]
  const HeaderIcon = currentTab.headerIcon
  const primaryEmail = convexUser?.email ?? session?.user?.email ?? ""

  return (
    <main className="col-span-1 pt-4 md:col-span-12">
      <div className="mx-auto w-full max-w-4xl rounded-shell border-hairline bg-card/90 px-5 py-6 backdrop-blur-[1px] dark:bg-slate-900 md:px-8">
        <div className="mb-6 space-y-2">
          <h1 className="text-narrative flex items-center gap-2 text-2xl font-medium tracking-tight text-foreground md:text-3xl">
            <HeaderIcon className="h-6 w-6 text-foreground" />
            {currentTab.headerTitle}
          </h1>
          <p className="text-narrative text-sm text-muted-foreground">
            {currentTab.headerDescription}
          </p>
        </div>

        {isPending && (
          <div className="text-interface text-sm text-muted-foreground">Memuat...</div>
        )}

        {activeTab === "profile" && (
          <ProfileTab
            convexUser={convexUser}
            session={session}
            isLoading={isConvexLoading || isPending}
          />
        )}

        {activeTab === "security" && (
          <SecurityTab
            session={session}
            isLoading={isConvexLoading || isPending}
          />
        )}

        {activeTab === "status" && (
          <StatusTab
            primaryEmail={primaryEmail}
            convexUser={convexUser}
            isConvexLoading={isConvexLoading}
          />
        )}
      </div>
    </main>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/settings/SettingsContentSection.tsx
git commit -m "feat(settings): add settings content section with tab routing"
```

---

### Task 4: Create SettingsContainer.tsx

**Files:**
- Create: `src/components/settings/SettingsContainer.tsx`
- Reference: `src/components/admin/AdminPanelContainer.tsx`

**Step 1: Create container component**

```tsx
"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { SidebarExpand, SidebarCollapse } from "iconoir-react"
import { DottedPattern } from "@/components/marketing/SectionBackground"
import { SettingsContentSection } from "./SettingsContentSection"
import { SettingsSidebar, SettingsMobileSidebar } from "./SettingsSidebar"
import { type SettingsTabId, resolveSettingsTab } from "./settingsConfig"

export function SettingsContainer() {
  const searchParams = useSearchParams()
  const tabParam = resolveSettingsTab(searchParams.get("tab"))
  const [activeTab, setActiveTab] = useState<SettingsTabId>(tabParam)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setActiveTab(tabParam)
  }, [tabParam])

  return (
    <div className="admin-container relative isolate left-1/2 right-1/2 w-screen -translate-x-1/2 overflow-hidden bg-background">
      <DottedPattern spacing={24} withRadialMask={false} className="z-0 opacity-100" />
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-6 lg:px-8">
        <div className="md:hidden flex justify-end py-3">
          <button
            type="button"
            onClick={() => setSidebarOpen((open) => !open)}
            aria-label={sidebarOpen ? "Tutup menu pengaturan" : "Buka menu pengaturan"}
            className="focus-ring inline-flex h-9 w-9 items-center justify-center rounded-action p-1 text-foreground transition-colors hover:text-foreground/70"
          >
            {sidebarOpen ? (
              <SidebarCollapse className="h-7 w-7" strokeWidth={1.5} />
            ) : (
              <SidebarExpand className="h-7 w-7" strokeWidth={1.5} />
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 gap-comfort pb-2 md:grid-cols-16">
          <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />
          <SettingsContentSection activeTab={activeTab} />
        </div>
      </div>

      <SettingsMobileSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/settings/SettingsContainer.tsx
git commit -m "feat(settings): add settings container with fullpage layout"
```

---

### Task 5: Create new settings page and delete old route

**Files:**
- Create: `src/app/(dashboard)/settings/page.tsx`
- Delete: `src/app/(account)/settings/page.tsx`
- Delete: `src/app/(account)/layout.tsx`

**Step 1: Create new settings page**

```tsx
"use client"

import { Suspense } from "react"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { SettingsContainer } from "@/components/settings/SettingsContainer"

export default function SettingsPage() {
  const { user, isLoading } = useCurrentUser()

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-mono">Memuat pengaturan...</p>
        </div>
      </div>
    )
  }

  return (
    <Suspense fallback={<div className="text-interface text-sm text-muted-foreground p-8">Memuat...</div>}>
      <SettingsContainer />
    </Suspense>
  )
}
```

**Step 2: Delete old route files**

```bash
rm src/app/\(account\)/settings/page.tsx
rm src/app/\(account\)/layout.tsx
rmdir src/app/\(account\)/settings
rmdir src/app/\(account\)
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/settings/page.tsx
git add -u src/app/\(account\)/
git commit -m "feat(settings): move settings to dashboard layout, delete old account route"
```

---

### Task 6: Remove duplicate header/description from tab components

**Files:**
- Modify: `src/components/settings/ProfileTab.tsx` — remove top heading block (lines 81-89)
- Modify: `src/components/settings/SecurityTab.tsx` — remove top heading block (lines 220-228)
- Modify: `src/components/settings/StatusTab.tsx` — remove top heading block (lines 27-35)

Each tab currently has its own `<h3>` heading + description at the top (e.g. "Detail — Atur nama dan avatar akun Anda."). These are now redundant because `SettingsContentSection` already renders the header dynamically from config.

**Step 1: Remove heading blocks from all three tabs**

In `ProfileTab.tsx`, remove:
```tsx
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-narrative font-medium text-xl">
          <UserIcon className="h-5 w-5 text-slate-800 dark:text-slate-200" />
          Detail
        </h3>
        <p className="mt-1 text-narrative text-sm text-muted-foreground">
          Atur nama dan avatar akun Anda.
        </p>
      </div>
```

In `SecurityTab.tsx`, remove:
```tsx
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-narrative font-medium text-xl">
          <Shield className="h-5 w-5 text-slate-800 dark:text-slate-200" />
          Keamanan
        </h3>
        <p className="mt-1 text-narrative text-sm text-muted-foreground">
          Update password dan kontrol sesi.
        </p>
      </div>
```

In `StatusTab.tsx`, remove:
```tsx
      <div className="mb-6">
        <h3 className="flex items-center gap-2 text-narrative font-medium text-xl">
          <BadgeCheck className="h-5 w-5 text-slate-800 dark:text-slate-200" />
          Status Akun
        </h3>
        <p className="mt-1 text-narrative text-sm text-muted-foreground">
          Ringkasan akses akun Anda di Makalah AI.
        </p>
      </div>
```

Also remove unused icon imports if they become orphaned after heading removal:
- `ProfileTab.tsx`: Check if `UserIcon` is still used elsewhere (it is — in avatar fallback). Keep it.
- `SecurityTab.tsx`: Check if `Shield` is still used elsewhere. It's only in the heading — remove import.
- `StatusTab.tsx`: Check if `BadgeCheck` is still used elsewhere. It's only in the heading — remove import.

**Step 2: Commit**

```bash
git add src/components/settings/ProfileTab.tsx src/components/settings/SecurityTab.tsx src/components/settings/StatusTab.tsx
git commit -m "refactor(settings): remove duplicate tab headings now in content section"
```

---

### Task 7: Verify build and visual check

**Step 1: Run lint**

```bash
npm run lint
```

Expected: No errors related to settings files.

**Step 2: Run build**

```bash
npm run build
```

Expected: Build succeeds with no type errors.

**Step 3: Manual visual check**

1. Start dev server (`npm run dev` + `npm run convex:dev`)
2. Navigate to `/settings` — should show fullpage layout with DottedPattern, sidebar, content
3. Click each tab (Profil, Keamanan, Status) — content switches correctly
4. Check mobile viewport — hamburger button appears, Sheet drawer works
5. Verify dark mode — colors match admin panel styling
6. Verify GlobalHeader and Footer are visible

**Step 4: Commit any fixes if needed**
