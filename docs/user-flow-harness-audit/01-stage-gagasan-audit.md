# Audit Stage 1 (Gagasan) — User-Flow Lens

**Branch:** `durable-agent-harness`
**HEAD pada saat audit:** `d8d512c8`
**Tanggal audit:** 2026-04-26
**Auditor:** Claude (sesi user, dipandu skill `makalah-audit-harness`)

---

## Ringkasan eksekutif

Stage 1 (gagasan) adalah gerbang masuk paper. Audit menemukan **15 anomaly** (12 stage-1-spesifik + 3 supporting) yang dikelompokkan ke dalam 5 kategori penyebab. **4 anomaly severity HIGH**, 7 MED, 4 LOW. Akar masalah utama bukan satu titik — ada **paradox arsitektur** yang lebih dalam: stage skill aktif (di DB dev) instruksiin model panggil 3 tool yang **tidak diimplementasi di code**, sementara sistem stream-pipeline lama (`pipePlanCapture`) yang bekerja dengan paradigma berbeda **masih aktif**. Ini menciptakan zona "limbo" di mana model menerima dua instruksi konflik dan tidak ada satupun yang dideterministik oleh harness.

**Scope problem CONFIRMED cross-stage:** 3 tool plan yang absent di-reference di **SEMUA 14 stage skill** (`updated-9/01-...md` s/d `14-...md`) plus `system-prompt.md`. Anomaly A1, A2, A10, A13 bukan stage-1-only — mereka paradigma-wide. Stage 1 cuma manifestasi pertama yang gue audit detail.

Tanpa fix, behavior seluruh workflow tergantung pada improvisasi model — kadang jalan, kadang stuck di finalize, kadang plan tidak muncul, kadang reset ke stage manapun broken.

---

## Source-of-truth yang dipakai

| Layer | File / Lokasi |
|---|---|
| Expected behavior (spec) | `docs/what-is-makalah/references/user-flow/user-flows-01-gagasan.md` |
| Cross-stage mechanism | `docs/what-is-makalah/references/user-flow/user-flows-00.md` |
| Stage skill aktif (DB dev mirror) | `docs/what-is-makalah/references/agent-harness/system-prompt-skills-active/updated-9/01-gagasan-skill.md` |
| System prompt aktif (DB dev mirror) | `.../updated-9/system-prompt.md` |
| Stage skill resolver | `src/lib/ai/stage-skill-resolver.ts` |
| Fallback hardcoded instruction | `src/lib/ai/paper-stages/foundation.ts:14` (`GAGASAN_INSTRUCTIONS`) |
| Plan schema | `src/lib/ai/harness/plan-spec.ts` |
| Plan capture pipeline | `src/lib/ai/harness/pipe-plan-capture.ts` |
| Choice workflow registry | `src/lib/chat/choice-workflow-registry.ts` |
| Enforcer chain | `src/lib/chat-harness/policy/enforcers.ts` |
| Tool registry | `src/lib/ai/paper-tools.ts` |
| Step verifier | `src/lib/chat-harness/verification/verify-step-outcome.ts` |
| Deploy script | `scripts/deploy-skills-dev.py` |

---

## Bagian 1 — Yang harusnya terjadi (per user-flow doc)

Diringkas dari `user-flows-01-gagasan.md` + `user-flows-00.md`:

**Turn 1 (user kirim ide):**
- Model: emit plan-spec (4 work tasks + 1 terminal task `kind: artifact_validation`); diskusi substantif; assertively bilang perlu cari referensi; **MANDATORY** end dengan choice card `continue_discussion` opsi utama "Cari referensi awal". Tidak boleh search di turn 1.
- Harness: capture plan via `pipe-plan-capture.ts`; stabilize plan first emission via `stabilizePlanAgainstCurrent()`; capture choice card.

**Turn 2 (user klik "Cari referensi awal"):**
- Model: jalankan web search (academic + non-academic dual mode); present findings same turn; epistemic labels per claim; end dengan choice card `continue_discussion` 2-3 direction opsi.
- Constraint: search-only turn. Tidak boleh function tools.

