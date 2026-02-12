# Implementation Task Plan - Working Title Paper Sessions

> Dokumen ini adalah rencana eksekusi teknis step-by-step untuk implementasi `workingTitle` pada Paper Sessions. Dokumen ini dipakai sebagai checklist implementasi agar perubahan lintas backend/frontend tetap solid dan minim regression.

## Ringkasan

Implementasi akan memisahkan judul sementara (`workingTitle`) dari judul final (`paperTitle`) dan judul percakapan (`conversations.title`). `workingTitle` bisa di-rename user sampai judul final terbentuk. Setelah `paperTitle` final terbentuk, rename `workingTitle` dikunci.

---

## Scope Implementasi

- Backend Convex:
  - Schema `paperSessions`
  - Mutation create/update/sync title
  - Backfill migration data lama
- Frontend:
  - Resolver title tunggal lintas komponen
  - UI rename working title di Paper Sessions
  - Sinkron tampilan di sidebar dan card
- Verifikasi:
  - Functional test matrix
  - Lint/build/check cepat

Di luar scope:
- Perubahan copy di luar area Paper Sessions
- Perubahan workflow stage selain logic judul
- Perubahan title behavior untuk `conversations` (chat history)

---

## Prinsip Implementasi

1. `workingTitle` adalah sumber judul sementara.
2. `paperTitle` adalah sumber judul final.
3. `conversations.title` hanya sumber seed/fallback, bukan sumber live-sync.
4. Semua panel UI wajib pakai resolver judul yang sama.
5. Rename `workingTitle` ditolak setelah `paperTitle` final ada.

---

## Step-by-Step Task

## Step 0 - Baseline dan Safety Check

- [x] Pastikan branch tetap di `feat/chatpage-redesign-mechanical-grace`.
- [x] Catat status git sebelum implementasi (untuk rollback point).
- [x] Pastikan dokumen acuan sudah final:
  - `docs/plans/paper-working-title-lifecycle/README.md`
  - dokumen ini (`implementation-task-plan.md`)

Output bukti:
- Screenshot/log `git status -sb`

---

## Step 1 - Update Data Model Schema

File target:
- `convex/schema.ts`

Task:
- [x] Tambah field `workingTitle: v.optional(v.string())` pada tabel `paperSessions`.
- [x] Jaga kompatibilitas field existing (`paperTitle`, `stageData`, dsb).

Output bukti:
- Diff schema
- Convex type sync sukses (saat codegen dijalankan)
- Catatan: `convex codegen` terhenti karena telemetry network (`o1192621.ingest.sentry.io`), validasi type dilakukan via `npm run build` (lolos).

---

## Step 2 - Backend Logic: Title Lifecycle

File target:
- `convex/paperSessions.ts`

Task:
- [x] Tambah helper internal:
  - normalizer title (trim + collapse whitespace)
  - deteksi placeholder title (`"Percakapan baru"`, `"New Chat"`)
- [x] Update mutation `create`:
  - seed `workingTitle` dari `conversation.title` jika valid non-placeholder
  - fallback ke `"Paper Tanpa Judul"` jika tidak valid
- [x] Update `approveStage` pada stage `judul`:
  - set `paperTitle = judulTerpilih`
  - set `workingTitle = judulTerpilih` (atomik patch yang sama)
- [x] Update `syncPaperTitle`:
  - sinkronkan `paperTitle` dan `workingTitle` bersamaan
- [x] Tambah mutation baru `updateWorkingTitle`:
  - validasi owner
  - validasi title non-empty + max length
  - tolak jika `paperTitle` sudah ada (rename lock)
  - patch `workingTitle` + `updatedAt`

Output bukti:
- Diff mutation
- Uji manual cepat mutation (success/fail case)

---

## Step 3 - Migration Backfill Data Existing

File target baru:
- `convex/migrations/backfillWorkingTitle.ts`

Task:
- [x] Buat migration idempotent.
- [x] Rule backfill:
  - Jika `paperTitle` ada -> `workingTitle = paperTitle`
  - Jika belum ada `paperTitle` dan `conversation.title` valid -> pakai conversation title
  - Selain itu -> `"Paper Tanpa Judul"`
- [ ] Pastikan migration aman dijalankan ulang.

Output bukti:
- Log hasil run migration
- Sample data sebelum/sesudah (minimal 3 kondisi)

---

## Step 4 - Frontend Utility: Single Title Resolver

File target baru:
- `src/lib/paper/title-resolver.ts`

