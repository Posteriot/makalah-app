# Handoff Report: Validation Panel Artifact Consistency

**Branch:** `validation-panel-artifact-consistency`
**Date:** 2026-04-07
**Agent:** Claude Opus 4.6 (1M context)
**Method:** Systematic debugging (Phase 1–4) per `superpowers:systematic-debugging`

---

## Executive Summary

Investigasi menemukan **4 root cause** + **2 gap** yang diperbaiki berdasarkan Codex peer review. Total: **6 fixes** diterapkan.

Root cause utama (RC1) adalah **deterministic bug**: tool `updateArtifact` tidak menginstruksikan model untuk memanggil `submitStageForValidation()` setelah artifact berhasil di-update. Setelah Codex review, ditemukan 2 gap tambahan: (1) ordering-bug observability hanya cek `sawCreateArtifactSuccess` tanpa `sawUpdateArtifactSuccess`, dan (2) `POST_CHOICE_FINALIZE_STAGES` hanya cover 9 dari 12 stage yang seharusnya finalize.

**Apa yang SUDAH diperbaiki:** revision flow, universal observability, post-choice finalize coverage untuk 12 stage.

**Apa yang BELUM tuntas:** gagasan (tetap exploration stage — by design) dan daftar_pustaka (special compile flow — by design) tidak ikut POST_CHOICE_FINALIZE. Smoke test end-to-end 14 stage belum dilakukan. Konsistensi 100% membutuhkan runtime testing, bukan hanya code audit.

---

## Scope Investigasi

### File yang diaudit

| Layer | Files |
|-------|-------|
| **Tool definitions** | `src/lib/ai/paper-tools.ts` (updateStageData, submitStageForValidation, compileDaftarPustaka) |
| **Artifact tools** | `src/app/api/chat/route.ts` (createArtifact, updateArtifact — lines 1431–1714) |
| **System prompt** | `src/app/api/chat/route.ts` (isDraftingStage, CHOICE_YAML injection — lines 360–836) |
| **Paper mode prompt** | `src/lib/ai/paper-mode-prompt.ts` (revision note, artifact missing note — lines 259–279) |
| **Stage instructions** | `src/lib/ai/paper-stages/foundation.ts`, `core.ts`, `results.ts`, `finalization.ts` |
| **Skill resolver** | `src/lib/ai/stage-skill-resolver.ts` (ARTIFACT_CREATION_FOOTER — lines 6–13) |
| **Choice handling** | `src/lib/chat/choice-request.ts` (post-choice context notes) |
| **Frontend rendering** | `src/components/chat/ChatWindow.tsx` (optimisticPendingValidation, panel visibility — lines 597, 661, 946–979, 2614) |
| **Frontend panel** | `src/components/paper/PaperValidationPanel.tsx` |
| **Backend mutations** | `convex/paperSessions.ts` (submitForValidation, approveStage, requestRevision) |
| **Observability** | `src/app/api/chat/route.ts` (onFinish telemetry — lines 2769–2845, 3425–3514) |

### 14 stages audited

gagasan, topik, outline, abstrak, pendahuluan, tinjauan_literatur, metodologi, hasil, diskusi, kesimpulan, pembaruan_abstrak, daftar_pustaka, lampiran, judul

---

## Root Causes Found

### RC1 — `updateArtifact` nextAction missing `submitStageForValidation` directive

**Type:** Deterministic bug
**Severity:** Critical — affects ALL 14 stages during revision flow
**File:** `src/app/api/chat/route.ts:1702`

**Evidence:**

```
// createArtifact (line 1585) — CORRECT:
nextAction: "...call submitStageForValidation() NOW."

// updateArtifact (line 1702) — BROKEN (before fix):
nextAction: "⚠️ Artifact updated. Do NOT repeat the revised content in chat.
Respond with MAX 2-3 sentences confirming the update and directing user
to review in artifact panel."
// ^^^ NO mention of submitStageForValidation
```

