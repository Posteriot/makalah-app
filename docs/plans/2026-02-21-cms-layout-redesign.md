# CMS Layout Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current embedded CMS layout with a full-screen chat-style shell at `/cms` featuring Activity Bar, collapsible sidebar, and full-width editor area.

**Architecture:** Fork & Adapt from ChatLayout. Four new components (CmsShell, CmsActivityBar, CmsTopBar, CmsSidebar) replace ContentManager. PanelResizer moved to shared `ui/`. All existing editor components reused unchanged.

**Tech Stack:** Next.js App Router, React 19, Tailwind CSS 4, Convex (useQuery/useMutation), iconoir-react, PanelResizer (drag-resize)

**Design Doc:** `docs/plans/2026-02-21-cms-layout-redesign-design.md`

---

### Task 1: Move PanelResizer to shared location

PanelResizer is generic (no chat-specific logic). Move it to `src/components/ui/` so both ChatLayout and CmsShell can import it.

**Files:**
- Move: `src/components/chat/layout/PanelResizer.tsx` → `src/components/ui/PanelResizer.tsx`
- Modify: `src/components/chat/layout/ChatLayout.tsx` (update import)

**Step 1: Move the file**

```bash
mv src/components/chat/layout/PanelResizer.tsx src/components/ui/PanelResizer.tsx
```

**Step 2: Update import in ChatLayout.tsx**

In `src/components/chat/layout/ChatLayout.tsx`, change:
```typescript
import { PanelResizer } from "./PanelResizer"
```
to:
```typescript
import { PanelResizer } from "@/components/ui/PanelResizer"
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build passes, no import errors.

**Step 4: Commit**

```bash
git add -A && git commit -m "refactor: move PanelResizer to shared ui/ directory"
```

---

### Task 2: Strip CMS layout to bare shell

Remove GlobalHeader and Footer from the existing `/cms` layout so it becomes a zero-chrome container.

**Files:**
- Modify: `src/app/cms/layout.tsx`

**Step 1: Replace layout content**

Replace entire file with:

```tsx
import type { ReactNode } from "react"

export default function CmsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-dvh bg-background text-foreground">
      {children}
    </div>
  )
}
```

Key change: `h-dvh` (not `min-h-screen`) to fill exactly viewport height. No GlobalHeader, no Footer.

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build passes. Visiting `/cms` shows content without header/footer.

**Step 3: Commit**

```bash
git add src/app/cms/layout.tsx && git commit -m "feat(cms): strip layout to bare shell without header/footer"
```

---

### Task 3: Create CmsActivityBar

Vertical 48px activity bar with page navigation icons. Forked from chat's ActivityBar but with CMS-specific items.

**Files:**
- Create: `src/components/cms/CmsActivityBar.tsx`

**Step 1: Create the component**

Reference `src/components/chat/shell/ActivityBar.tsx` for structure and styling patterns. Key differences from chat ActivityBar:

- Items are CMS pages (not chat panels)
- Two groups: Pages + Global (with visual separator)
- No keyboard arrow navigation needed initially (can add later)

Types and config:

```typescript
export type CmsPageId =
  | "home" | "about" | "documentation" | "blog"
  | "privacy" | "security" | "terms"
  | "header" | "footer"

interface CmsActivityBarProps {
  activePage: CmsPageId | null
  onPageChange: (page: CmsPageId) => void
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
}
```

Page items config array (two groups):

```typescript
const PAGE_ITEMS: Array<{ page: CmsPageId; icon: React.ReactNode; label: string }> = [
  { page: "home", icon: <Home className="h-5 w-5" />, label: "Home" },
  { page: "about", icon: <InfoEmpty className="h-5 w-5" />, label: "About" },
  { page: "documentation", icon: <Book className="h-5 w-5" />, label: "Dokumentasi" },
  { page: "blog", icon: <Journal className="h-5 w-5" />, label: "Blog" },
  { page: "privacy", icon: <Lock className="h-5 w-5" />, label: "Privacy" },
  { page: "security", icon: <Shield className="h-5 w-5" />, label: "Security" },
  { page: "terms", icon: <Page className="h-5 w-5" />, label: "Terms" },
]