Task:
- [x] Implement resolver prioritas:
  - `paperTitle` > `workingTitle` > `conversation.title` (non-placeholder) > fallback
- [x] Return metadata source (untuk debugging): `paperTitle|workingTitle|conversationTitle|fallback`.
- [ ] Tambah unit helper kecil (jika pattern test util tersedia) atau minimal test manual table-driven.

Output bukti:
- Diff util
- Hasil verifikasi contoh input-output resolver

---

## Step 5 - Frontend Integration di Komponen Terdampak

File target:
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/sidebar/SidebarProgress.tsx`
- `src/components/paper/PaperSessionCard.tsx`
- `src/lib/hooks/usePaperSession.ts`

Task:
- [x] Integrasi resolver di `SidebarPaperSessions`.
- [x] Tambah inline rename working title di `SidebarPaperSessions`:
  - Enter simpan
  - Escape batal
  - Blur simpan/batal sesuai validasi
  - disable edit saat final title sudah ada
- [x] Integrasi resolver di `SidebarProgress`.
- [x] Integrasi resolver di `PaperSessionCard`.
- [x] Expose mutation helper `updateWorkingTitle` di `usePaperSession`.

Output bukti:
- Diff komponen
- Video/screenshot dark + light mode untuk:
  - before final title
  - after final title (rename lock)

---

## Step 6 - Functional Verification Matrix

- [ ] Case A: Session baru, belum ada title final.
  - Expected: `workingTitle` muncul dari seed/fallback.
- [ ] Case B: User rename working title sebelum final.
  - Expected: sukses + tampil konsisten di semua panel.
- [ ] Case C: Conversation title berubah.
  - Expected: working title tidak ikut berubah.
- [ ] Case D: Stage `judul` di-approve.
  - Expected: `paperTitle` dan `workingTitle` sama dengan `judulTerpilih`.
- [ ] Case E: User coba rename setelah final title ada.
  - Expected: ditolak dengan pesan jelas.
- [ ] Case F: Data lama hasil migration.
  - Expected: semua session punya judul yang layak tampil.

Output bukti:
- Checklist pass/fail per case
- Catatan bug/regression jika ada

---

## Step 7 - Quality Gate

- [x] `npm run lint`
- [x] `npm run build` (jika dibutuhkan untuk validasi end-to-end)
- [ ] Smoke check UI Paper Sessions di light/dark

Output bukti:
- Ringkasan hasil command
- Jika ada warning existing, tandai sebagai pre-existing/non-blocking

---

## Step 8 - Documentation Sync

File target:
- `docs/plans/paper-working-title-lifecycle/README.md`
- dokumen ini

Task:
- [x] Update status implementasi per phase.
- [x] Tambah bagian “As-Built Notes” setelah implementasi selesai.
- [x] Catat deviasi dari plan (jika ada) beserta alasannya.

Output bukti:
- Diff dokumen final

---

## Step 9 - Commit Plan

- [ ] Commit implementasi dalam beberapa commit tematik (bukan satu commit besar):
  1. Schema + backend lifecycle
  2. Migration
  3. Frontend resolver + UI rename
  4. Documentation sync
- [ ] Sertakan pesan commit yang deskriptif dan mudah rollback.

Output bukti:
- Daftar hash commit + ringkasan isi

---

## Definition of Done

Implementasi dianggap selesai jika seluruh poin berikut terpenuhi:

1. `workingTitle` tersedia di schema dan data existing sudah ter-backfill.
2. Rename working title hanya aktif sebelum `paperTitle` final.
3. Finalisasi stage `judul` menyinkronkan `paperTitle` dan `workingTitle`.
4. Semua panel terkait menampilkan judul konsisten dari resolver tunggal.
5. Verifikasi matrix lulus dan tidak ada regression kritis.

---

## File Tracking Checklist

- [x] `convex/schema.ts`
- [x] `convex/paperSessions.ts`
- [x] `convex/migrations/backfillWorkingTitle.ts` (baru)
- [x] `src/lib/paper/title-resolver.ts` (baru)
- [x] `src/lib/hooks/usePaperSession.ts`
- [x] `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- [x] `src/components/chat/sidebar/SidebarProgress.tsx`
- [x] `src/components/paper/PaperSessionCard.tsx`
- [x] `docs/plans/paper-working-title-lifecycle/README.md`
- [x] `docs/plans/paper-working-title-lifecycle/implementation-task-plan.md`
