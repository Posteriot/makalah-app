# FASE 7: Chat Workspace - Artifacts & Paper - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Parent Document**: [MASTER-PLAN.md](./MASTER-PLAN.md)
> **Status**: ✅ Done
> **Total Tasks**: 4
> **Prerequisite**: FASE 6 (Chat Interaction) completed

**Goal:** Migrasi panel output AI (Artifact Panel, Viewer, List) dan komponen paper workflow ke standar Mechanical Grace.

**Architecture:**
- ArtifactPanel sebagai side panel utama untuk hasil riset
- ArtifactViewer untuk menampilkan konten artifact
- Paper stage progress dengan timeline dots
- Version history dan citation system

**Tech Stack:** Tailwind CSS v4, iconoir-react

---

## Reference Documents

### Design System Specs (docs/)
| # | Dokumen | Relevansi |
|---|---------|-----------|
| 1 | **AI Elements** | ArtifactPanel, ArtifactViewer, Paper stages specs |
| 2 | **Shape & Layout** | `.rounded-shell` for panels |
| 3 | **Visual Language** | Iconoir, `.icon-micro` scale |
| 4 | **Class Naming** | `.border-ai`, `.border-hairline` |

### Target Files
| File | Path | Lucide Icons |
|------|------|--------------|
| ArtifactPanel | `src/components/chat/ArtifactPanel.tsx` | FileTextIcon, XIcon, Maximize2Icon, DownloadIcon, PencilIcon, WandSparkles, CopyIcon, CheckIcon, MoreVerticalIcon, ChevronDownIcon, CodeIcon, ListIcon, TableIcon, BookOpenIcon, FunctionSquareIcon |
| ArtifactViewer | `src/components/chat/ArtifactViewer.tsx` | FileTextIcon, Loader2Icon, AlertTriangle, WandSparkles |
| ArtifactList | `src/components/chat/ArtifactList.tsx` | FileTextIcon, CodeIcon, ListIcon, TableIcon, BookOpenIcon, FunctionSquareIcon |
| ArtifactIndicator | `src/components/chat/ArtifactIndicator.tsx` | CheckCircleIcon, ChevronRightIcon |
| ArtifactEditor | `src/components/chat/ArtifactEditor.tsx` | SaveIcon, XIcon |
| FullsizeArtifactModal | `src/components/chat/FullsizeArtifactModal.tsx` | Multiple icons |
| VersionHistoryDialog | `src/components/chat/VersionHistoryDialog.tsx` | HistoryIcon, ChevronRightIcon, Loader2Icon |
| SourcesIndicator | `src/components/chat/SourcesIndicator.tsx` | ChevronDownIcon, CheckCircleIcon, ExternalLinkIcon |
| SidebarPaperSessions | `src/components/chat/sidebar/SidebarPaperSessions.tsx` | FileTextIcon, FolderIcon, ChevronRightIcon |
| SidebarProgress | `src/components/chat/sidebar/SidebarProgress.tsx` | GitBranchIcon |

---

## Icon Replacement Mapping

| Lucide (Current) | Iconoir (New) | Context |
|------------------|---------------|---------|
| `FileTextIcon` | `Page` | Document/paper |
| `XIcon` | `Xmark` | Close |
| `Maximize2Icon` | `Expand` | Fullscreen |
| `DownloadIcon` | `Download` | Download |
| `PencilIcon` | `EditPencil` | Edit |
| `WandSparkles` | `MagicWand` | AI magic |
| `CopyIcon` | `Copy` | Copy |
| `CheckIcon` | `Check` | Done/copied |
| `MoreVerticalIcon` | `MoreVert` | More options |
| `ChevronDownIcon` | `NavArrowDown` | Expand |
| `CodeIcon` | `Code` | Code artifact |
| `ListIcon` | `List` | Outline artifact |
| `TableIcon` | `Table` | Table artifact |
| `BookOpenIcon` | `Book` | Citation artifact |
| `FunctionSquareIcon` | `Math` | Formula artifact |
| `AlertTriangle` | `WarningTriangle` | Warning |
| `Loader2Icon` | Custom spinner | Loading |
| `CheckCircleIcon` | `CheckCircle` | Success |
| `ChevronRightIcon` | `NavArrowRight` | Navigate |
| `SaveIcon` | `Save` | Save |
| `HistoryIcon` | `HistoricShield` atau `Clock` | History |
| `ExternalLinkIcon` | `OpenNewWindow` | External |
| `FolderIcon` | `Folder` | Session folder |
| `GitBranchIcon` | `GitBranch` | Progress |

