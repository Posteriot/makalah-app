# Fix Agent Harness README Inaccuracies — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Correct 4 verified inaccuracies in `docs/agent-harness/README.md` based on codebase verification.

**Architecture:** Pure documentation edits — no code changes. Each fix is an isolated text edit to README.md.

**Tech Stack:** Markdown only.

---

## Verified Fixes Needed

| # | Issue | Severity |
|---|-------|----------|
| 1 | Test count: harness test file has 14 tests, README says 13 | Minor |
| 2 | Git history: README says "21 total" but only covers harness commits, not full branch (63 total) | Moderate |
| 3 | AUTO_PERSIST_FIELDS undocumented | Moderate |
| 4 | prepareStep priority chain: level 3 uses `forcedToolChoice`, not prepareStep | Minor |

---

### Task 1: Fix test count

**Files:**
- Modify: `docs/agent-harness/README.md:29`

**Step 1: Edit the test count**

Change line 29 from:
```
| `src/lib/ai/__tests__/incremental-save-harness.test.ts` | Tests harness logic (13 tests) |
```
to:
```
| `src/lib/ai/__tests__/incremental-save-harness.test.ts` | Tests harness logic (14 tests) |
```

**Step 2: Commit**

```bash
git add docs/agent-harness/README.md
git commit -m "docs: fix harness test count — 14 tests, not 13"
```

---

### Task 2: Fix git history scope and numbers

**Files:**
- Modify: `docs/agent-harness/README.md:218-245`

**Step 1: Update the commits section header and closing note**

Change line 218 from:
```
## Commits (21 total, banyak fix dan revert)
```
to:
```
## Commits Terkait Incremental Save (21 dari 63 total branch commits)
```

Change lines 244-245 from:
```
Rasio feat:fix = 5:14 (belum termasuk reverts). Ini menunjukkan implementasi
penuh masalah dan butuh rethink menyeluruh.
```
to:
```
Rasio feat:fix di atas = 5:14 (belum termasuk reverts). Branch secara
keseluruhan punya 63 commits (feat:fix 13:26, 4 reverts) termasuk
UnifiedProcessCard, plan/task/queue UI, dan design docs.

Rasio fix-heavy ini menunjukkan implementasi penuh masalah dan butuh
rethink menyeluruh.
```

**Step 2: Commit**

```bash
git add docs/agent-harness/README.md
git commit -m "docs: clarify commit scope — 21 harness commits out of 63 total branch"
```

---

### Task 3: Document AUTO_PERSIST_FIELDS mechanism

**Files:**
- Modify: `docs/agent-harness/README.md` (insert after line 75, before Hard-gate section ends)

**Step 1: Add AUTO_PERSIST_FIELDS subsection**

Insert after the `saveStageDraft` tool bullet list (after line 75 "Gak disebut di prompt/stage instructions — harness-only") and before the `updateStageData` line:

```markdown

### Auto-persist fields (harness skip list)
Server-side `appendSearchReferences` otomatis persist beberapa field tanpa
bantuan model. Harness skip field ini saat hitung pending tasks:
- gagasan: `referensiAwal`
- topik: `referensiPendukung`

Definisi: `incremental-save-harness.ts` lines 9-12 (`AUTO_PERSIST_FIELDS`).
```

**Step 2: Commit**

```bash
git add docs/agent-harness/README.md
git commit -m "docs: document AUTO_PERSIST_FIELDS skip mechanism in harness"
```

---

### Task 4: Clarify prepareStep priority chain

**Files:**
- Modify: `docs/agent-harness/README.md:55-61`

**Step 1: Update the priority chain to reflect actual mechanism**

Change lines 55-61 from:
```
1. Exact source routing     (highest)
2. Sync request             (getCurrentPaperState)
3. Save/submit intent       (user explicitly asks)
4. Incremental save         (this harness)
5. Default undefined         (model decides)
```
to:
```
1. Exact source routing     (highest, via prepareStep ?? chain)
2. Sync request             (getCurrentPaperState, via prepareStep ?? chain)
3. Incremental save         (this harness, via prepareStep ?? chain)
4. Default undefined         (model decides, implicit fallthrough)

Note: Save/submit intent (user explicitly asks) ditangani via
`forcedToolChoice` parameter terpisah, bukan di prepareStep chain.
Keduanya coexist — forcedToolChoice override toolChoice, prepareStep
override step behavior.
```

**Step 2: Commit**

```bash
git add docs/agent-harness/README.md
git commit -m "docs: fix prepareStep priority chain — save/submit uses forcedToolChoice, not prepareStep"
```

---

## Execution Notes

- Semua task independent, bisa dikerjakan berurutan tanpa dependency.
- Total: 4 edits, 4 commits.
- No code changes, no tests needed.
