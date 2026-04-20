# Cancel Decision — Design Document

**Date:** 2026-04-17
**Branch:** `agent-harness`
**Supersedes:** `docs/chat-naskah-pages-enforcement/all-sessions-are-paper-sessions/edited-choice-card-confirmation/` and `docs/chat-naskah-pages-enforcement/all-sessions-are-paper-sessions/edited-validation-panel/`

---

## 1. Context

Makalah App is a guided academic paper writing tool. Users progress through 14 stages (gagasan → judul), each with a workflow:

1. **Discussion turn** — user and model discuss; model emits a **choice card** (interactive UI rendered from `jsonRendererChoice` spec in the assistant message)
2. **Choice submission** — user clicks an option + submit → system creates a synthetic user message `[Choice: stage]` with a `ChoiceInteractionEvent` payload → triggers model to finalize (updateStageData → createArtifact → submitStageForValidation)
3. **Validation panel** — appears when `stageStatus === "pending_validation"`. User either:
   - **Approves** → synthetic message `[Approved: stage]` → `approveStage` mutation → stage advances
   - **Revises** → synthetic message `[Revisi untuk stage]` → `requestRevision` mutation → model regenerates

These synthetic messages (`[Choice:]`, `[Approved:]`, `[Revisi untuk]`) are `role: "user"` messages created programmatically by the system, not typed by the user.

### Prior Art

Two design documents (2026-04-14) identified the problem of edit+resend on synthetic messages:

- **`edited-choice-card-confirmation/`** — Implemented `resetStageDataForEditResend` mutation. Clears stageData when no artifact exists yet. **Status: DEPLOYED.**
- **`edited-validation-panel/`** — Proposed expanding the reset to handle artifacts (Scenario A) and auto-rewind on approval edit (Scenario B). **Status: NOT IMPLEMENTED.** Both scenarios were deferred to post-E2E testing.

This design supersedes both documents with a different approach: replace edit+resend on synthetic messages with an explicit "Batalkan" (Cancel) action.

---

## 2. Problem

### 2.1 Edit+resend is the wrong abstraction for system-generated decisions

Synthetic messages are not user-authored text. They are machine-generated records of user decisions. Treating them as editable text creates fundamental problems:

| Problem | Impact |
|---------|--------|
| **Lost interaction payload** | `ChoiceInteractionEvent` is a one-shot request body payload. Edit+resend creates a plain text message without this payload → no `buildChoiceContextNote`, no enforcer, no workflow resolution |
| **Stale Convex state** | `editAndTruncateConversation` deletes messages but does NOT rollback stageData, artifacts, or stageStatus. State diverges from message history |
| **Wasted inference** | Edit+resend always triggers a new AI turn, even when the user just wants to re-pick from the same choice card |
| **Confusing UX** | User sees an edit textarea pre-filled with `[Choice: gagasan]\nPilihan: fokus-aspek-x` — this is not meaningful editable content |

### 2.2 Three unhandled scenarios

```
Synthetic message edit+resend scenarios:
├── [Choice:] no artifact yet ─── HANDLED (resetStageDataForEditResend)
├── [Choice:] artifact exists, not approved ─── NOT HANDLED (Scenario A)
├── [Approved:] stage advanced ─── NOT HANDLED (Scenario B)
└── [Revisi untuk:] revision in progress ─── NOT HANDLED
```

### 2.3 Root cause

**Convex state (stageData, artifacts, stageStatus, stage transitions) is not versioned with message history.** `editAndTruncateConversation` only deletes messages — it does not rollback any paper session state. The prior fix (`resetStageDataForEditResend`) patches this partially, but only for the no-artifact case.

---

## 3. Solution: Replace Edit+Resend with "Batalkan" (Cancel)

### 3.1 Core principle

Remove edit+resend from synthetic messages entirely. Replace with a "Batalkan" button that performs a **targeted state revert** — undoing the specific decision and its consequences, then allowing the user to make a new decision from the original UI.

### 3.2 Why "Batalkan" is better than smarter edit+resend

| Aspect | Smarter edit+resend (old approach) | Batalkan (new approach) |
|--------|-----------------------------------|------------------------|
| AI turn | Always triggers new inference | Choice card: NO inference needed (user re-picks from existing card). Validation: depends on scenario |
| State cleanup | Reactive — clean up after the fact | Proactive — revert state to pre-decision point |
| User model | "I'm editing text I didn't write" | "I'm canceling a decision I made" |
| Complexity | Must handle arbitrary edited text + re-inject interaction payload | Fixed revert operation — deterministic |

### 3.3 Key architectural insight: choice card submission state is client-side

Choice card submission is tracked in `submittedChoiceKeys` (a React `useState<Set<string>>`), NOT in the persisted spec. The spec in `jsonRendererChoice` is never mutated on submission.

On page refresh, `submittedChoiceKeys` is rehydrated by scanning history for `[Choice:]` user messages and walking backwards to find the matching assistant message.

**Implication:** To un-submit a choice card, we only need to:
1. Delete the synthetic `[Choice:]` message from Convex
2. Remove the key from `submittedChoiceKeys`
3. The spec is untouched → card re-renders as interactive automatically

No Convex `jsonRendererChoice` field patching required.

---

## 4. Detailed Design

### 4.1 UI: "Batalkan" button on synthetic messages

In `MessageBubble.tsx`, synthetic messages (detected by `parseAutoUserAction`) currently show an edit icon. Replace with a "Batalkan" button.

**Detection:** `parseAutoUserAction` already classifies messages into `kind: "choice" | "approved" | "revision"`. Use this to determine which cancel handler to invoke.

**Visibility rules:**

| Synthetic kind | Show "Batalkan" when | Hide when |
|----------------|---------------------|-----------|
| `choice` | Message is in the **active stage** AND is the **last** choice submission | Stage has been approved (validated), or streaming |
| `approved` | The approval is for the **current previous stage** (user just approved, stage just advanced). Additionally: UX throttle hides button for 30 seconds after message creation (see section 5.5.3) | More than 1 stage has passed since approval, or message age < 30 seconds, or `createdAt` absent (optimistic), or streaming |
| `revision` | **Not shown in V1** (deferred — see section 4.4) | Always hidden in V1 |

**Streaming guard:** All "Batalkan" buttons disabled when `status === "streaming"`.

### 4.2 Cancel Choice Card (`kind: "choice"`)

**What happens:**

```
User clicks "Batalkan" on [Choice: stage] message
  │
  ├─ 1. Call cancelChoiceDecision mutation (new Convex mutation)
  │     ├─ If stageStatus === "pending_validation" → revert to "drafting"
  │     ├─ If stageData has artifactId → invalidate artifact (set invalidatedAt)
  │     ├─ Clear stageData for stage (preserve revisionCount)
  │     └─ Return { stage, artifactInvalidated, statusReverted }
  │
  ├─ 2. Delete synthetic message + all subsequent from Convex
  │     └─ Reuse editAndTruncateConversation (target = synthetic message ID)
  │
  ├─ 3. Truncate local messages
  │     └─ setMessages(messages.slice(0, syntheticMsgIndex))
  │
  ├─ 4. Remove from submittedChoiceKeys (both sets per section 5.5.1)
  │     └─ Find assistant message above → remove key from both persistedChoiceKeys and optimisticPendingKeys
  │
  └─ 5. Choice card re-renders as interactive
        └─ No spec patch needed — card renders from unchanged jsonRendererChoice
```

**No AI turn triggered.** The user simply picks again from the re-activated choice card.

**Fallback handling:** The choice card spec (primary or deterministic-fallback) is stored in the assistant message's `jsonRendererChoice` field. This field is NEVER modified by cancel — the card re-renders from the exact same spec it was originally saved with. All guarantees preserved:
- Pre-selected recommended option (from `state.selection.selectedOptionId`)
- Toggle/uncheck via component-level `store.set()` (backward compatible)
- Submit button enabled/disabled from state context

### 4.3 Cancel Approval (`kind: "approved"`)

**What happens:**

```
User clicks "Batalkan" on [Approved: stage] message
  │
  ├─ 1. Call unapproveStage mutation (new Convex mutation)
  │     ├─ Validate: post-approval state (stageStatus="drafting" OR currentStage="completed" + stageStatus="approved")
  │     ├─ Derive targetStage: if completed → last STAGE_ORDER entry ("judul"); otherwise → getPreviousStage(currentStage)
  │     ├─ Revert currentStage to targetStage
  │     ├─ Set stageStatus to "pending_validation"
  │     ├─ Remove validatedAt from stageData[targetStage]
  │     ├─ Mark last digest entry as superseded (consistent with rewindToStage pattern)
  │     ├─ Remove last entry from stageMessageBoundaries (boundary is invalid — stage reopened)
  │     ├─ Re-add "Draf " prefix to artifact title only if titleStrippedOnApproval flag is set
  │     ├─ If targetStage === "judul": clear paperTitle and workingTitle
  │     ├─ Rebuild naskahSnapshot
  │     └─ Revert completedAt if was set (judul → completed case)
  │
  ├─ 2. Delete synthetic message + all subsequent from Convex
  │     └─ Reuse editAndTruncateConversation
  │
  ├─ 3. Truncate local messages
  │     └─ setMessages(messages.slice(0, approvedMsgIndex))
  │
  └─ 4. Validation panel auto-reappears
        └─ Convex reactivity: stageStatus === "pending_validation" → panel renders
```

**Scope guard:** Only allowed when the approved stage is exactly 1 stage behind `currentStage`. Multi-stage un-approval is not supported — user must use Rewind from the timeline for deeper rollbacks.

