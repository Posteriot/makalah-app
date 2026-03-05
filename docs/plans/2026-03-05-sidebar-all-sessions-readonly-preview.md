# Sidebar All-Sessions + Read-Only Preview — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Sidebar "Sesi Paper" menampilkan semua paper session milik user dengan dual-list layout, dan artifact dari session lain bisa di-preview read-only di artifact panel.

**Architecture:** Extend existing SidebarPaperSessions dari single-session ke dual-list (Sesi Aktif + Sesi Lainnya). Extend ArtifactTab interface dengan readOnly flag. Reuse invalidation banner pattern untuk read-only indicator. Semua query backend sudah exist — perubahan murni frontend.

**Tech Stack:** React 19, Convex (useQuery), Next.js App Router, Tailwind CSS 4, Iconoir icons

**Design Doc:** `docs/plans/2026-03-05-sidebar-all-sessions-readonly-preview-design.md`

---

### Task 1: Extend ArtifactTab Interface

**Files:**
- Modify: `src/lib/hooks/useArtifactTabs.ts:9-18`

**Step 1: Add readOnly and sourceConversationId to ArtifactTab interface**

```typescript
export interface ArtifactTab {
  id: Id<"artifacts">
  title: string
  type: string
  sourceArtifactId?: Id<"artifacts">
  readOnly?: boolean                              // NEW
  sourceConversationId?: Id<"conversations">      // NEW
}
```

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors (fields are optional)

**Step 3: Commit**

```bash
git add src/lib/hooks/useArtifactTabs.ts
git commit -m "feat(artifact-tabs): add readOnly and sourceConversationId to ArtifactTab"
```

---

### Task 2: Sidebar Dual-List — Query All Sessions

**Files:**
- Modify: `src/components/chat/sidebar/SidebarPaperSessions.tsx`

**Context:** Currently line 75-83 uses `usePaperSession(conversationId)` for single session. We need to additionally query all user sessions.

**Step 1: Add getByUser query alongside existing usePaperSession**

After the existing `usePaperSession` call (line 81), add:

```typescript
const allSessions = useQuery(
  api.paperSessions.getByUser,
  user?._id ? { userId: user._id } : "skip"
)
```

**Step 2: Derive otherSessions by filtering out active session**

```typescript
const otherSessions = useMemo(() => {
  if (!allSessions || !session) return allSessions ?? []
  return allSessions.filter((s) => s._id !== session._id)
}, [allSessions, session])
```

Add `useMemo` to imports from React.

**Step 3: Verify no type errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors

**Step 4: Commit**

```bash
git add src/components/chat/sidebar/SidebarPaperSessions.tsx
git commit -m "feat(sidebar): query all user paper sessions"
```

---

### Task 3: Sidebar Dual-List — Render "Sesi Lainnya" Section

**Files:**
- Modify: `src/components/chat/sidebar/SidebarPaperSessions.tsx`

**Context:** Currently the component renders a single PaperFolderItem. We need to add a "SESI LAINNYA" section below with compact folder items for other sessions.

**Step 1: Add section label and compact folder list after existing "Sesi Aktif" content**

After the existing PaperFolderItem render block, add the "Sesi Lainnya" section. Only render when `otherSessions.length > 0`:

```tsx
{otherSessions.length > 0 && (
  <div className="mt-4">
    {/* Section divider */}
    <div className="px-4 pb-2">
      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        Sesi Lainnya
      </span>
    </div>

    {/* Compact folder list */}
    <div className="space-y-0.5">
      {otherSessions.map((otherSession) => (
        <OtherSessionFolder
          key={otherSession._id}
          session={otherSession}
          onArtifactSelect={onArtifactSelect}
          activeArtifactId={activeArtifactId}
          isArtifactPanelOpen={isArtifactPanelOpen}
          onArtifactPanelToggle={onArtifactPanelToggle}
          onCloseMobile={onCloseMobile}
          userId={user?._id}
        />
      ))}
    </div>
  </div>
)}
```

**Step 2: Create OtherSessionFolder component in same file**

Compact folder component — collapsed by default, shows stage number + artifact count. When expanded, shows artifact list with 3-dot menu.