**Turn 3-N (per task incremental):**
- Model: kerjakan satu task per turn, mark task sebelumnya `complete`, end dengan choice card, tunggu user. Tidak boleh combine atau skip task.
- Harness: track plan progression.

**Turn final (semua work task complete → finalize):**
- Model: present summary + emit FINAL choice card `finalize_stage`.
- Harness (setelah user klik): activate **Drafting Choice Artifact Enforcer** → force tool chain `updateStageData → createArtifact → submitStageForValidation` via `toolChoice: required`.
- Output contract: `ideKasar`, `analisis`, `angle` wajib di stageData.

**Validation phase:** `PaperValidationPanel` muncul, user approve/revise.

**Choice card minimum count (per spec doc):** 5 sebelum artifact (4 per task + 1 final). ⚠️ Catatan: angka "4 per task" berasal dari spec `maxWorkTasks=4`, tapi A8 confirm angka itu **tidak ada di code dan tidak di skill DB**. Jadi minimum aktualnya tergantung berapa task yang model emit — bisa lebih atau kurang dari 5.

---

## Bagian 2 — Yang aktual terjadi (per code + skill DB)

**Stage skill aktif (`updated-9/01-gagasan-skill.md`):**
- "First Turn Flow MANDATORY" — instruksiin model panggil **`createStagePlan`** tool dulu, lalu diskusi, lalu MANDATORY choice card "Cari referensi awal".
- "Incremental Discussion Flow" — per task one at a time, choice card per task, **`markTaskDone(taskId)`** setelah task done.
- "Done Criteria" — semua task discussed → **`confirmStageFinalization`** → `updateStageData → createArtifact → submitStageForValidation`.

**System prompt aktif (`updated-9/system-prompt.md`):**
- Section "TASK PLAN (TOOL-BASED)" line 291-309 (mirror skill DB)
- Line 308: **"Do NOT emit plan-spec YAML blocks — plan is managed through tools"** — explicit prohibition emit YAML.
- Line 308: **"Plan is locked after creation — you cannot change task labels or count"** — claim locking.

**Code (verifikasi tools):**
- Grep `src/` + `convex/` untuk `createStagePlan`, `markTaskDone`, `confirmStageFinalization` → **kosong total**. 3 tool tidak diimplementasi.
- `paper-tools.ts` registry punya: `getCurrentPaperState`, `updateStageData`, `compileDaftarPustaka`, `submitStageForValidation`, `requestRevision`, `resetToStage`, `createArtifact`, `updateArtifact`, `inspectSourceDocument`, `quoteFromSource`, `searchAcrossSources`, `readArtifact`. **Tidak ada 3 tool plan**.

**Code (pipa stream):**
- `build-step-stream.ts:11, 681` confirm `pipePlanCapture` **AKTIF** di stream pipeline.
- Pipa expect model emit YAML `plan-spec` block — bertentangan dengan system prompt line 308.

**Code (fallback):**
- `stage-skill-resolver.ts` resolve dari DB. Kalau gagal → fallback ke `GAGASAN_INSTRUCTIONS` di `foundation.ts`.
- `foundation.ts:14-146` jauh lebih pendek dari skill DB. Tidak menyebut First Turn protocol, tidak menyebut MANDATORY choice card per task, tidak menyebut tool plan.

---

## Bagian 3 — Daftar anomaly (12 entries)

### Anomaly A1 — 3 tool plan tidak diimplementasi 🔴 HIGH
- **Harusnya** (`updated-9/01-gagasan-skill.md:98, 116, 119` + `system-prompt.md:295-302`): model panggil `createStagePlan`, `markTaskDone(taskId)`, `confirmStageFinalization`.
- **Aktualnya:** grep `src/ + convex/` → tidak ada di tool registry. Cuma muncul di file `.md` (skill, system prompt, doc).
- **Dampak ke user:** kalau model patuh skill → AI SDK error "tool not found". Kalau model improvisasi → behavior probabilistik (mungkin emit YAML inline, mungkin skip plan, mungkin diam).
- **Cause class:** Tool dispatch (kontrak skill tanpa implementor).

