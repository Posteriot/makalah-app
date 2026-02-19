# Paper Writing Workflow — 13 Stages

Dokumentasi high-level untuk guided workflow penulisan paper akademik di Makalah AI. Workflow ini memandu user melalui 13 tahap secara berurutan, dengan kolaborasi AI di setiap tahap.

**Prinsip utama:**

1. **Linear & sequential** — Tahap harus diselesaikan berurutan; tidak bisa skip atau lompat
2. **Dialog-first** — AI berdiskusi dulu dengan user sebelum drafting, bukan langsung generate
3. **Validation-gated** — Setiap tahap butuh persetujuan eksplisit dari user sebelum lanjut
4. **Referensi berbasis web search (policy prompt)** — Prompt mode paper menginstruksikan AI untuk mencari referensi faktual via web search dan menghindari referensi karangan

---

## 1. Overview

Makalah AI menggunakan guided 13-stage workflow untuk menulis paper akademik. Setiap conversation bisa memiliki satu **Paper Session** yang melacak progres melalui 13 tahap.

Workflow ini bersifat:

- **Kolaboratif** — AI bertindak sebagai partner diskusi, bukan generator otomatis
- **Iteratif** — Setiap tahap bisa direvisi berkali-kali sebelum disetujui
- **Terstruktur** — Output setiap tahap tersimpan di database dan menjadi konteks untuk tahap berikutnya
- **Reversibel (terbatas)** — User bisa mundur maksimal 2 tahap via fitur Rewind

---

## 2. Lima Fase & 13 Tahap

Workflow dikelompokkan menjadi 5 fase besar:

### Fase 1 — Foundation (Tahap 1-2)

Membangun fondasi ide dan arah paper.

| # | Tahap | Tujuan | Output Utama |
|---|-------|--------|--------------|
| 1 | **Gagasan Paper** | Brainstorming ide kasar, eksplorasi angle, cek novelty | Ide kasar, analisis feasibility, angle unik, referensi awal |
| 2 | **Penentuan Topik** | Kristalisasi topik definitif dari gagasan terpilih | Judul tentatif, research gap, referensi pendukung |

### Fase 2 — Outline (Tahap 3)

Merancang kerangka struktur paper.

| # | Tahap | Tujuan | Output Utama |
|---|-------|--------|--------------|
| 3 | **Menyusun Outline** | Membangun struktur hierarchical paper | Daftar bab dan sub-bab, estimasi kata per bagian |

### Fase 3 — Core Content (Tahap 4-7)

Menulis bagian inti paper.

| # | Tahap | Tujuan | Output Utama |
|---|-------|--------|--------------|
| 4 | **Penyusunan Abstrak** | Ringkasan eksekutif paper (150-250 kata) | Abstrak lengkap dengan kata kunci |
| 5 | **Pendahuluan** | Latar belakang, rumusan masalah, tujuan penelitian | Latar belakang, gap penelitian, tujuan, sitasi APA |
| 6 | **Tinjauan Literatur** | State of the art dan kerangka teoretis | Tinjauan literatur, gap analysis, referensi lengkap |
| 7 | **Metodologi** | Desain penelitian dan metode pengumpulan data | Desain riset, metode, analisis data, etika |

### Fase 4 — Results (Tahap 8-10)

Menyajikan dan mendiskusikan temuan.

| # | Tahap | Tujuan | Output Utama |
|---|-------|--------|--------------|
| 8 | **Hasil Penelitian** | Temuan utama dan penyajian data | Data points, temuan kunci, penyajian terstruktur |
| 9 | **Diskusi** | Interpretasi hasil dan perbandingan literatur | Interpretasi, implikasi, keterbatasan, sitasi tambahan |
| 10 | **Kesimpulan** | Ringkasan jawaban atas rumusan masalah | Kesimpulan, jawaban masalah, saran/rekomendasi |

### Fase 5 — Finalization (Tahap 11-13)

Finalisasi dan penyelesaian paper.

