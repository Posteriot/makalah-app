---
doc_id: "S2"
slug: "installation"
title: "Memulai"
group: "Mulai"
order: 2
icon: "Settings"
headerIcon: "Rocket"
isPublished: true
status: "final"
lastVerifiedAt: "2026-02-18"
---

# Memulai

## Ringkasan

Halaman ini membantu Anda mulai memakai Makalah AI dari nol: masuk atau daftar akun, menyelesaikan verifikasi yang dibutuhkan, lalu lanjut ke ruang kerja penulisan. Penjelasan dibuat dari sudut pandang user, jadi fokusnya langkah klik-menu, bukan istilah teknis developer.

## Konten Utama

### Cara Masuk dari Navigasi Utama

Kalau Anda sedang membuka situs Makalah AI, cara paling mudah adalah lewat menu di header atas.

1. Klik tombol `Masuk` di header.
2. Di halaman masuk, pilih metode yang paling nyaman:
   - `Masuk dengan Google`
   - Email + password
   - `Masuk via Magic Link` (link masuk lewat email)
3. Ikuti instruksi di layar sampai login berhasil.

### Cara Daftar Akun Baru

Kalau belum punya akun, Anda bisa daftar dari halaman masuk atau dari tombol utama di beranda.

1. Dari halaman masuk, klik `Daftar`.
2. Atau dari beranda, klik tombol `AYO MULAI` untuk masuk ke alur pendaftaran.
3. Isi form pendaftaran sesuai input yang tersedia:
   - `Nama depan` (wajib)
   - `Nama belakang` (kolom tersedia untuk dilengkapi)
   - `Email` (wajib)
   - `Password` (wajib, minimal 8 karakter)
4. Setelah klik `Daftar`, cek email verifikasi.
5. Jika email belum terlihat di inbox utama, cek juga folder/tab `Spam`, `Junk`, `Updates`, dan `Promosi`.
6. Setelah akun aktif, lanjut masuk dan mulai gunakan aplikasi.

### Khusus Daftar dengan Google: Buat Password di Atur Akun

Kalau Anda daftar/masuk memakai Google, tetap disarankan langsung membuat password akun agar metode login Anda lebih fleksibel.

1. Klik menu user di kanan atas header.
2. Klik `Atur Akun`.
3. Buka tab `Keamanan`.
4. Pada bagian password, isi `Password baru` dan `Konfirmasi password`, lalu klik `Buat Password`.
5. Setelah itu, akun Google Anda juga bisa dipakai masuk lewat email + password.

### Jika Diminta Verifikasi Tambahan (2 Langkah)

Pada kondisi tertentu, sistem akan meminta verifikasi tambahan setelah Anda memasukkan email dan password.

1. Sistem mengarahkan Anda ke halaman verifikasi 2 langkah.
2. Masukkan kode OTP 6 digit yang dikirim ke email.
3. Jika perlu, Anda bisa kirim ulang OTP atau pakai backup code.
4. Setelah verifikasi benar, Anda otomatis lanjut ke halaman tujuan.

### Jika Lupa Password

Makalah AI menyediakan pemulihan akses langsung dari halaman masuk.

1. Klik `Lupa password?`.
2. Masukkan email akun Anda.
3. Buka link reset password yang dikirim ke email.
4. Jika email belum terlihat di inbox utama, cek juga folder/tab `Spam`, `Junk`, `Updates`, dan `Promosi`.
5. Buat password baru, lalu masuk kembali.

### Catatan untuk Semua Email Otomatis

Saat Makalah AI mengirim email (misalnya verifikasi pendaftaran, magic link, dan reset password), biasakan cek folder selain inbox utama.

1. Cek inbox utama terlebih dahulu.
2. Jika belum ada, cek `Spam`, `Junk`, `Updates`, dan `Promosi`.
3. Tunggu beberapa menit lalu refresh inbox lagi sebelum meminta kirim ulang.

### Setelah Berhasil Masuk

Sesudah login, sistem akan mengarahkan Anda sesuai konteks akses.

