# Anomaly Findings — Branch Review

> Findings dari runtime verification selama branch review `feature/paper-ui-harness-rev-enforcement`.
> Setiap finding punya evidence dari screenshots + terminal logs.

---

## Finding #1: Premature Mature Save — Artifact+Validation Muncul Sebelum Conversational Flow Selesai

**Severity:** High
**Stream:** Kategori 2 — Stream 4b (Incremental save harness) + Stream 5 (Auto-present contract)
**Date:** 2026-04-02
**Status:** Open

### Observed Behavior

Saat stage `gagasan`, setelah semua 4 task-derivation fields terisi (ideKasar, referensiAwal, analisis, angle = 4/4), harness langsung trigger `MATURE_SAVE` chain:

```
[AutoPresent] MATURE_SAVE triggered — stage=gagasan, pendingFields=0
→ updateStageData (ringkasan)
→ createArtifact
→ submitStageForValidation → SUCCESS
→ text-response (model emits choice card for novelty claim)
```

Hasilnya di UI:
- Artifact "Gagasan Paper: Fokus & Angle" muncul (tanpa novelty claim)
- Validation panel "Validasi Tahap: Gagasan Paper" muncul
- Choice card "Pilih Klaim Kebaruan (Novelty Claim)" muncul di bawah validation panel

Screenshot evidence: `screenshots/Screen Shot 2026-04-02 at 20.50.38.png`

### Expected Behavior

1. Choice card (novelty claim) muncul **duluan** — user memutuskan informasi terakhir
2. Setelah user pilih, data lengkap termasuk novelty claim
3. **Baru** artifact di-create (berisi semua keputusan termasuk novelty)
4. Validation panel muncul bersamaan dengan artifact

### Root Cause

Harness `MATURE_SAVE` trigger condition hanya cek **task-derivation field completeness** (`pendingFields=0`). Ini tidak memperhitungkan bahwa conversational flow masih punya pending decisions (model-driven discussions seperti novelty claim) yang seharusnya inform artifact content.

`STAGE_TASKS.gagasan` hanya define 4 fields: `ideKasar`, `referensiAwal`, `analisis`, `angle`. Novelty claim bukan salah satu field ini, tapi merupakan bagian dari stage flow yang seharusnya selesai sebelum artifact finalization.

### Impact

1. **UX confusion** — User melihat 3 UI elements bersamaan (artifact + validation panel + choice card). Tidak jelas mana yang harus di-interact duluan.
2. **Incomplete artifact** — Artifact yang di-create belum mengandung keputusan novelty claim. User diminta validasi artifact yang belum final.
3. **Data layering** — Jika user pilih novelty claim setelah artifact sudah dibuat, data tersimpan tapi artifact tidak otomatis di-update.

### Possible Fix Directions

- **Option A:** Tambah novelty/klaim kebaruan sebagai field ke-5 di `STAGE_TASKS.gagasan`, sehingga `pendingFields` belum 0 sampai novelty terisi.
- **Option B:** Harness punya "hold" mechanism — sebelum trigger mature save, cek apakah model response mengandung choice card (yaml-spec). Jika ya, tunda mature save sampai choice resolved.
- **Option C:** Stage instructions explicitly instruct model untuk call `updateStageData` dengan novelty claim SEBELUM harness mature save triggers. Ini butuh model compliance.

### Files Involved

- `src/lib/ai/incremental-save-harness.ts` — mature save trigger logic
- `src/lib/paper/task-derivation.ts` — `STAGE_TASKS.gagasan` field definitions
- `src/app/api/chat/route.ts` — prepareStep chain, `[AutoPresent] MATURE_SAVE`
- `src/lib/ai/paper-stages/foundation.ts` — gagasan stage instructions

---

## Finding #2: updateStageData Blocked by pending_validation — Cascading Failure from Finding #1

**Severity:** High
**Stream:** Kategori 2 — Stream 4b (Incremental save harness) + Safety layer
**Date:** 2026-04-02
**Status:** Open
**Caused by:** Finding #1

