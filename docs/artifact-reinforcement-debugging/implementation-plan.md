# Implementation Plan: Artifact Version Reinforcement

## Prerequisites
- Branch: `feat/artifact-reinforcement`
- All changes in worktree: `.worktrees/artifact-reinforcement/`

## Task Order

### Task 1: Add `updateTabId` to `useArtifactTabs` hook
**File:** `src/lib/hooks/useArtifactTabs.ts`
**Changes:**
1. Add `updateTabId(oldId, newId)` function that replaces tab ID in `openTabs` array and updates `activeTabId` if it matches
2. Export it in the return object and `UseArtifactTabsReturn` interface

**Acceptance:**
- Function exists and is typed correctly
- No existing behavior changes

---

### Task 2: Fix `ArtifactViewer.handleSave` (panel mode)
**File:** `src/components/chat/ArtifactViewer.tsx`
**Changes:**
1. Add `onVersionCreated?: (oldId: Id<"artifacts">, newId: Id<"artifacts">) => void` to `ArtifactViewerProps`
2. In `handleSave`, capture return value from `updateArtifact()`
3. Call `onVersionCreated(artifact._id, result.artifactId)`
4. Set `setViewingVersionId(result.artifactId)`

**Acceptance:**
- After edit+save, viewer immediately shows v2 content
- Tab ID is updated via callback

---

### Task 3: Fix `FullsizeArtifactModal.handleSave` (fullscreen mode)
**File:** `src/components/chat/FullsizeArtifactModal.tsx`
**Changes:**
1. Add `onVersionCreated?: (oldId: Id<"artifacts">, newId: Id<"artifacts">) => void` to `FullsizeArtifactModalProps`
2. In `handleSave`, capture return value from `updateArtifact()`
3. Call `onVersionCreated(artifact._id, result.artifactId)`
4. Set `setViewingVersionId(result.artifactId)` and `setActiveArtifactId(result.artifactId)`

**Acceptance:**
- After edit+save in fullscreen, viewer immediately shows v2 content
- Tab ID is updated via callback

---

### Task 4: Fix `RefrasaTabContent.handleApply`
**File:** `src/components/refrasa/RefrasaTabContent.tsx`
**Changes:**
1. Add `onSourceVersionCreated?: (oldId: Id<"artifacts">, newId: Id<"artifacts">) => void` to props
2. In `handleApply`, capture return value from `updateArtifact()`
3. Call `onSourceVersionCreated(sourceArtifactId, result.artifactId)`
4. Change `onActivateTab(result.artifactId)` instead of `onActivateTab(sourceArtifactId)`

**Acceptance:**
- After refrasa apply, source artifact tab switches to v2
- Tab shows updated content immediately

---

### Task 5: Wire callbacks in `ArtifactPanel`
**File:** `src/components/chat/ArtifactPanel.tsx`
**Changes:**
1. Use `updateTabId` from `useArtifactTabs` (passed as prop from parent)
2. Create `handleVersionCreated` callback: calls `updateTabId(oldId, newId)`
3. Pass to `ArtifactViewer` as `onVersionCreated`
4. Pass to `FullsizeArtifactModal` as `onVersionCreated`
5. Pass `onSourceVersionCreated` to `RefrasaTabContent` (both panel and fullscreen instances)

**Note:** Need to check how `ArtifactPanel` receives tab state — it gets `openTabs`, `activeTabId`, `onTabChange`, `onTabClose`, `onOpenTab` as props from `ChatContainer`. The `updateTabId` also needs to come from parent.

**Acceptance:**
- Callbacks are wired end-to-end from hook → panel → viewer/modal/refrasa

---

### Task 6: Update paper session stageData in `artifacts.update` mutation
**File:** `convex/artifacts.ts`
**Changes:**
1. After creating new artifact version (line ~440), query active paper session
2. Use `by_conversation` index on `paperSessions` table
3. Filter for non-archived sessions (`archivedAt === undefined`)
4. Scan stageData for old `artifactId` reference
5. If found, patch stageData with new artifact ID

**Acceptance:**
- After artifact update, `stageData[stage].artifactId` points to new version
- AI context (`paper-mode-prompt.ts`) automatically picks up v2 content
- No-op when no paper session or no matching reference

---

### Task 7: Verify `ChatContainer` passes `updateTabId` down
**File:** `src/components/chat/ChatContainer.tsx`
**Changes:**
1. Destructure `updateTabId` from `useArtifactTabs()`
2. Pass it to `ArtifactPanel` as prop

**Acceptance:**
- Full prop chain works: `ChatContainer → ArtifactPanel → ArtifactViewer/FullsizeArtifactModal/RefrasaTabContent`

---

### Task 8: Build & lint verification
**Commands:**
```bash
npm run lint
npm run build
```

**Acceptance:**
- No TypeScript errors
- No lint errors
- Build succeeds

---

## Execution Notes
- Tasks 1-6 can be partially parallelized (Task 1 first, then 2-4 in parallel, then 5-7 depend on earlier tasks)
- Task 6 (Convex mutation) is independent and can be done alongside UI tasks
- Task 8 is final verification gate