### Anomaly A2 — Konflik paradigma plan: skill TOOL vs code STREAM-YAML 🔴 HIGH
- **Harusnya** (skill + system prompt): plan tool-driven. System prompt line 308 explicit: **"Do NOT emit plan-spec YAML blocks"**.
- **Aktualnya:** `pipePlanCapture` di `build-step-stream.ts` AKTIF — expect model emit YAML `plan-spec`. `pipe-plan-capture.ts:1-325` masih kerja.
- **Dampak ke user:** dua mekanisme saling exclude. Kalau model nurut prompt → plan tool fail (A1) + YAML tidak diemit → `_plan` di stageData kosong → UnifiedProcessCard tidak muncul. Kalau model improvisasi emit YAML → pipa capture-nya, tapi `markTaskDone` tetap tidak ada → status task pending selamanya.
- **Cause class:** Plan compliance / arsitektur drift.

### Anomaly A3 — Fallback `foundation.ts` divergen serius dari skill DB 🟡 MED
- **Harusnya:** kalau resolver fallback (Convex error / skill validation fail / no active skill), instruction yang model terima harusnya equivalent dengan skill DB.
- **Aktualnya:** `foundation.ts:14-146` GAGASAN_INSTRUCTIONS tidak menyebut First Turn protocol, tidak menyebut MANDATORY choice card per task, tidak menyebut plan tool. Bilang "save with updateStageData + createArtifact + submitStageForValidation in the SAME turn" — yang di skill DB itu khusus turn FINAL.
- **Dampak ke user:** silent degradation. User dapat behavior berbeda pada hari yang sama tanpa tahu kenapa.
- **Cause class:** Prompt routing.

### Anomaly A4 — Plan-gate "downgrade" cuma `console.info`, bukan downgrade beneran 🔴 HIGH
- **Harusnya** (`user-flows-00.md:64-69` Phase 2 D1): kalau plan tidak complete, harness sebaiknya tetap allow finalize (work tasks = informational) ATAU benar-benar downgrade ke `continue_discussion` dengan reason tercatat.
- **Aktualnya** (`enforcers.ts:28-30, 88-91`): kalau `planHasIncompleteTasks && action === 'finalize_stage'` → cuma log `[PLAN-GATE] enforcer downgraded` — **tidak mutate `resolvedWorkflow.action`**. Lalu `createDraftingChoiceArtifactEnforcer` skip aktivasi via `!(planHasIncompleteTasks && action === 'finalize_stage')`. Tidak ada enforcer pengganti. Model ditinggal tanpa toolChoice forced.
- **Dampak ke user:** SILENT FAILURE. User klik finalize, plan punya 1 task pending, harness diam-diam skip enforce → model bisa response prose tanpa call tool → artifact tidak terbuat → stage stuck.
- **Bersinergi parah dengan A1/A2:** karena `markTaskDone` tidak ada, semua task selamanya `pending` → finalize SELALU kena gate ini → enforcer SELALU silent skip. Stage 1 berisiko stuck setiap kali user klik finalize.
- **Cause class:** State persistence + stage transition.

### Anomaly A5 — `stabilizePlanAgainstCurrent()` yang diklaim doc tidak ada 🟡 MED
- **Harusnya** (`user-flows-00.md:39` + `02-core-mechanisms.md:14`): plan distabilkan oleh fungsi ini di `plan-spec.ts`. Plan LOCKED setelah stabil.
- **Aktualnya:** grep `src/` → tidak ada di mana-mana kecuali doc + research file. `plan-spec.ts` cuma punya `autoCompletePlanOnValidation`. Plan locking real **tidak ada**. Setiap emit plan-spec dari model langsung overwrite state sebelumnya.
- **Dampak ke user:** doc janjiin "model tidak boleh add/remove/reorder task". Aktualnya bisa.
- **Cause class:** State persistence.

