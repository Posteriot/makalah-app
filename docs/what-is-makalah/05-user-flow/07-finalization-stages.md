# Tahap Finalisasi (Finalization Stages)

Tahap Finalisasi (Stage 12-14) adalah langkah terakhir dalam siklus pembuatan paper. Fokus utamanya adalah pengumpulan referensi, penambahan materi pendukung, dan penetapan judul akhir sebelum naskah dianggap selesai.

## 1. Stage 12: Daftar Pustaka (Bibliography Compilation)
**Tujuan**: Mengompilasi seluruh referensi yang telah disitasi di tahap-tahap sebelumnya menjadi satu daftar pustaka yang konsisten.

- **Karakteristik Unik**: Ini bukan tahap penulisan (*writing*), melainkan tahap kompilasi (*compilation*).
- **Workflow Action**: Menggunakan aksi khusus `compile_then_finalize`.
- **Proses Teknis (Audit Forensik)**:
    - AI wajib memanggil `compileDaftarPustaka({ mode: "persist" })` sebagai langkah pertama dalam rantai *tool*.
    - Sistem melakukan audit otomatis terhadap sitasi yang ada di seluruh artifak sebelumnya untuk memastikan tidak ada referensi yang hilang atau duplikat.
    - AI dilarang keras membuat entri daftar pustaka secara manual tanpa melalui *tool* kompilasi.

## 2. Stage 13: Lampiran (Appendices)
**Tujuan**: Menyediakan tempat bagi materi pendukung yang terlalu panjang untuk dimasukkan ke dalam teks utama.

- **Konten**: Dapat berupa kuesioner, tabel data mentah, rumus matematika yang kompleks, atau bagan tambahan.
- **Sifat**: Artifak ini bersifat opsional namun memberikan nilai tambah pada kualitas akademik paper.

## 3. Stage 14: Pemilihan Judul (Final Title Selection)
**Tujuan**: Menetapkan judul final paper yang paling representatif terhadap seluruh isi naskah yang sudah ditulis.

- **Penetapan Akhir**: Judul terpilih dari tahap ini akan disinkronkan ke dalam meta-data paper (`paperTitle`) dan digunakan sebagai identitas utama saat paper diekspor.
- **Finalisasi Naskah**: Tahap ini menutup seluruh siklus 14-stage. Setelah disetujui, sesi dianggap `completed` dan naskah utuh siap untuk diunduh.

---

## Ringkasan Alur Finalisasi

| Fitur | Stage 12: Daftar Pustaka | Stage 13: Lampiran | Stage 14: Judul |
| :--- | :--- | :--- | :--- |
| **Aksi Utama** | `compile_then_finalize` | `special_finalize` | `special_finalize` |
| **Tool Wajib** | `compileDaftarPustaka` | `createArtifact` | `updateStageData` |
| **Input** | Seluruh Sitasi Stage 1-11 | Materi Pendukung | Seluruh Isi Paper |
| **Fokus** | Akurasi & Konsistensi | Kelengkapan Data | Branding & Identitas |

---

## Rujukan Kode (Audit Forensik)

Berdasarkan pembacaan kode langsung (tanpa mengandalkan komentar), berikut adalah rujukan implementasi faktual:

| Komponen | File Path | Baris/Logika |
| :--- | :--- | :--- |
| **Daftar Pustaka Chain** | [enforcers.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/chat-harness/policy/enforcers.ts) | `isCompileThenFinalize` (L104) maksa `compileDaftarPustaka` |
| **Judul Synchronization** | [paperSessions.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/paperSessions.ts) | Sinkronisasi `paperTitle` di `approveStage` (L1444) |
| **Response Discipline** | [resolve-instruction-stack.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/chat-harness/context/resolve-instruction-stack.ts) | `isReviewFinalization` (L190-193) & `EXACT CHAIN` (L209) |
| **Completed State** | [paperSessions.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/paperSessions.ts) | `completedAt` di-set pas stage 14 disetujui (L1436) |

---

## Referensi Dokumen Sumber
- [User Flows 12: Daftar Pustaka](./user-flows-12-daftar-pustaka.md)
- [User Flows 13: Lampiran](./user-flows-13-lampiran.md)
- [User Flows 14: Pemilihan Judul](./user-flows-14-judul.md)

---
> [!TIP]
> Stage 12 adalah "filter" terakhir untuk memastikan integritas akademik. Pastikan seluruh sumber yang di-cite di teks utama sudah muncul di daftar pustaka melalui proses audit otomatis.
