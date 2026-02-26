# Mobile Chat Redesign v3 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restructure mobile chat UI from overloaded sidebar tabs into purpose-built header actions, bottom sheets, and inline progress bar.

**Architecture:** Mobile sidebar becomes history-only. Paper sessions and edit/delete move to dedicated bottom sheets triggered from the header. Progress timeline becomes a horizontal bar above ChatInput. All new components follow chat-styling-rules.md token/styling conventions.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI Sheet/AlertDialog, iconoir-react, Convex real-time queries

**Design Doc:** `docs/plans/2026-02-24-mobile-chat-redesign-v3-design.md`

**Styling Rules:** `docs/system-design-standarization/chat-page-style-revision/chat-styling-rules.md`

---

## Context for All Tasks

### Key Patterns

1. **Portal token scope**: All Sheet/AlertDialog SheetContent/AlertDialogContent MUST have `data-chat-scope=""` attribute. Without it, `--chat-*` CSS variables won't resolve because Radix portals render at `document.body`.

2. **Border syntax**: Border arbitrary values MUST include the `color:` prefix (e.g. `[color:var(--token)]`). Without it, Tailwind CSS 4 misinterprets the value as border-width.

3. **Touch interactions**: Use `active:` NOT `hover:` for all mobile buttons. Duration: `duration-50` for instant feedback.

4. **Font rule**: All text uses `font-sans` (Geist Sans). Exception: signal labels use `font-mono font-bold uppercase tracking-widest`.

5. **No semantic coloring**: Action items (including delete) do NOT use `--chat-destructive`. All actions use `--chat-foreground`. Confirmation via AlertDialog only.

6. **Artifact count dedup**: When counting artifacts, group by `${a.type}-${a.title}`, take latest version per group, count groups.

7. **Mobile breakpoint**: `md:hidden` = mobile visible, `hidden md:block` = desktop only. Breakpoint is `md` (768px).

8. **Icon library**: `iconoir-react` only. Stroke 1.5px. Size `h-5 w-5` for header icons, `h-4 w-4` for action items.

### Reference Files (Read These)

- `src/components/chat/ChatWindow.tsx` — current mobile header (lines 693-714), MobilePaperMiniBar usage (lines 843-849), MobileActionSheet usage (lines 866-872)
- `src/components/chat/ChatSidebar.tsx` — current mobile tabs (lines 150-165), "Percakapan Baru" button (lines 168-199), Settings link (lines 219-228)
- `src/components/chat/ChatContainer.tsx` — state management patterns, artifact select handlers
- `src/components/chat/layout/ChatLayout.tsx` — mobile sidebar Sheet, prop threading
- `src/components/chat/mobile/MobileActionSheet.tsx` — Sheet + AlertDialog pattern to reuse
- `src/components/paper/MobilePaperMiniBar.tsx` — current progress bar to replace
- `src/components/chat/sidebar/SidebarPaperSessions.tsx` — paper folder/artifact tree to adapt
- `src/components/chat/sidebar/SidebarProgress.tsx` — timeline dot+line pattern to convert horizontal
- `src/components/chat/shell/TopBar.tsx` — FastArrowRightSquare icon, theme toggle pattern
- `docs/system-design-standarization/chat-page-style-revision/chat-styling-rules.md` — all styling rules

---

## Task 1: Create MobileEditDeleteSheet

Create the small bottom sheet for editing title and deleting conversation, triggered by tapping the header title.

**Files:**
- Create: `src/components/chat/mobile/MobileEditDeleteSheet.tsx`

**Step 1: Create MobileEditDeleteSheet component**

Extract rename + delete logic from `MobileActionSheet.tsx` into a new focused component. The sheet has two modes:
- Default: two action buttons (Edit Judul, Hapus Percakapan)
- Rename mode: input field with save/cancel

