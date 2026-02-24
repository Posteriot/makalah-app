# Red Line Kompresi Prompt Paper Workflow

Tanggal: 24 Februari 2026  
Status: Guardrail implementasi  
Tujuan dokumen: menetapkan ambang batas minimum kompresi agar efisiensi token naik tanpa mendorong model kehilangan konteks dan halusinasi.

---

## Dokumen Pasangan (Wajib Dibaca Bersama)

Dokumen ini adalah pasangan dari:
- [Agent Context Anchor — Rencana Implementasi Kompresi Prompt](./2026-02-24-agent-context-anchor-rencana-implementasi-kompresi-prompt.md)

Pembagian fungsi:
1. Dokumen anchor = urutan eksekusi implementasi.
2. Dokumen red-line ini = batas aman yang tidak boleh dilanggar.

---

## 1) Cara Pakai Saat Implementasi

1. Baca dokumen anchor untuk urutan phase.
2. Di setiap phase yang mengubah kompresi context, validasi terhadap red-line di dokumen ini.
3. Jika ada 1 red-line gagal, jangan merge; kembalikan ke nilai default aman.

---

## 2) Checklist Red Line (Ambang Batas Minimum)

### A. Referensi Web (`refs`)

Checklist wajib:
1. `cap refs` baseline final tetap `5` (locked).
2. Ambang minimum aman `refs` yang diinject ke prompt stage aktif adalah `5` jika data tersedia >= 5.
3. Jika data referensi < 5, inject semua yang valid (tidak boleh fabrikasi untuk mengejar angka).
4. Jangan turunkan `cap refs` ke `3` sebagai default global tanpa revalidasi simulasi baru.

Alasan red-line:
1. Di bawah 5, cakupan bukti cepat turun pada stage berbasis literatur dan risiko jawaban spekulatif naik.

### B. Sitasi (`sitasiAPA` atau field sitasi setara)

Checklist wajib:
1. `cap sitasi` baseline final tetap `5` (locked) untuk stage yang butuh landasan teori kuat (terutama `pendahuluan`).
2. Ambang minimum aman injeksi sitasi adalah `5` jika tersedia >= 5.
3. Jika sitasi valid < 5, tampilkan apa adanya dan pertahankan warning/permintaan pencarian tambahan.
4. Jangan menghapus URL sumber saat menampilkan sitasi ringkas.

Alasan red-line:
1. Sitasi terlalu sedikit membuat model gampang menutup gap dengan narasi asumtif.

### C. Completed Summaries (`ringkasan` + `ringkasanDetail`)

Checklist wajib:
1. Completed stage detail baseline final yang boleh dibawa penuh hanya `3 stage terakhir` (locked).
2. Stage completed yang lebih lama wajib ringkas, tapi tidak boleh kosong total.
3. Ringkasan minimal per stage lama harus tetap menyimpan 3 jangkar:
   - output inti stage
   - constraint/batasan penting
   - keputusan yang memengaruhi stage berikutnya
4. Jangan drop ringkasan stage lama jika stage aktif masih bergantung langsung pada keputusan stage tersebut.

Alasan red-line:
1. Menghapus total konteks historis memicu inkonsistensi antarbagian naskah.

---

## 3) Hard Stop Conditions (Tidak Boleh Dilanjut)

Hentikan implementasi dan rollback ke default aman jika salah satu terjadi:
1. Prompt stage `pendahuluan` kehilangan semua referensi URL yang semula tersedia.
2. Stage aktif tidak lagi menerima konteks keputusan penting dari stage completed.
3. Hasil simulasi menunjukkan kualitas turun nyata (jawaban makin generik, sitasi makin kosong, atau mismatch dengan rumusan masalah).
4. Penghematan token naik, tapi test struktur prompt gagal atau tool behavior berubah.

---

## 4) Kriteria Lulus Aman (Safety Gate)

Semua poin ini harus lolos bersamaan:
1. Target hemat token tercapai sesuai dokumen anchor.
2. Tidak ada penurunan kualitas faktual pada simulasi `pendahuluan` heavy dan `diskusi` medium.
3. Referensi dan sitasi yang ditampilkan tetap punya jejak URL valid.
4. Keterkaitan antarstage tetap konsisten (tidak ada drift konteks antarbagian paper).

---

## 5) Checklist Verifikasi Pra-Merge

1. Cek nilai default masih `cap refs=5`, `cap sitasi=5`, `window summary detail=3`.
2. Jalankan test unit kompresi dan pastikan pass.
3. Jalankan simulasi 2 skenario minimum:
   - `pendahuluan` heavy
   - `diskusi` medium
4. Bandingkan before/after:
   - panjang prompt
   - kelengkapan referensi URL
   - konsistensi jawaban terhadap tujuan stage
5. Jika ada anomali halusinasi, fallback ke konfigurasi default dan investigasi.

---

## 6) Decision Log Singkat

1. Strategi utama tetap optimasi injection yang sudah ada, bukan ganti arsitektur.
2. Kompresi boleh agresif hanya pada data repetitif, bukan pada bukti referensi.
3. Batas aman dipilih untuk model non-reasoning agar tetap punya jangkar konteks yang cukup.

---

## 7) Change-Control Baseline (Wajib)

Konfigurasi locked saat ini:
1. `cap refs = 5`
2. `cap sitasi = 5`
3. `window ringkasanDetail completed = 3`

Larangan:
1. Tidak boleh ubah angka locked hanya karena target token belum tercapai.
2. Tidak boleh merge perubahan baseline tanpa simulasi ulang.

Syarat wajib sebelum ubah baseline:
1. Simulasi ulang minimal 2 skenario: `pendahuluan` heavy dan `diskusi` medium.
2. Bukti before/after untuk:
   - panjang prompt
   - kualitas sitasi/referensi (termasuk URL)
   - konsistensi jawaban antarstage
3. Update dokumen anchor dan red-line bersamaan dalam satu commit.
