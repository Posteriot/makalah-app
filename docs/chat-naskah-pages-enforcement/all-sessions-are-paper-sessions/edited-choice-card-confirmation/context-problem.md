# Edit/Resend on Confirmed Choice Card — Context & Problem

**Date:** 2026-04-14
**Branch:** `chat-naskah-pages-enforcement`
**Discovery:** During pre-E2E-test review of edit/resend behavior

## The Flow

1. User sends prompt
2. Model responds with interactive choice card (yaml-spec)
3. User clicks a choice button
4. System prints "Pilihan terkonfirmasi: [selected option]" as a user message + model continues responding (tool chain: updateStageData → createArtifact → submitStageForValidation)
5. **User edits/resends the "Pilihan terkonfirmasi" message** (step 4) before artifact is created
6. Model responds

## What Happens Technically on Edit/Resend (Step 5)

`handleEdit` in `ChatWindow.tsx` (line 1975-2114):

1. `editAndTruncate` (line 2034) — deletes the edited message AND all subsequent messages from Convex DB
2. Local messages truncated to BEFORE the edited message (line 2048)
3. Edited content sent as new message via `sendUserMessageWithContext` (line 2093-2103)

### Message History After Truncation

| # | Message | Status |
|---|---------|--------|
| 1 | User prompt (original) | Survives |
| 2 | Model response + choice card YAML | Survives |
| 3 | "Pilihan terkonfirmasi: X" | Replaced with edited content |
| 4 | Model response (tool calls, artifact) | Deleted |

### What Survives vs What's Lost

**Survives:**
- Original user prompt (step 1) — in message history
- Model response with choice card options (step 2) — in message history
- `stageData` in Convex — partial data from `updateStageData` call that happened between step 4 and step 5

**Lost:**
- `choiceInteractionEvent` — this is a one-shot payload in the request body (`interactionEvent` field), NOT stored in message history. Edit/resend sends a regular text message without this payload.
- `buildChoiceContextNote` injection — only fires when `choiceInteractionEvent` is present
- `[CHOICE][artifact-enforcer]` activation — only fires when `choiceInteractionEvent` is present
- Assistant response with tool calls (step 4) — deleted by truncation

## The Problem

### stageData is stale but persists

Between step 4 and step 5, `updateStageData` may have already been called. This means:
- `stageData[currentStage]` has fields like `angle`, `analisis`, `temuanUtama`, etc.
- These fields make the stage look "mature" to the model
- But the artifact hasn't been created yet (`artifactId` is absent)

### Model likely skips choice card (probabilistic, not deterministic)

On step 6, the model receives:
- Message history with original prompt + choice card (context preserved)
- Edited text as new user message
- `stageData` that looks mature (from the interrupted choice flow)
- NO `choiceInteractionEvent` (no enforcer, no choice context note)

The model sees mature `stageData` and is **likely to skip the choice card**, proceeding directly to draft/finalize. This is probabilistic model behavior — nothing in the code forces the skip, but mature stageData strongly signals "ready to finalize" to the model. The user likely loses their ability to choose a direction.

### No enforcer protection

The `[CHOICE][artifact-enforcer]` only activates when `choiceInteractionEvent` is present in the request body. Without it, the enforcer doesn't force the tool chain. The model is free to do whatever it interprets from the context.

## Root Cause

**`stageData` is not versioned with message history.** Deleting messages via `editAndTruncate` does NOT rollback the corresponding `stageData` changes. This creates an inconsistency: message history says "choice not yet made" but stageData says "choice data already saved."

## Impact

- **User loses agency** — likely can't re-select direction after edit/resend
- **Silent behavior change** — no error, no warning. Model just proceeds differently.
- **Global across all stages** — any edit/resend mid-draft (with or without choice card) is affected. This is intentional: edit/resend = "restart this stage from scratch" is a consistent, predictable behavior regardless of which message was edited.
- **Only affects incomplete stages** — if artifact was already created (`artifactId` exists), this doesn't apply (stage is in pending_validation or later)

## Scope Decision

The stageData reset fires on ANY edit/resend where `stageData[currentStage]` has fields but no `artifactId` — not just after choice card confirmation. This means:
- Edit/resend after choice confirmation → reset (primary use case)
- Edit/resend mid-draft discussion (no choice card involved) → also reset
- Edit/resend after artifact exists → NO reset (guard blocks)

This broader scope is an intentional design choice: "edit/resend = clean slate for current stage" is more consistent and predictable than scoping reset only to choice-card messages. A user who edits any message mid-stage expects a fresh start.

## stageStatus Compatibility

The reset clears stageData but does NOT reset `stageStatus`. This is safe because:
- The guard requires `!artifactId` → which means `submitStageForValidation` hasn't been called → `stageStatus` is still `"drafting"` (the only status before submission)
- The auto-rescue mechanism (stageStatus → "revision") only triggers when `stageStatus === "pending_validation"`, which requires a prior `submitStageForValidation` → which requires `artifactId` → which means our guard would have blocked the reset

If a future code path changes this assumption, the reset mutation logs `[PAPER][edit-resend-reset]` with the cleared fields, making it auditable.

## Solution Direction

Deterministic stageData reset: on edit/resend, if `stageData[currentStage]` exists but `artifactId` is absent, clear stageData for that stage (preserve `revisionCount` only). This removes the mature-data signal and makes the model start fresh — highly likely to present a choice card again for stages that use them, or restart discussion for stages that don't.

Note: the reset itself is deterministic (code guarantees stageData is cleared). The model's subsequent behavior (presenting choice card vs other) is probabilistic — but with empty stageData, the expected behavior is consistent with a fresh stage start.

See `implementation-plan.md` in this directory for the full implementation plan.
