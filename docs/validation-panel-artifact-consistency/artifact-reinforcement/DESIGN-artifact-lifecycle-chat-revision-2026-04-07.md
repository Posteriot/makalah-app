# Design: Artifact Lifecycle — Chat-Triggered Revision & Versioning Reinforcement

**Date:** 2026-04-07
**Branch:** `validation-panel-artifact-consistency`
**Status:** Approved design, pending implementation
**Reviewer:** Codex GPT 5.4 (post-implementation audit)

---

## 1. Problem Statement

Branch `validation-panel-artifact-consistency` successfully fixed the first-pass flow (choice card → artifact → validation panel). However, the fix introduced a regression: **chat-triggered artifact regeneration no longer works** when a stage already has an artifact.

Root causes identified through code audit:

1. **Backend lock too aggressive**: When `stageStatus === "pending_validation"`, all artifact tools (`updateStageData`, `createArtifact`, `updateArtifact`) are hard-blocked. No mechanism exists to transition out of this state via chat.
2. **Prompt contract has no chat-regeneration path**: The `pendingNote` instructs the model "do NOT call any stage tools" — completely blocking chat-triggered revision.
3. **No bridge**: When a user sends a chat message during `pending_validation` that clearly means "revise this", there is no mechanism to convert that into a `requestRevision` call.

This is not an outline-specific bug. It is a **cross-stage artifact lifecycle gap** affecting all 14 stages.

---

## 2. Design Approach: Hybrid — Prompt Intent + Backend Safety Net

### Principle

- **Prompt layer** (primary): Model detects revision intent from chat, explicitly calls `requestRevision` tool before proceeding with revision flow.
- **Backend layer** (safety net): If model fails to call `requestRevision` but directly calls an edit tool while `pending_validation`, backend auto-transitions to `revision` as a fallback — opening the gate only, not taking over the workflow.
- **Stale choice guard** (deterministic): Choice cards rejected unless `stageStatus === "drafting"`.

### Why hybrid

- Prompt-only (probabilistic) can miss intent → user stuck.
- Backend-only (deterministic) can over-trigger → false unlocks.
- Hybrid gives defense in depth: prompt as intelligence, backend as safety net.

---

## 3. State Machine & Transition Contract

### 3.1 Valid States and Transitions

```
drafting → pending_validation → approved → next stage (drafting)
              ↓         ↑
           revision ────┘ (via submitStageForValidation after revision)
```

- `revision → drafting` does NOT occur in the revision loop.
- `revision → drafting` only happens in non-revision contexts: `approveStage` (next stage starts at drafting) and `rewindToStage` (target stage reset to drafting).

### 3.2 Two Entry Paths to Revision

Both paths converge on the same contract:

| Entry Path | Trigger | Mechanism |
|------------|---------|-----------|
| **Panel-triggered** | User clicks "Revisi" in PaperValidationPanel | Frontend calls `requestRevision(sessionId, userId, feedback, trigger: "panel")` → status becomes `revision` |
| **Chat-triggered** | User sends chat with revision intent during `pending_validation` | **Primary**: Model detects intent → calls `requestRevision` tool (trigger: "model") → status becomes `revision` → proceeds with revision flow. **Fallback**: Model directly calls `updateStageData`/`updateArtifact` while still `pending_validation` → backend auto-triggers revision (trigger: "auto-rescue") → mutation proceeds |

After `requestRevision` (from any path), the revision chain is identical:

```
requestRevision
  → status: "revision", revisionCount++
  → updateStageData (only if structured stage data changed)
  → updateArtifact (revision content — full replacement if needed)
  → submitStageForValidation (SAME TURN as updateArtifact, mandatory)
  → status: "pending_validation"
```

### 3.3 Backend Auto-Revision Safety Net

**Scope**: Only activates when an edit tool is called — never from chat text alone.

