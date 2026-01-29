# Specification: BPP Payment Activation

## Goal

Mengaktifkan alur pembayaran tier BPP (Bayar Per Paper) secara end-to-end, dari halaman marketing pricing hingga user menerima saldo credit setelah pembayaran berhasil, dengan real-time status update dan email notifikasi.

## User Stories

- As a free user, I want to upgrade ke BPP dengan memilih nominal dan membayar inline, so that saya bisa mulai menggunakan layanan paper writing dengan saldo prepaid.
- As a BPP user, I want to top up saldo langsung dari halaman plans, so that saya tidak perlu navigasi ke halaman terpisah untuk menambah credit.

## Specific Requirements

**Plans Hub Page (`/subscription/plans`)**
- Halaman baru sebagai single entry point untuk memilih tier subscription
- Menampilkan 3 card: Gratis (current tier indicator), BPP (expandable dengan inline topup), Pro ("Segera Hadir" badge disabled)
- BPP card expand untuk menampilkan topupOptions dari pricingPlans database
- Inline payment flow: pilih nominal -> pilih metode -> bayar, tanpa redirect ke halaman lain
- Fetch semua data dari Convex `pricingPlans.getActivePlans` query
- Responsive design: grid 3 kolom di desktop, carousel swipe di mobile

**Schema Extension: topupOptions**
- Extend `pricingPlans` table dengan field `topupOptions` (optional array)
- Schema: `{ amount: number, tokens: number, label: string, popular: boolean }`
- Data di-seed melalui migration script untuk BPP plan
- Sinkronisasi dengan `TOP_UP_PACKAGES` dari `convex/billing/constants.ts`

**Real-time Payment Status Subscription**
- Buat query baru `watchPaymentStatus` di `convex/billing/payments.ts`
- Menggunakan Convex reactive subscription untuk auto-update UI saat webhook masuk
- Status yang di-handle: PENDING, SUCCEEDED, FAILED, EXPIRED
- UI response: SUCCEEDED -> success state + new balance; FAILED/EXPIRED -> retry button

**User Tier Upgrade Automation**
- Saat `addCredits` berhasil, auto-update `user.subscriptionStatus` dari "free" ke "bpp"
- Logic sudah ada di `convex/billing/credits.ts` line 139-146, pastikan tetap berfungsi
- Initialize `creditBalances` record jika belum ada

**Upgrade Page Redirect**
- Halaman `/subscription/upgrade` redirect ke `/subscription/plans`
- Gunakan Next.js `redirect()` di server component atau `router.replace()` di client
- Maintain backward compatibility untuk existing links/bookmarks

**Marketing Pricing CTA Update**
- Update BPP plan di database: `ctaHref` ke "/subscription/plans", `isDisabled: false`
- Update Pro plan: `ctaText` ke "Segera Hadir", tetap `isDisabled: true`
- BPP jadi `isHighlighted: true` untuk visual emphasis

**Email Templates dengan React Email**
- Install `@react-email/components` dan `react-email` packages
- Buat directory `src/emails/` dengan component-based email templates
- Shared layout component dengan branding Makalah AI (header, footer, colors)

**Payment Success Email**
- Subject: "Pembayaran Berhasil - Makalah AI"
- Content: greeting nama user, detail transaksi, saldo baru, transaction ID
- CTA button: "Mulai Menyusun Paper" -> `/chat`
- Dipanggil dari webhook handler setelah `addCredits` berhasil

**Payment Failed Email**
- Subject: "Pembayaran Gagal - Makalah AI"
- Content: greeting nama user, detail transaksi gagal, alasan kegagalan
- CTA button: "Coba Lagi" -> `/subscription/plans`
- Dipanggil dari webhook handler saat status FAILED

## Visual Design

Tidak ada visual mockup yang disediakan untuk spec ini. UI mengikuti existing design patterns dari:
- `/subscription/overview/page.tsx` - card layout dan tier badge styling
- `/subscription/topup/page.tsx` - payment form dan method selection
- `PricingSection.tsx` - marketing card design dengan highlight

## Existing Code to Leverage

**`/src/app/(dashboard)/subscription/topup/page.tsx`**
- Sudah implementasi complete payment form dengan nominal selection, method selection (QRIS/VA/E-Wallet)
- Gunakan component dan logic untuk inline payment di plans page
- State management pattern: selectedAmount, selectedMethod, paymentResult
- QR code rendering dengan `qrcode.react`, VA number display dengan copy button

**`/src/app/api/payments/topup/route.ts`**
- Complete API endpoint untuk create Xendit payment request
- Support QRIS, VA (BCA/BNI/BRI/Mandiri), E-Wallet (OVO/GoPay)
- Idempotency check, validation, dan error handling sudah robust

**`/src/app/api/webhooks/xendit/route.ts`**
- Webhook handler untuk payment status updates
- `handlePaymentSuccess` sudah call `addCredits` mutation
- TODO comment di line 195-196 untuk email sending - ini yang perlu diimplementasi

**`/convex/billing/credits.ts`**
- `addCredits` mutation sudah handle tier upgrade (free -> bpp)
- `getCreditBalance` untuk display saldo di UI
- Pattern yang sudah proven dan tested

**`/src/components/marketing/PricingSection.tsx`**
- Card component dengan highlight styling
- Mobile carousel implementation
- Pattern untuk fetching dari `pricingPlans.getActivePlans`

## Out of Scope

- Pro subscription flow (recurring payment via Xendit)
- Xendit recurring/subscription API integration
- Downgrade dari Pro ke BPP
- Refund flow dan partial refund
- Payment retry dengan backoff strategy
- Multiple currency support (hanya IDR)
- Invoice PDF generation
- Payment receipt download
- Admin panel untuk manual credit adjustment
- Promo code / discount system