**Mechanism:** When user requests revision → model calls `updateArtifact` → tool returns nextAction WITHOUT submitStageForValidation → model stops → backend stays in `drafting` status (not `pending_validation`) → validation panel never appears.

**Why this explains the reported failures:**
- `metodologi`, `judul`, `kesimpulan` failures from handoff doc align with revision flow stalls
- Model claims "draft sudah diajukan" (false-validation-claim) because it believes the artifact update alone suffices

---

### RC2 — Observability only covers 2 of 14 stages

**Type:** Blind spot (not a bug, but prevents diagnosis)
**Severity:** Medium — failures in 12 stages go undetected
**File:** `src/app/api/chat/route.ts:2769–2827`

**Evidence:**

```
// Only hasil post-choice has telemetry (lines 2769-2796):
if (isHasilPostChoice && normalizedText.length > 0) { ... }

// Only daftar_pustaka has telemetry (lines 2800-2827):
if (paperStageScope === "daftar_pustaka" && normalizedText.length > 0) { ... }

// Stages WITHOUT any tool-chain observability:
// gagasan, topik, outline, abstrak, pendahuluan, tinjauan_literatur,
// metodologi, diskusi, kesimpulan, pembaruan_abstrak, lampiran, judul
```

**Impact:** Tool chain failures (partial-save-stall, artifact-without-submit, ordering-bug, false-validation-claim) in 12 stages produce zero log warnings. This explains why the failures were hard to diagnose — no runtime evidence was generated.

---

### RC3 — `ARTIFACT_CREATION_FOOTER` only mentions `createArtifact`

**Type:** Instruction gap
**Severity:** Medium — misleading during revision flow
**File:** `src/lib/ai/stage-skill-resolver.ts:6-13`

**Evidence (before fix):**

```
═══ MANDATORY ARTIFACT RULE ═══
⚠️ You MUST call createArtifact() to produce the artifact for this stage's output.
- Call in the SAME TURN as updateStageData, BEFORE submitStageForValidation.
```

This footer is appended to ALL stage instructions (both skill-based and fallback). During revision, the model should call `updateArtifact` (not `createArtifact`), but this footer tells it to call `createArtifact`. Additionally, the footer doesn't explicitly state that `submitStageForValidation` must follow both create AND update.

---

### RC4 — Revision system prompt directive was weak

**Type:** Instruction weakness
**Severity:** Low (mitigated by RC1 fix, but still contributes)
**File:** `src/lib/ai/paper-mode-prompt.ts:261`

**Evidence (before fix):**

```
"⚠️ REVISION MODE: User requested changes. Pay attention to their feedback
in the latest message. If an artifact already exists for this stage, prefer
updateArtifact over createArtifact. After revising, call submitStageForValidation
again in the same turn."
```

Issues:
- "prefer" is soft language — model may still call createArtifact
- "After revising, call submitStageForValidation" is buried in a long sentence
- System prompt is a one-time signal, while tool nextAction (RC1) is at the exact decision point

---

## Components Verified as Correct (No Bug)

### Frontend validation panel rendering

**File:** `src/components/chat/ChatWindow.tsx:2614`

```tsx
{(isPaperMode
  && (stageStatus === "pending_validation" || optimisticPendingValidation)
  && userId
  && status !== 'streaming') && (
    <PaperValidationPanel ... />
)}
```

**Verified:** All 4 conditions are correct. The `optimisticPendingValidation` bridge in `onFinish` (line 977) correctly detects `tool-submitStageForValidation` success. The panel rendering is NOT the problem — the problem is upstream (submitStageForValidation never gets called).

### `hasSubmitForValidation` detection

**File:** `src/components/chat/ChatWindow.tsx:946-964`

**Verified:** Correctly checks for `type === "tool-submitStageForValidation"` with `state === "output-available" || "result"` and `success === true`. No false positives or negatives.

### Backend mutations

