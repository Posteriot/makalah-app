# Refrasa Tab-Based UX — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace ephemeral dialog-based Refrasa with persistent tab-based flow where results are saved as artifact records with versioning.

**Architecture:** Refrasa results become artifacts (`type: "refrasa"`) in Convex DB, displayed in the existing artifact tab system. New `RefrasaTabContent` component replaces `RefrasaConfirmDialog`. Fullscreen modal gets tab bar. Sidebar shows refrasa with "R" badge.

**Tech Stack:** Convex (schema + mutations), React (components), Next.js, Iconoir, shadcn/ui (Select, Tabs, Tooltip, Collapsible)

**Design Doc:** `docs/plans/2026-02-19-refrasa-tab-based-ux-design.md`

---

### Task 1: Schema — Add "refrasa" type + new fields

**Files:**
- Modify: `convex/schema.ts:187-241`

**Step 1: Add `"refrasa"` to artifact type union**

In `convex/schema.ts`, inside the `artifacts` table definition, add `v.literal("refrasa")` to the `type` union (after line 200 `v.literal("chart")`):

```typescript
    type: v.union(
      v.literal("code"),
      v.literal("outline"),
      v.literal("section"),
      v.literal("table"),
      v.literal("citation"),
      v.literal("formula"),
      v.literal("chart"),
      v.literal("refrasa"),
    ),
```

**Step 2: Add new fields after `invalidatedByRewindToStage` (line 232)**

```typescript
    // Refrasa: link to source artifact + analysis issues
    sourceArtifactId: v.optional(v.id("artifacts")),
    refrasaIssues: v.optional(v.array(v.object({
      type: v.string(),
      category: v.string(),
      message: v.string(),
      severity: v.string(),
      suggestion: v.optional(v.string()),
    }))),
```

**Step 3: Add index for source artifact lookup**

After line 241 `.index("by_parent", ["parentId"])`, add:

```typescript
    .index("by_source_artifact", ["sourceArtifactId"]),
```

**Step 4: Verify Convex sync**

Run: `npm run convex:dev` (should be running)
Expected: Schema syncs without errors. Check terminal output.

**Step 5: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add refrasa artifact type with source link and issues"
```

---

### Task 2: Mutation — createRefrasaArtifact + getBySourceArtifact

**Files:**
- Modify: `convex/artifacts.ts`

**Step 1: Add `createRefrasa` mutation**

After the existing `create` mutation (around line 296), add:

```typescript
/**
 * Create a refrasa artifact linked to a source artifact.
 * If a previous refrasa exists for this source, links via parentId for versioning.
 */
