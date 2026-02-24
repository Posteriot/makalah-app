# Mobile Chat Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign mobile chat (`< 768px`) from "desktop minus" to iOS-native composer-first experience, without changing desktop layout.

**Architecture:** Mobile-only changes gated behind `md:` breakpoint. New mobile components created as siblings (not replacements) of desktop components. Shared logic (hooks, state) untouched. CSS `--chat-*` token system fully preserved.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, Radix UI Sheet/AlertDialog, existing `--chat-*` tokens from `globals-new.css`

**Design doc:** `docs/system-design-standarization/chat-page-style-revision/mobile-chat-redesign.md`

---

## Task Overview

| # | Task | Files | Estimated |
|---|------|-------|-----------|
| 1 | Hide ActivityBar on mobile | ChatLayout.tsx | Small |
| 2 | Clean Landing — mobile empty state | ChatWindow.tsx, TemplateGrid.tsx | Medium |
| 3 | Conversation header — mobile redesign | ChatWindow.tsx | Medium |
| 4 | Mobile `--chat-input-pad-x` fix | ChatLayout.tsx | Small |
| 5 | Paper mini-bar above input | New: MobilePaperMiniBar.tsx, ChatWindow.tsx | Medium |
| 6 | Drawer tabs (RIWAYAT/PAPER/PROGRES) | ChatSidebar.tsx | Medium |
| 7 | Action sheet (··· menu) | New: MobileActionSheet.tsx, ChatWindow.tsx | Medium |
| 8 | Artifact list screen | New: MobileArtifactList.tsx | Medium |
| 9 | Full-screen artifact viewer | New: MobileArtifactViewer.tsx, ChatContainer.tsx | Large |
| 10 | Full-screen refrasa viewer | New: MobileRefrasaViewer.tsx | Medium |
| 11 | iOS safe area + viewport | chat/layout.tsx, globals-new.css | Small |
| 12 | Message edit — tap instead of hover | MessageBubble.tsx | Small |
| 13 | Integration + visual QA | All mobile components | Large |

---

## Task 1: Hide ActivityBar on Mobile

ActivityBar (48px column) currently always visible. On mobile it wastes space and has no purpose (drawer replaces panel navigation).

**Files:**
- Modify: `src/components/chat/layout/ChatLayout.tsx:267-272`

**Step 1: Add `hidden md:flex` to ActivityBar wrapper**

In `ChatLayout.tsx`, the ActivityBar is rendered directly in the grid (line 267). Wrap it or add responsive class:

```tsx
// BEFORE (line 267-272):
<ActivityBar
  activePanel={activePanel}
  onPanelChange={handlePanelChange}
  isSidebarCollapsed={isSidebarCollapsed}
  onToggleSidebar={handleToggleSidebar}
/>

// AFTER:
<div className="hidden md:flex">
  <ActivityBar
    activePanel={activePanel}
    onPanelChange={handlePanelChange}
    isSidebarCollapsed={isSidebarCollapsed}
    onToggleSidebar={handleToggleSidebar}
  />
</div>
```

**Step 2: Update grid template for mobile**

In `getGridTemplateColumns()` (line 232), the first column is always `var(--activity-bar-width)`. On mobile this becomes `0px` since ActivityBar is hidden. Add a responsive approach:

```tsx
// In the grid container (line 256), add mobile override:
// Option: use Tailwind responsive grid-cols on mobile
// The simplest approach: keep JS grid but set --activity-bar-width to 0 on mobile via CSS

// In globals-new.css, add inside [data-chat-scope]:
@media (max-width: 767px) {
  [data-chat-scope] {
    --activity-bar-width: 0px;
  }
}
```

**Step 3: Verify desktop unchanged**

Run: `npm run dev` → check desktop at `≥ 768px` — ActivityBar visible, grid intact.
Check mobile at `< 768px` — ActivityBar gone, no 48px gap.

**Step 4: Commit**

```bash
git add src/components/chat/layout/ChatLayout.tsx src/app/globals-new.css
git commit -m "feat(mobile): hide ActivityBar on mobile (<768px)"
```

---

## Task 2: Clean Landing — Mobile Empty State

Replace current mobile empty state (TemplateGrid with heading + description) with composer-first clean landing.

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx:581-621` (empty state block)
- Modify: `src/components/chat/messages/TemplateGrid.tsx` (add mobile variant)

**Step 1: Create mobile quick action chips in TemplateGrid**

Add a `variant` prop to TemplateGrid for mobile chip layout:

```tsx
// In TemplateGrid.tsx, add props:
interface TemplateGridProps {
  onTemplateSelect: (template: Template) => void
  onSidebarLinkClick?: () => void
  disabled?: boolean
  variant?: "default" | "mobile-chips"  // NEW
}

