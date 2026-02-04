# FASE 6: Chat Workspace - Interaction - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

> **Parent Document**: [MASTER-PLAN.md](./MASTER-PLAN.md)
> **Status**: ⏳ Pending
> **Total Tasks**: 4
> **Prerequisite**: FASE 5 (Chat Shell) completed

**Goal:** Migrasi komponen interaksi percakapan (message bubbles, input, quick actions, indicators) ke standar Mechanical Grace.

**Architecture:**
- User messages vs Assistant messages have distinct styling
- Terminal-style thinking indicator
- Search status with diagnostic display
- Quick actions for copy/regenerate

**Tech Stack:** Tailwind CSS v4, iconoir-react

---

## Reference Documents

### Design System Specs (docs/)
| # | Dokumen | Relevansi |
|---|---------|-----------|
| 1 | **AI Elements** | Message bubbles, ChatInput, ThinkingIndicator specs |
| 2 | **Typography** | Sans for messages, Mono for metadata |
| 3 | **Shape & Layout** | `.rounded-action` for bubbles |
| 4 | **Class Naming** | `.border-ai`, `.text-interface` |

### Target Files
| File | Path | Lucide Icons |
|------|------|--------------|
| ChatInput | `src/components/chat/ChatInput.tsx` | SendIcon, FileIcon |
| MessageBubble | `src/components/chat/MessageBubble.tsx` | PaperclipIcon, PencilIcon, XIcon, SendHorizontalIcon |
| QuickActions | `src/components/chat/QuickActions.tsx` | CopyIcon, CheckIcon |
| ThinkingIndicator | `src/components/chat/ThinkingIndicator.tsx` | TBD |
| SearchStatusIndicator | `src/components/chat/SearchStatusIndicator.tsx` | SearchIcon, CheckCircleIcon, XCircleIcon, LoaderIcon |
| ToolStateIndicator | `src/components/chat/ToolStateIndicator.tsx` | Loader2Icon, AlertCircleIcon, GlobeIcon |

---

## Icon Replacement Mapping

| Lucide (Current) | Iconoir (New) | Context |
|------------------|---------------|---------|
| `SendIcon` | `Send` | Send message |
| `FileIcon` | `Page` | File attachment |
| `PaperclipIcon` | `Attachment` | Attach file |
| `PencilIcon` | `EditPencil` | Edit message |
| `XIcon` | `Xmark` | Cancel edit |
| `SendHorizontalIcon` | `Send` | Send edit |
| `CopyIcon` | `Copy` | Copy response |
| `CheckIcon` | `Check` | Copy success |
| `SearchIcon` | `Search` | Search status |
| `CheckCircleIcon` | `CheckCircle` | Success |
| `XCircleIcon` | `XmarkCircle` | Error |
| `LoaderIcon` | Custom spinner | Loading |
| `Loader2Icon` | Custom spinner | Loading |
| `AlertCircleIcon` | `WarningCircle` | Error |
| `GlobeIcon` | `Globe` | Web search |

---

## Deliverables

| Output | Lokasi |
|--------|--------|
| Migrated ChatInput | `src/components/chat/ChatInput.tsx` |
| Migrated MessageBubble | `src/components/chat/MessageBubble.tsx` |
| Migrated QuickActions | `src/components/chat/QuickActions.tsx` |
| Migrated ThinkingIndicator | `src/components/chat/ThinkingIndicator.tsx` |
| Migrated SearchStatusIndicator | `src/components/chat/SearchStatusIndicator.tsx` |
| Migrated ToolStateIndicator | `src/components/chat/ToolStateIndicator.tsx` |
| Progress log | `docs/makalah-design-system/implementation/progress.md` |
| Task reports | `docs/makalah-design-system/implementation/report/fase-6-task-*.md` |

---

## Tasks

### Task 6.1: Migrate ChatInput

**Files:**
- Modify: `src/components/chat/ChatInput.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "ChatInput: .rounded-action (8px), Geist Mono typing font, focus-ring Amber. Send Button: SendIcon, Ghost-to-Solid transition, .rounded-action. Attach Button: PaperclipIcon, memicu FileUploadButton, .icon-interface."

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import { SendIcon, FileIcon } from "lucide-react"

// New (add)
import { Send, Page } from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling**

- Input container: `.rounded-action` (8px)
- Typing font: `.text-interface` (Geist Mono) or keep Sans for narrative
- Focus ring: `focus:ring-amber-500`
- Send button: Ghost style, solid on hover
- Attach button: `.icon-interface` (16px)

**Step 3: Verify build & visual**

- Test typing in input
- Test send button states
- Test attach button

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/chat/ChatInput.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(chat-input): migrate to Mechanical Grace + Iconoir"
```

---

### Task 6.2: Migrate MessageBubble

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "MessageBubble (User): .rounded-action (8px), border-main (Slate-800), Sans font."
  > "Assistant Metadata: Geist Mono, Slate-500, text-indicator (11px)."
  > "Edit Mode: Swap text ke textarea, .border-ai (dashed), tombol Save/Cancel Mono."

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import { PaperclipIcon, PencilIcon, XIcon, SendHorizontalIcon } from "lucide-react"