### Anomaly A6 — Deploy script `scripts/deploy-skills-dev.py` outdated 🟡 MED
- **Aktualnya** (`scripts/deploy-skills-dev.py`):
  - Line 10: `SRC_DIR = ".references/system-prompt-skills-active/updated-7"` — path salah dua kali: prefix `.references/` (bukan `docs/what-is-makalah/references/`) dan version `updated-7` (sekarang `updated-9`).
  - Line 9: `CHANGE_NOTE = "updated-7: rollback capability + fallback choice card improvements"` — outdated.
- **Dampak ke user:** kalau dijalankan as-is sekarang, **file not found error**. Tidak bisa deploy `updated-9`.
- **Cause class:** Tooling drift.

### Anomaly A7 — `pipe-plan-capture.ts` state machine inefisien di stream panjang 🟢 LOW
- **Aktualnya** (`pipe-plan-capture.ts`): per text-delta scan ulang fence + 2 unfenced patterns + indexOf. Worst-case mendekati O(n²) untuk stream panjang.
- **Dampak:** belum urgent. Untuk stage 1 yang search-heavy (banyak text-delta), bisa nambah sedikit latency stream pipeline. Tidak blocking.
- **Cause class:** Efisiensi.

### Anomaly A8 — `STAGE_LIMITS` / `maxWorkTasks` tidak ada di code dan tidak di skill 🟡 MED
- **Harusnya** (`user-flows-01-gagasan.md:50` + `user-flows-00.md:42`): max 4 work tasks, diatur di `STAGE_LIMITS` di `stage-skill-contracts.ts`.
- **Aktualnya:**
  - `stage-skill-contracts.ts` cuma 15 baris, isinya `ACTIVE_SEARCH_STAGES` vs `PASSIVE_SEARCH_STAGES`. **Tidak ada `STAGE_LIMITS` apapun.**
  - Schema `plan-spec.ts:29` cap `tasks.max(10)` — global, semua stage sama.
  - Skill `updated-9/01-gagasan-skill.md` juga tidak menyebut limit 4.
- **Dampak ke user:** model bisa emit 8 work task untuk gagasan. Plan kepanjangan, friction. Atau kalau Jalur A (implement `createStagePlan`) dipilih, tool itu sendiri butuh tahu max-nya — skill tidak kasih spec.
- **Cause class:** State persistence + spec gap.

### Anomaly A9 — Schema plan task tidak punya field `kind` 🟡 MED
- **Harusnya** (`user-flows-00.md:47-50` + `user-flows-01-gagasan.md:51`): plan punya 1 terminal task `kind: artifact_validation` supaya harness bisa bedain work task vs terminal task.
- **Aktualnya:** `planTaskSchema` di `plan-spec.ts:21-24` cuma `{label, status}`. Field `kind` tidak ada.
- **Dampak ke user:** harness tidak bisa secara struktural tahu mana terminal task — harus tebak dari label string. Kalau model bikin label berbeda dari template, sinkronisasi plan-vs-tool-chain drift.
- **Cause class:** Spec gap.

### Anomaly A10 — System prompt internal inconsistency: dua list "tools" yang berbeda 🔴 HIGH
- **Aktualnya** (`updated-9/system-prompt.md`):
  - Section "AVAILABLE TOOLS" line 215-218 cuma list **3 tool**: `getCurrentPaperState`, `updateStageData`, `submitStageForValidation`.
  - Section "FUNCTION TOOLS" line 263-274 list **7 tool**: ditambah `createArtifact`, `updateArtifact`, `requestRevision`, `compileDaftarPustaka`.
- **Dampak ke user:** model baca prompt panjang dengan dua list konflik. Bisa interpret AVAILABLE TOOLS sebagai canonical (cuma 3 tool boleh) → tidak akan call createArtifact → stage stuck. Atau interpret FUNCTION TOOLS sebagai canonical → behavior expected. Probabilistik.
- **Cause class:** Prompt routing.

### Anomaly A11 — `verify-step-outcome.ts` `planComplete` circular logic 🟡 MED
- **Aktualnya** (`verify-step-outcome.ts:185-199`):
  ```
  // we don't have the plan spec here — we check whether
  // validation was submitted (which triggers auto-complete via
  // autoCompletePlanOnValidation downstream).
  const planComplete = isDraftingStage ? hasSubmitSuccess : true
  ```