| # | Tahap | Tujuan | Output Utama |
|---|-------|--------|--------------|
| 11 | **Daftar Pustaka** | Kompilasi semua referensi yang digunakan | Daftar referensi format APA 7th |
| 12 | **Lampiran** | Material pendukung (tabel, instrumen, data mentah) | Dokumen lampiran terstruktur |
| 13 | **Pemilihan Judul** | Seleksi judul final dari beberapa opsi | 5 opsi judul, coverage analysis, judul terpilih |

---

## 3. Lifecycle Setiap Tahap

Setiap tahap melalui siklus yang sama:

```
DRAFTING → PENDING VALIDATION → APPROVED → (lanjut ke tahap berikutnya)
                ↑        │
                │        ↓
                └── REVISION (jika user minta revisi)
```

### Status Tahap

| Status | Deskripsi |
|--------|-----------|
| **Drafting** | AI dan user sedang berdiskusi dan mengerjakan tahap ini |
| **Pending Validation** | Draf selesai, menunggu user untuk approve atau minta revisi |
| **Approved** | User menyetujui. Tahap selesai, lanjut ke tahap berikutnya |
| **Revision** | User minta revisi. AI kembali ke mode drafting dengan feedback user |

### Alur Detail

1. **Tahap dimulai** — Status `drafting`. AI menerima instruksi spesifik untuk tahap ini.
2. **Dialog & iterasi** — AI berdiskusi dengan user, melakukan web search jika perlu, menyimpan progress secara berkala.
3. **Submit untuk validasi** — Setelah user konfirmasi draft sudah matang, AI submit tahap. **Guard**: `ringkasan` wajib terisi (non-empty), jika belum maka submit gagal dengan error. Status berubah ke `pending_validation`.
4. **User memutuskan:**
   - **Approve** — Guard: `ringkasan` wajib terisi + budget outline dicek (konten tidak boleh melebihi 150% estimasi kata dari outline). Tahap ditandai `approved`, progres dicatat, lanjut ke tahap berikutnya.
   - **Revise** — Status kembali ke `revision`. User memberikan feedback, AI melanjutkan editing.
5. **Tahap terakhir (Judul) di-approve** — Paper Session ditandai `completed`.

### Ringkasan Dual-Layer

Setiap tahap memiliki dua level ringkasan:

| Field | Batas | Tujuan |
|-------|-------|--------|
| **`ringkasan`** (wajib) | Batas operasional 280 karakter di tool layer | Keputusan kunci. Tanpa ini, submit/approval gagal. |
| **`ringkasanDetail`** (opsional) | 1.000 karakter | Detail pendukung — reasoning, konteks tambahan, alasan pemilihan opsi. Diinjeksi hanya untuk 3 tahap terakhir yang selesai (sliding window). |

Dual-layer ini memastikan AI selalu punya `ringkasan` pendek dari semua tahap selesai sebagai sinyal keputusan, ditambah `ringkasanDetail` dari tahap-tahap terdekat untuk konteks yang lebih kaya tanpa membebani context window.

---

## 4. Model Kolaborasi AI

### Dialog-First, Bukan Monolog

AI di Makalah AI **tidak langsung generate** output lengkap. Alurnya:

1. AI bertanya untuk memahami konteks dan preferensi user
2. AI menawarkan 2-3 opsi dengan **rekomendasi terbaik** beserta alasannya
3. User memilih atau memberikan arahan
4. AI melakukan web search jika butuh referensi/data faktual
5. AI dan user berdiskusi dan iterasi draft
6. Setelah ada kesepakatan, AI menyimpan progress dan submit untuk validasi

### Kolaborasi Proaktif

- AI selalu memberikan **rekomendasi**, bukan sekadar daftar pilihan
- AI menjelaskan kelebihan dan kekurangan setiap opsi
- AI meminta feedback secara aktif, bukan menunggu user mengoreksi

### Konteks Antar Tahap

AI menerima konteks berlapis dari tahap-tahap sebelumnya melalui beberapa mekanisme:

**1. Ringkasan tahap selesai** — `ringkasan` dari semua tahap yang sudah di-approve diinjeksi ke prompt. Memastikan keputusan awal (misalnya angle di Gagasan) konsisten sampai akhir.

