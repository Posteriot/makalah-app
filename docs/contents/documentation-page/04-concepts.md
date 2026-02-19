---
doc_id: "S4"
slug: "concepts"
title: "Konsep Dasar"
group: "Mulai"
order: 4
icon: "FileText"
isPublished: true
status: "final"
lastVerifiedAt: "2026-02-18"
---

# Konsep Dasar

## Ringkasan

Halaman ini menjelaskan fondasi cara kerja Makalah AI dalam bahasa sederhana untuk user awam. Intinya ada tiga: posisi manifesto (AI dipakai secara transparan dan akuntabel), keutamaan workflow 13 tahapan sebagai pagar alur, dan peran AI sebagai kolaborator teknis yang tetap menempatkan user sebagai pengarah utama.

## Konten Utama

### 1) Landasan Manifesto Makalah AI

Di halaman About, Makalah AI menegaskan posisi bahwa teknologi tidak menggantikan manusia, tetapi melengkapi.

1. Penggunaan AI harus transparan, bisa dipertanggungjawabkan, dan punya jejak kerja yang jelas.
2. Fokusnya bukan sekadar menilai "AI atau bukan", tetapi memastikan proses penyusunan bisa diaudit.
3. Ini penting untuk membedakan dua hal: paper yang dibuatkan AI secara penuh, dan paper yang disusun bersama AI secara kolaboratif.

### 2) Keutamaan Workflow 13 Tahapan

Keunggulan utama Makalah AI ada pada workflow 13 tahapan penyusunan paper.

1. Alur kerja dibagi dari tahap `Gagasan Paper` sampai `Pemilihan Judul`.
2. Sistem memaksa proses tetap mengikuti tahap aktif, jadi diskusi tidak mudah lompat ke tahap yang belum waktunya.
3. User bisa melihat posisi kerja secara nyata di `Linimasa progres` (misalnya Stage 6/13).
4. Dengan pola ini, user tidak perlu merancang prompt yang rumit dari nol; cukup berdiskusi, lalu sistem menjaga ritme prosesnya.

### 3) Prinsip AI sebagai Kolaborator

Di Makalah AI, AI bukan mesin yang menggantikan user, tetapi mitra kerja yang menjalankan sisi teknis.

1. AI membantu menyusun output tahap menjadi naskah kerja yang rapi.
2. AI ikut membantu diskusi, pengolahan referensi, dan penajaman argumen.
3. AI bekerja dalam mode dialog kolaboratif, bukan sekali jawab langsung selesai.
4. Hasil akhirnya adalah kolaborasi manusia + AI, bukan "paper jadi otomatis" tanpa keterlibatan user.

### 3A) Refrasa sebagai Lapisan Kontrol Mutu Bahasa

Di Makalah AI, Refrasa berfungsi sebagai lapisan kontrol mutu untuk gaya penulisan pada output artifak.

Maknanya:

1. Fokus Refrasa ada pada perbaikan naturalness dan keterbacaan bahasa.
2. User tetap meninjau hasil perbandingan sebelum menerapkan perubahan.
3. Refrasa tidak mengubah prinsip utama sistem: AI sebagai mitra teknis, user sebagai pengarah keputusan.
4. Posisinya adalah alat bantu kualitas penyajian, bukan klaim "jaminan lolos" penilaian tertentu.

### 4) Kontrol Akhir Tetap di Tangan User

Walaupun AI aktif membantu, keputusan akhir tetap milik user.

1. Tahap hanya bisa lanjut setelah user menyetujui hasil melalui `Approve & Lanjut`.
2. Jika belum sesuai, user bisa pilih `Revisi` dan memberi arahan perbaikan.
3. Backend juga menjaga supaya data tahap tidak bisa diubah sembarangan saat status belum sesuai.

### 5) Kenapa Konsep Ini Penting untuk User Awam

Konsep dasar ini dirancang supaya user baru tetap merasa terarah.

1. Anda cukup mulai dari chat dan jelaskan tujuan paper.
2. Sistem mengarahkan proses ke jalur 13 tahap secara bertahap.
3. Anda tetap memegang kendali mutu akademik, sementara AI membantu mempercepat kerja teknis.

## Rujukan Kode (Wajib)

