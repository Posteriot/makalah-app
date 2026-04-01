# Auto-Present Validation Panel — Contract Migration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate the "explicit user confirmation before submit" contract to "auto-present validation panel when draft is ready; user controls advancement via Approve/Revise."

**Architecture:** This is a global contract change, not a local harness fix. `submitStageForValidation` becomes "present draft for user decision" instead of "commit after explicit ask." `approveStage` remains the sole advancement mechanism. Artifact readiness guard added to backend.

**Tech Stack:** TypeScript, Convex mutations, prompt engineering, Vitest.

---

## Contract Definition

**Old contract:**
> submitStageForValidation() ONLY after user EXPLICITLY confirms satisfaction.
> Model must ask, user must agree, then model calls submit.

**New contract:**
> submitStageForValidation() = present draft + artifact to user via validation panel.
> System may call it automatically when stage output is ready for review.
> approveStage() remains the sole action that advances to the next stage.
> User retains full control: Approve & Continue, or Request Revision.

**Invariants that do NOT change:**
- `approveStage` = only way to advance `currentStage`
- `requestRevision` = user sends feedback, AI revises
- `stageStatus: "pending_validation"` = panel visible
- ringkasan is required before submit (existing guard)

**New invariant:**
- artifactId must exist before submit (new guard)

---

## Task 1: Add artifact readiness guard to backend

**Files:**
- Modify: `convex/paperSessions.ts:993-998`
- Test: Buat file test baru atau pakai file Convex test yang sesuai (cek apakah `convex/paperSessions.test.ts` sudah ada; kalau belum, buat baru atau tambahkan ke test file Convex terdekat yang test paperSessions mutations)

**Step 1: Write the failing test**

Add test that calls `submitForValidation` when ringkasan exists but artifactId is missing. Expect error.

```typescript
test("submitForValidation rejects when artifactId is missing", async () => {
  // Setup: session with ringkasan but no artifactId in stageData
  await expect(
    ctx.mutation(api.paperSessions.submitForValidation, { sessionId })
  ).rejects.toThrow("Artifact must be created first")
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run convex/paperSessions.test.ts -t "submitForValidation rejects when artifactId"`
Expected: FAIL (current code only checks ringkasan)

**Step 3: Add artifact guard after ringkasan check**

In `convex/paperSessions.ts`, after the ringkasan guard (line 998), add:

```typescript
const artifactId = currentStageData?.artifactId as string | undefined
if (!artifactId) {
  throw new Error(
    "submitForValidation failed: Artifact must be created first. " +
    "Call createArtifact before submitting for validation."
  )
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run convex/paperSessions.test.ts -t "submitForValidation rejects when artifactId"`
Expected: PASS

**Step 5: Commit**

```bash
git add convex/paperSessions.ts convex/paperSessions.test.ts
git commit -m "fix: add artifact readiness guard to submitForValidation mutation"
```

---

## Task 2: Update primary contract source — prompt file

**Files:**
- Modify: `src/lib/ai/paper-mode-prompt.ts:297`

**Step 1: Change line 297**

Old:
```
- submitStageForValidation() ONLY after user EXPLICITLY confirms satisfaction
```

New:
```
- submitStageForValidation() presents draft + artifact to user for review. System may call it automatically when stage output is ready. User decides via Approve or Revise — do NOT imply stage advancement.
```

**Step 2: Commit**

```bash
git add src/lib/ai/paper-mode-prompt.ts
git commit -m "docs(prompt): update submitStageForValidation contract — auto-present, not explicit-confirm"
```

---

## Task 3: Update foundation.ts — gagasan + topik (hard prohibitions)

**Files:**
- Modify: `src/lib/ai/paper-stages/foundation.ts:120,137,280`

**Step 1: Change line 120 (gagasan tool list)**

Old:
```
- submitStageForValidation() — ONLY after user EXPLICITLY confirms satisfaction
```

New:
```
- submitStageForValidation() — present draft to user for Approve/Revise decision. Do NOT imply stage will advance automatically.
```

**Step 2: Change line 137 (gagasan prohibition)**

Old:
```
❌ Do NOT submit before EXPLICIT confirmation from user
```

New:
```
❌ Do NOT auto-approve or imply stage advancement — user must click Approve & Continue
```

**Step 3: Change line 280 (topik prohibition)**

Old:
```
❌ Do NOT submit before user EXPLICITLY agrees with the topic direction
```

New:
```
❌ Do NOT auto-approve or imply stage advancement — user must click Approve & Continue
```

**Step 4: Commit**

```bash
git add src/lib/ai/paper-stages/foundation.ts
git commit -m "docs(prompt): align gagasan/topik stage instructions to auto-present contract"
```

---

## Task 4: Update core.ts — abstrak, pendahuluan, tinjauan literatur, metodologi

**Files:**
- Modify: `src/lib/ai/paper-stages/core.ts`

**Step 1: Find and replace all soft wording**

Target lines (approximate — verify exact lines before edit):
- Line 84: `If user is satisfied → submitStageForValidation()`
- Line 224: `Submit after user confirms satisfaction`
- Line 370: `Submit after user is satisfied`
- ~Line 503: `Submit after user is satisfied`