// Add third template for Refrasa:
const templates: Template[] = [
  {
    id: "starter-discussion",
    label: "Mari berdiskusi terlebih dahulu.",
    message: "Mari berdiskusi terlebih dahulu.",
    chipLabel: "Diskusi riset",  // NEW: short label for chips
  },
  {
    id: "starter-paper",
    label: "Mari berkolaborasi menyusun paper akademik.",
    message: "Mari berkolaborasi menyusun paper akademik.",
    chipLabel: "Paper akademik",
  },
  {
    id: "starter-refrasa",
    label: "Tolong bantu saya memperbaiki gaya penulisan teks ini.",
    message: "Tolong bantu saya memperbaiki gaya penulisan teks ini.",
    chipLabel: "Refrasa",
  },
]
```

**Step 2: Add mobile chip rendering**

```tsx
// In TemplateGrid, when variant === "mobile-chips":
if (variant === "mobile-chips") {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {templates.map((template) => (
        <button
          key={template.id}
          onClick={() => onTemplateSelect(template)}
          disabled={disabled}
          className="px-3 py-1.5 rounded-action text-xs font-mono
            bg-[var(--chat-secondary)] text-[var(--chat-secondary-foreground)]
            hover:bg-[var(--chat-accent)] disabled:opacity-50
            transition-colors"
        >
          {template.chipLabel}
        </button>
      ))}
    </div>
  )
}
```

**Step 3: Redesign mobile empty state in ChatWindow**

Replace lines 581-621 in `ChatWindow.tsx`:

```tsx
if (!conversationId) {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Mobile: Clean Landing */}
      <div className="md:hidden flex-1 flex flex-col">
        {/* Header: hamburger + theme toggle */}
        <div className="flex items-center justify-between px-4 pt-2">
          <Button variant="ghost" size="icon" onClick={onMobileMenuClick} aria-label="Menu">
            <Menu className="h-5 w-5 text-[var(--chat-muted-foreground)]" />
          </Button>
          {/* Theme toggle - import from TopBar or extract */}
        </div>

        {/* Center: Brand + Chips */}
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h1 className="text-interface tracking-widest text-lg text-[var(--chat-foreground)] mb-2">
            M A K A L A H
          </h1>
          <p className="text-interface text-xs text-[var(--chat-muted-foreground)] mb-8">
            Asisten penulisan ilmiah
          </p>
          <TemplateGrid
            variant="mobile-chips"
            onTemplateSelect={(template) =>
              void handleStarterPromptClick(template.message)
            }
            disabled={isCreatingChat}
          />
        </div>

        {/* Input at bottom */}
        <ChatInput
          input={input}
          onInputChange={handleInputChange}
          onSubmit={async (e) => {
            e.preventDefault()
            if (!input.trim()) return
            await handleStartNewChat(input.trim())
          }}
          isLoading={isCreatingChat}
          isGenerating={false}
          conversationId={conversationId}
          uploadedFileIds={uploadedFileIds}
          onFileUploaded={handleFileUploaded}
        />
      </div>

      {/* Desktop: Existing empty state (unchanged) */}
      <div className="hidden md:flex flex-1 flex-col h-full overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-6">
          <TemplateGrid
            onTemplateSelect={(template) =>
              void handleStarterPromptClick(template.message)
            }
            onSidebarLinkClick={handleSidebarLinkClick}
            disabled={isCreatingChat}
          />
        </div>
        <ChatInput
          input={input}
          onInputChange={handleInputChange}
          onSubmit={async (e) => {
            e.preventDefault()
            if (!input.trim()) return
            await handleStartNewChat(input.trim())
          }}
          isLoading={isCreatingChat}
          isGenerating={false}
          conversationId={conversationId}
          uploadedFileIds={uploadedFileIds}
          onFileUploaded={handleFileUploaded}
        />
      </div>
    </div>
  )
}
```

**Step 4: Verify**

- Mobile: Clean landing with brand + chips + input. No heading "Mari berdiskusi!"
- Desktop: Unchanged TemplateGrid with heading + description.
- Tap chip → creates conversation and navigates.

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx src/components/chat/messages/TemplateGrid.tsx
git commit -m "feat(mobile): clean composer-first landing page"
```

---

## Task 3: Conversation Header — Mobile Redesign

Replace generic "Makalah Chat" header with conversation title + action menu trigger.

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx:649-654` (conversation mobile header)

**Step 1: Add props for conversation title and actions**

ChatWindow already receives `conversationId`. Need conversation title. Check if it's available from existing queries.

In ChatWindow, `conversation` is already queried (line ~148):
```tsx
const conversation = useQuery(
  api.conversations.getById,
  safeConversationId ? { conversationId: safeConversationId } : "skip"
)
```

**Step 2: Redesign mobile header**

Replace lines 649-654:

```tsx
{/* Mobile Header */}
<div className="md:hidden px-3 py-2.5 border-b border-[color:var(--chat-border)]
  flex items-center gap-2 bg-[var(--chat-background)]">
  <Button variant="ghost" size="icon" onClick={onMobileMenuClick}
    aria-label="Menu" className="shrink-0">
    <Menu className="h-5 w-5 text-[var(--chat-muted-foreground)]" />
  </Button>
  <span className="flex-1 truncate text-sm font-mono font-semibold
    text-[var(--chat-foreground)]">
    {conversation?.title || "Percakapan baru"}
  </span>
  <Button variant="ghost" size="icon" onClick={() => setShowActionSheet(true)}
    aria-label="Actions" className="shrink-0">
    <MoreVert className="h-5 w-5 text-[var(--chat-muted-foreground)]" />
  </Button>
