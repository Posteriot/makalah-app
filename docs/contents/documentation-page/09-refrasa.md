---
doc_id: "S9"
slug: "refrasa"
title: "Refrasa"
group: "Fitur Utama"
order: 7
icon: "Zap"
isPublished: true
status: "draft"
lastVerifiedAt: "2026-02-18"
---

# Refrasa

## Ringkasan

Refrasa adalah fitur untuk membantu merapikan gaya bahasa pada artifak agar lebih natural, lebih enak dibaca, dan tetap mempertahankan makna inti tulisan. Fitur ini bukan pengganti keputusan user. User tetap meninjau hasil perbandingan dulu, lalu memutuskan mau `Terapkan` atau `Batal`.

## Konten Utama

### Apa Itu Refrasa dalam Alur Makalah AI

Di Makalah AI, Refrasa dipakai setelah ada artifak hasil kerja tahap.

1. Fokusnya memperbaiki gaya bahasa akademis agar lebih manusiawi.
2. Refrasa bekerja pada konten artifak, bukan sekadar balasan chat.
3. Hasilnya muncul dalam dialog perbandingan supaya user bisa menilai sebelum diterapkan.

### Kapan Tombol Refrasa Muncul

Tombol `Refrasa` tidak selalu aktif. Sistem memberi syarat agar hasilnya tetap relevan.

1. Konten artifak minimal 50 karakter.
2. Tipe artifak bukan `chart`.
3. Status tool Refrasa sedang aktif (tidak dalam mode maintenance).

Kalau syarat belum terpenuhi, tombol bisa nonaktif atau tidak ditampilkan.

### Cara Pakai Refrasa (Versi User Awam)

1. Buka menu `Chat`, lalu pilih artifak yang mau dirapikan.
2. Klik tombol `Refrasa` di toolbar artifak (mode panel) atau di workspace fullscreen.
3. Tunggu analisis selesai sampai dialog `Tinjau Hasil Refrasa` muncul.
4. Bandingkan `Teks Asli` dan `Hasil Perbaikan`.
5. Klik `Terapkan` jika sesuai, atau `Batal` jika belum cocok.

### Setelah Klik Terapkan, Apa yang Terjadi

Saat user klik `Terapkan`, sistem tidak menimpa data lama begitu saja.

1. Konten hasil refrasa disimpan sebagai versi artifak baru.
2. Riwayat versi tetap tersimpan lewat rantai versi (`parentId`).
3. User bisa lanjut revisi dari versi terbaru tanpa kehilangan jejak perubahan.

### Batas Klaim Fitur Refrasa

Supaya ekspektasi user tetap realistis:

1. Refrasa adalah upaya peningkatan naturalness tulisan, bukan jaminan mutlak atas alat deteksi tertentu.
2. Refrasa membantu kualitas bahasa, tetapi keputusan akademik tetap di user.
3. Jika layanan AI utama gagal, sistem mencoba provider fallback agar proses tetap jalan.

## Rujukan Kode (Wajib)

- `src/components/chat/ArtifactToolbar.tsx:77` - Tombol Refrasa siap dipakai jika konten minimal 50 karakter.
- `src/components/chat/ArtifactToolbar.tsx:249` - Tooltip menjelaskan batas minimal 50 karakter.
- `src/components/chat/ArtifactViewer.tsx:147` - Guard Refrasa: aktif jika tool enabled, bukan chart, dan konten >= 50.
- `src/components/chat/ArtifactViewer.tsx:216` - Aksi trigger Refrasa dari mode panel.
- `src/components/chat/ArtifactViewer.tsx:234` - Aksi apply Refrasa memperbarui konten artifak.
- `src/components/chat/FullsizeArtifactModal.tsx:210` - Guard Refrasa pada mode fullscreen.
- `src/components/chat/FullsizeArtifactModal.tsx:574` - Tombol Refrasa ditampilkan di toolbar fullscreen.
- `src/components/chat/FullsizeArtifactModal.tsx:352` - Apply Refrasa di fullscreen memperbarui artifak.
- `src/components/refrasa/RefrasaConfirmDialog.tsx:68` - Dialog `Tinjau Hasil Refrasa` untuk review sebelum keputusan.
- `src/components/refrasa/RefrasaConfirmDialog.tsx:167` - Tombol `Terapkan` ada di tahap konfirmasi user.
- `src/lib/refrasa/schemas.ts:95` - Validasi request: konten minimal 50 karakter.
- `src/app/api/refrasa/route.ts:36` - Endpoint Refrasa meminta user terautentikasi.
- `src/app/api/refrasa/route.ts:97` - Jika provider utama gagal, proses lanjut ke fallback.
- `src/lib/refrasa/prompt-builder.ts:183` - Anti-deteksi diposisikan sebagai upaya, bukan jaminan.
- `convex/artifacts.ts:299` - Update artifak membuat versi baru, bukan overwrite langsung.
- `convex/artifacts.ts:353` - Versi baru ditautkan ke versi sebelumnya lewat `parentId`.
- `convex/aiProviderConfigs.ts:559` - Status Refrasa dibaca dari config aktif.
- `convex/aiProviderConfigs.ts:577` - Refrasa bisa diaktif/nonaktifkan oleh admin.
- `src/components/admin/StyleConstitutionManager.tsx:445` - Jika dinonaktifkan, tombol Refrasa disembunyikan dari user.
- `src/components/admin/StyleConstitutionManager.tsx:458` - Ada penanda mode maintenance untuk Refrasa.

## Catatan Verifikasi

- [x] Narasi ditulis dari perspektif user, bukan istilah route developer.
- [x] Klaim syarat Refrasa (>= 50 karakter, non-chart, toggle aktif) sesuai guard di UI.
- [x] Klaim proses `Terapkan/Batal` sesuai alur dialog konfirmasi aktual.
- [x] Klaim versi artifak baru sesuai mutation `artifacts.update`.
- [x] Batas klaim anti-deteksi ditulis sebagai upaya, bukan jaminan.

## Riwayat Revisi

- Draft:
  - Tanggal: 2026-02-18
  - Ringkasan perubahan: Menambahkan menu baru `Refrasa` di kategori `Fitur Utama` dengan penjelasan fungsi, alur pakai, batas klaim, dan bukti kode.
- Revisi User:
  - Tanggal:
  - Catatan revisi dari user:
- Final:
  - Tanggal:
  - Ringkasan finalisasi:
