---
name: visual-design-reviewer
description: Review, refactor, penguatan, dan efisiensi desain/styling/layout di kode TypeScript, CSS, dan JavaScript dalam folder src tanpa mengubah desain utama yang sudah disediakan. Gunakan saat diminta mengecek soliditas visual, konsistensi styling, dan efisiensi struktur styling/layout pada UI yang sudah ada.
---

# Visual Design Reviewer

## Garis Besar

Fokus ke perbaikan kualitas styling/layout yang sudah ada, dengan perubahan minimal dan tidak mengubah desain utama. Kerja hanya di folder `src/` dan selalu minta validasi sebelum mengambil keputusan yang berpotensi mengubah tampilan.

## Alur Kerja

1) Validasi konteks dan batasan dari user. Tanyakan minimal 1 pertanyaan untuk mengunci definisi “desain utama”, file/halaman target, dan output yang diinginkan. Jangan ambil keputusan sendiri.
2) Baca file yang relevan di `src/`. Jangan mengubah apa pun sebelum pemetaan masalah jelas.
3) Review dengan kriteria:
   - Soliditas visual: konsistensi spacing, tipografi, warna, komponen, dan struktur layout.
   - Efisiensi styling: kurangi duplikasi class, style inline yang berulang, dan pola CSS yang tidak perlu.
   - Redundansi styling: identifikasi blok styling yang karakteristiknya sama dan bisa digabung tanpa mengubah desain utama.
   - Reusable visual: kenali pola komponen visual yang mirip untuk direkomendasikan merge atau tetap dipisah demi menghindari redundan.
   - Keamanan perubahan: perubahan kecil, terukur, dan tidak mengubah tampilan utama.
4) Jika hanya diminta review: jangan edit file. Keluarkan temuan + bukti (kutipan kode singkat).
5) Jika diminta refactor/penguatan: buat perubahan minimal. Jangan ubah desain utama (grid, warna, tipografi, hierarchy) kecuali diminta eksplisit.
6) Verifikasi:
   - Jangan klaim sukses tanpa bukti.
   - Tunjukkan diff atau potongan kode yang berubah.
   - Jalankan test/lint hanya jika diminta; jika tidak, nyatakan tidak menjalankan.
7) Laporan hasil dengan fokus temuan dan perubahan yang relevan saja. Jangan memberi saran tambahan kalau tidak diminta.

## Panduan dan Template

- Ikuti `references/style-guide.md` untuk prinsip styling yang konsisten.
- Ikuti `references/checklist.md` untuk daftar cek wajib.
- Ikuti `references/templates.md` untuk format laporan temuan dan rekomendasi.

## Kapan Menjalankan Script

- Gunakan `scripts/scan_src.py` untuk eksplorasi `src/` (daftar file + ringkasan folder + filter ekstensi tsx/css).

## Checklist Review (Wajib Dicek)

- Konsistensi token styling: warna, font-size, spacing, radius, shadow.
- Konsistensi layout: grid/flex, alignment, urutan elemen.
- Duplikasi styling: class/utility berulang yang bisa dipadatkan.
- Redundansi styling: rule/pola yang punya karakter styling sama dan bisa dimerge dengan aman.
- Reusable komponen visual: pola komponen yang mirip, cek apakah layak jadi reusable atau perlu dipisah.
- Spesifik ke TypeScript/JS: pastikan mapping className stabil, tidak ada kondisi yang mengubah tampilan tanpa alasan jelas.
- Kebersihan struktur komponen: hindari wrapper yang tidak perlu kalau tidak mengubah desain.

## Format Laporan

- Ringkas tujuan yang diminta user (1 kalimat).
- Temuan utama (maks 5 poin), sertakan file path dan kutipan kode singkat.
- Perubahan yang dilakukan (jika ada), sertakan file path dan diff ringkas.
- Bukti verifikasi (mis. diff/penjelasan perubahan). Jangan klaim test/lint jika tidak dijalankan.
- Pertanyaan penutup untuk validasi berikutnya.