**Stage identification:** `unapproveStage` does NOT parse `targetStage` from the synthetic message text (which only contains display labels like "Gagasan Paper", not canonical IDs). Instead, it derives `targetStage = getPreviousStage(paperSession.currentStage)` from Convex session state. The synthetic message kind ("approved") is only used to determine which cancel handler to invoke on the client.

### 4.4 Cancel Revision (`kind: "revision"`) — DEFERRED (not in V1 scope)

**Status:** Dropped from V1 scope after Codex audit round 2 identified a fundamental timing problem.

**Why it's not feasible without new infrastructure:**

The timing window for safe cancel revision is effectively zero. Tool calls execute server-side mutations **during streaming**, not after:
- `updateStageData` auto-rescue patches stageData inline (`convex/paperSessions.ts:780`)
- `createArtifact` creates artifact + links to stageData mid-turn (`build-tool-registry.ts:259,273`)
- `updateArtifact` mutates artifact content mid-turn (`build-tool-registry.ts:453`)

Client-side `stop()` only halts the local stream — it does NOT cancel or rollback server-side mutations already in-flight (`ChatWindow.tsx:2091`). By the time a "Batalkan" button could be rendered on the synthetic `[Revisi untuk]` message, the model may have already written to stageData and/or the artifact.

**What would be needed (future work):**
1. **stageData snapshot** — save `stageData[currentStage]` at `requestRevision` time, restore on cancel
2. **Artifact versioning** — ability to rollback artifact to pre-revision version
3. **Server-side write lock** — track `revisionWriteStartedAt` when first tool call fires during revision, hard-block `cancelRevision` after that point

**Current alternative:** Users can effectively "cancel" a revision by approving the result (if acceptable) or requesting another revision with corrective feedback. The validation panel always reappears after the revision turn completes.

---

## 5. New Convex Mutations

### 5.1 `cancelChoiceDecision`

```
Args: { sessionId, userId }
Guard: session owner, currentStage is valid
Logic:
  - Increment decisionEpoch (invalidates any in-flight chain-completion/rescue)
  - If stageStatus === "pending_validation" → set "drafting"
  - If stageData[currentStage].artifactId exists → patch artifact with invalidatedAt
  - Clear stageData[currentStage] (preserve revisionCount only)
  - Log: [PAPER][cancel-choice] stage=X artifactInvalidated=bool statusReverted=bool epoch=N
```

### 5.2 `unapproveStage`

```
Args: { sessionId, userId }
Guard: session owner
Guard: one of two valid post-approval states:
  (a) stageStatus === "drafting" — normal approval (e.g. gagasan → topik)
  (b) currentStage === "completed" && stageStatus === "approved" — final approval (judul → completed)
Derive: targetStage =
  - If currentStage === "completed": last entry in STAGE_ORDER ("judul")
    (getPreviousStage does not accept "completed" — explicit handling needed)
  - Otherwise: getPreviousStage(currentStage)
Guard: targetStage exists (not null), stageData[targetStage] has validatedAt
Logic:
  - Save nextStageToClear = session.currentStage (BEFORE revert — this is the stage opened after approval)
  - Set currentStage = targetStage
  - Set stageStatus = "pending_validation"
  - Remove validatedAt from stageData[targetStage]
  - Mark last paperMemoryDigest entry as superseded (verify stage matches targetStage)
    (uses superseded pattern, consistent with rewindToStage — NOT pop/delete)
  - Remove last entry from stageMessageBoundaries (verify stage matches targetStage)
    (boundary is invalid because stage is reopened — unlike rewind which skips this)
  - Re-add "Draf " prefix to artifact title ONLY if approveStage stripped it
    (approveStage only strips when title matches /^draf(?:t)?\b/i — see convex/paperSessions.ts:1262)
    Detection: store `titleStrippedOnApproval: true` flag in stageData during approveStage.
    unapproveStage reads this flag. If true → prepend "Draf ". If false/absent → skip.
    This requires a small addition to approveStage (store flag before stripping).
  - Clear stageData[nextStageToClear] (NOT stageData[currentStage] — currentStage already reverted at this point. nextStageToClear is the stage opened after approval, which may have _plan or draft fields from model's post-approval response)
  - If targetStage === "judul":
    - Clear paperTitle (set to undefined)
    - Clear workingTitle (set to undefined)
    - Clear completedAt (set to undefined)
  - Rebuild naskahSnapshot
  - Log: [PAPER][unapprove] stage=X clearedNextStage=bool
```

**Note on targetStage derivation:** The mutation does NOT accept targetStage as an argument. It derives targetStage internally: if `currentStage === "completed"`, use the last entry in STAGE_ORDER (`"judul"`); otherwise use `getPreviousStage(currentStage)`. This avoids the problem of synthetic messages storing display labels ("Gagasan Paper") instead of canonical stage IDs ("gagasan"). The client only needs to know the message kind is "approved" — the mutation handles the rest.

