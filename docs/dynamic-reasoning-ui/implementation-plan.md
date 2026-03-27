# Implementation Plan: Dynamic Reasoning UI

Tanggal: 2026-03-27
Design source: `docs/dynamic-reasoning-ui/design-doc.md`
Branch kerja: `fix/chat-transparent-thinking-surface`

## 1. Prinsip Eksekusi

Plan ini wajib patuh penuh pada design doc:

- source of truth transparent adalah live reasoning snapshot, bukan delta terakhir
- curated mode tidak berubah perilakunya
- persistence schema tidak diubah
- right sheet timeline tetap bisa diakses
- process indicators lain tidak dihapus pada fase ini

Semua perubahan harus dijaga sempit di lapisan streaming event, derivation state UI, dan test coverage.

## 2. Deliverables

- Event stream baru `data-reasoning-live` aktif pada transparent mode
- Backend accumulator yang emit snapshot monotonik untuk normal path dan websearch path
- Frontend transparent state yang membaca snapshot live dan mempertahankannya sampai selesai
- Status bar transparent yang tidak lagi jatuh ke state dots-only setelah snapshot valid pertama muncul
- Regression tests untuk transparent mode, curated mode, rehydrate, dan websearch/non-websearch emit behavior

## 3. Langkah Implementasi

### Langkah 1: Tambah tipe data reasoning live

File:

- `src/lib/ai/curated-trace.ts`
- `src/components/chat/ChatWindow.tsx` bila type lokal dibutuhkan

Pekerjaan:

- definisikan type baru `ReasoningLiveDataPart`
- struktur mengikuti design doc: `traceId`, `text`, `ts`, `done?`
- jangan hapus `ReasoningThoughtDataPart`; biarkan sementara untuk compatibility

Acceptance:

- tipe baru tersedia dan bisa dipakai lint/type-check tanpa memutus jalur lama

### Langkah 2: Refactor accumulator normal path menjadi snapshot emitter

File:

- `src/app/api/chat/route.ts`
- bila perlu helper kecil baru di `src/lib/ai/`

Pekerjaan:

- ubah `createReasoningAccumulator()` agar:
  - tetap menyimpan raw reasoning buffer penuh
  - membentuk sanitized snapshot dari keseluruhan buffer
  - melacak snapshot terakhir yang sudah dikirim
  - emit `data-reasoning-live` jika snapshot berubah bermakna
- pertahankan `getFullReasoning()` untuk persistence final
- hindari sampling `chunkCount % 3`
- bila perlu tambah throttle waktu ringan berbasis timestamp internal accumulator

Acceptance:

- transparent mode non-websearch mengirim beberapa snapshot selama reasoning aktif
- snapshot tidak kosong dan tidak spam berlebihan
- raw reasoning persistence tetap utuh

### Langkah 3: Refactor websearch orchestrator ke model snapshot yang sama

File:

- `src/lib/ai/web-search/orchestrator.ts`

Pekerjaan:

- ganti emit `data-reasoning-thought` sampling dengan `data-reasoning-live` snapshot
- gunakan prinsip sama dengan normal path:
  - reasoningBuffer raw tetap dikumpulkan
  - snapshot tersanitasi di-emit saat berubah
  - optional time gate ringan untuk mencegah flood
- pastikan finish path tetap menyimpan `reasoningBuffer`

Acceptance:

- websearch compose path mengikuti perilaku live yang sama dengan normal path
- tidak ada divergence logic besar antara kedua jalur

### Langkah 4: Tambah extractor frontend untuk live snapshot

File:

- `src/components/chat/ChatWindow.tsx`

Pekerjaan:

- tambahkan `extractLiveReasoningSnapshot()`
- prioritas transparent:
  1. `data-reasoning-live`
  2. fallback `data-reasoning-thought` lama bila stream baru belum tersedia
  3. fallback headline/timeline existing
