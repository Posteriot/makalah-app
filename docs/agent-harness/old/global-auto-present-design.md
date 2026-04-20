# Global Auto-Present Validation Panel — Design Doc

> Status: DRAFT. Untuk implementasi di branch terpisah setelah semua bugs resolved.
> Prerequisite: auto-present-validation-contract.md sudah merged.

---

## Problem Statement

Auto-present validation panel (force `submitStageForValidation` saat draft ready)
saat ini hanya enforced di runtime untuk **gagasan dan topik** via incremental save
harness mature mode. Untuk 12 stage lainnya (outline → judul), auto-present
bergantung sepenuhnya pada model compliance terhadap instruksi prompt.

Kalau model ignore instruksi, panel gak muncul dan user bingung "habis ini ngapain?"

## Goal

Define arsitektur enforcement global untuk **semua 14 stage**, tetapi rollout
runtime hanya boleh diaktifkan per stage family setelah family itu lulus safety
gate di `readiness-evaluator-spec.md`.

Target akhir:

- `Foundation` tetap ditangani harness v1
- family lain bisa ikut auto-present hanya setelah evaluator readiness-nya `GO`
- incremental save harness tetap scoped ke gagasan/topik untuk per-field saving

## Non-Goals

- Extend incremental per-field save ke stage lain (field types complex, butuh
  design terpisah)
- Mengubah behavior existing harness v1
- Auto-approve (stage advance tetap user-initiated via Approve button)
- Bypass readiness evaluator dengan heuristic generik `ringkasan + artifactId`

---

## Mekanisme Yang Sudah Ada

### 1. Harness mature save (gagasan/topik only)
```
incremental-save-harness.ts → buildIncrementalSavePrepareStep()
  guard: isDraftSaveSupportedStage() → hanya gagasan, topik
  trigger: pendingTasks.length === 0 && !hasRingkasan
  chain: updateStageData → createArtifact → submitStageForValidation → text
```

### 2. shouldForceSubmitValidation (ALL stages, user-initiated only)
```
route.ts:2197-2204
  trigger: isSaveSubmitIntent (user bilang "save/submit/approve")
           && hasStageRingkasan && hasStageArtifact
           && stageStatus === "drafting"
  action: forcedToolChoice = submitStageForValidation
```

### 3. Readiness helpers (ALL stages)
```
route.ts:919-943
  hasStageRingkasan(session) → cek stageData[stage].ringkasan exists & non-empty
  hasStageArtifact(session) → cek stageData[stage].artifactId truthy
```

### 4. Backend guard (ALL stages)
```
convex/paperSessions.ts:submitForValidation
  guard: ringkasan required + artifactId required
  action: set stageStatus = "pending_validation"
```

### 5. UI panel (ALL stages)
```
ChatWindow.tsx:2524
  render: stageStatus === "pending_validation" → PaperValidationPanel
```

## Gap

Untuk stage selain gagasan/topik, setelah model call `updateStageData` +
`createArtifact`, tidak ada mekanisme yang force `submitStageForValidation`.
Model harus inisiatif sendiri. Kalau model stop setelah create artifact tanpa
call submit, panel gak muncul.

---

## Proposed Design: Evaluator-Gated Post-Turn Auto-Present

### Konsep

Tambah **satu check point baru** di route.ts: setelah AI turn selesai, kalau
stage family sudah `GO` menurut `readiness-evaluator-spec.md`, draft dinilai
`ready for review` oleh evaluator deterministik, dan `submitStageForValidation`
belum dipanggil di turn itu, **inject prepareStep di turn berikutnya** yang
force submit.

Ini beda dari harness v1 yang force 4-step chain dalam satu turn. Ini cuma force
**1 tool call** (submit) di turn berikutnya kalau model lupa.

Catatan penting:

- Desain ini **tidak boleh** diaktifkan global sekaligus dengan heuristic
  generik `hasStageRingkasan && hasStageArtifact`
- Implementasi harus phased per family
- Desain ini masih menyisakan keputusan UX terpisah: apakah panel boleh muncul
  di turn berikutnya, atau harus tetap diusahakan muncul bersamaan dengan
  artifact

### Flow

```
Turn N (model):
  1. Model calls updateStageData (ringkasan included) ✓
  2. Model calls createArtifact ✓
  3. Model generate text response
  4. onFinish: check — did model call submitStageForValidation?
     → YES: done, panel will appear
     → NO: set flag "autoPresent pending for next turn"

Turn N+1:
  1. prepareStep check: autoPresent pending?
     → YES: force submitStageForValidation (step 0), then text (step 1)
     → NO: normal behavior
```

### Readiness Condition

```typescript
const readiness = evaluateStageReadiness({
  stage: paperSession?.currentStage,
  stageStatus: paperSession?.stageStatus,
  stageData: currentStageData,
  enableWebSearch,
})

const isReadyForAutoPresent = (
  !enableWebSearch
  && !!paperModePrompt
  && readiness.ready === true
  && !submitCalledThisTurn  // model didn't already call it
)
```

Where:

- `evaluateStageReadiness()` MUST use the family-specific rules from
  `readiness-evaluator-spec.md`
