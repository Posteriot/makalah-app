# Design Document: Stage 11 — Pembaruan Abstrak

**Branch:** `feat/workflow-stages-reinforcement`
**Date:** 2026-03-06
**Status:** Approved

---

## 1. Motivation

Abstrak yang ditulis di Stage 4 berbasis **proyeksi** — belum ada hasil riil, metodologi final, atau kesimpulan nyata. Setelah seluruh tahap inti (Stage 1–10) disetujui, abstrak perlu diselaraskan dengan temuan aktual. Ini adalah common practice di penulisan akademik.

## 2. Position in Workflow

**Sebelum (13 tahap):**

```
1. Gagasan → 2. Topik → 3. Outline → 4. Abstrak → 5. Pendahuluan →
6. Tinjauan Literatur → 7. Metodologi → 8. Hasil → 9. Diskusi →
10. Kesimpulan → 11. Daftar Pustaka → 12. Lampiran → 13. Judul
```

**Sesudah (14 tahap):**

```
1. Gagasan → 2. Topik → 3. Outline → 4. Abstrak → 5. Pendahuluan →
6. Tinjauan Literatur → 7. Metodologi → 8. Hasil → 9. Diskusi →
10. Kesimpulan → 11. Pembaruan Abstrak → 12. Daftar Pustaka →
13. Lampiran → 14. Judul
```

**Phase mapping:**
- Phase 1 (Foundation): Gagasan, Topik
- Phase 2 (Outline): Outline
- Phase 3 (Core): Abstrak, Pendahuluan, Tinjauan Literatur, Metodologi
- Phase 4 (Results): Hasil, Diskusi, Kesimpulan
- **Phase 5 (Refinement): Pembaruan Abstrak** ← NEW
- Phase 6 (Finalization): Daftar Pustaka, Lampiran, Judul

## 3. Stage Logic

### What Pembaruan Abstrak Does

AI reviews the original abstract (Stage 4 artifact) against all approved stage data (Stages 1–10), then proposes an updated abstract that:

1. Reflects actual methodology (not projected)
2. Incorporates real findings and conclusions
3. Maintains keyword alignment
4. Preserves the core research vision while updating specifics

### Stage Data Structure

```typescript
export const PembaruanAbstrakData = v.object({
    ringkasan: v.optional(v.string()),           // WAJIB for approval (max 280 char)
    ringkasanDetail: v.optional(v.string()),      // Why changes were made (max 1000 char)
    ringkasanPenelitianBaru: v.optional(v.string()), // Updated abstract text (150-300 words)
    perubahanUtama: v.optional(v.array(v.string())), // List of key changes from original
    keywordsBaru: v.optional(v.array(v.string())),   // Updated keywords (if changed)
    wordCount: v.optional(v.number()),            // Word count of updated abstract
    webSearchReferences: v.optional(v.array(v.object({
        url: v.string(),
        title: v.string(),
        publishedAt: v.optional(v.number()),
    }))),
    artifactId: v.optional(v.id("artifacts")),
    validatedAt: v.optional(v.number()),
    revisionCount: v.optional(v.number()),
});
```

### Search Policy: PASSIVE

Pembaruan Abstrak compiles existing data — no new research needed. Search only on explicit user request.

### Daftar Pustaka Compilation

**NOT included** in `DAFTAR_PUSTAKA_SOURCE_STAGES`. This stage updates the abstract, not adds references. If incidental `webSearchReferences` exist, they're already minimal and non-critical.

## 4. Export Resolution

Content compiler uses **prefer-updated** strategy:

```typescript
// Current
const abstract = stageData.abstrak?.ringkasanPenelitian ?? null;
const keywords = stageData.abstrak?.keywords ?? null;

// After change
const abstract = stageData.pembaruan_abstrak?.ringkasanPenelitianBaru
    ?? stageData.abstrak?.ringkasanPenelitian
    ?? null;
const keywords = stageData.pembaruan_abstrak?.keywordsBaru
    ?? stageData.abstrak?.keywords
    ?? null;
```

This is backward-compatible: sessions without Pembaruan Abstrak fall through to original abstract.

## 5. AI Instructions Design

### Role
"Reviser yang menyelaraskan abstrak awal dengan hasil aktual seluruh proses penelitian."

### Key Principles
1. **COMPARE, don't rewrite from scratch** — show original vs proposed side-by-side
2. **Highlight what changed and why** — `perubahanUtama` array
3. **Preserve research vision** — core angle/novelty from Phase 1 must survive
4. **Update specifics** — methodology details, actual findings, real conclusions
5. **Keyword review** — suggest keyword changes only if warranted by content evolution

### Dialog Flow
```
Review original abstract (Stage 4) + all approved data (Stages 5-10)
    ↓
Identify misalignments between abstract and actual content
    ↓
Propose updated abstract with tracked changes
    ↓
Discuss with user: "Ini perubahan yang saya usulkan. Setuju?"
    ↓
[Iterate]
    ↓
updateStageData + createArtifact (updated abstract)
    ↓
submitStageForValidation
```

### Artifact
- Type: `"section"`
- Title: `"Abstrak (Diperbarui) - [Paper Title]"`
- Content: Full updated abstract text

## 6. Rewind Implications

No code changes needed for rewind logic — it's index-based.