- `src/app/(marketing)/about/page.tsx:11` - Halaman About memuat `ManifestoSection` sebagai fondasi narasi.
- `src/components/about/ManifestoSection.tsx:14` - Subheading manifesto: teknologi melengkapi manusia.
- `src/components/about/ManifestoSection.tsx:19` - Manifesto menekankan transparansi, akuntabilitas, dan pembedaan "dibuatkan" vs "dibuat bersama" AI.
- `src/components/about/data.ts:56` - Narasi anti-prompting rumit: interaksi cukup lewat percakapan iteratif.
- `src/components/about/data.ts:74` - Narasi transparansi proses penyusunan dan akuntabilitas riwayat interaksi.
- `src/components/about/data.ts:93` - AI diposisikan sebagai juru tulis dan mitra diskusi (kolaborator).
- `src/components/marketing/hero/HeroSubheading.tsx:9` - Pesan produk: tidak perlu prompt/workflow rumit, gagasan diolah runtut.
- `convex/paperSessions/constants.ts:1` - Urutan resmi workflow 13 tahap.
- `convex/paperSessions/constants.ts:45` - Label tiap tahap dari `Gagasan Paper` hingga `Pemilihan Judul`.
- `src/lib/ai/paper-mode-prompt.ts:145` - Aturan sistem: diskusi dulu sebelum drafting.
- `src/lib/ai/paper-mode-prompt.ts:154` - Aturan sistem: dilarang lompat tahap sebelum status berubah di database.
- `src/lib/ai/paper-stages/foundation.ts:5` - Prinsip instruksi tahap awal: dialog kolaboratif, bukan output monolog.
- `src/lib/ai/paper-stages/foundation.ts:123` - Larangan memperlakukan proses sebagai generate otomatis; harus kolaborasi.
- `src/components/chat/ArtifactToolbar.tsx:249` - Fitur `Refrasa` tersedia sebagai aksi pada artifak.
- `src/components/chat/ArtifactViewer.tsx:147` - Guard penggunaan Refrasa mengikuti status tool, tipe artifak, dan panjang konten.
- `src/components/refrasa/RefrasaConfirmDialog.tsx:62` - Pola kerja Refrasa mewajibkan user meninjau perbandingan sebelum apply.
- `src/lib/refrasa/prompt-builder.ts:172` - Refrasa didefinisikan sebagai perbaikan gaya penulisan akademis.
- `src/lib/refrasa/prompt-builder.ts:183` - Anti-deteksi diposisikan sebagai upaya, bukan jaminan absolut.
- `src/lib/refrasa/schemas.ts:83` - Struktur markdown dan citation keys dijaga saat Refrasa menghasilkan teks baru.
- `convex/paperSessions.ts:596` - Backend menolak update jika bukan tahap aktif.
- `convex/paperSessions.ts:601` - Backend menolak update saat masih `pending_validation`.
- `convex/paperSessions.ts:811` - Submit tahap untuk validasi user.
- `convex/paperSessions.ts:848` - Approval tahap oleh user untuk lanjut ke tahap berikutnya.
- `src/components/paper/PaperValidationPanel.tsx:127` - Aksi `Revisi`.
- `src/components/paper/PaperValidationPanel.tsx:140` - Aksi `Approve & Lanjut`.
- `src/components/chat/shell/ActivityBar.tsx:175` - Menu `Sesi paper` di activity bar.
- `src/components/chat/shell/ActivityBar.tsx:180` - Menu `Linimasa progres` di activity bar.
- `src/components/chat/sidebar/SidebarProgress.tsx:411` - Tampilan posisi progres stage (contoh Stage X/13).

## Catatan Verifikasi

- [x] Narasi manifesto diambil dari implementasi halaman About saat ini.
- [x] Klaim workflow merujuk ke urutan resmi 13 tahap di kode.
- [x] Klaim AI sebagai kolaborator ditopang oleh narasi About + instruksi mode paper.
- [x] Klaim Refrasa ditulis sebagai kontrol mutu bahasa dengan keputusan akhir tetap di user.
- [x] Klaim kontrol user merujuk ke panel validasi dan guard backend.
- [x] Tidak ada klaim absolut seperti "otomatis pasti benar" atau "100% aman".

## Riwayat Revisi

- Draft:
  - Tanggal: 2026-02-18
  - Ringkasan perubahan: Menyusun draft menu `Konsep Dasar` berbasis manifesto About, keutamaan workflow 13 tahapan, dan prinsip AI sebagai kolaborator.
- Revisi User:
  - Tanggal:
  - Catatan revisi dari user:
- Final:
  - Tanggal:
  - Ringkasan finalisasi:
