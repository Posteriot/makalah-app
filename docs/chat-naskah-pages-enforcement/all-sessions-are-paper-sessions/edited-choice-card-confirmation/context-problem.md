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

### Model skips choice card

On step 6, the model receives:
- Message history with original prompt + choice card (context preserved)
- Edited text as new user message
- `stageData` that looks mature (from the interrupted choice flow)
- NO `choiceInteractionEvent` (no enforcer, no choice context note)

The model sees mature `stageData` and decides to **skip the choice card**, proceeding directly to draft/finalize. The user loses their ability to choose a direction.

### No enforcer protection

The `[CHOICE][artifact-enforcer]` only activates when `choiceInteractionEvent` is present in the request body. Without it, the enforcer doesn't force the tool chain. The model is free to do whatever it interprets from the context — which, given mature stageData, is likely "skip choice, finalize."

## Root Cause

**`stageData` is not versioned with message history.** Deleting messages via `editAndTruncate` does NOT rollback the corresponding `stageData` changes. This creates an inconsistency: message history says "choice not yet made" but stageData says "choice data already saved."

## Impact

- **User loses agency** — can't re-select direction after edit/resend
- **Silent behavior change** — no error, no warning. Model just proceeds differently.
- **Global across all stages** — any stage with choice card → finalize flow is affected
- **Only affects interrupted choice flows** — if artifact was already created, this doesn't apply (stage is in pending_validation or later)

## Solution Direction

Deterministic reset: on edit/resend, if `stageData[currentStage]` exists but `artifactId` is absent, clear stageData for that stage (preserve `revisionCount` only). This forces the model to present a fresh choice card.

See `implementation-plan.md` in this directory for the full implementation plan.