**New rewind paths enabled:**
- From Stage 12 (Daftar Pustaka) → can rewind to Stage 10 (Kesimpulan) or 11 (Pembaruan Abstrak)
- From Stage 11 (Pembaruan Abstrak) → can rewind to Stage 9 (Diskusi) or 10 (Kesimpulan)
- From Stage 13 (Lampiran) → can rewind to Stage 11 (Pembaruan Abstrak) or 12 (Daftar Pustaka)

## 7. Backward Compatibility

### Existing Sessions
- Sessions already past Stage 10 (in old workflow) have `currentStage` set to `"daftar_pustaka"`, `"lampiran"`, or `"judul"` — these stage IDs don't change, so existing sessions continue working.
- `pembaruan_abstrak` field in `stageData` is `v.optional()`, so existing sessions without it are valid.
- No migration needed for existing data.

### Stage Number Shift
- `getStageNumber()` uses `indexOf + 1`, so existing stages after insertion point return different numbers:
  - `daftar_pustaka`: 11 → 12, `lampiran`: 12 → 13, `judul`: 13 → 14
- This is cosmetic only — all logic uses stage IDs (strings), not ordinal numbers.
- UI displays (badges, progress) auto-adapt since they derive from STAGE_ORDER.

### Export
- Prefer-updated strategy falls back to original abstract when `pembaruan_abstrak` doesn't exist.

## 8. Impact Summary

### Files to Modify

| Layer | File | Change Type |
|-------|------|-------------|
| **Data** | `convex/paperSessions/constants.ts` | Add stage to STAGE_ORDER at index 10 (0-based) + label |
| **Data** | `convex/paperSessions/types.ts` | Add PembaruanAbstrakData validator (WebSearchReferenceShape is in-scope, not exported) |
| **Data** | `convex/schema.ts` | Add pembaruan_abstrak to stageData + import PembaruanAbstrakData |
| **Data** | `convex/paperSessions/stageDataWhitelist.ts` | Add whitelist entry |
| **Data** | `convex/stageSkills.ts` | Add `v.literal("pembaruan_abstrak")` to stageScopeValidator union |
| **Data** | `convex/stageSkills/constants.ts` | Add to STAGE_SCOPE_VALUES + PASSIVE_SEARCH_STAGES |
| **AI** | `src/lib/ai/paper-stages/finalization.ts` | Add PEMBARUAN_ABSTRAK_INSTRUCTIONS |
| **AI** | `src/lib/ai/paper-stages/index.ts` | Add switch case + import + re-export |
| **AI** | `src/lib/ai/paper-stages/formatStageData.ts` | Add formatter + switch case + TAHAP number strings (see note below) |
| **AI** | `src/lib/ai/stage-skill-contracts.ts` | Add to PASSIVE_SEARCH_STAGES (DUPLICATE — sync with stageSkills/constants.ts) |
| **AI** | `src/app/api/chat/route.ts` | Add case in hasCompleteData() |
| **AI** | `src/lib/ai/chat-config.ts` | Update "13 tahap" in fallback prompt (line 23) |
| **Export** | `src/lib/export/content-compiler.ts` | Prefer-updated abstract resolution |
| **Export** | `src/lib/export/validation.ts` | Update "13 tahap" → use `STAGE_ORDER.length` |
| **UI** | `src/components/chat/mobile/MobileProgressBar.tsx` | `/13` → `/${STAGE_ORDER.length}` |
| **UI** | `src/components/chat/mobile/MobilePaperSessionsSheet.tsx` | `/13` → `/${STAGE_ORDER.length}` |
| **UI** | `src/components/chat/sidebar/SidebarPaperSessions.tsx` | `/13` → dynamic (4 locations) |
| **UI** | `src/components/chat/sidebar/SidebarProgress.tsx` | Update comments (lines 232, 238) |
| **UI** | `src/components/admin/StageSkillsManager.tsx` | Update "13 stage" description (line 120) |
| **UI** | `src/components/ai-ops/aiOpsConfig.ts` | Update "13 stage" description (line 50) |
| **Docs** | `CLAUDE.md` | Update workflow documentation (14 tahap, Phase mapping) |
| **Docs** | `.references/paper-workflow/README.md` | Update workflow documentation |

### TAHAP Number Strings in formatStageData.ts

Formatter functions output rendered strings like `=== TAHAP 11: Daftar Pustaka ===` which are injected into the AI prompt. These are NOT comments — they affect AI behavior. After insertion:

- New: `=== TAHAP 11: Pembaruan Abstrak ===`
- Shift: Daftar Pustaka `TAHAP 11` → `TAHAP 12`, Lampiran `TAHAP 12` → `TAHAP 13`, Judul `TAHAP 13` → `TAHAP 14`

### Duplicate Constants (Sync Risk)

Two files define PASSIVE_SEARCH_STAGES independently:
1. `src/lib/ai/stage-skill-contracts.ts` (frontend)
2. `convex/stageSkills/constants.ts` (backend)

Both MUST be updated in lockstep.

### Files NOT Modified (auto-adapt)
- `PaperStageProgress.tsx` — iterates STAGE_ORDER dynamically
- `PaperSessionBadge.tsx` — uses STAGE_ORDER.length
- `SidebarProgress.tsx` — iterates STAGE_ORDER dynamically, uses STAGE_ORDER.length
- Rewind logic — index-based, auto-scales
- `getNextStage()` / `getPreviousStage()` — index-based
- `getStageNumber()` — indexOf-based
- `PaperStageId` type — derived from STAGE_ORDER