- evaluator output MUST include structured failure reasons for observability
- stages/families still marked `NO-GO` in the spec MUST return `ready: false`

### Dimana Detect `submitCalledThisTurn`?

Option A — **Track di onFinish callback**:
Inspect tool results dari turn yang baru selesai. Kalau ada tool call ke
`submitStageForValidation`, set flag. Kelebihan: clean, gak butuh global state.
Kekurangan: onFinish jalan setelah stream selesai, flag harus persist ke turn
berikutnya.

Option B — **Track di tool execute**:
Saat `submitStageForValidation` tool execute (paper-tools.ts), set flag di
shared context. Di akhir turn, check flag. Kelebihan: real-time detection.
Kekurangan: shared mutable state.

**Rekomendasi: Option A.** Inspect tool results di onFinish, persist readiness
state ke session atau conversation metadata. Di turn berikutnya, route.ts baca
state dan inject prepareStep.

### Persistence

Flag "auto-present pending" perlu survive antar turn. Options:

1. **Convex field di paperSessions** — tambah `autoPresentPending: boolean`.
   Pro: persistent, queryable. Con: migration needed.

2. **In-memory di route.ts** — gak survive antar request. Gak bisa.

3. **Derive dari existing state + readiness evaluator** — kalau evaluator bilang
   `ready === true` dan stage masih `drafting`, itu by definition "ready tapi
   belum submitted." Gak perlu flag baru.

**Rekomendasi: Option 3.** Derive dari existing state. Gak butuh field baru atau
migration. Condition:

```typescript
const readiness = evaluateStageReadiness({
  stage: paperSession?.currentStage,
  stageStatus: paperSession?.stageStatus,
  stageData: currentStageData,
  enableWebSearch,
})

const shouldAutoPresent = (
  !enableWebSearch
  && !!paperModePrompt
  && !shouldForceGetCurrentPaperState
  && !shouldForceSubmitValidation  // not already forced by user intent
  && !incrementalSaveConfig        // not handled by v1 harness
  && readiness.ready === true
)
```

Implementation note:

- `incrementalSaveConfig` should remain the higher-priority path for `Foundation`
- `shouldAutoPresent` should only be reachable for families that are already
  marked runtime-eligible

Kalau `shouldAutoPresent === true`, inject prepareStep yang force submit:

```typescript
const autoPresentPrepareStep = shouldAutoPresent
  ? ({ stepNumber }: { stepNumber: number }) => {
      if (stepNumber === 0) return {
        toolChoice: { type: "tool", toolName: "submitStageForValidation" },
        activeTools: ["submitStageForValidation"],
      }
      if (stepNumber === 1) return { toolChoice: "none" }
      return undefined
    }
  : undefined
```

### Integration di prepareStep Chain

Existing chain (route.ts:2480):
```typescript
prepareStep: (
  primaryExactSourceRoutePlan.prepareStep
  ?? deterministicSyncPrepareStep
  ?? incrementalSaveConfig?.prepareStep
) as any,
```

Becomes:
```typescript
prepareStep: (
  primaryExactSourceRoutePlan.prepareStep
  ?? deterministicSyncPrepareStep
  ?? incrementalSaveConfig?.prepareStep
  ?? autoPresentPrepareStep            // ← NEW: global auto-present
) as any,
```

Priority preserved: exact source > sync > incremental save (v1) > auto-present > default.

---

## Edge Cases

### 1. Model sudah call submit tapi gagal (backend guard reject)
**Scenario:** Model call submitStageForValidation tapi artifact belum ke-link.
Guard reject. Turn selesai. Next turn, `hasStageArtifact` masih false →
`shouldAutoPresent` false. Gak ada infinite loop.

**Resolution:** Model harus fix artifact dulu, atau user intervene.

### 2. Web search turn
**Scenario:** `enableWebSearch = true` → `shouldAutoPresent = false`. Harness
gak bisa act. Sama seperti constraint existing.

**Resolution:** Auto-present trigger di turn berikutnya (non-search turn).

### 3. User sedang revisi, tapi ringkasan + artifact ada dari sebelumnya
**Scenario:** User bilang "revisi bagian X." Model belum update. Tapi ringkasan
+ artifact dari save sebelumnya masih ada. `shouldAutoPresent = true` →
force submit prematur.

**Mitigation:** Check `stageStatus`. Setelah revision, status berubah ke
`"revision"`, bukan `"drafting"`. `shouldAutoPresent` check `stageStatus ===
"drafting"`, jadi revision flow aman.

Koreksi state machine:

- `requestRevision` memang set `stageStatus = "revision"`
- `updateStageData` saat ini **tidak** mengembalikan status ke `"drafting"`

Jadi, setelah user request revision, auto-present **tidak akan hidup lagi**
hanya dengan `updateStageData`. Kalau produk menginginkan panel muncul lagi
setelah revisi selesai, perlu desain tambahan yang eksplisit, misalnya:

- mutation/tool yang menandai revision draft "ready for review" dan mengembalikan
  status ke `drafting`, atau