**2. Artifact summaries** — Konten artifact dari tahap yang sudah validated diinjeksi sebagai ringkasan (maks 500 karakter per artifact). AI bisa merujuk output sebelumnya tanpa perlu mengakses artifact penuh.

**3. ringkasanDetail (sliding window)** — Detail pendukung hanya diinjeksi untuk 3 tahap terakhir yang selesai. Tahap lebih lama cukup direpresentasikan oleh `ringkasan` singkat. Ini menjaga keseimbangan antara kekayaan konteks dan efisiensi context window.

**4. Superseded stage filter** — Tahap yang sudah di-invalidate oleh rewind (ditandai `superseded`) otomatis dikeluarkan dari injeksi konteks, mencegah AI merujuk keputusan yang sudah digantikan.

### Context Budget Monitor

Sistem memantau estimasi penggunaan context window secara real-time:

| Threshold | Aksi |
|-----------|------|
| **< 60%** | Normal, tidak ada intervensi |
| **60-80%** | Warning di log (non-blocking) |
| **> 80%** | Soft pruning — pesan percakapan lama dipotong, hanya 50 pesan terakhir dipertahankan |

System messages (system prompt, paper mode prompt, file context) **tidak pernah dipruning**. Hanya pesan percakapan user/assistant yang dipotong. Context window dibaca dari konfigurasi database (`aiProviderConfigs.primaryContextWindow`), fallback ke 128K tokens.

---

## 5. Web Search & Referensi

### Kebijakan Web Search Per Tahap

Tidak semua tahap membutuhkan web search secara aktif:

**Tahap dengan search aktif** (AI proaktif mencari referensi):
- Gagasan, Topik, Pendahuluan, Tinjauan Literatur, Metodologi, Diskusi

**Tahap dengan search pasif** (hanya jika user meminta):
- Outline, Abstrak, Hasil, Kesimpulan, Daftar Pustaka, Lampiran, Judul

### Target Referensi Per Tahap (Helper Keputusan Search)

Jumlah di bawah ini dipakai sebagai acuan helper `isStageResearchIncomplete` untuk keputusan mode search pada stage aktif. Ini **bukan hard validation** di mutation approval.

| Tahap | Field Referensi | Jumlah Minimum |
|-------|----------------|----------------|
| Gagasan | Referensi awal | 2 |
| Topik | Referensi pendukung | 3 |
| Tinjauan Literatur | Referensi | 5 |
| Pendahuluan | Sitasi APA | 2 |
| Diskusi | Sitasi tambahan | 2 |

### Auto-Persist Web Search References

Saat AI melakukan web search (baik via Google Search maupun fallback OpenRouter `:online`), hasil referensi **otomatis dipersist** ke field `webSearchReferences` di stage data aktif. Ini mengatasi masalah hilangnya structured search results antar turn (karena tool separation constraint antara `google_search` dan function tools).

**Mekanisme:**
- Setelah web search selesai, sources di-extract dan disimpan via `appendSearchReferences` mutation
- URL di-deduplikasi menggunakan `normalizeUrlForDedup()` (strip UTM, hash, trailing slash)
- Untuk tahap Gagasan dan Topik, referensi juga di-dual-write ke field native (`referensiAwal` / `referensiPendukung`)
- Referensi yang tersimpan diformat secara prominent di prompt injection via `formatWebSearchReferences()` (`formatStageData.ts`) — ditampilkan sebagai blok "REFERENSI WEB SEARCH TERSIMPAN (WAJIB gunakan, JANGAN fabricate)" agar AI wajib merujuk referensi yang sudah ada dan tidak mengarang baru

**Partial message save:** Saat stream web search **primary path** menerima event `abort`, pesan parsial disimpan ke database. Pada fallback `:online`, event `abort` saat ini belum menyimpan pesan parsial.

### Anti-Halusinasi Referensi

Berlapis proteksi untuk mencegah AI mengarang referensi:

| Layer | Mekanisme | Lokasi |
|-------|-----------|--------|
| **URL validation** | Referensi tanpa URL diberi warning pada response `updateStageData` (bukan hard reject mutation). | `convex/paperSessions.ts` |
| **Anti-placeholder** | Warning eksplisit di setiap tahap sitasi: dilarang menggunakan placeholder seperti "(Wijaya, 2023)" tanpa URL | Stage instructions |
| **Anti-domain-as-author** | Rule di ATURAN UMUM per-turn: dilarang menggunakan domain sebagai author (e.g., "Kuanta.id, t.t.") | `paper-mode-prompt.ts` |
| **APA format enforcement** | Format sitasi APA web source yang benar diinjeksi di semua tahap sitasi | Stage instructions |
| **URL quality filtering** | Proxy URLs (Vertex AI Search) dan low-value URLs (/tag/, /berita/, root domain) difilter | `route.ts` |
| **Prominent reference injection** | Referensi tersimpan diinjeksi sebagai blok wajib-rujuk di prompt: "WAJIB gunakan, JANGAN fabricate" | `formatStageData.ts` |

### Aturan Operasional (Berbasis Prompt + Helper)

- Prompt mode paper menegaskan referensi faktual harus berbasis web search dan melarang fabrikasi referensi.
- Auto-persist web search menyimpan format terstruktur minimal `url`, `title`, opsional `publishedAt` di `webSearchReferences`.
- Field sitasi tahap (mis. `referensi`, `sitasiAPA`, `sitasiTambahan`) dapat menyimpan metadata tambahan seperti penulis/tahun sesuai hasil olahan AI.
- Instruksi sitasi menggunakan format APA 7th berada di stage instructions/prompt (guidance level).
- Domain tidak boleh digunakan sebagai nama author (e.g., ~~"Kuanta.id, t.t."~~ → harus nama penulis asli atau "tanpa penulis")

---

## 6. Validasi & Approval

### Panel Validasi

Ketika AI submit tahap untuk validasi, UI menampilkan panel validasi dengan:
- Label tahap aktif (`Validasi Tahap: ...`)
- Instruksi untuk mengecek draft di artifact
- Dua tombol aksi: **Approve & Lanjut** dan **Revisi**

### Approve

- **Guard**: `ringkasan` wajib terisi; budget outline dicek (reject jika konten > 150% estimasi kata)
- Tahap ditandai selesai dengan timestamp validasi
- Ringkasan dicatat ke **Paper Memory Digest** (catatan keputusan kumulatif)
- `estimatedContentChars` dan `estimatedTokenUsage` di-update untuk tracking progress
- Session berpindah ke tahap berikutnya dengan status `drafting`
- Khusus tahap Judul: judul terpilih disinkronkan sebagai judul resmi paper

### Revise

- Status tahap kembali ke `revision`
- Counter revisi bertambah (untuk tracking)
- User mengirim feedback sebagai pesan chat biasa
- AI menerima feedback dan melanjutkan editing
- Setelah selesai revisi, AI bisa submit ulang untuk validasi

---

## 7. Fitur Rewind (Mundur Tahap)

### Konsep

User bisa mundur ke tahap sebelumnya untuk merevisi keputusan yang sudah disetujui. Ini berguna saat user berubah pikiran di tengah proses.

### Batasan

- **Maksimal 2 tahap ke belakang** dari tahap saat ini
- Hanya bisa rewind ke tahap yang sudah disetujui (ada timestamp validasi)
- Tidak bisa rewind ke tahap yang sama atau tahap di depan

### Cara Menggunakan

1. Klik badge tahap sebelumnya di progress bar (hanya yang eligible ditandai clickable)
2. Dialog konfirmasi muncul, menjelaskan apa yang akan terjadi
3. Konfirmasi untuk menjalankan rewind

### Apa yang Terjadi Saat Rewind

