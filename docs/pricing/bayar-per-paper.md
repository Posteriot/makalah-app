# Bayar Per Paper (BPP) – Implementasi Pembayaran & Kredit

### Ringkasan
Dokumen ini menjelaskan implementasi BPP di codebase: user top up saldo lewat Xendit (QRIS/VA/E-Wallet), status pembayaran dipantau real-time lewat subscription di Plans Hub (aktif jika `convexPaymentId` tersedia di state UI), webhook menambah saldo dan upgrade tier ke `bpp`, lalu pemakaian AI memotong credit sesuai token yang terpakai.

### Detail per File/Fitur/Komponen
- **Nama**: `convex/billing/constants.ts`
- **Peran**: Sumber konstanta billing untuk BPP.
- **Alur Utama**: `TOP_UP_PACKAGES` dipakai sebagai default topup options; `TOKENS_PER_IDR` dipakai untuk konversi saldo ke token.
- **Dependensi**: Tidak ada.
- **Catatan**: Nilai nominal top up default: 25k/50k/100k; `TOKENS_PER_IDR = 10`.

- **Nama**: `convex/schema.ts`
- **Peran**: Mendefinisikan field yang dibutuhkan BPP di database.
- **Alur Utama**: `pricingPlans.topupOptions` menyimpan opsi top up; `creditBalances` menyimpan saldo; `payments` menyimpan transaksi.
- **Dependensi**: `convex/values`.
- **Catatan**: `payments.status` mendukung `PENDING/SUCCEEDED/FAILED/EXPIRED/REFUNDED`.

- **Nama**: `convex/migrations/seedPricingPlans.ts` (fungsi `activateBPPPayment`)
- **Peran**: Mengaktifkan BPP di database dan mengisi `topupOptions`.
- **Alur Utama**: Update plan Gratis (hapus highlight), BPP (enable + highlight + CTA + topupOptions), Pro (disable + CTA “Segera Hadir”).
- **Dependensi**: `TOP_UP_PACKAGES` dari `convex/billing/constants.ts`.
- **Catatan**: `ctaHref` BPP diarahkan ke `/subscription/plans`.

- **Nama**: `convex/pricingPlans.ts` (query `getTopupOptionsForPlan`)
- **Peran**: Sumber opsi top up BPP untuk UI.
- **Alur Utama**: Ambil plan by `slug` → pakai `topupOptions` jika ada → fallback ke `TOP_UP_PACKAGES` bila kosong/tidak ada.
- **Dependensi**: `TOP_UP_PACKAGES`.
- **Catatan**: Mengembalikan `planExists` untuk membedakan fallback.

- **Nama**: `src/app/(dashboard)/subscription/plans/page.tsx`
- **Peran**: Plans Hub dengan inline payment BPP (expandable card).
- **Alur Utama**: Fetch plans + topup options → pilih nominal & metode → POST ke `/api/payments/topup` → subscribe `watchPaymentStatus` → sukses auto-collapse.
- **Dependensi**: `useQuery` (Convex), `qrcode.react`, `sonner`.
- **Catatan**: OVO butuh nomor HP; E-Wallet redirect dibuka di tab baru; subscription memakai `paymentResult.convexPaymentId` (state diisi dari response API yang mengandung `paymentId`).

- **Nama**: `src/app/(dashboard)/subscription/topup/page.tsx`
- **Peran**: Halaman top up terpisah (flow pembayaran penuh).
- **Alur Utama**: Pilih nominal & metode → POST `/api/payments/topup` → tampilkan QR/VA/redirect.
- **Dependensi**: `qrcode.react`, `sonner`, `useQuery` credit.
- **Catatan**: OVO butuh nomor HP; GoPay menggunakan redirect URL.

- **Nama**: `src/app/api/payments/topup/route.ts`
- **Peran**: Endpoint pembuatan payment request top up.
- **Alur Utama**: Validasi auth & nominal → buat payment Xendit (QRIS/VA/E-Wallet) → simpan record `payments` (type `credit_topup`) → balikan data QR/VA/redirect.
- **Dependensi**: `@clerk/nextjs/server`, `convex/nextjs`, `@/lib/xendit/client`.
- **Catatan**: Nominal valid hanya 25k/50k/100k; OVO wajib `mobileNumber`; response mengembalikan `paymentId` dan alias `convexPaymentId` (keduanya ID payment di Convex). UI Plans Hub menggunakan `convexPaymentId` untuk subscription real-time.

