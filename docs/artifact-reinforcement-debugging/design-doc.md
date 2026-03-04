# Design Doc: Artifact Version Reinforcement & Debugging

## Problem Statement

When artifacts are updated (via manual edit or refrasa apply), the `artifacts.update` mutation creates a new record (v2) with a new ID. However:

1. **UI tabs still point to old ID (v1)** — user sees stale content
2. **Paper session `stageData.artifactId` still references v1** — AI model uses outdated content for subsequent stages
3. **`viewingVersionId` doesn't auto-switch to v2** — both panel and fullscreen modes affected

## Root Cause

`artifacts.update` mutation (`convex/artifacts.ts:382-447`) creates a NEW record and returns `{ artifactId: newArtifactId, version: newVersion }`. All consumers ignore this return value.

### Bug Locations

| Bug | File | Line | Issue |
|-----|------|------|-------|
| Panel edit | `ArtifactViewer.tsx` | 163-181 | `handleSave()` ignores returned `newArtifactId` |
| Fullscreen edit | `FullsizeArtifactModal.tsx` | 332-350 | `handleSave()` ignores returned `newArtifactId` |
| Refrasa apply | `RefrasaTabContent.tsx` | 89-110 | `onActivateTab(sourceArtifactId)` uses old ID instead of new ID |
| AI context | `paper-mode-prompt.ts` | 141-160 | `artifactMap.get(sd.artifactId)` — stageData never updated |

## Solution Design

### 1. Add `updateTabId` to `useArtifactTabs` hook

New function that replaces an existing tab's artifact ID with a new one (for version upgrades).

**File:** `src/lib/hooks/useArtifactTabs.ts`

```typescript
const updateTabId = useCallback((oldId: Id<"artifacts">, newId: Id<"artifacts">) => {
  setOpenTabs((prev) =>
    prev.map((tab) => tab.id === oldId ? { ...tab, id: newId } : tab)
  )
  setActiveTabId((prev) => prev === oldId ? newId : prev)
}, [])
```

### 2. Fix ArtifactViewer `handleSave` (panel mode)

**File:** `src/components/chat/ArtifactViewer.tsx`

- Add `onVersionCreated` callback prop: `(oldId: Id<"artifacts">, newId: Id<"artifacts">) => void`
- After `updateArtifact()` succeeds, use returned `artifactId` to:
  1. Call `onVersionCreated(artifact._id, result.artifactId)`
  2. Set `viewingVersionId` to `result.artifactId`

### 3. Fix FullsizeArtifactModal `handleSave` (fullscreen mode)

**File:** `src/components/chat/FullsizeArtifactModal.tsx`

- Add `onVersionCreated` callback prop (same signature)
- After `updateArtifact()` succeeds:
  1. Call `onVersionCreated(artifact._id, result.artifactId)`
  2. Set `viewingVersionId` to `result.artifactId`
  3. Set `activeArtifactId` to `result.artifactId`

### 4. Fix RefrasaTabContent `handleApply`

**File:** `src/components/refrasa/RefrasaTabContent.tsx`

- Add `onSourceVersionCreated` callback prop: `(oldId: Id<"artifacts">, newId: Id<"artifacts">) => void`
- After `updateArtifact()` succeeds:
  1. Capture returned `{ artifactId: newId }`
  2. Call `onSourceVersionCreated(sourceArtifactId, newId)`
  3. `onActivateTab(newId)` instead of `onActivateTab(sourceArtifactId)`

### 5. Wire callbacks in ArtifactPanel

**File:** `src/components/chat/ArtifactPanel.tsx`

- Pass `onVersionCreated` to ArtifactViewer and FullsizeArtifactModal
- Implementation calls `updateTabId(oldId, newId)` from the hook

### 6. Update paper session stageData in mutation (atomic)

**File:** `convex/artifacts.ts` — `update` mutation handler

After creating new version, atomically update paper session:

```typescript
// After inserting new artifact...
// Find active paper session for this conversation
const session = await db.query("paperSessions")
  .withIndex("by_conversation", q => q.eq("conversationId", oldArtifact.conversationId))
  .filter(q => q.eq(q.field("archivedAt"), undefined))
  .first()

if (session?.stageData) {
  const stageData = session.stageData as Record<string, { artifactId?: string }>
  let updated = false
  const newStageData = { ...stageData }

  for (const [stageId, sd] of Object.entries(newStageData)) {
    if (sd?.artifactId === String(artifactId)) {
      newStageData[stageId] = { ...sd, artifactId: String(newArtifactId) }
      updated = true
    }
  }

  if (updated) {
    await db.patch(session._id, { stageData: newStageData })
  }
}
```

This is atomic within the same Convex mutation transaction — no race conditions.

## Data Flow (After Fix)

```
User edits artifact v1 → "Simpan"
  → artifacts.update(v1_id, content) runs in Convex
    → Creates v2 record (new ID)
    → Checks paperSession stageData → replaces v1_id with v2_id
    → Returns { artifactId: v2_id, version: 2 }
  → Frontend receives result
    → onVersionCreated(v1_id, v2_id) called
      → useArtifactTabs.updateTabId(v1_id, v2_id)
      → Tab now points to v2_id
    → setViewingVersionId(v2_id)
    → Convex reactive query auto-updates artifact display
  → AI context for next stage uses v2_id from stageData → gets v2 content
```

## Edge Cases

| Case | Behavior |
|------|----------|
| User viewing v1 via dropdown, edits → v2 | Auto-switch to v2 (user just edited, wants to see result) |
| Refrasa applied to source → source becomes v2 | Tab switches to v2 of source, refrasa tab remains |
| Multiple tabs open for same artifact | Only the matching tab ID gets updated |
| No active paper session | stageData update is skipped (no-op) |
| stageData doesn't reference this artifact | No update needed (no-op) |
| Concurrent edits | Convex mutation is atomic, last write wins |

## Files Changed

| File | Change Type |
|------|------------|
| `src/lib/hooks/useArtifactTabs.ts` | Add `updateTabId` function |
| `src/components/chat/ArtifactViewer.tsx` | Use mutation return value + callback |
| `src/components/chat/FullsizeArtifactModal.tsx` | Use mutation return value + callback |
| `src/components/chat/ArtifactPanel.tsx` | Wire `onVersionCreated` callback |
| `src/components/refrasa/RefrasaTabContent.tsx` | Use mutation return value + callback |
| `convex/artifacts.ts` | Add stageData update in `update` mutation |

## Risk Assessment

- **Low risk:** UI changes are additive (new callback prop, using existing return value)
- **Medium risk:** Convex mutation change — needs index verification for `paperSessions.by_conversation`
- **No schema changes required**
- **No new dependencies**
