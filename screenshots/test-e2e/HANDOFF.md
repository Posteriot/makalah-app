# E2E Audit Handoff for New Codex Session

**Date:** 2026-04-18 04:45:24 WIB  
**Branch:** `agent-harness`  
**Current HEAD seen in this session:** `966c85e0`  
**Role of Codex in this branch:** audit/review only unless the user explicitly authorizes patching because Claude runs out of tokens.

---

## Purpose of this handoff

This file exists to let a fresh Codex session continue the E2E audit workflow without relying on the old chat context.

The workflow is:

1. User runs manual UI E2E per stage and sends logs/screenshots.
2. Codex audits the evidence against the codebase and `OBSERVABILITY-MAP.md`.
3. Codex writes a Claude-facing audit prompt under `docs/agent-harness/e2e-test/audit-and-respond-prompt/`.
4. Claude implements fixes and sends execution reports back for audit.

Codex should not patch app code unless the user explicitly allows it.

---

## Source of truth to read first

1. `docs/agent-harness/new/OBSERVABILITY-MAP.md`
2. `screenshots/test-e2e/review-audit-checklist.md`
3. `docs/agent-harness/e2e-test/audit-and-respond-prompt/`

These files hold the durable memory. Do not trust chat memory over them.

---

## Audit status so far

### Stage 1: gagasan, round 1

**Evidence folder:** `screenshots/test-e2e/stage-1/test-1/`

**User-reported issue:** primary choice card on reference-search turn did not appear live; after refresh the fallback appeared.

**Codex verdict:** bug confirmed.

**Root cause that was accepted in audit:**
- fallback choice spec was persisted but not emitted reliably to live stream
- one-shot history rehydration missed late persisted `jsonRendererChoice`
- search path did not persist `uiMessageId`, making reconciliation weaker

**Audit prompt written:**  
`docs/agent-harness/e2e-test/audit-and-respond-prompt/stage-1-gagasan-round-1.md`

**Claude follow-up that Codex accepted conceptually:**
- stream-side guaranteed choice spec emission
- incremental rehydration in `ChatWindow`
- persist `uiMessageId`
- add regression tests

### Stage 1: gagasan, round 2

**Evidence folder:** `screenshots/test-e2e/stage-1/test-2/`

**User-reported issue:** no explicit UI bug reported in this batch.

**Codex verdict:**  
- functional pass  
- stability fail / not yet clean

**What Codex confirmed:**
- the round-1 choice-card disappearance did not recur
- the stage could progress functionally

**What remained concerning:**
- recovery-path behavior before final success
- heavy latency
- `STREAM-SMOOTHNESS` failure
- `ARTIFACT-ORDERING verdict=reversed`
- browser console latency in the tens of seconds
- skeleton/loading churn even after near-final state

**Audit prompt written:**  
`docs/agent-harness/e2e-test/audit-and-respond-prompt/stage-1-gagasan-round-2.md`

**Separate backlog note created for later branch:**  
`docs/agent-harness/e2e-test/latency-followup-stage-1-gagasan-round-2.md`

This latency note is intentionally deferred. Do not let it block the current E2E progression branch unless the user says so.

### Stage 2: topik, round 1

**Evidence folder:** `screenshots/test-e2e/stage-2/test-1/`

**User-reported issue:** artifact appeared too early, effectively together with response, and validation panel came after; desired order:

1. response
2. artifact
3. validation panel

**Codex initial verdict:** bug confirmed, and the issue is cross-stage, not topik-only.

**Original evidence that mattered:**
- backend tool chain completed `updateStageData -> createArtifact -> submitStageForValidation`
- only after that did the substantive text continue/finish
- `ARTIFACT-ORDERING verdict=reversed` confirmed backend ordering

**Important refinement from later debate:**
- the **primary fix should live in the UI reveal layer**, not the enforcer/policy layer
- enforcer should stay intact for functional correctness
- user-facing sequencing must be enforced client-side
- but it should be **state-driven sequencing**, not crude timer-only theater

