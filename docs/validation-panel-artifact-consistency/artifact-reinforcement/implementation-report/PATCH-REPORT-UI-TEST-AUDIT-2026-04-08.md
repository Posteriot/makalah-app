# Patch Report — Response to Codex UI Test Audit + Stage Skills & System Prompt Fix

**Date:** 2026-04-08
**Branch:** `validation-panel-artifact-consistency`
**Base:** `199e4238` (chore: add screesnshots/ to gitignore — post branch cleanup)
**Head:** `ba699434` (feat: update 14 stage skills + system prompt with revision contract)
**Triggered by:** Codex UI test audit findings — root cause: skill drift in instruction layer

---

## 1. Context

Codex performed a UI test audit on the artifact lifecycle implementation. Backend versioning was confirmed working (v2 created correctly). However, the model required repeated prompting to execute revision flow correctly.

**Root cause identified by Codex:** Active DB stage skills and system prompt were stale — they did not mention `requestRevision` or include revision contract. Since the stage-skill-resolver serves skill content as the dominant prompt (when `stageInstructionSource: 'skill'`), the model received conflicting instructions: `paper-mode-prompt.ts` said "call requestRevision first", but the active skill didn't acknowledge that tool exists.

**4 Codex findings:**
1. Skill/system prompt stale — no `requestRevision`, most missing `updateArtifact`
2. Backend versioning working (v2 exists) — NOT a backend bug
3. Stage-skill-validator doesn't enforce revision contract — stale skills pass validation
4. Model leaks "kendala teknis" narration after successful tool chain

---

## 2. Approach

Three-layer fix:
1. **Validator enforcement** — validator rejects skills missing `requestRevision`/`updateArtifact` → forces fallback to safe instructions
2. **Resolver footer safety net** — even when skill passes validation, footer appends revision rules
3. **DB content fix** — update all 14 stage skills + system prompt to include revision contract

This means:
- **Before patch:** Skills stale → pass validator → dominate prompt → no revision awareness
- **After patch:** Skills updated → pass validator WITH revision contract → dominate prompt WITH correct lifecycle rules
- **Safety net:** Even if future skills drift again, validator rejects them → fallback includes revision rules via `paper-mode-prompt.ts`

---

## 3. Commits

| # | SHA | Message | Files changed |
|---|-----|---------|---------------|
| 1 | `01c42797` | `feat: enforce revision contract in stage-skill validator` | stage-skill-validator.ts, stage-skill-validator.test.ts, stage-skill-resolver.test.ts |
| 2 | `b23e72ba` | `feat: add requestRevision + response discipline to resolver footer` | stage-skill-resolver.ts, stageSkills.test.ts |
| 3 | `ba699434` | `feat: update 14 stage skills + system prompt with revision contract` | 15 files in `.references/system-prompt-skills-active/updated-2/` |

**Stats:** 20 files changed, +1353 insertions, -13 deletions

---

## 4. Per-Commit Detail

### Commit 1: Validator enforcement (`01c42797`)

**File: `src/lib/ai/stage-skill-validator.ts`**

Added two new validation rules to `validateStageSkillContent()` that check the `## Function Tools` section:

```
missing_request_revision_in_function_tools
  → Function Tools wajib menyebut requestRevision untuk stage "${stageScope}".
  → Required for chat-triggered revision during pending_validation.

missing_update_artifact_in_function_tools
  → Function Tools wajib menyebut updateArtifact untuk stage "${stageScope}".
  → Required for revision path (v2/v3 instead of new artifact).
```

**Runtime effect:** When `resolveStageInstructions()` calls `validateStageSkillContent()` and the active DB skill fails these checks, the resolver:
1. Logs a `skill_validation_failed_runtime` conflict to systemAlerts
2. Falls back to `fallbackInstructions` (which comes from `paper-mode-prompt.ts` — already includes revision contract from Task 8)

**File: `src/lib/ai/stage-skill-validator.test.ts`**

- Updated `VALID_GAGASAN_CONTENT` fixture to include `requestRevision` and `updateArtifact` in Function Tools
- Updated diskusi test fixture similarly
- Added 2 new tests:
  - `rejects content missing requestRevision in Function Tools`
  - `rejects content missing updateArtifact in Function Tools`
- Fixed `createArtifact` rejection test to use regex replacement (fixture text changed)

**File: `src/lib/ai/stage-skill-resolver.test.ts`**

- Updated mock skill content fixture to include `requestRevision` and `updateArtifact`

**Tests:** 14/14 validator tests pass, 3/3 resolver tests pass

---

### Commit 2: Resolver footer safety net (`b23e72ba`)

**File: `src/lib/ai/stage-skill-resolver.ts`**

Expanded `ARTIFACT_CREATION_FOOTER` (appended to every skill that passes validation) with two new blocks:

```
⚠️ REVISION FROM CHAT (applies when stageStatus is pending_validation):
- If user requests changes via chat → call requestRevision(feedback) FIRST.
- After requestRevision succeeds → updateArtifact → submitStageForValidation.
- Do NOT call updateStageData, createArtifact, or updateArtifact while still pending_validation.
- createArtifact is ONLY for first draft or exceptional fallback when artifact is missing/invalid.

⚠️ POST-TOOL RESPONSE DISCIPLINE:
- If tool chain succeeds → respond with 1-2 short sentences confirming success.
- Do NOT mention internal errors, retries, or technical issues if the final result succeeded.
- Do NOT repeat artifact content in chat — user reviews it in the artifact panel.
```

**Design rationale:** Even when a DB skill passes validation (mentions the tools), it might not have the full behavioral contract. The footer ensures the revision lifecycle rules are always present regardless of skill content quality.

**File: `convex/stageSkills.test.ts`**

- Updated skill content fixture to include `requestRevision` and `updateArtifact` (the stageSkills publish mutation calls the validator, so fixtures must pass)

**Tests:** 3/3 stageSkills tests pass

---

### Commit 3: Update 14 stage skills + system prompt (`ba699434`)

**15 files in `.references/system-prompt-skills-active/updated-2/`**

These are the source-of-truth files for DB deployment.

#### Changes to all 14 stage skills:

**Function Tools section — 2 tools added to Allowed list:**

```
- requestRevision — call FIRST when user requests changes via chat during pending_validation. Transitions to revision mode.
- updateArtifact — create new version of existing artifact during revision (do NOT use createArtifact for revisions)
```

Placed after `createArtifact` and before `submitStageForValidation`.

**Exception:** `03-outline-skill.md` already had `updateArtifact` — only `requestRevision` was added.

**Guardrails section — REVISION CONTRACT block added:**

```
REVISION CONTRACT:
- If stageStatus is pending_validation and user requests changes via chat: call requestRevision(feedback) FIRST, then updateArtifact → submitStageForValidation in the SAME turn.
- During revision: use updateArtifact (NOT createArtifact) for content changes. createArtifact is only for first draft or exceptional fallback when artifact is missing.
- After successful tool chain: respond with MAX 2-3 short sentences. Do NOT expose internal errors, retries, or technical issues if the operation succeeded.
```

**Integration note:** Skills that already had partial revision awareness (e.g., `03-outline-skill.md` line 42: "In revision mode, use updateArtifact (NOT createArtifact)") retained their existing instructions. The REVISION CONTRACT block adds the missing `requestRevision`-first rule and post-tool response discipline.

#### Changes to system-prompt.md:

**FUNCTION TOOLS section — tool added:**

```
- requestRevision({ feedback }) — call when user requests changes via chat during pending_validation. Transitions stage to revision mode.
```

Added after `updateArtifact` in the Available tools list.

**TOOL USAGE FLOW — rule added:**

```
4. If stageStatus is pending_validation and user requests revision via chat: call requestRevision(feedback) FIRST before any other stage tools.
```

Inserted as rule 4, existing rules 4-5 renumbered to 5-6.

---

## 5. Verification

### Automated tests

```
148 test files, 874 tests — ALL PASS
```

Key test files and counts:
- `src/lib/ai/stage-skill-validator.test.ts` — 11 tests (including 2 new: requestRevision + updateArtifact rejection)
- `src/lib/ai/stage-skill-resolver.test.ts` — 3 tests (fixture updated)
- `convex/stageSkills.test.ts` — 3 tests (fixture updated, publish mutation passes validation)
- `convex/paperSessions.test.ts` — 11 tests (unchanged from prior round)

### TypeScript

```
0 new errors (pre-existing JSX namespace error in unstaged file only)
```

### Content verification

| Check | Result |
|-------|--------|
| `requestRevision` in all 14 skills | **15/15** (14 skills + system prompt) |
| `updateArtifact` in all 14 skills | **15/15** (14 skills + system prompt) |
| `REVISION CONTRACT` block in all 14 skills | **14/14** |
| `requestRevision` in system prompt tools list | **Yes** (line 203) |
| `requestRevision` in system prompt TOOL USAGE FLOW | **Yes** (rule 4, line 164) |

---

## 6. Validator Behavior Matrix

What happens at runtime for different skill states:

| Skill state | Validator result | Resolver action | Prompt source |
|-------------|-----------------|-----------------|---------------|
| Skill has `requestRevision` + `updateArtifact` + all other checks | PASS | Use skill content + append footer | Skill (with footer safety net) |
| Skill missing `requestRevision` | FAIL | Log conflict → fallback | `paper-mode-prompt.ts` (has revision contract from Task 8) |
| Skill missing `updateArtifact` | FAIL | Log conflict → fallback | `paper-mode-prompt.ts` |
| No active skill for stage | N/A | Fallback | `paper-mode-prompt.ts` |