### Observed Behavior

Setelah Finding #1 terjadi (premature mature save → stage masuk `pending_validation`), user memilih novelty claim dari choice card. Model kemudian coba `updateStageData` untuk menyimpan novelty claim + semua data yang sudah ada:

```
[IncrementalSave] updateStageData called — stage=gagasan fields=[ideKasar,novelty,analisis,referensiAwal,angle] ringkasan=126chars
[Retry] paperSessions.updateStageData attempt 1 failed, retrying in 100ms...
[Retry] paperSessions.updateStageData attempt 2 failed, retrying in 200ms...
[Retry] paperSessions.updateStageData attempt 3 failed, retrying in 400ms...
[Retry] paperSessions.updateStageData failed after 4 attempts
```

Convex backend menolak karena stage sudah `pending_validation`:
```
updateStageData failed: Stage is pending validation. Request revision first if you want to modify the draft.
```

4 retry attempts, semua gagal. Data novelty claim **tidak tersimpan**.

Screenshot evidence:
- `screenshots/Screen Shot 2026-04-02 at 20.57.59.png` — Model acknowledges error: "data yang baru kita sepakati barusan (terutama klaim kebaruan) belum bisa langsung tersimpan ke dalam draft yang sudah diajukan"
- `screenshots/Screen Shot 2026-04-02 at 20.58.06.png` — Model minta user klik "Revisi" supaya bisa save data

### Cascade Chain

```
Finding #1 (premature mature save)
  → stage enters pending_validation
  → user picks novelty claim from choice card
  → model tries updateStageData with novelty
  → Convex guard BLOCKS: "Stage is pending validation"
  → 4 retries, all fail
  → novelty claim data LOST
  → model asks user to click "Revisi" manually
```

### Impact

1. **Data loss** — Novelty claim yang user pilih tidak tersimpan ke database.
2. **Broken flow** — Model harus minta user klik "Revisi" secara manual, padahal user baru saja pilih dari choice card dan mengharapkan proses otomatis.
3. **User confusion** — User baru aja diminta validasi, sekarang diminta revisi. Kontradiktif.

### Root Cause

Dua mekanisme berbenturan:
1. **Harness mature save** → triggers `submitStageForValidation` → stage status = `pending_validation`
2. **Convex guard** di `paperSessions.ts:647` → blocks `updateStageData` saat stage `pending_validation`

Guard ini correct secara isolation (protect validated data from overwrite). Tapi karena Finding #1 triggers validation prematur, guard ini blocks legitimate data yang seharusnya masuk SEBELUM validation.

### Files Involved

- `convex/paperSessions.ts:647` — pending_validation guard on updateStageData
- `src/lib/ai/paper-tools.ts` — updateStageData tool (retry logic)
- `src/lib/ai/incremental-save-harness.ts` — mature save trigger

---

## Finding #3: Confirmed Choice Card Tetap Interaktif Setelah Dipilih

**Severity:** Medium
**Stream:** Kategori 1 — UI (json-renderer-yaml)
**Date:** 2026-04-02
**Status:** Open

### Observed Behavior

Choice card "Pilih Klaim Kebaruan (Novelty Claim)" masih menampilkan state interaktif (checkbox checked, button "Pilih Klaim Kebaruan" visible) meskipun user sudah memilih dan konfirmasi sudah muncul di bawahnya ("PILIHAN DIKONFIRMASI").

Screenshot evidence: `screenshots/Screen Shot 2026-04-02 at 20.57.18.png`
- Choice card masih punya checked checkbox + active button
- Di bawahnya sudah ada "PILIHAN DIKONFIRMASI" banner

### Expected Behavior

Setelah user memilih dan konfirmasi muncul, choice card seharusnya:
- Transition ke disabled/confirmed state (buttons disabled, muted colors)
- Atau collapse/hide interactive elements, hanya tampilkan selected option

### Impact

