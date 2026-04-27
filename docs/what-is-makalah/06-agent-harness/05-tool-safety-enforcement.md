# 05: Tool Safety & Enforcement

File ini merinci mekanisme pertahanan dan validasi yang memastikan Agen AI tidak menyimpang dari alur kerja yang telah ditentukan. Fokusnya adalah menjaga **Control Plane Integrity** tanpa membatasi kemampuan **[Programmatic Tool Calling](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/programatic-tools-calling/programmatic-tool-calling.md)** dalam fase eksplorasi riset.

> **Sumber kebenaran**: `src/lib/chat-harness/policy/enforcers.ts`, `src/lib/chat-harness/policy/evaluate-runtime-policy.ts`, `src/lib/chat-harness/shared/auto-rescue-policy.ts`, `convex/paperSessions.ts`.

---

## 1. Filosofi: Guardrails, Not Handcuffs

Makalah AI menerapkan **Runtime Enforcers** yang bekerja di level orkestrasi, bukan cuma mengandalkan kepatuhan prompt. Tujuannya adalah memastikan setiap putaran penalaran agen menghasilkan transisi status yang valid bagi User Interface (UI), sementara agen tetap bebas bernalar di atas data mentah.

---

## 2. Runtime Enforcers (Proactive Guards)

Terdapat **tiga fungsi enforcer terpisah** di `enforcers.ts`, yang dikomposisi menjadi satu `prepareStep` oleh `composePrepareStep` (dengan prioritas) dan diorkestrasikan oleh `evaluateRuntimePolicy`.

### 2.1 `createRevisionChainEnforcer`

**Aktif ketika**: `stageStatus === "pending_validation"` atau `"revision"`.

Memanipulasi `toolChoice` per step berdasarkan riwayat tool yang dipanggil:
- Step 0 + `stageStatus === "revision"` → `toolChoice: "required"` (model HARUS memanggil tool, tidak boleh teks biasa).
- Setelah `requestRevision` dipanggil → `"required"`.
- Setelah `updateStageData` dipanggil → `"required"`.
- Setelah `updateArtifact` / `createArtifact` sukses (tracker flag aktif) → `toolChoice: { type: "tool", toolName: "submitStageForValidation" }` (dipaksa spesifik).
- Setelah artifact dipanggil tapi gagal (tracker flag tidak aktif) → `"required"` (izinkan retry).

> **Catatan kritis**: `toolChoice: "required"` tidak memaksa tool *tertentu* — model bebas memilih tool apapun dari registry. Hanya di ujung chain (setelah artifact sukses) tool dipaksa spesifik ke `submitStageForValidation`.

### 2.2 `createDraftingChoiceArtifactEnforcer`

**Aktif ketika**: `stageStatus === "drafting"` + ada `choiceInteractionEvent` + `shouldEnforceArtifactChain === true` + **tidak** dalam kondisi Plan Gate disabled.

Memaksa urutan chain secara **deterministik per tool**:
1. Jika `isCompileThenFinalize` dan `compileDaftarPustaka` belum dipanggil → paksa `compileDaftarPustaka`.
2. Jika `updateStageData` belum dipanggil (dan belum ada artifact) → paksa `updateStageData`.
3. Jika `updateStageData` sudah dipanggil tapi belum ada artifact → paksa `createArtifact`.
4. Jika artifact sudah ada tapi `submitStageForValidation` belum → paksa `submitStageForValidation`.

### 2.3 `createUniversalReactiveEnforcer`

**Aktif ketika**: `stageStatus === "drafting"` + ada `paperStageScope` (semua stage drafting).

Bereaksi *setelah* model memanggil `updateStageData`:
- Jika `updateStageData` sudah dipanggil dan belum ada artifact → paksa `createArtifact`.
- Jika artifact sudah ada tapi `submitStageForValidation` belum → paksa `submitStageForValidation`.
- Juga melacak timing antar step via `ctx.stepTimingRef`.

### 2.4 Plan Gate Logic

Ketika `planHasIncompleteTasks === true` dan `resolvedWorkflow.action === "finalize_stage"`, `createDraftingChoiceArtifactEnforcer` **sepenuhnya dinonaktifkan** (return `undefined`). Ini bukan "penurunan ketegasan" (*downgrade*) — enforcer tidak aktif sama sekali, memberikan model kebebasan penuh untuk menentukan langkah berikutnya.