| Tool | Auto-Revision when `pending_validation` | Condition |
|------|----------------------------------------|-----------|
| `updateStageData` | Yes | Always — first tool in revision chain |
| `updateArtifact` | Yes | Always — normal revision path |
| `createArtifact` | Conditional | Only if `stageData[currentStage].artifactId` is missing OR the referenced artifact is invalid/inaccessible in DB. If a valid artifact exists → **reject** with error. |

Auto-rescue behavior operates at **two layers** depending on the call chain:

**Layer 1: Backend mutation (for `updateStageData`):**
1. `updateStageData` mutation detects `pending_validation`
2. Auto-execute revision logic inline: `stageStatus = "revision"`, `revisionCount++`
3. Log `revision-auto-rescued-by-backend` with `source=updateStageData`
4. Proceed with original mutation

**Layer 2: Route level (for `updateArtifact` and `createArtifact`):**
1. Route tool handler detects `pending_validation` before calling `convex/artifacts.ts`
2. Calls `requestRevision` mutation explicitly (because `artifacts.update` has no `stageStatus` awareness — it writes to `paperSessions.stageData` directly via `db.patch`, bypassing `updateStageData` mutation)
3. Log `revision-auto-rescued-by-backend` with `source=updateArtifact` or `source=createArtifact`
4. Refresh `paperSession` reference, then proceed with artifact mutation

**In all cases**: Model still must continue with remaining steps (`submitStageForValidation`)

What does NOT trigger auto-revision:
- Chat messages without tool calls
- Read-only tools (`readArtifact`, `getCurrentPaperState`)
- Any non-edit operation

### 3.4 Stale Choice Guard

Choice cards are **only accepted when `stageStatus === "drafting"`**. All other states → deterministic reject.

```
In validateChoiceInteractionEvent():
  IF stageStatus !== "drafting":
    REJECT: "CHOICE_REJECTED_STALE_STATE"
    Log: "stale-choice-rejected" with { stage, stageStatus, sourceMessageId, submittedAt }
    User message: "Pilihan ini sudah tidak berlaku karena state draft sudah berubah.
                   Silakan gunakan chat atau panel validasi yang aktif."
```

### 3.5 `approved` State

Default: do not call edit tools. If in the future the product allows reopening approved stages for major revision, that must go through an explicit reopen mechanism designed separately. Out of scope for this session — but not written as impossible forever.

---

## 4. Tool Contract & Artifact Versioning

### 4.1 Three Flows — Unified for All 14 Stages

**Flow A: First Pass** (drafting, no artifact yet)
```
updateStageData → createArtifact → submitStageForValidation
```

**Flow B: Revision** (from panel or chat)
```
[requestRevision] → updateStageData (if structured data changed)
                  → updateArtifact → submitStageForValidation
```

**Flow C: Regeneration Total** (exceptional — artifact missing/invalid)
```
[requestRevision] → updateStageData (if structured data changed)
                  → createArtifact → submitStageForValidation
```

**Default for all regeneration**: Use `updateArtifact` with full content replacement. This preserves the version chain (`parentId` link intact). `createArtifact` during revision is truly exceptional — only when the previous artifact is missing or inaccessible in DB.

Prompt contract must state: "For total regeneration, use `updateArtifact` with new content. Do NOT use `createArtifact` unless the previous artifact is inaccessible."

### 4.2 Tool-Level Decision Tree

```
Model wants to write/modify artifact:

  1. Check stageStatus:
     ├─ "drafting" → proceed normally
     ├─ "revision" → proceed normally (already unlocked)
     ├─ "pending_validation" → call requestRevision first (primary path)
     │   └─ If forgotten → backend auto-rescue when tool is called
     └─ "approved" → do NOT call any edit tool (guarded stop)

  2. Check artifact exists in stageData[currentStage].artifactId:
     ├─ EXISTS and valid → updateArtifact (creates new version)
     ├─ EXISTS but invalid/missing in DB → createArtifact (exceptional fallback)
     └─ DOES NOT EXIST → createArtifact (first pass)

  3. After artifact tool completes → submitStageForValidation (SAME TURN, mandatory)
```