- **Logika circular:** plan dianggap complete kalau `submitStageForValidation` sukses. Tapi system prompt (line 306-307) bilang submit hanya boleh dipanggil **setelah** `confirmStageFinalization` (yang dependent on plan complete via `markTaskDone` semua task).
- **Dampak ke user:** verifier menggunakan signal yang seharusnya output dari plan completion sebagai input untuk menentukan plan completion. Saat ini efeknya minor karena `confirmStageFinalization` tidak ada (A1) — submit bisa langsung dipanggil. Tapi kalau A1 difix dengan implement tool, gating jadi confused.
- **Cause class:** Verification logic.

### Anomaly A12 — Plan locking yang dijanjikan system prompt tidak ada implementasi 🟢 LOW
- **Harusnya** (`updated-9/system-prompt.md:308`): "Plan is locked after creation — you cannot change task labels or count".
- **Aktualnya:** Tidak ada locking. Sama seperti A5 — claim doc, bukti tidak ada di code.
- **Dampak ke user:** model bisa diam-diam ubah/tambah/kurangi task tanpa harness intervensi.
- **Cause class:** State persistence.

### Anomaly A13 — Reset path juga panggil `createStagePlan` yang tidak ada 🔴 HIGH
- **Harusnya** (`updated-9/system-prompt.md:345` + `01-gagasan-skill.md:166`): setelah `resetToStage` sukses, model "call createStagePlan with a fresh task breakdown and continue working".
- **Aktualnya:** `createStagePlan` tidak ada di tool registry (sub-case A1). Reset path **selalu broken** — apapun stage targetnya, post-reset plan creation akan fail.
- **Dampak ke user:** user "kembali ke gagasan" via timeline atau chat → reset Convex jalan, tapi plan baru tidak terbentuk → UnifiedProcessCard kosong → behavior identik dengan kondisi paradox A1+A2 di stage start.
- **Cause class:** Tool dispatch (sub-case A1, tapi affect impact-area berbeda — UX rewind).

### Anomaly A14 — Cross-stage scope CONFIRMED (bukan dugaan) 🔴 HIGH
- **Harusnya:** kalau anomaly cuma stage-1, fix-nya stage-spesifik. Kalau cross-stage, butuh fix paradigma-wide.
- **Aktualnya:** `grep "createStagePlan\|markTaskDone\|confirmStageFinalization" docs/.../updated-9/*.md` match SEMUA 14 stage skill + `system-prompt.md`. A1, A2, A10, A13 manifest di tiap stage, bukan gagasan-only.
- **Dampak ke user:** fix-strategy harus cross-stage. Implementasi 3 tool plan (Jalur A) sekali bereskan 14 stage. Patch per-stage skill (Jalur B) butuh edit 14 file.
- **Cause class:** Spec gap (scope-level).

### Anomaly A15 — `paperToolTracker` tidak punya field plan-related 🟡 MED
- **Aktualnya** (`paper-tools.ts:35-44`): tracker fields = `sawUpdateStageData`, `sawCreateArtifactSuccess`, `sawUpdateArtifactSuccess`, `sawSubmitValidationSuccess`, `sawSubmitValidationArtifactMissing`, `sawCompileDaftarPustakaPersist`, `createArtifactClaimed`. **Tidak ada** `sawCreateStagePlan`, `sawMarkTaskDone`, `allTasksDone`, `sawConfirmStageFinalization`.
- **Dampak ke user:** ini supporting evidence A1 (tool tidak ada → tracker tidak punya slot) dan dependency P6 (rekomendasi rujuk field yang belum exist). Kalau Jalur A dipilih, tracker shape harus extend bareng dengan implementasi tool.
- **Cause class:** State persistence.

---

## Bagian 4 — Pengelompokan penyebab

