# Design — F1: Remove Ringkasan Redundancy

> Finding: F1 from `findings.md`
> Status: Design approved (2026-04-03)
> Branch: `feature/paper-sessions-enforcement`

---

## Problem

The model must generate 3 outputs per stage: artifact content, ringkasan (280 chars), and ringkasanDetail (1000 chars). Ringkasan is a short version of the same artifact — redundant. It wastes tokens, wastes model effort, and blocks every other improvement (agentic flow, incremental saves) because ringkasan is REQUIRED in the `updateStageData` schema.

The system prompt injects the same information THREE times per completed stage:
1. `formatStageData` → ringkasan (280 chars)
2. `formatArtifactSummaries` → artifact content (500 chars)
3. Memory digest → ringkasan.slice(0, 200)

---

## Scope

**REMOVE** (generic, redundant — present on all 14 stages):
- `ringkasan` — 280-char stage decision summary
- `ringkasanDetail` — 1000-char elaboration

**KEEP** (stage-specific, used by document export pipeline):
- `ringkasanPenelitian` (AbstrakData) — used in content-compiler.ts:98-100
- `ringkasanHasil` (KesimpulanData) — used in word-builder.ts:485, pdf-builder.ts:693
- `ringkasanPenelitianBaru` (PembaruanAbstrakData) — used in content-compiler.ts:98

These are content fields for the export pipeline, NOT stage summaries. They are unrelated to the generic ringkasan.

---

## Design

### Principle

Artifact is the Single Source of Truth (SSOT) for stage output. Stage context for the AI prompt is derived from artifact content, not from a manually-generated summary field.

### Layer 1: Tool Schema (paper-tools.ts)

**updateStageData tool:**
- Remove `ringkasan: z.string().max(280)` (currently REQUIRED, line 147)
- Remove `ringkasanDetail: z.string().max(1000).optional()` (line 151)
- Minimal save becomes: `{ data: { ...stage-specific fields } }`

**compileDaftarPustaka tool:**
- Remove `ringkasan` and `ringkasanDetail` from inputSchema (lines 260-263)
- Remove runtime guard at lines 280-285 that enforces ringkasan for persist mode
- Remove ringkasan from mergedData construction (line 340)

### Layer 2: Backend Guards (paperSessions.ts)

**submitForValidation (line 979-1026):**
- Remove ringkasan guard (lines 996-1001)
- Keep artifactId guard (lines 1007-1012) — this becomes the ONLY guard
- Guard ordering: just artifactId check

**approveStage (line 1031+):**
- Remove ringkasan guard (lines 1055-1060)
- Keep artifactId guard

**Content budget calculation (lines 1069-1095):**
- Remove entirely. Current implementation is fundamentally broken:
  - Measures 280-char summaries, not actual content length
  - A 3400-word introduction counts as 68 characters
  - 150% threshold almost never triggers
  - `outline.totalWordCount` is optional and often unset
  - No UI displays budget to users
- If budget enforcement is needed later, implement as a separate feature using artifact content length

**Memory digest (lines 1109-1118):**
- Change source from `ringkasan.slice(0, 200)` to `artifact.title`
- Artifact title is descriptive (model writes it), captures the decision, and is stable across content revisions
- Fallback for legacy sessions without artifact: keep `ringkasan.slice(0, 200)` if `artifactId` is absent
- Digest mechanism (array in DB, injection into prompt, compaction safety net) is preserved

```
// Before:
const newDigestEntry = {
    stage: currentStage,
    decision: ringkasan.slice(0, 200),
    timestamp: now,
};

// After:
const artifact = await db.get(artifactId);
const newDigestEntry = {
    stage: currentStage,
    decision: artifact?.title ?? "(no artifact title)",
    timestamp: now,
};
```

**updateStageData warning (lines 724-741):**
- Remove ringkasan-missing warning feedback to AI