**Files:** `convex/paperSessions.ts:965-1000` (submitForValidation), `convex/paperSessions.ts:1005-1109` (approveStage)

**Verified:** `submitForValidation` correctly requires `artifactId` in stageData and sets `stageStatus = "pending_validation"`. Deterministic — if called, it works.

### Stage instructions consistency

**Files:** `foundation.ts`, `core.ts`, `results.ts`, `finalization.ts`

**Verified:** All 14 stages have consistent FUNCTION TOOLS sections with the same pattern: `updateStageData → createArtifact → submitStageForValidation`. All include the "MUST call in the SAME TURN" directive. All include the VISUAL LANGUAGE section for choice cards.

### Choice YAML injection

**File:** `src/app/api/chat/route.ts:369, 784-786`

```typescript
const isDraftingStage = !!paperStageScope && paperSession?.stageStatus === "drafting"
// CHOICE_YAML_SYSTEM_PROMPT injected only when isDraftingStage === true
```

**Verified:** During `stageStatus === "revision"`, choice YAML prompt and YAML render pipeline are both disabled. This is **intentional** — during revision the model should focus on updating the artifact based on feedback, not presenting new choices. The stage instructions still mention choice cards, but this is acceptable general guidance that the model correctly ignores during revision turns.

---

## Fixes Applied

### Fix 1: `updateArtifact` nextAction — add `submitStageForValidation` directive

**File:** `src/app/api/chat/route.ts:1702`

```diff
- nextAction: "⚠️ Artifact updated. Do NOT repeat the revised content in chat.
-   Respond with MAX 2-3 sentences confirming the update and directing user
-   to review in artifact panel.",
+ nextAction: "⚠️ MANDATORY: Artifact updated. Do NOT repeat the revised content
+   in chat. Do NOT mention technical issues, errors, or problems — the operation
+   SUCCEEDED. Now call submitStageForValidation() NOW in this same response.
+   Respond with MAX 2-3 sentences ONLY: (1) confirm artifact was updated,
+   (2) call submitStageForValidation() IMMEDIATELY.",
```

**Rationale:** Tool nextAction is the strongest behavioral signal — returned at the exact decision point. This creates parity with createArtifact's nextAction. Every successful updateArtifact now mandates submitStageForValidation.

### Fix 2: `ARTIFACT_CREATION_FOOTER` — cover both create and update paths

**File:** `src/lib/ai/stage-skill-resolver.ts:6-13`

```diff
  ═══ MANDATORY ARTIFACT RULE ═══
- ⚠️ You MUST call createArtifact() to produce the artifact for this stage's output.
- - Call in the SAME TURN as updateStageData, BEFORE submitStageForValidation.
+ ⚠️ You MUST produce an artifact for this stage's output:
+ - FIRST DRAFT: call createArtifact() in the SAME TURN as updateStageData,
+   BEFORE submitStageForValidation.
+ - REVISION: call updateArtifact() (NOT createArtifact) in the SAME TURN,
+   THEN call submitStageForValidation().
  - Include the 'sources' parameter from AVAILABLE_WEB_SOURCES if available.
  - The artifact is the FINAL OUTPUT that will be reviewed and approved.
+ - After createArtifact OR updateArtifact succeeds → MUST call
+   submitStageForValidation() in the SAME turn.
  ═══════════════════════════════
```

**Rationale:** This footer is appended to ALL stage instructions (skill-based and fallback). Now clearly distinguishes first-draft vs revision path and explicitly mandates submitStageForValidation after BOTH paths.

### Fix 3: Universal per-stage observability for tool chain completion

**File:** `src/app/api/chat/route.ts` (primary: lines ~2829, fallback: lines ~3697)

Added 4 detection patterns for ALL 14 stages (both primary and fallback provider paths):