const GLOBAL_ITEMS: Array<{ page: CmsPageId; icon: React.ReactNode; label: string }> = [
  { page: "header", icon: <ViewColumns2 className="h-5 w-5" />, label: "Header" },
  { page: "footer", icon: <ViewColumns3 className="h-5 w-5" />, label: "Footer" },
]
```

Icons from `iconoir-react`: `Home`, `InfoEmpty`, `Book`, `Journal`, `Lock`, `Shield`, `Page`, `ViewColumns2`, `ViewColumns3`.

**Structure:**
1. Logo link (`/`) at top — same as chat ActivityBar logo block
2. Page items with Tooltip
3. Separator (`<div className="mx-3 my-2 border-t border-slate-400/30 dark:border-slate-700/60" />`)
4. Global items with Tooltip

**Styling:** Match chat ActivityBar exactly:
- `w-[48px] min-w-[48px]`
- `border-r border-slate-400/20 bg-slate-300 dark:border-slate-700/90 dark:bg-slate-900`
- Active item: `border-slate-400/50 bg-slate-200 text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100`
- Logo: `h-11` with border-b, Image for light/dark logos

**Behavior:** When icon clicked, if sidebar is collapsed → expand it, then call `onPageChange`.

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/cms/CmsActivityBar.tsx && git commit -m "feat(cms): add CmsActivityBar with page navigation icons"
```

---

### Task 4: Create CmsTopBar

Horizontal control bar at top of main content area. Forked from chat's TopBar.

**Files:**
- Create: `src/components/cms/CmsTopBar.tsx`

**Step 1: Create the component**

Reference `src/components/chat/shell/TopBar.tsx`. Strip artifact panel toggle, replace with admin dashboard link.

```typescript
interface CmsTopBarProps {
  isSidebarCollapsed: boolean
  onToggleSidebar: () => void
}
```

**Layout:**
- Left: Expand sidebar button (only when `isSidebarCollapsed`)
  - Icon: `FastArrowRight` from iconoir
  - Same styling as chat TopBar's expand button
- Right: 3 items
  1. Theme toggle (`SunLight`/`HalfMoon`) — same as chat TopBar
  2. Admin Dashboard link — `<Link href="/dashboard">` wrapping a button with `Dashboard` icon from iconoir. Tooltip: "Admin Dashboard". Styled as `w-8 h-8 rounded-action` ghost button, same as theme toggle.
  3. `<UserDropdown variant="compact" />` — reused from `@/components/layout/header`

**Styling:** Same as chat TopBar:
- `flex items-center justify-between pl-4 pr-6 py-0 shrink-0`
- `bg-white dark:bg-slate-900`

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/cms/CmsTopBar.tsx && git commit -m "feat(cms): add CmsTopBar with theme toggle, admin link, and user menu"
```

---

### Task 5: Create CmsSidebar

Dynamic sidebar that renders section lists based on active page. This is the most complex new component.

**Files:**
- Create: `src/components/cms/CmsSidebar.tsx`

**Step 1: Define types**

Reuse section types from ContentManager:

```typescript
type CmsSectionId =
  | "hero" | "benefits" | "features-workflow" | "features-refrasa"
  | "manifesto" | "problems" | "agents" | "career-contact"

// Doc/Blog drill-down handled via separate state, not section IDs
```

```typescript
interface CmsSidebarProps {
  activePage: CmsPageId | null
  activeSection: CmsSectionId | null
  onSectionChange: (section: CmsSectionId) => void
  onCollapse: () => void

  // Documentation drill-down
  selectedDocGroup: string | null
  onDocGroupChange: (group: string | null) => void
  selectedDocSlug: string | null
  onDocSlugChange: (slug: string | null) => void

  // Blog drill-down
  selectedBlogCategory: string | null
  onBlogCategoryChange: (category: string | null) => void
  selectedBlogSlug: string | null
  onBlogSlugChange: (slug: string | null) => void

  userId: Id<"users">
}
```

**Step 2: Implement page-specific section configs**

Static section definitions (same data as ContentManager's `PAGES_NAV`):

```typescript
const HOME_SECTIONS = [
  { id: "hero", label: "Hero" },
  { id: "benefits", label: "Benefits" },
  { id: "features-workflow", label: "Fitur: Workflow" },
  { id: "features-refrasa", label: "Fitur: Refrasa" },
]

const ABOUT_SECTIONS = [
  { id: "manifesto", label: "Manifesto" },
  { id: "problems", label: "Problems" },
  { id: "agents", label: "Agents" },
  { id: "career-contact", label: "Karier & Kontak" },
]

