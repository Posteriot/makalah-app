# Agent Context Anchor — Rencana Implementasi Kompresi Prompt Paper Workflow

Tanggal: 24 Februari 2026  
Status: Draft siap eksekusi  
Tujuan dokumen: jangkar konteks untuk agent saat sesi ter-compact agar implementasi tetap konsisten tanpa kehilangan arah.

---

## Dokumen Pasangan (Wajib Dibaca Bersama)

Untuk guardrail batas aman kompresi, baca juga:
- [Red Line Kompresi Prompt Paper Workflow](./2026-02-24-red-line-kompresi-prompt-paper-workflow.md)

Kedua dokumen ini dipakai bersamaan:
1. Dokumen ini = runbook eksekusi implementasi.
2. Dokumen red-line = batas minimum aman agar konteks tidak terlalu terkompresi.

---

## 1) Fungsi Dokumen Ini

Dokumen ini **bukan** dokumen presentasi produk.  
Dokumen ini adalah **panduan kerja internal agent** saat implementasi kompresi prompt paper workflow.

Jika konteks chat terpotong/compact:
1. Baca dokumen ini penuh.
2. Ikuti urutan eksekusi di bagian `Runbook`.
3. Jangan ubah keputusan inti tanpa bukti baru.

---

## 2) Keputusan Inti (Jangan Berubah Tanpa Revalidasi)

Keputusan default implementasi:
1. `cap refs = 5`
2. `cap sitasi = 5` (utama berdampak di stage `pendahuluan`)
3. `ringkas completed summaries = ON` dengan:
   - keep completed detail: `3 stage terakhir`
   - `ringkasan` completed stage dipadatkan
   - `ringkasanDetail` completed stage lama tidak diinject

Alasan:
1. Tradeoff terbaik antara hemat token dan kualitas konteks.
2. Simulasi internal menunjukkan penghematan besar pada skenario berat.

Catatan hasil simulasi terakhir:
1. Skenario `pendahuluan` berat: kombinasi `A+B+C cap=5` hemat sekitar `23.1%` token prompt.
2. Skenario `diskusi` medium: kombinasi `A+B+C cap=5` hemat sekitar `5.0%`.

### Baseline Final (Dikunci)

Angka berikut ditetapkan sebagai baseline final implementasi:
1. `cap refs = 5`
2. `cap sitasi = 5`
3. `window ringkasanDetail completed = 3 stage terakhir`

Aturan perubahan baseline:
1. Tidak boleh diubah langsung di code.
2. Wajib simulasi ulang minimum pada `pendahuluan` heavy dan `diskusi` medium.
3. Wajib bukti before/after (estimasi token + indikator kualitas jawaban).
4. Wajib update 2 dokumen pasangan (anchor + red-line) dalam commit yang sama.

---

## 3) Scope Implementasi

### In Scope
1. Optimasi assembly context di layer prompt paper mode.
2. Kompresi isi `formatStageData` pada bagian referensi/sitasi/summary completed.
3. Penambahan test unit untuk menjaga regresi.
4. Logging ukuran prompt sebelum/sesudah (opsional tapi disarankan).

### Out of Scope
1. Migrasi ke arsitektur Agent Skills eksternal.
2. Perubahan alur bisnis 13 stage.
3. Perubahan guard backend approval/stage lock.

---

## 4) File Target Utama

1. `src/lib/ai/paper-stages/formatStageData.ts`
2. `src/lib/ai/paper-mode-prompt.ts`
3. `__tests__/` (test baru untuk kompresi prompt)

File referensi behavior:
1. `src/app/api/chat/route.ts`
2. `src/lib/ai/paper-tools.ts`
3. `convex/paperSessions.ts`

---

## 5) Runbook Eksekusi (Urutan Wajib)

### Phase 0 — Bootstrap Saat Context Hilang
1. Baca dokumen ini.
2. Buka file target utama.
3. Validasi keputusan inti masih relevan.
4. Lanjut ke Phase 1.

### Phase 1 — Implementasi Kompresi di `formatStageData`
1. Tambahkan konstanta kompresi yang jelas (cap refs/sitasi, window summary).
2. Terapkan cap untuk:
   - `webSearchReferences` pada stage aktif
   - field sitasi yang relevan (terutama `sitasiAPA`)