Replace each with:
```
When draft + artifact are ready → submitStageForValidation() presents validation panel. User decides via Approve or Revise.
```

**Step 2: Commit**

```bash
git add src/lib/ai/paper-stages/core.ts
git commit -m "docs(prompt): align core stage instructions to auto-present contract"
```

---

## Task 5: Update results.ts — hasil, diskusi, kesimpulan

**Files:**
- Modify: `src/lib/ai/paper-stages/results.ts`

**Step 1: Find and replace all soft wording**

Target lines:
- Line 88: `Submit after user is satisfied`
- Line 224: `Submit after user is satisfied`
- Line 355: `Submit after user is satisfied`

Replace each with:
```
When draft + artifact are ready → submitStageForValidation() presents validation panel. User decides via Approve or Revise.
```

**Step 2: Commit**

```bash
git add src/lib/ai/paper-stages/results.ts
git commit -m "docs(prompt): align results stage instructions to auto-present contract"
```

---

## Task 6: Update finalization.ts — pembaruan abstrak, daftar pustaka, lampiran, judul, outline

**Files:**
- Modify: `src/lib/ai/paper-stages/finalization.ts`

**Step 1: Find and replace all submit wording**

Target lines:
- Line 96: `If user is satisfied → submitStageForValidation()`
- ~Line 249: `If user is satisfied → submitStageForValidation()`
- ~Line 389: `If user is satisfied → submitStageForValidation()`
- ~Line 532: `If user is satisfied → submitStageForValidation()`
- ~Line 671: `If user is satisfied → submitStageForValidation()`

Replace each with:
```
When draft + artifact are ready → submitStageForValidation() presents validation panel. User decides via Approve or Revise.
```

**Step 2: Commit**

```bash
git add src/lib/ai/paper-stages/finalization.ts
git commit -m "docs(prompt): align finalization stage instructions to auto-present contract"
```

---

## Task 7: Update test fixtures

**Files:**
- Modify: `src/lib/ai/stage-skill-validator.test.ts:25,45`
- Modify: `src/lib/ai/stage-skill-resolver.test.ts:52`
- Modify: `convex/stageSkills.test.ts:138,158`

**Step 1: Replace fixture text in all 3 files**

Old (appears in all):
```
- submitStageForValidation — submit for user approval (only after explicit user confirmation)
```

New:
```
- submitStageForValidation — present draft for user review (Approve/Revise). System may auto-present when ready.
```

**Step 2: Run tests to verify fixtures still work**

Run: `npx vitest run src/lib/ai/stage-skill-validator.test.ts src/lib/ai/stage-skill-resolver.test.ts convex/stageSkills.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add src/lib/ai/stage-skill-validator.test.ts src/lib/ai/stage-skill-resolver.test.ts convex/stageSkills.test.ts
git commit -m "test: update fixtures to reflect auto-present validation contract"
```

---

## Task 8: Review runtime regex guard in validator

**Files:**
- Modify: `src/lib/ai/stage-skill-validator.ts:117`

**Step 1: Evaluate the regex**

Current regex:
```typescript
/\bsubmit\s+without\s+user\s+confirmation\b/i,
```

This blocks skill content that says "submit without user confirmation." Under the new contract, this guard is STILL VALID — we don't want skills that bypass user review entirely. The new contract says system may auto-present the panel, but user still confirms via Approve button.

**Decision:** KEEP the regex as-is. Auto-present ≠ skip user confirmation. The panel IS the confirmation mechanism. "User confirmation" dalam konteks regex ini berarti **keputusan user melalui validation panel** (klik Approve atau Revise), bukan persetujuan eksplisit di percakapan sebelum model memanggil submit.

**Step 2: No code change needed. Document the decision.**

Add a comment above line 117:

```typescript
// Guard still valid under auto-present contract: auto-present shows
// the panel, but user must still Approve/Revise. "submit without user
// confirmation" means bypassing the panel entirely — still forbidden.
// "User confirmation" = decision via validation panel, NOT explicit
// chat approval before the submit call.
```

**Step 3: Commit**

```bash
git add src/lib/ai/stage-skill-validator.ts
git commit -m "docs: clarify regex guard validity under auto-present contract"
```

---

## Task 9: Update migration/seed content

**Files:**
- Modify: `convex/migrations/updateStageSkillToolPolicy.ts:63`
- Modify: `convex/migrations/seedPembaruanAbstrakSkill.ts:55`

**Step 1: Update hardcoded text in updateStageSkillToolPolicy.ts line 63**

Old:
```
- submitStageForValidation — submit for user approval (only after explicit user confirmation)
```

New:
```
- submitStageForValidation — present draft for user review (Approve/Revise). System may auto-present when ready.
```

**Step 2: Update hardcoded text in seedPembaruanAbstrakSkill.ts line 55**

Old:
```
- submitStageForValidation — after user agrees with the revision
```

New:
```
- submitStageForValidation — present revised draft for user review (Approve/Revise)
```

