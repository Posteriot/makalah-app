# Implementation Plan: `compileDaftarPustaka` Mode `preview|persist`

Tanggal: 26 Februari 2026  
Status: Implemented (branch `feat/compile-daftar-pustaka`, commit `d3a6069`)  
Scope: Evolusi tool tunggal `compileDaftarPustaka` agar mendukung dua mode:
1. `preview` (boleh di semua stage, non-persist)
2. `persist` (hanya di stage `daftar_pustaka`, simpan ke `stageData.daftar_pustaka`)

Referensi:
1. `docs/skill-per-stage/2026-02-26-design-doc-compile-daftar-pustaka.md`
2. `docs/skill-per-stage/2026-02-26-implementation-plan-compile-daftar-pustaka.md`
3. `docs/skill-per-stage/2026-02-26-execution-log-compile-daftar-pustaka.md`

---

## Update Implementasi (26 Februari 2026)

Ringkasan hasil eksekusi:
1. Mutation `paperSessions.compileDaftarPustaka` sudah mendukung `mode: "preview" | "persist"` (default backward-compatible `persist`).
2. Tool `createPaperTools().compileDaftarPustaka` sudah multi-mode:
   - `preview`: compile-only, tanpa `updateStageData`
   - `persist`: wajib `ringkasan`, compile + persist via `updateStageData`
3. Chat router sudah punya compile-intent override supaya request compile tidak terkunci mode `google_search` only.
4. Prompt/stage instructions sudah di-sync:
   - guidance global preview lintas stage
   - finalisasi stage daftar pustaka wajib `mode: "persist"`
5. Test otomatis yang sudah pass:
   - `npx vitest run convex/paperSessions/daftarPustakaCompiler.test.ts src/lib/ai/paper-tools.compileDaftarPustaka.test.ts src/lib/ai/chat-route-compile-intent.test.ts`
   - `npm run build`
6. Verifikasi manual yang sudah terbukti:
   - `preview` sukses di stage non-`daftar_pustaka` (contoh tahap abstrak)
   - `persist` ditolak di stage non-`daftar_pustaka` (guard aktif)
7. Catatan environment:
   - sempat ada mismatch Convex karena `convex dev` berjalan dari worktree lain; setelah diarahkan ke worktree ini, validator `mode` berjalan normal.

---

## 1) Tujuan Implementasi

1. Menyediakan visibilitas status referensi sejak stage awal (`gagasan`) tanpa menunggu stage 11.
2. Menjaga integritas workflow 13 tahap dengan tetap membatasi persist final hanya di `daftar_pustaka`.
3. Menyatukan domain logic kompilasi referensi pada satu tool untuk menghindari drift behavior.

---

## 2) Ruang Lingkup

In scope:
1. Perubahan kontrak mutation `compileDaftarPustaka` untuk mode `preview|persist`.
2. Perubahan kontrak tool AI `compileDaftarPustaka` dengan input mode.
3. Guard stage-based:
   - `preview`: semua stage
   - `persist`: hanya `daftar_pustaka`
4. Output preview ringkas agar hemat token.
5. Update instruksi stage agar konsisten dengan mode baru.
6. Testing otomatis + checklist verifikasi manual.

Out of scope:
1. Perubahan urutan stage 13 tahap.
2. Perubahan policy approve/revise global di luar domain daftar pustaka.
3. Perombakan format export Word/PDF.

---

## 3) Kontrak Baru yang Ditargetkan

## 3.1 Mutation `paperSessions.compileDaftarPustaka`

Input target:
```ts
{
  sessionId: Id<"paperSessions">,
  mode?: "preview" | "persist", // default transisi: "persist" (backward-compatible)
  includeWebSearchReferences?: boolean // default: true
}
```

Aturan target:
1. `preview`:
   - bisa dipanggil dari stage mana pun.
   - compile-only (tidak patch `stageData`).
   - jika belum ada referensi dari stage approved, return `success` dengan count = 0 (bukan throw error).