```tsx
"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Id } from "../../../../convex/_generated/dataModel"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { toast } from "sonner"
import { EditPencil, Trash } from "iconoir-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface MobileEditDeleteSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: Id<"conversations"> | null
}

export function MobileEditDeleteSheet({
  open,
  onOpenChange,
  conversationId,
}: MobileEditDeleteSheetProps) {
  const router = useRouter()
  const { user } = useCurrentUser()
  const inputRef = useRef<HTMLInputElement>(null)

  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const deleteConversation = useMutation(api.conversations.deleteConversation)
  const updateTitle = useMutation(api.conversations.updateConversationTitleFromUser)

  const conversation = useQuery(
    api.conversations.getConversation,
    conversationId ? { conversationId } : "skip"
  )

  useEffect(() => {
    if (!open) {
      setIsRenaming(false)
      setRenameValue("")
      setIsSaving(false)
    }
  }, [open])

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  function handleClose() {
    onOpenChange(false)
  }

  function handleStartRename() {
    setRenameValue(conversation?.title ?? "")
    setIsRenaming(true)
  }

  async function handleSaveRename() {
    if (!conversationId || !user?._id) return
    const trimmed = renameValue.trim()
    if (!trimmed) {
      toast.error("Judul tidak boleh kosong")
      return
    }
    if (trimmed.length > 50) {
      toast.error("Judul maksimal 50 karakter")
      return
    }
    setIsSaving(true)
    try {
      await updateTitle({ conversationId, userId: user._id, title: trimmed })
      toast.success("Judul berhasil diubah")
      handleClose()
    } catch {
      toast.error("Gagal mengubah judul")
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancelRename() {
    setIsRenaming(false)
    setRenameValue("")
  }

  async function handleConfirmDelete() {
    if (!conversationId) return
    setIsDeleting(true)
    try {
      await deleteConversation({ conversationId })
      toast.success("Percakapan berhasil dihapus")
      setShowDeleteConfirm(false)
      handleClose()
      router.push("/chat")
    } catch {
      toast.error("Gagal menghapus percakapan")
    } finally {
      setIsDeleting(false)
    }
  }

  const actionButtonClass =
    "flex w-full items-center gap-3 px-5 py-3.5 font-sans text-sm text-[var(--chat-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-shell border-t border-[color:var(--chat-border)] bg-[var(--chat-background)] p-0 [&>button]:hidden"
          data-chat-scope=""
        >
          <div className="flex justify-center pt-3 pb-2">
            <div className="h-1 w-10 rounded-full bg-[var(--chat-muted)]" />
          </div>
          <SheetHeader className="sr-only">
            <SheetTitle>Edit percakapan</SheetTitle>
          </SheetHeader>

          {isRenaming ? (
            <div className="px-4 pb-4 pt-2">
              <label className="mb-2 block font-mono text-xs font-bold uppercase tracking-widest text-[var(--chat-muted-foreground)]">
                Edit Judul
              </label>
              <input
                ref={inputRef}
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename()
                  if (e.key === "Escape") handleCancelRename()
                }}
                maxLength={50}
                className="w-full rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-background)] px-3 py-2 font-sans text-sm text-[var(--chat-foreground)] placeholder:text-[var(--chat-muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--chat-accent)]"
                placeholder="Judul percakapan..."
              />
              <div className="mt-1 text-right font-sans text-xs text-[var(--chat-muted-foreground)]">
                {renameValue.length}/50
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleCancelRename}
                  disabled={isSaving}
                  className="flex-1 rounded-action border border-[color:var(--chat-border)] px-3 py-2 font-sans text-sm text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
                >
                  Batal
                </button>
                <button
                  onClick={handleSaveRename}
                  disabled={isSaving || !renameValue.trim()}
                  className="flex-1 rounded-action bg-[var(--chat-foreground)] px-3 py-2 font-sans text-sm text-[var(--chat-background)] active:bg-[var(--chat-secondary-foreground)] transition-colors duration-50 disabled:opacity-50"
                >
                  {isSaving ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </div>
          ) : (
            <div className="pb-2">
              {conversationId && conversation && (
                <button onClick={handleStartRename} className={actionButtonClass}>
                  <EditPencil className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>Edit Judul</span>
                </button>
              )}
              {conversationId && conversation && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className={actionButtonClass}
                >
                  <Trash className="size-4 shrink-0" strokeWidth={1.5} />
                  <span>Hapus Percakapan</span>
                </button>
              )}
              <div className="border-t border-[color:var(--chat-border)] mt-1" />
              <button
                onClick={handleClose}
                className="flex w-full items-center justify-center px-5 py-3.5 font-sans text-sm text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
              >
                Batal
              </button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent
          className="bg-[var(--chat-background)] border border-[color:var(--chat-border)]"
          data-chat-scope=""
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans text-[var(--chat-foreground)]">
              Hapus Percakapan?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-sm text-[var(--chat-muted-foreground)]">
              Percakapan ini akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              className="font-sans text-sm border-[color:var(--chat-border)] text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)]"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="font-sans text-sm bg-[var(--chat-foreground)] text-[var(--chat-background)] active:opacity-90"
            >
              {isDeleting ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors from `MobileEditDeleteSheet.tsx`

**Step 3: Commit**

```bash
git add src/components/chat/mobile/MobileEditDeleteSheet.tsx
git commit -m "feat(mobile): add MobileEditDeleteSheet for title edit + delete"
```

---

## Task 2: Create MobilePaperSessionsSheet

Create the bottom sheet that shows paper session folders and artifacts, triggered by header icon.

**Files:**
- Create: `src/components/chat/mobile/MobilePaperSessionsSheet.tsx`
- Reference: `src/components/chat/sidebar/SidebarPaperSessions.tsx`

**Step 1: Create MobilePaperSessionsSheet component**

Adapt the folder/artifact tree from `SidebarPaperSessions.tsx` into a bottom Sheet. Key differences from sidebar version:
- Bottom Sheet (not sidebar panel)
- No edit/delete paper actions (read-only)
- `data-chat-scope=""` on SheetContent
- `active:` instead of `hover:` for touch
- `font-sans` for all text

The component should:
- Query `api.paperSessions.getSessionsByConversation` for the current conversation
- Query `api.artifacts.listByConversation` for artifacts
- Reuse the `getLatestArtifactVersions()` dedup logic from sidebar
- Show paper folders with artifacts nested inside (collapsible via chevron)
- Tap artifact → call `onArtifactSelect` + close sheet

```tsx
// Props interface:
interface MobilePaperSessionsSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conversationId: Id<"conversations"> | null
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
}
```

Use the same artifact type icons and version badge patterns from `SidebarPaperSessions.tsx`. Keep the component focused — no inline editing of paper session titles.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/components/chat/mobile/MobilePaperSessionsSheet.tsx
git commit -m "feat(mobile): add MobilePaperSessionsSheet for paper session browsing"
```