| Aksi | Detail |
|------|--------|
| **Session state** | `currentStage` kembali ke tahap target, status → `drafting` |
| **Tahap diantara** | Validasi tahap-tahap antara target dan posisi saat ini dibatalkan |
| **Artifact** | Artifact dari tahap yang di-invalidate ditandai "perlu update" (tidak dihapus) |
| **Memory digest** | Keputusan lama ditandai `superseded` (digantikan) |
| **AI notification** | Pesan sistem dikirim ke AI agar sadar konteks sudah berubah |
| **Audit trail** | Riwayat rewind dicatat untuk keperluan tracking |

### Contoh Skenario

User sedang di tahap **Abstrak** (tahap 4) dan menyadari outline-nya perlu diubah:
- Klik badge **Outline** (tahap 3) → mundur 1 tahap
- Atau klik badge **Topik** (tahap 2) → mundur 2 tahap
- Tidak bisa klik **Gagasan** (tahap 1) → melebihi batas 2 tahap

Setelah rewind, user dan AI merevisi tahap target, lalu melanjutkan maju lagi secara normal.

---

## 8. Artifact

### Apa Itu Artifact

Artifact adalah dokumen atau konten terstruktur yang dihasilkan dari sebuah tahap. Contoh: outline hierarchical, draft abstrak, daftar pustaka lengkap.

### Tipe Artifact

| Tipe | Kegunaan |
|------|----------|
| **Section** | Bagian teks paper (abstrak, pendahuluan, dll.) |
| **Outline** | Struktur outline paper |
| **Table** | Tabel data atau perbandingan |
| **Citation** | Daftar sitasi/referensi |
| **Formula** | Rumus atau formula |
| **Code** | Script analisis data |

### Lifecycle

1. AI membuat artifact saat diskusi menghasilkan konten yang cukup matang
2. Artifact di-link ke tahap terkait
3. Artifact bisa di-update (sistem menyimpan history versi)
4. Saat rewind terjadi, artifact dari tahap yang di-invalidate mendapat banner peringatan "Perlu Update"
5. AI bisa update artifact untuk menghilangkan status invalidasi

### Versioning

Setiap update artifact menciptakan versi baru yang terhubung ke versi sebelumnya. User bisa melihat evolusi konten dari waktu ke waktu.

---

## 9. Paper Memory Digest

### Fungsi

Catatan keputusan kumulatif yang disetujui user di setiap tahap. Berfungsi sebagai "memori jangka panjang" agar AI tetap konsisten dari tahap ke tahap.

### Cara Kerja

- Setiap kali tahap di-approve, ringkasan keputusan dicatat ke `paperMemoryDigest` (dipotong hingga 200 karakter).
- Saat rewind, entri digest dari tahap yang terdampak ditandai `superseded`.
- Entri baru ditambahkan lagi setelah tahap di-approve ulang.

### Catatan Implementasi Saat Ini

Konteks prompt AI saat ini dibangun terutama dari `stageData` (ringkasan tahap tervalidasi + detail sliding window + artifact summaries), bukan dari `paperMemoryDigest` secara langsung. `paperMemoryDigest` saat ini berfungsi sebagai jejak keputusan terstruktur untuk tracking/audit dan AI Ops.

---

## 10. Credit & Billing

Paper writing mengkonsumsi kredit dengan multiplier khusus:

| Operasi | Multiplier |
|---------|-----------|
| Chat biasa | 1.0x |
| Paper generation | 1.5x |
| Web search | 2.0x |
| Refrasa | 0.8x |

Setiap Paper Session mendukung tracking kredit dengan baseline `creditAllotted` (jika tidak diisi, perhitungan menggunakan fallback 300 pada saat deduksi). Status bisa menjadi soft-block saat `creditRemaining <= 0`. Detail billing ada di `docs/billing-tier-enforcement/`.

### Session Credit Tracking

Setiap paper session menyimpan field tracking kredit:

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `creditAllotted` | number | Kredit yang dialokasikan (default: 300) |
| `creditUsed` | number | Kredit yang sudah terpakai di session ini |
| `creditRemaining` | number | Sisa kredit session (computed) |
| `isSoftBlocked` | boolean | True jika kredit habis |
| `softBlockedAt` | number | Timestamp saat soft-blocked |

