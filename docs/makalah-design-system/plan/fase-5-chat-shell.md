# FASE 5: Chat Workspace - Shell & Layout - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Parent Document**: [MASTER-PLAN.md](./MASTER-PLAN.md)
> **Status**: ⏳ Pending
> **Total Tasks**: 5
> **Prerequisite**: FASE 4 (Dashboard) completed

**Goal:** Migrasi struktur layout Chat (16-column grid, Zero Chrome) ke standar Mechanical Grace.

**Architecture:**
- Chat workspace adalah "Zero Chrome" zone - tanpa Global Header/Footer
- Layout menggunakan 16-column grid system
- ActivityBar sebagai vertical navigation (48px)
- ShellHeader sebagai replacement untuk Global Header
- ChatTabs untuk multi-tab management ala VS Code

**Tech Stack:** Tailwind CSS v4, iconoir-react, CSS Grid

**Constraint:** Global Header & Footer DILARANG muncul di area Chat.

---

## Reference Documents

### Design System Specs (docs/)
| # | Dokumen | Relevansi |
|---|---------|-----------|
| 1 | **Shape & Layout** | 16-column grid specs (Section 6) |
| 2 | **AI Elements** | ActivityBar, ChatTabs, PanelResizer specs |
| 3 | **Visual Language** | Iconoir, industrial textures |
| 4 | **Class Naming** | `.shell-*` layout classes |

### Target Files
| File | Path | Lucide Icons |
|------|------|--------------|
| ChatLayout | `src/components/chat/layout/ChatLayout.tsx` | None (CSS only) |
| ActivityBar | `src/components/chat/shell/ActivityBar.tsx` | MessageSquareIcon, FileTextIcon, GitBranchIcon, ChevronsLeftIcon, ChevronsRightIcon |
| ChatTabs | `src/components/chat/shell/ChatTabs.tsx` | MessageSquareIcon, FileTextIcon, XIcon, ChevronLeftIcon, ChevronRightIcon |
| ShellHeader | `src/components/chat/shell/ShellHeader.tsx` | SunIcon, MoonIcon, PanelRightIcon, PanelRightCloseIcon |
| NotificationDropdown | `src/components/chat/shell/NotificationDropdown.tsx` | BellIcon, FileTextIcon, InfoIcon, DownloadIcon, MessageSquareIcon, ChevronRightIcon |
| PanelResizer | `src/components/chat/layout/PanelResizer.tsx` | None (CSS only) |
| ChatSidebar | `src/components/chat/ChatSidebar.tsx` | (Already migrated in FASE 1) |

---

## Icon Replacement Mapping

| Lucide (Current) | Iconoir (New) | Context |
|------------------|---------------|---------|
| `MessageSquareIcon` | `ChatBubble` | Chat icon |
| `FileTextIcon` | `Page` | Paper/document |
| `GitBranchIcon` | `GitBranch` | Progress timeline |
| `ChevronsLeftIcon` | `FastArrowLeft` | Collapse sidebar |
| `ChevronsRightIcon` | `FastArrowRight` | Expand sidebar |
| `XIcon` | `Xmark` | Close tab |
| `ChevronLeftIcon` | `NavArrowLeft` | Tab scroll left |
| `ChevronRightIcon` | `NavArrowRight` | Tab scroll right |
| `SunIcon` | `SunLight` | Light mode |
| `MoonIcon` | `HalfMoon` | Dark mode |
| `PanelRightIcon` | `SidebarExpand` | Expand panel |
| `PanelRightCloseIcon` | `SidebarCollapse` | Collapse panel |
| `BellIcon` | `Bell` | Notifications |
| `InfoIcon` | `InfoCircle` | Info |
| `DownloadIcon` | `Download` | Download |

---

## Deliverables