---

## Task 3: Create MobileProgressBar

Replace `MobilePaperMiniBar` with a horizontal dot+line progress timeline using number pills.

**Files:**
- Create: `src/components/chat/mobile/MobileProgressBar.tsx`
- Reference: `src/components/chat/sidebar/SidebarProgress.tsx` (desktop vertical timeline)
- Reference: `src/components/paper/MobilePaperMiniBar.tsx` (current implementation to replace)

**Step 1: Create MobileProgressBar component**

```tsx
// Props (same as MobilePaperMiniBar):
interface MobileProgressBarProps {
  currentStage: PaperStageId
  stageStatus: string
  stageData?: Record<string, { validatedAt?: number }>
  onRewindRequest?: (targetStage: PaperStageId) => void
}
```

Two states:

**Collapsed** (default): Single line with `GitBranch` icon, current stage name, "N/13" counter, and chevron toggle.
```
⊙─ Gagasan  1/13  ⌄
```
Styling: `font-sans text-xs`, numbers in `font-mono tabular-nums`, chevron `NavArrowDown`/`NavArrowUp`.

**Expanded**: Horizontal scrollable dot+line timeline with number pills.

Each pill is a `rounded-action` button containing the stage number (1-13). Layout: `flex items-center gap-0` with connecting lines (`h-px w-3`) between pills.

Pill states (derived from `SidebarProgress.tsx` dot states):
- **Completed**: `bg-[var(--chat-success)] text-[var(--chat-background)]`
- **Current**: `bg-[var(--chat-success)] text-[var(--chat-background)] ring-2 ring-[var(--chat-success)]/30`
- **Pending**: `bg-transparent border border-[color:var(--chat-border)] text-[var(--chat-muted-foreground)]`

Connecting line states:
- Between completed stages: `bg-[var(--chat-success)]`
- Between current and next: `bg-[var(--chat-border)]`
- Between pending stages: `bg-[var(--chat-border)]`

Tap on completed pill (max 2 back from current): call `onRewindRequest`.

