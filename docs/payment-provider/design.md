# Payment Provider Runtime Simplification - Xendit-Only Hardening

**Date:** 2026-03-07
**Status:** Approved for implementation
**Branch:** `worktree-payment-provider`

## Background

Branch ini sudah memiliki abstraction layer payment yang cukup baik: interface provider, factory, adapter Xendit, generic webhook, generic payment record fields, dan admin panel untuk payment settings. Masalahnya, sistem masih menampilkan `Midtrans` sebagai opsi aktif walaupun adapter Midtrans masih skeleton dan seluruh method penting masih melempar error.

Akibatnya, product surface saat ini tidak jujur terhadap runtime capability. Admin dapat menyimpan konfigurasi yang terlihat valid, tetapi checkout dan webhook akan gagal bila provider aktif diarahkan ke Midtrans.

## Goal And Scope

Tujuan perubahan ini adalah:

- Menetapkan `Xendit` sebagai satu-satunya payment provider runtime yang resmi didukung.
- Mempertahankan abstraction layer internal agar provider lain bisa ditambahkan lagi nanti tanpa membongkar seluruh flow.
- Menghapus false configurability dari admin panel, schema, dan runtime resolution.
- Mempertahankan payment record model yang generic (`provider*`) untuk audit trail, reconciliation, dan future extensibility.
- Menjaga secrets payment tetap `env-only`, bukan diinput dari dashboard.

Perubahan ini mencakup schema, Convex functions, admin UI, checkout flow, runtime validation, dan dokumentasi payment provider.

Perubahan ini tidak mencakup implementasi Midtrans, encrypted credential storage di database, atau multi-provider runtime switching.

## Decision Summary

- Runtime provider yang didukung hanya `xendit`.
- Secrets payment tetap dibaca dari environment server.
- `Midtrans` dihapus dari runtime path, admin UI, dan configuration surface.
- Payment records tetap memakai field generic `providerPaymentId`, `providerReferenceId`, dan `providerName`.
- `paymentProviderConfigs` dipertahankan sebagai payment settings table, bukan provider switcher.
- Checkout dan API route wajib memvalidasi payment method terhadap settings aktif.

## Architecture Decisions

### Internal abstraction tetap dipertahankan

`PaymentProvider` interface di `src/lib/payment/types.ts` tetap dipakai sebagai kontrak internal. Tujuannya bukan untuk mengklaim banyak provider aktif tersedia hari ini, tetapi untuk menjaga modularitas create-payment flow, webhook normalization, dan business logic.

### Factory disederhanakan

`src/lib/payment/factory.ts` tetap dipertahankan, tetapi resolution provider tidak lagi dinamis. Factory selalu mengembalikan `XenditAdapter` untuk runtime normal. Tidak boleh ada branch aktif ke adapter yang belum production-ready.

### Xendit menjadi satu-satunya adapter produksi

`src/lib/payment/adapters/xendit.ts` adalah satu-satunya adapter aktif. Adapter ini tetap bertanggung jawab untuk:

- create QRIS / VA / E-Wallet request
- verify webhook
- normalize provider response
- expose supported channels

### Midtrans keluar dari jalur runtime

`src/lib/payment/adapters/midtrans.ts` tidak lagi menjadi bagian dari runtime path. Karena adapter ini belum complete, ia tidak boleh tetap tersedia sebagai opsi sistem. Rekomendasi implementasi: hapus file dan seluruh import/runtime reference-nya.

## Data Model And Admin Configuration

### Payment transaction data tetap generic

Field berikut tetap dipertahankan pada payment records:

- `providerPaymentId`
- `providerReferenceId`
- `providerName`

Walaupun runtime saat ini hanya memakai Xendit, model ini tetap berguna untuk:

- receipt generation
- webhook reconciliation
- audit trail
- migrasi provider di masa depan

Dalam phase ini, `providerName` secara efektif hanya akan bernilai `"xendit"`.

### paymentProviderConfigs dipersempit menjadi settings table

`paymentProviderConfigs` tetap dipertahankan, tetapi fungsinya diubah dari provider switcher menjadi payment settings table.

Field yang dipertahankan:

- `enabledMethods`
- `webhookUrl`
- `defaultExpiryMinutes` hanya jika benar-benar dipakai di runtime
- `updatedBy`
- `createdAt`
- `updatedAt`
- `isActive` bila masih dibutuhkan untuk pola query existing

Field yang dihapus:

- `activeProvider`

### Admin panel berubah dari provider selector menjadi payment settings

`src/components/admin/PaymentProviderManager.tsx` harus berubah menjadi:

- status section yang menampilkan `Provider Aktif: Xendit`
- status env Xendit saja
- konfigurasi `enabledMethods`
- display `webhookUrl`

Admin panel tidak lagi memberi kesan bahwa admin dapat:

- memilih provider lain
- menginput credential dari dashboard
- mengaktifkan provider placeholder

## Runtime Data Flow

Flow target setelah hardening:

1. Checkout membaca `enabledMethods` dari `paymentProviderConfigs`.
2. User memilih method yang tersedia.
3. API route topup/subscription memanggil shared creator di `src/lib/payment/create-payment.ts`.
4. Shared creator meminta provider dari `src/lib/payment/factory.ts`.
5. Factory selalu mengembalikan `XenditAdapter`.
6. `XenditAdapter` membuat payment request ke Xendit dan mengembalikan hasil yang dinormalisasi.
7. Sistem menyimpan payment record ke Convex dengan field generic dan `providerName: "xendit"`.
8. Frontend menampilkan hasil payment tanpa conditional branding untuk provider lain.
9. Webhook tetap masuk ke `src/app/api/webhooks/payment/route.ts`, diverifikasi melalui abstraction, lalu diproses ke business logic yang sudah generic.