- update `activeReasoningState` agar menyimpan headline transparent dari snapshot live
- jangan merusak logic rehydrate dari persisted `rawReasoning`

Acceptance:

- selama stream aktif, snapshot live dipakai sebagai headline transparent
- setelah reload, persisted final reasoning tetap bisa muncul

### Langkah 5: Kunci behavior status bar transparent agar tidak drop ke dots-only

File:

- `src/components/chat/ChatProcessStatusBar.tsx`

Pekerjaan:

- pastikan transparent mode tidak mengosongkan headline setelah snapshot valid pertama ada
- pertahankan render:
  - headline reasoning
  - dots
  - progress
- tetap izinkan `Detail →` / panel reasoning sebagai drill-down manual
- jangan ubah curated completed/collapsed behavior kecuali diperlukan untuk menjaga kompatibilitas type

Acceptance:

- transparent mode tidak lagi menampilkan status bar kosong hanya berisi dots/progress setelah snapshot reasoning pernah muncul

### Langkah 6: Tambah dan perbarui test coverage

File target minimum:

- `src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx`
- `src/components/chat/ChatWindow.mobile-workspace.test.tsx`
- test baru untuk extractor/derivation di `src/components/chat/`
- test baru untuk backend accumulator normal path
- test baru untuk websearch orchestrator reasoning emit

Pekerjaan:

- test bahwa transparent mode memakai `data-reasoning-live`
- test bahwa headline tetap ada ketika tidak ada update baru di interval berikutnya
- test fallback ke `data-reasoning-thought` lama tetap aman
- test curated mode tidak berubah
- test right sheet tetap bisa dibuka
- test persistence/rehydrate tetap aman

Acceptance:

- test baru menangkap regresi “muncul di 8%, hilang di 48%, muncul lagi di 92%”

### Langkah 7: Verifikasi manual di worktree

Perintah:

```bash
cd /Users/eriksupit/Desktop/makalahapp/.worktrees/chat-transparent-thinking-surface
npx vitest run <test-files-yang-relevan>
PORT=3100 npm run dev
```

Skenario manual:

- transparent + provider reasoning-compatible + prompt panjang non-websearch
- transparent + prompt websearch
- curated mode sebagai control

Acceptance:

- transparent reasoning berubah beberapa kali selama generate
- headline tidak hilang di tengah proses
- progress tetap jalan
- `Detail →` tetap membuka panel timeline
- curated mode tetap normal

## 4. Guardrails Anti-Regresi

- Jangan ubah schema Convex.
- Jangan menghapus `data-reasoning-thought` di fase ini.
- Jangan memindahkan timeline panel menjadi surface utama transparent.
- Jangan menghapus `SearchStatusIndicator` atau `ToolStateIndicator` pada refactor ini.
- Jangan memperluas perubahan ke page selain `/chat`.
- Setiap perubahan yang memengaruhi mode `curated` harus disertai bukti test eksplisit.

## 5. Urutan Eksekusi Yang Direkomendasikan

1. Tambah type `data-reasoning-live`
2. Refactor emitter normal path
3. Refactor emitter websearch path
4. Update extractor/derivation `ChatWindow`
5. Kunci behavior `ChatProcessStatusBar`
6. Tambah test coverage
7. Verifikasi manual dan terminal

Urutan ini terbaik karena menjaga kontrak data dulu, lalu membuat kedua backend path konsisten, baru setelah itu mengubah derivation UI.

## 6. Definisi Selesai

Task dianggap selesai hanya jika semua ini terpenuhi:

- transparent mode menampilkan reasoning yang dinamis dan stabil selama proses berjalan
- headline transparent tidak drop ke state kosong setelah snapshot awal muncul
- websearch dan non-websearch sama-sama mengikuti perilaku baru
- timeline/right sheet tetap tersedia
- curated mode tidak rusak
- test yang relevan lulus dan bukti verifikasi manual terdokumentasi