1. Kalau Anda datang dari halaman tertentu, sistem mencoba membawa Anda kembali ke halaman tujuan itu.
2. Kalau tidak ada tujuan khusus, Anda dibawa ke beranda.
3. Untuk mulai menyusun paper, buka menu `Chat` di header.
4. Jika onboarding akun free belum selesai, sistem akan mengarahkan Anda dulu ke halaman `Get Started` sebelum lanjut ke alur normal.

### Kenali Fitur Refrasa Setelah Login

Setelah login, Anda bisa langsung mencoba Refrasa saat sudah ada artifak di ruang kerja paper.

Langkah singkat:

1. Klik menu `Chat` di header.
2. Buka percakapan paper sampai artifak muncul.
3. Buka artifak dalam mode panel atau fullscreen.
4. Klik tombol `Refrasa`.
5. Tinjau perbandingan teks asli dan hasil perbaikan.
6. Klik `Terapkan` jika sesuai, atau `Batal` jika belum sesuai.

Catatan:

1. Tombol Refrasa aktif jika konten artifak minimal 50 karakter dan tipe artifak bukan `chart`.
2. Pada kondisi maintenance, tombol Refrasa bisa sementara tidak ditampilkan.

### Ringkasan Alur Paling Aman untuk User Baru

Supaya tidak bingung, ikuti pola ini:

1. Klik `AYO MULAI`.
2. Selesaikan daftar/masuk.
3. Ikuti verifikasi jika diminta.
4. Selesaikan langkah awal di `Get Started`.
5. Klik menu `Chat` untuk mulai penyusunan paper.

## Rujukan Kode (Wajib)