Konsekuensinya: abstraction tetap hidup di internal flow, tetapi runtime resolution tidak lagi membuka false path.

## Error Handling And Safety Rules

Sistem harus fail closed, bukan fail open.

Guard yang wajib diterapkan:

- Jika `XENDIT_SECRET_KEY` tidak ada, payment creation harus gagal cepat dengan error server yang jelas.
- Jika `XENDIT_WEBHOOK_TOKEN` atau `XENDIT_WEBHOOK_SECRET` tidak ada, webhook verification harus menolak proses.
- Admin panel status harus berdasarkan env check nyata, bukan asumsi UI.
- Save settings harus tetap ditolak jika semua `enabledMethods` dimatikan.
- Checkout hanya boleh menampilkan method yang enabled.
- Server route harus memvalidasi requested method terhadap `enabledMethods`, bukan hanya bergantung pada filter UI.
- Jika selected method menjadi invalid karena config berubah, frontend harus fallback ke method valid pertama atau menampilkan pesan jelas.
- Error provider harus tetap dibungkus ke pesan aplikasi yang aman untuk user.
- Webhook processing harus tetap idempotent untuk payment yang sudah `SUCCEEDED`.

Runtime normal tidak lagi boleh memiliki branch `unknown payment provider` sebagai kondisi operasional yang diharapkan.

## File-Level Change Map

### Runtime and types

- `src/lib/payment/factory.ts`
  Hapus resolution ke Midtrans dan sederhanakan ke Xendit-only runtime.
- `src/lib/payment/types.ts`
  Sesuaikan `PaymentProviderName` agar jujur terhadap runtime phase ini.
- `src/lib/payment/adapters/xendit.ts`
  Pertahankan sebagai adapter aktif; perjelas error misconfiguration bila perlu.
- `src/lib/payment/adapters/midtrans.ts`
  Hapus dari codebase aktif.

### Convex schema and settings

- `convex/schema.ts`
  Hapus union `midtrans` dari payment-related config fields dan sesuaikan shape `paymentProviderConfigs`.
- `convex/billing/paymentProviderConfigs.ts`
  Hapus `activeProvider`, hapus status env Midtrans, ubah API return shape menjadi Xendit-only settings/status.

### Admin UI

- `src/components/admin/PaymentProviderManager.tsx`
  Hapus provider selector, tampilkan status Xendit-only, pertahankan method settings.

### Checkout and API routes

- `src/app/(onboarding)/checkout/bpp/page.tsx`
  Hapus Midtrans branding/conditional copy dan tambahkan method validity guard.
- `src/app/(onboarding)/checkout/pro/page.tsx`
  Hapus Midtrans branding/conditional copy dan tambahkan method validity guard.
- `src/app/api/payments/topup/route.ts`
  Tambahkan validasi server-side terhadap `enabledMethods`.
- `src/app/api/payments/subscribe/route.ts`
  Tambahkan validasi server-side terhadap `enabledMethods`.
- `src/app/api/webhooks/payment/route.ts`
  Pastikan asumsi runtime dan logging konsisten dengan Xendit-only runtime.

### Documentation

- `docs/payment-provider/design.md`
  Ubah dari multi-provider selectable design menjadi Xendit-only hardening design.
- `docs/payment-provider/implementation-plan.md`
  Perbarui agar tidak lagi mengklaim Midtrans sebagai supported runtime option.

## Testing And Verification Strategy

Verifikasi perubahan harus mencakup:

### Schema and type verification

- TypeScript compile bersih setelah union/config cleanup
- Convex schema dan generated types tetap konsisten

### Unit-level verification

- factory resolve ke Xendit secara konsisten
- settings query hanya mengembalikan status Xendit
- route menolak method yang disabled

### UI verification

- Admin panel tidak lagi menampilkan Midtrans selector
- Checkout BPP dan Pro hanya menampilkan method yang enabled
- Tidak ada copy yang menyebut Midtrans atau provider switching

### Integration-level verification

- Topup dan subscribe tetap bisa membuat payment via abstraction
- Payment record tersimpan dengan `providerName: "xendit"`
- Generic webhook tetap dapat menemukan payment via `providerPaymentId` dan mengubah status

### Regression scan

- Search codebase untuk `midtrans`
- Search codebase untuk `activeProvider`
- Pastikan tidak ada referensi runtime aktif yang tertinggal

## Out Of Scope

Hal-hal berikut tidak termasuk dalam phase ini:

- implementasi Midtrans adapter
- penyimpanan credential provider di database
- encryption-at-rest untuk payment credentials
- dynamic provider switching dari admin panel
- provider baru selain Xendit
- refactor ulang payment records menjadi Xendit-specific

## Future Re-entry Path

Provider kedua hanya boleh masuk kembali sebagai proyek terpisah jika seluruh jalur produksi sudah complete, minimal meliputi:

- adapter complete
- webhook verification complete
- response normalization complete
- payment method mapping complete
- server-side validation complete
- admin UI baru dibuka setelah seluruh runtime path siap
- design doc dan implementation plan baru disetujui

Prinsip yang dipakai:

> Provider support is earned by complete runtime capability, not by placeholder types or unfinished adapters.

## Acceptance Criteria

- Midtrans tidak lagi muncul di admin UI, config runtime, atau factory path.
- Checkout BPP dan Pro tetap berjalan dengan Xendit.
- Admin tetap dapat mengatur payment methods yang aktif.
- Server route menolak payment method yang disabled.
- Generic payment records tetap dipertahankan.
- Generic webhook tetap memproses event Xendit dengan benar.
- Tidak ada false configurability terkait provider selection.
