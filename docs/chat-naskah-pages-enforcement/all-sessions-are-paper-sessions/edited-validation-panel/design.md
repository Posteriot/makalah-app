# Edit/Resend on Validation Panel Decision — Design

**Date:** 2026-04-14
**Branch:** `chat-naskah-pages-enforcement`
**Execution:** After E2E test completes

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scenario A scope | Expand `resetStageDataForEditResend` to handle artifact-exists case | Same mutation, same call site. Just remove the `!artifactId` guard and add artifact invalidation. |
| Artifact handling | Mark `invalidatedAt` on existing artifact, clear `artifactId` from stageData | Don't delete — invalidation is reversible and auditable. Same pattern as `rewindToStage`. |
| stageStatus reset | Reset to `"drafting"` when clearing a pending_validation stage | `pending_validation` without a valid artifact is an invalid state. |
| Scenario B approach | Auto-rewind with confirmation dialog | User must explicitly confirm because rewind has cascade effects (naskah rebuild, digest superseded, artifact invalidation). |
| Scenario B detection | Check if truncated messages span a stage boundary | If `currentStage` > stage referenced in the last surviving message, an approval was truncated. |

## Scenario A: Expand Reset to Handle Artifacts

### Current Behavior (after choice card fix)

```typescript
// resetStageDataForEditResend guard:
if (!currentStageData || currentStageData.artifactId) {
    return { reset: false, reason: "has_artifact" };  // ← BLOCKS reset
}
```

### New Behavior

```typescript
// Remove artifactId guard — reset regardless of artifact existence
if (!currentStageData) {
    return { reset: false, reason: "no_data" };
}

// If artifact exists, invalidate it
if (currentStageData.artifactId) {
    await ctx.db.patch(currentStageData.artifactId, {
        invalidatedAt: Date.now(),
        invalidatedByEditResend: true,
    });
}

// Clear ALL stageData (including artifactId), preserve revisionCount only
// Reset stageStatus to "drafting" if currently "pending_validation"
```

### Contract Change

| Before | After |
|--------|-------|
| Reset ONLY when no artifact | Reset regardless — also invalidate artifact |
| stageStatus untouched | stageStatus reset to "drafting" if "pending_validation" |
| Guard: `!artifactId` | Guard: `!currentStageData` (only skip if truly empty) |

### Deterministic vs Probabilistic

- stageData clear: **deterministic** — code guarantees
- Artifact invalidation: **deterministic** — code guarantees `invalidatedAt` set
- stageStatus reset: **deterministic** — code guarantees `"drafting"`
- Model regenerates artifact: **probabilistic** — but with no artifactId in stageData and clean slate, model behaves as if stage just started. Highly likely to present choice card and generate fresh artifact.

---

## Scenario B: Auto-Rewind on Approval Edit

### Detection Logic

When `handleEdit` runs:
1. Paper mode active
2. `currentStage` = N+1 (stage has advanced)
3. The truncated messages include an approval event
4. After truncation, message history context is about stage N, not N+1

**Simpler detection:** after `editAndTruncate`, check if `currentStage` has NO stageData and the PREVIOUS stage has `validatedAt`. This means we just advanced and the user is editing from the previous stage's flow.

### Flow

```
handleEdit:
  1. editAndTruncate (messages deleted)
  2. Detect: currentStage=N+1, stageData[N+1] empty, stageData[N] has validatedAt
  3. Show confirmation dialog:
     "Mengedit pesan ini akan membatalkan persetujuan tahap [stage N name]
      dan kembali ke tahap tersebut. Artifact dan validasi akan di-reset.
      Lanjutkan?"
  4. If confirmed:
     a. Call rewindToStage(N) — handles artifact invalidation, validatedAt clear,
        naskah rebuild, digest superseding
     b. Call resetStageDataForEditResend — clear stageData for stage N
     c. Send edited message
  5. If cancelled: abort edit/resend
```

### Why Confirmation Dialog

`rewindToStage` has cascade effects:
- Invalidates artifact for stage N
- Clears `validatedAt` for stage N
- Marks `paperMemoryDigest` entries as superseded
- Rebuilds `naskahSnapshot` atomically
- Creates `rewindHistory` audit record

These are irreversible without re-approving the stage. User must consent.

### State After Auto-Rewind + Reset

- `currentStage` = N (rewound)
- `stageStatus` = "drafting"
- `stageData[N]` = `{ revisionCount }` (cleared by reset)
- Artifact N: `invalidatedAt` set
- `validatedAt` for stage N: cleared
- `naskahSnapshot`: rebuilt without stage N content
- Message history: steps 1-6 (up to validation panel, before approval)

### Edge Case: Multi-Stage Edit

User could theoretically edit a message from stage N-2 when currently at stage N+1. This would require rewinding multiple stages. The detection logic (`currentStage has no data, previous stage has validatedAt`) only covers 1-stage-back. For deeper edits:

- Option: Only allow auto-rewind 1 stage back. For deeper edits, show message: "Gunakan timeline untuk kembali ke tahap yang diinginkan, lalu edit pesan."
- Rationale: Multi-stage auto-rewind is dangerous and rare.

---

## Implementation Order

Scenario A first (same mutation, expand guards), then Scenario B (new UX flow with dialog).

Both executed AFTER E2E test completes — documented here for future implementation.
