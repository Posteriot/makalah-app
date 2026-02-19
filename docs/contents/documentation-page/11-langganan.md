---
doc_id: "S11"
slug: "langganan"
title: "Langganan"
group: "Subskripsi"
order: 8
icon: "Settings"
isPublished: true
status: "final"
lastVerifiedAt: "2026-02-19"
---

# Langganan

## Ringkasan

Halaman ini menjelaskan alur langganan di Makalah AI dari sudut pandang user. Fokusnya: bagaimana mulai berlangganan, bagaimana status langganan bekerja, dan apa yang terjadi saat periode langganan berubah.

## Konten Utama

### Apa yang Dimaksud Langganan

Langganan adalah akses berbayar yang memberi kapasitas pemakaian lebih besar dibanding akun gratis.

1. User bisa mulai langganan dari area `Langganan` di dashboard.
2. Proses pembayaran dilakukan lewat checkout di aplikasi.
3. Setelah pembayaran terkonfirmasi berhasil, status langganan user diperbarui otomatis.

### Cara Mulai Langganan

1. Buka dashboard, lalu masuk ke menu `Langganan`.
2. Pilih paket berlangganan yang tersedia.
3. Lanjutkan ke halaman checkout.
4. Selesaikan pembayaran sampai status dinyatakan berhasil.

### Status Langganan yang Perlu Dipahami

Secara praktis, user akan berhadapan dengan kondisi ini:

1. Langganan aktif: akses paket berjalan normal.
2. Menunggu pembayaran: transaksi dibuat tetapi belum terkonfirmasi.
3. Langganan selesai/berakhir: akses kembali mengikuti status akun saat itu.

### Saat Langganan Berakhir

Sistem akan menyesuaikan status akun sesuai kondisi yang ada saat periode selesai. Karena itu, user disarankan rutin memantau halaman ringkasan langganan agar tidak kaget saat akses berubah.

### Info Harga

Nominal paket bisa berubah mengikuti kebijakan produk. Untuk angka terbaru, selalu cek halaman `Harga` yang aktif di aplikasi.

## Rujukan Kode (Wajib)

- `src/app/(dashboard)/subscription/overview/page.tsx:72` - Halaman ringkasan langganan untuk user reguler.
- `src/app/(dashboard)/subscription/plans/page.tsx:16` - Halaman pilihan paket langganan.
- `src/app/(onboarding)/checkout/pro/page.tsx:101` - Halaman checkout langganan Pro.
- `src/app/api/payments/subscribe/route.ts:33` - Endpoint pembuatan transaksi langganan.
- `src/app/api/webhooks/xendit/route.ts:94` - Event sukses pembayaran diproses dari webhook.
- `src/app/api/webhooks/xendit/route.ts:215` - Aktivasi langganan saat pembayaran awal berhasil.
- `convex/billing/subscriptions.ts:70` - Pembuatan record langganan internal.
- `convex/billing/subscriptions.ts:164` - Query langganan aktif user.
- `convex/billing/subscriptions.ts:300` - Mekanisme penanganan saat langganan berakhir.

## Catatan Verifikasi

- [x] Narasi ditulis untuk user awam, bukan developer.
- [x] Tidak menyebut detail tier internal rahasia.
- [x] Tidak menuliskan nominal statis; diarahkan ke halaman harga terbaru.

## Riwayat Revisi

- Final:
  - Tanggal: 2026-02-19
  - Ringkasan finalisasi: Dokumen dipecah menjadi menu terpisah kategori Subskripsi.
