# Xendit: Payment Gateway Integration

Makalah AI menggunakan **Xendit** sebagai penyedia layanan pembayaran utama untuk memproses top-up kredit dan langganan Pro. Integrasi ini dirancang dengan prinsip abstraksi (Adapter Pattern) agar sistem tetap fleksibel dan aman.

## 1. Arsitektur Adapter Pattern

Seluruh logika spesifik Xendit diisolasi di dalam `src/lib/payment/adapters/xendit.ts`. Implementasi ini mengikuti antarmuka `PaymentProvider`, sehingga komponen UI tidak perlu tahu detail teknis API Xendit.

- **API Version**: Menggunakan versi API `2024-11-11`.
- **Payment Requests**: Menggunakan *endpoint* `/v3/payment_requests` yang menyatukan berbagai metode pembayaran dalam satu alur kerja.
- **Normalized Output**: Data dari Xendit (seperti `payment_request_id`) dipetakan menjadi format `PaymentResult` yang seragam (seperti `providerPaymentId`).

## 2. Keamanan & Verifikasi Webhook

Verifikasi webhook adalah lapisan keamanan paling krusial untuk mencegah manipulasi saldo kredit pengguna.

- **Token Validation**: Sistem memverifikasi *header* `x-callback-token` yang dikirim oleh Xendit.
- **Environment Variables**: Token verifikasi disimpan dalam `XENDIT_WEBHOOK_TOKEN` (atau `XENDIT_WEBHOOK_SECRET` sebagai cadangan).
- **Safe Handling**: Webhook handler (`src/app/api/webhooks/payment/route.ts`) akan mengembalikan status 401 jika verifikasi gagal, memastikan hanya data valid dari Xendit yang diproses.

## 3. Kanal Pembayaran yang Didukung

Makalah AI mendukung tiga kategori kanal utama dari Xendit:
- **QRIS**: Dinamis dengan waktu kedaluwarsa yang dapat dikonfigurasi (default 30 menit).
- **Virtual Account (VA)**: Mendukung bank besar seperti BCA, Mandiri, BNI, dan BRI.
- **E-Wallet**: Mendukung OVO (dengan verifikasi nomor HP) dan GoPay (dengan *redirect* URL).

## 4. Alur Fulfillment (Convex)

Setelah webhook berhasil diverifikasi dan status dinyatakan `SUCCEEDED`, sistem menjalankan rangkaian mutasi di Convex:
1. **Status Update**: Memperbarui tabel `payments` menjadi `SUCCEEDED`.
2. **Credit Ingestion**: Menambahkan saldo ke tabel `credits` sesuai paket yang dibeli.
3. **Subscription Management**: Jika merupakan pembayaran langganan, sistem akan menginisialisasi kuota bulanan melalui `initializeQuotaInternal`.
4. **Email Notification**: Mengirimkan bukti pembayaran ke email pengguna via Resend.

## 5. Penanganan Error & Retry

Sistem dirancang untuk menangani kegagalan jaringan atau database secara elegan:
- **Transient Error**: Mengembalikan status 500 (HTTP Internal Server Error) agar Xendit melakukan *retry* pengiriman webhook di kemudian waktu.
- **Permanent Error**: Mengembalikan status 200 (OK) meskipun ada error internal (seperti data transaksi tidak ditemukan), agar Xendit menganggap pengiriman selesai dan tidak terus melakukan *retry* yang sia-sia.

---
**Rujukan Kode:**
- [src/lib/payment/adapters/xendit.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/payment/adapters/xendit.ts): Implementasi adapter dan verifikasi token.
- [src/app/api/webhooks/payment/route.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/api/webhooks/payment/route.ts): Handler webhook dan logika bisnis (kredit/langganan).
