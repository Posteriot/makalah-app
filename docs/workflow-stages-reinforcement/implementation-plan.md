# Implementation Plan: Stage 11 — Pembaruan Abstrak

**Branch:** `feat/workflow-stages-reinforcement`
**Date:** 2026-03-06
**Design:** [design.md](./design.md)

---

## Execution Order

Steps are grouped by dependency. Steps within a group can be parallelized.

---

### Step 1: Data Foundation (Convex Backend)

**Must complete first — all other steps depend on this.**

#### 1.1 Add stage to STAGE_ORDER and labels

**File:** `convex/paperSessions/constants.ts`

- Insert `"pembaruan_abstrak"` at index 10 (0-based) in `STAGE_ORDER` — after `"kesimpulan"` (index 9), before `"daftar_pustaka"` (currently index 10, shifts to 11)
- Add label in `getStageLabel()`: `pembaruan_abstrak: "Pembaruan Abstrak"`

#### 1.2 Create PembaruanAbstrakData validator

**File:** `convex/paperSessions/types.ts`

Add after `KesimpulanData` (around line 185). Note: `WebSearchReferenceShape` is defined at lines 8-12 as a file-local `const` (not exported), but it's in-scope for all validators in the same file.

```typescript
// Phase 5: Refinement
export const PembaruanAbstrakData = v.object({
    ringkasan: v.optional(v.string()),
    ringkasanDetail: v.optional(v.string()),
    ringkasanPenelitianBaru: v.optional(v.string()),
    perubahanUtama: v.optional(v.array(v.string())),
    keywordsBaru: v.optional(v.array(v.string())),
    wordCount: v.optional(v.number()),
    webSearchReferences: v.optional(v.array(v.object(WebSearchReferenceShape))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});
```

#### 1.3 Add to schema stageData

**File:** `convex/schema.ts`

Add `pembaruan_abstrak: v.optional(PembaruanAbstrakData)` in the stageData object, between `kesimpulan` and `daftar_pustaka`. Import `PembaruanAbstrakData` from types.

#### 1.4 Add whitelist entry

**File:** `convex/paperSessions/stageDataWhitelist.ts`

Add between `kesimpulan` and `daftar_pustaka`:

```typescript
pembaruan_abstrak: [
    "ringkasan", "ringkasanDetail", "ringkasanPenelitianBaru",
    "perubahanUtama", "keywordsBaru", "wordCount",
    "webSearchReferences", "artifactId", "validatedAt", "revisionCount"
],
```

#### 1.5 Add to stageSkills validator

**File:** `convex/stageSkills.ts`

Add `v.literal("pembaruan_abstrak")` to the `stageScopeValidator` union.

**File:** `convex/stageSkills/constants.ts`

- Add `"pembaruan_abstrak"` to `STAGE_SCOPE_VALUES` at index 10 (after `"kesimpulan"`)
- Add `"pembaruan_abstrak"` to `PASSIVE_SEARCH_STAGES` in this file (lines 28-36). **NOTE:** This is a DUPLICATE definition — `src/lib/ai/stage-skill-contracts.ts` has its own copy. Both MUST be updated in Step 2.4.

**Checkpoint:** Run `npx convex dev` to verify schema compiles. TypeScript should now flag missing switch cases.

---

### Step 2: AI Logic (can parallelize sub-steps)

#### 2.1 Create stage instructions

**File:** `src/lib/ai/paper-stages/finalization.ts`

Add `PEMBARUAN_ABSTRAK_INSTRUCTIONS` constant. Key content:

- **TAHAP:** Pembaruan Abstrak
- **PERAN:** Reviser yang menyelaraskan abstrak awal dengan hasil aktual
- **KONTEKS:** Data Abstrak (Stage 4) + semua data Stage 5–10 tersedia. WAJIB jadikan rujukan.
- **PRINSIP:**
  1. BANDINGKAN abstrak awal vs data aktual — identifikasi mismatch
  2. JANGAN rewrite from scratch — preserve research vision, update specifics
  3. HIGHLIGHT perubahan via `perubahanUtama` array
  4. Review keywords — update hanya jika konten berubah signifikan
  5. Soft word count 150-300 kata