**Digest pattern justification:** `rewindToStage` marks digest entries as `superseded` (soft-mark, preserves history). `unapproveStage` follows the same pattern for consistency. `stageMessageBoundaries` IS removed (not marked) because the boundary for a reopened stage is invalid — there is no "old boundary" to preserve. This is a semantic difference from rewind, which operates across multiple stages and does not touch boundaries.

### 5.3 `stampDecisionEpoch`

```
Args: { sessionId }
Guard: session exists (owner check via requirePaperSessionOwner)
Logic:
  - Increment decisionEpoch (or initialize to 1 if undefined)
  - Return { epoch: newValue }
  - Log: [PAPER][stamp-epoch] stage=X epoch=N
```

**When called:** At the start of server-side request processing in `accept-chat-request.ts`, ONLY when `choiceInteractionEvent` is present in the request body. Regular user messages do not stamp. The returned `myEpoch` value is carried through the request lifecycle and passed to `build-on-finish-handler.ts` config for chain-completion/rescue epoch checks.

### 5.4 `cancelRevision` — DEFERRED

Not in V1 scope. See section 4.4 for rationale.

### 5.5 Client State Fixes (required for correctness)

**5.5.1 `submittedChoiceKeys` — two-set approach (persisted + optimistic)**

Current code (`ChatWindow.tsx:1648-1669`) is additive-only: scans historyMessages, adds keys, never removes. After cancel, stale Convex subscription snapshots may re-add the key before the truncated snapshot arrives.

A naive full-derive (replace entire Set from historyMessages) would break optimistic submit: when user clicks a choice, the key is added immediately (`handleChoiceSubmit` line 1348) but historyMessages won't contain the `[Choice:]` message until Convex persistence confirms. A full-derive at that moment would wipe the optimistic key and re-activate the card mid-turn.

Fix: Split into two sets:

```
persistedChoiceKeys    — full-derived from historyMessages (replace on each update)
optimisticPendingKeys  — added on submit, removed when historyMessages confirms OR cancel succeeds

isSubmitted = persistedChoiceKeys.has(key) || optimisticPendingKeys.has(key)
```

The optimistic set bridges the gap between user action and Convex persistence. On cancel, remove from BOTH sets. On historyMessages update, migrate confirmed keys from optimistic to persisted (remove from optimistic once persisted contains the key).

**5.5.2 `optimisticPendingValidation` — clear on cancel**

Current code clears this flag only when Convex subscription confirms `pending_validation` or streaming starts. After `cancelChoiceDecision` reverts stageStatus from `pending_validation` to `drafting`, the optimistic flag may still be `true` → phantom validation panel.

Fix: All cancel handlers that revert stageStatus away from `pending_validation` must explicitly call `setOptimisticPendingValidation(false)`.

**5.5.3 Harness run guard for cancel approval**

`handleApprove` calls `resolveAndResume()` before `approveStage()` (`ChatWindow.tsx:2297`). If user cancels approval after harness run was resumed, the run continues in background producing side effects.

The `pausedHarnessRun` query filters for `statusFilter: "paused"` — once resumed, it returns null. There is no `lastResumedAt` timestamp exposed by the hook.

Fix: Apply a time-based **UX throttle** (not a correctness guarantee) using the `[Approved:]` message's own `createdAt` timestamp. If `Date.now() - message.createdAt < 30_000`, hide the Batalkan button. Client-only — no backend field needed.

**Important caveats:**
- This is a UX throttle to prevent accidental cancel, not a safety guarantee. Harness runs could exceed 30 seconds.
- When `createdAt` is not yet available (optimistic message before Convex persistence), default to **hide** (safe default).
- Future improvement: if harness run lifecycle proves problematic, add a dedicated `lastResumedAt` or run-completion signal. For V1, the throttle covers the common case.

**5.5.4 Chain-completion race guard — `decisionEpoch`**

Chain-completion in `build-on-finish-handler.ts:593-646` runs async in onFinish AFTER the client stream closes. The client may show status="ready" (Batalkan visible) while chain-completion is still creating artifacts server-side.

Race scenario:
1. User submits choice → model runs → calls `updateStageData` but abandons chain
2. Client stream ends → status="ready" → Batalkan visible
3. User clicks Batalkan → `cancelChoiceDecision` clears stageData, reverts stageStatus
4. Server onFinish still running → chain-completion creates artifact → links artifactId → calls submitForValidation
5. Result: stageStatus="pending_validation" + artifact exists + choice card interactive → BROKEN STATE

`submitForValidation` does NOT guard on stageStatus — it only checks artifactId existence. So chain-completion succeeds even after cancel.