Tooltip on tap: Use a simple absolute-positioned div that appears briefly on press, showing the full stage name via `getStageLabel()`.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/components/chat/mobile/MobileProgressBar.tsx
git commit -m "feat(mobile): add MobileProgressBar with horizontal number pills"
```

---

## Task 4: Simplify ChatSidebar for Mobile

Remove mobile-specific tabs, "Percakapan Baru" button, and settings link. Mobile sidebar becomes history-only with CreditMeter + "Atur Akun" link.

**Files:**
- Modify: `src/components/chat/ChatSidebar.tsx`

**Step 1: Modify ChatSidebar**

Changes to make:

1. **Remove mobile panel tabs** (lines 150-165): Delete the `md:hidden` div containing `Riwayat | Paper | Progres` tab buttons entirely.

2. **Conditionally hide "Percakapan Baru" on mobile** (lines 168-199): Wrap the existing `Button` div with `hidden md:block` so it only shows on desktop. Mobile gets the +chat icon in header instead.

3. **Replace Settings link** (lines 219-228): Change "Pengaturan" text to "Atur Akun". Change href from `/settings` to render inline settings (for now, keep `/settings` href but update the label — Task 8 will handle the inline page).

4. **Force `chat-history` panel on mobile**: The sidebar should always render `SidebarChatHistory` content on mobile regardless of `activePanel` prop. Add a mobile check: `const effectivePanel = isMobile ? "chat-history" : activePanel` (where `isMobile` can be derived from CSS or just always render chat-history and let `md:hidden` on other panels handle visibility).

Actually, simpler approach: since mobile sidebar no longer has tabs, it always shows chat-history. The `activePanel` prop only matters for desktop (where ActivityBar controls it). No code change needed — just removing the mobile tabs means mobile always sees whatever `renderContent()` returns, and since desktop ActivityBar defaults to `chat-history`, that's the default.

**Step 2: Verify desktop sidebar still works**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Then visually verify desktop still has ActivityBar-controlled panel switching.

**Step 3: Commit**

```bash
git add src/components/chat/ChatSidebar.tsx
git commit -m "refactor(mobile): simplify ChatSidebar to history-only for mobile"
```

---

## Task 5: Redesign ChatWindow Mobile Header

Replace current mobile header (hamburger + mono title + MoreVert) with new layout (hamburger + tappable title + new chat icon + paper sessions icon).

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

**Step 1: Update imports**

Replace `MoreVert` with new icons:
```tsx
// Remove: MoreVert
// Add:
import { Menu, WarningCircle, Refresh, ChatBubblePlusIn, FastArrowRightSquare, NavArrowDown } from "iconoir-react"
```

Replace `MobileActionSheet` import with new sheets:
```tsx
// Remove:
import { MobileActionSheet } from "./mobile/MobileActionSheet"
// Add:
import { MobileEditDeleteSheet } from "./mobile/MobileEditDeleteSheet"
import { MobilePaperSessionsSheet } from "./mobile/MobilePaperSessionsSheet"
```

Replace `MobilePaperMiniBar` import:
```tsx
// Remove:
import { MobilePaperMiniBar } from "../paper/MobilePaperMiniBar"
// Add:
import { MobileProgressBar } from "./mobile/MobileProgressBar"
```

**Step 2: Update state variables**

Replace `showActionSheet` state:
```tsx
// Remove:
const [showActionSheet, setShowActionSheet] = useState(false)
// Add:
const [showEditDeleteSheet, setShowEditDeleteSheet] = useState(false)
const [showPaperSessionsSheet, setShowPaperSessionsSheet] = useState(false)
```

**Step 3: Replace mobile header (lines ~693-714)**

Old:
```tsx
<div className="md:hidden px-3 pt-[env(safe-area-inset-top,0px)] border-b border-[color:var(--chat-border)] bg-[var(--chat-background)]">
  <div className="flex items-center gap-2 h-11">
    <button onClick={onMobileMenuClick} ...><Menu /></button>
    <span className="flex-1 truncate text-sm font-mono font-medium text-[var(--chat-foreground)]">
      {conversation?.title || "Percakapan baru"}
    </span>
    <button onClick={() => setShowActionSheet(true)} ...><MoreVert /></button>
  </div>
</div>
```

New:
```tsx
<div className="md:hidden px-3 pt-[env(safe-area-inset-top,0px)] border-b border-[color:var(--chat-border)] bg-[var(--chat-background)]">
  <div className="flex items-center gap-1 h-11">
    {/* Hamburger */}
    <button
      onClick={onMobileMenuClick}
      className="p-2 -ml-1 shrink-0 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
      aria-label="Menu"
    >
      <Menu className="h-5 w-5" strokeWidth={1.5} />
    </button>

    {/* Tappable title — opens Edit/Delete sheet */}
    <button
      onClick={() => setShowEditDeleteSheet(true)}
      className="flex-1 flex items-center gap-1 min-w-0 active:bg-[var(--chat-accent)] rounded-action px-1.5 py-1 transition-colors duration-50"
    >
      <span className="truncate text-sm font-sans font-medium text-[var(--chat-foreground)]">
        {conversation?.title || "Percakapan baru"}
      </span>
      <NavArrowDown className="h-3 w-3 shrink-0 text-[var(--chat-muted-foreground)]" strokeWidth={1.5} />
    </button>

    {/* New chat */}
    <button
      onClick={() => router.push("/chat")}
      className="p-2 shrink-0 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
      aria-label="Chat baru"
    >
      <ChatBubblePlusIn className="h-5 w-5" strokeWidth={1.5} />
    </button>

    {/* Paper sessions sheet toggle */}
    <button
      onClick={() => setShowPaperSessionsSheet(true)}
      className="-mr-1 p-2 shrink-0 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
      aria-label="Paper sessions"
    >
      <FastArrowRightSquare className="h-5 w-5" strokeWidth={1.5} />
    </button>
  </div>
