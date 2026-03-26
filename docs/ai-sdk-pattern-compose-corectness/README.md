# AI SDK Pattern Compose Correctness

Dokumen di folder ini memisahkan dua jenis pekerjaan:

- `P0-P2`: implementation checklist untuk masalah correctness yang sudah terverifikasi di codebase.
- `P3-P5`: exploration / design decision checklist untuk pattern adoption yang sifatnya opsional atau future work.

Daftar dokumen:

- `final-verdict.md` — verdict audit final yang sudah dikoreksi.
- `implementation-checklist.md` — checklist implementasi untuk `A1-A3`.
- `exploration-checklist.md` — checklist eksplorasi untuk `B2-B4`.

Aturan pakai:

- Kerjakan `implementation-checklist.md` dulu sebelum masuk ke exploration.
- Jangan campur bugfix contract parity dengan redesign arsitektur.
- Setiap item implementasi harus punya bukti verifikasi sebelum ditandai selesai.