### 4.3 Artifact Versioning Status

**What already works** (verified from `convex/artifacts.ts` and `paper-mode-prompt.ts:220-237`):
- `updateArtifact` creates a new immutable record: `version: old+1`, `parentId: oldArtifactId`
- Auto-updates `stageData[currentStage].artifactId` to point to the new artifact ID
- Old artifact remains in DB, accessible via version chain
- `getVersionHistory` traverses `parentId` chain
- Stage N+1 reads stage N's artifact via `stageData[stageId].artifactId` → automatically gets the latest version

**What this design must verify at runtime** (not overclaimed as "safe"):
- Pointer `stageData.artifactId` to active artifact is correct by design and proven in the read path (`paper-mode-prompt.ts:220-237`)
- Still requires end-to-end runtime verification that all revision flows — including special flows (`daftar_pustaka`) and fallback paths (backend auto-rescue) — correctly maintain this pointer across all 14 stages

### 4.4 `requestRevision` as Model-Callable Tool

Currently `requestRevision` is only callable from frontend. This design exposes it as an AI tool in `paper-tools.ts`:

```
Tool: requestRevision
  Input:
    feedback: string    // user's revision intent from chat

  Pre-check:
    stageStatus MUST be "pending_validation"
    If not → return error "NOT_PENDING_VALIDATION"

  Execute:
    Call api.paperSessions.requestRevision mutation
    (trigger: "model" — set by tool wrapper, not by model input)

  Output:
    {
      stage: string,
      revisionCount: number,
      previousStatus: "pending_validation",
      currentStatus: "revision",
      trigger: "model",
      nextAction: "Proceed: updateArtifact → submitStageForValidation
                   (updateStageData only if structured data changed)"
    }

  Observability:
    Log "revision-triggered-by-model"
```

### 4.5 Special Cases per Stage Category

| Category | Stages | Special Flow | Exception Needed? |
|----------|--------|-------------|-------------------|
| **Discussion** | gagasan | No choice-driven finalize (not in `POST_CHOICE_FINALIZE_STAGES`) | No — follows standard Flow A/B/C |
| **Choice-driven** | topik, outline, abstrak, pendahuluan, tinjauan_literatur, metodologi, hasil, diskusi, kesimpulan, pembaruan_abstrak, lampiran, judul | Choice card → finalize → artifact | No — choice guard + standard flows |
| **Compile-first** | daftar_pustaka | `compileDaftarPustaka(persist)` required before artifact | Yes, limited |

**`daftar_pustaka` exception:**

Revision chain for daftar_pustaka:
```
[requestRevision] → compileDaftarPustaka(persist)
                  → updateStageData (if structured data changed)
                  → updateArtifact → submitStageForValidation
```

This is the **only verified exception**. All other stages follow the standard contract.

---

## 5. Prompt Contract Changes

### 5.1 `pendingNote` — Rewrite

**Old** (too restrictive):
```
⏳ AWAITING VALIDATION: Do NOT call updateStageData, createArtifact,
updateArtifact, or submitStageForValidation again unless user explicitly
requests revision and stage is reopened.
```

**New**:
```
⏳ AWAITING VALIDATION: Draft for [stageName] has been submitted.

IF user asks a question or wants discussion:
  → Answer normally. Do NOT call any stage tools.

IF user requests revision, correction, edit, regeneration, or sends
instructions that clearly mean "change the artifact":
  → Call requestRevision(feedback: "<user's revision intent>") FIRST.
  → After status transitions to "revision", proceed:
    1. updateStageData (only if structured data changed)
    2. updateArtifact (with revised content — full replacement if needed)
    3. submitStageForValidation
  → Complete steps 2-3 in the SAME TURN. Do not stop after updateArtifact.

Do NOT call updateStageData, createArtifact, or updateArtifact
while status is still pending_validation. Call requestRevision first.
```