</div>
```

**Step 4: Replace MobilePaperMiniBar with MobileProgressBar (lines ~843-849)**

Old:
```tsx
{isPaperMode && paperSession?.currentStage && (
  <MobilePaperMiniBar
    currentStage={paperSession.currentStage as PaperStageId}
    stageStatus={stageStatus ?? "drafting"}
    stageData={stageData}
  />
)}
```

New:
```tsx
{isPaperMode && paperSession?.currentStage && (
  <MobileProgressBar
    currentStage={paperSession.currentStage as PaperStageId}
    stageStatus={stageStatus ?? "drafting"}
    stageData={stageData}
    onRewindRequest={handleRewindRequest}
  />
)}
```

Note: `handleRewindRequest` may need to be wired from `usePaperSession` hook. Check if it's already available or needs to be added.

**Step 5: Replace MobileActionSheet with new sheets (lines ~866-872)**

Old:
```tsx
<MobileActionSheet
  open={showActionSheet}
  onOpenChange={setShowActionSheet}
  conversationId={safeConversationId}
  onViewArtifacts={() => onShowArtifactList?.()}
  onNewChat={() => router.push("/chat")}
/>
```

New:
```tsx
<MobileEditDeleteSheet
  open={showEditDeleteSheet}
  onOpenChange={setShowEditDeleteSheet}
  conversationId={safeConversationId}
/>

<MobilePaperSessionsSheet
  open={showPaperSessionsSheet}
  onOpenChange={setShowPaperSessionsSheet}
  conversationId={safeConversationId}
  onArtifactSelect={onArtifactSelect}
/>
```

**Step 6: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 7: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat(mobile): redesign header with tappable title, +chat, paper sessions icons"
```

---

## Task 6: Update ChatWindow Landing Page Header

The landing page (`!conversationId`) also has a mobile header (just hamburger). Add the +chat icon to it too.

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx` (lines ~590-600)

**Step 1: Update landing page mobile header**

Current (line ~592):
```tsx
<div className="shrink-0 flex items-center px-3 pt-[env(safe-area-inset-top,0px)]">
  <button onClick={onMobileMenuClick} ...><Menu /></button>
</div>
```

Add the +chat icon (which on landing page could navigate to `/chat` or be hidden since we're already there). On landing page, the +chat icon is not needed. But add "Makalah" brand text for context:

```tsx
<div className="shrink-0 flex items-center px-3 pt-[env(safe-area-inset-top,0px)]">
  <button
    onClick={onMobileMenuClick}
    className="p-2 -ml-1 rounded-action text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
    aria-label="Menu"
  >
    <Menu className="h-5 w-5" strokeWidth={1.5} />
  </button>
  <span className="flex-1 text-sm font-sans font-medium text-[var(--chat-foreground)]">
    Makalah
  </span>
</div>
```

Also update the "not found" page header (lines ~665-677) to use `font-sans` instead of `font-mono`.

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "fix(mobile): update landing and not-found headers to font-sans"
```

---

## Task 7: Wire Rewind in MobileProgressBar

Connect the rewind functionality from `usePaperSession` hook to `MobileProgressBar`.

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Reference: `src/lib/hooks/usePaperSession.ts`

**Step 1: Check existing rewind handler**

Look for `handleRewindRequest` or `rewindToStage` in `ChatWindow.tsx`. If it doesn't exist, add one using the `usePaperSession` hook's `rewindToStage` function:

```tsx
const handleRewindRequest = useCallback(async (targetStage: PaperStageId) => {
  if (!paperSession?._id || !userId) return
  try {
    await rewindToStage({
      sessionId: paperSession._id,
      userId,
      targetStage,
    })
    toast.success(`Kembali ke stage ${getStageLabel(targetStage)}`)
  } catch {
    toast.error("Gagal melakukan rewind")
  }
}, [paperSession?._id, userId, rewindToStage])
```