---

## Deliverables

| Output | Lokasi |
|--------|--------|
| Migrated ArtifactPanel | `src/components/chat/ArtifactPanel.tsx` |
| Migrated ArtifactViewer | `src/components/chat/ArtifactViewer.tsx` |
| Migrated ArtifactList | `src/components/chat/ArtifactList.tsx` |
| Migrated related components | Various |
| Progress log | `docs/makalah-design-system/implementation/progress.md` |
| Task reports | `docs/makalah-design-system/implementation/report/fase-7-task-*.md` |

---

## Tasks

### Task 7.1: Migrate ArtifactPanel ✅ Done

**Files:**
- Modify: `src/components/chat/ArtifactPanel.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "ArtifactPanel: Slate-950 Solid, .rounded-shell (16px), Hairline Slate-800 border."
  > "Panel Header Actions: Row of icons, .icon-micro, Ghost button, tooltip Mono."

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import {
  FileTextIcon, XIcon, Maximize2Icon, DownloadIcon,
  PencilIcon, WandSparkles, CopyIcon, CheckIcon,
  MoreVerticalIcon, ChevronDownIcon, CodeIcon, ListIcon,
  TableIcon, BookOpenIcon, FunctionSquareIcon,
} from "lucide-react"

// New (add)
import {
  Page, Xmark, Expand, Download, EditPencil, MagicWand,
  Copy, Check, MoreVert, NavArrowDown, Code, List,
  Table2Columns, Book, Math,
} from "iconoir-react"
```

**Step 2: Update typeIcons mapping**

```tsx
const typeIcons: Record<ArtifactType, React.ElementType> = {
  code: Code,
  outline: List,
  section: Page,
  table: Table2Columns,
  citation: Book,
  formula: Math,
}
```

**Step 3: Apply Mechanical Grace styling**

- Panel container: `.rounded-shell` (16px), `bg-slate-950` dark
- Border: `.border-hairline`, Slate-800 color
- Header actions: `.icon-micro` (12px-14px)
- Tooltips: `.text-interface` (Mono)
- Download dropdown: Hairline separators

**Step 4: Verify build & visual**

**Step 5: Update progress.md & write report**

**Step 6: Commit**

```bash
git add src/components/chat/ArtifactPanel.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(artifact-panel): migrate to Mechanical Grace + Iconoir"
```

---

### Task 7.2: Migrate ArtifactViewer, ArtifactList, ArtifactIndicator ✅ Done

**Files:**
- Modify: `src/components/chat/ArtifactViewer.tsx`
- Modify: `src/components/chat/ArtifactList.tsx`
- Modify: `src/components/chat/ArtifactIndicator.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "ArtifactIndicator: .rounded-badge (6px), Dashed border (Sky), Label 'SYSTEM_OUTPUT' (Mono)."
  > "ArtifactList: Antarmuka padat (dense), icon-micro, font Mono metadata versi."

**Step 1: Replace Lucide imports in each file**

ArtifactViewer:
```tsx
import { Page, WarningTriangle, MagicWand } from "iconoir-react"
```

ArtifactList:
```tsx
import { Page, Code, List, Table2Columns, Book, Math } from "iconoir-react"
```

ArtifactIndicator:
```tsx
import { CheckCircle, NavArrowRight } from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling**

ArtifactViewer:
- Content area: Sans font for narrative
- Metadata: `.text-interface`

ArtifactList:
- Dense layout: Minimal padding
- Icons: `.icon-micro`
- Version numbers: `.text-interface`

ArtifactIndicator:
- Badge: `.rounded-badge` (6px)
- Border: `.border-ai` (dashed Sky)
- Label: `.text-interface`, uppercase

