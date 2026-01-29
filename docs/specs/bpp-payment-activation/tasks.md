# Tasks: BPP Payment Activation

## Overview

**Goal**: Mengaktifkan alur pembayaran tier BPP (Bayar Per Paper) secara end-to-end, dari halaman plans hub hingga user menerima saldo credit setelah pembayaran berhasil.

**Total Tasks**: 21 tasks dalam 5 phase

---

## Phase 1: Foundation (Schema & Migrations)

**Dependencies**: None

### Task 1.1: Extend pricingPlans schema dengan topupOptions

**File**: `convex/schema.ts`

- [ ] Tambahkan field `topupOptions` ke table `pricingPlans`
- [ ] Schema: `v.optional(v.array(v.object({ amount: v.number(), tokens: v.number(), label: v.string(), popular: v.optional(v.boolean()) })))`
- [ ] Pastikan backward compatible (optional field)

**Acceptance Criteria**:
- Schema valid dan `npx convex dev` sync tanpa error
- Field optional sehingga existing data tidak break

---

### Task 1.2: Buat migration untuk update BPP plan data

**File**: `convex/migrations/activateBPPPayment.ts`

- [ ] Buat migration `activateBPPPayment` untuk update BPP plan:
  - `ctaHref`: `/subscription/plans`
  - `isDisabled`: `false`
  - `isHighlighted`: `true`
  - `topupOptions`: sync dari `TOP_UP_PACKAGES` di `convex/billing/constants.ts`
- [ ] Update Gratis plan: `isHighlighted: false`
- [ ] Update Pro plan: `ctaText: "Segera Hadir"`, tetap `isDisabled: true`
- [ ] Jalankan migration via `npx convex run migrations/activateBPPPayment:activateBPPPayment`

**Acceptance Criteria**:
- BPP plan enabled dengan CTA ke `/subscription/plans`
- BPP highlighted, Gratis tidak highlighted
- topupOptions terisi dengan 3 package (25K, 50K, 100K)

---

### Task 1.3: Verifikasi auto tier upgrade di addCredits

**File**: `convex/billing/credits.ts`

- [ ] Review logic di line 139-146 untuk auto-upgrade dari "free" ke "bpp"
- [ ] Pastikan `subscriptionStatus` di-update dengan benar
- [ ] Tambahkan log untuk debugging jika belum ada
- [ ] Test dengan dummy data bahwa tier upgrade berfungsi

**Acceptance Criteria**:
- User dengan `subscriptionStatus: "free"` otomatis jadi "bpp" setelah `addCredits`
- Tidak ada error saat user sudah "bpp" dan topup lagi

---

## Phase 2: Backend (Queries & Real-time)

**Dependencies**: Phase 1

### Task 2.1: Buat query watchPaymentStatus untuk real-time subscription

**File**: `convex/billing/payments.ts`

- [ ] Tambahkan query `watchPaymentStatus` dengan args `{ paymentId: v.id("payments") }`
- [ ] Return payment status, amount, dan metadata yang relevan
- [ ] Query ini akan di-subscribe oleh frontend untuk real-time update

```typescript
export const watchPaymentStatus = query({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId)
    if (!payment) return null
    return {
      status: payment.status,
      amount: payment.amount,
      paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod,
    }
  },
})
```

**Acceptance Criteria**:
- Query bisa di-subscribe dari frontend
- Return null jika payment tidak ditemukan
- Auto-update saat webhook mengubah status

---

### Task 2.2: Buat query getTopupOptionsForPlan

**File**: `convex/pricingPlans.ts`

- [ ] Tambahkan query `getTopupOptionsForPlan` dengan args `{ slug: v.string() }`
- [ ] Return `topupOptions` array dari plan yang diminta
- [ ] Fallback ke `TOP_UP_PACKAGES` dari constants jika `topupOptions` kosong

**Acceptance Criteria**:
- Return topupOptions dari database
- Graceful fallback ke hardcoded constants
- Type-safe return value

---

### Task 2.3: Update webhook handler untuk email notification hooks

**File**: `src/app/api/webhooks/xendit/route.ts`

- [ ] Tambahkan placeholder function `sendPaymentSuccessEmail` dan `sendPaymentFailedEmail`
- [ ] Call `sendPaymentSuccessEmail` setelah `addCredits` di `handlePaymentSuccess` (line 195-196)
- [ ] Call `sendPaymentFailedEmail` di `handlePaymentFailed`
- [ ] Fungsi cukup console.log dulu, implementasi actual di Phase 4

**Acceptance Criteria**:
- Placeholder functions ready untuk Phase 4
- Tidak break existing webhook flow
- Log dengan informasi yang cukup untuk debugging

---

## Phase 3: Frontend (UI Components)

**Dependencies**: Phase 2

### Task 3.1: Buat halaman Plans Hub di /subscription/plans

**File**: `src/app/(dashboard)/subscription/plans/page.tsx`