Ensure `rewindToStage` is available from `usePaperSession()` hook destructuring.

**Step 2: Import RewindConfirmationDialog**

The rewind should go through a confirmation dialog. Check if `RewindConfirmationDialog` from `src/components/paper/RewindConfirmationDialog.tsx` is already used. If not, add state for pending rewind target and render the dialog.

**Step 3: Verify it compiles + test manually**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 4: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "feat(mobile): wire rewind confirmation to MobileProgressBar"
```

---

## Task 8: Clean Up Dead Code

Remove deprecated files and unused imports.

**Files:**
- Delete: `src/components/chat/mobile/MobileActionSheet.tsx`
- Delete: `src/components/paper/MobilePaperMiniBar.tsx`
- Modify: `src/components/chat/ChatWindow.tsx` — verify no remaining imports of deleted files

**Step 1: Search for remaining references**

```bash
grep -rn "MobileActionSheet\|MobilePaperMiniBar" src/ --include="*.tsx" --include="*.ts"
```

Any file still importing these must be updated.

**Step 2: Delete files**

```bash
rm src/components/chat/mobile/MobileActionSheet.tsx
rm src/components/paper/MobilePaperMiniBar.tsx
```

**Step 3: Verify build**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add -A
git commit -m "chore(mobile): remove deprecated MobileActionSheet and MobilePaperMiniBar"
```

---

## Task 9: Update chat-styling-rules.md

Document the new mobile components and their styling rules.

**Files:**
- Modify: `docs/system-design-standarization/chat-page-style-revision/chat-styling-rules.md`

**Step 1: Add new sections**

Add documentation for:
- MobileEditDeleteSheet (replaces MobileActionSheet section 7.12)
- MobilePaperSessionsSheet
- MobileProgressBar
- Mobile header redesign (icon mapping table)
- ChatSidebar mobile simplification

**Step 2: Update grep patterns**

Add new grep verification patterns for the new components.

**Step 3: Commit**

```bash
git add docs/system-design-standarization/chat-page-style-revision/chat-styling-rules.md
git commit -m "docs(chat-style): update styling rules for mobile redesign v3 components"
```

---

## Task 10: Visual QA + Final Build Verification

Verify everything works end-to-end.

**Step 1: Run build**

```bash
npm run build 2>&1 | tail -20
```

Expected: Successful build, no TypeScript errors.

**Step 2: Run lint**

```bash
npm run lint 2>&1 | tail -20
```

Fix any linting errors.

**Step 3: Manual visual QA checklist**

Open `localhost:3000/chat` on mobile viewport (Chrome DevTools → iPhone 14 Pro):

- [ ] Landing page: hamburger + "Makalah" text, no MoreVert
- [ ] Sidebar (hamburger tap): flat history list, CreditMeter, "Atur Akun" link, NO tabs
- [ ] Active conversation: header shows `☰ | Title ▾ | +💬 | »`
- [ ] Title tap: Edit/Delete sheet opens from bottom
- [ ] +💬 tap: navigates to `/chat` (new chat landing)
- [ ] » tap: Paper Sessions sheet opens from bottom
- [ ] Paper session active: MobileProgressBar visible above ChatInput
- [ ] Progress bar collapsed: icon + stage name + N/13
- [ ] Progress bar expanded: horizontal pills with numbers
- [ ] Pill tap: tooltip shows stage name
- [ ] Completed pill tap (within 2): rewind confirmation dialog
- [ ] All sheets have drag handle + proper tokens (no visual bleed-through)
- [ ] Desktop (resize to >768px): everything unchanged, no regressions

**Step 4: Fix any issues found**

**Step 5: Final commit**

```bash
git add -A
git commit -m "fix(mobile): visual QA fixes for mobile chat redesign v3"
```

---

## Execution Order

Tasks 1-3 can be parallelized (independent new components).
Task 4 depends on nothing.
Task 5 depends on Tasks 1, 2, 3 (imports the new components).
Task 6 can run after Task 5.
Task 7 depends on Task 3 and Task 5.
Task 8 depends on Task 5 (old files must be unreferenced first).
Task 9 depends on all tasks.
Task 10 depends on all tasks.

```
Tasks 1, 2, 3, 4 → Task 5 → Tasks 6, 7 → Task 8 → Task 9 → Task 10
```