</div>
```

**Step 3: Add `showActionSheet` state**

```tsx
const [showActionSheet, setShowActionSheet] = useState(false)
```

(Action sheet component created in Task 7.)

**Step 4: Also update not-found header (lines 627-633)**

Same pattern: hamburger + title + no ··· (since conversation doesn't exist).

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat(mobile): conversation header with title and action trigger"
```

---

## Task 4: Mobile `--chat-input-pad-x` Fix

Desktop uses `10rem`/`5rem` padding on messages and input. On mobile this wastes massive horizontal space. Override to sensible mobile value.

**Files:**
- Modify: `src/app/globals-new.css`

**Step 1: Add mobile override**

```css
/* Inside existing [data-chat-scope] media query from Task 1, or new: */
@media (max-width: 767px) {
  [data-chat-scope] {
    --activity-bar-width: 0px;
    --chat-input-pad-x: 1rem;  /* 16px — standard mobile padding */
  }
}
```

This automatically applies to ChatInput (line 52), messages (line 703), skeletons (line 665), empty state (line 678), ChatProcessStatusBar (line 27), and error overlay (lines 758-759) — all use `var(--chat-input-pad-x, 5rem)`.

**Step 2: Verify**

- Mobile: Messages and input have 16px side padding.
- Desktop: Unchanged (10rem/5rem based on sidebar state).

**Step 3: Commit**

```bash
git add src/app/globals-new.css
git commit -m "feat(mobile): fix message/input padding for mobile viewport"
```

---

## Task 5: Paper Mini-bar Above Input

Collapsible bar showing current paper stage, positioned between messages and input on mobile.

**Files:**
- Create: `src/components/paper/MobilePaperMiniBar.tsx`
- Modify: `src/components/chat/ChatWindow.tsx` (insert above ChatInput, mobile only)

**Step 1: Create MobilePaperMiniBar component**

```tsx
// src/components/paper/MobilePaperMiniBar.tsx
"use client"

import { useState } from "react"
import { STAGE_ORDER, STAGE_LABELS } from "@convex/paperSessions/constants"
import type { PaperStage } from "@convex/paperSessions/constants"

interface MobilePaperMiniBarProps {
  currentStage: PaperStage
  stageStatus: string
  stageData?: Record<string, { validatedAt?: number }>
  onRewindRequest?: (targetStage: PaperStage) => void
}

export function MobilePaperMiniBar({
  currentStage,
  stageStatus,
  stageData,
  onRewindRequest,
}: MobilePaperMiniBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  const stageNumber = currentIndex + 1

  return (
    <div className="md:hidden border-t border-[color:var(--chat-border)]
      bg-[var(--chat-muted)]">
      {/* Collapsed bar */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2
          text-xs font-mono"
      >
        <span className="font-semibold text-[var(--chat-foreground)]">
          {STAGE_LABELS[currentStage]}
        </span>
        <span className="text-[var(--chat-muted-foreground)]">
          {stageNumber}/13 {isExpanded ? "▴" : "▾"}
        </span>
      </button>

      {/* Expanded stage pills */}
      {isExpanded && (
        <div className="overflow-x-auto no-scrollbar pb-2 px-4">
          <div className="flex items-center gap-1.5 min-w-max">
            {STAGE_ORDER.map((stage, index) => {
              const isCompleted = stageData?.[stage]?.validatedAt != null
              const isCurrent = stage === currentStage
              const isPending = !isCompleted && !isCurrent

              return (
                <button
                  key={stage}
                  onClick={() => {
                    if (isCompleted && onRewindRequest) {
                      onRewindRequest(stage)
                    }
                  }}
                  disabled={!isCompleted}
                  className={`
                    flex flex-col items-center gap-0.5 px-2 py-1 rounded-badge
                    text-[10px] font-mono min-w-[48px]
                    ${isCompleted
                      ? "bg-[var(--chat-secondary)] text-[var(--chat-foreground)] cursor-pointer"
                      : isCurrent
                        ? "bg-[var(--chat-info)] text-white"
                        : "bg-transparent text-[var(--chat-muted-foreground)]"
                    }
                  `}
                >
                  <span className="font-semibold">
                    {isCompleted ? "✓" : isCurrent ? "●" : index + 1}
                  </span>
                  <span className="truncate max-w-[40px]">
                    {STAGE_LABELS[stage].slice(0, 5)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
```

**Step 2: Insert in ChatWindow above ChatInput (mobile only)**

