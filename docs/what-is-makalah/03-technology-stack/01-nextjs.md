# Next.js: Arsitektur Meta-Framework

Makalah AI menggunakan **Next.js (App Router)** sebagai kerangka kerja utama untuk membangun aplikasi web yang performan dan SEO-friendly. Penggunaan Next.js memungkinkan kombinasi antara *Server Components* untuk optimasi *loading* dan *Client Components* untuk interaktivitas tinggi.

## Arsitektur Routing (Route Groups)
Aplikasi ini memanfaatkan **Route Groups** untuk mengorganisir logika halaman tanpa mempengaruhi struktur URL, memudahkan pemisahan *concern* antar bagian aplikasi:
- **`(marketing)`**: Halaman publik dan statis seperti Landing Page dan Pricing.
- **`(auth)`**: Alur autentikasi pengguna (Login, Signup, Reset Password).
- **`(dashboard)`**: Manajemen sesi makalah dan profil pengguna.
- **`chat/`**: Interface utama interaksi reaktif dengan AI.

## Strategi Rendering: Server vs Client
Makalah AI memisahkan tanggung jawab komponen secara ketat untuk efisiensi:
1. **Server Components (Default)**: Digunakan untuk pengambilan data awal dan komponen statis. Meminimalkan ukuran *bundle* JavaScript di sisi klien.
2. **Client Components (`"use client"`)**: Digunakan pada interface interaktif seperti Editor Naskah, Chat Window, dan komponen yang membutuhkan *state* realtime dari Convex.

## Server Actions & API Routes
Framework ini menangani tugas-tugas berat di sisi server melalui:
- **Server Actions**: Digunakan untuk operasi yang membutuhkan proteksi server seperti pengiriman email transaksi via Resend (`src/lib/email/resend.ts`) dan manajemen antrean (Waiting List).
- **API Routes**: Menangani integrasi eksternal seperti *Webhook* pembayaran Xendit dan ekspor dokumen (PDF/Docx).

## Optimasi & Konfigurasi (Audit Forensik)
Berdasarkan `next.config.ts`, terdapat optimasi khusus:
- **Turbopack**: Digunakan untuk performa *development* yang lebih cepat.
- **External Packages Handling**: Pustaka berat seperti `pdfkit`, `pdf-parse`, dan `mammoth` dikonfigurasi sebagai *external packages* untuk mencegah masalah *bundling* pada lingkungan serverless.
- **Image Remote Patterns**: Otorisasi domain `qr.xendit.co` untuk menampilkan kode QR pembayaran secara aman.

---
**Rujukan Kode:**
- [src/app/layout.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/layout.tsx): Struktur dasar HTML, font global (Geist), dan integrasi provider.
- [next.config.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/next.config.ts): Pusat konfigurasi engine Next.js dan integrasi Sentry.
- [src/app/providers.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/providers.tsx): Lapisan pembungkus untuk Context (Convex, BetterAuth, Theme).