**Truncation exclusion (line 376):**
- Remove ringkasan from `EXCLUDED_TRUNCATION_FIELDS`

### Layer 3: Context Builder (formatStageData.ts)

**Remove completed stage summaries from formatStageData:**
- Remove `formatRingkasanTahapSelesai()` function (lines 154-198) and its call from the main `formatStageData()` export
- Remove `truncateRingkasan()` helper (lines 256-261) and `truncateRingkasanDetail()` (lines 147-152)
- Remove `RINGKASAN_CHAR_LIMIT` and `RINGKASAN_DETAIL_CHAR_LIMIT` constants (lines 27, 29)

**Remove ringkasan from 14 stage formatters:**
- Remove `Summary: ${truncateRingkasan(data.ringkasan)}` from each formatter function
- Affected functions (14 total): formatGagasanData, formatTopikData, formatAbstrakData, formatPendahuluanData, formatTinjauanLiteraturData, formatMetodologiData, formatHasilData, formatDiskusiData, formatKesimpulanData, formatPembaruanAbstrakData, formatDaftarPustakaData, formatLampiranData, formatJudulData, formatOutlineData

**Keep `formatArtifactSummaries()` as-is** (lines 761-769):
- Already injects artifact title + content (500 chars) per completed stage
- Already called separately in paper-mode-prompt.ts
- Becomes the SOLE source of completed stage context in the prompt

**Result — system prompt structure after F1:**
```
[formatStageData output]         ← Active stage data ONLY (no completed summaries)
[formatArtifactSummaries output] ← Completed stage context (artifact-based SSOT)
[memory digest]                  ← Decision anchors (artifact.title, compaction safety)
```

### Layer 4: Stage Instructions (paper-stages/*.ts)

Remove from ALL 14 stage instruction files:
- `ringkasanDetail: (optional, max 1000 char)...` from output spec descriptions
- `ringkasan` from `updateStageData({ ringkasan, ... })` call examples
- `⚠️ RINGKASAN REQUIRED — APPROVAL WILL FAIL WITHOUT IT!` (~14 occurrences)
- `⚠️ WARNING: If you do not include the 'ringkasan' field, the user CANNOT approve this stage!` (~14 occurrences)
- `❌ Do NOT forget the 'ringkasan' field when calling updateStageData — approval WILL FAIL!` (~14 occurrences)

Total: ~42 warning lines + ~14 output spec entries + ~14 tool call examples removed.

Files:
- `foundation.ts` — gagasan (lines 99, 116, 124, 130, 141) + topik (lines 240, 257, 265, 271, 282)
- `core.ts` — abstrak (lines 93, 111, 120, 123, 129) + pendahuluan (lines 237, 254, 262, 268, 274) + tinjauan_literatur (lines 381, 399, 407, 413, 419) + metodologi (lines 515, 532, 540, 544, 550)
- `results.ts` — hasil (lines 97, 115, 124, 127, 133) + diskusi (lines 237, 255, 264, 270, 276) + kesimpulan (lines 367, 385, 394, 397, 403)
- `finalization.ts` — pembaruan_abstrak (lines 106, 123, 133, 136, 142) + daftar_pustaka (lines 260, 279, 281, 290, 293, 299) + lampiran (lines 400, 417, 426, 429, 435) + judul (lines 542, 561, 570, 573, 579) + outline (lines 686, 704, 713, 716, 722)

### Layer 5: Type Definitions

**stage-types.ts:**
- Remove `ringkasan?: string` and `ringkasanDetail?: string` from all 14 stage interfaces
- Keep `ringkasanPenelitian`, `ringkasanHasil`, `ringkasanPenelitianBaru` (export fields)

**paperSessions/types.ts:**
- Remove `ringkasan` and `ringkasanDetail` Convex validators from all 14 stage objects

### Layer 6: Data Whitelist (stageDataWhitelist.ts)

- Remove `"ringkasan"` and `"ringkasanDetail"` from the whitelist for all 14 stages