In the conversation return block (after `ChatProcessStatusBar`, before `ChatInput` ~line 782):

```tsx
{/* Mobile Paper Mini-bar */}
{isPaperMode && (
  <MobilePaperMiniBar
    currentStage={paperSession?.currentStage}
    stageStatus={stageStatus}
    stageData={stageData}
    onRewindRequest={(targetStage) => {
      // Open RewindConfirmationDialog
      setRewindTarget(targetStage)
    }}
  />
)}
```

**Step 3: Wire up RewindConfirmationDialog**

Add state for `rewindTarget` and render existing `RewindConfirmationDialog` when target is set.

**Step 4: Verify**

- Mobile + paper mode: mini-bar appears above input, shows stage name + counter.
- Tap ▾ → horizontal scrollable stage pills appear.
- Tap completed stage → rewind confirmation dialog.
- Desktop: mini-bar hidden (`md:hidden`).

**Step 5: Commit**

```bash
git add src/components/paper/MobilePaperMiniBar.tsx src/components/chat/ChatWindow.tsx
git commit -m "feat(mobile): paper stage mini-bar above chat input"
```

---

## Task 6: Drawer Tabs (RIWAYAT/PAPER/PROGRES)

Add tab navigation inside mobile sidebar drawer to access all 3 panels (currently only accessible via ActivityBar which is hidden on mobile).

**Files:**
- Modify: `src/components/chat/ChatSidebar.tsx`

**Step 1: Add mobile panel tabs**

Currently `ChatSidebar` renders one panel at a time based on `activePanel` prop from `ChatLayout` (which gets it from `ActivityBar`). On mobile, ActivityBar is hidden, so we need inline tabs.

Add tab bar above content, visible only on mobile:

```tsx
// Inside ChatSidebar, before renderContent():

{/* Mobile Panel Tabs - hidden on desktop (ActivityBar handles this) */}
<div className="md:hidden flex border-b border-[color:var(--chat-sidebar-border)]">
  {(["chat-history", "paper", "progress"] as PanelType[]).map((panel) => (
    <button
      key={panel}
      onClick={() => onPanelChange?.(panel)}
      className={`flex-1 py-2 text-[10px] font-mono uppercase tracking-widest
        transition-colors
        ${activePanel === panel
          ? "text-[var(--chat-sidebar-foreground)] border-b-2 border-[color:var(--chat-border)]"
          : "text-[var(--chat-muted-foreground)]"
        }
      `}
    >
      {panel === "chat-history" ? "Riwayat"
        : panel === "paper" ? "Paper"
        : "Progres"}
    </button>
  ))}
</div>
```

**Step 2: Add `onPanelChange` prop to ChatSidebar**

ChatSidebar currently doesn't expose panel switching. Need to add callback:

```tsx
interface ChatSidebarProps {
  // ... existing props
  onPanelChange?: (panel: PanelType) => void  // NEW
}
```

Wire this from ChatLayout's `handlePanelChange` through both desktop sidebar and mobile Sheet:

```tsx
// In ChatLayout Sheet (line 351):
<ChatSidebar
  // ... existing props
  onPanelChange={handlePanelChange}
/>
```

**Step 3: Add Settings link to footer**

Below CreditMeter in ChatSidebar footer:

```tsx
{/* Settings link - mobile only */}
<div className="md:hidden px-4 py-2 border-t border-[color:var(--chat-sidebar-border)]">
  <Link href="/settings"
    className="flex items-center gap-2 text-xs font-mono
      text-[var(--chat-muted-foreground)]"
    onClick={() => onCloseMobile?.()}>
    <Settings className="h-4 w-4" />
    Pengaturan
  </Link>
</div>
```

**Step 4: Verify**

- Mobile drawer: three tabs visible at top (RIWAYAT, PAPER, PROGRES).
- Tap tab → switches panel content.
- Desktop: tabs hidden, ActivityBar handles switching.
- Settings link visible in drawer footer on mobile.

**Step 5: Commit**

```bash
git add src/components/chat/ChatSidebar.tsx src/components/chat/layout/ChatLayout.tsx
git commit -m "feat(mobile): drawer panel tabs and settings link"
```

---

## Task 7: Action Sheet (··· Menu)

iOS-style action sheet for per-conversation actions on mobile.

**Files:**
- Create: `src/components/chat/mobile/MobileActionSheet.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`

**Step 1: Create MobileActionSheet using Sheet**

