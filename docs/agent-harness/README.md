# Agent Harness — Incremental Save (v1)

> Status: UNSTABLE. Banyak bug dan kegagalan yang belum resolved.
> Dokumen ini untuk brainstorming ulang di sesi baru.
> Jangan klaim keberhasilan apapun dari implementasi ini.

---

## Apa Ini

Agent harness yang enforce model save stageData per-field secara incremental
via `prepareStep`, bukan mengandalkan model compliance. Scope v1: gagasan + topik.

Terminologi: Agent = Model + Harness. Model provides intelligence, harness
controls timing. Ref: Anthropic "Effective harnesses for long-running agents."

## File Yang Terlibat

| File | Peran |
|------|-------|
| `src/lib/ai/incremental-save-harness.ts` | Core logic: `buildIncrementalSavePrepareStep()` |
| `src/lib/ai/draft-save-fields.ts` | Allowlist fields per stage |
| `src/lib/ai/paper-tools-draft-save.ts` | Warning filter untuk `saveStageDraft` |
| `src/lib/ai/paper-tools.ts` | `saveStageDraft` tool definition (dalam `createPaperTools()`) |
| `src/app/api/chat/route.ts` | Integration: gate, config, note injection, prepareStep chain |
| `src/lib/ai/paper-mode-prompt.ts` | Prompt edit: "system will prompt incremental save" (gagasan/topik) |
| `src/lib/ai/__tests__/draft-save-fields.test.ts` | Tests allowlist (13 tests) |
| `src/lib/ai/__tests__/save-stage-draft.test.ts` | Tests warning filter (5 tests) |
| `src/lib/ai/__tests__/incremental-save-harness.test.ts` | Tests harness logic (13 tests) |
| `src/components/chat/UnifiedProcessCard.tsx` | UI: label duplikasi fix |
| `src/components/chat/ChatWindow.tsx` | Pending indicator loading guard |
| `src/components/chat/MessageBubble.tsx` | Stable key untuk JsonRendererChoiceBlock |

## Arsitektur Saat Ini

### Dua mode harness

**Incremental mode** — ada field draft yang belum complete:
```
step 0: force saveStageDraft (satu field)
step 1: toolChoice "none" (model generate text)
maxToolSteps: 2
```

**Mature save mode** — semua draft fields complete, ringkasan belum ada:
```
step 0: force updateStageData (ringkasan)
step 1: force createArtifact
step 2: force submitStageForValidation
step 3: toolChoice "none" (text response)
maxToolSteps: 4
```

### prepareStep Priority Chain
```
1. Exact source routing     (highest)
2. Sync request             (getCurrentPaperState)
3. Save/submit intent       (user explicitly asks)
4. Incremental save         (this harness)
5. Default undefined         (model decides)
```

### Hard-gate
`saveStageDraft` di-register global tapi execute-time gated via `draftSaveGate.active`.
Gate diaktifkan hanya saat `incrementalSaveConfig` exists. Saat fallback provider,
gate di-deactivate dan `fallbackIncrementalSaveConfig = undefined`.

### Tools

`saveStageDraft` — draft checkpoint, satu field per call:
- Hard-gated (`draftSaveGate.active`)
- Allowlisted fields per stage (`draft-save-fields.ts`)
- Reuse backend `paperSessions.updateStageData` mutation
- Filter "Ringkasan not provided." warning (exact prefix)
- Gak disebut di prompt/stage instructions — harness-only

`updateStageData` — TIDAK DIUBAH. Tetap mature save dengan ringkasan required.

## Bug dan Kegagalan Yang Ditemukan Saat Manual Test

### 1. Search turn generate semua konten tanpa save
**Status: TIDAK TERSELESAIKAN**

Turn 2 (search + compose) generate full analysis (5000+ chars) + choice card
dalam satu turn. Harness gak bisa act karena `enableWebSearch = true`.
`ideKasar` baru ke-save di Turn 3 setelah user interact — itu bukan content
yang model generate di Turn 2, tapi content baru.