- **UX confusion** — User bisa mengira pilihan belum tersimpan karena card masih terlihat interaktif
- **Potential double-submit** — User mungkin klik lagi karena mengira belum terkonfirmasi

### Files Involved

- `src/lib/json-render/choice-payload.ts` — choice card state management
- `src/lib/chat/choice-request.ts` — choice interaction event handling
- json-renderer-yaml UI components — render logic for confirmed state

---

## Finding #4: Stage Skip — Topik Stage Diloncati, Langsung ke Outline

**Severity:** Critical
**Stream:** Kategori 2 — Stream 5 (Auto-present contract) + Harness validation flow
**Date:** 2026-04-02
**Status:** Open
**Caused by:** Finding #1 cascade → premature validation → tainted session state

### Observed Behavior

Setelah gagasan stage di-revisi dan di-approve, session advance ke `topik`. Tapi:

1. Model masuk `topik` stage (`phase=paperPrompt.total ... stage=topik`)
2. Harness langsung trigger `[ValidationSubmit]` tanpa diskusi apapun:
   ```
   [ValidationSubmit] targetField=_validationSubmit, maxToolSteps=4
   [IncrementalSave] updateStageData called — stage=topik fields=[] ringkasan=234chars
   [AutoPresent] submitStageForValidation → SUCCESS, panel should appear
   ```
3. UI menunjukkan "Penentuan Topik 0/4" lalu langsung "Validasi Tahap: Penentuan Topik" panel muncul
4. User klik "Setujui & Lanjutkan" (karena bingung, flow terlalu cepat)
5. Session advance ke `outline` — topik stage **TIDAK PERNAH DIKERJAKAN**

Terminal evidence:
```
stage=topik → [ValidationSubmit] → submitStageForValidation → SUCCESS
stage=outline → searchRouter → SEARCH (untuk outline, bukan topik)
[appendSearchReferences] Appended 11 refs to stage outline
```

Screenshot evidence:
- `screenshots/Screen Shot 2026-04-02 at 21.05.30.png` — "Penentuan Topik" muncul sebentar, langsung ada validation panel
- `screenshots/Screen Shot 2026-04-02 at 21.05.37.png` — Validation panel "Penentuan Topik" tanpa ada diskusi/content
- `screenshots/Screen Shot 2026-04-02 at 21.07.13.png` — Sudah di "Menyusun Outline 0/2", topik terlewat

Additional evidence (model confusion post-skip):
- `screenshots/Screen Shot 2026-04-02 at 21.09.01.png` — Toast "TAHAP DISETUJUI: Penentuan Topik" tapi card menunjukkan "Menyusun Outline 0/2". Model text bicara tentang "Penentuan Topik" padahal stage sudah outline.
- `screenshots/Screen Shot 2026-04-02 at 21.09.36.png` — Search berhasil menemukan 11 rujukan (7 sumber terlihat di sidebar)
- `screenshots/Screen Shot 2026-04-02 at 21.09.58.png` — Model bilang "Moka akan melakukan pencarian sekarang ya!" + "MENEMUKAN 11 RUJUKAN" — **pencarian sudah selesai tapi model masih berjanji akan mencari**. Model confused karena search terjadi di compose phase (orchestrator), tapi model text ditulis seolah pencarian belum dimulai.
- `screenshots/Screen Shot 2026-04-02 at 21.10.37.png` — UnifiedProcessCard menunjukkan "Menyusun Outline 0/2" tapi content di bawahnya masih bicara tentang "Penentuan Topik". **Stage card dan content tidak konsisten.**

### Root Cause Analysis

Dua kemungkinan yang saling terkait:

**Hypothesis A: Harness `_validationSubmit` trigger tanpa gate check**
Saat masuk stage baru (`topik`), harness langsung cek apakah bisa submit validation. Karena gagasan stage sebelumnya punya data yang "overflow" ke topik (ringkasan 234 chars sudah ada), harness mungkin menganggap topik sudah siap dan langsung trigger `submitStageForValidation`.