// New (add)
import { Attachment, EditPencil, Xmark, Send } from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling**

User bubble:
- Container: `.rounded-action` (8px)
- Border: `border border-slate-800` (`.border-main`)
- Font: Sans (narrative)

Assistant bubble:
- No explicit border (or subtle)
- Metadata: `.text-interface`, `text-[11px]`, `text-slate-500`

Edit mode:
- Textarea: `.border-ai` (dashed, Sky color)
- Save/Cancel buttons: `.text-interface`

**Step 3: Verify build & visual**

- Test user/assistant message display
- Test edit mode toggle
- Test save/cancel edit

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/chat/MessageBubble.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(message-bubble): migrate to Mechanical Grace + Iconoir"
```

---

### Task 6.3: Migrate QuickActions

**Files:**
- Modify: `src/components/chat/QuickActions.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "QuickActions: Ghost-button, Geist Mono (text-[10px]), .icon-micro."

**Step 1: Replace Lucide imports**

```tsx
// Current (remove)
import { CopyIcon, CheckIcon } from "lucide-react"

// New (add)
import { Copy, Check } from "iconoir-react"
```

**Step 2: Apply Mechanical Grace styling**

- Button style: Ghost, subtle hover
- Icon size: `.icon-micro` (12px)
- Label font: `.text-interface`, `text-[10px]`
- Copy success: Check icon, Emerald color briefly

**Step 3: Verify build & visual**

- Test copy button
- Verify copied feedback

**Step 4: Update progress.md & write report**

**Step 5: Commit**

```bash
git add src/components/chat/QuickActions.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(quick-actions): migrate to Mechanical Grace + Iconoir"
```

---

### Task 6.4: Migrate Indicators (Thinking, Search, Tool)

**Files:**
- Review: `src/components/chat/ThinkingIndicator.tsx`
- Modify: `src/components/chat/SearchStatusIndicator.tsx`
- Modify: `src/components/chat/ToolStateIndicator.tsx`

**Reference:**
- [ai-elements.md](../docs/ai-elements.md):
  > "ThinkingIndicator: Terminal-block style, font Mono 'SYSTEM_PROCESSING'."
  > "SearchStatusIndicator: Hairline border, Ghost background, Mono diagnostic text."
  > "ToolStateIndicator: .border-ai (dashed), Status: RUNNING, DONE, ERROR (Uppercase)."

**Step 1: Replace Lucide imports in SearchStatusIndicator**

```tsx
// Current (remove)
import { SearchIcon, CheckCircleIcon, XCircleIcon, LoaderIcon } from "lucide-react"

// New (add)
import { Search, CheckCircle, XmarkCircle } from "iconoir-react"
```

**Step 2: Replace Lucide imports in ToolStateIndicator**

```tsx
// Current (remove)
import { Loader2Icon, AlertCircleIcon, GlobeIcon } from "lucide-react"

// New (add)
import { WarningCircle, Globe } from "iconoir-react"
```

**Step 3: Apply Mechanical Grace styling**

ThinkingIndicator:
- Container: Terminal-style, dark background
- Text: `.text-interface`, uppercase "SYSTEM_PROCESSING"
- Animation: Dot pulse animation

SearchStatusIndicator:
- Container: `.border-hairline`, ghost background
- Status text: `.text-interface`, Mono diagnostic
- Icons: `.icon-interface`

ToolStateIndicator:
- Container: `.border-ai` (dashed Sky border)
- Status labels: Uppercase, `.text-interface`
- Colors: RUNNING=Sky, DONE=Emerald, ERROR=Rose

**Step 4: Verify build & visual**

- Test thinking indicator display
- Test search status transitions
- Test tool state display

**Step 5: Update progress.md & write report**

**Step 6: Commit**

```bash
git add src/components/chat/ThinkingIndicator.tsx
git add src/components/chat/SearchStatusIndicator.tsx
git add src/components/chat/ToolStateIndicator.tsx
git add docs/makalah-design-system/implementation/
git commit -m "refactor(indicators): migrate to Mechanical Grace + Iconoir"
```

---

## Final Verification Checklist

### Build & Runtime
- [ ] `npm run build` sukses
- [ ] `npm run dev` berjalan normal
- [ ] No console errors

### Visual Checks
- [ ] ChatInput displays correctly
- [ ] Send/attach buttons work
- [ ] User message bubbles styled correctly
- [ ] Assistant message bubbles styled correctly
- [ ] Edit mode works
- [ ] Quick actions (copy) work
- [ ] Thinking indicator displays
- [ ] Search status displays
- [ ] Tool state displays

### Mechanical Grace Compliance
- [ ] All Lucide icons replaced with Iconoir
- [ ] User bubble: `.rounded-action`, `.border-main`
- [ ] Metadata: `.text-interface`, small size
- [ ] Edit mode: `.border-ai` (dashed)
- [ ] Status labels: Uppercase, Mono

---

## Update MASTER-PLAN.md

Setelah FASE 6 selesai:

```markdown
| 6 - Chat Interaction | ✅ Done | [DATE] | [DATE] |
```

---

## Next Phase

Lanjut ke: **FASE 7: Chat Artifacts** → `plan/fase-7-chat-artifacts.md`