```tsx
// src/components/chat/mobile/MobileActionSheet.tsx
"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Id } from "@convex/_generated/dataModel"

interface MobileActionSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: Id<"conversations"> | null
  artifactCount: number
  onViewArtifacts: () => void
  onRename: () => void
  onDelete: () => void
}

export function MobileActionSheet({
  open,
  onOpenChange,
  artifactCount,
  onViewArtifacts,
  onRename,
  onDelete,
}: MobileActionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="p-0 rounded-t-xl">
        <SheetHeader className="sr-only">
          <SheetTitle>Aksi Percakapan</SheetTitle>
        </SheetHeader>
        <div className="py-2">
          {artifactCount > 0 && (
            <button
              onClick={() => { onViewArtifacts(); onOpenChange(false) }}
              className="w-full px-4 py-3 text-left text-sm font-mono
                text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)]
                flex items-center gap-3"
            >
              Lihat Artifacts ({artifactCount})
            </button>
          )}
          <button
            onClick={() => { onRename(); onOpenChange(false) }}
            className="w-full px-4 py-3 text-left text-sm font-mono
              text-[var(--chat-foreground)] hover:bg-[var(--chat-accent)]
              flex items-center gap-3"
          >
            Edit Judul
          </button>
          <button
            onClick={() => { onDelete(); onOpenChange(false) }}
            className="w-full px-4 py-3 text-left text-sm font-mono
              text-[var(--chat-destructive)] hover:bg-[var(--chat-accent)]
              flex items-center gap-3"
          >
            Hapus Percakapan
          </button>
        </div>
        <div className="border-t border-[color:var(--chat-border)] py-2">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full px-4 py-3 text-center text-sm font-mono
              text-[var(--chat-muted-foreground)]"
          >
            Batal
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 2: Integrate in ChatWindow**

Import and render `MobileActionSheet` with `showActionSheet` state from Task 3:

```tsx
<MobileActionSheet
  open={showActionSheet}
  onOpenChange={setShowActionSheet}
  conversationId={safeConversationId}
  artifactCount={artifacts?.length ?? 0}
  onViewArtifacts={() => setShowArtifactList(true)}
  onRename={() => { /* inline rename logic */ }}
  onDelete={() => { /* delete with AlertDialog confirmation */ }}
/>
```

**Step 3: Verify**

- Mobile conversation: tap ··· → sheet slides up from bottom.
- "Lihat Artifacts" only visible when artifacts exist.
- "Hapus" shows destructive red color.
- "Batal" closes sheet.
- Desktop: action sheet never rendered.

**Step 4: Commit**

```bash
git add src/components/chat/mobile/MobileActionSheet.tsx src/components/chat/ChatWindow.tsx
git commit -m "feat(mobile): conversation action sheet"
```

---

## Task 8: Artifact List Screen

Screen showing all artifacts for current conversation. Accessed via action sheet → "Lihat Artifacts".

**Files:**
- Create: `src/components/chat/mobile/MobileArtifactList.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`

**Step 1: Create MobileArtifactList**

```tsx
// src/components/chat/mobile/MobileArtifactList.tsx
"use client"

import type { Id, Doc } from "@convex/_generated/dataModel"

interface MobileArtifactListProps {
  artifacts: Doc<"artifacts">[]
  onSelect: (artifactId: Id<"artifacts">) => void
  onBack: () => void
}