3. Ringkas completed summaries:
   - prioritaskan ringkasan pendek
   - detail hanya untuk window terakhir
4. Pastikan format output tetap terbaca model (tidak merusak struktur instruksi).

### Phase 2 — Penyesuaian di `paper-mode-prompt`
1. Pastikan hanya context yang sudah dikompresi yang diinject.
2. Jika perlu, tambahkan guard kecil untuk mencegah block besar berulang.
3. Jaga kompatibilitas dengan status `drafting`, `revision`, `pending_validation`.

### Phase 3 — Testing
1. Tambah test unit untuk memastikan:
   - cap refs jalan
   - cap sitasi jalan
   - completed summary ringkas sesuai rule
2. Tambah test snapshot/length assertion untuk mencegah prompt bloat kembali.
3. Jalankan test relevan.

### Phase 4 — Verifikasi Fungsional
1. Simulasi stage `pendahuluan` heavy.
2. Simulasi stage `diskusi` medium.
3. Pastikan behavior tool-call tidak berubah.
4. Bandingkan estimasi token sebelum/sesudah.

---

## 6) Acceptance Criteria

Implementasi dianggap selesai jika:
1. Prompt lebih ringkas secara terukur pada skenario heavy.
2. Struktur instruksi stage tidak rusak.
3. Guard utama workflow tetap aman:
   - tidak loncat stage
   - tidak rusak saat submit/approve
4. Test baru lulus.

Target minimal:
1. `pendahuluan` heavy: hemat total prompt >= `15%`
2. `diskusi` medium: hemat total prompt >= `3%`

---

## 7) Risiko & Mitigasi

1. Risiko: konteks terlalu agresif dipotong -> kualitas jawaban turun.  
   Mitigasi: pakai default cap `5`, bukan `3`.

2. Risiko: format data jadi ambigu untuk model non-reasoning.  
   Mitigasi: pertahankan label section eksplisit, jangan ubah struktur heading.

3. Risiko: regresi behavior di stage tertentu.  
   Mitigasi: test per-stage minimal `pendahuluan` dan `diskusi`.

---

## 8) Recovery Checklist (Jika Sesi Ter-Compact di Tengah Implementasi)

Jika kehilangan konteks, lakukan ini persis:
1. Baca dokumen ini.
2. Cek perubahan terakhir di `formatStageData.ts`.
3. Cek apakah cap default masih `5`.
4. Cek test sudah ada atau belum.
5. Lanjut dari phase terakhir yang belum selesai.

Jangan langsung lanjut coding sebelum checklist ini selesai.

---

## 9) Log Keputusan Singkat

1. Fokus optimasi: context injection yang sudah ada, bukan ganti arsitektur.
2. Prioritas kompresi: `completed summaries` + `refs` + `sitasi`.
3. Konfigurasi awal paling aman: cap `5`.

---

## 10) Evidence Simulasi Implementasi (Before vs After)

Tanggal eksekusi simulasi: 25 Februari 2026  
Commit implementasi: `446ff3b`  
Metode:
1. Bandingkan output `formatStageData` pada state `before=HEAD^` vs `after=446ff3b`.
2. Estimasi token: `ceil(chars/4)`.
3. Gunakan 2 skenario wajib: `pendahuluan-heavy` dan `diskusi-medium`.

Hasil inti:
1. `pendahuluan-heavy`
   - before: `4767 chars` (`1192 tokens`)
   - after: `3914 chars` (`979 tokens`)
   - hemat: `17.87%` token
2. `diskusi-medium`
   - before: `1893 chars` (`474 tokens`)
   - after: `1720 chars` (`430 tokens`)
   - hemat: `9.28%` token

Hasil efektif total (termasuk 1 baris catatan kompresi tambahan di `paper-mode-prompt`):
1. `pendahuluan-heavy`: hemat `15.60%` token
2. `diskusi-medium`: hemat `3.59%` token

Status acceptance:
1. Target `pendahuluan >= 15%`: **LULUS**
2. Target `diskusi >= 3%`: **LULUS**
