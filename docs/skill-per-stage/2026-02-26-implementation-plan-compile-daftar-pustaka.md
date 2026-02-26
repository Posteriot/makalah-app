# Implementation Plan: compileDaftarPustaka (Stage Daftar Pustaka)

Tanggal: 26 Februari 2026  
Status: Ready for Execution  
Referensi desain: `docs/skill-per-stage/2026-02-26-design-doc-compile-daftar-pustaka.md`

---

## 1) Tujuan Implementasi

Plan ini memecah implementasi `compileDaftarPustaka` menjadi task dan subtask yang bisa dieksekusi bertahap, dengan checklist verifikasi pada dua level:
1. Verifikasi pekerjaan (apakah perubahan teknis sudah diterapkan).
2. Verifikasi hasil (apakah perilaku sistem sesuai acceptance criteria).

---

## 2) Ruang Lingkup

In scope:
1. Tambah helper compiler daftar pustaka (dedup, merge, normalize, formatting).
2. Tambah mutation `paperSessions.compileDaftarPustaka`.
3. Tambah tool `compileDaftarPustaka` di `paper-tools.ts`.
4. Persist ke `stageData.daftar_pustaka` via `updateStageData`.
5. Guard rewind/superseded/invalidated stage.
6. Unit test + log observability.
7. Update instruksi stage `daftar_pustaka` agar pakai tool baru.

Out of scope:
1. Perubahan urutan stage 13 tahap.
2. Perubahan kontrak approve/revise global.
3. Perubahan format export Word/PDF.

---

## 3) Dependensi Teknis

1. `convex/paperSessions.ts`
2. `src/lib/ai/paper-tools.ts`
3. `src/lib/ai/paper-stages/finalization.ts`
4. `src/lib/paper/stage-types.ts` (referensi typing)
5. `convex/paperSessions/types.ts` (referensi shape stage)

---

## 4) Eksekusi Task per Task

## Task 0 — Preflight dan Baseline

### Subtask
1. Pastikan baseline code terbaru bisa build/test di environment lokal.
2. Catat baseline perilaku stage `daftar_pustaka` sebelum perubahan.
3. Siapkan branch kerja khusus implementasi ini.

### Checklist Verifikasi Pekerjaan
- [ ] `npm run build` bisa jalan tanpa error baru.
- [ ] `npm test` bisa jalan (atau tercatat jika ada failure existing yang unrelated).
- [ ] Baseline behavior terdokumentasi singkat di catatan PR.

### Checklist Verifikasi Hasil
- [ ] Tim punya baseline pembanding sebelum implementasi.

---

## Task 1 — Buat Helper Compiler Daftar Pustaka (Pure Function)

### Subtask
1. Buat file baru: `src/lib/paper/daftar-pustaka-compiler.ts`.
2. Definisikan tipe input internal untuk referensi lintas stage.
3. Implement normalize key:
   - URL normalize (reuse aturan `normalizeUrlForDedup`)
   - DOI normalize
   - fallback key `title+authors+year`
4. Implement dedup + merge metadata (prefer data lebih kaya).
5. Implement penentuan `isComplete` dan hitung `incompleteCount`.
6. Implement formatter minimal untuk `inTextCitation`/`fullReference` (jika belum ada).
7. Return payload compile standar (`entries`, `totalCount`, `incompleteCount`, `duplicatesMerged`, `rawCount`).

### Checklist Verifikasi Pekerjaan
- [ ] File helper baru dibuat dan export function utama tersedia.
- [ ] Tidak ada dependency pada context/runtime Convex (pure function).
- [ ] API function terdokumentasi via komentar singkat + type signature.

### Checklist Verifikasi Hasil
- [ ] Input duplikat URL/DOI/metadata menghasilkan satu entri unik.
- [ ] Metadata dari sumber berbeda tergabung sesuai prioritas kelengkapan.
- [ ] `duplicatesMerged` akurat (`rawCount - uniqueCount`).

---

## Task 2 — Tambah Unit Test Dedup/Merge/Guard

### Subtask
1. Buat file test: `src/lib/paper/daftar-pustaka-compiler.test.ts`.
2. Tambah skenario wajib:
   - dedup URL normalized
   - dedup DOI
   - dedup fallback title+authors+year
   - metadata merge
   - `isComplete` dan `incompleteCount`
   - skip stage invalidated/superseded
3. Pastikan test deterministic (tanpa network/time flaky).

### Checklist Verifikasi Pekerjaan
- [ ] Minimum 6 test case utama ter-cover.
- [ ] Tidak ada penggunaan data eksternal/network.
- [ ] Naming test mencerminkan behavior, bukan implementasi internal.

### Checklist Verifikasi Hasil
- [ ] Semua test helper compile pass.
- [ ] Perubahan behavior dedup ke depan bisa terdeteksi oleh test.

---

## Task 3 — Implement Mutation `compileDaftarPustaka`

### Subtask
1. Tambah mutation baru di `convex/paperSessions.ts`:
   - nama: `compileDaftarPustaka`
   - args: `sessionId`, `includeWebSearchReferences?`
2. Guard mutation:
   - owner check
   - `currentStage === "daftar_pustaka"`
   - reject saat `stageStatus === "pending_validation"`
3. Ambil referensi dari stage 1-10 yang approved (`validatedAt` terisi).
4. Terapkan guard rewind tambahan:
   - skip stage invalidated dari rewind terbaru jika belum re-approved.
5. Panggil helper compiler untuk hasil final.
6. Return kontrak output compile + stats + warnings.