**Step 3: Verify build & visual**

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/chat/ArtifactViewer.tsx
git add src/components/chat/ArtifactList.tsx
git add src/components/chat/ArtifactIndicator.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(artifacts): migrate viewer, list, indicator to Mechanical Grace"
```

---

### Task 7.3: Migrate ArtifactEditor, FullsizeModal, VersionHistory ✅ Done

**Files:**
- Modify: `src/components/chat/ArtifactEditor.tsx`
- Modify: `src/components/chat/FullsizeArtifactModal.tsx`
- Modify: `src/components/chat/VersionHistoryDialog.tsx`

**Step 1: Replace Lucide imports**

ArtifactEditor:
```tsx
import { Save, Xmark } from "iconoir-react"
```

FullsizeArtifactModal: (audit and replace all icons)

VersionHistoryDialog:
```tsx
import { HistoricShield, NavArrowRight } from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling**

- Editor: `.border-ai` for edit textarea
- Modal: `.rounded-shell`, dark background
- History list: `.border-hairline` dividers, `.text-interface` timestamps

**Step 3: Verify build & visual**

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/chat/ArtifactEditor.tsx
git add src/components/chat/FullsizeArtifactModal.tsx
git add src/components/chat/VersionHistoryDialog.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(artifacts): migrate editor, modal, history to Mechanical Grace"
```

---

### Task 7.4: Migrate SourcesIndicator & Sidebar Paper Components ✅ Done

**Files:**
- Modify: `src/components/chat/SourcesIndicator.tsx`
- Modify: `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- Modify: `src/components/chat/sidebar/SidebarProgress.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "Citation & Sources: .rounded-badge (4px/6px), hairline border, Mono typography."
  > "Session Folders: FolderIcon (Orange), blue status dots, collapse/expand chevrons."
  > "SidebarProgress: Vertical line with dots, .rounded-full progress bar, Mono metadata."

**Step 1: Replace Lucide imports**

SourcesIndicator:
```tsx
import { NavArrowDown, CheckCircle, OpenNewWindow } from "iconoir-react"
```

SidebarPaperSessions:
```tsx
import { Page, Folder, NavArrowRight } from "iconoir-react"
```

SidebarProgress:
```tsx
import { GitBranch } from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling**

SourcesIndicator:
- Citation chips: `.rounded-badge` (4px)
- Source list: `.border-hairline`
- External link icon: `.icon-micro`

SidebarPaperSessions:
- Folder icon: Amber/Orange color
- Status dots: Sky for active
- Chevrons: `.icon-interface`

SidebarProgress:
- Timeline line: `.border-hairline`, vertical
- Dots: `.rounded-full`, Amber for complete
- Labels: `.text-interface`

**Step 3: Verify build & visual**

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/chat/SourcesIndicator.tsx
git add src/components/chat/sidebar/SidebarPaperSessions.tsx
git add src/components/chat/sidebar/SidebarProgress.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(sources-sidebar): migrate to Mechanical Grace + Iconoir"
```

---

## Final Verification Checklist

### Build & Runtime
- [ ] `npm run build` sukses
- [ ] `npm run dev` berjalan normal
- [ ] No console errors

### Visual Checks
- [ ] ArtifactPanel displays correctly
- [ ] Panel header actions work
- [ ] Download menu works
- [ ] ArtifactViewer displays content
- [ ] ArtifactList shows type icons
- [ ] ArtifactIndicator styled correctly
- [ ] Editor works in edit mode
- [ ] Fullsize modal opens correctly
- [ ] Version history displays
- [ ] Sources indicator works
- [ ] Paper sessions in sidebar
- [ ] Progress timeline displays

### Mechanical Grace Compliance
- [ ] All Lucide icons replaced with Iconoir
- [ ] Panel: `.rounded-shell`, dark bg
- [ ] Hairline borders used
- [ ] Mono font for metadata
- [ ] `.border-ai` for AI elements

---

## Update MASTER-PLAN.md

Setelah FASE 7 selesai:

```markdown
| 7 - Chat Artifacts | ✅ Done | [DATE] | [DATE] |
```

---

## Next Phase

Lanjut ke: **FASE 8: Chat Tools** → `plan/fase-8-chat-tools.md`