**Main audit prompt written:**  
`docs/agent-harness/e2e-test/audit-and-respond-prompt/stage-2-topik-round-1.md`

**Debate record kept at:**  
`docs/agent-harness/e2e-test/audit-and-respond-prompt/stage-2-topik-round-1-debate.md`

**Execution-report audit record kept at:**  
`docs/agent-harness/e2e-test/audit-and-respond-prompt/stage-2-topik-round-1-execution-report.md`

**Follow-up-report audit record kept at:**  
`docs/agent-harness/e2e-test/audit-and-respond-prompt/stage-2-topik-round-1-followup-report.md`

**Latest Codex position on stage 2 topik fix:**
- runtime fix: approved
- observability fix: approved
- regression test follow-up: only partially approved

**Why only partially approved:**
- Claude added the missing fallback-claimed observability log and fixed the misleading comment
- but the new reveal-sequencing test file still partly tests a local helper defined inside the test file itself instead of the production render gate directly
- that is a test-strength gap, not a runtime blocker

---

## Durable conclusions to carry into the new session

### 1. Codex should keep separating these two things

- **backend/internal ordering**
- **user-facing reveal ordering**

Do not conflate them.

`ARTIFACT-ORDERING verdict=reversed` is still useful, but after the reveal-sequencing work it is not automatically proof that UX ordering is wrong.

### 2. UI-order logs matter now

The important browser logs for artifact sequencing are:

- `[UI-REVEAL-ORDER] response_settled`
- `[UI-REVEAL-ORDER] artifact_revealed`
- `[UI-REVEAL-ORDER] validation_panel_eligible`

Audit the order of those logs whenever a drafting stage produces an artifact.

### 3. Stage 1 latency concern is unresolved on purpose

Do not reopen that as part of the same branch unless the user explicitly asks to shift scope.  
Use the backlog note instead:

`docs/agent-harness/e2e-test/latency-followup-stage-1-gagasan-round-2.md`

### 4. Codex should remain audit-only by default

The user explicitly corrected this earlier: Claude is the executor; Codex audits and writes prompts.  
Only patch if the user explicitly authorizes it because Claude is out of tokens.

---

## What has not been audited yet in this session

The user intended to continue after stage 2 toward stage 3 and beyond.  
At the time of this handoff, Codex has **not yet audited**:

| Stage | Status |
|---|---|
| 3 `outline` | Not audited in this session |
| 4 `pendahuluan` | Not audited |
| 5 `tinjauan-pustaka` | Not audited |
| 6 `metodologi` | Not audited |
| 7 `hasil` | Not audited |
| 8 `pembahasan` | Not audited |
| 9 `kesimpulan` | Not audited |
| 10 `abstrak` | Not audited |
| 11 `judul` | Not audited |
| 12 `lampiran` | Not audited |
| 13 `daftar-pustaka` | Not audited |
| 14 `completed` | Not audited |

There is already a folder prepared for stage 3 artifacts:

`screenshots/test-e2e/stage-3/test-1/`

---

## Recommended startup procedure for the new Codex session

1. Read this handoff.
2. Read `docs/agent-harness/new/OBSERVABILITY-MAP.md`.
3. Read `screenshots/test-e2e/review-audit-checklist.md`.
4. Read the existing prompts under `docs/agent-harness/e2e-test/audit-and-respond-prompt/` to understand prior verdict style.
5. When the user sends stage 3 evidence, audit from evidence first, then verify the relevant code path before concluding.
6. If writing a new Claude-facing prompt, keep it in `docs/agent-harness/e2e-test/audit-and-respond-prompt/`.

---

## Final caution for the next session

Do not trust executor claims like “all tests pass” or “build clean” unless independently verified or explicitly labeled as executor-only claims.

Codex should keep using this standard:

- findings first
- evidence from logs/screenshots
- verification against code
- clear verdict
- clear recommendation for Claude