2. `persist`:
   - hanya valid jika `currentStage === "daftar_pustaka"`.
   - reject jika `stageStatus === "pending_validation"`.
   - boleh throw error jika hasil compile kosong (karena ini jalur finalisasi).

Catatan kompatibilitas:
1. Untuk mencegah breaking change caller lama, default mode di fase transisi harus `persist`.
2. Setelah semua caller eksplisit mengirim `mode`, default boleh dievaluasi ulang.

Output target:
```ts
{
  success: true,
  mode: "preview" | "persist",
  stage: string,
  compiled: {
    entries: [...],
    totalCount: number,
    incompleteCount: number,
    duplicatesMerged: number,
  },
  stats: {
    rawCount: number,
    approvedStageCount: number,
    skippedStageCount: number,
  },
  warnings?: string[]
}
```

## 3.2 Tool `createPaperTools().compileDaftarPustaka`

Input target:
```ts
{
  mode?: "preview" | "persist", // default transisi: "persist"
  ringkasan?: string,              // required only when mode="persist"
  ringkasanDetail?: string         // optional, used mainly for persist
}
```

Aturan tool target:
1. `preview`:
   - call mutation mode preview.
   - return summary ringkas, tanpa `updateStageData`.
2. `persist`:
   - validasi `ringkasan` wajib.
   - call mutation mode persist.
   - lanjut `updateStageData` untuk simpan final.
3. Backward compatibility:
   - jika caller lama tidak mengirim `mode`, behavior tetap `persist`.
   - caller baru untuk audit lintas stage wajib eksplisit `mode="preview"`.

Output tool target (ringkas):
1. `totalCount`
2. `incompleteCount`
3. `duplicatesMerged`
4. `previewIncompleteSamples` (maks 5, hanya untuk `preview`)

---

## 4) Task Breakdown

## Task 0 — Preflight

### Subtask
1. Pull baseline branch aktif.
2. Pastikan tidak ada konflik dari perubahan non-scope.
3. Jalankan baseline `build` dan `test` untuk pembanding.
4. Verifikasi kontrak existing caller yang saat ini memanggil `compileDaftarPustaka` tanpa `mode`.

### Checklist verifikasi pekerjaan
- [ ] `git status` bersih untuk file scope atau diketahui daftar perubahan unrelated.
- [ ] `npm run build` baseline tercatat.
- [ ] `npm test` baseline tercatat (termasuk fail existing jika ada).
- [ ] Daftar caller existing tanpa `mode` terdokumentasi.

### Checklist verifikasi hasil
- [ ] Baseline siap dipakai untuk bedakan regresi baru vs issue lama.

---

## Task 1 — Ubah Mutation ke Mode `preview|persist`

### File
1. `convex/paperSessions.ts`

### Subtask
1. Tambahkan argumen `mode` dengan default transisi `persist` (backward-compatible).
2. Terapkan guard per mode:
   - `preview`: skip guard stage aktif.
   - `persist`: wajib stage `daftar_pustaka` dan bukan `pending_validation`.
3. Pertahankan logic compile existing:
   - source stages 1-10
   - only approved (`validatedAt`)
   - skip invalidated by latest rewind (kecuali re-approved)
4. Sertakan `mode` di payload return.
5. Ubah behavior empty-result:
   - `preview` => return sukses + count 0 + warning.
   - `persist` => tetap boleh reject.

### Checklist verifikasi pekerjaan
- [ ] Mutation menerima mode dan tidak break backward compatibility.
- [ ] Guard mode berjalan sesuai desain.
- [ ] Log observability tetap keluar untuk kedua mode.
- [ ] Caller lama tanpa `mode` tetap berperilaku seperti sebelum perubahan (persist).

### Checklist verifikasi hasil
- [ ] `preview` bisa dipanggil dari stage non-`daftar_pustaka`.
- [ ] `persist` ditolak di stage selain `daftar_pustaka`.
- [ ] `preview` pada stage awal (tanpa referensi approved) return sukses dengan count 0.

