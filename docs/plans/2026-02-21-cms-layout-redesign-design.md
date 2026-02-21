# CMS Layout Redesign — Chat-Style Full-Screen Shell

**Date:** 2026-02-21
**Status:** Approved
**Approach:** Fork & Adapt ChatLayout (Pendekatan 1)

---

## Context

CMS saat ini embedded di `/dashboard` tab, dikurung dalam GlobalHeader + Footer + max-width container. Area editor sempit. Redesign ini memindahkan CMS ke route terpisah `/cms` dengan layout full-screen yang meniru pola halaman `/chat`: Activity Bar + Collapsible Sidebar + Full-width Main Content.

## Goals

- Area editor lebih luas (full viewport width minus activity bar + sidebar)
- Navigation CMS pages via Activity Bar icons (seperti chat panel icons)
- Sidebar collapsible + resizable untuk section list
- Zero Chrome: tanpa GlobalHeader, tanpa Footer
- Editor components (HeroSectionEditor, BlogPostEditor, dll) tidak berubah

## Non-Goals

- URL-based routing per page/section (tetap single `/cms` route, client-side state)
- Right panel (artifact-style) — tidak ada
- Perubahan pada admin dashboard `/dashboard` — tetap ada, CMS tab dihapus dari sana

---

## Route & Layout

### Route

```
/cms          → Single route, client-side navigation via state
```

### Layout

```
src/app/cms/layout.tsx
```

Bare layout tanpa GlobalHeader/Footer:

```tsx
export default function CmsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {children}
    </div>
  )
}
```

### Page

```
src/app/cms/page.tsx
```

Auth check (admin/superadmin only) → render `<CmsShell userId={user._id} />`.

---

## Grid Structure

4-column CSS Grid (simplified dari chat yang 6-column — tanpa right panel):

```
┌──────────┬──────────────┬───┬──────────────────────────┐
│ Activity │   Sidebar    │ R │      Main Content         │
│   Bar    │  (sections)  │ e │  ┌─────────────────────┐  │
│  48px    │  280px       │ s │  │ CmsTopBar            │  │
│          │  resizable   │ i │  ├─────────────────────┤  │
│  Logo    │  collapsible │ z │  │                     │  │
│  ───     │              │ e │  │  Editor Area        │  │
│  Icons   │              │ r │  │  (scrollable)       │  │
│  (pages) │              │   │  │                     │  │
│          │              │ 2 │  │                     │  │
│          │              │ p │  │                     │  │
│          │              │ x │  │                     │  │
└──────────┴──────────────┴───┴──────────────────────────┘
```

Grid template columns: `48px ${sidebarWidth}px 2px 1fr`

When sidebar collapsed: `48px 0px 0px 1fr`

---

## Component Architecture

### CmsShell (orchestrator)

**File:** `src/components/cms/CmsShell.tsx`

Top-level component. Manages all layout state and renders the grid.

**State:**

```typescript
activePage: CmsPageId | null          // Selected page from activity bar
activeSection: CmsSectionId | null    // Selected section from sidebar
selectedDocSlug: string | null        // Doc drill-down (null=list, "__new__"=create, else=edit)
selectedBlogSlug: string | null       // Blog drill-down (same pattern)
isSidebarCollapsed: boolean
sidebarWidth: number                  // Default 280, min 180, max 50vw
```

**Props:** `userId: Id<"users">`

### CmsActivityBar

**File:** `src/components/cms/CmsActivityBar.tsx`

Vertical 48px bar. Fork dari `src/components/chat/shell/ActivityBar.tsx`.

**Structure:**

```
┌────────┐
│  Logo  │ ← Link to "/" (home)
│────────│
│  🏠   │ ← Home
│  ℹ️   │ ← About
│  📖   │ ← Dokumentasi
│  📰   │ ← Blog
│  🔒   │ ← Privacy
│  🛡️   │ ← Security
│  📄   │ ← Terms
│────────│ ← separator
│  ▤    │ ← Header
│  ▥    │ ← Footer
│        │
│        │
└────────┘
```

**Icons (iconoir-react):**

| Page | Icon | Label |
|------|------|-------|
| `home` | `Home` | Home |
| `about` | `InfoEmpty` | About |
| `documentation` | `Book` | Dokumentasi |
| `blog` | `Journal` | Blog |
| `privacy` | `Lock` | Privacy |
| `security` | `Shield` | Security |
| `terms` | `Page` | Terms |
| — separator — | | |
| `header` | `ViewColumns2` | Header |
| `footer` | `ViewColumns3` | Footer |

**Behavior:**
- Klik icon → `onPageChange(pageId)` callback
- Active state: border + bg highlight (same as chat activity bar)
- Auto-expand sidebar if collapsed when icon clicked
- Logo Makalah at top → link to `/` (marketing home)
- Keyboard nav: ArrowUp/ArrowDown between items

