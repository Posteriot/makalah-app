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

Enforce auto-present di **semua 14 stage** tanpa mengubah incremental save harness
(yang tetap scoped ke gagasan/topik untuk per-field saving).

## Non-Goals

- Extend incremental per-field save ke stage lain (field types complex, butuh
  design terpisah)
- Mengubah behavior existing harness v1
- Auto-approve (stage advance tetap user-initiated via Approve button)

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

## Proposed Design: Post-Turn Readiness Detector

### Konsep

Tambah **satu check point baru** di route.ts: setelah AI turn selesai, kalau
draft ready (ringkasan + artifact ada) tapi `submitStageForValidation` belum
dipanggil di turn itu, **inject prepareStep di turn berikutnya** yang force submit.

Ini beda dari harness v1 yang force 4-step chain dalam satu turn. Ini cuma force
**1 tool call** (submit) di turn berikutnya kalau model lupa.

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
const isReadyForAutoPresent = (
  !enableWebSearch
  && !!paperModePrompt
  && paperSession?.stageStatus === "drafting"
  && hasStageRingkasan(paperSession)
  && hasStageArtifact(paperSession)
  && !submitCalledThisTurn  // model didn't already call it
)
```

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

3. **Derive dari existing state** — kalau `hasStageRingkasan && hasStageArtifact
   && stageStatus === "drafting"`, itu by definition "ready tapi belum submitted."
   Gak perlu flag baru.

**Rekomendasi: Option 3.** Derive dari existing state. Gak butuh field baru atau
migration. Condition:

```typescript
const shouldAutoPresent = (
  !enableWebSearch
  && !!paperModePrompt
  && !shouldForceGetCurrentPaperState
  && !shouldForceSubmitValidation  // not already forced by user intent
  && !incrementalSaveConfig        // not handled by v1 harness
  && paperSession?.stageStatus === "drafting"
  && hasStageRingkasan(paperSession)
  && hasStageArtifact(paperSession)
)
```

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

Tapi: setelah model selesai revisi dan call `updateStageData` lagi, status
kembali ke `"drafting"` (via backend logic). Apakah ini trigger auto-present?
**Ya** — dan itu behavior yang diinginkan. Setelah revisi selesai, panel harus
muncul lagi.

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

---

## Estimasi Perubahan

| File | Perubahan |
|------|-----------|
| `src/app/api/chat/route.ts` | ~15 lines: `shouldAutoPresent` condition + prepareStep injection + chain update |
| `src/lib/ai/incremental-save-harness.ts` | 0 lines (unchanged) |
| `convex/paperSessions.ts` | 0 lines (guards already global) |
| Tests | ~20 lines: verify auto-present triggers for non-gagasan stage, verify gak conflict dengan v1 harness |

Total: **~35 lines of code changes + tests.**

---

## Observability

Tambah log `[AutoPresent]` di trigger point:

```typescript
if (shouldAutoPresent) {
  console.log(`[AutoPresent] GLOBAL auto-present triggered — stage=${paperSession.currentStage}, ringkasan=true, artifactId=true`)
}
```

Log ini join existing `[AutoPresent]` logs dari harness v1 dan submitStageForValidation tool.

---

## Urutan Implementasi

1. Tambah `shouldAutoPresent` condition di route.ts (setelah `shouldForceSubmitValidation` block)
2. Tambah `autoPresentPrepareStep` function
3. Extend prepareStep chain dengan `?? autoPresentPrepareStep`
4. Tambah `maxToolSteps` override (2) saat auto-present active
5. Tambah `[AutoPresent]` log
6. Tambah tests
7. Manual test di UI: buat paper session, navigate ke stage abstrak, biarkan model generate tanpa call submit → verify panel muncul di turn berikutnya

---

## Risiko

1. **False positive di edge case yang belum teridentifikasi** — mitigasi: log
   observability + manual test di beberapa stage
2. **Interaction dengan future features** — mitigasi: auto-present cuma inject 1
   prepareStep di priority chain terendah, mudah di-override
3. **Model confusion** — model mungkin generate text yang kontradiksi panel.
   Mitigasi: system note "Validation panel sudah muncul. Tunggu keputusan user."