---

## Task 2 — Ubah Tool AI ke Single Tool Multi-Mode

### File
1. `src/lib/ai/paper-tools.ts`

### Subtask
1. Tambahkan field `mode` di input schema.
2. Terapkan conditional requirement:
   - `persist` wajib `ringkasan`
   - `preview` tidak wajib `ringkasan`
   - default transisi tanpa `mode` => `persist`
3. Jalur `preview`:
   - call mutation mode preview
   - return ringkas tanpa call `updateStageData`
4. Jalur `persist`:
   - call mutation mode persist
   - call `updateStageData` untuk persist final

### Checklist verifikasi pekerjaan
- [ ] Tool tunggal tetap bernama `compileDaftarPustaka`.
- [ ] Tidak ada persist saat mode preview.
- [ ] Error message jelas saat input tidak sesuai mode.
- [ ] Jalur caller lama tanpa `mode` tidak berubah (tetap persist).

### Checklist verifikasi hasil
- [ ] AI bisa minta status referensi dari stage awal tanpa ubah DB.
- [ ] AI tetap bisa finalize di stage daftar pustaka dengan persist.

---

## Task 3 — Ringkas Output Preview (Token-Efficient)

### File
1. `src/lib/ai/paper-tools.ts`
2. (opsional helper) `convex/paperSessions/daftarPustakaCompiler.ts`

### Subtask
1. Tambahkan ringkasan preview:
   - `totalCount`, `incompleteCount`, `duplicatesMerged`
2. Tambahkan sample incomplete entries max 5.
3. Hindari mengembalikan `entries` penuh di mode preview jika tidak diperlukan.

### Checklist verifikasi pekerjaan
- [ ] Payload preview lebih kecil dari payload persist.
- [ ] Informasi minimum audit tetap tersedia.

### Checklist verifikasi hasil
- [ ] Chat preview tidak boros token saat dipanggil berulang lintas stage.

---

## Task 4 — Router/Tool Availability Guard (Web Search Constraint)

### File
1. `src/app/api/chat/route.ts`
2. `src/lib/ai/paper-mode-prompt.ts`

### Subtask
1. Tambahkan deteksi intent compile daftar pustaka (`preview` atau `persist`) pada routing decision.
2. Jika intent compile terdeteksi, paksa `enableWebSearch = false` agar function tools tersedia di turn yang sama.
3. Tambahkan fallback note jika turn saat ini sudah telanjur web-search-only:
   - compile akan dieksekusi di turn berikutnya saat function tools aktif.

### Checklist verifikasi pekerjaan
- [ ] Compile intent tidak terjebak mode `google_search` only.
- [ ] Tidak mengganggu behavior web search normal untuk intent lain.

### Checklist verifikasi hasil
- [ ] Request user untuk compile preview bisa mengeksekusi tool langsung tanpa nunggu turn tambahan.

---

## Task 5 — Update Stage Instructions

### File
1. `src/lib/ai/paper-stages/finalization.ts`
2. `src/lib/ai/paper-mode-prompt.ts` (wajib, untuk guidance lintas stage)
3. Stage instruction aktif (`foundation.ts`, `core.ts`, `results.ts`) bila perlu callout eksplisit

### Subtask
1. Stage `daftar_pustaka`: wajib `mode="persist"` untuk final save.
2. Tambahkan guidance global bahwa stage lain boleh `mode="preview"` untuk audit referensi interim.
3. Tegaskan larangan bypass guard linear workflow.

### Checklist verifikasi pekerjaan
- [ ] Instruksi tidak ambigu antara preview vs persist.
- [ ] Bahasa instruksi sinkron dengan kontrak tool terbaru.
- [ ] Guidance preview lintas stage tersedia minimal di prompt global paper mode (bukan hanya finalization stage).

### Checklist verifikasi hasil
- [ ] Model tidak lagi memaksa compile persist di stage non-daftar-pustaka.