| Cause cluster | Anomaly anggota |
|---|---|
| **Tool dispatch / kontrak tanpa implementor** | A1, A2, A13 |
| **Prompt routing / instruction inconsistency** | A3, A10 |
| **State persistence / locking gap** | A4, A5, A8, A9, A12, A15 |
| **Verification logic** | A11 |
| **Tooling drift** | A6 |
| **Spec / scope gap** | A14 |
| **Efisiensi** | A7 |

---

## Bagian 5 — Rekomendasi (urut prioritas)

### Prioritas 1 — Resolve A1 + A2 + A4 + A10 + A13 + A14 + A15: pilih satu paradigma plan, buang yang lain. Pilih A.

Lo punya 2 jalur, **bukan parsial**:

**Jalur A — Implementasi 3 tool plan (`createStagePlan`, `markTaskDone`, `confirmStageFinalization`).**
- File yang nyentuh: `src/lib/ai/paper-tools.ts` (tool defs), `convex/paperSessions/*.ts` (mutations), `src/lib/chat-harness/executor/build-tool-registry.ts` (wiring), `src/lib/chat-harness/runtime/orchestrate-sync-run.ts` (paperToolTracker fields baru).
- Setelah tools jalan: hapus `pipePlanCapture` dari `build-step-stream.ts` (atau biarkan sebagai legacy reader untuk backward compat di session lama).
- Edit `enforcers.ts:28-30, 88-91`: ganti silent log dengan **actually mutate** `resolvedWorkflow.action` ke `continue_discussion` ketika plan tidak complete. Pakai `markTaskDone` signal sebagai ground truth.
- Edit `system-prompt.md:215-218`: konsolidasi AVAILABLE TOOLS = list lengkap, sama dengan FUNCTION TOOLS section.
- **Untung:** sekaligus fix A1, A2, A4, A10 dalam satu shot. Konsisten dengan Phase 2 D1 (signal harness pakai paperToolTracker, bukan plan self-report).
- **Rugi:** kerjaan ~1-2 hari. Schema design `createStagePlan({tasks: [...]})`, `markTaskDone({taskId: string|index})`, `confirmStageFinalization({summary?: string})` perlu dipikirin (task ID = index? hash? UUID?).
- **Sifat:** PERMANEN.

**Jalur B — Edit skill DB hapus tool reference, paksa kembali ke YAML emit.**
- Edit `updated-9/01-gagasan-skill.md` line 98, 116, 119 → ganti instruksi tool dengan emit YAML plan-spec.
- Edit `updated-9/system-prompt.md` section TASK PLAN (line 291-309) → ganti TOOL-BASED dengan YAML-BASED.
- Edit `updated-9/system-prompt.md` line 308 → hapus prohibition emit YAML.
- Edit `updated-9/system-prompt.md:215-218` → konsolidasi dengan FUNCTION TOOLS list.
- Deploy via script (setelah A6 difix).
- **Untung:** cepat, no code touch (~2 jam edit skill + deploy).
- **Rugi:** A4 tetap rentan trigger karena tidak ada mekanisme deterministic mark task done dari YAML emit (model self-report). Schema YAML perlu di-extend untuk `kind` field (A9). A8 tetap perlu solusi terpisah.
- **Sifat:** PARSIAL untuk plan-tracking, permanen untuk konsistensi skill-vs-code.

**Rekomendasi: Jalur A.** Alasan: A4 (silent finalize stuck) berakar di `markTaskDone` tidak ada. Jalur B nggak nyentuh akar — lo cuma nutupin gejala. Jalur A sekaligus bereskan A1, A2, A4, dan A10 dalam satu shot.

### Prioritas 2 — Hardening A3 (fallback alignment).

Pilih satu:
- **Edit `foundation.ts` `GAGASAN_INSTRUCTIONS`** supaya match skill DB minimal di First Turn protocol + choice card per task, atau
- **Hapus fallback hardcoded** dari `stage-skill-resolver.ts` dan ubah handler — kalau DB skill gagal, **block dengan error visible** (bukan silent fallback ke instruction berbeda). User komplain sekali, daripada tiap hari "kok kadang gini kadang gitu".

**Rekomendasi:** opsi kedua (block visible). Silent fallback selama ini adalah trust-breaking pattern (per memory rule `feedback_never_accept_model_lies`).