```tsx
function OtherSessionFolder({
  session,
  onArtifactSelect,
  activeArtifactId,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  onCloseMobile,
  userId,
}: {
  session: { _id: Id<"paperSessions">; conversationId: Id<"conversations">; workingTitle?: string; paperTitle?: string; currentStage: string; stageData?: Record<string, unknown>; completedAt?: number }
  onArtifactSelect?: (artifactId: Id<"artifacts">) => void
  activeArtifactId?: Id<"artifacts"> | null
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onCloseMobile?: () => void
  userId?: Id<"users">
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const artifacts = useQuery(
    api.artifacts.listByConversation,
    isExpanded && userId
      ? { conversationId: session.conversationId, userId }
      : "skip"
  )

  const latestArtifacts = useMemo(
    () => (artifacts ? getLatestArtifactVersions(artifacts) : []),
    [artifacts]
  )

  const stageNumber = getStageNumber(session.currentStage as PaperStageId)
  const isCompleted = !!session.completedAt
  const displayTitle = resolvePaperDisplayTitle(session)
  const artifactCount = latestArtifacts.length

  return (
    <div>
      {/* Folder header — compact */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        <NavArrowRight
          className={cn(
            "h-3 w-3 shrink-0 text-muted-foreground transition-transform",
            isExpanded && "rotate-90"
          )}
          strokeWidth={1.5}
        />
        <div
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            isCompleted
              ? "bg-[var(--chat-success,oklch(0.65_0.15_160))]"
              : "bg-sky-500/60"
          )}
        />
        <Folder className="h-4 w-4 shrink-0 text-sky-500/60" strokeWidth={1.5} />
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {displayTitle}
        </span>
      </button>

      {/* Compact stage info */}
      {!isExpanded && (
        <div className="px-4 pl-[52px] pb-1">
          <span className="font-mono text-[10px] text-muted-foreground/70">
            {isCompleted ? "Selesai" : `Stage ${stageNumber}/13`}
            {artifactCount > 0 && ` · ${artifactCount} artifak`}
          </span>
        </div>
      )}

      {/* Expanded artifact list */}
      {isExpanded && (
        <div className="pb-1">
          <div className="px-4 pl-[52px] pb-1.5">
            <span className="font-mono text-[10px] text-muted-foreground/70">
              {isCompleted ? "Selesai" : `Stage ${stageNumber}/13 - ${getStageLabel(session.currentStage as PaperStageId)}`}
            </span>
            {artifactCount > 0 && (
              <span className="ml-2 rounded-badge border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {artifactCount} artifak
              </span>
            )}
          </div>

          {latestArtifacts.length === 0 && !artifacts && (
            <div className="px-4 pl-[52px]">
              <Skeleton className="h-3 w-24" />
            </div>
          )}

          {latestArtifacts.length === 0 && artifacts && (
            <div className="px-4 pl-[52px]">
              <span className="font-mono text-[10px] text-muted-foreground/50">
                Belum ada artifak
              </span>
            </div>
          )}

          {latestArtifacts.map((artifact) => (
            <ReadOnlyArtifactTreeItem
              key={artifact._id}
              artifact={artifact}
              sourceConversationId={session.conversationId}
              activeArtifactId={activeArtifactId}
              onArtifactSelect={onArtifactSelect}
              isArtifactPanelOpen={isArtifactPanelOpen}
              onArtifactPanelToggle={onArtifactPanelToggle}
              onCloseMobile={onCloseMobile}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 3: Add Folder import from iconoir-react**

Add `Folder` to the existing iconoir imports at line ~10.

**Step 4: Verify renders without errors**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (ReadOnlyArtifactTreeItem not yet defined — will create in Task 4)

**Step 5: Commit**

```bash
git add src/components/chat/sidebar/SidebarPaperSessions.tsx
git commit -m "feat(sidebar): add Sesi Lainnya section with OtherSessionFolder"
```

---

### Task 4: ReadOnlyArtifactTreeItem with 3-Dot Menu

**Files:**
- Modify: `src/components/chat/sidebar/SidebarPaperSessions.tsx`

**Context:** New component for artifact items from other sessions. Similar to existing ArtifactTreeItem but with 3-dot menu instead of direct click, and opens as readOnly tab.

**Step 1: Add DropdownMenu imports**

```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreVert } from "iconoir-react"
```

**Step 2: Create ReadOnlyArtifactTreeItem component**

```tsx
function ReadOnlyArtifactTreeItem({
  artifact,
  sourceConversationId,
  activeArtifactId,
  onArtifactSelect,
  isArtifactPanelOpen,
  onArtifactPanelToggle,
  onCloseMobile,
}: {
  artifact: { _id: Id<"artifacts">; title: string; type: string; version: number; invalidatedAt?: number; sourceArtifactId?: Id<"artifacts"> }
  sourceConversationId: Id<"conversations">
  activeArtifactId?: Id<"artifacts"> | null
  onArtifactSelect?: (artifactId: Id<"artifacts">, opts?: { readOnly?: boolean; sourceConversationId?: Id<"conversations"> }) => void
  isArtifactPanelOpen?: boolean
  onArtifactPanelToggle?: () => void
  onCloseMobile?: () => void
}) {
  const isSelected = activeArtifactId === artifact._id
  const isRefrasa = artifact.type === "refrasa"
  const isFinal = !artifact.invalidatedAt

  const handleOpenReadOnly = () => {
    if (!isArtifactPanelOpen) {
      onArtifactPanelToggle?.()
    }
    onArtifactSelect?.(artifact._id, { readOnly: true, sourceConversationId })
    onCloseMobile?.()
  }

  return (
    <div
      className={cn(
        "group flex items-center gap-1.5 px-4 pl-[52px] py-1.5 transition-colors",
        isSelected
          ? "border-l-2 border-sky-500 bg-sky-500/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)]"
          : "hover:bg-muted/30"
      )}
    >
      {/* Icon */}
      {isRefrasa ? (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-sky-500/15 font-mono text-[9px] font-bold text-sky-500">
          R
        </span>
      ) : (
        <Page className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
      )}

      {/* Title */}
      <span className="flex-1 truncate font-mono text-[12px] text-foreground/80">
        {artifact.title}
      </span>

      {/* Version badge */}
      <span className="shrink-0 rounded-badge border px-1.5 py-[1.5px] font-mono text-[9px] text-muted-foreground">
        v{artifact.version}
      </span>

      {/* Status badge */}
      <span
        className={cn(
          "shrink-0 rounded-badge px-1.5 py-[1.5px] font-mono text-[9px] font-bold uppercase",
          isFinal
            ? "bg-[var(--chat-success,oklch(0.65_0.15_160))]/15 text-[var(--chat-success,oklch(0.65_0.15_160))]"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isFinal ? "FINAL" : "REVISI"}
      </span>

      {/* 3-dot menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="shrink-0 rounded-action p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Menu artifak"
          >
            <MoreVert className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[160px]">
          <DropdownMenuItem onClick={handleOpenReadOnly}>
            <Page className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Lihat Artifak
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
```

**Step 3: Update onArtifactSelect callback type**

The `onArtifactSelect` callback in the parent components needs to accept an optional second argument for readOnly metadata. Check `ChatContainer.tsx` or wherever onArtifactSelect is defined. Update the type:

```typescript
// In the parent (ChatContainer or ChatLayout) where onArtifactSelect is defined:
const handleArtifactSelect = (
  artifactId: Id<"artifacts">,
  opts?: { readOnly?: boolean; sourceConversationId?: Id<"conversations"> }
) => {
  if (opts?.readOnly) {
    openTab({
      id: artifactId,
      title: "", // Will be resolved by panel
      type: "section",
      readOnly: true,
      sourceConversationId: opts.sourceConversationId,
    })
  } else {
    openTab({ id: artifactId, title: "", type: "section" })
  }
  setActiveTab(artifactId)
}
```

**Step 4: Verify type-check passes**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 5: Commit**

```bash
git add src/components/chat/sidebar/SidebarPaperSessions.tsx
git commit -m "feat(sidebar): add ReadOnlyArtifactTreeItem with 3-dot menu"
```

---

### Task 5: Read-Only Banner in ArtifactViewer

**Files:**
- Modify: `src/components/chat/ArtifactViewer.tsx`

**Context:** Reuse the invalidation warning banner pattern (lines 353-370) to show a read-only banner. The component needs to receive readOnly and sourceConversationId via props or context.

**Step 1: Add readOnly props to ArtifactViewer**

Find the component props interface and add:

```typescript
readOnly?: boolean
sourceConversationId?: Id<"conversations">
```

**Step 2: Add read-only banner JSX**

Insert before the invalidation banner (before line 353), using the same Alert pattern:

```tsx
{readOnly && (
  <Alert variant="default" className="mb-3 border-muted bg-muted/30">
    <Lock className="h-4 w-4" />
    <AlertDescription className="flex items-center justify-between">
      <span className="font-mono text-[12px]">
        Artifak dari sesi lain — hanya baca
      </span>
      {sourceConversationId && (
        <Link
          href={`/chat/${sourceConversationId}`}
          className="shrink-0 font-mono text-[11px] text-sky-500 hover:underline"
        >
          Lihat Percakapan →
        </Link>
      )}
    </AlertDescription>
  </Alert>
)}
```

Add `Lock` to iconoir imports. Add `Link` from `next/link` if not already imported.

**Step 3: Disable edit and refrasa in getState**

In the `getState()` method of the ref, ensure `canRefrasa` returns false when readOnly:

```typescript
canRefrasa: readOnly ? false : (isRefrasaEnabled !== false && ...)
```

Also prevent `startEdit()` when readOnly:

```typescript
startEdit: () => {
  if (readOnly) return
  setIsEditing(true)
}
```

**Step 4: Verify type-check passes**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 5: Commit**

```bash
git add src/components/chat/ArtifactViewer.tsx
git commit -m "feat(artifact-viewer): add read-only banner and disabled actions"
```

---

### Task 6: Pass readOnly Through ArtifactPanel and ArtifactToolbar

**Files:**
- Modify: `src/components/chat/ArtifactPanel.tsx`
- Modify: `src/components/chat/ArtifactToolbar.tsx`

**Step 1: ArtifactPanel — derive readOnly from activeTab and pass down**

In ArtifactPanel, after the existing `activeTab` logic (line 81-85):

```typescript
const isReadOnly = activeTab?.readOnly ?? false
const sourceConversationId = activeTab?.sourceConversationId
```

Pass to ArtifactViewer:

```tsx
<ArtifactViewer
  ref={viewerRef}
  artifactId={activeTabId}
  readOnly={isReadOnly}
  sourceConversationId={sourceConversationId}
  onOpenRefrasaTab={...}
  onVersionCreated={...}
/>
```

Pass to ArtifactToolbar — add a `readOnly` prop:

```tsx
<ArtifactToolbar
  artifact={...}
  readOnly={isReadOnly}
  ...
/>
```

**Step 2: ArtifactToolbar — disable Edit and Refrasa when readOnly**

Add `readOnly?: boolean` to props interface (line ~21-41).

For Edit button, add disabled + tooltip:

```tsx
<button
  onClick={readOnly ? undefined : onEdit}
  disabled={readOnly}
  title={readOnly ? "Buka percakapan asli untuk mengedit" : undefined}
  className={cn("...", readOnly && "cursor-not-allowed opacity-40")}
>
```

For Refrasa button, extend disabled condition:

```tsx
disabled={readOnly || !isRefrasaReady}
title={readOnly ? "Buka percakapan asli untuk refrasa" : undefined}
```

Apply same pattern in compact layout (MoreVert menu items).

**Step 3: Verify type-check passes**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 4: Commit**

```bash
git add src/components/chat/ArtifactPanel.tsx src/components/chat/ArtifactToolbar.tsx
git commit -m "feat(artifact-panel): propagate readOnly flag to toolbar and viewer"
```

---

### Task 7: Read-Only Tab Visual in ArtifactTabs

**Files:**
- Modify: `src/components/chat/ArtifactTabs.tsx`

**Step 1: Add lock icon for read-only tabs**

Find where tab title is rendered. Add Lock icon before title when `tab.readOnly`:

```tsx
{tab.readOnly && (
  <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />
)}
<span className={cn("truncate", tab.readOnly && "text-muted-foreground/70")}>
  {tab.title}
</span>
```

Add `Lock` to iconoir imports.

**Step 2: Verify renders correctly**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/components/chat/ArtifactTabs.tsx
git commit -m "feat(artifact-tabs): show lock icon for read-only tabs"
```

---

### Task 8: FullsizeArtifactModal Read-Only Support

**Files:**
- Modify: `src/components/chat/FullsizeArtifactModal.tsx`

**Step 1: Accept readOnly and sourceConversationId props**

Add to props interface:

```typescript
readOnly?: boolean
sourceConversationId?: Id<"conversations">
```

**Step 2: Add read-only banner in fullscreen header area**

Same banner as ArtifactViewer, placed below the metadata badges area:

```tsx
{readOnly && (
  <div className="mx-4 mb-3 flex items-center justify-between rounded-action border border-muted bg-muted/30 px-3 py-2">
    <div className="flex items-center gap-2">
      <Lock className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
      <span className="font-mono text-[12px] text-muted-foreground">
        Artifak dari sesi lain — hanya baca
      </span>
    </div>
    {sourceConversationId && (
      <Link
        href={`/chat/${sourceConversationId}`}
        onClick={() => onClose?.()}
        className="font-mono text-[11px] text-sky-500 hover:underline"
      >
        Lihat Percakapan →
      </Link>
    )}
  </div>
)}
```

**Step 3: Disable Edit and Refrasa buttons when readOnly**

Find Edit button and Refrasa button in the fullscreen toolbar area. Apply same pattern as ArtifactToolbar:

```tsx
disabled={readOnly}
title={readOnly ? "Buka percakapan asli untuk mengedit" : undefined}
className={cn("...", readOnly && "cursor-not-allowed opacity-40")}
```

**Step 4: Scope "DAFTAR LAINNYA" to source session**

Currently (line 183-188), `artifactsInSession` queries by `artifact.conversationId`. For read-only mode, this already works correctly — it loads artifacts from the source conversation, not the current one. Verify this is the case. No change needed if `artifact.conversationId` points to the source session's conversation.

**Step 5: Pass readOnly from ArtifactPanel to FullsizeArtifactModal**

In ArtifactPanel where FullsizeArtifactModal is rendered:

```tsx
<FullsizeArtifactModal
  ...
  readOnly={isReadOnly}
  sourceConversationId={sourceConversationId}
/>
```

**Step 6: Verify type-check passes**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 7: Commit**

```bash
git add src/components/chat/FullsizeArtifactModal.tsx src/components/chat/ArtifactPanel.tsx
git commit -m "feat(fullsize-modal): add read-only support with banner and disabled actions"
```

---

### Task 9: "Lihat Percakapan" Navigation — Close Read-Only Tab

**Files:**
- Modify: `src/components/chat/ArtifactViewer.tsx`
- Modify: `src/components/chat/FullsizeArtifactModal.tsx`

**Context:** When user clicks "Lihat Percakapan", the read-only tab should auto-close since the user is navigating to the source conversation (where the artifact becomes editable).

**Step 1: Add onCloseTab callback to ArtifactViewer props**

```typescript
onCloseReadOnlyTab?: () => void
```

**Step 2: Update "Lihat Percakapan" Link to also close tab**

In ArtifactViewer banner:

```tsx
<Link
  href={`/chat/${sourceConversationId}`}
  onClick={() => onCloseReadOnlyTab?.()}
  className="..."
>
  Lihat Percakapan →
</Link>
```

**Step 3: Wire up in ArtifactPanel**

Pass callback that closes the active read-only tab:

```tsx
<ArtifactViewer
  ...
  onCloseReadOnlyTab={() => {
    if (activeTabId && isReadOnly) {
      onTabClose?.(activeTabId)
    }
  }}
/>
```

Same pattern for FullsizeArtifactModal — "Lihat Percakapan" onClick closes modal + closes tab.

**Step 4: Verify type-check passes**

Run: `npx tsc --noEmit 2>&1 | head -20`

**Step 5: Commit**

```bash
git add src/components/chat/ArtifactViewer.tsx src/components/chat/ArtifactPanel.tsx src/components/chat/FullsizeArtifactModal.tsx
git commit -m "feat(navigation): close read-only tab on Lihat Percakapan click"
```

---

### Task 10: Integration Test — Manual Verification

**Step 1: Start dev servers**

```bash
npm run dev &
npm run convex:dev &
```

**Step 2: Verify sidebar loads all sessions**

1. Open `/chat` — sidebar "Sesi Paper" tab
2. Confirm "Sesi Aktif" shows current conversation's session (or empty state)
3. Confirm "Sesi Lainnya" shows other sessions with compact info
4. Expand a session in "Sesi Lainnya" — artifacts load lazily

**Step 3: Verify 3-dot menu and read-only preview**

1. Click 3-dot on artifact from "Sesi Lainnya"
2. Click "Lihat Artifak"
3. Artifact panel opens with read-only banner
4. Edit and Refrasa buttons are disabled with tooltips
5. Copy and Download still work
6. Lock icon visible on tab

**Step 4: Verify fullscreen read-only**

1. Click expand on read-only artifact
2. Fullscreen shows same banner
3. "DAFTAR LAINNYA" shows artifacts from source session
4. Edit/Refrasa disabled

**Step 5: Verify "Lihat Percakapan" navigation**

1. Click "Lihat Percakapan →" in banner
2. Navigates to source conversation
3. Read-only tab auto-closed
4. Artifact now openable as editable from that conversation

**Step 6: Verify empty states**

1. Open conversation without paper session — "Percakapan ini belum memiliki sesi paper"
2. If user has only 1 session — "Sesi Lainnya" section hidden

**Step 7: Commit any fixes found during testing**
