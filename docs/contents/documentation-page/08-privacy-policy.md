---
doc_id: "S8"
slug: "privacy-policy"
title: "Kebijakan Privasi"
group: "Panduan Lanjutan"
order: 12
icon: "Globe"
isPublished: true
status: "final"
lastVerifiedAt: "2026-02-19"
---

# Kebijakan Privasi Makalah AI

## Ringkasan

Makalah AI (dioperasikan oleh PT THE MANAGEMENT ASIA) sangat menghargai privasi Anda. Sebagai aplikasi **AI Academic Writing Assistant**, kami berkomitmen untuk transparan dalam mengelola data yang Anda berikan agar layanan kami dapat membantu Anda menyusun karya tulis ilmiah dengan maksimal.

## 1. Data yang Kami Kumpulkan

Untuk menjalankan fungsi aplikasi, kami mengumpulkan:

- **Data Profil**: Nama dan alamat email saat Anda mendaftar (via Google atau formulir langsung).
- **Konten Riset**: Pesan chat, draf paper, dan file lampiran yang Anda unggah untuk diproses oleh AI.
- **Data Transaksi**: Informasi transaksi pembayaran (melalui mitra Xendit) untuk pengelolaan langganan.
- **Data Teknis**: Log aktivitas dasar untuk memastikan layanan tetap stabil dan aman.

## 2. Bagaimana Kami Menggunakan Data Anda

Tujuan utama penggunaan data Anda adalah untuk:

- Memberikan layanan penulisan dan riset akademis berbasis AI.
- Memproses pembayaran langganan fitur pro.
- Memenuhi kebutuhan keamanan seperti verifikasi login dan pemulihan akun.
- Mengirimkan update penting mengenai status layanan atau pemberitahuan akun.

## 3. Pemrosesan AI dan Pihak Ketiga

Untuk memberikan hasil terbaik, data konten Anda diproses menggunakan:

- **Penyedia AI**: Konten riset dikirimkan ke model AI (seperti Google Gemini atau OpenAI) untuk diolah menjadi draf paper.
- **Penyedia Pembayaran**: Data transaksi diproses secara aman oleh Xendit sesuai standar PCI-DSS.
- **Autentikasi**: Kami menggunakan layanan pihak ketiga untuk akses masuk yang aman (OAuth).

## 4. Keamanan dan Penyimpanan

Data Anda disimpan dalam basis data terenkripsi. Kami menerapkan pemeriksaan kepemilikan ketat sehingga hanya akun Anda yang memiliki akses ke data chat dan paper yang Anda buat.

## 5. Kontrol dan Hak Anda

Sebagai pengguna, Anda berhak untuk:

- Memperbarui informasi profil Anda secara langsung di aplikasi.
- Menghapus riwayat percakapan atau draf paper kapan saja.
- Mengajukan penutupan akun melalui kanal dukungan kami.

## 6. Kontak Kami

Jika ada pertanyaan mengenai privasi data Anda, silakan hubungi tim kami di:

- **Email**: dukungan@makalah.ai
- **Alamat**: Jl. H. Jian, Kebayoran Baru, Jakarta Selatan

## Rujukan Kode (Wajib)

- `convex/schema.ts:50` - Struktur data akun pada tabel `users`.
- `convex/schema.ts:97` - Struktur data percakapan pada tabel `conversations`.
- `convex/schema.ts:110` - Struktur data pesan pada tabel `messages`.
- `convex/schema.ts:130` - Struktur data lampiran pada tabel `files`.
- `convex/schema.ts:187` - Struktur data artifak pada tabel `artifacts`.
- `convex/schema.ts:751` - Struktur data transaksi pada tabel `payments`.
- `convex/schema.ts:829` - Struktur data langganan pada tabel `subscriptions`.
- `convex/schema.ts:73` - Struktur data `authRecoveryAttempts`.
- `convex/schema.ts:877` - Struktur data `twoFactorOtps`.
- `convex/users.ts:230` - Mutation `updateProfile` untuk edit profil pengguna.
- `convex/conversations.ts:145` - Mutation hapus percakapan milik user.
- `convex/paperSessions.ts:1025` - Arsip sesi paper (`archiveSession`).
- `convex/paperSessions.ts:1074` - Hapus permanen sesi paper (`deleteSession`) beserta data terkait.
- `convex/auth.ts:67` - Konfigurasi login sosial pada auth provider.
- `convex/auth.ts:50` - Email/password + verifikasi email diaktifkan.
- `convex/auth.ts:96` - Magic link login.
- `convex/auth.ts:102` - Fitur 2FA.
- `convex/authEmails.ts:30` - Pengiriman email verifikasi.
- `convex/authEmails.ts:38` - Pengiriman magic link.
- `convex/authEmails.ts:46` - Pengiriman reset password.
- `convex/authEmails.ts:54` - Pengiriman OTP 2FA.
- `src/app/api/webhooks/xendit/route.ts:65` - Validasi token webhook transaksi.
- `src/proxy.ts:13` - Route `/privacy` diperlakukan sebagai route publik pada middleware.
- `src/app/(marketing)/privacy/page.tsx` - Sumber naskah hardcoded halaman privasi.
- `src/components/marketing/SimplePolicyPage.tsx` - Komponen UI halaman legal.

## Catatan Verifikasi

- [x] Isi markdown sudah disamakan dengan naskah hardcoded halaman privacy.
- [x] Urutan section mengikuti halaman privacy (1-6).
- [x] Rujukan kode memuat page source dan komponen `SimplePolicyPage`.

## Riwayat Revisi

- Draft:
  - Tanggal: 2026-02-18
  - Ringkasan perubahan: Menyusun draft awal Kebijakan Privasi komprehensif untuk S8.
- Revisi User:
  - Tanggal: 2026-02-19
  - Catatan revisi dari user: Samakan isi markdown dengan naskah hardcoded halaman privacy.
- Final:
  - Tanggal: 2026-02-19
  - Ringkasan finalisasi: Konten S8 disinkronkan agar sama dengan halaman privacy hardcoded.
