---
doc_id: "S1"
slug: "welcome"
title: "Selamat Datang"
group: "Mulai"
order: 1
icon: "BookOpen"
headerIcon: "Lightbulb"
isPublished: true
status: "final"
lastVerifiedAt: "2026-02-18"
---

# Selamat Datang

## Ringkasan

Makalah AI dirancang untuk membantu Anda mengolah gagasan menjadi paper secara bertahap lewat chat. Berdasarkan implementasi saat ini, alur utamanya menggabungkan percakapan, workflow 13 tahapan penyusunan, Refrasa pada artifak, dan kontrol user di setiap keputusan penting.

## Konten Utama

### Apa Itu Makalah AI

Makalah AI adalah aplikasi penyusunan paper berbasis percakapan. Di halaman utama, pesan produk menekankan bahwa Anda tidak perlu alur prompt yang rumit karena gagasan diproses runtut sampai menjadi paper utuh.

### Prinsip Kolaborasi: User Tetap Pengarah Utama

Makalah AI diposisikan sebagai kolaborator, bukan pengganti peran Anda sebagai penulis. Dalam praktiknya, proses disusun agar user tetap aktif: memberi konteks, memilih arah, menilai kualitas naskah per tahap, lalu memutuskan apakah tahap dilanjutkan atau direvisi.

Peran AI di sini adalah mitra kerja:

1. Bertindak sebagai juru tulis teknis yang menuliskan konten paper di setiap tahap aktif, berdasarkan konteks yang sudah disepakati bersama user.
2. Mengubah hasil diskusi menjadi output kerja yang bisa langsung ditinjau dan disempurnakan pada tahap berikutnya, bukan sekadar balasan chat.
3. Mengawal kesinambungan penyusunan dari tahap awal sampai tahap akhir agar proses bergerak menuju paper utuh.
4. Membantu merangkum temuan, menata struktur argumen, dan merapikan alur tulisan agar kualitas akademiknya meningkat.
5. Menjalankan proses per tahap secara disiplin dan menunggu keputusan user (`Revisi` atau `Approve & Lanjut`) sebelum berpindah.

Dengan pola ini, paper disusun sampai utuh melalui kolaborasi manusia + AI. AI menjalankan pekerjaan teknis penulisan dan pengawalan alur, sementara keputusan akademik tetap berada di tangan user.

### Workflow 13 Tahapan sebagai Pagar Alur

Fitur istimewa Makalah AI ada di mekanisme alur 13 tahapan yang berfungsi sebagai pagar alur penyusunan. Secara desain, pagar ini menjaga proses tetap berada di jalur paper dan mencegah alur kerja melompat-lompat tahap.

Artinya, user tidak perlu ruwet soal prompt teknis. Anda bisa ngobrol secara lumrah, berdiskusi seperti biasa, lalu sistem menjaga ritme kerja tahap demi tahap sampai paper utuh selesai.

Cara kerja pagarnya:

1. Prompt mode paper mengarahkan AI untuk fokus ke tahap aktif dan tidak loncat tahap.
2. Tool penyimpanan data tahap mengunci update ke tahap yang sedang aktif.
3. Backend menolak update jika tahap tidak cocok atau statusnya belum memungkinkan.
4. Perpindahan tahap tetap menunggu keputusan user lewat validasi.

### Refrasa: Membantu Tulisan Lebih Natural, Tetap di Kendali User

Saat artifak muncul, Anda bisa memakai tombol `Refrasa` untuk membantu merapikan gaya bahasa agar lebih natural dan lebih mudah dipahami manusia.

Peran fitur ini bukan menggantikan pemikiran Anda, tetapi membantu menyempurnakan kualitas penyajian tulisan. Setelah Refrasa dijalankan, sistem menampilkan perbandingan teks asli dan hasil perbaikan. Keputusan akhir tetap di tangan user: `Terapkan` atau `Batal`.

Catatan penting:

1. Refrasa adalah upaya perbaikan gaya bahasa, bukan jaminan "pasti lolos" alat deteksi tertentu.
2. Struktur penulisan penting (termasuk format markdown dan citation keys) dijaga agar kualitas akademik tetap konsisten.