- `src/components/layout/header/GlobalHeader.tsx:381` - Tombol `Masuk` di header desktop mengarah ke halaman sign-in.
- `src/components/layout/header/GlobalHeader.tsx:416` - Tombol `Masuk` di menu mobile.
- `src/components/layout/header/GlobalHeader.tsx:39` - Menu `Chat` tersedia di navigasi header.
- `src/components/marketing/hero/HeroCTA.tsx:16` - User belum login dari `AYO MULAI` diarahkan ke sign-up.
- `src/components/marketing/hero/HeroCTA.tsx:17` - User login + onboarding selesai diarahkan ke chat.
- `src/components/marketing/hero/HeroCTA.tsx:18` - User login + onboarding belum selesai diarahkan ke get-started.
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:474` - Opsi `Masuk dengan Google` tersedia.
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:537` - Opsi `Masuk via Magic Link` tersedia.
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:530` - Opsi `Lupa password?` tersedia.
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:213` - Alur sign-in mendukung redirect ke verifikasi 2FA.
- `src/app/(auth)/verify-2fa/page.tsx:42` - Verifikasi 2FA menggunakan OTP 6 digit.
- `src/app/(auth)/verify-2fa/page.tsx:272` - Mode backup code pada halaman verifikasi 2FA.
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:37` - Opsi daftar dengan Google.
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:58` - `Nama depan` wajib diisi saat daftar email.
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:70` - Password minimal 8 karakter saat daftar email.
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:146` - Input `Nama depan` tersedia pada form daftar.
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:160` - Input `Nama belakang` tersedia pada form daftar.
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:173` - Input `Email` tersedia pada form daftar.
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:186` - Input `Password` tersedia pada form daftar.
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:96` - Daftar email dapat masuk mode verifikasi email.
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:252` - Notifikasi verifikasi email menyarankan cek folder `Spam/Junk/Promosi`.
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:432` - Notifikasi magic link menyarankan cek folder `Spam/Junk/Promosi`.
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:436` - Notifikasi reset password menyarankan cek folder `Spam/Junk/Promosi`.
- `src/components/layout/header/UserDropdown.tsx:174` - Dropdown user menu memuat link ke `Atur Akun` (`/settings`).
- `src/components/layout/header/UserDropdown.tsx:179` - Label menu `Atur Akun`.
- `src/app/(account)/settings/page.tsx:210` - Tab `Keamanan` tersedia di halaman `Pengaturan Akun`.
- `src/components/settings/SecurityTab.tsx:233` - Untuk akun OAuth-only, status password ditandai `Belum diatur`.
- `src/components/settings/SecurityTab.tsx:296` - Aksi `Buat Password` tersedia di tab `Keamanan`.
- `src/lib/utils/redirectAfterAuth.ts:79` - Redirect pasca-auth membaca `redirect_url`/`redirect`.
- `src/lib/utils/redirectAfterAuth.ts:87` - Redirect hanya ke path yang diizinkan.
- `src/lib/utils/redirectAfterAuth.ts:91` - Jika redirect tidak valid/tidak ada, fallback ke default.
- `src/proxy.ts:42` - Route non-publik tanpa sesi akan diarahkan ke sign-in.
- `src/proxy.ts:45` - Middleware menyimpan tujuan awal di `redirect_url`.
- `src/components/onboarding/FreeLoginGate.tsx:50` - User free-tier diarahkan ke get-started sekali per sesi login.
- `src/lib/hooks/useOnboardingStatus.ts:28` - Status onboarding dipakai untuk menentukan apakah onboarding sudah selesai.
- `src/app/chat/page.tsx:4` - Halaman chat baru tersedia sebagai titik mulai percakapan.
- `src/components/chat/ArtifactToolbar.tsx:249` - Tombol `Refrasa` muncul di toolbar artifak saat syarat minimal terpenuhi.
- `src/components/chat/ArtifactViewer.tsx:147` - Syarat Refrasa: tool aktif, tipe bukan `chart`, konten minimal 50 karakter.
- `src/components/chat/FullsizeArtifactModal.tsx:574` - Tombol `Refrasa` juga tersedia saat artifak dibuka fullscreen.
- `src/components/refrasa/RefrasaConfirmDialog.tsx:168` - User menerapkan hasil hanya setelah meninjau dialog perbandingan.
- `convex/aiProviderConfigs.ts:568` - Status global Refrasa dibaca dari config aktif (default aktif).
- `src/components/admin/StyleConstitutionManager.tsx:445` - Admin dapat menonaktifkan Refrasa untuk semua user saat maintenance.

## Catatan Verifikasi

- [x] Alur klik dari sudut pandang user (menu/tombol) sudah diprioritaskan.
- [x] Rujukan auth memakai route aktif (`/sign-in`, `/sign-up`, `/verify-2fa`) yang ada di kode.
- [x] Klaim redirect pasca-login disesuaikan dengan whitelist redirect saat ini.
- [x] Klaim onboarding disesuaikan dengan gate free-tier (`/get-started`).
- [x] Konten tidak memasukkan detail waiting list sebagai alur utama dokumentasi fixed.
- [x] Input pendaftaran diperjelas sesuai field aktual pada form daftar.
- [x] Notifikasi email dilengkapi catatan cek folder selain inbox utama.
- [x] Alur buat password pasca-daftar Google dirujuk ke `Atur Akun` > `Keamanan`.
- [x] Penjelasan Refrasa ditulis sebagai langkah setelah login, dengan syarat penggunaan sesuai implementasi.

## Riwayat Revisi

- Draft:
  - Tanggal: 2026-02-18
  - Ringkasan perubahan: Menyusun draf `Memulai` berbasis alur login/daftar/verifikasi/onboarding aktual dengan narasi user-first.
- Revisi User:
  - Tanggal: 2026-02-18
  - Catatan revisi dari user: Lengkapi field pendaftaran secara rinci, tambahkan instruksi cek folder selain inbox utama untuk semua email otomatis, dan tambahkan instruksi buat password untuk akun Google melalui menu user `Atur Akun`.
- Final:
  - Tanggal: 2026-02-18
  - Ringkasan finalisasi: Finalisasi S2 berdasarkan revisi user. Konten memulai diperdalam pada detail field pendaftaran, penguatan instruksi cek folder email selain inbox utama untuk notifikasi penting, serta penegasan alur akun Google untuk membuat password lewat menu user `Atur Akun` pada tab `Keamanan`.