### 5.2 `revisionNote` — Rewrite

**New**:
```
⚠️ REVISION MODE: User requested changes. Pay attention to feedback.

Tool sequence:
  1. updateStageData — only if structured stage data changed
  2. updateArtifact — use this for ALL revisions including full content replacement.
     Do NOT use createArtifact unless artifact is missing/inaccessible in DB.
  3. submitStageForValidation — SAME TURN as updateArtifact. Do not stop early.

For daftar_pustaka: compileDaftarPustaka(persist) before step 1.
```

### 5.3 Revision Intent Detection — New Instruction

Added to `paper-mode-prompt.ts` as part of pending state context:

```
REVISION INTENT DETECTION:
Priority: semantic intent — "user wants to change the artifact content".

Strong signal examples (not exhaustive):
  - "revisi", "edit", "ubah", "ganti", "perbaiki", "resend", "generate ulang",
    "tulis ulang", "koreksi", "buat ulang", "ulangi", "dari awal"
  - Specific corrections: "paragraf kedua harus...", "tambahkan...", "hapus bagian..."

These keywords are examples only. The primary criterion is whether the user's
semantic intent is to change the artifact content.

NOT revision intent:
  - Questions about content, discussion, status inquiry

When uncertain: ask ONLY if the difference between "discuss" vs "revise" is
truly material and ambiguous. If the user gives concrete change instructions,
treat as revision intent without asking. Bias toward action.
```

### 5.4 Choice Context Note

`buildChoiceContextNote()` already uses `hasExistingArtifact` flag to differentiate `createArtifact` vs `updateArtifact`. **No changes needed** — the stale choice guard (Section 3.4) ensures choices only arrive during `drafting`, so the flag is always accurate.

---

## 6. Observability

### 6.1 Events

| Event ID | Trigger | Layer | Severity |
|----------|---------|-------|----------|
| `revision-triggered-by-panel` | Frontend calls `requestRevision` via PaperValidationPanel | Backend mutation | info |
| `revision-triggered-by-model` | Model calls `requestRevision` tool | Route (tool execution) | info |
| `revision-auto-rescued-by-backend` | Model calls edit tool while `pending_validation` → backend auto-triggers revision | Backend mutation | warn |
| `stale-choice-rejected` | Choice card rejected because `stageStatus !== "drafting"` | Route (choice validation) | warn |
| `create-artifact-blocked-valid-exists` | `createArtifact` rejected during pending/revision because valid artifact exists | Route/Backend | warn |
| `create-artifact-fallback-no-valid` | `createArtifact` allowed during pending/revision because artifact missing/invalid | Backend mutation | info (expected fallback) or warn (unexpected state) — context-dependent |
| `revision-intent-answered-without-tools` | Model responds to what appears to be revision intent with prose only, no tool calls | Route (post-response audit) | warn |

### 6.2 `requestRevision` Mutation — Trigger Parameter

```
requestRevision mutation args:
  sessionId: Id<"paperSessions">
  userId: Id<"users">
  feedback: string
  trigger: "panel" | "model"    // caller-provided, only these two values accepted
```

- Panel calls with `trigger: "panel"`
- Model tool calls with `trigger: "model"` (set by tool wrapper, not model input)
- Auto-rescue uses a **separate mutation** `autoRescueRevision` which hardcodes `trigger: "auto-rescue"` internally — never accepted from caller input. This mutation is called by **route-level callers only** (`updateArtifact` and `createArtifact` handlers in `route.ts`).
- `updateStageData` backend mutation performs equivalent inline revision logic within its own DB transaction (not via `autoRescueRevision`) for same-transaction consistency. Both paths log the identical event `revision-auto-rescued-by-backend` with `trigger=auto-rescue`.
- `requestRevision` is **never** used for auto-rescue. `requestRevision` (panel/model) and `autoRescueRevision` (route-level rescue) have distinct trust boundaries.

### 6.3 Auto-Rescue Ratio as Health Metric

