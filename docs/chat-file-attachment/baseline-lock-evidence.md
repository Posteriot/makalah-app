# Baseline Lock Evidence - Attachment Pipeline

Tanggal baseline: 2026-03-01 (local main)

## Ringkasan bukti sukses

Semua jenis attachment yang ditargetkan berhasil diproses di local:

- `PDF` berhasil diproses (`fileContextLength: 29172`, `/api/extract-file 200`, `/api/chat 200`)
- `TXT` berhasil diproses (`fileContextLength: 4369`, `/api/extract-file 200`, `/api/chat 200`)
- `DOCX` berhasil diproses (`fileContextLength: 2105`, `/api/extract-file 200`, `/api/chat 200`)
- `XLSX` berhasil diproses (`fileContextLength: 41468`, `/api/extract-file 200`, `/api/chat 200`)
- `PPTX` berhasil diproses (`fileContextLength: 3622`, `/api/extract-file 200`, `/api/chat 200`)
- `IMAGE` berhasil terkirim pada jalur multimodal (`fileContextLength: 0`, `/api/chat 200`)

## Indikator diagnostik yang dikunci

- `[ATTACH-DIAG][route] request body` menunjukkan:
  - `fileIdsIsArray: true`
  - `fileIdsLength: 1`
- `[ATTACH-DIAG][route] context result` menunjukkan:
  - dokumen non-image memiliki `fileContextLength > 0`
  - image memiliki `fileContextLength: 0` (sesuai jalur multimodal)

## Tujuan dokumen ini

Dokumen ini jadi baseline rollback point sebelum refactor task berikutnya (inline composer, edit-resend contract, dan guard file-only). Jika setelah refactor ada regresi, bandingkan ke indikator pada dokumen ini.