export function MobileArtifactList({
  artifacts,
  onSelect,
  onBack,
}: MobileArtifactListProps) {
  return (
    <div className="fixed inset-0 z-50 bg-[var(--chat-background)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5
        border-b border-[color:var(--chat-border)]">
        <button onClick={onBack}
          className="text-sm font-mono text-[var(--chat-info)]">
          ◀ Back
        </button>
        <span className="flex-1 text-center text-sm font-mono font-semibold
          text-[var(--chat-foreground)]">
          Artifacts ({artifacts.length})
        </span>
        <div className="w-12" /> {/* Balance spacer */}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {artifacts.map((artifact) => (
          <button
            key={artifact._id}
            onClick={() => onSelect(artifact._id)}
            className="w-full text-left p-3 rounded-action
              border border-[color:var(--chat-border)]
              bg-[var(--chat-card)]
              hover:bg-[var(--chat-accent)]"
          >
            <p className="text-sm font-mono font-semibold truncate
              text-[var(--chat-foreground)]">
              {artifact.title}
            </p>
            <p className="text-[11px] font-mono text-[var(--chat-muted-foreground)] mt-1">
              {artifact.type?.toUpperCase()} · v{artifact.version}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}
```

**Step 2: Integrate in ChatWindow or ChatContainer**

Render conditionally when `showArtifactList` state is true (mobile only):

```tsx
{showArtifactList && (
  <div className="md:hidden">
    <MobileArtifactList
      artifacts={artifacts ?? []}
      onSelect={(id) => {
        setShowArtifactList(false)
        setMobileArtifactId(id)  // opens full-screen viewer (Task 9)
      }}
      onBack={() => setShowArtifactList(false)}
    />
  </div>
)}
```

**Step 3: Commit**

```bash
git add src/components/chat/mobile/MobileArtifactList.tsx src/components/chat/ChatWindow.tsx
git commit -m "feat(mobile): artifact list screen"
```

---

## Task 9: Full-screen Artifact Viewer

Full-screen overlay for viewing artifacts on mobile. Replaces desktop's side panel.

**Files:**
- Create: `src/components/chat/mobile/MobileArtifactViewer.tsx`
- Modify: `src/components/chat/ChatContainer.tsx`

**Step 1: Create MobileArtifactViewer**

This component reuses existing `ArtifactViewer` for content rendering but wraps it in a full-screen mobile layout with bottom action bar.

```tsx
// src/components/chat/mobile/MobileArtifactViewer.tsx
"use client"

import { useRef, useState } from "react"
import { ArtifactViewer } from "../ArtifactViewer"
import type { Id } from "@convex/_generated/dataModel"
import type { Doc } from "@convex/_generated/dataModel"

interface MobileArtifactViewerProps {
  artifact: Doc<"artifacts"> | null
  allVersions: Doc<"artifacts">[]
  onClose: () => void
  onRefrasa: () => void
  userId?: Id<"users">
}

export function MobileArtifactViewer({
  artifact,
  allVersions,
  onClose,
  onRefrasa,
  userId,
}: MobileArtifactViewerProps) {
  const viewerRef = useRef<{ copy: () => void; startEdit: () => void } | null>(null)
  const [showMoreActions, setShowMoreActions] = useState(false)

  if (!artifact) return null

  return (
    <div className="fixed inset-0 z-50 bg-[var(--chat-background)]
      flex flex-col md:hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0
        border-b border-[color:var(--chat-border)]">
        <button onClick={onClose}
          className="text-sm font-mono text-[var(--chat-info)]">
          ✕ Tutup
        </button>
        <span className="flex-1 text-center text-sm font-mono font-semibold
          truncate text-[var(--chat-foreground)]">
          {artifact.title}
        </span>
        <span className="text-[11px] font-mono text-[var(--chat-muted-foreground)]">
          v{artifact.version}
        </span>
      </div>

      {/* Content — reuse ArtifactViewer */}
      <div className="flex-1 overflow-y-auto">
        <ArtifactViewer
          ref={viewerRef}
          artifact={artifact}
          allVersions={allVersions}
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2
        border-t border-[color:var(--chat-border)]
        bg-[var(--chat-background)]">
        <button
          onClick={() => viewerRef.current?.startEdit()}
          className="flex-1 py-2 rounded-action text-xs font-mono
            bg-[var(--chat-secondary)] text-[var(--chat-secondary-foreground)]"
        >
          Edit
        </button>
        <button
          onClick={onRefrasa}
          className="flex-1 py-2 rounded-action text-xs font-mono
            bg-[var(--chat-secondary)] text-[var(--chat-secondary-foreground)]"
        >
          Refrasa
        </button>
        <button
          onClick={() => setShowMoreActions(!showMoreActions)}
          className="py-2 px-3 rounded-action text-xs font-mono
            bg-[var(--chat-secondary)] text-[var(--chat-secondary-foreground)]"
        >
          ···
        </button>
      </div>
    </div>
  )
}
```

**Step 2: Integrate in ChatContainer**

Add mobile artifact viewer state and rendering. ChatContainer already has artifact queries and tab logic. Add mobile-specific overlay:

```tsx
// In ChatContainer, add state:
const [mobileArtifactId, setMobileArtifactId] = useState<Id<"artifacts"> | null>(null)

// Find artifact data:
const mobileArtifact = mobileArtifactId
  ? artifacts?.find(a => a._id === mobileArtifactId) ?? null
  : null

// Render (inside return, after ChatLayout):
{mobileArtifactId && (
  <MobileArtifactViewer
    artifact={mobileArtifact}
    allVersions={artifacts?.filter(a => a.title === mobileArtifact?.title) ?? []}
    onClose={() => setMobileArtifactId(null)}
    onRefrasa={() => {
      // Open MobileRefrasaViewer (Task 10)
      setMobileRefrasaSourceId(mobileArtifactId)
    }}
    userId={user?._id}
  />
)}
```

**Step 3: Wire ArtifactIndicator tap to mobile viewer**

In ChatWindow, the `onArtifactSelect` callback currently opens desktop panel. On mobile, it should open the full-screen viewer instead. Modify ChatContainer:

```tsx
// Modify handleArtifactSelect in ChatContainer:
const handleArtifactSelect = (artifactId: Id<"artifacts">) => {
  if (window.innerWidth < 768) {
    // Mobile: full-screen viewer
    setMobileArtifactId(artifactId)
  } else {
    // Desktop: open in side panel (existing behavior)
    const artifact = artifacts?.find((a) => a._id === artifactId)
    openArtifactTab({
      id: artifactId,
      title: artifact?.title ?? "Loading...",
      type: artifact?.type ?? "section",
    })
  }
}
```

**Note:** Using `window.innerWidth` is simpler than media query hooks for one-time decisions. Alternatively, use a `useMediaQuery(768)` hook if one exists.

**Step 4: Verify**

- Mobile: Tap artifact indicator → full-screen viewer with content + bottom actions.
- Tap ✕ or swipe → closes viewer.
- Desktop: Tap artifact → opens in side panel (unchanged).

**Step 5: Commit**

```bash
git add src/components/chat/mobile/MobileArtifactViewer.tsx src/components/chat/ChatContainer.tsx
git commit -m "feat(mobile): full-screen artifact viewer"
```

---

## Task 10: Full-screen Refrasa Viewer

Full-screen overlay for refrasa results on mobile. Pushed from artifact viewer.

**Files:**
- Create: `src/components/chat/mobile/MobileRefrasaViewer.tsx`
- Modify: `src/components/chat/ChatContainer.tsx`

**Step 1: Create MobileRefrasaViewer**

Reuses existing `RefrasaTabContent` (which already has mobile toggle tabs) but in full-screen layout:

```tsx
// src/components/chat/mobile/MobileRefrasaViewer.tsx
"use client"

import { RefrasaTabContent } from "@/components/refrasa/RefrasaTabContent"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import type { Id } from "@convex/_generated/dataModel"

interface MobileRefrasaViewerProps {
  sourceArtifactId: Id<"artifacts"> | null
  onClose: () => void
  onApplied: () => void
}

export function MobileRefrasaViewer({
  sourceArtifactId,
  onClose,
  onApplied,
}: MobileRefrasaViewerProps) {
  if (!sourceArtifactId) return null

  return (
    <div className="fixed inset-0 z-[60] bg-[var(--chat-background)]
      flex flex-col md:hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0
        border-b border-[color:var(--chat-border)]">
        <button onClick={onClose}
          className="text-sm font-mono text-[var(--chat-info)]">
          ◀ Back
        </button>
        <span className="flex-1 text-center text-sm font-mono font-semibold
          text-[var(--chat-foreground)]">
          REFRASA
        </span>
        <div className="w-12" />
      </div>

      {/* Content — reuse RefrasaTabContent */}
      <div className="flex-1 overflow-hidden">
        <RefrasaTabContent
          sourceArtifactId={sourceArtifactId}
        />
      </div>
    </div>
  )
}
```

**Note:** Exact props for RefrasaTabContent need verification against actual component interface. The existing component already handles mobile compare toggle.

**Step 2: Issues panel — use Sheet instead of floating**

RefrasaToolbar's issues panel uses absolute positioning (320px floating). On mobile this overflows. Modify to use bottom Sheet. This may require a `variant="mobile"` prop or media query inside RefrasaToolbar.

Check if RefrasaToolbar already handles this. If not, add:

```tsx
// In RefrasaToolbar, wrap issues panel:
{isMobile ? (
  <Sheet open={showIssues} onOpenChange={setShowIssues}>
    <SheetContent side="bottom" className="max-h-[70vh]">
      {/* existing issues content */}
    </SheetContent>
  </Sheet>
) : (
  // existing floating panel
)}
```

**Step 3: Integrate in ChatContainer**

```tsx
const [mobileRefrasaSourceId, setMobileRefrasaSourceId] = useState<Id<"artifacts"> | null>(null)

// Render:
{mobileRefrasaSourceId && (
  <MobileRefrasaViewer
    sourceArtifactId={mobileRefrasaSourceId}
    onClose={() => setMobileRefrasaSourceId(null)}
    onApplied={() => {
      setMobileRefrasaSourceId(null)
      // Optionally refresh artifact viewer
    }}
  />
)}
```

**Step 4: Commit**

```bash
git add src/components/chat/mobile/MobileRefrasaViewer.tsx src/components/chat/ChatContainer.tsx
git commit -m "feat(mobile): full-screen refrasa viewer"
```

---

## Task 11: iOS Safe Area + Viewport

Add safe area padding for iOS notch and home indicator.

**Files:**
- Modify: `src/app/chat/layout.tsx`
- Modify: `src/app/globals-new.css`

**Step 1: Add viewport-fit meta tag**

Check if `viewport-fit=cover` is already in layout. If not, add to root layout or chat layout head:

```tsx
// In src/app/layout.tsx or via metadata:
export const metadata = {
  // ... existing
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
}
```

**Step 2: Add safe area tokens in globals-new.css**

```css
@media (max-width: 767px) {
  [data-chat-scope] {
    --activity-bar-width: 0px;
    --chat-input-pad-x: 1rem;
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
  }
}
```

**Step 3: Apply to chat layout wrapper**

```tsx
// In src/app/chat/layout.tsx:
<div
  data-chat-scope=""
  className="min-h-dvh bg-background text-foreground"
  style={{
    paddingTop: "var(--safe-area-top)",
    paddingBottom: "var(--safe-area-bottom)",
  }}
>
```

**Note:** Using `min-h-dvh` instead of `min-h-screen` for correct mobile viewport (accounts for browser chrome).

**Step 4: Commit**

```bash
git add src/app/chat/layout.tsx src/app/globals-new.css
git commit -m "feat(mobile): iOS safe area padding and dvh viewport"
```

---

## Task 12: Message Edit — Tap Instead of Hover

Desktop uses hover-reveal edit button. Mobile has no hover. Switch to always-visible tap target on mobile.

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`

**Step 1: Change edit button visibility on mobile**

Currently the edit button uses `opacity-0 group-hover:opacity-100`. On mobile, make it always visible (but subtle):

```tsx
// Find edit button class (approximately):
// BEFORE:
"opacity-0 group-hover:opacity-100"

// AFTER:
"md:opacity-0 md:group-hover:opacity-100"
// On mobile (no md: prefix) → always visible
// On desktop → hover reveal (unchanged)
```

**Step 2: Verify `isEditAllowed()` still gates the button**

The edit button is already conditionally rendered based on `isEditAllowed()`. Only the visibility CSS changes.

**Step 3: Commit**

```bash
git add src/components/chat/MessageBubble.tsx
git commit -m "feat(mobile): always-visible edit button on mobile"
```

---

## Task 13: Integration + Visual QA

Final integration pass. Verify all mobile screens work together end-to-end.

**Files:**
- All mobile components from Tasks 1-12

**Step 1: Verify navigation flow**

Test complete flow:
1. Open `/chat` on mobile (< 768px) → clean landing
2. Type message → auto-creates conversation → push to conversation
3. Tap ☰ → drawer opens with 3 tabs
4. Switch tabs in drawer → content switches
5. Tap conversation in drawer → navigates, drawer closes
6. Tap ··· → action sheet
7. "Lihat Artifacts" → artifact list
8. Tap artifact → full-screen viewer
9. Tap Refrasa → refrasa viewer
10. Close/back flows all work

**Step 2: Verify paper mode flow**

1. Start paper session via chip or message
2. Mini-bar appears above input
3. Expand → stage pills scroll horizontally
4. Validation panel renders inline
5. Rewind dialog works from mini-bar pills

**Step 3: Verify design token compliance**

Run anomaly detection from `chat-styling-rules.md`:

```bash
# Check no hardcoded dark: override in new mobile components
grep -rn "dark:" src/components/chat/mobile/ --include="*.tsx"
grep -rn "dark:" src/components/paper/MobilePaperMiniBar.tsx

# Check no state color as standalone text
grep -rn "text-\[var(--chat-success)\]\|text-\[var(--chat-warning)\]" src/components/chat/mobile/ --include="*.tsx"

# Check no transparency violations
grep -rn "opacity-[0-9]\|/[0-9][0-9]\]" src/components/chat/mobile/ --include="*.tsx"
```

All should return 0 results (or only documented exceptions).

**Step 4: Verify desktop unchanged**

Resize to ≥ 768px. All desktop behavior must be identical to before:
- 6-column grid with ActivityBar
- Side panel for artifacts
- TopBar with controls
- No visual regressions

**Step 5: Screenshot comparison**

Take screenshots of:
- Mobile landing (light + dark)
- Mobile conversation (light + dark)
- Mobile conversation with paper mode
- Mobile drawer (all 3 tabs)
- Mobile artifact viewer
- Mobile refrasa viewer
- Desktop (unchanged)

**Step 6: Commit**

```bash
git add -A
git commit -m "feat(mobile): integration pass and visual QA"
```

---

## Dependency Graph

```
Task 1 (ActivityBar hide)
Task 4 (padding fix)           ──→ can be done in parallel
Task 11 (safe area)
Task 12 (edit button)

Task 2 (clean landing)         ──→ depends on Task 1, 4

Task 3 (conversation header)   ──→ depends on Task 1, 4

Task 5 (paper mini-bar)        ──→ depends on Task 3

Task 6 (drawer tabs)           ──→ independent

Task 7 (action sheet)          ──→ depends on Task 3

Task 8 (artifact list)         ──→ depends on Task 7

Task 9 (artifact viewer)       ──→ depends on Task 8

Task 10 (refrasa viewer)       ──→ depends on Task 9

Task 13 (integration)          ──→ depends on ALL above
```

## New Files Created

```
src/components/chat/mobile/MobileActionSheet.tsx
src/components/chat/mobile/MobileArtifactList.tsx
src/components/chat/mobile/MobileArtifactViewer.tsx
src/components/chat/mobile/MobileRefrasaViewer.tsx
src/components/paper/MobilePaperMiniBar.tsx
```

## Files Modified

```
src/app/chat/layout.tsx                        (safe area, dvh)
src/app/globals-new.css                        (mobile overrides)
src/components/chat/layout/ChatLayout.tsx       (hide ActivityBar)
src/components/chat/ChatWindow.tsx              (landing, header, mini-bar, action sheet)
src/components/chat/ChatContainer.tsx           (mobile artifact/refrasa state)
src/components/chat/ChatSidebar.tsx             (drawer tabs, settings link)
src/components/chat/MessageBubble.tsx           (edit button visibility)
src/components/chat/messages/TemplateGrid.tsx   (mobile chips variant)
```
