# Paper Working Title Lifecycle - Planning Implementasi

> Dokumen planning untuk perubahan besar Paper Sessions agar mendukung rename judul sementara (working title) dengan aman, konsisten, dan tidak bentrok dengan judul final paper maupun judul percakapan.

## Status

- Status: Implementasi selesai di codebase (pending eksekusi migration di environment aktif)
- Scope: Backend Convex + UI sidebar chat + display title lintas komponen
- Branch target: `feat/chatpage-redesign-mechanical-grace`

---

## Latar Belakang

Saat ini, judul folder di Paper Sessions mengandalkan `paperTitle` dan fallback tertentu.
Di sisi lain, judul percakapan (`conversations.title`) punya lifecycle sendiri dan bisa berubah oleh AI/user.

Kebutuhan produk baru:
- User bisa rename judul folder paper sebagai **working title**.
- Working title bersifat sementara.
- Saat judul final dipilih di tahap akhir (`judul`), nama paper harus mengikuti judul final tersebut.

---

## Kondisi Kode Saat Ini (Evidence)

1. Tahap final judul ada di stage ke-13:
- `convex/paperSessions/constants.ts` (`STAGE_ORDER` berakhir di `judul`)

2. Saat approve stage `judul`, `paperTitle` di-set dari `judulTerpilih`:
- `convex/paperSessions.ts` pada blok `if (currentStage === "judul")`

3. `conversations.title` adalah entitas terpisah dan bisa diubah AI/user:
- `convex/conversations.ts`
- `src/app/api/chat/route.ts` (auto-rename AI, lock logic, limit update count)

4. Sidebar Paper Sessions saat ini menampilkan `session.paperTitle`:
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`

5. Komponen kartu paper punya fallback ke `conversation.title`:
- `src/components/paper/PaperSessionCard.tsx` (`getDisplayTitle`)

---

## Keputusan Arsitektur (Rekomendasi Terbaik)

Gunakan field baru `workingTitle` di `paperSessions` sebagai sumber judul sementara.

Alasan keputusan:
- Memisahkan domain data:
  - `workingTitle` = judul kerja sementara
  - `paperTitle` = judul final terpilih
  - `conversation.title` = judul chat
- Menghindari efek samping saat `conversation.title` diubah AI.
- Menjaga konsistensi UI Paper Sessions lintas panel.

Aturan lifecycle yang disepakati:
1. `workingTitle` di-seed satu kali saat `paperSessions.create`.
2. User rename hanya mengubah `workingTitle`.
3. Saat stage `judul` disetujui, set `paperTitle` dan sinkronkan `workingTitle` ke judul final yang sama.
4. Setelah `paperTitle` ada, rename working title dinonaktifkan (untuk cegah konflik semantik judul final).

---

## Target Perilaku (Functional Spec)

1. Menampilkan judul paper:
- Prioritas display: `paperTitle` > `workingTitle` > `conversation.title` non-placeholder > fallback default.

2. Rename working title:
- Hanya pemilik sesi.
- Validasi input: trim, non-empty, max length.
- Jika `paperTitle` sudah ada: tolak rename dengan pesan jelas.

3. Sinkron judul final:
- Approve stage `judul` mengisi `paperTitle` dan `workingTitle` secara atomik pada patch yang sama.
- Mutation `syncPaperTitle` juga mengisi keduanya.

---

## Dampak Skema Data dan Backend

## 1) Schema

File:
- `convex/schema.ts`

Perubahan:
- Tambah field opsional: `workingTitle: v.optional(v.string())` pada tabel `paperSessions`.

## 2) Paper Session Mutations

File:
- `convex/paperSessions.ts`

Perubahan:
- `create`:
  - Seed `workingTitle` dari `conversation.title` jika bukan placeholder.
  - Fallback ke default jika title tidak layak pakai.
- `approveStage`:
  - Pada stage `judul`, update `paperTitle` dan `workingTitle` bersama.
- `syncPaperTitle`:
  - Patch `paperTitle` dan `workingTitle` bersama.
- Tambah mutation baru: `updateWorkingTitle`.
  - Args: `sessionId`, `userId`, `title`
  - Guard owner + validasi input + guard `paperTitle` belum ada.

## 3) Migration / Backfill

File baru:
- `convex/migrations/backfillWorkingTitle.ts` (nama final bisa disesuaikan)

Backfill rule:
1. Jika `paperTitle` ada -> `workingTitle = paperTitle`
2. Jika belum ada `paperTitle` dan `conversation.title` valid -> pakai `conversation.title`
3. Jika tidak ada semua -> `workingTitle = "Paper Tanpa Judul"`

Karakteristik:
- Idempotent
- Bisa dijalankan ulang tanpa efek samping

---

## Dampak Frontend

## 1) Sidebar Paper Sessions

File:
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`

Perubahan:
- Display title pakai resolver prioritas baru.
- Tambah mode inline rename untuk `workingTitle` (hanya sebelum judul final).
- Event keyboard:
  - Enter: simpan
  - Escape: batal
  - Blur: simpan atau batal sesuai hasil validasi

## 2) Sidebar Progress

File:
- `src/components/chat/sidebar/SidebarProgress.tsx`

Perubahan:
- Subtitle/judul paper ikut resolver prioritas baru agar konsisten dengan Paper Sessions.

## 3) Paper Session Card