If `revision-auto-rescued-by-backend` fires too often relative to `revision-triggered-by-model`, the prompt contract is not working.

- Healthy: auto-rescue < 20% of total model-path revisions
- Investigate: 20-50%
- Prompt contract failure: > 50%

This is a manual audit metric, not runtime enforcement.

---

## 7. Verification Plan

### 7.1 Evidence per Stage — Three Flows

For each verified stage, minimum 3 flows must be proven:

| Flow | Required Evidence |
|------|-------------------|
| **First pass** (A) | Tool chain log: `updateStageData → createArtifact → submitStageForValidation`. Backend: `stageStatus` transits to `pending_validation`. UI: validation panel appears. |
| **Chat-triggered revision** (B/C) | User sends revision chat while pending → tool chain: `requestRevision → updateStageData (if needed) → updateArtifact → submitStageForValidation`. Backend: `pending_validation → revision → pending_validation`. Artifact: version increments (v1 → v2). `stageData.artifactId` points to v2. |
| **Panel-triggered revision** (D) | User clicks "Revisi" in panel → identical tool chain, backend state, and artifact version behavior as chat-triggered. |

### 7.2 Blocker Evidence — Artifact Active Version Propagation

**This is the single most important verification item.** It touches the core of what the user requested: artifact versioning as source of truth.

> After revising stage N (artifact goes from v1 to v2), approve stage N, advance to stage N+1 → context for stage N+1 MUST contain content from artifact v2 (not v1).

This must be proven for at least P0 and P1 stages before any completion claim.

### 7.3 Global Checks

| Check | Required Evidence |
|-------|-------------------|
| Stale choice rejected | Submit choice while `pending_validation` → log `stale-choice-rejected`, user sees "pilihan tidak berlaku" message |
| `createArtifact` blocked during revision | Trigger `createArtifact` while valid artifact exists + status revision → log `create-artifact-blocked-valid-exists` |
| Auto-rescue | Model calls `updateStageData` while pending without `requestRevision` → log `revision-auto-rescued-by-backend`, flow continues normally |
| Artifact active version propagation | (See 7.2 — blocker) |

### 7.4 Stage Priority

| Priority | Stages | Rationale |
|----------|--------|-----------|
| **P0** | outline, daftar_pustaka | Original symptom stage + only exception (compile step) |
| **P1** | gagasan, judul, hasil | Simplest flow + finalization with choice + choice with parameter |
| **P2** | Remaining 9 stages | Sampling: 2-3 representative stages after P0+P1 proven |

### 7.5 Completion Claim

**Implementation is universal**: All code changes (backend safety net, prompt contract, stale choice guard, observability) are designed to apply to all 14 stages through shared layers — not per-stage conditionals. Stage-specific exceptions (only `daftar_pustaka` compile step) are explicitly documented.

**Verification is sampling-based**: Runtime verification uses P0/P1/P2 priority tiers. This is a practical verification strategy, not a scope limitation on implementation.

- P0 + P1 + P2 sampling + global checks + blocker evidence = **"design and implementation validated on representative stages"**
- This is NOT a claim that all 14 stages are exhaustively runtime-verified. P2 stages are sampling-based.
- To claim full cross-stage runtime verification, every stage would need at least one runtime proof per flow category — or explicit acceptance that P2 is sampling only.

**Minimum scenario count:**
- P0: 3 flows × 2 stages = 6
- P1: 3 flows × 3 stages = 9
- P2: 3 flows × 2-3 sampled stages = 6-9
- Global checks: 4
- Blocker evidence: 1+ (at least one stage transition with version propagation)
- **Total: ~26-29 scenarios with evidence**

---

## 8. Interaction Diagram — All Paths