| Detection | Condition | Log pattern |
|-----------|-----------|-------------|
| `partial-save-stall` | sawUpdateStageData && !sawCreate && !sawUpdate && !sawSubmit | `[PAPER][partial-save-stall] stage=X` |
| `artifact-without-submit` | (sawCreate \|\| sawUpdate) && !sawSubmit | `[PAPER][artifact-without-submit] stage=X` |
| `ordering-bug` | sawSubmitArtifactMissing && (sawCreate \|\| sawUpdate) && !sawSubmit | `[PAPER][ordering-bug] stage=X` |
| `false-validation-claim` | text matches /panel validasi\|approve\|.../ && !sawSubmit | `[PAPER][false-validation-claim] stage=X` |

**Rationale:** Previously only `hasil` (post-choice) and `daftar_pustaka` had these detections. Now all 14 stages have them. This means every tool chain failure across any stage will produce a log warning, enabling faster diagnosis.

### Fix 4: Revision note — strengthen with MANDATORY SEQUENCE

**File:** `src/lib/ai/paper-mode-prompt.ts:261`

```diff
- "⚠️ REVISION MODE: User requested changes. Pay attention to their feedback
-   in the latest message. If an artifact already exists for this stage,
-   prefer updateArtifact over createArtifact. After revising, call
-   submitStageForValidation again in the same turn."
+ "⚠️ REVISION MODE: User requested changes. Pay attention to their feedback
+   in the latest message. If an artifact already exists for this stage,
+   use updateArtifact (NOT createArtifact). MANDATORY SEQUENCE:
+   updateArtifact() → submitStageForValidation() in the SAME turn.
+   Do NOT stop after updateArtifact — you MUST call
+   submitStageForValidation() immediately after."
```

**Rationale:** Changed "prefer" to "use ... (NOT createArtifact)" and added "MANDATORY SEQUENCE" with explicit "Do NOT stop after updateArtifact". Reinforces RC1 fix from the system prompt layer.

---

## Codex Peer Review — Findings and Fixes

Codex reviewed the initial handoff and found 2 legitimate gaps:

### Gap 1: Ordering-bug observability incomplete for revision flow

**Codex finding:** Ordering-bug detection at lines ~2850 and ~3713 only checked `sawCreateArtifactSuccess`, not `sawUpdateArtifactSuccess`. This means revision-flow ordering bugs (submit fails → updateArtifact succeeds → submit not retried) would go undetected.

**Fix 5:** Changed all 4 ordering-bug checks (primary hasil, primary universal, fallback hasil, fallback universal) to check `sawCreateArtifactSuccess || sawUpdateArtifactSuccess`.

### Gap 2: POST_CHOICE_FINALIZE_STAGES only covered 9 of 12 commit-point stages

**Codex finding:** `diskusi`, `kesimpulan`, `pembaruan_abstrak` fell through to `decision-to-draft` fallback, which allows partial save without mandating submit. This contradicts the claim that all stages use one reusable pattern.

**Fix 6:** Added `diskusi`, `kesimpulan`, `pembaruan_abstrak` to `POST_CHOICE_FINALIZE_STAGES`. Now covers 12 stages. Two stages intentionally excluded:
- `gagasan`: explicitly iterative brainstorming — choice cards are exploration, not commit points
- `daftar_pustaka`: has special compile flow (`compileDaftarPustaka → artifact → submit`)

### Codex critique accepted: Handoff overclaimed

The initial report claimed "universal" and "all 14 stages" in ways that were not fully accurate. This revision corrects those claims. Specifically:
- Observability is now genuinely universal for revision flow (after Fix 5)
- Post-choice finalize covers 12 of 14 stages (after Fix 6), with 2 intentional exclusions documented
- Smoke test end-to-end has NOT been performed — structural audit only

---

## Verification Evidence

| Check | Command | Result |
|-------|---------|--------|
| TypeScript | `npx tsc --noEmit` | exit 1 — 1 pre-existing error: `Cannot find namespace 'JSX'` in `ChatWindow.mobile-workspace.test.tsx:176`. **No new errors introduced by this session's changes.** Repo was NOT tsc-clean before this session. |
| Lint | `npx eslint` on modified files | 0 errors |
| Build | `npx next build` | exit 0, "Compiled successfully", all pages generated |
| Tests | `npx vitest run` on 3 related test suites | 28/28 pass |