### CmsTopBar

**File:** `src/components/cms/CmsTopBar.tsx`

Horizontal bar at top of main content. Fork dari `src/components/chat/shell/TopBar.tsx`.

**Layout:**

```
┌───────────────────────────────────────────────────┐
│  [→ expand]                   [☀] [⊞ Admin] [👤] │
└───────────────────────────────────────────────────┘
```

**Elements:**

| Position | Element | Condition | Behavior |
|----------|---------|-----------|----------|
| Left | Expand sidebar (`FastArrowRight`) | Only when sidebar collapsed | Expand sidebar |
| Right | Theme toggle (`SunLight`/`HalfMoon`) | Always | Toggle dark/light |
| Right | Admin dashboard link (`Dashboard` icon) | Always | Navigate to `/dashboard` |
| Right | User dropdown (`UserDropdown variant="compact"`) | Always | Same as chat |

**Admin Dashboard Button:** Replaces artifact toggle from chat TopBar. Uses `Dashboard` icon from iconoir. Wrapped in `<Link href="/dashboard">`. Tooltip: "Admin Dashboard". Styled same as theme toggle (ghost, 32x32, rounded-action).

### CmsSidebar

**File:** `src/components/cms/CmsSidebar.tsx`

Dynamic sidebar content based on `activePage`.

**Header:** Collapse chevron `«` button + page title.

**Content variants by page:**

#### Pages with simple sections (Home, About)

```
HOME
─────────────
● Hero              ← active (amber left border)
  Benefits
  Fitur: Workflow
  Fitur: Refrasa
```

Click section → `onSectionChange(sectionId)` → editor loads in main content.

#### Pages with drill-down (Documentation, Blog)

**Level 1 — Group/Category list:**

```
DOKUMENTASI
─────────────
  Mulai           →
  Fitur Utama     →
  Subskripsi      →
  Panduan Lanjutan →
```

Click group → sidebar transitions to level 2.

**Level 2 — Item list:**

```
← Mulai
─────────────
● Welcome            (published dot)
  Installation
  Quick Start

+ Tambah Section Baru
```

Click item → editor loads. Click "←" → back to level 1.

This replaces `DocSectionListEditor` and `BlogPostListEditor` as sidebar content (they currently render in the main content area). The list items, published dots, category badges, and delete buttons move into the sidebar.

#### Pages without sections (Privacy, Security, Terms, Header, Footer)

No sidebar content needed. Editor loads directly in main content. Sidebar can show just the page title or auto-collapse.

**Sidebar features:**
- Collapse/expand via chevron button
- Resize via PanelResizer drag
- Active section: 2px amber left border (`.active-nav`)
- Published status dots (green/gray) for doc & blog items in level 2
- Delete button per item (with confirmation dialog)

---

## State Flow

```
CmsActivityBar                          CmsSidebar                          Main Content
     │                                      │                                    │
     │─── onPageChange(pageId) ────────────→│                                    │
     │                                      │─── renders sections for page       │
     │                                      │                                    │
     │                                      │─── onSectionChange(sectionId) ────→│
     │                                      │                                    │─── renders editor
     │                                      │                                    │
     │                                      │─── onDrillDown(slug) ─────────────→│
     │                                      │    (doc/blog level 2 → editor)     │─── renders detail editor
     │                                      │                                    │
     │                                      │─── onCreateNew() ────────────────→│
     │                                      │                                    │─── renders create editor
```

**Page change resets:** When `activePage` changes, `activeSection`, `selectedDocSlug`, and `selectedBlogSlug` reset to null.

---

## Editor Rendering (Main Content)

Same conditional rendering as current `ContentManager.tsx` right panel, minus the sidebar:

```typescript
// Home sections
activePage="home" + activeSection="hero"           → <HeroSectionEditor />
activePage="home" + activeSection="benefits"       → <BenefitsSectionEditor />
activePage="home" + activeSection="features-*"     → <FeatureShowcaseEditor />

// About sections
activePage="about" + activeSection="manifesto"     → <ManifestoSectionEditor />
// ...etc

// Documentation drill-down
activePage="documentation" + selectedDocSlug=null   → (sidebar shows list, main shows empty/placeholder)
activePage="documentation" + selectedDocSlug="xxx"  → <DocSectionEditor slug="xxx" />
activePage="documentation" + selectedDocSlug="__new__" → <DocSectionEditor slug={null} />

// Blog drill-down
activePage="blog" + selectedBlogSlug=null           → (sidebar shows list, main shows empty/placeholder)
activePage="blog" + selectedBlogSlug="xxx"          → <BlogPostEditor slug="xxx" />

// Single-page editors
activePage="privacy"   → <RichTextPageEditor slug="privacy" />
activePage="header"    → <HeaderConfigEditor />
activePage="footer"    → <FooterConfigEditor />

// Empty state
activePage=null        → "Pilih halaman untuk mulai editing"
```