### Content Size Tracking

Approval setiap tahap juga melacak estimasi ukuran konten:

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `estimatedContentChars` | number | Total karakter dari konten yang sudah divalidasi |
| `estimatedTokenUsage` | number | Estimasi token (chars / 4) |
| `isDirty` | boolean | True saat chat di-edit/regenerate setelah stageData update |

---

## 11. Intent Detection

### Auto-Detect Mode Paper

Sistem otomatis mendeteksi niat user menulis paper dari pesan chat, tanpa perlu aktivasi manual. Deteksi berdasarkan:

**Kata kunci yang memicu:**
- Tipe dokumen: "paper", "makalah", "skripsi", "tesis", "disertasi", "jurnal"
- Kata kerja: "menulis paper", "bikin makalah", "susun skripsi"
- Workflow: "bantu menulis paper", "asistensi paper"

**Kata kunci yang dikecualikan** (user hanya bertanya, bukan mau menulis):
- "jelaskan", "apa itu", "definisi", "cara menulis", "tips menulis", "format"

Saat intent terdeteksi dan belum ada session, AI menerima reminder untuk menawarkan mode paper.

---

## 12. Edit Permission

### Aturan Edit Pesan di Mode Paper

Pesan chat dalam Paper Session memiliki batasan edit:

| Aturan | Detail |
|--------|--------|
| Hanya pesan user | Pesan AI tidak bisa diedit |
| Tahap approved terkunci | Pesan di tahap yang sudah disetujui tidak bisa diedit (gunakan Rewind) |
| Maksimal 2 turn ke belakang | Hanya 2 pesan user terakhir dalam tahap aktif yang bisa diedit |
| Dalam batas tahap | Pesan harus berada dalam tahap yang sedang aktif |

Jika edit diblokir, tombol edit muncul dalam keadaan disabled dengan tooltip penjelasan.

---

## 13. Data Integrity & Resilience

### Stage Data Key Whitelist

Setiap tahap memiliki whitelist field yang diperbolehkan. Jika AI mengirim key yang tidak dikenal (misalnya AI hallucinate key bahasa Inggris seperti `summary` alih-alih `ringkasan`):

1. Key yang tidak dikenal **di-strip secara soft** (bukan error/throw)
2. Mutation tetap berjalan dengan key yang valid saja
3. Setiap dropped key dicatat ke `systemAlerts` table (`alertType: "stage_key_dropped"`)
4. Admin bisa melihat aggregasi dropped keys di **AI Ops Dashboard** dan men-"promote" key yang sering muncul ke schema

### Field Size Truncation

String fields di stage data dibatasi untuk mencegah bloating:

| Field | Batas |
|-------|-------|
| Field umum (analisis, latarBelakang, dll.) | 2.000 karakter |
| `ringkasanDetail` | 1.000 karakter |
| `ringkasan`, `artifactId`, `validatedAt`, `revisionCount` | Tidak di-truncate |

Jika truncation terjadi, warning dikembalikan ke AI dalam response mutation agar AI tahu datanya dipotong.

---

## 14. AI Ops Dashboard

Dashboard observability untuk memantau health dan behavior paper workflow. Lokasi: `/ai-ops` (admin only).

### Fitur

| Panel | Fungsi |
|-------|--------|
| **Session List** | Daftar paper sessions dengan status, numbered + clickable |
| **Session Detail** | Dialog detail per session: expandable stage rows, isi `ringkasan` dan `ringkasanDetail` per tahap |
| **Colored Badges** | Indikator visual: hijau jika ringkasan terisi, amber jika ringkasanDetail terisi |
| **Dropped Keys Panel** | Aggregasi key yang di-drop dari stage data, frekuensi, dan tombol "Promote" |
| **Insight Banner** | Statistik ringkasan: total sessions, completion rate, common issues |

### Promote Workflow

Saat key sering di-drop (misalnya AI konsisten mengirim field baru yang belum ada di schema):
1. Admin melihat frekuensi di Dropped Keys Panel
2. Klik "Promote" → clipboard terisi prompt untuk menambah key ke schema + whitelist
3. Developer menjalankan perubahan schema