Fix: Add `decisionEpoch: v.optional(v.number())` to paper session schema. This is a **monotonic integer counter**, not a timestamp — all reads and writes happen in Convex (single authoritative source, no cross-system clock skew).

**Lifecycle:**
- Choice submission: at the START of server-side request processing, a Convex mutation increments `decisionEpoch` and returns the new value. The request carries this value as `myEpoch` for the duration of the turn.
- Cancel: `cancelChoiceDecision` increments `decisionEpoch`.
- Chain-completion (and all rescue paths): re-read session before each mutation step. If `session.decisionEpoch !== myEpoch`, abort — the decision has changed since this request started.

```
// At request start (Convex mutation, not app server):
const { epoch: myEpoch } = await stampDecisionEpoch({ sessionId })

// In chain-completion, before each step:
const freshSession = await fetchQueryWithToken(api.paperSessions.getById, { sessionId })
if (freshSession.decisionEpoch !== myEpoch) {
    console.info(`[CHAIN-COMPLETION] aborted: epoch drift (mine=${myEpoch}, current=${freshSession.decisionEpoch})`)
    break
}
```

This also applies to:
- Lampiran rescue (`build-on-finish-handler.ts:406-460`)
- Judul rescue (`build-on-finish-handler.ts:462-581`)

**Why epoch, not timestamp:** `requestStartedAt` originates from client `Date.now()` (app server / Vercel Functions), while any cancel timestamp would be written by Convex mutations (Convex server). These are different systems with independent clocks — timestamp comparison is inherently skew-prone. A monotonic integer counter in a single persistence layer (Convex) eliminates this class of problems entirely.

**Concurrent request handling:**

```
Epoch progression:
  epoch=0: initial
  epoch=1: Choice A submitted (myEpoch=1)
  epoch=2: Cancel (cancelChoiceDecision increments)
  epoch=3: Choice B submitted (myEpoch=3)

Chain-completion A: session.decisionEpoch(2) !== myEpoch(1) → abort ✓
Chain-completion B: session.decisionEpoch(3) === myEpoch(3) → proceed ✓
```

No clearing, no resetting. The epoch only moves forward. Any request holding a stale epoch is automatically blocked.

---

## 6. What Stays Unchanged

| Component | Why unchanged |
|-----------|--------------|
| Choice card spec (`jsonRendererChoice`) | Submission state is client-side, not in spec |
| `compileChoiceSpec()` | No spec compilation needed on cancel |
| `cloneSpecWithReadOnlyState()` | Only called when `isSubmitted=true` — after cancel, `isSubmitted=false` |
| `build-on-finish-handler.ts` guaranteed injection **logic** | Injection logic unchanged — but file IS modified for epoch checks (see modified files). The guaranteed injection feature itself is unaffected by cancel |
| `ChoiceOptionButton` toggle/uncheck | Component-level `store.set()` — works regardless of spec format |
| Rewind feature | Operates at inter-stage level, orthogonal to intra-stage cancel |
| `editAndTruncateConversation` | Reused as-is for message cleanup. Note: mutation requires `content: v.string()` arg (backwards compat, not used) — cancel handler must pass empty string `""` |
| `resetStageDataForEditResend` | Stays for regular (non-synthetic) message edit+resend |

---

## 7. Relationship to Existing Features

```
User wants to undo something in paper workflow:
│
├─ Undo a choice card selection (same stage, same turn)
│   └─ "Batalkan" on [Choice:] message ← NEW (this design)
│
├─ Undo a validation decision (same stage, just decided)
│   ├─ Undo approval → "Batalkan" on [Approved:] message ← NEW (this design)
│   └─ Undo revision → DEFERRED (not safe without snapshot infrastructure)
│
├─ Redo an approved stage (multi-stage backward)
│   └─ Rewind from timeline ← EXISTING (PaperStageProgress + rewindToStage)
│
└─ Edit a regular user message (non-synthetic)
    └─ Edit+resend ← EXISTING (handleEdit + editAndTruncateConversation)
        └─ With resetStageDataForEditResend for incomplete stages ← EXISTING
```

---

## 8. Implementation Order

| Phase | Scope | Complexity | Dependency |
|-------|-------|------------|------------|
| **Phase 1** | Cancel choice card (4.2) + client state fixes (submittedChoiceKeys derive, optimisticPendingValidation clear) | Low | None |
| **Phase 2** | Cancel approval (4.3) + harness run guard | Medium | Benefits from Phase 1 client state patterns |
| **Phase 3** | Remove edit+resend from synthetic messages (`choice` and `approved` kinds) | Low | Phase 1-2 complete |

Cancel revision (4.4) is **deferred** — not in V1 scope. See section 4.4 for rationale.
Phase 3 is last because "Batalkan" must fully work before we remove the fallback edit+resend path.