**Key insight:** The system is now defense-in-depth:
1. **DB skills** (updated) — primary prompt with full revision contract
2. **Resolver footer** — appended to every skill, reinforces revision rules
3. **Validator** — rejects stale skills → forces fallback
4. **Fallback** (`paper-mode-prompt.ts`) — already has revision contract from Task 8

All four layers must fail simultaneously for the revision contract to be absent from the prompt.

---

## 7. What Reviewer Should Verify

### Code changes (commits 1-2)

- [ ] `stage-skill-validator.ts`: Verify `requestRevision` and `updateArtifact` checks are in the Function Tools validation block (after `createArtifact` check)
- [ ] `stage-skill-resolver.ts`: Verify `ARTIFACT_CREATION_FOOTER` includes REVISION FROM CHAT block and POST-TOOL RESPONSE DISCIPLINE block
- [ ] Test fixtures in all 3 test files updated to include `requestRevision` + `updateArtifact`

### DB content changes (commit 3)

- [ ] All 14 skill files in `updated-2/` have `requestRevision` and `updateArtifact` in Function Tools Allowed list
- [ ] All 14 skill files have `REVISION CONTRACT:` block in Guardrails section
- [ ] `system-prompt.md` lists `requestRevision` in FUNCTION TOOLS Available (line 203)
- [ ] `system-prompt.md` has rule 4 in TOOL USAGE FLOW about requestRevision-first (line 164)
- [ ] No existing content was removed or corrupted — only additions
- [ ] `03-outline-skill.md` retains its existing revision awareness (line 42, 67) plus new `requestRevision` tool

### Cross-reference with Codex findings

| Codex finding | Status | Evidence |
|---------------|--------|----------|
| #1: Skills stale — no requestRevision | **FIXED** | All 15 files now contain `requestRevision` |
| #2: Backend versioning working | **CONFIRMED** — no backend changes made (correct per Codex) | N/A |
| #3: Validator doesn't enforce revision contract | **FIXED** | `missing_request_revision_in_function_tools` + `missing_update_artifact_in_function_tools` checks added |
| #4: Model leaks "kendala teknis" after success | **ADDRESSED** via three layers | Resolver footer discipline + REVISION CONTRACT block in skills + paper-mode-prompt revisionNote (Task 8) |

### Pending (outside this patch)

- [ ] **DB deployment:** Updated skill files in `updated-2/` need to be deployed to Convex DB via admin panel
- [ ] **UI re-test:** After DB deployment, repeat UI test checklist Section B (chat-triggered revision) to verify model now follows revision contract on first attempt without repeated prompting
- [ ] **(Optional)** UX enhancement: version history indicator in sidebar — confirmed not a data bug, just UI showing latest artifact only

---

## 8. File Inventory

### Code files modified

| File | Commit | Change |
|------|--------|--------|
| `src/lib/ai/stage-skill-validator.ts` | 1 | +2 validation rules |
| `src/lib/ai/stage-skill-validator.test.ts` | 1 | +2 tests, fixture update |
| `src/lib/ai/stage-skill-resolver.test.ts` | 1 | Fixture update |
| `src/lib/ai/stage-skill-resolver.ts` | 2 | Footer expanded |
| `convex/stageSkills.test.ts` | 2 | Fixture update |

### DB content files modified (for deployment)

| File | Tools added | REVISION CONTRACT |
|------|-------------|-------------------|
| `01-gagasan-skill.md` | requestRevision, updateArtifact | Added |
| `02-topik-skill.md` | requestRevision, updateArtifact | Added |
| `03-outline-skill.md` | requestRevision (updateArtifact already existed) | Added |
| `04-abstrak-skill.md` | requestRevision, updateArtifact | Added |
| `05-pendahuluan-skill.md` | requestRevision, updateArtifact | Added |
| `06-tinjauan-literatur-skill.md` | requestRevision, updateArtifact | Added |
| `07-metodologi-skill.md` | requestRevision, updateArtifact | Added |
| `08-hasil-skill.md` | requestRevision, updateArtifact | Added |
| `09-diskusi-skill.md` | requestRevision, updateArtifact | Added |
| `10-kesimpulan-skill.md` | requestRevision, updateArtifact | Added |
| `11-pembaruan-abstrak-skill.md` | requestRevision, updateArtifact | Added |
| `12-daftar-pustaka-skill.md` | requestRevision, updateArtifact | Added |
| `13-lampiran-skill.md` | requestRevision, updateArtifact | Added |
| `14-judul-skill.md` | requestRevision, updateArtifact | Added |
| `system-prompt.md` | requestRevision in tools list + TOOL USAGE FLOW rule 4 | N/A (handled via TOOL USAGE FLOW) |