- [ ] Buat page baru sebagai client component
- [ ] Fetch plans dari `api.pricingPlans.getActivePlans`
- [ ] Layout: grid 3 kolom di desktop
- [ ] Tampilkan 3 card: Gratis (current tier indicator), BPP (expandable), Pro (disabled badge)
- [ ] Gunakan pattern styling dari existing `/subscription/overview/page.tsx`

**Acceptance Criteria**:
- Halaman accessible di `/subscription/plans`
- 3 card pricing ditampilkan dari database
- Current tier user ditandai dengan badge/indicator

---

### Task 3.2: Implementasi BPP card dengan expandable topup section

**File**: `src/app/(dashboard)/subscription/plans/page.tsx` atau component terpisah

- [ ] BPP card bisa di-expand untuk menampilkan inline topup
- [ ] State management: `isExpanded`, `selectedAmount`, `selectedMethod`
- [ ] Tampilkan topupOptions dari database (query dari Task 2.2)
- [ ] Reuse styling dari `/subscription/topup/page.tsx` untuk nominal dan method selection

**Acceptance Criteria**:
- BPP card expandable dengan smooth animation
- Topup options ditampilkan dalam card yang sama
- Popular option ditandai dengan badge

---

### Task 3.3: Implementasi inline payment flow di BPP card

**File**: `src/app/(dashboard)/subscription/plans/page.tsx`

- [ ] Integrasikan payment flow dari existing topup page
- [ ] Reuse `handleTopUp` logic dan API call ke `/api/payments/topup`
- [ ] Tampilkan payment result (QR/VA) inline di card, bukan di halaman terpisah
- [ ] Subscribe ke `watchPaymentStatus` untuk real-time status update

**Acceptance Criteria**:
- Payment bisa dilakukan tanpa redirect ke halaman lain
- QR code atau VA number ditampilkan dalam expanded card
- Status update real-time (PENDING -> SUCCEEDED -> balance updated)

---

### Task 3.4: Implementasi success state dan balance update

**File**: `src/app/(dashboard)/subscription/plans/page.tsx`

- [ ] Saat payment SUCCEEDED, tampilkan success animation/message
- [ ] Refetch credit balance dan tampilkan saldo baru
- [ ] Offer "Mulai Menyusun Paper" CTA ke `/chat`
- [ ] Auto-collapse card setelah success (dengan delay)

**Acceptance Criteria**:
- Clear success feedback ke user
- Saldo baru ditampilkan dengan update animation
- Smooth transition kembali ke normal state

---

### Task 3.5: Implementasi error/retry state

**File**: `src/app/(dashboard)/subscription/plans/page.tsx`

- [ ] Handle status FAILED dan EXPIRED
- [ ] Tampilkan error message dengan alasan kegagalan
- [ ] Provide "Coba Lagi" button untuk reset dan memulai ulang
- [ ] Log error untuk debugging

**Acceptance Criteria**:
- Error message user-friendly dalam Bahasa Indonesia
- Retry button functional
- State di-reset dengan benar saat retry

---

### Task 3.6: Implementasi responsive design untuk Plans Hub

**File**: `src/app/(dashboard)/subscription/plans/page.tsx`

- [ ] Desktop (1024px+): grid 3 kolom
- [ ] Tablet (768px-1024px): grid 2 kolom atau stack
- [ ] Mobile (< 768px): single column stack atau horizontal scroll carousel
- [ ] Test di berbagai viewport size

**Acceptance Criteria**:
- Layout responsif di semua breakpoint
- Touch-friendly di mobile
- Tidak ada horizontal overflow yang tidak diinginkan

---

### Task 3.7: Redirect /subscription/upgrade ke /subscription/plans

**File**: `src/app/(dashboard)/subscription/upgrade/page.tsx`

- [ ] Ganti konten dengan redirect ke `/subscription/plans`
- [ ] Gunakan Next.js `redirect()` dari `next/navigation` di server component, atau
- [ ] Gunakan `useRouter().replace()` jika tetap client component
- [ ] Maintain backward compatibility untuk existing bookmarks

**Acceptance Criteria**:
- Akses `/subscription/upgrade` redirect ke `/subscription/plans`
- No flash of old content
- Browser history handled correctly (replace, not push)

---

## Phase 4: Email Integration (React Email)

**Dependencies**: Phase 2 (webhook hooks ready)

### Task 4.1: Setup React Email dan struktur folder

**File**: `package.json`, `src/emails/`

- [ ] Install packages: `npm install @react-email/components react-email`
- [ ] Buat folder `src/emails/` untuk email templates
- [ ] Buat `src/emails/components/` untuk shared components

**Acceptance Criteria**:
- Packages installed dan tersedia
- Folder structure siap untuk templates
- No TypeScript errors

---

### Task 4.2: Buat shared email layout component

**File**: `src/emails/components/EmailLayout.tsx`

- [ ] Buat layout component dengan React Email components
- [ ] Include: Header dengan logo/brand Makalah AI
- [ ] Include: Footer dengan copyright dan unsubscribe link
- [ ] Define color scheme yang konsisten dengan app

**Acceptance Criteria**:
- Reusable layout untuk semua email
- Responsive email design (mobile-friendly)
- Consistent branding