const DOC_GROUPS = ["Mulai", "Fitur Utama", "Subskripsi", "Panduan Lanjutan"]
const BLOG_CATEGORIES = ["Update", "Tutorial", "Opini", "Event"]
```

**Step 3: Implement sidebar rendering**

Sidebar has a header row (page title + collapse chevron `«`), then dynamic content.

**Simple section pages (Home, About):**
- Render list of section items
- Active item: `border-l-2 border-amber-500 bg-muted/30 text-foreground`
- Inactive: `border-l-2 border-transparent text-muted-foreground hover:bg-muted/50`

**Documentation (drill-down):**
- Level 1 (`selectedDocGroup === null`): Show DOC_GROUPS as clickable items with `→` chevron
- Level 2 (`selectedDocGroup !== null`):
  - Back button `← {groupName}` at top
  - `useQuery(api.documentationSections.listAllSections, { requestorId: userId })` filtered by group
  - List items with published dot (green/gray) + title + delete button
  - Click item → `onDocSlugChange(section.slug)`
  - "＋ Tambah Section Baru" button → `onDocSlugChange("__new__")`

**Blog (drill-down):**
- Level 1 (`selectedBlogCategory === null`): Show BLOG_CATEGORIES as clickable items with `→` chevron
- Level 2 (`selectedBlogCategory !== null`):
  - Back button `← {categoryName}` at top
  - `useQuery(api.blog.listAllPosts, { requestorId: userId })` filtered by `normalizeCategory() === category`
  - List items with published dot + title + category badge + delete button
  - Click item → `onBlogSlugChange(post.slug)`
  - "＋ Buat Post Baru" button → `onBlogSlugChange("__new__")`
  - Import `normalizeCategory` from `@/components/marketing/blog/utils`

**Single-page editors (Privacy, Security, Terms, Header, Footer):**
- Show page title only. No section list needed. The editor auto-loads in main content.

**Styling:** Match chat sidebar aesthetic:
- Background: `bg-slate-50 dark:bg-slate-800`
- Items: `text-interface text-sm`, compact padding
- Overflow: `overflow-y-auto` for long lists

**Step 4: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/components/cms/CmsSidebar.tsx && git commit -m "feat(cms): add CmsSidebar with dynamic section list and drill-down"
```

---

### Task 6: Create CmsShell (grid orchestrator)

Top-level component that wires everything together. Renders the CSS grid with all 4 sub-components.

**Files:**
- Create: `src/components/cms/CmsShell.tsx`

**Step 1: Implement CmsShell**

Reference `src/components/chat/layout/ChatLayout.tsx` for grid structure and resize logic.

**State:**

```typescript
const [activePage, setActivePage] = useState<CmsPageId | null>(null)
const [activeSection, setActiveSection] = useState<CmsSectionId | null>(null)
const [selectedDocGroup, setSelectedDocGroup] = useState<string | null>(null)
const [selectedDocSlug, setSelectedDocSlug] = useState<string | null>(null)
const [selectedBlogCategory, setSelectedBlogCategory] = useState<string | null>(null)
const [selectedBlogSlug, setSelectedBlogSlug] = useState<string | null>(null)
const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
const [sidebarWidth, setSidebarWidth] = useState(280)
```

**Page change handler:** Reset all sub-state when page changes:

```typescript
function handlePageChange(page: CmsPageId) {
  setActivePage(page)
  setActiveSection(null)
  setSelectedDocGroup(null)
  setSelectedDocSlug(null)
  setSelectedBlogCategory(null)
  setSelectedBlogSlug(null)
}
```

**Grid template columns:**

```typescript
function getGridTemplateColumns() {
  const activityBar = "48px"
  const sidebar = isSidebarCollapsed ? "0px" : `${sidebarWidth}px`
  const resizer = isSidebarCollapsed ? "0px" : "2px"
  const main = "1fr"
  return `${activityBar} ${sidebar} ${resizer} ${main}`
}
```

**Resize handlers:** Same pattern as ChatLayout:
- `handleSidebarResize(delta)` — clamp between 180px and 50vw, collapse threshold 100px
- `handleSidebarReset()` — reset to 280px, expand
- `handleToggleSidebar()` — toggle collapsed

**Grid render structure:**

