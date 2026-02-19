---
doc_id: "S10"
slug: "terms"
title: "Ketentuan Layanan"
group: "Panduan Lanjutan"
order: 13
icon: "DocSearch"
isPublished: true
status: "final"
lastVerifiedAt: "2026-02-19"
---

# Ketentuan Layanan Makalah AI

## Ringkasan
Selamat datang di Makalah AI. Dengan mengakses atau menggunakan layanan kami, Anda setuju untuk terikat oleh Ketentuan Layanan ini. Makalah AI adalah platform asisten penulisan akademis berbasis AI yang dikelola oleh **PT THE MANAGEMENT ASIA**.

## 1. Ketentuan Penggunaan
Layanan ini disediakan untuk membantu Anda dalam proses riset dan penyusunan karya tulis. Anda setuju untuk tidak menggunakan layanan ini untuk tujuan ilegal atau melanggar hak kekayaan intelektual orang lain.

## 2. Lisensi dan Hak Kekayaan Intelektual
Seluruh output yang dihasilkan oleh AI melalui akun Anda adalah hak milik Anda. Namun, Makalah AI tetap memiliki hak atas infrastruktur, desain, dan algoritma sistem yang disediakan dalam platform.

## 3. Batasan Tanggung Jawab (Disclaimer)
Meskipun AI kami dirancang untuk akurasi tinggi, hasil yang diberikan harus ditinjau kembali oleh pengguna. Makalah AI tidak bertanggung jawab atas kesalahan faktual, kutipan yang tidak akurat, atau konsekuensi akademis yang muncul dari penggunaan output AI tanpa verifikasi manusia.

## 4. Pembayaran dan Pembatalan
Beberapa fitur memerlukan akses berbayar melalui mitra kami, Xendit. Pembelian bersifat final kecuali dinyatakan lain dalam kebijakan pengembalian dana kami. Anda bertanggung jawab untuk menjaga keamanan akun dan informasi pembayaran Anda.

## 5. Perubahan Layanan
Kami berhak mengubah atau menghentikan bagian apa pun dari layanan kami sewaktu-waktu tanpa pemberitahuan sebelumnya, demi peningkatan kualitas atau pemenuhan kepatuhan regulasi.

## 6. Hukum yang Berlaku
Ketentuan ini diatur oleh hukum Republik Indonesia. Setiap perselisihan yang muncul akan diselesaikan melalui musyawarah atau melalui jalur hukum sesuai yurisdiksi yang berlaku.

## 7. Kontak
Untuk pertanyaan mengenai Ketentuan Layanan ini, silakan hubungi kami di:

- **Email**: dukungan@makalah.ai
- **Alamat**: PT THE MANAGEMENT ASIA, Jl. H. Jian, Kebayoran Baru, Jakarta Selatan

## Rujukan Kode (Wajib)
- `src/app/(marketing)/terms/page.tsx` - Halaman frontend Ketentuan Layanan.
- `src/components/layout/footer/Footer.tsx:23` - Link footer mengarah ke `/terms`.
- `src/proxy.ts:16` - Route `/terms` ditambahkan (jika belum ada) ke whitelist middleware (catatan: manual check needed).
- `src/components/marketing/SimplePolicyPage.tsx` - Komponen layout untuk konsistensi halaman legal.

## Catatan Verifikasi
- [x] Konten mencakup identitas pengelola (PT THE MANAGEMENT ASIA).
- [x] Disclaimer batasan tanggung jawab AI dicantumkan dengan jelas.
- [x] Alur pembayaran via Xendit disebutkan.
- [x] Kontak dukungan resmi tersedia.

## Riwayat Revisi
- Final:
  - Tanggal: 2026-02-19
  - Ringkasan finalisasi: Membuat dokumen ke-10 (Terms) untuk melengkapi persyaratan verifikasi aplikasi.