### Layer 7: Admin UI (SessionDetailDialog.tsx)

- Replace ringkasan display (lines 189-334) with artifact title preview
- Badge logic: check `hasArtifactId` instead of `hasRingkasan`
- Expanded detail: show artifact title (fetch if needed)

### Layer 8: Chat Route (route.ts)

- Line 931-932: Replace `hasStageRingkasan` check with `hasArtifactId` check for stage dirty status
- Artifact reminder (lines 2203-2206): keep as-is (still relevant)

### Layer 9: General Prompt (paper-mode-prompt.ts)

- Line 293: Remove ringkasan from compileDaftarPustaka instruction
- Remove any remaining ringkasan references in general rules

### Layer 10: Tests

- `paperSessions.test.ts`: Update submit guard tests — only test artifactId guard
- `stage-data-truncation.test.ts`: Remove ringkasan preservation test
- `ringkasan-detail-injection.test.ts`: Remove or replace entirely
- `format-stage-data-superseded.test.ts`: Update assertions (no ringkasan in output)

---

## Backward Compatibility

**Existing sessions in DB** may have `ringkasan` but no `artifactId` (pre-auto-patch sessions).

**Strategy: no DB migration, graceful fallback.**

- TypeScript types: `ringkasan` becomes absent from interfaces (old data stays in DB, just untyped)
- `formatArtifactSummaries()`: already handles missing artifacts (skips stages without artifactId)
- Memory digest: fallback to `ringkasan.slice(0, 200)` when `artifactId` is absent
- Admin UI: show "(no artifact)" badge when artifactId missing, instead of showing stale ringkasan

---

## Dependency Impact on F2-F5

| Finding | How F1 unblocks it |
|---------|-------------------|
| F2 (Stage roles) | Search allocation instructions can be rewritten without ringkasan requirement conflicts |
| F3 (Agentic flow) | Autonomous agents can `updateStageData` for partial saves without generating ringkasan first |
| F4 (Artifact as workspace) | Artifact is now the SSOT — instructions can direct model to create artifact early |
| F5 (Task progress) | `updateStageData` becomes lightweight — model can call it frequently for incremental updates |

---

## File Impact Summary

| File | Layer | Change Type |
|------|-------|-------------|
| `src/lib/ai/paper-tools.ts` | Tool schema | Remove fields from 2 schemas |
| `convex/paperSessions.ts` | Backend | Remove 3 guards, remove budget, rewrite digest |
| `src/lib/ai/paper-stages/formatStageData.ts` | Context builder | Remove completed summaries + 14 formatter lines |
| `src/lib/ai/paper-stages/foundation.ts` | Instructions | Remove ~10 warning lines |
| `src/lib/ai/paper-stages/core.ts` | Instructions | Remove ~15 warning lines |
| `src/lib/ai/paper-stages/results.ts` | Instructions | Remove ~15 warning lines |
| `src/lib/ai/paper-stages/finalization.ts` | Instructions | Remove ~20 warning lines |
| `src/lib/ai/paper-mode-prompt.ts` | General prompt | Remove ringkasan refs |
| `src/lib/paper/stage-types.ts` | Types | Remove from 14 interfaces |
| `convex/paperSessions/types.ts` | Validators | Remove from 14 validators |
| `convex/paperSessions/stageDataWhitelist.ts` | Whitelist | Remove from 14 whitelists |
| `src/components/ai-ops/panels/SessionDetailDialog.tsx` | Admin UI | Redesign display |
| `src/app/api/chat/route.ts` | Chat route | Replace dirty check |
| `convex/paperSessions.test.ts` | Tests | Update guard tests |
| `__tests__/stage-data-truncation.test.ts` | Tests | Remove ringkasan tests |
| `__tests__/ringkasan-detail-injection.test.ts` | Tests | Remove or replace |
| `__tests__/format-stage-data-superseded.test.ts` | Tests | Update assertions |