---

## 3. Execution Boundary Classification

`build-tool-boundary-policy.ts` mengklasifikasikan mode eksekusi ke salah satu dari 5 nilai (prioritas dari atas):

| Priority | Boundary | Kondisi |
|---|---|---|
| 1 | `"forced-sync"` | `forcedSyncPrepareStep` aktif |
| 2 | `"forced-submit"` | `forcedToolChoice` aktif |
| 3 | `"exact-source"` | `exactSourceRouting.mode === "force-inspect"` |
| 4 | `"revision-chain"` | `revisionChainEnforcer` aktif |
| 5 | `"normal"` | Fallback |

Nilai ini diemit ke event store sebagai `execution_boundary_evaluated` untuk observabilitas.

---

## 4. Auto-Rescue Mechanism

Sistem melakukan **Auto-Rescue** ketika model memanggil `createArtifact` atau `updateArtifact` saat `stageStatus === "pending_validation"`.

Logika di `auto-rescue-policy.ts`:
1. Guard: Jika `stageStatus !== "pending_validation"` → return `{ rescued: false }` tanpa aksi (hanya trigger pada `pending_validation`, bukan status lain).
2. Memanggil mutasi `api.paperSessions.autoRescueRevision` di Convex — mengubah `stageStatus` ke `"revision"` secara atomik, increment `revisionCount`.
3. Fetch ulang session terbaru (`getByConversation`) dan inject ke caller via `refreshedSession`.
4. Eksekusi tool dilanjutkan dengan session yang sudah diperbarui. Jika rescue gagal, caller return error `AUTO_RESCUE_FAILED` ke model.

---

## 5. Backend Guards (Convex)

Garis pertahanan terakhir di `convex/paperSessions.ts` — berjalan di dalam transaksi database:

- **Ownership Check** (`requirePaperSessionOwner`, `requireAuthUserId`): Semua mutasi sensitif memvalidasi `session.userId === args.userId`. Unauthorized → throw.

- **`updateStageData` — Completed State Lock**: Jika `session.currentStage === "completed"` → throw `"Cannot update stage data in completed state — rewind to a specific stage first"`. (Status `"approved"` tidak memiliki locking guard yang setara di sini.)

- **`requestRevision` — Status Contract**: Mutasi backend `requestRevision` hanya valid ketika `stageStatus === "pending_validation"`. Status lain → throw `NOT_PENDING_VALIDATION`. (Layer tool di `paper-tools.ts` sudah melakukan cek ini duluan, tapi backend tetap menjadi ground truth.)

- **`rewindToStage` — Tiga Guard Berurutan**:
  1. Jika `mode !== "rewind"` (yaitu `cancel-approval` atau `cancel-choice`) dan `stageStatus === "revision"` → throw `"Cannot cancel: revision in progress"`.
  2. `isValidRewindTarget(currentStage, targetStage)` → validasi bahwa target adalah stage yang sah untuk di-rewind.
  3. `targetStageData.validatedAt` harus ada → throw `"Target stage has never been validated"`. Tidak bisa rewind ke stage yang belum pernah divalidasi User.

---

**File Source Code Utama:**
- `src/lib/chat-harness/policy/enforcers.ts`: Implementasi tiga fungsi enforcer (`createRevisionChainEnforcer`, `createDraftingChoiceArtifactEnforcer`, `createUniversalReactiveEnforcer`).
- `src/lib/chat-harness/policy/evaluate-runtime-policy.ts`: Orkestrator policy — memanggil semua enforcer, mengkomposisi `prepareStep`, mengklasifikasi execution boundary, dan emit event telemetri.
- `src/lib/chat-harness/policy/build-tool-boundary-policy.ts`: Klasifikasi `ExecutionBoundary` (5 nilai).
- `src/lib/chat-harness/policy/compose-prepare-step.ts`: Komposisi priority chain dari beberapa enforcer menjadi satu `prepareStep`.
- `src/lib/chat-harness/shared/auto-rescue-policy.ts`: Pemulihan status otonom (hanya untuk `pending_validation`).
- `convex/paperSessions.ts`: Validasi status, ownership, dan rewind target di level atomik database.