- evaluator path yang diizinkan berjalan dari status `revision` dengan
  transition yang jelas dan teruji

**Status:** unresolved prerequisite. Jangan implement global auto-present untuk
revision cycle sebelum transition ini didesain.

### 4. Harness v1 stage (gagasan/topik)
**Scenario:** `incrementalSaveConfig` exists → `shouldAutoPresent = false`
(karena `!incrementalSaveConfig` check). Gak ada conflict. V1 harness tetap
handle gagasan/topik, auto-present handle sisanya.

### 5. User explicitly minta submit
**Scenario:** `shouldForceSubmitValidation = true` (user bilang "submit") →
`shouldAutoPresent = false` (karena `!shouldForceSubmitValidation` check).
Gak ada double-trigger.

### 6. Model call submit sendiri di turn yang sama
**Scenario:** Model patuh instruksi, call submit sendiri. Turn selesai.
Next turn, `stageStatus === "pending_validation"` (bukan "drafting") →
`shouldAutoPresent = false`. Gak ada redundant submit.

---

## Kenapa Gak Force Full Chain (updateStageData → createArtifact → submit)?

Karena stage lain punya flow yang lebih complex:
- Model mungkin call `updateStageData` di turn terpisah dari `createArtifact`
- Beberapa stage (daftar_pustaka) pakai `compileDaftarPustaka` bukan
  `createArtifact` langsung
- Force chain assume semua belum ada, tapi di practice model sering udah save
  ringkasan + create artifact sebelum auto-present detect

Auto-present cuma perlu solve **satu gap**: model lupa call submit setelah
semuanya ready. That's it.

Dengan constraint tambahan:

- "ready" harus ditentukan oleh evaluator per family, bukan heuristic generik
- revision loop belum fully solved di state machine saat ini

---

## Estimasi Perubahan

| File | Perubahan |
|------|-----------|
| `src/app/api/chat/route.ts` | lebih dari ~15 lines: `shouldAutoPresent` condition + evaluator integration + prepareStep injection + chain update |
| `src/lib/ai/incremental-save-harness.ts` | 0 lines (unchanged) |
| `convex/paperSessions.ts` | 0 lines (guards already global) |
| `readiness evaluator module` | NEW: family-based deterministic evaluator |
| Tests | lebih dari ~20 lines: evaluator tests per family + route integration tests + no-conflict with v1 harness |

Total: **lebih besar dari ~35 lines.** Ini bukan patch kecil kalau mau aman.

---

## Observability

Tambah log `[AutoPresent]` di trigger point:

```typescript
if (shouldAutoPresent) {
  console.log(`[AutoPresent] GLOBAL auto-present triggered — stage=${paperSession.currentStage}, family=${readiness.family}, reason=${readiness.reason}, failedChecks=${readiness.failedChecks.join(",")}`)
}
```

Log ini join existing `[AutoPresent]` logs dari harness v1 dan submitStageForValidation tool.

---

## Urutan Implementasi

1. Tambah `shouldAutoPresent` condition di route.ts (setelah `shouldForceSubmitValidation` block)
2. Tambah module `evaluateStageReadiness()` sesuai `readiness-evaluator-spec.md`
3. Wire `shouldAutoPresent` ke evaluator output, bukan ke `hasStageRingkasan + hasStageArtifact` langsung
4. Tambah `autoPresentPrepareStep` function
5. Extend prepareStep chain dengan `?? autoPresentPrepareStep`
6. Tambah `maxToolSteps` override (2) saat auto-present active
7. Tambah `[AutoPresent]` log dengan `family`, `reason`, `failedChecks`
8. Tambah tests
9. Manual test di UI:
   - stage family yang sudah `GO`
   - verify panel muncul only when evaluator says ready
   - verify revision cycle does NOT silently auto-present unless transition-nya sudah didesain

---

## Risiko

1. **False positive karena evaluator terlalu lemah** — mitigasi: rollout per
   family, mulai hanya untuk family yang sudah `GO`
2. **Revision loop belum punya transition yang aman** — mitigasi: treat sebagai
   prerequisite, bukan edge case minor
3. **Interaction dengan future features** — mitigasi: auto-present cuma inject 1
   prepareStep di priority chain terendah, mudah di-override
4. **Model confusion** — model mungkin generate text yang kontradiksi panel.
   Mitigasi: system note "Validation panel sudah muncul. Tunggu keputusan user."
5. **UX mismatch** — panel muncul di turn berikutnya, bukan bersamaan dengan
   artifact. Ini perlu keputusan produk terpisah sebelum implementasi final.

---

## Preconditions Before Implementation

Implementasi desain ini sebaiknya **ditunda** sampai semua syarat berikut true:

1. `readiness-evaluator-spec.md` punya minimal satu family non-Foundation yang
   sudah benar-benar diubah dari `NO-GO` ke `GO`
2. Module evaluator runtime sudah ada dan punya regression tests
3. Revision cycle transition sudah diputuskan eksplisit
4. Keputusan UX final sudah jelas:
   - panel di turn berikutnya, atau
   - panel harus tetap muncul bersamaan dengan artifact