---

### Task 4.3: Buat PaymentSuccessEmail template

**File**: `src/emails/PaymentSuccessEmail.tsx`

- [ ] Subject: "Pembayaran Berhasil - Makalah AI"
- [ ] Props: `{ userName, amount, newBalance, transactionId, paidAt }`
- [ ] Content: Greeting, detail transaksi, saldo baru, transaction ID
- [ ] CTA button: "Mulai Menyusun Paper" -> `{APP_URL}/chat`

**Acceptance Criteria**:
- Email renders correctly
- All dynamic data displayed
- CTA button functional

---

### Task 4.4: Buat PaymentFailedEmail template

**File**: `src/emails/PaymentFailedEmail.tsx`

- [ ] Subject: "Pembayaran Gagal - Makalah AI"
- [ ] Props: `{ userName, amount, failureReason, transactionId }`
- [ ] Content: Greeting, detail transaksi gagal, alasan kegagalan
- [ ] CTA button: "Coba Lagi" -> `{APP_URL}/subscription/plans`

**Acceptance Criteria**:
- Email renders correctly
- Failure reason displayed clearly
- CTA button leads to plans page

---

### Task 4.5: Implementasi email sending di webhook handler

**File**: `src/app/api/webhooks/xendit/route.ts`, `src/lib/email/sendPaymentEmail.ts`

- [ ] Buat utility function `sendPaymentSuccessEmail` dan `sendPaymentFailedEmail`
- [ ] Gunakan Resend SDK untuk sending (sudah ada di project)
- [ ] Render React Email template ke HTML
- [ ] Call dari webhook handler (replace placeholder dari Task 2.3)
- [ ] Handle error gracefully (email failure tidak boleh break webhook)

**Acceptance Criteria**:
- Email terkirim saat payment success/failed
- Webhook tetap return 200 meskipun email gagal
- Log email status untuk monitoring

---

## Phase 5: Testing & Verification

**Dependencies**: Phase 1-4

### Task 5.1: Test end-to-end payment flow

- [ ] Test dari Plans Hub -> pilih nominal -> pilih metode -> bayar
- [ ] Verifikasi QR code/VA number ditampilkan
- [ ] Simulate webhook callback (gunakan Xendit dashboard atau ngrok)
- [ ] Verifikasi real-time status update di UI

**Acceptance Criteria**:
- Full flow berfungsi tanpa error
- Real-time update bekerja
- UI state transitions smooth

---

### Task 5.2: Test tier upgrade automation

- [ ] Create user baru dengan tier "free"
- [ ] Complete payment via Plans Hub
- [ ] Verifikasi `subscriptionStatus` berubah ke "bpp"
- [ ] Verifikasi saldo credit ter-update

**Acceptance Criteria**:
- Auto-upgrade berfungsi untuk user baru
- Existing BPP user tetap "bpp" setelah topup

---

### Task 5.3: Test email delivery

- [ ] Trigger successful payment
- [ ] Verifikasi PaymentSuccessEmail terkirim
- [ ] Trigger failed payment (via Xendit test)
- [ ] Verifikasi PaymentFailedEmail terkirim
- [ ] Check email rendering di berbagai email client

**Acceptance Criteria**:
- Email terkirim ke alamat yang benar
- Content sesuai template
- Links functional

---

### Task 5.4: Test responsive design dan edge cases

- [ ] Test Plans Hub di mobile viewport
- [ ] Test saat user sudah punya pending payment
- [ ] Test saat balance sudah tinggi
- [ ] Test dengan slow network (throttling)

**Acceptance Criteria**:
- Responsive di semua viewport
- Edge cases handled gracefully
- Loading states appropriate

---

## Execution Order

**Recommended sequence:**

1. **Phase 1**: Foundation (Tasks 1.1 -> 1.2 -> 1.3)
2. **Phase 2**: Backend (Tasks 2.1, 2.2 parallel -> 2.3)
3. **Phase 3**: Frontend (Tasks 3.1 -> 3.2 -> 3.3 -> 3.4 -> 3.5 -> 3.6 -> 3.7)
4. **Phase 4**: Email (Tasks 4.1 -> 4.2 -> 4.3, 4.4 parallel -> 4.5)
5. **Phase 5**: Testing (Tasks 5.1 -> 5.2 -> 5.3 -> 5.4)

**Parallelization opportunities:**
- Task 2.1 dan 2.2 bisa parallel
- Task 4.3 dan 4.4 bisa parallel
- Phase 4 bisa dimulai setelah Phase 2 selesai, parallel dengan Phase 3

---

## Reference Files

**Existing code to leverage:**
- `/src/app/(dashboard)/subscription/topup/page.tsx` - Payment form patterns
- `/src/app/api/payments/topup/route.ts` - Xendit API integration
- `/convex/billing/credits.ts` - Credit management
- `/convex/billing/constants.ts` - TOP_UP_PACKAGES source of truth
- `/src/components/marketing/PricingSection.tsx` - Card styling patterns

**Documentation:**
- Spec: `.development/specs/bpp-payment-activation/spec.md`