---

## Task 6 — Testing

### File test
1. `convex/paperSessions/daftarPustakaCompiler.test.ts` (existing, extend bila perlu)
2. `src/lib/ai/paper-tools.compileDaftarPustaka.test.ts` (baru, mock fetchQuery/fetchMutation)
3. `src/lib/ai/chat-route-compile-intent.test.ts` (baru, verifikasi router override compile intent)
4. (opsional) helper policy test di `convex/paperSessions` untuk guard mode jika harness mutation direct belum tersedia

### Subtask
1. Tambah test mode behavior:
   - preview allowed in all stages
   - persist blocked outside `daftar_pustaka`
   - persist allowed in `daftar_pustaka`
2. Tambah test bahwa preview tidak mengubah `stageData`.
3. Pertahankan test dedup/merge yang sudah lulus.
4. Tambah test default compatibility:
   - tanpa `mode` => jalur persist.
5. Tambah test router:
   - saat intent compile terdeteksi, mode web search tidak mengunci function tools.

### Checklist verifikasi pekerjaan
- [ ] Semua test baru deterministic.
- [ ] Tidak ada network dependency.
- [ ] File test dan command run terdokumentasi jelas.

### Checklist verifikasi hasil
- [ ] `npx vitest run convex/paperSessions/daftarPustakaCompiler.test.ts` pass.
- [ ] `npx vitest run src/lib/ai/paper-tools.compileDaftarPustaka.test.ts` pass.
- [ ] `npx vitest run src/lib/ai/chat-route-compile-intent.test.ts` pass.
- [ ] `npm run build` pass.
- [ ] `npm test` tidak menambah fail baru di luar baseline existing.

---

## Task 7 — Verifikasi Manual

### Subtask
1. Dari stage awal (`gagasan`), panggil:
   - `compileDaftarPustaka` mode preview.
2. Verifikasi respons berisi stats ringkas dan sample incomplete.
3. Verifikasi DB tidak berubah pada `stageData.daftar_pustaka` setelah preview.
4. Saat tiba stage `daftar_pustaka`, panggil mode persist.
5. Verifikasi `stageData.daftar_pustaka` terisi.
6. Uji rewind lalu preview/persist ulang untuk pastikan stage invalidated tidak ikut.

### Checklist verifikasi pekerjaan
- [ ] Bukti screenshot/chat log preview dari stage non-daftar-pustaka.
- [ ] Bukti snapshot DB sebelum/sesudah preview (tidak berubah).
- [ ] Bukti snapshot DB sesudah persist (berubah sesuai expected).

### Checklist verifikasi hasil
- [ ] Preview usable sejak stage `gagasan`.
- [ ] Persist tetap eksklusif stage `daftar_pustaka`.
- [ ] Guard rewind tetap efektif.
- [ ] Compile request tidak terhambat oleh mode web search-only.

---

## 5) Acceptance Criteria Final

- [x] Tool tunggal `compileDaftarPustaka` mendukung `mode: preview|persist`.
- [x] Default transisi tetap backward-compatible untuk caller lama (tanpa `mode` => persist).
- [x] `preview` bisa dipakai di semua stage tanpa persist.
- [x] `persist` hanya valid di stage `daftar_pustaka`.
- [x] Compile tetap berdasarkan stage approved + filter rewind invalidation.
- [x] `preview` di stage awal (tanpa referensi approved) menghasilkan sukses dengan count 0.
- [x] Output preview ringkas dan hemat token.
- [x] Build pass dan test tidak menambah regresi baru.
- [ ] Bukti manual verifikasi tersedia lengkap (preview + persist di stage 11 + rewind).

---

## 6) Rencana Commit (Disarankan)

1. Commit 1: mutation mode guard + empty-preview behavior + backward-compat default.
2. Commit 2: router compile-intent override + tool mode routing + output preview ringkas.
3. Commit 3: update instructions global/stage + tests.
4. Commit 4: docs/execution log update.