- **ALUR:** Review → Identify misalignments → Propose updated draft → Discuss → Save
- **OUTPUT:** `ringkasanPenelitianBaru`, `perubahanUtama`, `keywordsBaru`, `wordCount`
- **TOOLS:** MODE PASIF (google_search hanya jika user minta eksplisit)
- **RINGKASAN WAJIB:** Max 280 char — perubahan utama yang dilakukan

#### 2.2 Register in instructions dispatcher

**File:** `src/lib/ai/paper-stages/index.ts`

- Import `PEMBARUAN_ABSTRAK_INSTRUCTIONS` from `"./finalization"`
- Add case in `getStageInstructions()`:
  ```typescript
  case "pembaruan_abstrak":
      return PEMBARUAN_ABSTRAK_INSTRUCTIONS;
  ```
- Add re-export at bottom

#### 2.3 Add stage data formatter

**File:** `src/lib/ai/paper-stages/formatStageData.ts`

- Add `PembaruanAbstrakData` type import and add `pembaruan_abstrak?: PembaruanAbstrakData` to `StageData` interface (lines 32-47)
- Create `formatPembaruanAbstrakData()` function following existing patterns (e.g., `formatKesimpulanData` at line 483):
  - Header: `=== TAHAP 11: Pembaruan Abstrak [STATUS] ===`
  - Show `ringkasanPenelitianBaru` (truncated in summary mode)
  - Show `perubahanUtama` as bulleted list
  - Show `keywordsBaru` if present
  - Show `wordCount`
- Add case `"pembaruan_abstrak"` in `formatActiveStageData()` switch (line 211-240, before `"daftar_pustaka"`)
- **CRITICAL: Update TAHAP number STRINGS** (these are rendered output, not comments — they appear in AI prompt context):
  - Line 508: `TAHAP 11` → `TAHAP 12` (formatDaftarPustakaData)
  - Line 555: `TAHAP 12` → `TAHAP 13` (formatLampiranData)
  - Line 595: `TAHAP 13` → `TAHAP 14` (formatJudulData)
  - Also update function doc comments at lines 502, 549, 589

#### 2.4 Add to search policy

**File:** `src/lib/ai/stage-skill-contracts.ts`

Add `"pembaruan_abstrak"` to `PASSIVE_SEARCH_STAGES` array (after `"kesimpulan"`). **IMPORTANT:** This file is a DUPLICATE of `convex/stageSkills/constants.ts` lines 28-36. Both updated in this plan (Step 1.5 + Step 2.4).

#### 2.5 Add hasCompleteData case

**File:** `src/app/api/chat/route.ts`

Find the `hasCompleteData()` switch and add:

```typescript
case "pembaruan_abstrak": {
    const data = stageData.pembaruan_abstrak as { ringkasanPenelitianBaru?: string } | undefined;
    return !!data?.ringkasanPenelitianBaru;
}
```

#### 2.6 Update fallback system prompt

**File:** `src/lib/ai/chat-config.ts`

Line 23: Change `"(13 tahap: gagasan → judul)"` to `"(14 tahap: gagasan → judul)"` in `getMinimalFallbackPrompt()`.

**Checkpoint:** TypeScript should compile clean. All switch exhaustive checks satisfied.

---

### Step 3: Export System

#### 3.1 Update content compiler

**File:** `src/lib/export/content-compiler.ts`

Change abstract resolution (line ~96):

```typescript
// Before
const abstract = stageData.abstrak?.ringkasanPenelitian ?? null;
const keywords = stageData.abstrak?.keywords ?? null;

// After — prefer updated abstract
const abstract = stageData.pembaruan_abstrak?.ringkasanPenelitianBaru
    ?? stageData.abstrak?.ringkasanPenelitian
    ?? null;
const keywords = stageData.pembaruan_abstrak?.keywordsBaru
    ?? stageData.abstrak?.keywords
    ?? null;
```

#### 3.2 Update validation message

**File:** `src/lib/export/validation.ts`