```tsx
<div className="flex h-dvh flex-col">
  <div className="grid flex-1 min-h-0 overflow-hidden transition-[grid-template-columns] duration-300 ease-in-out"
       style={{ gridTemplateColumns: getGridTemplateColumns() }}>
    {/* Column 1: Activity Bar */}
    <CmsActivityBar ... />

    {/* Column 2: Sidebar */}
    <aside className="hidden md:flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-800">
      <CmsSidebar ... />
    </aside>

    {/* Column 3: Resizer */}
    {!isSidebarCollapsed ? <PanelResizer position="left" ... /> : <div className="hidden md:block" />}

    {/* Column 4: Main Content */}
    <main className="flex flex-col overflow-hidden bg-white dark:bg-slate-900">
      <CmsTopBar ... />
      <div className="flex-1 overflow-y-auto p-comfort">
        {renderEditor()}
      </div>
    </main>
  </div>
</div>
```

**Editor rendering (`renderEditor`):**

Port the conditional rendering logic from `ContentManager.tsx` right panel (lines 256-327). The logic is the same — match `activePage` + `activeSection` + drill-down slugs to editor components.

Key imports from `src/components/admin/cms/`:
- HeroSectionEditor, BenefitsSectionEditor, FeatureShowcaseEditor
- ManifestoSectionEditor, ProblemsSectionEditor, AgentsSectionEditor, CareerContactEditor
- RichTextPageEditor, HeaderConfigEditor, FooterConfigEditor
- DocSectionEditor, BlogPostEditor

Pass `onBack` callbacks to DocSectionEditor and BlogPostEditor that reset the slug state:
```typescript
onBack={() => setSelectedDocSlug(null)}
onBack={() => setSelectedBlogSlug(null)}
```

**Mobile Sheet sidebar:** Same pattern as ChatLayout. Below `md` breakpoint, show hamburger in CmsTopBar that opens Sheet with CmsSidebar + page list.

Add to CmsTopBar props:
```typescript
onOpenMobileSidebar?: () => void
```

Add to CmsShell:
```typescript
const [isMobileOpen, setIsMobileOpen] = useState(false)
```

Sheet with combined page list + sidebar content for mobile:
```tsx
<Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
  <SheetContent side="left" className="p-0 w-[300px]">
    <SheetHeader className="sr-only"><SheetTitle>CMS Menu</SheetTitle></SheetHeader>
    {/* Page list (mobile activity bar replacement) */}
    {/* Section list */}
    <CmsSidebar ... onCloseMobile={() => setIsMobileOpen(false)} />
  </SheetContent>
</Sheet>
```

**Step 2: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/cms/CmsShell.tsx && git commit -m "feat(cms): add CmsShell grid orchestrator with full state management"
```

---

### Task 7: Wire CmsShell into /cms route

Replace the current `/cms` page content with the new CmsShell.

**Files:**
- Modify: `src/app/cms/page.tsx`

**Step 1: Update page.tsx**

Replace the existing page content. Keep auth check logic, replace the render:

```tsx
"use client"

import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { CmsShell } from "@/components/cms/CmsShell"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WarningCircle } from "iconoir-react"

export default function CmsPage() {
  const { user, isLoading } = useCurrentUser()

  if (isLoading || !user) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground font-mono">Memuat CMS...</p>
        </div>
      </div>
    )
  }

  const isAdmin = user.role === "admin" || user.role === "superadmin"

  if (!isAdmin) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="max-w-2xl p-6">
          <Alert variant="destructive">
            <WarningCircle className="h-4 w-4" />
            <AlertTitle>Akses Ditolak</AlertTitle>
            <AlertDescription>
              Anda tidak memiliki izin untuk mengakses Content Manager.
              Halaman ini hanya dapat diakses oleh Admin atau Superadmin.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  return <CmsShell userId={user._id} />
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build passes. Visiting `/cms` renders the new layout.

**Step 3: Manual verification**

Open `/cms` in browser:
1. Activity bar visible on left with page icons
2. Click "Home" → sidebar shows Hero, Benefits, etc.
3. Click "Hero" → HeroSectionEditor renders in main content
4. Click sidebar collapse chevron → sidebar collapses, main content expands
5. TopBar: theme toggle works, admin dashboard link goes to `/dashboard`
6. Documentation drill-down: click Dokumentasi → groups → group → section list → edit
7. Blog drill-down: same pattern

**Step 4: Commit**

```bash
git add src/app/cms/page.tsx && git commit -m "feat(cms): wire CmsShell into /cms route"
```

---

### Task 8: Add admin dashboard link to CMS

Add a "Content Manager" link in admin dashboard so admins can navigate to `/cms`.

**Files:**
- Modify: `src/components/admin/adminPanelConfig.ts` — add CMS item
- Modify: `src/components/admin/AdminContentSection.tsx` — add CMS case (redirect link)

