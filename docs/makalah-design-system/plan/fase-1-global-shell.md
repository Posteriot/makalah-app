# FASE 1: Global Shell - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Parent Document**: [MASTER-PLAN.md](./MASTER-PLAN.md)
> **Status**: ⏳ Pending
> **Total Tasks**: 6
> **Prerequisite**: FASE 0 (Foundation) completed

**Goal:** Migrasi komponen Global Shell (Header, Footer, Sidebar) ke standar Mechanical Grace dengan penggantian Lucide → Iconoir per komponen.

**Architecture:**
- Header: Navigasi global dengan theme toggle dan user dropdown
- Footer Standard: Footer lengkap untuk marketing pages
- Footer Mini: Footer minimal untuk chat workspace (brand-only)
- Chat Sidebar: Sidebar percakapan dengan Activity Bar
- Chat Activity Bar: Vertical navigation 48px

**Tech Stack:** Tailwind CSS v4, iconoir-react, shadcn/ui

---

## Reference Documents

### Design System Specs (docs/)
| # | Dokumen | Path | Relevansi |
|---|---------|------|-----------|
| 1 | **MANIFESTO** | [../docs/MANIFESTO.md](../docs/MANIFESTO.md) | Filosofi Mechanical Grace |
| 2 | **Global CSS** | [../docs/global-css.md](../docs/global-css.md) | Token warna, variabel |
| 3 | **Typography** | [../docs/typografi.md](../docs/typografi.md) | Geist Sans/Mono hierarchy |
| 4 | **Color** | [../docs/justifikasi-warna.md](../docs/justifikasi-warna.md) | Amber, Slate, Sky palette |
| 5 | **Shape & Layout** | [../docs/shape-layout.md](../docs/shape-layout.md) | Hybrid radius, border hairline |
| 6 | **Visual Language** | [../docs/bahasa-visual.md](../docs/bahasa-visual.md) | Iconoir specs, hover effects |
| 7 | **Components** | [../docs/komponen-standar.md](../docs/komponen-standar.md) | Button, dropdown standards |
| 8 | **AI Elements** | [../docs/ai-elements.md](../docs/ai-elements.md) | Chat sidebar, Activity Bar |
| 9 | **Class Naming** | [../docs/class-naming-convention.md](../docs/class-naming-convention.md) | `.rounded-shell`, `.text-interface` |

### Target Files
| File | Path | Lines | Lucide Icons Used |
|------|------|-------|-------------------|
| GlobalHeader | `src/components/layout/header/GlobalHeader.tsx` | ~415 | Menu, X, Sun, Moon, User, CreditCard, Settings, LogOut, Loader2 |
| UserDropdown | `src/components/layout/header/UserDropdown.tsx` | ~200 | Settings, LogOut, ChevronDown, Loader2, User, CreditCard |
| Footer | `src/components/layout/footer/Footer.tsx` | ~142 | Twitter, Linkedin, Instagram |
| ChatSidebar | `src/components/chat/ChatSidebar.tsx` | ~185 | ArrowUpCircle, Loader2Icon, PlusIcon |
| ActivityBar | `src/components/chat/shell/ActivityBar.tsx` | ~251 | MessageSquareIcon, FileTextIcon, GitBranchIcon, ChevronsLeftIcon, ChevronsRightIcon |
| SidebarChatHistory | `src/components/chat/sidebar/SidebarChatHistory.tsx` | ~404 | Loader2Icon, MessageSquareIcon, TrashIcon, PencilIcon |

---

## Icon Replacement Mapping

### Lucide → Iconoir Equivalents

| Lucide (Current) | Iconoir (New) | Context |
|------------------|---------------|---------|
| `Menu` | `Menu` | Mobile menu toggle |
| `X` | `Xmark` atau `Cancel` | Close button |
| `Sun` | `SunLight` | Light mode toggle |
| `Moon` | `HalfMoon` | Dark mode toggle |
| `User` | `User` | User avatar placeholder |
| `CreditCard` | `CreditCard` | Subscription link |
| `Settings` | `Settings` | Settings link |
| `LogOut` | `LogOut` | Sign out action |
| `Loader2` | `RefreshDouble` (animated) | Loading spinner |
| `ChevronDown` | `NavArrowDown` | Dropdown indicator |
| `Twitter` | `X` (Twitter rebranded) | Social link |
| `Linkedin` | `Linkedin` | Social link |
| `Instagram` | `Instagram` | Social link |
| `ArrowUpCircle` | `ArrowUpCircle` | Upgrade CTA |
| `PlusIcon` | `Plus` | New chat |
| `MessageSquare` | `ChatBubble` atau `Message` | Chat history |
| `FileText` | `Page` atau `Notes` | Paper sessions |
| `GitBranch` | `GitBranch` | Progress timeline |
| `ChevronsLeft` | `FastArrowLeft` | Collapse sidebar |
| `ChevronsRight` | `FastArrowRight` | Expand sidebar |
| `Trash` | `Trash` | Delete action |
| `Pencil` | `EditPencil` | Edit action |