Evidence: log `[IncrementalSave]` gak pernah muncul di search turn.
Screenshot: `Screen Shot 2026-03-30 at 22.39.26.png`, `22.41.02.png`

Implikasi: model de facto generate bulk content di compose phase,
harness cuma save retroactively.

### 2. Pending indicator duplikat di awal paper flow
**Status: PARTIALLY FIXED, MUNGKIN MASIH ADA**

`PendingAssistantLaneIndicator` muncul bersamaan `UnifiedProcessCard` saat
session belum ada (`isPaperMode = false` karena `!!session = false`).

Fix: tambah `isPaperSessionLoading` guard + `shouldPreferUnifiedPaperLoadingUi`.
Tapi fix ini belum di-verify menyeluruh. Root cause: `isPaperMode` depends on
Convex query yang bisa `null` (no session yet) vs `undefined` (loading).

Evidence: `Screen Shot 2026-03-30 at 21.43.01.png`, `21.49.36.png`, `21.54.01.png`

### 3. yaml-spec card gak render di incremental turn
**Status: FIX APPLIED, BELUM DI-VERIFY**

Step 1 prepareStep awalnya set `activeTools: []` — model kehilangan paper
workflow context dan stop generate yaml-spec interactive cards.

Fix: hapus `activeTools` restriction di step 1, cuma set `toolChoice: "none"`.
Plus update system note supaya bilang "continue naturally with yaml-spec."

Evidence: `Screen Shot 2026-03-30 at 23.02.30.png`
Belum ada screenshot yang confirm yaml-spec card muncul setelah fix.

### 4. Choice card button masih active setelah konfirmasi
**Status: FIX APPLIED, BELUM DI-VERIFY**

`stageData` changes dari `saveStageDraft` trigger `taskSummary` recompute
di MessageBubble → cascading rerender → `JsonRendererChoiceBlock` remount →
`localSubmitted` state reset.

Fix: tambah stable `key={${message.id}-choice-block}` ke component.
Tapi root cause (frequent rerender dari stageData dependency) masih ada.

Evidence: `Screen Shot 2026-03-30 at 23.06.16.png`

### 5. Artifact gagal di-generate di final turn
**Status: FIX APPLIED, BELUM DI-VERIFY**

Saat semua draft fields complete (4/4), harness return `undefined` (no pending
fields). Model run tanpa enforcement → claim buat artifact tanpa actually
calling tools.

Fix: mature save mode — saat `pendingTasks.length === 0 && !hasRingkasan`,
force `updateStageData` → `createArtifact` → `submitStageForValidation`.

Evidence: `Screen Shot 2026-03-30 at 23.17.13.png`, `23.17.46.png`

### 6. Retroactive task update di bubble lama
**Status: TIDAK TERSELESAIKAN**

MessageBubble derive `taskSummary` dari stageData global terbaru, bukan
snapshot saat message dibuat. Semua bubble ikut update ke progress terkini.

Ini by design di implementasi sekarang (gak ada snapshot mechanism).
Tapi bikin UX confusing — bubble lama tiba-tiba nunjukin 4/4.

Evidence: user report di manual test

### 7. Refs auto-persist terlambat
**Status: TIDAK TERSELESAIKAN (PRE-EXISTING)**

`appendSearchReferences` jalan di `onFinish` (setelah stream selesai).
"Cari referensi awal" baru ke-check setelah response complete, bukan saat
search results arrive.

### 8. Prompt scope terlalu luas (FIXED)

Prompt global bilang "system will prompt incremental save" untuk semua stage.
Fixed: scoped ke "During gagasan and topik stages" saja.

### 9. Exact-source guard terlalu agresif (FIXED)

`availableExactSources.length === 0` block harness di semua turn setelah
search karena exact sources selalu ada. Fixed: guard dihapus, priority
chain handle conflict.

