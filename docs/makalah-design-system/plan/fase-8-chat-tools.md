# FASE 8: Chat Workspace - Tools - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Parent Document**: [MASTER-PLAN.md](./MASTER-PLAN.md)
> **Status**: ✅ Done
> **Total Tasks**: 3
> **Prerequisite**: FASE 7 (Chat Artifacts) completed

**Goal:** Migrasi tool/dialog pendukung di Chat (FileUpload, ChatWindow utils, QuotaWarning, TemplateGrid) ke standar Mechanical Grace.

**Architecture:**
- FileUploadButton untuk attach file
- ChatWindow mencakup berbagai utility komponen
- QuotaWarning untuk alert limitasi
- TemplateGrid untuk starting templates

**Tech Stack:** Tailwind CSS v4, iconoir-react

---

## Reference Documents

### Design System Specs (docs/)
| # | Dokumen | Relevansi |
|---|---------|-----------|
| 1 | **AI Elements** | File Upload UI, QuotaWarning specs |
| 2 | **Visual Language** | Iconoir icons |
| 3 | **Components** | Alert, Card standards |
| 4 | **Class Naming** | Utility classes |

### Target Files
| File | Path | Lucide Icons |
|------|------|--------------|
| FileUploadButton | `src/components/chat/FileUploadButton.tsx` | PaperclipIcon, Loader2 |
| ChatWindow | `src/components/chat/ChatWindow.tsx` | MenuIcon, AlertCircleIcon, RotateCcwIcon, SearchXIcon, MessageSquarePlusIcon, SparklesIcon, FileTextIcon, SearchIcon |
| QuotaWarningBanner | `src/components/chat/QuotaWarningBanner.tsx` | AlertTriangle, Zap, CreditCard, X |
| TemplateGrid | `src/components/chat/messages/TemplateGrid.tsx` | FileTextIcon, MessageCircleIcon |

---

## Icon Replacement Mapping

| Lucide (Current) | Iconoir (New) | Context |
|------------------|---------------|---------|
| `PaperclipIcon` | `Attachment` | Attach file |
| `Loader2` | Custom spinner | Loading |
| `MenuIcon` | `Menu` | Mobile menu |
| `AlertCircleIcon` | `WarningCircle` | Error |
| `RotateCcwIcon` | `Refresh` | Regenerate |
| `SearchXIcon` | `SearchXmark` | No results |
| `MessageSquarePlusIcon` | `ChatBubblePlus` | New chat |
| `SparklesIcon` | `Sparkles` | AI features |
| `FileTextIcon` | `Page` | Document |
| `SearchIcon` | `Search` | Search |
| `AlertTriangle` | `WarningTriangle` | Warning |
| `Zap` | `Flash` | Upgrade |
| `CreditCard` | `CreditCard` | Payment |
| `X` | `Xmark` | Close |
| `MessageCircleIcon` | `ChatBubble` | Chat template |

---

## Deliverables

| Output | Lokasi |
|--------|--------|
| Migrated FileUploadButton | `src/components/chat/FileUploadButton.tsx` |
| Migrated ChatWindow | `src/components/chat/ChatWindow.tsx` |
| Migrated QuotaWarningBanner | `src/components/chat/QuotaWarningBanner.tsx` |
| Migrated TemplateGrid | `src/components/chat/messages/TemplateGrid.tsx` |
| Progress log | `docs/makalah-design-system/implementation/progress.md` |
| Task reports | `docs/makalah-design-system/implementation/report/fase-8-task-*.md` |

---

## Tasks

### Task 8.1: Migrate FileUploadButton ✅ Done

**Files:**
- Modify: `src/components/chat/FileUploadButton.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "Attach Button: PaperclipIcon, memicu FileUploadButton, .icon-interface."

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import { PaperclipIcon, Loader2 } from "lucide-react"

// New (add)
import { Attachment } from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling**

- Button: Ghost style, `.rounded-action`
- Icon: `.icon-interface` (16px)
- Loading state: Custom spinner or animated icon
- Tooltip: `.text-interface`

**Step 3: Verify build & visual**

- Test file upload trigger
- Test loading state

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/chat/FileUploadButton.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(file-upload): migrate to Mechanical Grace + Iconoir"
```

---

### Task 8.2: Migrate ChatWindow ✅ Done

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import {
  MenuIcon, AlertCircleIcon, RotateCcwIcon, SearchXIcon,
  MessageSquarePlusIcon, SparklesIcon, FileTextIcon, SearchIcon
} from "lucide-react"

// New (add)
import {
  Menu, WarningCircle, Refresh,
  ChatBubblePlus, Sparkles, Page, Search
} from "iconoir-react"
// Note: SearchXIcon might need custom or alternative
```

**Step 2: Apply Mechanical Grace styling**

- Empty state: Industrial style, Mono text
- Error states: Rose color with warning icon
- Regenerate button: Ghost style
- New chat CTA: Primary style, `.rounded-action`

**Step 3: Verify build & visual**

- Test empty state display
- Test error states
- Test mobile menu

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(chat-window): migrate to Mechanical Grace + Iconoir"
```

---

### Task 8.3: Migrate QuotaWarningBanner & TemplateGrid ✅ Done

**Files:**
- Modify: `src/components/chat/QuotaWarningBanner.tsx`
- Modify: `src/components/chat/messages/TemplateGrid.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "QuotaWarning: High-contrast Alert, Slate-950 bg, Amber-500 border, Close button (X) micro."

**Step 1: Replace Lucide imports in QuotaWarningBanner**

```tsx
// Current (remove)
import { AlertTriangle, Zap, CreditCard, X } from "lucide-react"

// New (add)
import { WarningTriangle, Flash, CreditCard, Xmark } from "iconoir-react"
```

**Step 2: Replace Lucide imports in TemplateGrid**

```tsx
// Current (remove)
import { FileTextIcon, MessageCircleIcon } from "lucide-react"

// New (add)
import { Page, ChatBubble } from "iconoir-react"
```

**Step 3: Apply Mechanical Grace styling**

QuotaWarningBanner:
- Container: `bg-slate-950`, `border-amber-500`
- High contrast text
- Close button: `.icon-micro`
- Upgrade CTA: Amber/primary button

TemplateGrid:
- Template cards: `.rounded-action`
- Icons: `.icon-interface`
- Labels: `.text-interface` or Sans

**Step 4: Verify build & visual**

- Trigger quota warning (test with low quota)
- Test template grid selection

**Step 5: Update progress.md & write report**

**Step 6: Commit**

```bash
git add src/components/chat/QuotaWarningBanner.tsx
git add src/components/chat/messages/TemplateGrid.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(chat-tools): migrate QuotaWarning and TemplateGrid"
```

---

## Final Verification Checklist

### Build & Runtime
- [ ] `npm run build` sukses
- [ ] `npm run dev` berjalan normal
- [ ] No console errors

### Visual Checks
- [ ] FileUploadButton works
- [ ] ChatWindow states display correctly
- [ ] Empty state styled
- [ ] Error states styled
- [ ] QuotaWarningBanner displays
- [ ] Close button works
- [ ] TemplateGrid displays
- [ ] Template selection works

### Mechanical Grace Compliance
- [ ] All Lucide icons replaced with Iconoir
- [ ] Buttons use `.rounded-action`
- [ ] Warning: Slate bg, Amber border
- [ ] Mono font where appropriate

---

## Update MASTER-PLAN.md

Setelah FASE 8 selesai:

```markdown
| 8 - Chat Tools | ✅ Done | [DATE] | [DATE] |
```

---

## Next Phase

Lanjut ke: **FASE 9: Admin** → `plan/fase-9-admin.md`
