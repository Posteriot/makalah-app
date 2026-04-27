# Resend: Transactional Email Infrastructure

Makalah AI menggunakan **Resend** sebagai solusi pengiriman email transaksional. Infrastruktur ini memastikan seluruh komunikasi kritis—mulai dari autentikasi hingga bukti pembayaran—sampai ke *inbox* pengguna dengan tingkat keterbacaan yang tinggi dan desain yang profesional.

## 1. Integrasi Resend SDK

Sistem menggunakan library `resend` yang dikonfigurasi melalui variabel lingkungan `RESEND_API_KEY` dan `RESEND_FROM_EMAIL`.

- **Server-Side Rendering**: Seluruh proses pengiriman email dilakukan di sisi server (`"use server"`) untuk menjaga keamanan API Key dan performa sisi *client*.
- **Asynchronous Delivery**: Pengiriman email dipicu secara asinkron setelah tindakan utama (seperti pendaftaran atau pembayaran) selesai, sehingga tidak menambah latensi pada alur kerja pengguna.

## 2. Dynamic Templating (React Email)

Makalah AI mengadopsi pendekatan modern dalam pembuatan template email menggunakan komponen React.

- **EmailLayout**: Komponen dasar yang memastikan konsistensi desain (logo, *footer*, dan tipografi) di semua jenis email.
- **Payment Success/Failure**: Template khusus untuk memberikan rincian transaksi pembayaran, jumlah kredit yang didapat, atau instruksi perbaikan jika pembayaran gagal.
- **Waitlist Confirmation**: Pesan otomatis untuk pengguna yang mendaftar di daftar tunggu, memberikan estimasi dan langkah selanjutnya.

## 3. Integrasi dengan BetterAuth (Magic Links)

Email autentikasi adalah salah satu bagian terpenting dalam sistem keamanan Makalah AI.

- **Magic Link Delivery**: Dalam `convex/auth.ts`, plugin `magicLink` dikonfigurasi untuk memicu `sendViaResend`.
- **Dynamic Rendering**: Sebelum dikirim, template `magic_link` dirender secara dinamis dengan menyertakan URL unik dan waktu kedaluwarsa (5 menit) untuk keamanan maksimal.
- **Fallback Mechanism**: Jika render template gagal, sistem memiliki jalur `sendMagicLinkEmailFallback` untuk memastikan link tetap terkirim meskipun dalam format teks sederhana.

## 4. Keamanan & Deliverability

- **SPF/DKIM Validation**: Seluruh email dikirim melalui domain resmi `makalah.ai` yang telah tervalidasi, meningkatkan reputasi pengirim dan meminimalkan risiko masuk ke folder spam.
- **Rate Limiting Handling**: Sistem dirancang untuk menangani *rate limit* dari penyedia layanan email secara elegan melalui mekanisme antrean di sisi backend jika diperlukan.

---
**Rujukan Kode:**
- [src/lib/email/resend.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/email/resend.ts): Konfigurasi klien Resend dan fungsi pengiriman dasar.
- [src/lib/email/templates/](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/email/templates/): Koleksi template email berbasis React.
- [convex/auth.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/auth.ts): Integrasi pengiriman email untuk alur autentikasi.