### 10. Fallback reuse stale config (FIXED)

Fallback provider reuse `incrementalSaveConfig` dari primary tanpa recompute.
Fixed: `fallbackIncrementalSaveConfig = undefined`, gate deactivated.

## Keputusan Arsitektur Yang Sudah Diambil

1. **Separate tool `saveStageDraft`** — bukan melonggarkan `updateStageData`.
   Kontrak `updateStageData` (ringkasan required) tetap utuh.

2. **Gagasan + topik only** — stage lain punya field types complex (array,
   enum, nested sections) yang butuh metadata lebih kaya.

3. **No auto-submit di v1** — approval tetap user-initiated.
   TAPI: mature save mode sekarang force submit saat all fields + ringkasan
   complete. Ini de facto auto-submit. Perlu re-evaluate apakah ini yang
   diinginkan.

4. **Harness gak bisa act di search turn** — constraint arsitektural dari
   search orchestrator (web search + function tools mutually exclusive).

## Pertanyaan Terbuka Untuk Sesi Berikutnya

1. **Compose-phase saving**: Bagaimana save content yang di-generate di search
   turn compose phase? Ini gap terbesar — bulk content creation terjadi di
   turn yang harness gak bisa intervensi.

2. **Apakah `saveStageDraft` approach benar?** Field yang di-save di Turn 3
   bukan content dari Turn 2 compose. Model generate content baru. Apakah
   ini acceptable atau harness harus extract dari compose output?

3. **Snapshot vs global stageData untuk task display**: Semua bubble
   retroactively update. Perlu snapshot mechanism?

4. **Auto-submit semantics**: Mature save mode force submit. Apakah ini
   melanggar kontrak "user-initiated approval"?

5. **yaml-spec card reliability**: Apakah model consistently generate yaml-spec
   dengan fix activeTools, atau butuh enforcement tambahan?

6. **Scaling ke stage lain**: Stage selain gagasan/topik punya field array,
   enum, nested. Harness saat ini cuma handle string fields.

7. **Choice card remount**: Stable key fix mungkin gak cukup. Apakah perlu
   lift `localSubmitted` state ke parent atau pakai ref?

## Commits (21 total, banyak fix dan revert)

```
866e4ba7 feat: harness enforces mature save when all draft fields complete
c74cf040 fix: add stable key to JsonRendererChoiceBlock to prevent remount
ca08c5a9 fix: don't restrict activeTools in step 1 — model needs tool context for yaml-spec
77104c4b fix: system note must instruct model to continue natural discussion after save
131b1ac7 Revert "fix: stop incremental harness after one draft save"
b419a727 Revert "fix: hide unified process cards on older paper bubbles"
5296086f fix: hide unified process cards on older paper bubbles
99c85eaf fix: stop incremental harness after one draft save
e088cfcf fix: remove availableExactSources guard that blocked incremental harness
d205fd6e docs: add incremental save design notes and runtime checklist
a71ec2df fix: suppress duplicate loading indicator in paper starter flow
57495083 fix: suppress standalone pending indicator during paper session loading
a8e3da52 fix: remove duplicate "Memproses..." label in UnifiedProcessCard header
906e285c fix: address 3 review findings — prompt scope, exact-source priority, fallback safety
5f58be06 fix: replace any cast with PaperStageId type in harness
b1a1cf59 feat: update prompt for incremental harness-driven saves
c3390dad refactor: remove dead maxToolSteps/fallbackMaxToolSteps variables
9dc25356 feat: integrate incremental save harness into route.ts with gate wiring
ed87f960 feat: add buildIncrementalSavePrepareStep targeting saveStageDraft
6a66a808 feat: add saveStageDraft tool with hard-gate, allowlist, and warning filter
77eced0b feat: add draft save field allowlist helpers for gagasan/topik
```

Rasio feat:fix = 5:14 (belum termasuk reverts). Ini menunjukkan implementasi
penuh masalah dan butuh rethink menyeluruh.