**V1 scope limitation:** Phase 3 only removes edit+resend from `choice` and `approved` synthetic messages. `revision` synthetic messages (`[Revisi untuk ...]`) **remain on the existing edit+resend path in V1** — they still go through `MessageBubble.tsx` edit icon → `handleEdit` → `editAndTruncateConversation`. This is intentional: cancel revision is deferred (section 4.4), and removing edit+resend without a replacement would leave revision messages with no undo mechanism at all. The problem statement in section 2.1 applies to all synthetic messages in principle, but V1 implementation is scoped to choice + approved only.

---

## 9. Deterministic vs Probabilistic Guarantees

| Action | Type | Explanation |
|--------|------|-------------|
| State revert (stageData, stageStatus, artifacts) | **Deterministic** | Code guarantees Convex state is reverted |
| Message truncation | **Deterministic** | `editAndTruncateConversation` deletes all subsequent messages |
| Choice card re-activation | **Deterministic** | Removing key from `submittedChoiceKeys` + unchanged spec → card renders interactive |
| Validation panel re-appearance | **Deterministic** | `stageStatus === "pending_validation"` → Convex reactivity renders panel |
| Model behavior after cancel | **N/A for choice cancel** | No AI turn triggered — user picks again from existing card |
| Model behavior after approval/revision cancel | **Probabilistic** | Panel re-appears, user makes new decision → triggers new AI turn. Model behavior depends on context |

---

## 10. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| `unapproveStage` is essentially reverse-engineering `approveStage` — any future change to approve must be mirrored | Medium | Document coupling. Add test that verifies approve→unapprove roundtrip |
| Artifact title re-prefixing ("Draf") may not match original format | Low | Solved: store `titleStrippedOnApproval` flag in stageData during approveStage. unapproveStage only re-adds prefix when flag is true (see section 5.2) |
| Cancel during chain-completion (server fallback creating artifact async) | High | `cancelChoiceDecision` clears stageData + increments `decisionEpoch`. Chain-completion re-reads session before each step and aborts if epoch drifted (section 5.5.4) |
| Harness run state if `resolveAndResume` was already called on approve/revise | Medium | UX throttle: hide Batalkan for 30 seconds after `[Approved:]` message creation (section 5.5.3). Not a correctness guarantee — harness runs exceeding 30s are unguarded in V1 |
| `naskahSnapshot` rebuild on unapprove could be slow for late stages | Low | Same rebuild used in rewind — already tested and acceptable |
| Cancel revision unsafe due to mid-stream server-side writes | High | Deferred from V1 scope entirely. Tools execute Convex mutations during streaming — `stop()` cannot rollback. Requires snapshot infrastructure (future work) |
| `unapproveStage` doesn't clean draft data in the next stage | Medium | Explicitly handled: mutation saves `nextStageToClear = session.currentStage` before revert, then clears `stageData[nextStageToClear]`. Prevents orphaned _plan or draft fields |
| `submittedChoiceKeys` rehydration race with Convex subscription | Medium | Two-set approach: persistedChoiceKeys (full-derived from history) + optimisticPendingKeys (bridging submit-to-persist gap). Prevents both stale re-add and premature optimistic wipe |
| `optimisticPendingValidation` not cleared on cancel | Medium | All cancel handlers explicitly clear this flag when reverting stageStatus away from `pending_validation` |
| Harness run guard lacks `lastResumedAt` backend field | Low | UX throttle via message `createdAt` (30-second window). Not a correctness guarantee — documented as heuristic. Default hide when createdAt absent |
| `unapproveStage` for judul must also clear `paperTitle` and `workingTitle` | Medium | Explicitly handled in mutation (see section 5.2). These fields are set by `approveStage` only for judul stage |
| Synthetic messages store display labels, not canonical stage IDs | Low | Mutations derive targetStage from `paperSession.currentStage` via `getPreviousStage()`, not from message text. Future improvement: add canonical ID to synthetic message format |
| Digest rollback pattern differs from rewind (superseded vs pop) | Low | Design uses `superseded` pattern for digest (consistent with rewind). Boundaries use pop/remove (different from rewind, justified: reopened stage boundary is invalid) |

---

## 11. Files to Create/Modify

### New files:
- (none — mutations added to existing `convex/paperSessions.ts`)

### Modified files:

| File | Change |
|------|--------|
| `convex/paperSessions.ts` | Add `cancelChoiceDecision`, `unapproveStage`, `stampDecisionEpoch` mutations (cancelRevision deferred). Small addition to existing `approveStage`: store `titleStrippedOnApproval` flag in stageData before stripping |
| `convex/schema.ts` | Add `decisionEpoch: v.optional(v.number())` to paperSessions table |
| `src/components/chat/MessageBubble.tsx` | Replace edit icon with "Batalkan" button for synthetic messages. Add 30-second message age guard for approval cancel |
| `src/components/chat/ChatWindow.tsx` | Add `handleCancelDecision` handler; split submittedChoiceKeys into persisted + optimistic sets; clear `optimisticPendingValidation` on cancel |
| `src/lib/utils/paperPermissions.ts` | Add `isCancelAllowed()` function for scope guards |
| `src/lib/chat-harness/entry/accept-chat-request.ts` | Call `stampDecisionEpoch` when `choiceInteractionEvent` present; store `myEpoch` in accepted request |
| `src/lib/chat-harness/runtime/orchestrate-sync-run.ts` | Pass `myEpoch` from accepted request through to `onFinishConfig` (alongside existing `requestStartedAt` at line 420) |
| `src/lib/chat-harness/executor/types.ts` | Add `myEpoch?: number` to `OnFinishConfig` type |
| `src/lib/chat-harness/executor/build-on-finish-handler.ts` | Add `decisionEpoch` check before chain-completion and rescue paths, read `myEpoch` from config |

### Unchanged files (verified safe):
| File | Reason |
|------|--------|
| `src/components/chat/json-renderer/JsonRendererChoiceBlock.tsx` | `isSubmitted` prop drives read-only state — no change needed |
| `src/components/chat/json-renderer/components/ChoiceOptionButton.tsx` | Toggle via `store.set()` — works regardless |
| `src/components/chat/json-renderer/components/ChoiceSubmitButton.tsx` | Reads `selectedOptionId` from state — works regardless |
| `src/lib/json-render/compile-choice-spec.ts` | No spec recompilation needed on cancel |
| `src/lib/json-render/choice-payload.ts` | Schema unchanged |
| `src/components/paper/PaperValidationPanel.tsx` | Panel appearance driven by Convex state — no change needed |


---

## 12. Review Log

### Codex Review (2026-04-17)

| Finding | Verdict | Action Taken |
|---------|---------|-------------|
| P0: `cancelRevision` doesn't rollback stageData/artifact changes from model response | **Valid** | Added timing constraint (section 4.4): cancel revision only available before model completes. Post-response cancel deferred to future work requiring snapshot infrastructure |
| P1: synthetic messages store display labels, not canonical stageId | **Partially valid** | Mutations never parse stageId from message text — they derive from `paperSession.currentStage`. Documented in section 4.3 and 5.2 |
| P1: `unapproveStage` misses `paperTitle`/`workingTitle` rollback for judul | **Valid** | Added to section 4.3 and 5.2: clear both fields when targetStage === "judul" |
| P2: digest/boundaries rollback pattern inconsistent with rewind | **Partially valid** | Aligned digest to `superseded` pattern (consistent with rewind). Justified boundaries pop/remove as semantically different (reopened stage vs multi-stage skip) |
| P3: trailing whitespace lint | **Valid** | Fixed |

### Codex Review Round 2 (2026-04-17)

| Finding | Verdict | Action Taken |
|---------|---------|-------------|
| 1. Timing constraint cancelRevision: `stop()` doesn't cancel server-side mutations, writes happen during streaming | **Valid** | cancelRevision dropped from V1 scope entirely (section 4.4 rewritten). Tools fire Convex mutations mid-stream — no safe cancel window exists without snapshot infra |
| 2. `unapproveStage` doesn't clear draft data in next stage (_plan, stageData from model's post-approval response) | **Valid** | Added `stageData[nextStageToClear]` clear to mutation — saved before revert (section 5.2) |
| 3a. `submittedChoiceKeys` rehydration is additive-only, stale Convex snapshots can re-add keys | **Valid** | Changed to full-derive pattern (section 5.5.1) |
| 3b. `optimisticPendingValidation` not cleared on cancel | **Valid** | Explicit clear added to all cancel handlers (section 5.5.2) |
| 4. Harness run `resolveAndResume` called before cancel — side effects continue | **Valid** | Added UI-level guard: hide cancel button if harness run recently resumed (section 5.5.3) |
| 5. cancelRevision UX window practically unusable | **Valid** | Subsumed by finding 1 — cancelRevision dropped from V1 |

### Codex Review Round 3 (2026-04-17)

| Finding | Verdict | Action Taken |
|---------|---------|-------------|
| 1-2. cancelChoiceDecision + unapproveStage completeness | **PASS** | No changes needed |
| 3a. Full-derive submittedChoiceKeys would wipe optimistic submit key | **Valid** | Changed to two-set approach: persistedChoiceKeys (full-derive from history) + optimisticPendingKeys (bridges submit→persist gap). Section 5.4.1 rewritten |
| 3b. Harness guard 30s has no data source (pausedHarnessRun returns null after resume) | **Valid** | Changed to message-timestamp guard: use `[Approved:]` message createdAt as proxy. No backend field needed. Section 5.4.3 rewritten |
| 4. Chain-completion race: server creates artifact after client cancel | **Valid (FAIL)** | Added decision guard to session. Chain-completion/rescue re-read session before each step, abort if decision changed. Added `build-on-finish-handler.ts` to modified files. Section 5.4.4 added. (Originally `canceledDecisionAt` timestamp, later changed to `decisionEpoch` counter in round 6) |
| 5. Net-new risks from full-derive and harness guard | **Valid** | Subsumed by fixes to 3a, 3b, and 4 |