### Apa yang Bisa Anda Lakukan Saat Ini

Berdasarkan implementasi saat ini, Anda bisa:

1. Klik menu `Chat` di header atas untuk masuk ke ruang kerja penulisan.
2. Di halaman chat, mulai percakapan baru untuk memulai penyusunan paper.
3. Jika ingin lanjut pekerjaan lama, pilih percakapan sebelumnya dari daftar riwayat.
4. Ikuti alur kerja yang dipandu sistem dari tahap awal sampai paper utuh selesai.

### Cara Mulai dari Beranda

Langkah mulai dari sudut pandang user:

1. Di beranda, klik tombol `AYO MULAI`.
2. Jika belum punya akun atau belum login, lanjut ke proses masuk/daftar.
3. Jika sudah login tetapi onboarding belum selesai, ikuti onboarding singkat terlebih dulu.
4. Setelah onboarding selesai, klik menu `Chat` di header untuk mulai diskusi penyusunan paper.

### Cara Pakai Halaman Dokumentasi

Halaman dokumentasi memuat konten section dari database dan menampilkan section yang sudah dipublish.

- Navigasi dibagi per grup menu.
- Ada pencarian `Cari dokumentasi...` untuk memudahkan temuan topik.
- Saat mengetik kata kunci, sistem menampilkan hasil teratas (maksimal 6 hasil).

### Akses Halaman Publik dan Navigasi

- Menu `Dokumentasi` tersedia di navigasi header situs.
- Halaman dokumentasi bisa dibuka tanpa login.

### Ke Mana Setelah Ini

Agar onboarding cepat dan tidak melebar, lanjutkan urutan ini:

1. Klik menu `Dokumentasi` di header, lalu buka bagian `Memulai` untuk memahami alur masuk/daftar sampai bisa memakai chat.
2. Dari bagian yang sama, lanjut klik `Panduan Cepat` untuk langkah praktis dari ide sampai naskah awal.
3. Setelah itu, klik `Workflow 13 Tahapan Penyusunan` agar paham ritme kerja lengkap sampai paper utuh.

## Rujukan Kode (Wajib)