All verification run AFTER Fix 5 and Fix 6 were applied.

---

## Files Modified (by this session)

| File | Lines changed | Purpose |
|------|---------------|---------|
| `src/app/api/chat/route.ts` | Fix 1, Fix 3, Fix 5 | updateArtifact nextAction, universal observability × 2 paths, ordering-bug revision coverage × 4 locations |
| `src/lib/ai/stage-skill-resolver.ts` | Fix 2 | ARTIFACT_CREATION_FOOTER covers create + update |
| `src/lib/ai/paper-mode-prompt.ts` | Fix 4 | Revision note MANDATORY SEQUENCE |
| `src/lib/chat/choice-request.ts` | Fix 6 | POST_CHOICE_FINALIZE_STAGES expanded 9→12, documented exclusions |

**Total:** 4 files modified by this session.

---

## Pre-existing Uncommitted Changes on This Worktree

The following files had uncommitted changes from a prior session. They are complementary, not from this investigation:

| File | What it adds |
|------|-------------|
| `src/lib/ai/stage-skill-validator.ts` | `hasVisualLanguageContract` + `hasChoiceCardContradiction` |
| `src/lib/chat/__tests__/choice-request.test.ts` | Tests for POST_CHOICE_FINALIZE_STAGES |
| `src/lib/ai/stage-skill-validator.test.ts` | Tests for visual language contract validation |
| `src/lib/ai/stage-skill-resolver.test.ts` | Updated test for ARTIFACT_CREATION_FOOTER |
| `convex/stageSkills.test.ts` | Updated skill content to include Visual Language section |
| `src/components/chat/ChatWindow.mobile-workspace.test.tsx` | Updated mobile workspace tests |

These changes are complementary and do not conflict with the 4 files modified in this session.

---

## Answers to Handoff Investigation Questions

### A. Artifact lifecycle (structural audit, all 14 stages)

| # | Question | Answer | Evidence |
|---|----------|--------|----------|
| 1 | updateStageData terpanggil? | Ya — tool ada, instruksi konsisten | All 14 stage instructions include updateStageData in FUNCTION TOOLS |
| 2 | createArtifact/updateArtifact terpanggil? | **Inconsistent sebelum fix** — revision path stalls | RC1: updateArtifact nextAction missing submitStageForValidation |
| 3 | artifactId tersimpan? | Ya — createArtifact auto-links | `route.ts:1559-1575` auto-links artifactId to stageData |
| 4 | submitStageForValidation terpanggil? | **Inconsistent sebelum fix** — revision path misses it | RC1: updateArtifact nextAction gap |
| 5 | submitForValidation mutation dijalankan? | Ya, saat tool berhasil dipanggil | `convex/paperSessions.ts:965-1000` — deterministic |
| 6 | stageStatus = pending_validation? | Ya, saat mutation sukses | Mutation sets `stageStatus: "pending_validation"` |

### B. Frontend lifecycle (structural audit)

| # | Question | Answer | Evidence |
|---|----------|--------|----------|
| 1 | onFinish memuat tool part sukses? | Ya | `ChatWindow.tsx:946-964` checks `type === "tool-submitStageForValidation"` |
| 2 | optimisticPendingValidation terset? | Ya, saat hasSubmitForValidation true | `ChatWindow.tsx:977-978` |
| 3 | Subscription returns pending_validation? | Ya | `ChatWindow.tsx:661-664` clears optimistic once confirmed |
| 4 | PaperValidationPanel dirender? | Ya, saat semua 4 conditions terpenuhi | `ChatWindow.tsx:2614` — isPaperMode && (pending_validation \|\| optimistic) && userId && !streaming |

### C. Failure classes — root causes mapped

| Failure class | Root cause | Fixed by |
|---------------|------------|----------|
| `partial-save-stall` | Model stops after updateStageData without calling artifact tool | Fix 2 (footer), Fix 4 (revision note). Now detected by Fix 3 (observability). |
| `artifact-without-submit` | updateArtifact nextAction doesn't mention submitStageForValidation | **Fix 1** (primary fix). Now detected by Fix 3 (observability). |
| `submit-succeeded-but-panel-missing` | **Not found** — frontend rendering logic is correct | No fix needed |
| `false-validation-claim` | Model says "diajukan untuk validasi" without calling submitStageForValidation | Fix 1 reduces occurrence. Fix 3 detects it in logs. |

---

## Consistency Matrix — All 14 Stages

### Stage Category Classification

| Category | Stages | Post-choice behavior | Rationale |
|----------|--------|---------------------|-----------|
| **Finalize** (12) | topik, outline, abstrak, pendahuluan, tinjauan_literatur, metodologi, hasil, diskusi, kesimpulan, pembaruan_abstrak, lampiran, judul | Choice card selection = commit point → MUST finalize (updateStageData → artifact → submit) | These stages present concrete options; user selection means "go ahead with this" |
| **Exploration** (1) | gagasan | Choice card selection = direction exploration → model decides when to commit | Instruction says "Iterate several times until direction is clear" |
| **Special flow** (1) | daftar_pustaka | Has compile flow: `compileDaftarPustaka → artifact → submit` | Bibliography compilation requires server-side dedup/formatting before artifact |

### Tool Chain Coverage

| Stage | Category | Prompt instructions | nextAction create | nextAction update (FIXED) | Post-choice finalize | Observability |
|-------|----------|:---:|:---:|:---:|:---:|:---:|
| gagasan | exploration | ✅ | ✅ submit | ✅ submit | ❌ (by design) | ✅ universal |
| topik | finalize | ✅ | ✅ submit | ✅ submit | ✅ finalize | ✅ universal |
| outline | finalize | ✅ | ✅ submit | ✅ submit | ✅ finalize | ✅ universal |
| abstrak | finalize | ✅ | ✅ submit | ✅ submit | ✅ finalize | ✅ universal |
| pendahuluan | finalize | ✅ | ✅ submit | ✅ submit | ✅ finalize | ✅ universal |
| tinjauan_literatur | finalize | ✅ | ✅ submit | ✅ submit | ✅ finalize | ✅ universal |
| metodologi | finalize | ✅ | ✅ submit | ✅ submit | ✅ finalize | ✅ universal |
| hasil | finalize | ✅ | ✅ submit | ✅ submit | ✅ dedicated | ✅ universal + stage-specific |
| diskusi | finalize | ✅ | ✅ submit | ✅ submit | ✅ finalize (Fix 6) | ✅ universal |
| kesimpulan | finalize | ✅ | ✅ submit | ✅ submit | ✅ finalize (Fix 6) | ✅ universal |
| pembaruan_abstrak | finalize | ✅ | ✅ submit | ✅ submit | ✅ finalize (Fix 6) | ✅ universal |
| daftar_pustaka | special | ✅ | ✅ submit | ✅ submit | ✅ compile path | ✅ universal + stage-specific |
| lampiran | finalize | ✅ | ✅ submit | ✅ submit | ✅ finalize + no-appendix | ✅ universal |
| judul | finalize | ✅ | ✅ submit | ✅ submit | ✅ dedicated | ✅ universal |

**What changed:**
- "nextAction update" column was ❌ across ALL 14 stages before Fix 1
- "Observability" column had blind spots for 12 stages before Fix 3, and revision ordering gaps before Fix 5
- "Post-choice finalize" column: diskusi, kesimpulan, pembaruan_abstrak were ❌ (decision-to-draft fallback) before Fix 6

**What is NOT covered by this session:**
- `gagasan` post-choice stays as `decision-to-draft` — this is intentional (exploration stage)
- `daftar_pustaka` post-choice goes through compile path, not finalize
- End-to-end runtime smoke test for all 14 stages has NOT been performed