### Codex Review Round 4 (2026-04-17)

| Finding | Verdict | Action Taken |
|---------|---------|-------------|
| 1. Two-set submittedChoiceKeys | **PASS** | No changes needed |
| 2. Message-timestamp harness guard is heuristic, not correctness guarantee | **Valid (CONCERN)** | Documented as UX throttle. Added caveat: default to hide when createdAt absent. Future improvement noted for harness lifecycle signal |
| 3. `canceledDecisionAt` lifecycle: clearing on new choice creates race for stale requests | **Valid (CONCERN)** | Changed to monotonic — never cleared. (Later replaced with `decisionEpoch` integer counter in round 6 to eliminate clock skew) |
| 4. Schema change safety | **PASS** | No changes needed |

### Codex Review Round 5 — Final (2026-04-17)

| Finding | Verdict | Action Taken |
|---------|---------|-------------|
| 1. Three internal doc contradictions (visibility rule, risk entry, unchanged files) | **Valid** | Fixed: visibility rule uses message.createdAt throttle (not pausedHarnessRun), risk entry updated to decision guard, build-on-finish-handler.ts removed from unchanged table |
| 2. V1 scope boundaries | **PASS** | No changes needed |
| 3. Time source consistency: canceledDecisionAt (server) vs requestStartedAt (client) | **Valid (CONCERN)** | Replaced timestamp mechanism entirely with `decisionEpoch` integer counter in Convex. No cross-system clock comparison needed |
| 4. Final net-new risks | **PASS** | No changes needed |

### Codex Review Round 6 — Final Sign-Off (2026-04-17)

| Finding | Verdict | Action Taken |
|---------|---------|-------------|
| 1. Risk table still references `pausedHarnessRun` for harness guard | **Valid** | Updated to UX throttle wording consistent with section 5.5.3 |
| 2. Clock skew: `canceledDecisionAt` (Convex) vs `requestStartedAt` (app server) are different clocks | **Valid (FAIL → BLOCK)** | Replaced entire timestamp mechanism with `decisionEpoch` monotonic integer counter. All reads/writes in Convex only — single source of truth, zero clock skew. Section 5.5.4 rewritten, schema field changed, mutation specs updated |

### Codex Review Round 7 (2026-04-17)

| Finding | Verdict | Action Taken |
|---------|---------|-------------|
| **BLOCKER:** `unapproveStage` guard `stageStatus === "drafting"` fails for judul→completed (stageStatus="approved", currentStage="completed") | **Valid** | Guard expanded: also accepts `currentStage === "completed" && stageStatus === "approved"`. targetStage derivation handles completed case explicitly (last STAGE_ORDER entry). Sections 4.3 and 5.2 updated |
| Modified files incomplete: `orchestrate-sync-run.ts` needs to pass `myEpoch` through | **Valid** | Added to modified files list |
| V1 leaves revision synthetic messages on old edit path without explicit documentation | **Valid** | Added explicit V1 scoping note to section 8: revision messages intentionally stay on edit+resend in V1 |

### Self-Review (2026-04-17)

| Finding | Source | Action Taken |
|---------|--------|-------------|
| `stampDecisionEpoch` listed in modified files but has no mutation spec | Self | Added section 5.3 with full spec |
| Two duplicate risk entries for chain-completion race | Self | Deduplicated |
| Unchanged files table lists `build-on-finish-handler.ts` without noting it's also modified | Self | Clarified: injection logic unchanged, file modified for epoch checks |
| "Re-add Draf prefix" unconditional — approveStage only strips conditionally | Self | Added `titleStrippedOnApproval` flag mechanism. approveStage stores flag, unapproveStage reads it |
| `editAndTruncateConversation` requires `content: v.string()` arg | Self | Documented: cancel handler passes empty string |
| `accept-chat-request.ts` missing from modified files | Self | Added |
| Section references stale (5.4.x → 5.5.x) | Self | Updated all |
| `unapproveStage` spec: `stageData[currentStage]` refers to wrong stage after revert | Self | Introduced `nextStageToClear` variable — saved BEFORE `currentStage = targetStage` revert. Clear uses this variable, not the already-reverted `currentStage` |
| Missing file: `executor/types.ts` needs `myEpoch` in OnFinishConfig | Self | Added to modified files |
| Step 4 in 4.2 doesn't specify two-set removal per 5.5.1 | Self | Updated to explicitly mention both persistedChoiceKeys and optimisticPendingKeys |