- **Nama**: `convex/billing/payments.ts` (query `watchPaymentStatus` + mutations payment)
- **Peran**: Penyimpanan dan subscription status pembayaran.
- **Alur Utama**: `createPayment` menyimpan transaksi; `updatePaymentStatus` update status dari webhook; `watchPaymentStatus` dipakai UI untuk real-time.
- **Dependensi**: `convex/values`.
- **Catatan**: `watchPaymentStatus` return `null` jika payment tidak ditemukan.

- **Nama**: `src/app/api/webhooks/xendit/route.ts`
- **Peran**: Webhook handler status pembayaran Xendit.
- **Alur Utama**: Verifikasi token → update status → jika `credit_topup` maka `addCredits` → kirim email sukses/gagal.
- **Dependensi**: `@/lib/xendit/client`, `convex/nextjs`, `@/lib/email/sendPaymentEmail`.
- **Catatan**: Email failure tidak memblok proses webhook.

- **Nama**: `convex/billing/credits.ts`
- **Peran**: Menambah saldo credit dan memotong saldo untuk BPP.
- **Alur Utama**: `addCredits` menambah saldo dan upgrade user `free → bpp`; `deductCredits` mengurangi saldo berdasarkan tokens.
- **Dependensi**: `TOKENS_PER_IDR`, `calculateCostIDR` dari `convex/billing/constants.ts`.
- **Catatan**: Jika saldo belum ada, dibuat baru dan tetap upgrade tier.

- **Nama**: `src/lib/billing/enforcement.ts`
- **Peran**: Enforcement billing saat operasi AI.
- **Alur Utama**: Setelah AI response, jika tier `bpp` maka `deductCredits`; jika non-BPP, potong kuota.
- **Dependensi**: `convex/nextjs`.
- **Catatan**: Error deduct credit hanya di-log, tidak memblok flow.

- **Nama**: `src/lib/email/sendPaymentEmail.ts`
- **Peran**: Kirim email sukses/gagal pembayaran.
- **Alur Utama**: Render React Email template → kirim via Resend.
- **Dependensi**: `resend`, `@react-email/components`.
- **Catatan**: Jika `RESEND_API_KEY` tidak ada, email di-skip.

- **Nama**: `convex/users.ts` (query `getUserById`)
- **Peran**: Ambil data email user untuk webhook pembayaran.
- **Alur Utama**: `getUserById` dipakai webhook untuk mengambil email sebelum mengirim notifikasi.
- **Dependensi**: `convex/values`.
- **Catatan**: Mengembalikan field aman saja (email, nama).

### Daftar File Terkait
- `convex/billing/constants.ts`
- `convex/schema.ts`
- `convex/migrations/seedPricingPlans.ts`
- `convex/pricingPlans.ts`
- `convex/billing/payments.ts`
- `convex/billing/credits.ts`
- `convex/users.ts`
- `src/app/(dashboard)/subscription/plans/page.tsx`
- `src/app/(dashboard)/subscription/topup/page.tsx`
- `src/app/api/payments/topup/route.ts`
- `src/app/api/webhooks/xendit/route.ts`
- `src/lib/billing/enforcement.ts`
- `src/lib/email/sendPaymentEmail.ts`

---

### Verifikasi Database (2026-01-30)

Dokumentasi ini telah diverifikasi terhadap **database Convex faktual** (bukan hanya schema/migration files):

| Table | Count | Status |
|-------|-------|--------|
| `pricingPlans` | 3 | ✅ BPP `isHighlighted: true`, `topupOptions` lengkap (25k/50k/100k) |
| `payments` | 10 | ⚠️ Sandbox testing (semua PENDING) |
| `creditBalances` | 1 | ✅ Saldo Rp 50.000 = 500.000 tokens |
| `usageEvents` | 3 | ✅ Total 13.698 tokens tercatat |
| `userQuotas` | 1 | ✅ Tier `gratis`, used 13.698/100.000 tokens |
| `subscriptions` | 0 | ✅ Kosong (Pro belum aktif, sesuai ekspektasi) |

**Catatan Penting:**
- Migration `activateBPPPayment` sudah dijalankan dan data tersinkron
- Data `payments` yang ada berasal dari **Xendit sandbox testing** (semua status PENDING karena sandbox tidak auto-complete)
- Untuk production, perlu test end-to-end dengan Xendit production credentials
- Webhook callback hanya berjalan jika Xendit mengirim event ke endpoint `/api/webhooks/xendit`
