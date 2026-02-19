---
doc_id: "S13"
slug: "pembayaran"
title: "Pembayaran"
group: "Subskripsi"
order: 10
icon: "ShieldCheck"
isPublished: true
status: "final"
lastVerifiedAt: "2026-02-19"
---

# Pembayaran

## Ringkasan

Halaman ini menjelaskan metode pembayaran, arti status transaksi, dan kapan kwitansi bisa diunduh.

## Konten Utama

### Metode Pembayaran yang Tersedia

Pembayaran di Makalah AI diproses lewat mitra pembayaran resmi dengan kanal:

1. `QRIS`
2. `Virtual Account`
3. `E-Wallet`

Untuk kanal tertentu, sistem bisa minta data tambahan, misalnya nomor HP pada e-wallet tertentu.

### Alur Pembayaran Singkat

1. User pilih paket atau top up.
2. Sistem membuat transaksi pembayaran.
3. User selesaikan pembayaran sesuai metode yang dipilih.
4. Status transaksi diperbarui otomatis setelah webhook diterima.

### Arti Status Transaksi

1. `Menunggu`: transaksi sudah dibuat, belum terkonfirmasi.
2. `Berhasil`: pembayaran masuk dan manfaat paket diterapkan.
3. `Gagal`: transaksi gagal diproses.
4. `Kedaluwarsa`: batas waktu pembayaran habis.

### Kapan Kwitansi Bisa Diunduh

Kwitansi hanya tersedia untuk transaksi dengan status `Berhasil`.

### Jika Transaksi Belum Berhasil

1. Cek dulu status transaksi di halaman riwayat.
2. Kalau masih `Menunggu`, selesaikan pembayaran sebelum waktu habis.
3. Kalau `Gagal` atau `Kedaluwarsa`, ulangi pembayaran dengan metode yang sesuai.

## Rujukan Kode (Wajib)

- `src/app/api/payments/topup/route.ts:25` - Metode pembayaran top up (`qris`, `va`, `ewallet`).
- `src/app/api/payments/subscribe/route.ts:27` - Metode pembayaran langganan (`qris`, `va`, `ewallet`).
- `src/lib/xendit/client.ts:7` - Kanal pembayaran yang didukung sistem.
- `src/app/api/webhooks/xendit/route.ts:65` - Validasi token webhook pembayaran.
- `src/app/api/webhooks/xendit/route.ts:94` - Event `payment.capture` menandai pembayaran sukses.
- `src/app/api/webhooks/xendit/route.ts:98` - Event `payment.failed` menandai pembayaran gagal.
- `src/app/api/webhooks/xendit/route.ts:102` - Event `payment_request.expired` menandai transaksi kedaluwarsa.
- `src/app/(dashboard)/subscription/history/page.tsx:35` - Mapping label status di UI riwayat.
- `src/app/(dashboard)/subscription/history/page.tsx:289` - Tombol `Kwitansi` hanya untuk status sukses.
- `src/app/api/export/receipt/[paymentId]/route.ts:65` - API menolak cetak kwitansi jika status bukan `SUCCEEDED`.

## Catatan Verifikasi

- [x] Penyebutan provider menggunakan istilah umum: mitra pembayaran resmi.
- [x] Status transaksi sesuai implementasi webhook.
- [x] Aturan kwitansi sesuai guard di API export.

## Riwayat Revisi

- Final:
  - Tanggal: 2026-02-19
  - Ringkasan finalisasi: Dokumen dipecah menjadi menu terpisah kategori Subskripsi.