File:
- `src/components/paper/PaperSessionCard.tsx`

Perubahan:
- Update `getDisplayTitle()` agar aware ke `workingTitle`.

## 4) Hook dan Mutation Wiring

File:
- `src/lib/hooks/usePaperSession.ts`

Perubahan:
- Expose helper mutation `updateWorkingTitle` untuk dipakai UI.

---

## Resolver Judul (Sumber Tunggal)

Buat util helper agar semua komponen pakai aturan sama.

Lokasi usulan:
- `src/lib/paper/title-resolver.ts`

Kontrak:
- Input: session + optional conversation
- Output: `{ displayTitle, source }`
- `source` membantu debug (`paperTitle` | `workingTitle` | `conversationTitle` | `fallback`)

---

## Validasi dan Guardrails

1. Validasi title:
- `trim()`
- Collapse spasi beruntun
- Panjang maksimum (disepakati di implementasi, contoh 80)
- Tolak string kosong

2. Placeholder conversation title yang tidak dipakai seed:
- `"Percakapan baru"`
- `"New Chat"`

3. Permission:
- Semua mutation title wajib owner check (`requireAuthUserId` + ownership session).

---

## Analisis Risiko

## Risiko 1: Konflik antar sumber judul
- Level: Medium
- Dampak: UI menampilkan judul berbeda-beda antar panel
- Mitigasi: resolver tunggal + update semua komponen display

## Risiko 2: Data lama tanpa `workingTitle`
- Level: Medium
- Dampak: folder kembali ke fallback generik
- Mitigasi: backfill migration idempotent

## Risiko 3: Rename setelah judul final
- Level: Medium
- Dampak: semantik judul final jadi ambigu
- Mitigasi: lock rename jika `paperTitle` sudah ada

## Risiko 4: Race condition update judul
- Level: Low
- Dampak: overwrite sesaat
- Mitigasi: patch atomik pada approve/sync + guard mutation

---

## Rencana Implementasi Bertahap

## Phase 1 - Data Foundation
1. Tambah `workingTitle` di schema
2. Generate ulang types Convex
3. Implement backfill migration

## Phase 2 - Backend Logic
1. Update `create` untuk seed `workingTitle`
2. Update `approveStage` dan `syncPaperTitle`
3. Tambah mutation `updateWorkingTitle`

## Phase 3 - Frontend Integration
1. Tambah resolver util
2. Integrasi resolver di SidebarPaperSessions, SidebarProgress, PaperSessionCard
3. Implement inline rename UI di Paper Sessions

## Phase 4 - QA dan Stabilization
1. Uji manual scenario matrix
2. Lint/build/test
3. Review behavior dark/light mode pada area yang terdampak

---

## Test Matrix (Wajib Lolos)

1. Session baru dibuat:
- `workingTitle` terisi sesuai seed rule

2. Rename working title:
- Berhasil sebelum stage `judul` final
- UI langsung update

3. Conversation title berubah oleh AI:
- `workingTitle` tidak ikut berubah

4. Approve stage `judul`:
- `paperTitle` dan `workingTitle` sama dengan `judulTerpilih`

5. Setelah final title ada:
- Rename working title ditolak

6. Session lama (hasil backfill):
- Tetap punya judul yang layak tampil

7. Konsistensi panel:
- SidebarPaperSessions, SidebarProgress, PaperSessionCard menampilkan judul sama

---

## Acceptance Criteria

1. Working title bisa diubah user sebelum judul final diset.
2. Judul final dari stage `judul` selalu override working title.
3. Tidak ada coupling live ke `conversations.title`.
4. Semua panel menampilkan judul yang konsisten.
5. Migrasi data lama aman dan idempotent.

---

## File Impact Index

- `convex/schema.ts`
- `convex/paperSessions.ts`
- `convex/migrations/backfillWorkingTitle.ts` (baru)
- `src/lib/hooks/usePaperSession.ts`
- `src/lib/paper/title-resolver.ts` (baru)
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/sidebar/SidebarProgress.tsx`
- `src/components/paper/PaperSessionCard.tsx`

---

## Catatan Eksekusi

Dokumen ini jadi acuan implementasi agar perubahan besar tetap terkontrol.
Semua perubahan wajib mengikuti urutan phase untuk meminimalkan regression dan mismatch data.

## As-Built Notes

Implementasi yang sudah diterapkan:
- Schema `paperSessions` sudah punya field `workingTitle`.
- Backend lifecycle judul sudah aktif:
  - seed `workingTitle` saat create session
  - sinkron `paperTitle` + `workingTitle` saat finalisasi stage `judul`
  - mutation baru `updateWorkingTitle` dengan lock jika `paperTitle` sudah ada
- Migration file backfill sudah dibuat:
  - `convex/migrations/backfillWorkingTitle.ts`
- Resolver judul tunggal sudah dibuat dan dipakai lintas UI:
  - `src/lib/paper/title-resolver.ts`
- UI Paper Sessions sudah support inline rename working title (dengan lock saat final title).

Validasi teknis:
- `npm run lint` lulus (ada 1 warning lama yang tidak terkait perubahan ini).
- `npm run build` lulus.

Deviasi dari rencana:
- `convex codegen` tidak bisa dieksekusi bersih di environment ini karena kegagalan network telemetry (`o1192621.ingest.sentry.io`), namun type check tetap tervalidasi via `npm run build`.
