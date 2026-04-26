# Logika Lintas Stage (Cross-Stage Logic)

Makalah AI mengelola dependensi antar tahap secara dinamis untuk menjaga konsistensi naskah dari tahap Gagasan hingga Judul. Ada empat mekanisme utama yang menjaga "integritas memori" sistem.

## 1. Mekanisme Rewind (Mundur Tahap)

Pengguna dapat kembali ke tahap sebelumnya kapan saja melalui *Progress Timeline* di UI. Namun, aksi ini memiliki konsekuensi teknis yang signifikan untuk menjaga integritas naskah.

### Audit Forensik: `rewindToStage`
Ketika proses *Rewind* dipicu, sistem melakukan serangkaian aksi deterministik:
- **Status Reset**: `currentStage` dipindahkan ke tahap target dan status dikembalikan ke `drafting` (atau `pending_validation` pada mode tertentu).
- **Pembersihan Validasi**: Field `validatedAt` pada tahap target dan semua tahap setelahnya dihapus, memaksa pengguna untuk melakukan persetujuan ulang.
- **Invalidasi Artifak**: Artifak pada tahap-tahap yang terdampak ditandai dengan `invalidatedAt`. Hal ini memberitahu AI bahwa draf tersebut mungkin sudah tidak relevan karena adanya perubahan di tahap sebelumnya.
- **Audit Trail**: Setiap aksi mundur dicatat dalam tabel `rewindHistory` untuk kebutuhan pelacakan dan audit.

## 2. Dirty Context (Deteksi Ketidaksinkronan)

Masalah umum pada aplikasi chat AI adalah ketika pengguna mengedit pesan lama atau melakukan *regenerate* di tengah alur kerja. Hal ini bisa membuat data draf yang sudah tersimpan di database menjadi tidak sinkron dengan konteks obrolan terbaru.

### Solusi: `isDirty` Flag
Sistem menggunakan bendera (*flag*) `isDirty` pada tabel `paperSessions`:
- **Pemicu**: Diaktifkan saat pengguna melakukan edit atau *regenerate* pesan dalam mode penulisan paper.
- **Efek pada AI**: AI akan melihat indikator `DIRTY CONTEXT: true` dalam instruksinya. AI diwajibkan untuk memberitahu pengguna bahwa data perlu disinkronkan ulang atau revisi perlu diminta sebelum draf bisa diperbarui.

## 3. Memory Digest (Jangkar Keputusan)

Untuk mencegah AI "lupa" akan keputusan yang sudah diambil di tahap awal (misalnya, AI tiba-tiba mengubah metode penelitian di tahap Hasil), Makalah AI menggunakan *Memory Digest*.

### Cara Kerja
- **Pencatatan**: Setiap keputusan krusial di sebuah tahap dicatat dalam `paperMemoryDigest`.
- **Penyuntikan Prompt**: Keputusan-keputusan ini diringkas dan disuntikkan ke setiap *system prompt* model AI sebagai instruksi yang **MANDATORI** untuk diikuti. AI dilarang keras memberikan saran yang bertentangan dengan *Memory Digest*.
- **Penanganan Rewind**: Jika tahap tertentu di-*rewind*, entri memori terkait akan ditandai sebagai `superseded: true` sehingga AI tahu keputusan tersebut sudah tidak berlaku.

## 4. Context Compaction (Manajemen Memori Konteks)

Seiring bertambahnya riwayat obrolan, jumlah token yang dikirim ke model AI dapat melampaui batas. Untuk menangani ini, sistem memiliki rantai kompresi konteks otomatis.

### Cara Kerja (Audit Forensik: `context-compaction.ts`)
`runCompactionChain` (L187) dijalankan sebelum setiap request model ketika token melebihi `compactionThreshold`. Strategi dieksekusi secara berurutan dan berhenti segera setelah token turun di bawah ambang:
- **P1 — Strip Chitchat** (`stripChitchat`, L83): Menghapus pesan-pesan percakapan umum yang tidak relevan dengan konten paper secara deterministik.
- **P2 — Compact Oldest Stages** (`excludeStageMessages`, L91): Menghapus pesan dari stage-stage yang sudah selesai dan disetujui, dimulai dari stage paling awal. *Paper mode only.*
- **P3 — LLM Summarize** (async): Meminta model merangkum percakapan tengah-sesi menjadi pesan ringkasan padat. Berjalan untuk paper mode dan chat umum.
- **P4 — Compact Recent Stages** (`excludeStageMessages`): Sama seperti P2 tapi menyasar stage yang lebih baru jika P1-P3 belum cukup.

> **Implikasi UX**: Pengguna tidak melihat compaction secara langsung, tapi AI mungkin merespons lebih singkat setelah compaction karena konteks lama sudah diringkas.

---

## Rujukan Kode (Audit Forensik)

Berdasarkan pembacaan kode langsung (tanpa mengandalkan komentar), berikut adalah rujukan implementasi faktual:

| Komponen | File Path | Baris/Logika |
| :--- | :--- | :--- |
| **Logic Rewind** | [paperSessions.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/paperSessions.ts) | `rewindToStage` (L2008), `markDigestAsSuperseded` (L1913) |
| **isDirty Trigger** | [ChatWindow.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ChatWindow.tsx) | `handleRegenerate` (L2405) memanggil `markStageAsDirty()`, `handleEdit` (L2434) memanggil `markStageAsDirty()` |
| **Syncing Logic** | [paperSessions.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/paperSessions.ts) | `isDirty: false` reset on `approveStage` (L1433) |
| **Prompt Injection** | [paper-mode-prompt.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/paper-mode-prompt.ts) | `dirtyContextNote` (L371), `formatMemoryDigest` (L30-41) |
| **Context Compaction** | [context-compaction.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/context-compaction.ts) | `runCompactionChain` (L187), `stripChitchat` (L83), `excludeStageMessages` (L91) |

---

## Referensi Dokumen Sumber
- [User Flows 00: General Mechanisms](./user-flows-00.md)
- [Arsitektur Boundary: Control Plane vs Domain](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/docs/what-is-makalah/references/agent-harness/control-plane-domain-action.md)

---
> [!NOTE]
> Keempat mekanisme ini bekerja secara harmonis untuk memastikan bahwa naskah yang dihasilkan tetap koheren, meskipun pengguna melakukan banyak perubahan di tengah jalan dan konteks obrolan terus bertambah panjang.