### Prioritas 3 — Update deploy script (A6).

`scripts/deploy-skills-dev.py`:
- `SRC_DIR = "docs/what-is-makalah/references/agent-harness/system-prompt-skills-active/updated-9"`
- `CHANGE_NOTE` rewrite sesuai diff yang dibawa di commit.
- Tambah CLI arg `--src-dir` supaya tidak hardcode di masa depan.

### Prioritas 4 — Schema gap (A8 + A9).

Kalau Jalur A dipilih:
- Tambah `STAGE_LIMITS = { gagasan: { maxWorkTasks: 4 }, ... }` di `stage-skill-contracts.ts`. `createStagePlan` validate input task count terhadap limit.
- Tambah field `kind?: 'work' | 'artifact_validation'` di `planTaskSchema`. `createStagePlan` auto-append terminal task dengan `kind: 'artifact_validation'`.

Kalau Jalur B dipilih:
- Sama, tapi validation di `tryParsePlan()` di `pipe-plan-capture.ts`.

### Prioritas 5 — Doc cleanup + locking implementation (A5 + A12).

`user-flows-00.md:39`, `02-core-mechanisms.md:14`, `system-prompt.md:308`: hapus reference `stabilizePlanAgainstCurrent` dan claim plan locking, ATAU implementasinya. Saat ini doc-vs-code drift.

**Rekomendasi:** kalau Jalur A dipilih, locking BUTUH **idempotency guard server-side eksplisit** di mutation `createStagePlan` — bukan otomatis muncul dari tool semantics. Pattern: mutation reject kalau `_plan` sudah exist untuk `(sessionId, stage)`, kecuali ada flag `force=true` yang cuma boleh dipakai oleh `resetToStage`. Update doc supaya akurat reflect mekanisme guard ini. Kalau Jalur B, hapus claim locking sepenuhnya — tidak ada gating natural di YAML emit.

### Prioritas 6 — Fix verifier circular logic (A11). DEPENDS ON P1 + A15 fix.

Setelah Jalur A jalan **dan** `paperToolTracker` shape di-extend (A15): edit `verify-step-outcome.ts:185-199`. Ganti `planComplete = hasSubmitSuccess` dengan signal nyata dari field tracker baru (`sawConfirmStageFinalization` atau `allTasksDone`). **Catatan:** field-field ini belum exist saat ini (A15) — P6 implicit-depends pada P1 Jalur A + A15 schema extension. Tidak bisa dikerjakan standalone.

### Prioritas 7 — Inefisiensi pipe (A7).

Defer. Profile dulu kalau ada keluhan latency stage 1 setelah Jalur A jalan. **Catatan:** kalau Jalur A dipilih dan `pipePlanCapture` dihapus dari `build-step-stream.ts`, A7 **auto-resolve** — tidak butuh fix terpisah. Ini bonus dari P1 Jalur A.

---

## Bagian 6 — Yang BELUM diaudit (cakupan jujur)

Audit ini fokus ke stage 1. Coverage parsial untuk komponen-komponen berikut:

1. **`updated-9/system-prompt.md` line 1-50 + 320-347** — gue cuma baca chunk tengah (50-300). Possibility ada section yang gue miss (PERSONA, FILE READING, STAGE RESET CAPABILITY).
2. **`build-tool-registry.ts` (643 baris)** — cuma grep partial. Belum baca full wiring tool ke executor. Mungkin ada pattern yang relevan untuk Jalur A implementation.
3. **`paperToolTracker` definition di `paper-tools.ts`** — cuma cek field yang muncul di grep. Belum baca full tracker shape.
4. **Edge cases di skill `updated-9/01-gagasan-skill.md`** belum di-cross-check ke code:
   - `Revision Contract PATH A/B` (line 149-156)
   - `EXACT METADATA DISCIPLINE` (line 161)
   - `RESTATEMENT SCOPE PRESERVATION` (line 162)
   - `EVIDENCE BREADTH HONESTY` (line 159)
   - `OPENING SENTENCE FRAMING` (line 160)