---

## Deterministic vs Instruction Classification

Per CLAUDE.md rule `feedback_instruction_vs_deterministic`:

| Fix | Type | Certainty |
|-----|------|-----------|
| Fix 1 (updateArtifact nextAction) | **Deterministic** — tool response always includes the directive | High — every updateArtifact success now tells model to call submit |
| Fix 2 (ARTIFACT_CREATION_FOOTER) | **Instruction** — system prompt guidance | Medium — model may or may not follow, but now covers both paths |
| Fix 3 (universal observability) | **Deterministic** — runtime log detection | High — failures are always detected and logged |
| Fix 4 (revision note) | **Instruction** — system prompt guidance | Medium — reinforces Fix 1 from a different layer |
| Fix 5 (ordering-bug revision coverage) | **Deterministic** — runtime log detection | High — revision ordering bugs now detected |
| Fix 6 (POST_CHOICE_FINALIZE expansion) | **Deterministic** — runtime orchestration | High — 12 stages now enforce tool chain after choice |

---

## What This Does NOT Fix

1. **Model non-compliance**: Even with correct nextAction directives, the model may occasionally not follow through (probabilistic behavior). Fix 1 maximizes the signal strength, but 100% compliance is not guaranteed by instruction alone.
2. **Manual smoke test**: This session performed code audit and structural verification. Runtime smoke testing (actually running all 14 stages end-to-end) was NOT performed. Reviewer MUST run smoke tests per the handoff doc, especially for: gagasan (exploration stage), diskusi, kesimpulan, pembaruan_abstrak (newly added to finalize), daftar_pustaka (compile flow).
3. **Existing stage-specific observability**: The `hasil` post-choice and `daftar_pustaka` specific telemetry blocks remain intact alongside the new universal block. They can be deduplicated in a future cleanup.
4. **gagasan exploration stage**: Post-choice in gagasan still uses `decision-to-draft` fallback. This is intentional — gagasan is iterative brainstorming. If this proves problematic in smoke testing, a dedicated gagasan post-choice handler may be needed.
5. **Single source of truth**: Codex recommended a single helper for stage categorization (which stages finalize, which explore, which use special flow). Currently this is defined in `POST_CHOICE_FINALIZE_STAGES` for runtime orchestration. The reviewer may want to extract this into a shared constant that prompt, footer, choice-request, and telemetry all reference.

---

## Reviewer Checklist

1. **Verify Fix 1**: `src/app/api/chat/route.ts:1702` — updateArtifact nextAction mandates submitStageForValidation
2. **Verify Fix 2**: `src/lib/ai/stage-skill-resolver.ts:6-13` — footer covers create + update paths
3. **Verify Fix 3**: Universal observability blocks BEFORE outcome-gated blocks in both primary and fallback paths
4. **Verify Fix 4**: `src/lib/ai/paper-mode-prompt.ts:261` — revision note says "MANDATORY SEQUENCE"
5. **Verify Fix 5**: All 4 ordering-bug checks use `sawCreateArtifactSuccess || sawUpdateArtifactSuccess`
6. **Verify Fix 6**: `src/lib/chat/choice-request.ts` — POST_CHOICE_FINALIZE_STAGES has 12 stages, comments document gagasan/daftar_pustaka exclusions
7. **Run build**: `npx next build` should exit 0
6. **Run tests**: `npx vitest run src/lib/ai/stage-skill-resolver.test.ts src/lib/ai/stage-skill-validator.test.ts src/lib/chat/__tests__/choice-request.test.ts` should all pass
7. **Smoke test priority stages**: gagasan (first draft), topik (revision flow), metodologi (revision flow), daftar_pustaka (compile + artifact flow)
8. **Non-regression**: Verify non-paper chat still works, choice cards still appear in drafting stages, completed sessions don't show validation panel
