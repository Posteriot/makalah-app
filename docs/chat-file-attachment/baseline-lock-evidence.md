# Baseline Lock Evidence - Attachment Pipeline

Tanggal baseline: 2026-03-01 (local `attachment-inline-plan`)

## Ringkasan bukti sukses (format file)

Semua jenis attachment utama berhasil diproses di local:

- `PDF` berhasil diproses (`fileContextLength: 32706`, `/api/extract-file 200`, `/api/chat 200`)
- `TXT` berhasil diproses (`fileContextLength > 0`, `/api/extract-file 200`, `/api/chat 200`)
- `DOCX` berhasil diproses (`fileContextLength > 0`, `/api/extract-file 200`, `/api/chat 200`)
- `XLSX` berhasil diproses (`fileContextLength > 0`, `/api/extract-file 200`, `/api/chat 200`)
- `PPTX` berhasil diproses (`fileContextLength > 0`, `/api/extract-file 200`, `/api/chat 200`)
- `IMAGE` berhasil terkirim pada jalur multimodal (`fileContextLength: 0`, `/api/chat 200`)

## Bukti kasus intermittent (yang jadi target redesign)

Dalam sesi yang sama ditemukan pola campuran:

- Request A (message dengan attachment):  
  `fileIdsLength: 1`, `fileContextLength: 32706` (dokumen terbaca penuh)
- Request B (follow-up message):  
  `fileIdsLength: 0`, `fileContextLength: 0`

Interpretasi baseline:

- pipeline extraction + injection **berfungsi** saat `fileIds` terkirim,
- intermittency terjadi karena arsitektur masih dominan message-scoped, bukan conversation-scoped.

## Bukti sesi terbaru (conversation context sudah aktif)

Dari pengujian lokal terbaru:

- Request explicit attach:
  - `fileIdsLength: 1`
  - `reason: 'explicit'`
  - `effectiveFileIdsLength: 1`
  - `fileContextLength: 32702`
- Request follow-up tanpa kirim `fileIds`:
  - `fileIdsIsArray: false`
  - `reason: 'inherit'`
  - `contextFileIdsLength: 1`
  - `effectiveFileIdsLength: 1`
  - `fileContextLength: 32702`

Interpretasi:

- pipeline inheritance server-side berfungsi,
- fokus refactor berikutnya adalah UX contract:
  - bubble chip hanya explicit,
  - context dikelola di tray `Konteks` dengan remove per file / hapus semua,
  - merge multi-file by default.

## Final verification gate (2026-03-01)

Targeted regression suite lulus:

- `chat-effective-fileids-resolution`
- `unified-send-helper`
- `clear-attachment-context`
- `attachment-resend-contract`
- `message-bubble-attachment-chip-format`
- `explicit-vs-inherit-bubble-visibility`
- `multi-file-context-merge-regression`

Build production lulus: `npm run build` (Next.js 16.1.6).

## Indikator diagnostik yang dikunci

- `[ATTACH-DIAG][route] request body` menunjukkan:
  - `fileIdsIsArray: true`
  - request dengan attachment harus memunculkan `fileIdsLength >= 1`
- `[ATTACH-DIAG][route] context result` menunjukkan:
  - dokumen non-image memiliki `fileContextLength > 0`
  - image memiliki `fileContextLength: 0` (sesuai jalur multimodal)

## Tujuan dokumen ini

Dokumen ini jadi baseline rollback point sebelum migrasi conversation-scoped context. Jika setelah migrasi ada regresi, bandingkan ke indikator di atas untuk bedakan:

- bug kirim payload (`fileIds` hilang),
- bug extraction (`fileContext` kosong padahal `fileIds` ada),
- bug UI rendering chip (context ada tapi chip tidak sinkron).