> **NOTE:** Verifikasi nama ikon di [iconoir.com](https://iconoir.com) sebelum implementasi. Nama bisa berbeda dari prediksi.

---

## Deliverables

| Output | Lokasi |
|--------|--------|
| Migrated GlobalHeader | `src/components/layout/header/GlobalHeader.tsx` |
| Migrated UserDropdown | `src/components/layout/header/UserDropdown.tsx` |
| Migrated Footer | `src/components/layout/footer/Footer.tsx` |
| New ChatMiniFooter | `src/components/chat/ChatMiniFooter.tsx` |
| Migrated ChatSidebar | `src/components/chat/ChatSidebar.tsx` |
| Migrated ActivityBar | `src/components/chat/shell/ActivityBar.tsx` |
| Migrated SidebarChatHistory | `src/components/chat/sidebar/SidebarChatHistory.tsx` |
| Progress log | `docs/makalah-design-system/implementation/progress.md` |
| Task reports | `docs/makalah-design-system/implementation/report/fase-1-task-*.md` |

---

## Tasks

### Task 1.1: Migrate GlobalHeader

**Files:**
- Modify: `src/components/layout/header/GlobalHeader.tsx`
- Modify: `src/components/layout/header/UserDropdown.tsx`

**Reference:**
- [bahasa-visual.md](../docs/bahasa-visual.md) - Icon sizing (Interface = 16px, Display = 24px)
- [komponen-standar.md](../docs/komponen-standar.md) - Button & dropdown standards

**Step 1: Identify all Lucide imports in GlobalHeader.tsx**

Read file and note all imports from `lucide-react`:
```tsx
// Current (remove)
import { Menu, X, Sun, Moon, User, CreditCard, Settings, LogOut, Loader2 } from "lucide-react"
```

**Step 2: Replace with Iconoir imports**

```tsx
// New (add)
import {
  Menu,
  Xmark,
  SunLight,
  HalfMoon,
  User,
  CreditCard,
  Settings,
  LogOut
} from "iconoir-react"
```

> **NOTE:** Loader2 spin animation mungkin perlu custom implementation dengan Iconoir. Cek di [iconoir.com/docs](https://iconoir.com/docs).

**Step 3: Update icon JSX references**

Replace each icon in JSX:
- `<Menu />` → `<Menu />` (same name)
- `<X />` → `<Xmark />`
- `<Sun />` → `<SunLight />`
- `<Moon />` → `<HalfMoon />`
- Etc.

**Step 4: Apply Mechanical Grace styling**

- Icon size: Use `.icon-interface` (16px) for nav icons
- Icon color: `text-muted-foreground` default, `text-foreground` on hover
- Button radius: `.rounded-action` (8px) for dropdown triggers
- Hover effect: `.hover-slash` for nav items (optional)

**Step 5: Repeat for UserDropdown.tsx**

Same pattern as GlobalHeader.

**Step 6: Verify build succeeds**

```bash
npm run build
```

**Step 7: Visual verification**

- Open dev server: `npm run dev`
- Check header displays correctly
- Test mobile menu toggle
- Test theme toggle (light/dark)
- Test user dropdown

**Step 8: Update progress.md**

Update Task 1.1 status to `✅ Done`

**Step 9: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-1-task-1-header.md`

**Step 10: Commit**

```bash
git add src/components/layout/header/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(header): migrate to Mechanical Grace + Iconoir icons"
```

---

### Task 1.2: Migrate Footer Standard

**Files:**
- Modify: `src/components/layout/footer/Footer.tsx`

**Reference:**
- [bahasa-visual.md](../docs/bahasa-visual.md) - Icon sizing
- [shape-layout.md](../docs/shape-layout.md) - Border hairline

**Step 1: Identify Lucide imports in Footer.tsx**

```tsx
// Current (remove)
import { Twitter, Linkedin, Instagram } from "lucide-react"
```

**Step 2: Replace with Iconoir imports**

```tsx
// New (add)
import { X as TwitterIcon, Linkedin, Instagram } from "iconoir-react"
```

> **NOTE:** Twitter rebranded to X. Iconoir might have `X` icon or `TwitterX`. Check [iconoir.com](https://iconoir.com).

**Step 3: Update icon JSX references**

**Step 4: Apply Mechanical Grace styling**

- Social icons: `.icon-interface` (16px)
- Footer text: `.text-interface` for copyright (Geist Mono)
- Border: `.border-hairline` for top border
- Background: Consider `bg-slate-950` dark mode for industrial feel

**Step 5: Verify build succeeds**

```bash
npm run build
```

**Step 6: Visual verification**

- Check footer on marketing pages
- Verify light/dark mode

**Step 7: Update progress.md**

**Step 8: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-1-task-2-footer.md`

**Step 9: Commit**

```bash
git add src/components/layout/footer/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(footer): migrate to Mechanical Grace + Iconoir icons"
```

---

### Task 1.3: Create ChatMiniFooter

**Files:**
- Create: `src/components/chat/ChatMiniFooter.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md) - ChatMiniFooter spec:
  > "Ringkasan Copyright 1-baris. Horizontal bottom-strip, Geist Mono text-[10px], Brand-only (no logo)."

**Step 1: Create new component**

Create `src/components/chat/ChatMiniFooter.tsx`:

```tsx
/**
 * ChatMiniFooter - Minimal footer for chat workspace
 *
 * Design: Mechanical Grace
 * - Single line copyright
 * - Geist Mono typography
 * - No logo, brand name only
 * - Height: ~24-32px
 */
export function ChatMiniFooter() {
  return (
    <footer className="h-8 px-4 flex items-center justify-center border-t border-hairline bg-sidebar">
      <span className="text-interface text-[10px] text-muted-foreground tracking-wider uppercase">
        © {new Date().getFullYear()} Makalah
      </span>
    </footer>
  )
}

export default ChatMiniFooter
```

**Step 2: (Optional) Add to chat layout if not already present**

Check `src/components/chat/layout/ChatLayout.tsx` for footer slot.

**Step 3: Verify build succeeds**

```bash
npm run build
```

**Step 4: Visual verification**

- Check mini footer appears in chat workspace
- Verify styling matches specs

**Step 5: Update progress.md**

**Step 6: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-1-task-3-mini-footer.md`

**Step 7: Commit**

```bash
git add src/components/chat/ChatMiniFooter.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(chat): create ChatMiniFooter with Mechanical Grace styling"
```

---

### Task 1.4: Migrate ChatSidebar

**Files:**
- Modify: `src/components/chat/ChatSidebar.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md) - Sidebar specs

**Step 1: Identify Lucide imports**

```tsx
// Current (remove)
import { ArrowUpCircle, Loader2Icon, PlusIcon } from "lucide-react"
```

**Step 2: Replace with Iconoir imports**

```tsx
// New (add)
import { ArrowUpCircle, Plus } from "iconoir-react"
// Note: For Loader/spinner, use CSS animation or custom
```

**Step 3: Update icon JSX references**

**Step 4: Apply Mechanical Grace styling**

- New Chat button: `.rounded-action` (8px), `bg-primary`
- Upgrade CTA: `.bg-success` (Teal), `.text-interface`
- Section labels: `.text-interface` (Geist Mono)

**Step 5: Verify build succeeds**

**Step 6: Visual verification**

- Check sidebar in chat page
- Test New Chat button
- Verify Upgrade CTA styling

**Step 7: Update progress.md**

**Step 8: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-1-task-4-chat-sidebar.md`

**Step 9: Commit**

```bash
git add src/components/chat/ChatSidebar.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(chat-sidebar): migrate to Mechanical Grace + Iconoir icons"
```

---

### Task 1.5: Migrate ActivityBar

**Files:**
- Modify: `src/components/chat/shell/ActivityBar.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "ActivityBar: Vertical nav 48px (Command Strip). Amber-500 Left Line (active state), Icon 16px, Mono tooltips."

**Step 1: Identify Lucide imports**

```tsx
// Current (remove)
import {
  MessageSquareIcon,
  FileTextIcon,
  GitBranchIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"
```

**Step 2: Replace with Iconoir imports**

```tsx
// New (add)
import {
  ChatBubble,        // or Message
  Page,              // or Notes
  GitBranch,
  FastArrowLeft,
  FastArrowRight,
} from "iconoir-react"
```

**Step 3: Update icon JSX references**

**Step 4: Apply Mechanical Grace styling**

- Width: `w-12` (48px) - verify CSS var `--shell-activity-bar-w`
- Icon size: `h-5 w-5` (20px for collapsed nav per bahasa-visual.md)
- Active state: Add `border-l-2 border-amber-500` (`.active-nav` utility)
- Background: `bg-sidebar`
- Tooltips: Font should be `.text-interface` (Geist Mono)

**Step 5: Verify build succeeds**

**Step 6: Visual verification**

- Check Activity Bar in chat workspace
- Test panel switching
- Verify active state indicator (Amber left line)
- Verify sidebar toggle

**Step 7: Update progress.md**

**Step 8: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-1-task-5-activity-bar.md`

**Step 9: Commit**

```bash
git add src/components/chat/shell/ActivityBar.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(activity-bar): migrate to Mechanical Grace + Iconoir icons"
```

---

### Task 1.6: Migrate SidebarChatHistory

**Files:**
- Modify: `src/components/chat/sidebar/SidebarChatHistory.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "History Item: Hover state `.bg-accent`, Active state `.border-l-2 border-amber-500`."

**Step 1: Identify Lucide imports**

```tsx
// Current (remove)
import { Loader2Icon, MessageSquareIcon, TrashIcon, PencilIcon } from "lucide-react"
```

**Step 2: Replace with Iconoir imports**

```tsx
// New (add)
import { ChatBubble, Trash, EditPencil } from "iconoir-react"
// Note: Loader handled separately
```

**Step 3: Update icon JSX references**

**Step 4: Apply Mechanical Grace styling**

- History item hover: `hover:bg-list-hover-bg`
- History item active: `bg-list-selected-bg` + `.active-nav` (Amber left line)
- Action icons: `.icon-interface` (16px)
- Timestamp text: `.text-interface` (Geist Mono)

**Step 5: Verify build succeeds**

**Step 6: Visual verification**

- Check conversation list in sidebar
- Test hover/active states
- Test edit mode
- Test delete confirmation

**Step 7: Update progress.md**

**Step 8: Write task report**

Create `docs/makalah-design-system/implementation/report/fase-1-task-6-sidebar-history.md`

**Step 9: Commit**

```bash
git add src/components/chat/sidebar/SidebarChatHistory.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(sidebar-history): migrate to Mechanical Grace + Iconoir icons"
```

---

## Final Verification Checklist

Setelah semua tasks selesai:

### Build & Runtime
- [ ] `npm run build` sukses tanpa error
- [ ] `npm run dev` berjalan normal
- [ ] No console errors terkait missing icons

### Visual Checks - Header
- [ ] Logo displays correctly
- [ ] Navigation links work
- [ ] Mobile menu toggle works
- [ ] Theme toggle works (Sun/Moon icons correct)
- [ ] User dropdown works
- [ ] All icons display (no missing/broken)

### Visual Checks - Footer
- [ ] Footer displays on marketing pages
- [ ] Social icons display correctly
- [ ] Links work
- [ ] Light/dark mode correct

### Visual Checks - Chat Area
- [ ] Activity Bar displays correctly
- [ ] Panel switching works
- [ ] Sidebar collapse/expand works
- [ ] Conversation list displays
- [ ] New Chat button works
- [ ] Edit/Delete actions work
- [ ] ChatMiniFooter displays (if implemented)

### Mechanical Grace Compliance
- [ ] All icons using Iconoir
- [ ] Icon sizes follow scale (12/16/20/24)
- [ ] Active state uses Amber left line
- [ ] Mono font for metadata/labels
- [ ] Radius follows hybrid scale

---

## Rollback Protocol

Jika terjadi visual breakage parah:
1. Revert commits yang bermasalah
2. Lucide masih tersedia sebagai fallback
3. Document issue in task report
4. Fix sebelum lanjut

---

## Update MASTER-PLAN.md

Setelah FASE 1 selesai, update Progress Tracker di MASTER-PLAN.md:

```markdown
| 1 - Global Shell | ✅ Done | [DATE] | [DATE] |
```

---

## Next Phase

Lanjut ke: **FASE 2: Marketing Pages** → `plan/fase-2-marketing.md`