```
USER ACTION                    MODEL BEHAVIOR                    BACKEND STATE
─────────────────────────────────────────────────────────────────────────────

[A] Choice card (drafting)
  User selects option       → buildChoiceContextNote()           drafting
                            → updateStageData                    drafting
                            → create/updateArtifact              drafting
                            → submitStageForValidation           → pending_validation

[B] Chat revision (pending, primary path)
  User: "ganti paragraf 2"  → detect revision intent             pending_validation
                            → requestRevision(feedback)          → revision
                            → updateStageData (if needed)        revision
                            → updateArtifact                     revision
                            → submitStageForValidation           → pending_validation

[C] Chat revision (pending, model forgets requestRevision)
  User: "ganti paragraf 2"  → model calls updateStageData        pending_validation
                            → backend auto-rescue:               → revision (auto)
                              opens gate ONLY
                            → updateStageData proceeds           revision
                            → model STILL MUST continue:
                              updateArtifact                     revision
                              submitStageForValidation           → pending_validation

[D] Panel revision
  User clicks "Revisi"      → frontend: requestRevision()        → revision
  + sends feedback          → feedback message sent to AI
                            → AI uses SAME revision chain:
                              updateStageData (if needed)        revision
                              updateArtifact                     revision
                              submitStageForValidation           → pending_validation

[E] Chat discussion (pending)
  User: "kenapa begini?"    → answer normally, no tool calls     pending_validation
                                                                 (unchanged)

[F] Stale choice (non-drafting)
  User clicks old card      → validateChoiceInteractionEvent()   any non-drafting
                            → REJECT: CHOICE_REJECTED_STALE     (unchanged)
                            → user sees rejection message
```

---

## 9. Files to Modify

| File | Changes |
|------|---------|
| `src/lib/ai/paper-mode-prompt.ts` | Rewrite `pendingNote`, `revisionNote`. Add revision intent detection instruction. |
| `convex/paperSessions.ts` | `updateStageData`: replace hard-block with auto-revision safety net. `requestRevision`: add `trigger` parameter. |
| `src/app/api/chat/route.ts` | `createArtifact`/`updateArtifact`: replace hard-block with delegation to backend auto-revision. Add `createArtifact` guard (block if valid artifact exists during revision). Add observability events. |
| `src/lib/ai/paper-tools.ts` | Expose `requestRevision` as model-callable tool. Enrich output schema. |
| `src/lib/chat/choice-request.ts` | Add stale choice guard: reject if `stageStatus !== "drafting"`. |
| `src/components/chat/ChatWindow.tsx` | Update `handleRevise` to pass `trigger: "panel"` when calling `requestRevision` mutation. |
| `src/lib/ai/stage-skill-resolver.ts` | No changes needed — skill instructions already correct. |
| `src/lib/ai/paper-stages/finalization.ts` | No changes needed — `daftar_pustaka` compile step already exists. |

### Test files to update/add:

| File | Changes |
|------|---------|
| `convex/paperSessions.test.ts` | Test auto-revision safety net. Test `requestRevision` trigger parameter. |
| `src/lib/chat/__tests__/choice-request.test.ts` | Test stale choice guard for all non-drafting states. |
| `src/lib/ai/stage-skill-resolver.test.ts` | No changes expected. |
| `src/lib/ai/stage-skill-validator.test.ts` | No changes expected. |
| New: route-level integration tests | Test chat-triggered revision flow end-to-end. Test `createArtifact` guard during revision. |

---

## 10. Constraints & Non-Goals

### Constraints (from user):
1. Auto-revision fallback only activates on edit tool calls, never from chat text alone
2. Discussion/questions during pending do not trigger revision
3. Observability must distinguish: panel / model / auto-rescue / stale-reject
4. Pattern applies to all 14 stages; exceptions must be proven and documented
5. Panel and chat converge on the same artifact versioning contract

### Non-goals for this session:
- Reopening approved stages (future mechanism, out of scope)
- Artifact version rollback (revert to v1 from v2)
- Artifact diff/comparison UI
- Revision feedback persistence in DB (feedback is ephemeral in chat context)
- Version conflict detection (concurrent edits)