Change `"Selesaikan semua 13 tahap"` → `"Selesaikan semua 14 tahap"` (or better: use `STAGE_ORDER.length` dynamically).

**Checkpoint:** Export path compiles and handles both old (no pembaruan_abstrak) and new sessions.

---

### Step 4: UI Updates

#### 4.1 Fix hardcoded "/13" → dynamic

**Files and locations:**

| File | Line(s) | Change |
|------|---------|--------|
| `src/components/chat/mobile/MobileProgressBar.tsx` | 54 | `{stageNumber}/13` → `{stageNumber}/{STAGE_ORDER.length}` |
| `src/components/chat/mobile/MobilePaperSessionsSheet.tsx` | 244 | Same pattern |
| `src/components/chat/sidebar/SidebarPaperSessions.tsx` | 502, 514, 682, 740 | Same pattern (4 locations) |

Import `STAGE_ORDER` from `convex/paperSessions/constants` in each file (if not already imported).

#### 4.2 Update SidebarProgress comments

**File:** `src/components/chat/sidebar/SidebarProgress.tsx`

- Line 232: `"13 paper writing stages"` → `"paper writing stages"` (generic)
- Line 238: `"13 stages with states"` → `"stages with states"` (generic)

**Note:** SidebarProgress already renders dynamically via `STAGE_ORDER.map()` and `STAGE_ORDER.length`. No logic changes needed — only comments.

#### 4.3 Update admin UI descriptions

**File:** `src/components/admin/StageSkillsManager.tsx`

Line 120: Change `"13 stage paper workflow"` → use `STAGE_ORDER.length` or `"14 stage"`.

**File:** `src/components/ai-ops/aiOpsConfig.ts`

Line 50: Change `"workflow 13 stage"` → `"workflow 14 stage"` in `headerDescription`.

**Checkpoint:** All UI components render 14 stages correctly. "/14" shown in badges and labels.

---

### Step 5: Documentation

#### 5.1 Update CLAUDE.md

- Update "13-stage" references to "14-stage"
- Update Phase listing to include Phase 5 (Refinement): Pembaruan Abstrak
- Update stage count in paperSessions table description
- Update Paper Writing Workflow section

#### 5.2 Update reference docs

**File:** `.references/paper-workflow/README.md`

Update workflow documentation to include new stage.

**File:** `.references/paper-workflow/files-index.md`

Add new file references.

---

### Step 6: Verification

#### 6.1 TypeScript compilation

```bash
npm run build
```

Must pass with zero errors. TypeScript exhaustive checks will catch any missing switch cases.

#### 6.2 Convex schema validation

```bash
npx convex dev
```

Schema must push successfully.

#### 6.3 Manual test scenarios

1. **New session:** Start paper → progress through all 14 stages → verify stage 11 works
2. **Rewind from stage 12:** Verify rewind to stages 10 and 11 works
3. **Export:** Complete session → export Word/PDF → verify updated abstract used
4. **Backward compat:** Existing session at stage 11 (old = daftar_pustaka) → verify no breakage
5. **UI:** Check progress timeline shows 14 stages, badges show "/14"

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Existing sessions break | Low | High | All changes are additive; `v.optional()` ensures backward compat |
| Switch exhaustive miss | Low | Medium | TypeScript compiler catches these |
| Hardcoded "13" missed | Low | Low | Grep-verified: 6 UI `/13`, 1 validation msg, 1 fallback prompt, 2 admin descriptions, 3 TAHAP strings |
| Duplicate constants out of sync | Medium | Medium | Both PASSIVE_SEARCH_STAGES copies documented; update in lockstep (Step 1.5 + 2.4) |
| AI instructions quality | Medium | Medium | Iterative prompt tuning after deployment |
| Export abstract source wrong | Low | High | Fallback chain ensures original abstract always available |

## Estimated Change Scope

- **Files modified:** ~22
- **New code:** ~150 lines (instructions + formatter + validator)
- **Modified code:** ~80 lines (switch cases, imports, literals, TAHAP strings)
- **Hardcoded fix:** ~15 lines (UI "/13" → dynamic, admin descriptions, fallback prompt)
