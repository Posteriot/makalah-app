---
doc_id: "S7"
slug: "security"
title: "Keamanan Data"
group: "Panduan Lanjutan"
order: 11
icon: "ShieldCheck"
isPublished: true
status: "final"
lastVerifiedAt: "2026-02-19"
---

# Keamanan Data di Makalah AI

## Ringkasan

Makalah AI dirancang dengan prinsip bahwa data Anda adalah milik Anda sepenuhnya. Kami membangun sistem keamanan berlapis untuk memastikan akses hanya terbatas pada pemilik akun, setiap transaksi terlindungi, dan seluruh alur kerja AI kami berjalan dalam koridor yang aman dan transparan.

## Komitmen Kami terhadap Keamanan Anda

Keamanan bukan sekadar fitur, tapi pondasi dari Makalah AI. Kami memastikan setiap data yang Anda olah di sini tetap privat dan terjaga.

## 1. Perlindungan Akses Akun

- **Autentikasi Ketat**: Hanya Anda yang bisa mengakses area kerja dan riwayat riset Anda.
- **Validasi Kepemilikan**: Sistem melakukan pengecekan ganda di backend untuk memastikan data memang milik akun Anda.
- **Login Sosial Tepercaya**: Kami menggunakan Google OAuth untuk proses masuk yang aman tanpa menyimpan password di sistem kami.

## 2. Keamanan Saat Menyusun Paper

- **Alur Kerja Terkunci**: Workflow paper dirancang bertahap agar tidak ada akses ilegal ke draf yang sedang dikerjakan.
- **Jejak Sumber**: Setiap referensi yang diambil oleh AI dicatat sebagai jejak kerja yang bisa Anda verifikasi.

## 3. Keamanan File dan Lampiran

- **Upload Terproteksi**: File riset disimpan di storage terenkripsi dan hanya dapat di akses melalui izin akun Anda.
- **Batas Aman**: Pembatasan ukuran file 10MB untuk menjaga performa dan keamanan ekstraksi.

## 4. Standar Pembayaran Global

- **Mitra Terverifikasi**: Transaksi diproses melalui Xendit. Kami tidak pernah menyimpan data kartu kredit atau PIN Anda.
- **Proteksi Webhook**: Setiap transaksi diverifikasi ulang dengan token unik untuk mencegah manipulasi data.

## 5. Apa yang Bisa Anda Lakukan?

- **Gunakan Password Kuat**: Jika tidak menggunakan login sosial.
- **Anonimisasi**: Hindari mengunggah data rahasia seperti nomor PIN ke dalam percakapan AI.

## Rujukan Kode (Wajib)

- `src/proxy.ts:4` - Route publik dipisahkan dari route privat.
- `src/proxy.ts:42` - User tanpa sesi diarahkan ke login.
- `convex/authHelpers.ts:35` - Akses backend mewajibkan user terautentikasi.
- `convex/authHelpers.ts:66` - Validasi ownership untuk conversation.
- `convex/authHelpers.ts:94` - Validasi ownership untuk paper session.
- `convex/authHelpers.ts:106` - Validasi ownership untuk file.
- `src/components/chat/FileUploadButton.tsx:27` - Pembatasan tipe file upload.
- `src/components/chat/FileUploadButton.tsx:38` - Batas ukuran file 10MB.
- `src/app/api/extract-file/route.ts:135` - Ekstraksi file butuh autentikasi.
- `convex/files.ts:87` - URL file storage hanya untuk owner.
- `convex/billing/payments.ts:104` - Update status pembayaran via jalur internal ditolak jika kunci internal tidak valid.
- `src/app/api/webhooks/xendit/route.ts:65` - Validasi webhook pembayaran.
- `convex/auth.ts:67` - Konfigurasi provider login sosial.
- `src/app/(marketing)/security/page.tsx` - Sumber naskah hardcoded halaman keamanan.
- `src/components/marketing/SimplePolicyPage.tsx` - Komponen UI halaman legal.

## Catatan Verifikasi

- [x] Bahasa halaman disederhanakan untuk user awam.
- [x] Isi markdown sudah disamakan dengan naskah hardcoded halaman security.
- [x] Struktur heading mengikuti urutan section di halaman security.
- [x] Rujukan kode memuat page source dan komponen `SimplePolicyPage`.

## Riwayat Revisi

- Draft:
  - Tanggal: 2026-02-18
  - Ringkasan perubahan: Menyusun draf awal keamanan data berbasis implementasi sistem.
- Revisi User:
  - Tanggal: 2026-02-19
  - Catatan revisi dari user: Samakan isi markdown dengan naskah hardcoded halaman security.
- Final:
  - Tanggal: 2026-02-19
  - Ringkasan finalisasi: Konten S7 disinkronkan agar sama dengan halaman security hardcoded.
