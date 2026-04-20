# Edit/Resend on Validation Panel Decision — Context & Problem

**Date:** 2026-04-14
**Branch:** `chat-naskah-pages-enforcement`
**Discovery:** During pre-E2E-test analysis of edit/resend patterns
**Related:** `../edited-choice-card-confirmation/` (same pattern, earlier in the stage lifecycle)

## Two Scenarios, Same Root Cause

When a user edits/resends a message during the paper workflow, artifacts and stageData from the now-truncated flow persist in Convex while message history is truncated. This creates a state mismatch.

The `edited-choice-card-confirmation` fix handles the case where **no artifact exists yet** (choice flow interrupted). This document covers the two remaining cases where **an artifact already exists**.

---

## Scenario A: Artifact Exists, Stage NOT Approved

### Flow

1. User sends prompt
2. Model responds + choice card
3. User clicks choice button
4. System prints "Pilihan terkonfirmasi: X" + model continues
5. Model calls updateStageData → createArtifact → submitStageForValidation
6. Validation panel appears (stageStatus = "pending_validation")
7. **User edits/resends a message from step 1, 3, or earlier**

### State After Edit/Resend

- `currentStage` = N (unchanged — approval hasn't happened)
- `stageStatus` = "pending_validation" (unchanged — no code resets this)
- `stageData[N]` has fields including `artifactId` (unchanged — Convex not rolled back)
- Artifact exists in `artifacts` table (unchanged)
- Message history truncated to before edited message

### The Problem

The `resetStageDataForEditResend` mutation (from `edited-choice-card-confirmation` fix) has guard `!artifactId` — it skips reset when artifact exists. So:

1. stageData retains all fields (including `artifactId`)
2. Model sees `artifactId` → considers stage "done" or near-done
3. Model doesn't regenerate artifact — may try to submit again or skip to finalize
4. `stageStatus` remains "pending_validation" even though the flow that produced it was truncated
5. Validation panel may still appear or reappear without a fresh artifact

### What Should Happen

- stageData for stage N cleared (including `artifactId`)
- Existing artifact marked as `invalidatedAt` (expired, not deleted)
- `stageStatus` reset to `"drafting"`
- Model starts completely fresh — presents choice card, generates new artifact

---

## Scenario B: Stage Already Approved, Advanced to N+1

### Flow

1. User sends prompt
2. Model responds + choice card
3. User clicks choice button
4. System prints "Pilihan terkonfirmasi: X" + model continues
5. Model calls updateStageData → createArtifact → submitStageForValidation
6. Validation panel appears
7. User clicks "Setuju & Lanjutkan" (approve)
8. System prints "Tahap disetujui / Lifecycle artifak: terkunci / (stage name) / Lanjut ke tahap berikutnya."
9. approveStage mutation runs: currentStage → N+1, stageStatus → "drafting", validatedAt set, naskah rebuilt
10. Model responds with next stage content
11. **User edits/resends the approval message (step 8)**

### State After Edit/Resend

- `currentStage` = N+1 (already advanced — approval mutation already ran)
- Stage N has `validatedAt`, `artifactId`, approved stageData
- Stage N+1 has empty/minimal stageData
- Message history truncated: steps 1-7 survive, steps 8+ deleted
- Approval message replaced with edited content

### The Problem

1. Model receives history from stage N (steps 1-7) but paper mode prompt says `currentStage = N+1`
2. Model is confused: history talks about stage N, context says stage N+1
3. Stage N's artifact is still valid and locked
4. Stage N+1 is empty
5. The approval is irreversible without explicit rewind

### What Should Happen

**Option 1 (Recommended): Auto-rewind to stage N**
- Call `rewindToStage(N)` — invalidates stage N's validatedAt and artifact
- Clear stageData for stage N
- Model starts fresh at stage N
- Uses existing `rewindToStage` infrastructure (tested, handles naskah rebuild)

**Option 2 (Safer, simpler): Block or warn**
- Detect that edited message is an approval message
- Show warning: "Mengedit pesan ini akan membatalkan persetujuan tahap (stage name). Lanjutkan?"
- If confirmed: trigger rewind, then edit/resend
- If cancelled: abort edit

**Option 3 (Minimal): Document as known behavior**
- User uses timeline UI to rewind to stage N first, then edit/resend
- No code change needed
- UX friction: user must know to rewind before editing

---

## Root Cause (Both Scenarios)

Same as `edited-choice-card-confirmation`:

**Convex state (stageData, artifacts, stageStatus, stage transitions) is not versioned with message history.** `editAndTruncate` only deletes messages — it does not rollback any paper session state.

The `resetStageDataForEditResend` fix from the choice card case ONLY handles the "no artifact yet" case. The two scenarios in this document are the remaining cases where artifacts and/or approvals have already occurred.

## Relationship Between Fixes

```
Edit/resend during paper workflow:
├── No artifact yet (stageData only)
│   └── FIXED: resetStageDataForEditResend clears stageData
│       (edited-choice-card-confirmation)
├── Artifact exists, NOT approved (Scenario A)
│   └── TODO: expand reset to clear artifactId + invalidate artifact + reset stageStatus
└── Artifact exists, stage APPROVED (Scenario B)
    └── TODO: auto-rewind or warn + rewind
```

## Priority

- **Scenario A:** High — same stage, deterministic fix, no cascade
- **Scenario B:** Medium — requires auto-rewind with cascade implications (naskah rebuild, digest superseded). Can be handled manually via timeline rewind.