### Checklist Verifikasi Pekerjaan
- [ ] Mutation terdaftar sebagai export Convex function.
- [ ] Guard `currentStage` dan `pending_validation` aktif.
- [ ] Filtering stage approved + guard rewind berjalan sebelum compile.
- [ ] Output shape sesuai design doc.

### Checklist Verifikasi Hasil
- [ ] Mutation menolak compile jika bukan stage `daftar_pustaka`.
- [ ] Mutation tidak menyertakan referensi stage invalidated/superseded.
- [ ] Output compile konsisten saat dipanggil berulang pada input yang sama.

---

## Task 4 — Integrasi Tool `compileDaftarPustaka` di AI Layer

### Subtask
1. Tambah tool baru di `src/lib/ai/paper-tools.ts`.
2. Schema input tool:
   - `ringkasan` (required, max 280)
   - `ringkasanDetail` (optional, max 1000)
3. Flow eksekusi tool:
   - fetch session by conversation
   - call `paperSessions.compileDaftarPustaka`
   - call `paperSessions.updateStageData` untuk persist hasil
4. Return payload ringkas ke model (`totalCount`, `incompleteCount`, `duplicatesMerged`, warning/error).
5. Tambah error handling yang forward pesan backend.

### Checklist Verifikasi Pekerjaan
- [ ] Tool baru muncul di object return `createPaperTools`.
- [ ] Tool memanggil mutation compile lalu `updateStageData`.
- [ ] Tool response punya kontrak sukses/gagal jelas.

### Checklist Verifikasi Hasil
- [ ] Saat tool dipanggil, `stageData.daftar_pustaka` terisi field target.
- [ ] Saat mutation gagal, tool mengembalikan error yang actionable.

---

## Task 5 — Update Instruksi Stage Daftar Pustaka

### Subtask
1. Update `src/lib/ai/paper-stages/finalization.ts` pada section daftar pustaka.
2. Ubah flow agar kompilasi utama via `compileDaftarPustaka` tool, bukan kompilasi manual murni.
3. Pertahankan prinsip dialog-first sebelum submit validation.
4. Tegaskan larangan bypass stage guard.

### Checklist Verifikasi Pekerjaan
- [ ] Instruksi stage menyebut `compileDaftarPustaka` secara eksplisit.
- [ ] Instruksi tetap kompatibel dengan policy tool-routing existing.

### Checklist Verifikasi Hasil
- [ ] Model diarahkan ke jalur deterministik compile server-side.
- [ ] Risiko variasi kompilasi manual berkurang.

---

## Task 6 — Observability dan Logging

### Subtask
1. Tambah `console.log` terstruktur di mutation compile:
   - `rawCount`
   - `uniqueCount`
   - `duplicatesMerged`
   - `incompleteCount`
   - `approvedStageCount`
   - `skippedStageCount`
2. Tambah `console.warn` untuk skip karena anomali rewind/superseded.
3. (Opsional V2) tambah insert `systemAlerts` non-blocking.

### Checklist Verifikasi Pekerjaan
- [ ] Log utama compile tercetak sekali per eksekusi sukses.
- [ ] Warning log tercetak saat ada stage di-skip karena guard.

### Checklist Verifikasi Hasil
- [ ] Tim ops bisa tracing hasil compile dari log tanpa debug tambahan.
- [ ] Nilai count pada log konsisten dengan payload output mutation.

---

## Task 7 — Validasi End-to-End (Manual + Otomatis)

### Subtask
1. Jalankan unit test target compiler.
2. Jalankan full test suite (minimal `npm test`).
3. Jalankan build (`npm run build`).
4. Uji manual flow stage:
   - siapkan session dengan referensi di beberapa stage approved
   - trigger `compileDaftarPustaka`
   - verifikasi persist di `stageData.daftar_pustaka`
5. Uji kasus rewind:
   - lakukan rewind
   - compile ulang
   - verifikasi stage invalidated tidak ikut.

### Checklist Verifikasi Pekerjaan
- [ ] Unit test compile pass.
- [ ] Build pass.
- [ ] Flow manual terdokumentasi (input, output, bukti).

### Checklist Verifikasi Hasil
- [ ] Acceptance criteria design doc terpenuhi 100%.
- [ ] Tidak ada regresi pada stage lain.

---

## 5) Checklist Final Acceptance (Gate Release)

- [ ] Tool `compileDaftarPustaka` tersedia dan callable.
- [ ] Mutation `compileDaftarPustaka` tersedia dengan kontrak input/output terdokumentasi.
- [ ] Kompilasi lintas stage hanya dari stage approved (`validatedAt`).
- [ ] Stage invalidated/superseded akibat rewind tidak ikut compile.
- [ ] Persist hasil compile ke `stageData.daftar_pustaka` via `updateStageData` berhasil.
- [ ] Unit test dedup/merge/guard tersedia dan lulus.
- [ ] Logging observability compile tersedia.
- [ ] Instruksi stage `daftar_pustaka` sudah merujuk tool compile baru.

---

## 6) Bukti yang Harus Dikumpulkan (untuk PR/Audit)

1. Diff file implementasi utama.
2. Output test (ringkas) + status pass/fail.
3. Output build (ringkas).
4. Contoh payload sebelum/sesudah compile pada `stageData.daftar_pustaka`.
5. Cuplikan log compile (`raw`, `unique`, `duplicates`, `incomplete`).
6. Bukti kasus rewind: stage invalidated ter-skip.

---

## 7) Rencana Commit (Disarankan)

1. Commit 1: helper compiler + unit test.
2. Commit 2: mutation `compileDaftarPustaka` + logging.
3. Commit 3: tool `compileDaftarPustaka` + wiring persist.
4. Commit 4: update instruksi stage daftar pustaka + docs ringkas.