**Editor components unchanged.** All existing editors in `src/components/admin/cms/` are reused as-is.

---

## Mobile Handling

### Below `md` breakpoint (< 768px)

- Activity bar: hidden
- Sidebar: hidden, accessible via Sheet (slide-in from left)
- CmsTopBar: hamburger button on left to open Sheet
- Sheet content: Combined page list + section list (activity bar icons as list items + sections below)

### Above `md` breakpoint (>= 768px)

- Full grid layout as designed

---

## File Structure

### New Files

```
src/app/cms/
├── layout.tsx                    ← Bare layout
└── page.tsx                      ← Auth check + CmsShell

src/components/cms/
├── CmsShell.tsx                  ← Grid orchestrator + state
├── CmsActivityBar.tsx            ← Page icon navigation
├── CmsTopBar.tsx                 ← Theme + admin link + user
└── CmsSidebar.tsx                ← Dynamic section list
```

### Moved Files

```
src/components/chat/layout/PanelResizer.tsx → src/components/ui/PanelResizer.tsx
```

PanelResizer is generic (no chat-specific logic). Moving to `ui/` makes it a shared utility. Update import in ChatLayout.

### Reused (No Changes)

```
src/components/layout/header/UserDropdown.tsx    ← variant="compact"
src/components/admin/cms/HeroSectionEditor.tsx   ← All editor components
src/components/admin/cms/BlogPostEditor.tsx
src/components/admin/cms/DocSectionEditor.tsx
src/components/admin/cms/RichTextPageEditor.tsx
src/components/admin/cms/FeatureShowcaseEditor.tsx
src/components/admin/cms/HeaderConfigEditor.tsx
src/components/admin/cms/FooterConfigEditor.tsx
src/components/admin/cms/BenefitsSectionEditor.tsx
src/components/admin/cms/ManifestoSectionEditor.tsx
src/components/admin/cms/ProblemsSectionEditor.tsx
src/components/admin/cms/AgentsSectionEditor.tsx
src/components/admin/cms/CareerContactEditor.tsx
src/components/admin/cms/TipTapEditor.tsx
src/components/admin/cms/CmsImageUpload.tsx
src/components/admin/cms/blocks/*
```

### Modified Files

```
src/components/admin/adminPanelConfig.ts         ← Remove CMS tab if it exists
src/components/admin/AdminContentSection.tsx      ← Remove CMS case
src/components/admin/ContentManager.tsx           ← Deprecated (replaced by CmsShell + CmsSidebar)
```

### Sidebar Changes (DocSectionListEditor / BlogPostListEditor)

Currently these render as full components in the main content area showing lists of items. In the new design, their **list rendering logic** moves into `CmsSidebar.tsx` (level 2 drill-down). The editors (`DocSectionEditor`, `BlogPostEditor`) stay in main content.

Two options:
1. **Extract list data** from these components and rebuild in CmsSidebar (cleaner, avoids embedding full components in sidebar)
2. **Embed existing list components** in sidebar as-is (faster, but they have padding/layout assumptions for main content area)

**Recommendation:** Option 1 — rebuild list rendering in CmsSidebar. The data queries are simple (`useQuery` calls), and sidebar needs different styling (compact items, no header/button row). Keep `DocSectionListEditor` and `BlogPostListEditor` for backward compatibility but they become unused.

---

## Route Protection

CMS page at `/cms` needs admin role protection. Two layers:

1. **proxy.ts** — Add `/cms` to protected routes (requires `ba_session` cookie)
2. **page.tsx** — Runtime role check via `useCurrentUser()`, same pattern as `/dashboard`

---

## Admin Dashboard Link

From `/dashboard`, add a link/button to `/cms` so admins can navigate there. Options:
- Add "Content Manager" link in admin sidebar
- Or add a CTA card in admin overview tab

This ensures discoverability. The CMS TopBar has the reverse link (back to `/dashboard`).

---

## Verification Criteria

1. `/cms` loads with full-screen layout (no header/footer)
2. Activity bar shows page icons, clicking switches sidebar content
3. Sidebar shows sections, clicking loads editor in main content
4. Documentation/Blog drill-down works (group → list → editor → back)
5. Sidebar collapsible via chevron and resizable via drag
6. TopBar: theme toggle works, admin dashboard link navigates to `/dashboard`
7. All existing editors render correctly in main content area
8. Mobile: Sheet sidebar works
9. `npm run build` passes
10. No regressions on `/dashboard` admin panel