export const createRefrasa = mutationGeneric({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    sourceArtifactId: v.id("artifacts"),
    content: v.string(),
    refrasaIssues: v.array(v.object({
      type: v.string(),
      category: v.string(),
      message: v.string(),
      severity: v.string(),
      suggestion: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    // Verify user owns conversation
    const conversation = await ctx.db.get(args.conversationId)
    if (!conversation || conversation.userId !== args.userId) {
      throw new Error("Unauthorized")
    }

    // Verify source artifact exists
    const sourceArtifact = await ctx.db.get(args.sourceArtifactId)
    if (!sourceArtifact) {
      throw new Error("Source artifact not found")
    }

    // Find latest refrasa version for this source
    const existingRefrasas = await ctx.db
      .query("artifacts")
      .withIndex("by_source_artifact", (q) => q.eq("sourceArtifactId", args.sourceArtifactId))
      .collect()

    const latestRefrasa = existingRefrasas
      .filter((a) => a.type === "refrasa")
      .sort((a, b) => b.version - a.version)[0]

    const now = Date.now()
    const newVersion = latestRefrasa ? latestRefrasa.version + 1 : 1

    const artifactId = await ctx.db.insert("artifacts", {
      conversationId: args.conversationId,
      userId: args.userId,
      type: "refrasa",
      title: `R: ${sourceArtifact.title}`,
      content: args.content,
      sourceArtifactId: args.sourceArtifactId,
      refrasaIssues: args.refrasaIssues,
      version: newVersion,
      parentId: latestRefrasa?._id,
      createdAt: now,
      updatedAt: now,
    })

    return { artifactId, version: newVersion }
  },
})
```

**Step 2: Add `getBySourceArtifact` query**

After `getVersionHistory` query (around line 225), add:

```typescript
/**
 * Get all refrasa artifacts for a given source artifact.
 * Returns sorted by version descending (latest first).
 */
export const getBySourceArtifact = queryGeneric({
  args: {
    sourceArtifactId: v.id("artifacts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("artifacts")
      .withIndex("by_source_artifact", (q) => q.eq("sourceArtifactId", args.sourceArtifactId))
      .collect()

    return results
      .filter((a) => a.type === "refrasa" && a.userId === args.userId)
      .sort((a, b) => b.version - a.version)
  },
})
```

**Step 3: Verify Convex sync**

Expected: No type errors, mutations register in Convex dashboard.

**Step 4: Commit**

```bash
git add convex/artifacts.ts
git commit -m "feat(artifacts): add createRefrasa mutation and getBySourceArtifact query"
```

---

### Task 3: Update useRefrasa hook — persist to DB + open tab

**Files:**
- Modify: `src/lib/hooks/useRefrasa.ts`

**Step 1: Add Convex mutation import and createArtifact callback**

The hook currently only stores result in React state. Update it to:
1. Accept a callback `onArtifactCreated` (for opening the tab)
2. After API response, call `createRefrasa` mutation
3. Return the new artifact ID

Updated hook signature:

```typescript
import { useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

interface UseRefrasaOptions {
  conversationId: Id<"conversations"> | null
  userId: Id<"users"> | null
  onArtifactCreated?: (artifactId: Id<"artifacts">, title: string) => void
}

export function useRefrasa(options: UseRefrasaOptions): UseRefrasaReturn
```

Update `analyzeAndRefrasa` to:
1. Call `/api/refrasa` (same as before)
2. On success: call `createRefrasa` mutation with result
3. Call `onArtifactCreated` callback with new artifact ID
4. Store result in state (for immediate display while tab loads)

```typescript
const createRefrasaMutation = useMutation(api.artifacts.createRefrasa)

const analyzeAndRefrasa = useCallback(
  async (content: string, sourceArtifactId: Id<"artifacts">, sourceTitle: string) => {
    if (!options.conversationId || !options.userId) return
    setState({ isLoading: true, result: null, error: null })
    try {
      const response = await fetch("/api/refrasa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, artifactId: sourceArtifactId }),
      })
      if (!response.ok) throw new Error(`Refrasa failed: ${response.status}`)
      const data: RefrasaResponse = await response.json()

      // Persist to DB
      const { artifactId } = await createRefrasaMutation({
        conversationId: options.conversationId,
        userId: options.userId,
        sourceArtifactId,
        content: data.refrasedText,
        refrasaIssues: data.issues,
      })

      setState({ isLoading: false, result: data, error: null })

      // Notify caller to open tab
      options.onArtifactCreated?.(artifactId, `R: ${sourceTitle}`)
    } catch (err) {
      setState({ isLoading: false, result: null, error: err instanceof Error ? err.message : "Gagal melakukan refrasa" })
    }
  },
  [options.conversationId, options.userId, createRefrasaMutation, options.onArtifactCreated]
)
```

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/lib/hooks/useRefrasa.ts
git commit -m "feat(useRefrasa): persist result to DB and notify for tab opening"
```

---

### Task 4: ArtifactTabs — add "R" icon for refrasa type

**Files:**
- Modify: `src/components/chat/ArtifactTabs.tsx:20-31`

**Step 1: Add refrasa entry to `typeMeta`**

In `typeMeta` (line 20-27), add entry for refrasa. Since "R" is a custom badge (not an Iconoir icon), use a small inline component:

```typescript
const RefrasaBadge = () => (
  <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-amber-500/20 text-[9px] font-mono font-bold text-amber-700 dark:text-amber-300">
    R
  </span>
)

const typeMeta: Record<string, { icon: React.ElementType; label: string }> = {
  code:     { icon: Code,          label: "Code" },
  outline:  { icon: List,          label: "Outline" },
  section:  { icon: Page,          label: "Section" },
  table:    { icon: Table2Columns, label: "Tabel" },
  citation: { icon: Book,          label: "Sitasi" },
  formula:  { icon: Calculator,    label: "Formula" },
  refrasa:  { icon: RefrasaBadge,  label: "Refrasa" },
}
```

**Step 2: Verify tab renders correctly**

The existing `getTabMeta(type)` function will automatically pick up the new entry. No other changes needed in this file.

**Step 3: Commit**

```bash
git add src/components/chat/ArtifactTabs.tsx
git commit -m "feat(tabs): add R badge icon for refrasa artifact type"
```

---

### Task 5: RefrasaToolbar component

**Files:**
- Create: `src/components/refrasa/RefrasaToolbar.tsx`

**Step 1: Create toolbar component**

This toolbar provides: version dropdown, download, copy, delete, issues badge, apply button. Visual vocabulary from artifact toolbar (slate colors, font-mono, icon buttons).

Props:
```typescript
interface RefrasaToolbarProps {
  artifact: Doc<"artifacts">           // current refrasa artifact
  sourceArtifact: Doc<"artifacts">     // source artifact
  versions: Doc<"artifacts">[]         // all refrasa versions for this source
  onVersionChange: (id: Id<"artifacts">) => void
  onApply: () => void
  onDelete: () => void
  isApplying?: boolean
}
```

Toolbar layout: version Select | Download dropdown | Copy | Delete | Issues badge | Apply button

Reference: `ArtifactToolbar.tsx` for download/copy patterns, `RefrasaConfirmDialog.tsx` for issues badge pattern.

Icons: `Download`, `Copy`, `Trash`, `Check`, `WarningTriangle`, `DocMagnifyingGlass` from iconoir-react.

Issues panel: Reuse `RefrasaIssueItem` component + collapsible pattern from `RefrasaConfirmDialog`.

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/refrasa/RefrasaToolbar.tsx
git commit -m "feat(refrasa): create RefrasaToolbar with version, download, copy, delete, issues, apply"
```

---

### Task 6: RefrasaTabContent component

**Files:**
- Create: `src/components/refrasa/RefrasaTabContent.tsx`

**Step 1: Create tab content component**

This replaces RefrasaConfirmDialog as the main view for refrasa results. Displayed inside ArtifactPanel/FullsizeModal when active tab is a refrasa artifact.

```typescript
interface RefrasaTabContentProps {
  artifactId: Id<"artifacts">
  conversationId: Id<"conversations">
  userId: Id<"users">
  onOpenTab: (artifact: { id: Id<"artifacts">; title: string; type: string }) => void
}
```

Component structure:
1. Query artifact via `useQuery(api.artifacts.get, { artifactId, userId })`
2. Query source artifact via `sourceArtifactId`
3. Query all versions via `useQuery(api.artifacts.getBySourceArtifact, { sourceArtifactId, userId })`
4. Render: `RefrasaToolbar` at top + scrollable content area with refrasedText
5. Apply action: call `updateArtifact` on source artifact with refrasa content
6. Delete action: call `remove` mutation, close tab if no versions left

Content rendering: `<p className="whitespace-pre-wrap text-sm leading-relaxed">` (same as current dialog).

Loading state: Reuse `RefrasaLoadingIndicator`.

**Step 2: Verify types compile**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/refrasa/RefrasaTabContent.tsx
git commit -m "feat(refrasa): create RefrasaTabContent for tab-based result viewing"
```

---

### Task 7: Wire ArtifactPanel — render RefrasaTabContent for refrasa tabs

**Files:**
- Modify: `src/components/chat/ArtifactPanel.tsx`
- Modify: `src/components/chat/ArtifactViewer.tsx`

**Step 1: In ArtifactPanel, check active tab type**

Where `ArtifactViewer` is rendered (inside the panel content area), add conditional:
- If active tab `type === "refrasa"` → render `RefrasaTabContent`
- Otherwise → render `ArtifactViewer` (existing behavior)

```typescript
import { RefrasaTabContent } from "@/components/refrasa/RefrasaTabContent"

// In render, where ArtifactViewer is currently rendered:
{activeTab?.type === "refrasa" ? (
  <RefrasaTabContent
    artifactId={activeTab.id}
    conversationId={conversationId}
    userId={currentUser._id}
    onOpenTab={onTabChange ? (tab) => { /* openTab logic */ } : undefined}
  />
) : (
  <ArtifactViewer ref={viewerRef} ... />
)}
```

**Step 2: Update ArtifactViewer Refrasa trigger flow**

In `ArtifactViewer.tsx`, change `handleRefrasaTrigger`:
- Old: call `analyzeAndRefrasa(content, artifactId)` → show dialog on result
- New: call `analyzeAndRefrasa(content, artifactId, artifactTitle)` → hook creates DB record + calls `onArtifactCreated` → parent opens tab

Update `useRefrasa` call to pass options:
```typescript
const { ... } = useRefrasa({
  conversationId,
  userId: currentUser?._id ?? null,
  onArtifactCreated: (artifactId, title) => {
    onOpenRefrasaTab?.({ id: artifactId, title, type: "refrasa" })
  },
})
```

Add prop `onOpenRefrasaTab` to ArtifactViewer (passed from ArtifactPanel → ChatContainer).

**Step 3: Remove RefrasaConfirmDialog render from ArtifactViewer**

Delete: `showRefrasaDialog` state, `handleApplyRefrasa`, `handleCloseRefrasaDialog`, `RefrasaConfirmDialog` JSX.

**Step 4: Verify types compile**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/components/chat/ArtifactPanel.tsx src/components/chat/ArtifactViewer.tsx
git commit -m "feat(panel): render RefrasaTabContent for refrasa tabs, remove dialog flow"
```

---

### Task 8: Wire ChatContainer — pass openTab callback through

**Files:**
- Modify: `src/components/chat/ChatContainer.tsx`

**Step 1: Pass `openArtifactTab` to ArtifactPanel for refrasa tab opening**

ArtifactPanel needs access to `openArtifactTab` so that when `useRefrasa.onArtifactCreated` fires, it can open a new tab. This should already be partially wired — verify the prop chain:

`ChatContainer` → `ArtifactPanel` → `ArtifactViewer` → `useRefrasa.onArtifactCreated`

Add `onOpenRefrasaTab` prop to ArtifactPanel if not already present.

**Step 2: Verify types compile + test manually**

Run: `npx tsc --noEmit`

**Step 3: Commit**

```bash
git add src/components/chat/ChatContainer.tsx
git commit -m "feat(container): wire openTab callback for refrasa tab creation"
```

---

### Task 9: FullsizeArtifactModal — add tab bar

**Files:**
- Modify: `src/components/chat/FullsizeArtifactModal.tsx`

**Step 1: Add tab state to fullscreen modal**

Import `useArtifactTabs` and `ArtifactTabs`. Add tab bar between header (line 609) and content (line 612).

```typescript
import useArtifactTabs from "@/lib/hooks/useArtifactTabs"
import { ArtifactTabs } from "./ArtifactTabs"

// Inside component:
const {
  openTabs: modalTabs,
  activeTabId: modalActiveTabId,
  openTab: openModalTab,
  closeTab: closeModalTab,
  setActiveTab: setModalActiveTab,
} = useArtifactTabs()

// Initialize with current artifact on mount
useEffect(() => {
  if (artifactId && artifact) {
    openModalTab({ id: artifactId, title: artifact.title, type: artifact.type })
  }
}, [artifactId]) // only on initial mount
```

**Step 2: Insert ArtifactTabs between header and content**

After the header `</div>` (around line 609), before the content `<div>`:

```tsx
{modalTabs.length > 1 && (
  <div className="shrink-0 border-b border-slate-300/70 dark:border-slate-700/70">
    <ArtifactTabs
      tabs={modalTabs}
      activeTabId={modalActiveTabId}
      onTabChange={setModalActiveTab}
      onTabClose={closeModalTab}
    />
  </div>
)}
```

Only show tab bar when there are 2+ tabs (single tab = no bar needed, saves space).

**Step 3: Update content rendering to use active tab**

Replace `activeArtifactId` logic with `modalActiveTabId`. When active tab is refrasa → render `RefrasaTabContent`. Else → existing artifact renderer.

**Step 4: Update Refrasa trigger in fullscreen**

Same pattern as ArtifactViewer: `useRefrasa` with `onArtifactCreated` → `openModalTab`.

**Step 5: Remove RefrasaConfirmDialog render from FullsizeArtifactModal**

Delete `showRefrasaDialog` state, `RefrasaConfirmDialog` JSX (lines 816-829).

**Step 6: Verify types compile**

Run: `npx tsc --noEmit`

**Step 7: Commit**

```bash
git add src/components/chat/FullsizeArtifactModal.tsx
git commit -m "feat(fullscreen): add tab bar and refrasa tab support"
```

---

### Task 10: SidebarPaperSessions — add "R" badge for refrasa artifacts

**Files:**
- Modify: `src/components/chat/sidebar/SidebarPaperSessions.tsx:453-533`

**Step 1: Update `ArtifactTreeItem` icon rendering**

In `ArtifactTreeItem` (line 487+), where the `Page` icon is rendered, add conditional for refrasa type:

```tsx
{artifact.type === "refrasa" ? (
  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm bg-amber-500/20 text-[9px] font-mono font-bold text-amber-700 dark:text-amber-300">
    R
  </span>
) : (
  <Page className={`h-4 w-4 shrink-0 ${isFinal ? "text-slate-500 dark:text-slate-400" : "text-amber-600 dark:text-amber-500"}`} />
)}
```

**Step 2: Verify listing works**

Refrasa artifacts should appear in the list alongside other artifacts with "R" badge instead of document icon.

**Step 3: Commit**

```bash
git add src/components/chat/sidebar/SidebarPaperSessions.tsx
git commit -m "feat(sidebar): show R badge for refrasa artifacts in folder listing"
```

---

### Task 11: Cleanup — remove RefrasaConfirmDialog

**Files:**
- Delete: `src/components/refrasa/RefrasaConfirmDialog.tsx`
- Modify: `src/components/refrasa/index.ts` (remove export)

**Step 1: Remove RefrasaConfirmDialog file**

```bash
rm src/components/refrasa/RefrasaConfirmDialog.tsx
```

**Step 2: Update barrel export**

In `src/components/refrasa/index.ts`, remove the `RefrasaConfirmDialog` export. Keep `RefrasaLoadingIndicator`, `RefrasaIssueItem`.

**Step 3: Search for remaining imports**

```bash
grep -r "RefrasaConfirmDialog" src/
```

Expected: No remaining imports (should be cleaned in Tasks 7 and 9).

**Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(refrasa): remove RefrasaConfirmDialog (replaced by tab-based flow)"
```

---

### Task 12: Integration test — visual verify

**Step 1: Panel mode test**
1. Open artifact panel with an artifact
2. Click Refrasa from toolbar
3. Verify: loading state shows in panel
4. Verify: new tab "R: <title>" appears in tab bar
5. Verify: tab content shows refrasedText with toolbar
6. Verify: issues badge clickable, floating panel works
7. Verify: version dropdown shows v1
8. Verify: "Terapkan" applies content to source artifact

**Step 2: Regenerate test**
1. Click Refrasa again on same source artifact
2. Verify: version dropdown now shows v1, v2
3. Verify: can switch between versions

**Step 3: Fullscreen mode test**
1. Open fullscreen modal
2. Click Refrasa
3. Verify: tab bar appears with 2 tabs (source + refrasa)
4. Verify: can switch between tabs

**Step 4: Sidebar test**
1. Open Sesi Paper sidebar
2. Verify: refrasa artifact shows with "R" badge
3. Verify: clicking opens in artifact panel

**Step 5: Delete test**
1. Click delete on a refrasa version
2. Verify: confirmation dialog
3. Verify: version removed, tab updates or closes

**Step 6: Dark/light mode**
Verify all above in both themes.
