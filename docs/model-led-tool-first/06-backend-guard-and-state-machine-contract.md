# Backend Guard and State Machine Contract

## Purpose

This document defines what must remain hard and deterministic in the backend even after the runtime becomes more model-led and tool-first.

The guiding rule is simple:

- model chooses
- backend decides legality
- harness records and verifies

## Why This Contract Matters

Without hard backend contracts:

- model-led becomes fragile
- tool-first becomes chaos
- prompt quality becomes the hidden state machine
- debugging becomes harder, not easier

Makalahapp cannot allow that because paper workflow is stateful and approval-sensitive.

## Core State Domains

### Paper session lifecycle

Key concepts:

- `currentStage`
- `stageStatus`
- `stageData`
- `paperMemoryDigest`
- artifact references and validity

### Validation lifecycle

Key concepts:

- drafting
- pending validation
- revision
- approved
- completed

### Run lifecycle

Key concepts:

- running
- paused
- completed
- failed

Note:

- run lifecycle belongs to the harness
- paper session lifecycle belongs to the domain backend

## Non-Negotiable Backend Responsibilities

### 1. Legal transition enforcement

Examples:

- `requestRevision` only when current status is `pending_validation`
- `rewindToStage` only for legal earlier stages
- `submitStageForValidation` only when required data and artifact conditions are met
- `cancelChoiceDecision` only when current session context allows cancellation semantics

### 2. Artifact legality

Examples:

- whether `createArtifact` or `updateArtifact` is legal in the current state
- whether existing artifacts are valid or invalidated
- whether an artifact version rollback is allowed

### 3. Required-field enforcement

Examples:

- stage-required fields before validation
- bibliography persistence mode only in legal stages

### 4. Ownership and authorization

Examples:

- user must own session
- user must own conversation
- mutation caller must match allowed domain identity

### 5. Clear error signaling

The backend should reject illegal actions clearly enough that the model can correct course.

Preferred error shape characteristics:

- explicit illegal condition
- explicit expected condition
- ideally an implied or suggested next valid action

## Guard Placement Rules

### Put in backend

- lifecycle legality
- mutation authorization
- stage transition legality
- required fields
- artifact validity
- rewind legality
- revision legality

### Do not rely on prompt for

- transition legality
- approval legality
- artifact legality
- rewind legality

### Do not rely on policy for

- revision sequencing
- artifact sequencing
- forced same-turn domain choreography

## Auto-Rescue Position

Current posture:

- backend and harness both perform rescue-like behaviors around revision transitions

Target posture:

- remove harness-level silent rescue
- minimize backend rescue
- if backend rescue remains temporarily, surface it explicitly in tool results and logs

Best recommendation:

- long term, illegal actions should return clear failures instead of being silently converted into legal ones

## Suggested `getStageCapabilities` Contract

This read tool should be backed by backend-derived legality, not by prompt prose.

Suggested output:

```json
{
  "stage": "metodologi",
  "stageStatus": "drafting",
  "allowedActions": [
    "updateStageData",
    "createArtifact",
    "submitStageForValidation",
    "searchReferences"
  ],
  "blockedActions": [
    {
      "action": "requestRevision",
      "reason": "Only allowed when stageStatus is pending_validation"
    }
  ],
  "requiresArtifactBeforeValidation": true
}
```

This makes backend legality visible to the model without giving up deterministic enforcement.

## Verification Relationship

Verification does not replace backend guards.

Instead:

- backend guards prevent illegal mutations
- verification checks whether the step achieved a complete and acceptable outcome

Example:

- backend may allow `updateStageData`
- verification may still say the step is incomplete because artifact creation or validation was not completed

That is correct separation of concerns.

## Best Recommendation

The backend state machine should remain strict.

The architectural change is not to loosen legality.

The change is to stop hiding domain behavior in the harness and instead expose legal actions clearly through tools backed by hard backend contracts.