- `src/app/(marketing)/page.tsx:35` - Beranda menampilkan Hero (heading, subheading, CTA) sebagai titik mulai user.
- `src/components/marketing/hero/HeroSubheading.tsx:9` - Pesan utama produk: gagasan diolah runtut menjadi paper.
- `src/components/marketing/hero/HeroCTA.tsx:14` - Logika tujuan tombol `AYO MULAI` berdasarkan status sesi user.
- `src/app/chat/page.tsx:4` - Route `/chat` memuat `ChatContainer` untuk chat baru.
- `src/app/chat/[conversationId]/page.tsx:9` - Route `/chat/[conversationId]` memuat percakapan spesifik.
- `convex/paperSessions/constants.ts:1` - Definisi urutan workflow 13 tahapan.
- `convex/paperSessions/constants.ts:45` - Label resmi nama setiap tahap.
- `src/lib/ai/paper-tools.ts:19` - Tool paper dirancang untuk inisialisasi sesi penulisan paper.
- `src/lib/ai/paper-mode-prompt.ts:145` - Aturan sistem: diskusi dulu, tidak langsung generate output penuh.
- `src/lib/ai/paper-mode-prompt.ts:146` - Draft tahap harus mengikuti konteks yang disepakati bersama user.
- `src/lib/ai/paper-mode-prompt.ts:150` - Instruksi membuat artifact untuk output yang sudah disepakati.
- `src/lib/ai/paper-mode-prompt.ts:154` - Instruksi eksplisit agar AI tidak loncat tahap.
- `src/lib/ai/paper-stages/foundation.ts:123` - Tahap awal ditegaskan sebagai proses kolaborasi, bukan sekali generate.
- `src/lib/ai/paper-tools.ts:79` - Tool `updateStageData` dijalankan dalam mode auto-stage (mengikuti tahap aktif).
- `src/components/paper/PaperValidationPanel.tsx:127` - User punya aksi `Revisi` untuk mengarahkan perbaikan.
- `src/components/paper/PaperValidationPanel.tsx:140` - User punya aksi `Approve & Lanjut` untuk kontrol kelanjutan tahap.
- `convex/paperSessions.ts:811` - Tahap masuk `pending_validation` sebelum bisa disetujui user.
- `convex/paperSessions.ts:848` - Perpindahan tahap dilakukan lewat mutation approval (kontrol user).
- `convex/paperSessions.ts:596` - Backend menolak update saat stage tidak sama dengan stage aktif.
- `convex/paperSessions.ts:601` - Backend menolak update saat status masih `pending_validation`.
- `src/components/chat/ArtifactToolbar.tsx:249` - Tombol `Refrasa` ditampilkan pada toolbar artifak dengan syarat minimal konten.
- `src/components/chat/ArtifactViewer.tsx:147` - Refrasa hanya aktif bila tool global aktif, tipe bukan `chart`, dan konten minimal 50 karakter.
- `src/components/chat/FullsizeArtifactModal.tsx:574` - Tombol `Refrasa` juga tersedia di mode fullscreen artifak.
- `src/components/refrasa/RefrasaConfirmDialog.tsx:62` - User meninjau perbandingan teks asli vs hasil Refrasa sebelum menerapkan.
- `src/lib/refrasa/prompt-builder.ts:183` - Tujuan anti-deteksi bersifat upaya, tanpa klaim jaminan lolos.
- `src/lib/refrasa/schemas.ts:83` - Hasil Refrasa harus mempertahankan struktur markdown dan citation keys.
- `src/app/(marketing)/documentation/page.tsx:4` - Route dokumentasi merender `DocumentationPage`.
- `src/components/marketing/documentation/DocumentationPage.tsx:19` - Konten dokumentasi diambil dari query `getPublishedSections`.
- `convex/documentationSections.ts:3` - Query dokumentasi hanya mengambil section yang dipublish.
- `src/components/marketing/documentation/DocumentationPage.tsx:32` - Section dikelompokkan per `group` untuk navigasi.
- `src/components/marketing/documentation/DocSidebar.tsx:41` - Input pencarian `Cari dokumentasi...` tersedia di sidebar.
- `src/components/marketing/documentation/DocumentationPage.tsx:129` - Hasil pencarian dibatasi maksimal 6 item.
- `src/proxy.ts:13` - `/documentation` termasuk public route.
- `src/components/layout/header/GlobalHeader.tsx:40` - Link `Dokumentasi` ada di header utama.

## Catatan Verifikasi

- [x] Route/URL yang disebut sudah dicek ada di kode.
- [x] Klaim workflow menyesuaikan implementasi 13 tahapan saat ini.
- [x] Klaim alur mulai user menyesuaikan kondisi login/onboarding.
- [x] Klaim Refrasa dibatasi sebagai bantuan humanisasi gaya bahasa, bukan klaim jaminan hasil absolut.
- [x] Klaim dokumentasi data-driven sesuai query dan schema aktif.
- [x] Bahasa dibuat awam dan tidak melebihi batas klaim teknis.

## Riwayat Revisi

- Draft:
  - Tanggal: 2026-02-18
  - Ringkasan perubahan: Menyusun draft menu Selamat Datang berbasis alur produk aktual (hero → chat → workflow 13 tahap) dan perilaku halaman dokumentasi.
- Revisi User:
  - Tanggal: 2026-02-18
  - Catatan revisi dari user: Tambahkan prinsip Makalah AI sebagai kolaborator (bukan pengganti user), perkuat peran user sebagai pengarah utama, dan tekankan workflow 13 tahapan sebagai pagar teknologi agar diskusi tetap dalam konteks sampai paper utuh selesai tanpa mengagungkan mesin.
- Final:
  - Tanggal: 2026-02-18
  - Ringkasan finalisasi: Finalisasi S1 berdasarkan revisi user. Narasi dibuat user-first, menegaskan peran Agen Makalah sebagai pelaku teknis penulisan sekaligus mitra kolaborasi, menempatkan workflow 13 tahapan sebagai pagar alur, serta menyederhanakan langkah penggunaan ke pola klik-menu untuk user awam.