| Output | Lokasi |
|--------|--------|
| Migrated ChatLayout | `src/components/chat/layout/ChatLayout.tsx` |
| Migrated ActivityBar | `src/components/chat/shell/ActivityBar.tsx` |
| Migrated ChatTabs | `src/components/chat/shell/ChatTabs.tsx` |
| Migrated ShellHeader | `src/components/chat/shell/ShellHeader.tsx` |
| Migrated NotificationDropdown | `src/components/chat/shell/NotificationDropdown.tsx` |
| Migrated PanelResizer | `src/components/chat/layout/PanelResizer.tsx` |
| Progress log | `docs/makalah-design-system/implementation/progress.md` |
| Task reports | `docs/makalah-design-system/implementation/report/fase-5-task-*.md` |

---

## Tasks

### Task 5.1: Verify ChatLayout Grid System

**Files:**
- Review: `src/components/chat/layout/ChatLayout.tsx`

**Reference:**
- [shape-layout.md](../docs/shape-layout.md) - Section 6: 16-Column Grid

**Step 1: Audit current grid implementation**

Verify layout uses CSS Grid with 16 columns:
```css
display: grid;
grid-template-columns: repeat(16, 1fr);
```

**Step 2: Verify CSS variables used**

Check these variables are properly applied:
- `--shell-header-h`: 72px
- `--shell-activity-bar-w`: 48px
- `--shell-sidebar-w`: 280px
- `--shell-panel-w`: 360px

**Step 3: Verify Zero Chrome constraint**

Ensure Global Header/Footer are NOT rendered in chat routes.

**Step 4: Update progress.md & write report**

**Step 5: Commit (if changes needed)**

```bash
git add src/components/chat/layout/
git add docs/makalah-design-system/implementation/
git commit -m "refactor(chat-layout): verify 16-column grid alignment"
```

---

### Task 5.2: Migrate ActivityBar (if not done in FASE 1)

**Files:**
- Modify: `src/components/chat/shell/ActivityBar.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "ActivityBar: Vertical nav 48px (Command Strip). Amber-500 Left Line (active state), Icon 16px, Mono tooltips."

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import {
  MessageSquareIcon, FileTextIcon, GitBranchIcon,
  ChevronsLeftIcon, ChevronsRightIcon,
} from "lucide-react"

// New (add)
import {
  ChatBubble, Page, GitBranch,
  FastArrowLeft, FastArrowRight,
} from "iconoir-react"
```

**Step 2: Update icon references**

**Step 3: Apply Mechanical Grace styling**

- Width: 48px (`w-12`)
- Active state: `border-l-2 border-amber-500` (`.active-nav`)
- Icon size: `h-5 w-5` (20px for collapsed nav)
- Tooltip font: `.text-interface` (Geist Mono)
- Background: `bg-sidebar`

**Step 4: Verify build & visual**

**Step 5: Update progress.md & write report**

**Step 6: Commit**

```bash
git add src/components/chat/shell/ActivityBar.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(activity-bar): migrate to Mechanical Grace + Iconoir"
```

---

### Task 5.3: Migrate ChatTabs

**Files:**
- Modify: `src/components/chat/shell/ChatTabs.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "ChatTabs: Container dengan height 36px, bg-muted. Individual Tab: Geist Mono, 2px Amber-500 underline (active), .rounded-t-[6px], close icon .icon-micro."

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import {
  MessageSquareIcon, FileTextIcon, XIcon,
  ChevronLeftIcon, ChevronRightIcon,
} from "lucide-react"

// New (add)
import {
  ChatBubble, Page, Xmark,
  NavArrowLeft, NavArrowRight,
} from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling**

- Tab container: `h-9` (36px), `bg-muted`
- Tab text: `.text-interface` (Geist Mono)
- Active tab: `border-b-2 border-amber-500`
- Tab border radius: `.rounded-t-[6px]`
- Close icon: `.icon-micro` (12px)
- Scroll buttons: `.icon-interface` (16px)

**Step 3: Verify build & visual**

- Test tab switching
- Test tab close
- Test scroll behavior with many tabs

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/chat/shell/ChatTabs.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(chat-tabs): migrate to Mechanical Grace + Iconoir"
```

---

### Task 5.4: Migrate ShellHeader

**Files:**
- Modify: `src/components/chat/shell/ShellHeader.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md)

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import { SunIcon, MoonIcon, PanelRightIcon, PanelRightCloseIcon } from "lucide-react"

// New (add)
import { SunLight, HalfMoon, SidebarExpand, SidebarCollapse } from "iconoir-react"
```

> **NOTE:** Verify exact Iconoir names for panel icons at [iconoir.com](https://iconoir.com)

**Step 2: Apply Mechanical Grace styling**

- Height: 72px (56px content + 16px stripes)
- Logo: Proper sizing
- Theme toggle: Ghost button, `.icon-interface`
- Panel toggle: Ghost button, Amber badge for artifact count
- Diagonal stripes: Industrial accent (10px height)

**Step 3: Verify build & visual**

- Test theme toggle
- Test panel toggle
- Verify diagonal stripes display

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/chat/shell/ShellHeader.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(shell-header): migrate to Mechanical Grace + Iconoir"
```

---

### Task 5.5: Migrate NotificationDropdown & PanelResizer

**Files:**
- Modify: `src/components/chat/shell/NotificationDropdown.tsx`
- Review: `src/components/chat/layout/PanelResizer.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "PanelResizer: 0.5px Hairline, Sky/Info feedback saat manipulasi drag/hover."

**Step 1: Replace Lucide imports in NotificationDropdown**

```tsx
// Current (remove)
import { BellIcon, FileTextIcon, InfoIcon, DownloadIcon, MessageSquareIcon, ChevronRightIcon } from "lucide-react"

// New (add)
import { Bell, Page, InfoCircle, Download, ChatBubble, NavArrowRight } from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling to NotificationDropdown**

- Bell icon: `.icon-interface`, badge for unread count
- Notification items: `.border-hairline` dividers
- Item icons: `.icon-interface`
- Timestamps: `.text-interface` (Geist Mono)

**Step 3: Review PanelResizer styling**

- Divider: `0.5px` hairline (`.border-hairline`)
- Hover/drag state: `bg-sky-500/20` (Sky feedback)
- Cursor: `cursor-col-resize`

**Step 4: Verify build & visual**

- Test notification dropdown
- Test panel resize drag behavior
- Verify Sky feedback on hover/drag

**Step 5: Update progress.md & write report**

**Step 6: Commit**

```bash
git add src/components/chat/shell/
git add src/components/chat/layout/PanelResizer.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(chat-shell): migrate NotificationDropdown and PanelResizer"
```

---

## Final Verification Checklist

### Build & Runtime
- [ ] `npm run build` sukses
- [ ] `npm run dev` berjalan normal
- [ ] No console errors

### Visual Checks - Layout
- [ ] 16-column grid works correctly
- [ ] Zero Chrome (no Global Header/Footer in chat)
- [ ] Layout variables applied correctly

### Visual Checks - Components
- [ ] ActivityBar displays correctly
- [ ] Panel switching works
- [ ] Sidebar collapse/expand works
- [ ] ChatTabs display correctly
- [ ] Tab switching/closing works
- [ ] ShellHeader displays correctly
- [ ] Theme toggle works
- [ ] Panel toggle works
- [ ] Diagonal stripes display
- [ ] NotificationDropdown works
- [ ] PanelResizer drag works

### Mechanical Grace Compliance
- [ ] All Lucide icons replaced with Iconoir
- [ ] Active states use Amber indicator
- [ ] Mono font for labels/tooltips
- [ ] Hairline borders used correctly
- [ ] Sky feedback on panel resizer

---

## Update MASTER-PLAN.md

Setelah FASE 5 selesai:

```markdown
| 5 - Chat Shell | ✅ Done | [DATE] | [DATE] |
```

---

## Next Phase

Lanjut ke: **FASE 6: Chat Interaction** → `plan/fase-6-chat-interaction.md`