**Step 1: Add CMS entry to admin sidebar config**

In `src/components/admin/adminPanelConfig.ts`, add a new item to `ADMIN_SIDEBAR_ITEMS`:

```typescript
import { ..., EditPencil, ... } from "iconoir-react"

// Add to ADMIN_SIDEBAR_ITEMS array (after overview or at end):
{
  id: "cms",
  label: "Content Manager",
  icon: EditPencil,
  headerTitle: "Content Manager",
  headerDescription: "Kelola konten halaman marketing",
  headerIcon: EditPencil,
}
```

Wait — actually, since CMS is now a separate route, the admin sidebar item should just **link to `/cms`** rather than showing content in the admin panel.

Better approach: In `AdminSidebar.tsx` `SidebarNav`, detect when `cms` is clicked and navigate to `/cms` instead of changing tab. Or add a simple link-style item.

Simplest: Add a `href` field to config and render as `<Link>` when present:

In `adminPanelConfig.ts`, add optional `href` to interface:
```typescript
export interface AdminSidebarItem {
  id: string
  label: string
  icon: IconoirIcon
  headerTitle: string
  headerDescription: string
  headerIcon: IconoirIcon
  href?: string  // External route link (opens new page instead of tab)
}
```

Add CMS item with `href`:
```typescript
{
  id: "cms",
  label: "Content Manager",
  icon: EditPencil,
  headerTitle: "Content Manager",
  headerDescription: "Kelola konten halaman marketing",
  headerIcon: EditPencil,
  href: "/cms",
}
```

In `AdminSidebar.tsx` `SidebarNav`, when item has `href`, render `<Link>` instead of button:

```tsx
if (item.href) {
  return (
    <li key={item.id}>
      <Link href={item.href} className={cn("text-interface flex w-full items-center gap-3 rounded-action px-3 py-2 text-sm transition-colors", "text-muted-foreground hover:bg-slate-200 hover:text-slate-900 dark:hover:bg-slate-500 dark:hover:text-slate-50")}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate text-left">{item.label}</span>
        <NavArrowRight className="h-4 w-4 shrink-0" />
      </Link>
    </li>
  )
}
```

**Step 2: Verify build**

```bash
npm run build
```

**Step 3: Commit**

```bash
git add src/components/admin/adminPanelConfig.ts src/components/admin/AdminSidebar.tsx && git commit -m "feat(admin): add Content Manager link to admin sidebar"
```

---

### Task 9: Final build verification and cleanup

**Files:**
- Verify: All modified/created files

**Step 1: Full build**

```bash
npm run build
```

Expected: Clean build, no errors.

**Step 2: Verify chat layout not broken**

Visit `/chat` in browser. Confirm:
- Activity bar still works
- Sidebar still works
- PanelResizer still works (imported from new `@/components/ui/PanelResizer` path)

**Step 3: Verify CMS layout**

Visit `/cms` in browser. Full walkthrough:
1. Activity bar icons all clickable
2. Home → Hero → editor loads
3. About → Manifesto → editor loads
4. Documentation → Mulai → section list → click section → DocSectionEditor → back
5. Blog → Update → post list → click post → BlogPostEditor → back
6. Privacy → RichTextPageEditor loads directly
7. Header → HeaderConfigEditor loads directly
8. Footer → FooterConfigEditor loads directly
9. Sidebar collapse/expand
10. Sidebar resize drag
11. TopBar: theme, admin link, user dropdown
12. Mobile: hamburger → Sheet sidebar

**Step 4: Commit final**

```bash
git add -A && git commit -m "feat(cms): complete CMS layout redesign with chat-style shell"
```

---

## Task Summary

| Task | Description | Files | Est. Complexity |
|------|-------------|-------|----------------|
| 1 | Move PanelResizer to ui/ | 2 files (move + update import) | Low |
| 2 | Strip CMS layout | 1 file | Low |
| 3 | Create CmsActivityBar | 1 new file | Medium |
| 4 | Create CmsTopBar | 1 new file | Low-Medium |
| 5 | Create CmsSidebar | 1 new file | High (drill-down logic) |
| 6 | Create CmsShell | 1 new file | High (grid + state + editors) |
| 7 | Wire into /cms route | 1 file | Low |
| 8 | Admin dashboard link | 2 files | Low |
| 9 | Final verification | 0 files (testing) | Medium |

**Critical path:** Tasks 1-7 are sequential. Task 8 is independent. Task 9 is final.