**Hypothesis B: Tainted session state dari premature gagasan validation**
Karena gagasan stage di-validate premature (Finding #1), lalu di-revisi, lalu di-validate lagi — state transitions mungkin meninggalkan artifacts (ringkasan, artifact references) yang harness interpret sebagai "topik sudah ready".

Terminal menunjukkan `stage=topik fields=[] ringkasan=234chars` — harness save ringkasan 234 chars ke topik **tanpa ada field data**. Ini seharusnya mustahil di fresh topik stage. Ringkasan ini kemungkinan carry-over atau model auto-generate dari context.

### Impact

1. **Complete stage skip** — Topik stage content (definitif, angleSpesifik, argumentasiKebaruan, researchGap) TIDAK ADA. Paper punya gagasan tapi gak punya topik yang properly defined.
2. **Downstream corruption** — Outline yang disusun berdasarkan topik yang kosong akan berkualitas rendah atau salah arah.
3. **User trust** — Flow terlalu cepat dan di luar kontrol user. User klik "Setujui" karena bingung, bukan karena setuju.

### Files Involved

- `src/app/api/chat/route.ts` — ValidationSubmit harness trigger, gate conditions
- `src/lib/ai/incremental-save-harness.ts` — _validationSubmit logic
- `convex/paperSessions.ts` — submitForValidation guard (apparently passed with empty data)
- `src/lib/ai/paper-stages/foundation.ts` — topik stage entry conditions

---

## Finding #5: Search References Appended to Wrong Stage

**Severity:** High
**Stream:** Kategori 2 — Integration (search + stage management)
**Date:** 2026-04-02
**Status:** Open
**Caused by:** Finding #4 (stage skip)

### Observed Behavior

Setelah topik di-skip dan session advance ke outline, search dilakukan:
```
[SearchExecution] mode=google-grounding, searchRequired=true
[appendSearchReferences] Appended 11 refs to stage outline
```

Search ini seharusnya untuk **topik** (mencari referensi pendukung untuk penentuan topik), tapi karena stage sudah di-skip ke outline, referensi di-append ke **outline** stage.

### Impact

- Referensi yang dimaksudkan untuk memperkuat topik malah masuk ke outline
- Topik stage tetap kosong tanpa referensi
- Data integrity terganggu — referensi ada di stage yang salah

---

## Finding #6: Root Cause Analysis — Fundamental Design Tension Between Harness and Model Control

**Severity:** Critical (architectural)
**Stream:** Kategori 2 — All integration streams
**Date:** 2026-04-02
**Status:** Open (root cause for Findings #1, #2, #4, #5)

### Summary

Branch ini memperkenalkan 4 perubahan arsitektural yang saling berinteraksi dan secara kolektif menyebabkan semua runtime failures yang ditemukan:

### Change 1: Incremental Save Harness (baru, 201 lines)

File: `src/lib/ai/incremental-save-harness.ts`

Harness **mengambil alih control flow** model lewat `prepareStep`:
- Force `saveStageDraft` per field (incremental mode)
- Force `updateStageData → createArtifact → submitStageForValidation` chain (mature save mode)
- Force `_validationSubmit` chain saat user approve

**Problem:** Harness cek `pendingFields=0` dari task-derivation fields lalu langsung trigger mature save chain. Dia **tidak aware** bahwa conversational flow masih punya pending decisions (choice cards, novelty claim discussions) yang belum selesai.

### Change 2: Prompt Contract Migration (explicit-confirm → auto-present)

Files: `src/lib/ai/paper-stages/*.ts` (all 12 stages)

Di main:
```
submitStageForValidation() — ONLY after user EXPLICITLY confirms satisfaction
```

Di branch:
```
submitStageForValidation() presents validation panel. User decides via Approve or Revise.
```

**Problem:** Contract berubah dari "model decides when to submit (after user confirms)" ke "system decides when to submit (when fields complete)". Tapi stage instructions masih punya discussion flows (novelty claim, angle selection) yang **assume** model controls the timing. Contract shift tanpa matching flow adjustment.

### Change 3: `validationSubmitConfig` + `isChoiceValidationIntent` di route.ts

Baru: saat `isSaveSubmitIntent || isChoiceValidationIntent`, route.ts build `validationSubmitConfig` yang force `updateStageData → createArtifact → submitForValidation` dalam satu turn.

**Problem:** `isChoiceValidationIntent` true saat ANY choice card di-submit. Choice card novelty claim di-treat sama dengan choice card validation approval — keduanya trigger validation submit chain. **Tidak ada distinction antara mid-stage choice dan end-stage validation.**

### Change 4: prepareStep Priority Chain

```typescript
prepareStep: (
    primaryExactSourceRoutePlan.prepareStep
    ?? deterministicSyncPrepareStep
    ?? validationSubmitConfig?.prepareStep
    ?? incrementalSaveConfig?.prepareStep
) as any
```

**Problem:** Kalau `validationSubmitConfig` aktif, dia menang atas incremental save. Dan `validationSubmitConfig` bisa aktif saat `isChoiceValidationIntent=true` — yang trigger di ANY choice submit, bukan cuma validation approval.

### Interaction Chain yang Menyebabkan Semua Findings

```
Finding #1 (premature mature save):
  incrementalSaveConfig detects pendingFields=0
  → triggers MATURE_SAVE chain
  → artifact + validation muncul sebelum novelty claim discussion selesai

Finding #2 (updateStageData blocked):
  Stage sudah pending_validation (dari #1)
  → user pilih novelty claim
  → model coba updateStageData
  → Convex guard blocks: "Stage is pending validation"
  → data hilang, 4 retry gagal

Finding #4 (stage skip):
  User klik "Setujui & Lanjutkan" pada topik stage
  → isChoiceValidationIntent = true (any choice = validation intent)
  → validationSubmitConfig dibangun
  → prepareStep force: updateStageData → createArtifact → submitForValidation
  → Model dipaksa submit topik validation tanpa diskusi
  → Topik stage SKIPPED

Finding #5 (wrong stage references):
  Cascading dari #4 — search results append ke outline bukan topik
```

### Kenapa Ini Tidak Terjadi di Main

Di main:
- **Tidak ada harness** — model controls timing sepenuhnya
- **Tidak ada prepareStep override** — model bebas pilih tool mana yang dipanggil
- **Prompt bilang "ONLY after user EXPLICITLY confirms"** — model tidak submit tanpa explicit approval
- **Tidak ada `isChoiceValidationIntent`** — choice cards tidak trigger validation flow

### Core Design Tension

**Harness mau control timing, tapi stage instructions assume model controls timing.** Dua-duanya tidak bisa aktif bersamaan tanpa coordination layer yang memahami:
1. Apakah conversational flow sudah benar-benar selesai (bukan cuma fields complete)
2. Apakah choice card yang di-submit itu mid-stage choice atau end-stage validation
3. Apakah stage entry baru harus langsung eligible untuk validation submit

### Files Involved (complete list)

- `src/lib/ai/incremental-save-harness.ts` — harness logic (baru)
- `src/app/api/chat/route.ts` — prepareStep chain, validationSubmitConfig, isChoiceValidationIntent
- `src/lib/ai/paper-tools.ts` — saveStageDraft tool (baru), draftSaveGate
- `src/lib/ai/paper-mode-prompt.ts` — activeStageArtifactContext, prompt wording changes
- `src/lib/ai/paper-stages/foundation.ts` — gagasan/topik contract changes
- `src/lib/ai/paper-stages/core.ts` — 4 stage contract changes
- `src/lib/ai/paper-stages/results.ts` — 3 stage contract changes
- `src/lib/ai/paper-stages/finalization.ts` — 5 stage contract changes
- `convex/paperSessions.ts` — artifact guard on submitForValidation
- `src/lib/chat/choice-request.ts` — isValidationChoiceInteractionEvent
