# Patch Report — Search-Backed Revision Arbitration Rule

**Date:** 2026-04-08
**Branch:** `validation-panel-artifact-consistency`
**Commit:** `d0f4cea5`
**Triggered by:** Codex residual finding — ambiguity between "requestRevision first" and "no tools in search turn"

---

## 1. Problem

Two existing rules create an ambiguity for revision that requires new web search:

- **Rule A (revision contract):** "If pending_validation + user requests changes → requestRevision(feedback) FIRST"
- **Rule B (search invariant):** "Web search and function tools cannot run in the same turn"

When user says "revisi, tambahkan sumber baru yang valid", the model doesn't know:
- Call requestRevision first? (Rule A says yes)
- Search first? (Rule B says no tools in search turn)
- Wait for user to remind? (neither rule addresses this)

This matches the UI test symptom: model needed repeated reminders for search-backed revisions.

---

## 2. Solution: Two-Path Arbitration

```
SEARCH-BACKED REVISION:

PATH A — Revision from existing context (no new search needed):
  → requestRevision(feedback) → updateArtifact → submitStageForValidation
  → All in the SAME turn.

PATH B — Revision that requires new web search:
  → Turn 1: Run web search ONLY. Present findings. No function tools.
  → Turn 2: IMMEDIATELY requestRevision(feedback) → updateArtifact → submitStageForValidation.
  → Do NOT wait for user to remind — continue autonomously.
```

### Why this doesn't violate Rule B

Search and function tools happen in **separate turns**. Rule B ("no web search + function tools in same turn") remains intact. The arbitration rule explicitly branches on whether search is needed, making both paths unambiguous.

### Why "IMMEDIATELY" and "without waiting for user reminder"

The key behavioral gap was: after search completes in Turn 1, the model treated Turn 2 as a fresh context and waited for user instruction instead of auto-continuing the revision chain. The rule explicitly instructs autonomous continuation.

---

## 3. Files Changed

**16 files, +70 insertions, -18 deletions:**

### Code (1 file)

| File | Change |
|------|--------|
| `src/lib/ai/stage-skill-resolver.ts` | Footer REVISION FROM CHAT block: replaced single-path rule with PATH A / PATH B |

#### Final wording in resolver footer:

```
⚠️ REVISION FROM CHAT (applies when stageStatus is pending_validation):
Two paths depending on whether revision needs new web search:

PATH A — Revision from existing context (no new search needed):
  → requestRevision(feedback) → updateArtifact → submitStageForValidation — all in the SAME turn.

PATH B — Revision that requires new web search:
  → Turn 1: Run web search ONLY. Present findings. Do NOT call any function tools.
  → Turn 2: IMMEDIATELY call requestRevision(feedback) → updateArtifact → submitStageForValidation. Do NOT wait for user to remind you — continue autonomously.

This does NOT violate "no web search + function tools in same turn" — search and tools happen in separate turns.
- createArtifact is ONLY for first draft or exceptional fallback when artifact is missing/invalid.
```

### DB content (15 files in `updated-2/`)

| File | Change |
|------|--------|
| `system-prompt.md` | TOOL USAGE FLOW rule 4: replaced single instruction with PATH A / PATH B branch |
| `01-gagasan-skill.md` through `14-judul-skill.md` | REVISION CONTRACT block: replaced first bullet with PATH A / PATH B |

#### Final wording in system prompt (rule 4):

```
4. If stageStatus is pending_validation and user requests revision via chat:
   - PATH A (no new search needed): call requestRevision(feedback) → updateArtifact → submitStageForValidation in the SAME turn.
   - PATH B (revision requires new web search): run web search ONLY in this turn (no function tools). In the NEXT turn, IMMEDIATELY call requestRevision(feedback) → updateArtifact → submitStageForValidation without waiting for user reminder.
   This does not violate "no web search + function tools in same turn" — they happen in separate turns.
```

#### Final wording in all 14 skill REVISION CONTRACT blocks:

```
REVISION CONTRACT:
- If stageStatus is pending_validation and user requests revision via chat:
  PATH A (no new search needed): requestRevision(feedback) → updateArtifact → submitStageForValidation — all in the SAME turn.
  PATH B (revision requires new web search): run search ONLY this turn (no function tools). NEXT turn: IMMEDIATELY requestRevision → updateArtifact → submitStageForValidation without waiting for user reminder.
  This does not violate "no web search + function tools in same turn" — they happen in separate turns.
- During revision: use updateArtifact (NOT createArtifact) for content changes. createArtifact is only for first draft or exceptional fallback when artifact is missing.
- After successful tool chain: respond with MAX 2-3 short sentences. Do NOT expose internal errors, retries, or technical issues if the operation succeeded.
```

---

## 4. Invariant Preservation

| Invariant | Status | Why |
|-----------|--------|-----|
| "Web search and function tools cannot run in the same turn" | **PRESERVED** | PATH B explicitly splits search (Turn 1) and tools (Turn 2) into separate turns |
| "requestRevision before any other stage tools during pending_validation" | **PRESERVED** | Both paths call requestRevision before updateArtifact |
| "createArtifact only for first draft or exceptional fallback" | **PRESERVED** | Unchanged |
| "submitStageForValidation in same turn as artifact tool" | **PRESERVED** | Both paths end with submitStageForValidation |

---

## 5. Verification

### Tests

```
148 test files, 874 tests — ALL PASS
```

No code behavior changed — only instruction content in footer and DB reference files.

### Content consistency

| Check | Count | Expected |
|-------|-------|----------|
| Files with `PATH A` | 15/15 | 14 skills + system prompt |
| Files with `PATH B` | 15/15 | 14 skills + system prompt |
| Files with `requestRevision` | 15/15 | unchanged |
| Files with `updateArtifact` | 15/15 | unchanged |
| Resolver footer has PATH A/B | Yes | verified |

### `updated-2/` status

Files remain in `updated-2/` (same directory). No `updated-3` needed — these files haven't been deployed to DB yet, so patching in-place is correct. When deployed, they'll include both the original revision contract AND the search-backed arbitration rule.

---

## 6. Reviewer Checklist

- [ ] Resolver footer (`src/lib/ai/stage-skill-resolver.ts:16-24`): PATH A / PATH B present, "IMMEDIATELY" keyword in PATH B
- [ ] System prompt (`updated-2/system-prompt.md`, rule 4): Both paths with "without waiting for user reminder"
- [ ] All 14 skills: REVISION CONTRACT block has PATH A / PATH B (grep `PATH B` → 15 hits)
- [ ] Rule B invariant: confirm "no web search + function tools in same turn" is NOT weakened
- [ ] Wording consistency: all 3 layers use the same two-path structure (may differ slightly in verbosity but same semantic contract)