---

## 15. Export

Paper yang sudah **completed** bisa diekspor dalam format:

- **Word (.docx)** — via endpoint export
- **PDF** — via endpoint export

Export mengompilasi `stageData` ke dokumen tunggal (melalui content compiler), lalu menghasilkan file Word/PDF.

---

## Referensi File Utama (untuk Developer)

### Core Workflow

| File | Fungsi |
|------|--------|
| `convex/paperSessions/constants.ts` | Definisi stage, label, urutan, navigation helpers |
| `convex/paperSessions/types.ts` | Type definitions untuk data setiap tahap (termasuk `ringkasanDetail`, `webSearchReferences`) |
| `convex/paperSessions.ts` | CRUD mutations, approval, revision, rewind, key whitelist, field truncation, URL validation |
| `convex/schema.ts` | Schema database (paperSessions, rewindHistory, artifacts, systemAlerts) |
| `convex/artifacts.ts` | CRUD artifact + invalidation management |
| `convex/aiOps.ts` | Queries untuk AI Ops Dashboard (dropped keys aggregation, session stats) |

### AI & Prompt

| File | Fungsi |
|------|--------|
| `src/lib/ai/paper-tools.ts` | Definisi AI tools (startSession, updateData, submit, getState) |
| `src/lib/ai/paper-mode-prompt.ts` | Injeksi system prompt untuk mode paper + artifact summaries + anti-hallucination rules |
| `src/lib/ai/paper-intent-detector.ts` | Auto-deteksi niat menulis paper |
| `src/lib/ai/paper-workflow-reminder.ts` | Reminder prompt saat intent terdeteksi tanpa session |
| `src/lib/ai/paper-search-helpers.ts` | Deterministic helpers untuk keputusan web search |
| `src/lib/ai/paper-stages/` | Instruksi spesifik per tahap (foundation, core, results, finalization) |
| `src/lib/ai/paper-stages/formatStageData.ts` | Format stage data + artifact summaries untuk prompt injection |
| `src/lib/ai/context-budget.ts` | Context budget monitor: estimasi token, threshold check, soft pruning |

### UI Components

| File | Fungsi |
|------|--------|
| `src/components/paper/PaperStageProgress.tsx` | Progress bar dengan badge clickable |
| `src/components/paper/RewindConfirmationDialog.tsx` | Dialog konfirmasi rewind |
| `src/components/chat/ArtifactViewer.tsx` | Viewer artifact + banner invalidasi |
| `src/lib/hooks/usePaperSession.ts` | React hook (approve, revise, rewind) |
| `src/lib/utils/paperPermissions.ts` | Aturan edit permission per pesan |
| `src/components/ai-ops/AiOpsContainer.tsx` | Container AI Ops Dashboard |
| `src/components/ai-ops/panels/DroppedKeysPanel.tsx` | Panel dropped keys dengan promote workflow |

### API Integration

| File | Fungsi |
|------|--------|
| `src/app/api/chat/route.ts` | Chat streaming endpoint dengan integrasi paper mode + auto-persist web search references |
| `src/app/api/export/word/route.ts` | Export ke Word |
| `src/app/api/export/pdf/route.ts` | Export ke PDF |

### Test Coverage

| File | Fungsi |
|------|--------|
| `__tests__/artifact-summary-injection.test.ts` | Test artifact context injection (W1) |
| `__tests__/context-budget.test.ts` | Test context budget monitor (W2) |
| `__tests__/referensi-url-validation.test.ts` | Test URL validation anti-halusinasi (W3) |
| `__tests__/stage-data-key-whitelist.test.ts` | Test stage data key whitelist / dropped keys (W4) |
| `__tests__/ringkasan-detail-injection.test.ts` | Test dual-layer ringkasan selective injection (W5) |
| `__tests__/format-stage-data-superseded.test.ts` | Test superseded stage filter (W6) |
| `__tests__/stage-data-truncation.test.ts` | Test field size truncation (W7) |