5. **Stage 2-14 detail audit** — belum diaudit per-stage. Tapi cross-stage scope problem **CONFIRMED via A14**: 3 tool plan absent di-reference di SEMUA 14 stage skill. Detail per-stage (Output Contract, Search Policy, edge case) belum di-cross-check ke code. Anomaly stage-spesifik mungkin muncul di stage 8 (hasil — special_finalize), 12 (daftar_pustaka — compile path), 13 (lampiran — special_finalize), 14 (judul — special_finalize) — keempat stage ini punya jalur unik di `choice-workflow-registry.ts`.
6. **Chat UI rendering** — `UnifiedProcessCard`, `JsonRendererChoiceBlock`, `PaperValidationPanel`. Audit belum verify plan capture → render path end-to-end.
7. **`compaction` dan `memory digest`** — kalau plan disimpan di `_plan` field di stageData, apakah di-preserve saat compaction? Belum dicek.
8. **Search orchestrator** — `web-search/orchestrator.ts` punya integration dengan `pipe-plan-capture` (per grep awal). Belum diaudit gimana orchestrator handle search turn dengan plan state.

---

## Bagian 7 — Decision yang dibutuhkan dari user

Sebelum eksekusi:

1. **Jalur A atau Jalur B untuk Prioritas 1?** Rekomendasi: A (permanen). Tapi kalau ada constraint waktu / Phase 2 decision yang sudah locked → confirm.
2. **Hapus fallback hardcoded atau edit `foundation.ts`?** Untuk Prioritas 2.
3. **Lanjut audit stage 2-14 sekarang, atau langsung implementasi stage 1 dulu?** Phase 2 gap matrix (`docs/makalah-agent-harness/02-phase2-gap-matrix.md`) sudah cover beberapa cluster gap — perlu cross-check.

Setelah decision, baru lanjut ke Phase 4 task breakdown (atau langsung edit kalau scope kecil).

---

## Lampiran — Trace evidence (file:line untuk audit)

| Klaim | Evidence |
|---|---|
| `createStagePlan` tidak ada | `grep -rn "createStagePlan" src/ convex/` → empty (kecuali `.md` files) |
| `pipePlanCapture` aktif | `src/lib/chat-harness/executor/build-step-stream.ts:11, 681` |
| Skill DB instruct tool plan | `docs/what-is-makalah/references/agent-harness/system-prompt-skills-active/updated-9/01-gagasan-skill.md:98, 116, 119` |
| System prompt forbid YAML | `.../updated-9/system-prompt.md:308` |
| AVAILABLE TOOLS cuma 3 | `.../updated-9/system-prompt.md:215-218` |
| FUNCTION TOOLS list 7 | `.../updated-9/system-prompt.md:263-274` |
| Resolver fallback ke foundation | `src/lib/ai/stage-skill-resolver.ts:81-155` |
| Foundation divergen | `src/lib/ai/paper-stages/foundation.ts:14-146` |
| Plan-gate silent log | `src/lib/chat-harness/policy/enforcers.ts:28-30, 88-91` |
| `stabilizePlanAgainstCurrent` tidak ada | `grep -rn "stabilizePlanAgainstCurrent" src/ convex/` → empty |
| Schema plan tanpa `kind` | `src/lib/ai/harness/plan-spec.ts:21-29` |
| `STAGE_LIMITS` tidak ada | `src/lib/ai/stage-skill-contracts.ts` (15 baris total, tidak ada const) |
| Deploy script outdated | `scripts/deploy-skills-dev.py:9-10` |
| Verifier circular logic | `src/lib/chat-harness/verification/verify-step-outcome.ts:185-199` |
| Reset path panggil createStagePlan | `.../updated-9/system-prompt.md:345`, `.../updated-9/01-gagasan-skill.md:166` |
| Cross-stage scope reference | `grep "createStagePlan\|markTaskDone\|confirmStageFinalization" docs/.../updated-9/*.md` → match 14 stage + system-prompt |
| paperToolTracker shape | `src/lib/ai/paper-tools.ts:35-44` (tidak ada plan-related fields) |

---

**EOF**