**Step 3: Update hardcoded text in updateDocumentationChatAgentS5.ts line 83**

Old:
```
{ text: "AI hanya boleh submit validasi ketika user sudah menyatakan setuju." }
```

New:
```
{ text: "AI boleh auto-present validation panel saat draft siap. User memutuskan lewat Approve atau Revise." }
```

**Step 4: Note on updatePromptWithPaperWorkflow.ts**

This file has idempotency guard that prevents re-run on already-migrated data. The wording (lines 54, 61) describes workflow steps: "Kirim draft untuk validasi user" and "Minta persetujuan user" — still accurate under the new contract (submitting still sends to user for validation). **No change needed.**

**Step 5: Commit**

```bash
git add convex/migrations/updateStageSkillToolPolicy.ts convex/migrations/seedPembaruanAbstrakSkill.ts convex/migrations/updateDocumentationChatAgentS5.ts
git commit -m "fix: align migration seed text to auto-present validation contract"
```

---

## Task 10: Update agent harness README — architecture decision

**Files:**
- Modify: `docs/agent-harness/README.md` (Keputusan Arsitektur section, around line 197)

**Step 1: Rewrite point #3**

Old:
```
3. **No auto-submit di v1** — approval tetap user-initiated.
   TAPI: mature save mode sekarang force submit saat all fields + ringkasan
   complete. Ini de facto auto-submit. Perlu re-evaluate apakah ini yang
   diinginkan.
```

New:
```
3. **Auto-present, user-controlled** — harness auto-calls submitStageForValidation
   saat draft fields complete + ringkasan + artifact ready. Ini trigger validation
   panel (passive UI). Stage advance HANYA lewat user click Approve & Continue.
   Kontrak: submitStageForValidation = present for review, bukan commit.
   Backend guard: ringkasan + artifactId required sebelum submit diterima.
```

**Step 2: Commit**

```bash
git add docs/agent-harness/README.md
git commit -m "docs: update architecture decision — auto-present replaces no-auto-submit"
```

---

## Task 11: Add regression tests for new contract

**Files:**
- Buat file test baru atau pakai file Convex test yang sesuai (sama seperti Task 1 — gunakan file test yang sama)

**Step 1: Write tests**

```typescript
// Contract: submitForValidation does NOT advance stage
test("submitForValidation sets pending_validation but does not change currentStage", async () => {
  // Setup: session in gagasan, drafting, with ringkasan + artifactId
  await ctx.mutation(api.paperSessions.submitForValidation, { sessionId })
  const session = await ctx.query(api.paperSessions.get, { sessionId })
  expect(session.stageStatus).toBe("pending_validation")
  expect(session.currentStage).toBe("gagasan") // NOT advanced
})

// Contract: only approveStage advances
test("approveStage advances currentStage from pending_validation", async () => {
  // Setup: session in pending_validation
  await ctx.mutation(api.paperSessions.approveStage, { sessionId, userId })
  const session = await ctx.query(api.paperSessions.get, { sessionId })
  expect(session.currentStage).toBe("topik") // advanced
})

// Contract: submit requires artifact
test("submitForValidation rejects when artifactId missing", async () => {
  // Setup: session with ringkasan but no artifactId
  await expect(
    ctx.mutation(api.paperSessions.submitForValidation, { sessionId })
  ).rejects.toThrow("Artifact must be created first")
})
```

**Step 2: Run tests**

Run: `npx vitest run convex/paperSessions.test.ts`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add convex/paperSessions.test.ts
git commit -m "test: add regression tests for auto-present validation contract"
```

---

## Execution Order

```
1. Task 1  — Backend artifact guard (enables safe auto-present)
2. Task 2  — Primary contract source (prompt file)
3. Task 3  — foundation.ts (gagasan/topik — strongest wording)
4. Task 4  — core.ts (4 stages)
5. Task 5  — results.ts (3 stages)
6. Task 6  — finalization.ts (5 stages)
7. Task 7  — Test fixtures
8. Task 8  — Runtime regex guard review
9. Task 9  — Migration/seed content
10. Task 10 — README architecture decision
11. Task 11 — Regression tests
```

Tasks 2-6 are independent and could be parallelized.
Task 1 MUST go first (backend guard enables safe contract).
Task 11 MUST go last (validates everything).

---

## Risk Mitigation

**Primary risk:** Model behavior inconsistency if wording not perfectly uniform.
**Mitigation:** Tasks 2-6 use identical replacement text. After all edits, grep
for old patterns to verify zero remnants:

```bash
grep -rn "EXPLICIT.*confirm" src/lib/ai/paper-stages/ src/lib/ai/paper-mode-prompt.ts
grep -rn "after user is satisfied" src/lib/ai/paper-stages/
grep -rn "only after explicit user confirmation" src/ convex/
grep -rn "hanya boleh submit validasi ketika user sudah" convex/
```

All four greps should return **zero results** after implementation.

**Secondary risk:** Migration re-run overwrites new wording.
**Mitigation:** Task 9 updates migration source text. Idempotency guards prevent
accidental re-run, but source is updated as safety net.
