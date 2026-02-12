# Task Breakdown: End-to-End Subscription Tier Enforcement

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

## Overview
Total Tasks: 51
Fases: 4
Estimated Files Modified: 10 (termasuk 3 file baru)

---

## Task List

### Fase 1: Fix Type Safety & Multiplier Inconsistency

#### Task Group 1: Type Safety Fixes
**Dependencies:** Tidak ada

- [ ] 1.0 Selesaikan type safety fixes
  - [x] 1.1 Tulis 3 focused tests untuk type safety
    - Test 1: `getEffectiveTier("user", "bpp")` returns `"bpp"`
    - Test 2: `estimateTotalTokens("test", "chat_message")` menggunakan multiplier 1.0 (bukan 1.5)
    - Test 3: `estimateTotalTokens("test", "paper_generation")` menggunakan multiplier 1.5 (bukan 2.5)
    - File test: `__tests__/billing-type-safety.test.ts`
  - [ ] 1.2 Tambahkan `"bpp"` ke `SubscriptionStatus` type
    - **File:** `convex/users.ts:6`
    - **Sebelum:** `export type SubscriptionStatus = "free" | "pro" | "canceled"`
    - **Sesudah:** `export type SubscriptionStatus = "free" | "bpp" | "pro" | "canceled"`
    - Tidak perlu migration karena schema pakai `v.string()`
  - [ ] 1.3 Import multipliers dari constants, hapus hardcoded values
    - **File:** `src/lib/billing/enforcement.ts:60-65`
    - Tambahkan import: `import { OPERATION_COST_MULTIPLIERS } from "@convex/billing/constants"`
    - Ganti `outputMultipliers` object dengan `OPERATION_COST_MULTIPLIERS`
    - Hapus lines 60-65 (hardcoded multiplier object)
    - Ubah logika di `estimateTotalTokens()`:
      ```typescript
      const multiplier = OPERATION_COST_MULTIPLIERS[operationType] ?? 1.0
      return Math.ceil(inputTokens * (1 + multiplier))
      ```
    - NOTE: Mapping key sudah sama (`chat_message`, `paper_generation`, `web_search`, `refrasa`)
    - **BEHAVIORAL CHANGE:** Estimasi token akan TURUN (chat: 1.5→1.0, paper: 2.5→1.5, refrasa: 1.2→0.8). Ini membuat pre-flight check lebih permissive. Post-operation deduction tetap berdasarkan actual tokens dari AI SDK, jadi billing tetap akurat. Perubahan ini intentional karena `constants.ts` adalah single source of truth.
  - [ ] 1.4 Verifikasi `getEffectiveTier` sudah handle "bpp"
    - **File:** `src/lib/utils/subscription.ts:17`
    - Sudah ada: `if (subscriptionStatus === "bpp") return "bpp"` -- hanya verifikasi
  - [ ] 1.5 Jalankan tests dari 1.1
    - `npx vitest run __tests__/billing-type-safety.test.ts`
    - Pastikan semua 3 tests pass
    - Jalankan `npm run build` untuk verify no TS errors

**Acceptance Criteria:**
- 3 tests pass
- `npm run build` sukses tanpa error
- Tidak ada duplikat multiplier values di codebase

---

### Fase 2: Wire Pro Subscription Lifecycle

#### Task Group 2: Backend Mutations -- InternalKey Support
**Dependencies:** Task Group 1

- [ ] 2.0 Selesaikan internalKey support untuk backend mutations
  - [ ] 2.1 Tulis 6 focused tests untuk internalKey auth bypass
    - Test 1: `createSubscription` dengan internalKey valid berhasil tanpa JWT
    - Test 2: `createSubscription` tanpa internalKey dan tanpa JWT gagal (Unauthorized)
    - Test 3: `initializeQuota` dengan internalKey valid berhasil
    - Test 4: `initializeQuota` tanpa internalKey dan tanpa JWT gagal
    - Test 5: `renewSubscription` dengan internalKey valid berhasil tanpa JWT
    - Test 6: `markPastDue` dengan internalKey valid berhasil tanpa JWT
    - File test: `__tests__/billing-internal-key.test.ts`
    - NOTE: Gunakan pattern dari `credits.ts:13-16` (`isInternalKeyValid`) sebagai referensi
  - [ ] 2.2 TAMBAHKAN auth + `internalKey` ke `createSubscription`
    - **File:** `convex/billing/subscriptions.ts:14-64`
    - **PERHATIAN:** Fungsi ini saat ini TIDAK PUNYA auth check sama sekali (zero `requireAuthUserId`). Bukan "make conditional" — ini MENAMBAHKAN auth baru.
    - Tambahkan `isInternalKeyValid` helper di top file (copy dari `credits.ts:13-16`)
    - Tambahkan `internalKey: v.optional(v.string())` ke args (line ~21)
    - Di handler (line ~24), TAMBAHKAN auth guard baru:
      ```typescript
      if (!isInternalKeyValid(args.internalKey)) {
        await requireAuthUserId(ctx, args.userId)
      }
      ```
    - Import `requireAuthUserId` dari `../auth`
    - Ini juga menutup security hole: sebelumnya siapapun bisa panggil mutation ini tanpa auth
  - [ ] 2.3 Tambahkan `internalKey` support ke `initializeQuota`
    - **File:** `convex/billing/quotas.ts:92-153`
    - Tambahkan `isInternalKeyValid` helper di top file (copy dari `credits.ts:13-16`)
    - Tambahkan `internalKey: v.optional(v.string())` ke args (line ~94)
    - Di handler, tambahkan conditional auth:
      ```typescript
      if (!isInternalKeyValid(args.internalKey)) {
        await requireAuthUserId(ctx, args.userId)
      }
      ```
    - Ganti `await requireAuthUserId(ctx, args.userId)` yang sudah ada (line 97) dengan conditional
  - [ ] 2.4 Tambahkan auth + `internalKey` ke `renewSubscription`
    - **File:** `convex/billing/subscriptions.ts:104-135`
    - **PERHATIAN:** Saat ini TIDAK PUNYA auth check (sama seperti `createSubscription`).
    - Tambahkan `internalKey: v.optional(v.string())` ke args
    - Tambahkan conditional auth guard (sama pattern dengan Task 2.2)
  - [ ] 2.5 Tambahkan auth + `internalKey` ke `markPastDue`
    - **File:** `convex/billing/subscriptions.ts:229-241`
    - **PERHATIAN:** Saat ini TIDAK PUNYA auth check.
    - Tambahkan `internalKey: v.optional(v.string())` ke args
    - Tambahkan conditional auth guard (sama pattern dengan Task 2.2)
  - [ ] 2.6 Jalankan tests dari 2.1
    - `npx vitest run __tests__/billing-internal-key.test.ts`
    - Pastikan 6 tests pass

**Acceptance Criteria:**
- 6 tests pass
- `createSubscription`, `renewSubscription`, `markPastDue` bisa dipanggil dari webhook (tanpa JWT, pakai internalKey)
- `initializeQuota` bisa dipanggil dari webhook
- Semua 4 mutations juga memblokir panggilan tanpa auth DAN tanpa internalKey (security fix)
- Behavior existing (dengan JWT) tidak berubah

---

#### Task Group 3: Xendit Webhook -- Subscription Lifecycle Wiring
**Dependencies:** Task Group 2

- [ ] 3.0 Selesaikan webhook wiring untuk Pro subscription
  - [ ] 3.1 Tulis 4 focused tests untuk webhook handler logic
    - Test 1: `handlePaymentSuccess` dengan `paymentType: "subscription_initial"` memanggil `createSubscription` + `initializeQuota`
    - Test 2: `handlePaymentSuccess` dengan `paymentType: "subscription_initial"` tanpa `plan_type` di metadata skip tanpa error
    - Test 3: `handleSubscriptionRenewal` memanggil `renewSubscription` + `initializeQuota`
    - Test 4: `handleSubscriptionRenewalFailed` memanggil `markPastDue`
    - File test: `__tests__/billing-webhook-subscription.test.ts`
    - NOTE: Mock `fetchMutation`/`fetchQuery` calls
  - [ ] 3.2 Wire `subscription_initial` handler di webhook
    - **File:** `src/app/api/webhooks/xendit/route.ts:206-209`
    - Replace TODO di `case "subscription_initial":` dengan:
      1. Extract `plan_type` dari `payment.metadata`
      2. Validate `plan_type` is `"pro_monthly"` atau `"pro_yearly"`
      3. Call `fetchMutation(api.billing.subscriptions.createSubscription, {..., internalKey})`
      4. Call `fetchMutation(api.billing.quotas.initializeQuota, {..., internalKey})`
      5. Log success
      6. Send email: gunakan `sendPaymentSuccessEmail` tapi TANPA `credits`/`newTotalCredits` params (biarkan undefined). **Atau** jika email template sudah di-adapt (lihat Task 3.6), pass `subscriptionPlanType` param.
    - Tambahkan `plan_type` ke `XenditPaymentData.metadata` interface (line ~43):
      ```typescript
      metadata?: {
        user_id?: string
        payment_type?: string
        plan_type?: string  // <-- tambahkan
        session_id?: string
      }
      ```
  - [ ] 3.6 Adaptasi email template untuk subscription context
    - **File:** `src/lib/email/templates/PaymentSuccessEmail.tsx`
    - **Masalah:** Template saat ini render kredit-specific info. Params `credits` dan `newTotalCredits` akan `undefined` untuk subscription → tampilkan "-" yang confusing.
    - **Solusi:** Tambahkan conditional rendering:
      1. Tambahkan optional prop `subscriptionPlanLabel?: string` ke interface
      2. Jika `subscriptionPlanLabel` ada → tampilkan "Langganan {planLabel} Aktif" (bukan kredit info)
      3. Jika `credits` ada → tampilkan kredit info seperti sekarang (backward compatible)
    - **File:** `src/lib/email/sendPaymentEmail.ts:18-27`
      - Tambahkan `subscriptionPlanLabel?: string` ke `PaymentSuccessParams` interface
      - Pass ke template component
  - [ ] 3.3 Wire `subscription_renewal` handler di webhook
    - **File:** `src/app/api/webhooks/xendit/route.ts:317-329`
    - Replace fungsi `handleSubscriptionRenewal`:
      1. Get `user_id` dari `data.metadata`
      2. Cari subscription via `fetchQuery(api.billing.subscriptions.getActiveSubscription, { userId })`
      3. **IDEMPOTENCY GUARD:** Cek apakah `subscription.currentPeriodEnd > Date.now()` — jika ya, renewal sudah diproses sebelumnya, SKIP (return early). Ini mencegah Xendit retry webhook me-reset quota user yang sudah terpakai di tengah bulan.
      4. Kalau belum diproses: call `fetchMutation(api.billing.subscriptions.renewSubscription, { subscriptionId, internalKey })`
      5. Call `fetchMutation(api.billing.quotas.initializeQuota, { userId, internalKey })`
      6. Send renewal confirmation email
    - **Dependency:** `renewSubscription` perlu tambah auth + `internalKey` arg (saat ini TIDAK PUNYA auth, sama seperti `createSubscription`)
    - **File:** `convex/billing/subscriptions.ts:104-135` -- tambahkan `isInternalKeyValid` + `requireAuthUserId` conditional
  - [ ] 3.4 Wire `recurring.cycle.failed` handler di webhook
    - **File:** `src/app/api/webhooks/xendit/route.ts:104-107`
    - Replace TODO di `case "recurring.cycle.failed":` dengan:
      1. Get `user_id` dari `data.metadata`
      2. Cari subscription via `getActiveSubscription`
      3. **IDEMPOTENCY GUARD:** Cek apakah `subscription.status === "past_due"` — jika ya, sudah diproses, SKIP.
      4. Call `fetchMutation(api.billing.subscriptions.markPastDue, { subscriptionId, internalKey })`
      5. Send warning email ke user (reuse `sendPaymentFailedEmail` pattern)
    - **Dependency:** `markPastDue` perlu tambah auth + `internalKey` arg (saat ini TIDAK PUNYA auth)
    - **File:** `convex/billing/subscriptions.ts:229-241` -- tambahkan `isInternalKeyValid` + `requireAuthUserId` conditional
  - [ ] 3.5 Jalankan tests dari 3.1
    - `npx vitest run __tests__/billing-webhook-subscription.test.ts`
    - Pastikan 4 tests pass

**Acceptance Criteria:**
- 4 tests pass
- `subscription_initial` payment success -> subscription created + quota initialized
- `recurring.cycle.succeeded` -> subscription renewed + quota reset
- `recurring.cycle.failed` -> subscription marked past_due + email sent
- Semua TODO di `route.ts` untuk subscription resolved (grep verify)

---

#### Task Group 4: Pro Payment Initiation Endpoint
**Dependencies:** Task Group 2

- [ ] 4.0 Selesaikan Pro subscription payment endpoint
  - [ ] 4.1 Tulis 5 focused tests untuk subscribe endpoint
    - Test 1: POST tanpa auth -> 401
    - Test 2: POST dengan `planType: "pro_monthly"` dan `paymentMethod: "qris"` -> 200 + payment data
    - Test 3: POST user yang sudah punya active subscription -> 409 (conflict)
    - Test 4: POST dengan `planType` invalid -> 400
    - Test 5: POST dengan `paymentMethod: "va"` tanpa `vaChannel` -> 400
    - File test: `__tests__/billing-subscribe-endpoint.test.ts`
    - NOTE: Mock Xendit client dan Convex calls
  - [ ] 4.2 Buat file `src/app/api/payments/subscribe/route.ts`
    - **Pattern:** Copy dari `src/app/api/payments/topup/route.ts` (309 lines)
    - **Perubahan dari topup:**
      - Request body: `planType` + `paymentMethod` (bukan `packageType`)
      - Pricing: dari `SUBSCRIPTION_PRICING` (bukan `CREDIT_PACKAGES`)
      - Reference ID: `subscription_initial_{userId}_{timestamp}`
      - Payment type: `"subscription_initial"` (bukan `"credit_topup"`)
      - Metadata: tambah `plan_type`
      - Tambahan check: user belum punya active subscription
      - **Populate `subscriptionPeriodStart` dan `subscriptionPeriodEnd`** di `createPayment` call. Schema `payments` sudah punya kedua field ini (schema.ts:739-740). Hitung: `periodStart = Date.now()`, `periodEnd = periodStart + (intervalMonths * 30 * 24 * 60 * 60 * 1000)` dimana `intervalMonths` dari `SUBSCRIPTION_PRICING[planType].intervalMonths`.
    - Import `SUBSCRIPTION_PRICING` dari `@convex/billing/constants`
    - Import `getActiveSubscription` check via `fetchQuery(api.billing.subscriptions.getActiveSubscription, ...)`
    - Response format: sama dengan topup (paymentId, xenditId, status, amount, qrString, vaNumber, redirectUrl)
  - [ ] 4.3 Jalankan tests dari 4.1
    - `npx vitest run __tests__/billing-subscribe-endpoint.test.ts`
    - Pastikan 5 tests pass

**Acceptance Criteria:**
- 5 tests pass
- Endpoint berfungsi untuk QRIS, VA, dan E-Wallet
- User dengan active subscription tidak bisa subscribe lagi
- Payment record tersimpan di Convex dengan `paymentType: "subscription_initial"`
- Metadata mengandung `plan_type`

---

#### Task Group 5: Subscription Expiration Cron Job
**Dependencies:** Task Group 2

- [ ] 5.0 Selesaikan subscription expiration cron
  - [ ] 5.1 Tulis 3 focused tests untuk expiration logic
    - Test 1: Subscription dengan `cancelAtPeriodEnd === true` dan `currentPeriodEnd < now` -> expired
    - Test 2: Subscription dengan `cancelAtPeriodEnd === true` dan `currentPeriodEnd > now` -> tetap active
    - Test 3: Subscription dengan `cancelAtPeriodEnd === false/undefined` -> tidak terpengaruh
    - File test: `__tests__/billing-subscription-expiration.test.ts`
  - [ ] 5.2 Buat internal mutation `expirePendingCancellations`
    - **File baru:** `convex/billing/subscriptionJobs.ts`
    - Tipe: `internalMutation` (tidak perlu auth, hanya dipanggil dari cron)
    - Logic:
      1. Query semua subscriptions dengan `status === "active"` dan `cancelAtPeriodEnd === true`
      2. Filter yang `currentPeriodEnd < Date.now()`
      3. Untuk setiap subscription, call `expireSubscription` logic (inline, bukan call mutation)
      4. Log berapa subscription yang expired
    - Import: `import { internalMutation } from "../_generated/server"`
  - [ ] 5.3 Buat cron job schedule
    - **File baru:** `convex/crons.ts`
    - Content:
      ```typescript
      import { cronJobs } from "convex/server"
      import { internal } from "./_generated/api"

      const crons = cronJobs()

      crons.daily(
        "expire pending subscription cancellations",
        { hourUTC: 17, minuteUTC: 0 }, // 00:00 WIB = 17:00 UTC
        internal.billing.subscriptionJobs.expirePendingCancellations
      )

      export default crons
      ```
  - [ ] 5.4 Jalankan tests dari 5.1
    - `npx vitest run __tests__/billing-subscription-expiration.test.ts`
    - Pastikan 3 tests pass

**Acceptance Criteria:**
- 3 tests pass
- Cron job terdaftar dan bisa di-verify di Convex Dashboard
- Subscriptions yang `cancelAtPeriodEnd && periodEnd < now` di-expire
- User ter-downgrade ke "free" setelah expiration
- Active subscriptions tidak terpengaruh

---

#### Task Group 6: Plans Page -- Pro Card UI
**Dependencies:** Task Group 4

- [ ] 6.0 Selesaikan Pro card UI di Plans page
  - [ ] 6.1 Tulis 4 focused tests untuk Pro card interaction
    - Test 1: Pro card renders plan selection (monthly/yearly) saat di-click
    - Test 2: Plan selection menampilkan harga yang benar (Rp 200.000 / Rp 2.000.000)
    - Test 3: Payment method selector renders (QRIS, VA, E-Wallet)
    - Test 4: Submit button POST ke `/api/payments/subscribe` dengan payload benar
    - File test: `__tests__/billing-pro-card-ui.test.tsx`
    - NOTE: Mock fetch dan Convex queries
  - [ ] 6.2 Tambahkan Pro checkout state management
    - **File:** `src/app/(dashboard)/subscription/plans/page.tsx`
    - Tambahkan state baru di komponen `PlansHubPage()`:
      ```typescript
      const [isProExpanded, setIsProExpanded] = useState(false)
      const [selectedProPlan, setSelectedProPlan] = useState<"pro_monthly" | "pro_yearly">("pro_monthly")
      const [proPaymentResult, setProPaymentResult] = useState<PaymentResult | null>(null)
      const [isProProcessing, setIsProProcessing] = useState(false)
      const [proError, setProError] = useState<string | null>(null)
      ```
    - Tambahkan `proPaymentStatus` query (copy pattern dari BPP `paymentStatus`)
    - Tambahkan handler `handleProSubscribe` (copy pattern dari `handleTopUp`, ganti endpoint ke `/api/payments/subscribe`)
  - [ ] 6.3 Replace Pro card disabled button dengan expandable checkout
    - **File:** `src/app/(dashboard)/subscription/plans/page.tsx:578-586`
    - Replace blok `{isPro && (...)}` dengan expandable checkout:
      1. Toggle button (copy pattern dari BPP button di line 374-389)
      2. Plan selection: 2 radio buttons (monthly Rp 200K / yearly Rp 2M)
      3. Payment method selection (reuse `PAYMENT_METHODS`, `VA_CHANNELS`, `EWALLET_CHANNELS` constants)
      4. Pay button
    - Jika user sudah Pro (`isCurrentTier && isPro`): tampilkan "Tier aktif Anda" (sama pattern dengan Gratis)
  - [ ] 6.4 Adaptasi `PaymentResultSection` untuk Pro
    - **PERHATIAN:** Komponen `PaymentResultSection` (line 636-870) saat ini punya konten BPP-specific:
      - Success message: "+{purchasedCredits} kredit → Total: {currentCredits + purchasedCredits} kredit"
      - CTA button: "Mulai Menyusun Paper" → link ke `/chat`
      - Credit balance display
    - **Solusi:** Tambahkan prop `variant: "bpp" | "pro"` ke komponen:
      - `variant="bpp"` (default): Tampilkan kredit info seperti sekarang
      - `variant="pro"`: Tampilkan "Langganan Pro Aktif! Berlaku sampai {periodEnd}" dan CTA "Mulai Menggunakan Pro" → link ke `/chat`
    - Pass `proPaymentResult`, `proPaymentStatus`, dan `variant="pro"` untuk Pro card
    - Pastikan QR/VA/E-Wallet display tetap sama (hanya success message yang berbeda)
  - [ ] 6.5 Update info section di bottom page
    - **File:** `src/app/(dashboard)/subscription/plans/page.tsx:596-610`
    - Hapus "(segera hadir)" dari Pro description
    - Update text: "Rp 200.000/bulan untuk menyusun 5-6 paper"
  - [ ] 6.6 Jalankan tests dari 6.1
    - `npx vitest run __tests__/billing-pro-card-ui.test.tsx`
    - Pastikan 4 tests pass

**Acceptance Criteria:**
- 4 tests pass
- Pro card expand/collapse berfungsi
- Plan selection (monthly/yearly) menampilkan harga benar
- Payment method selection berfungsi (QRIS, VA, E-Wallet)
- Checkout flow mengarah ke `/api/payments/subscribe`
- Real-time payment status tracking berfungsi
- User yang sudah Pro melihat "Tier aktif Anda"

---

### Fase 3: Verifikasi Quota Enforcement per Tier

#### Task Group 7: End-to-End Verification
**Dependencies:** Task Group 1-6

- [ ] 7.0 Verifikasi semua tier enforcement bekerja
  - [ ] 7.1 Build verification
    - `npm run build` -- pastikan no TypeScript errors
    - `npm run lint` -- pastikan no linting issues
  - [ ] 7.2 Grep TODO verification di billing files
    - ```bash
      grep -rn "TODO" src/app/api/webhooks/xendit/ convex/billing/ src/lib/billing/
      ```
    - Pastikan semua TODO utama terkait subscription lifecycle sudah resolved
    - TODO minor (paper_completion unlock, dll) boleh tetap ada
  - [ ] 7.3 Verifikasi Gratis tier enforcement (manual test)
    - Buat user baru (atau user dengan `subscriptionStatus: "free"`)
    - Chat sampai daily limit -> verify blocked (402, `reason: "daily_limit"`)
    - Verify `userQuotas` record di Convex Dashboard
  - [ ] 7.4 Verifikasi BPP tier enforcement (manual test)
    - User beli credit package (via Plans page)
    - Chat -> verify kredit berkurang di `creditBalances`
    - Verify soft-block saat kredit habis
  - [ ] 7.5 Verifikasi Pro payment initiation (manual test)
    - Navigate ke `/subscription/plans`
    - Expand Pro card, pilih plan + payment method
    - Submit -> verify Xendit payment created
    - Verify `payments` record di Convex Dashboard dengan `paymentType: "subscription_initial"`
  - [ ] 7.6 Verifikasi Pro activation via webhook (manual test / Convex Dashboard)
    - Simulate payment success (atau gunakan Xendit test mode)
    - Verify `subscriptions` record created dengan `status: "active"`
    - Verify `user.subscriptionStatus` berubah ke `"pro"`
    - Verify `userQuotas` record initialized dengan Pro limits (5M tokens/bulan)
  - [ ] 7.7 Verifikasi subscription expiration (Convex Dashboard)
    - Verify cron job terdaftar di Convex Dashboard -> Scheduled Jobs
    - Test manual: set `cancelAtPeriodEnd: true` dan `currentPeriodEnd` ke masa lalu
    - Trigger cron -> verify subscription `status: "expired"` dan user downgrade ke "free"

**Acceptance Criteria:**
- `npm run build` dan `npm run lint` pass
- Semua TODO utama resolved
- Gratis tier: daily limit, monthly limit, dan paper limit berfungsi
- BPP tier: credit check, deduction, dan soft-block berfungsi
- Pro tier: payment initiation, activation, dan quota initialization berfungsi
- Subscription expiration berfungsi via cron

---

### Fase 4: Schema Cleanup (Optional, Low Priority)

#### Task Group 8: Schema Cleanup
**Dependencies:** Task Group 7

- [ ] 8.0 Selesaikan schema cleanup
  - [ ] 8.1 Verifikasi data di `creditBalances` table
    - Di Convex Dashboard, query: apakah ada record dengan `totalCredits === null` atau `usedCredits === null` atau `remainingCredits === null`?
    - Kalau ada: buat migration script (Task 8.2), kalau tidak ada: langsung ke 8.3
  - [ ] 8.2 (Conditional) Buat migration script untuk backfill null values
    - **File baru:** `convex/migrations/backfillCreditBalances.ts`
    - Set semua null `totalCredits`/`usedCredits`/`remainingCredits` ke `0`
    - Jalankan: `npm run convex -- run migrations/backfillCreditBalances`
    - Verify di Dashboard: tidak ada lagi null values
  - [ ] 8.3 Promote optional fields ke required
    - **File:** `convex/schema.ts:664-666`
    - **Sebelum:**
      ```
      totalCredits: v.optional(v.number()),
      usedCredits: v.optional(v.number()),
      remainingCredits: v.optional(v.number()),
      ```
    - **Sesudah:**
      ```
      totalCredits: v.number(),
      usedCredits: v.number(),
      remainingCredits: v.number(),
      ```
    - Jalankan `npx convex dev` dan verify schema push berhasil
  - [ ] 8.4 Hapus `?? 0` safety checks yang tidak lagi diperlukan
    - **File:** `convex/billing/credits.ts`
    - Lines yang pakai `balance.totalCredits ?? 0`, `balance.usedCredits ?? 0`, `balance.remainingCredits ?? 0`
    - Cari dan hapus `?? 0` karena fields sekarang required
    - Affected lines: ~151, 152, 157, 177, 206, 213, 219
  - [ ] 8.5 Verify build setelah schema cleanup
    - `npm run build`
    - `npx convex dev` (pastikan schema push clean)

**Acceptance Criteria:**
- Tidak ada null values di `creditBalances` table
- Schema push berhasil tanpa error
- `npm run build` pass
- No runtime errors di credit operations

---

## Execution Order

```
Fase 1: Type Safety (Task Group 1)
  |
  v
Fase 2: Pro Lifecycle
  |--- Task Group 2: Backend InternalKey Support
  |       |
  |       v
  |--- Task Group 3: Webhook Wiring ----+
  |--- Task Group 4: Subscribe Endpoint |--- (paralel, keduanya depend on TG2)
  |--- Task Group 5: Cron Job ----------+
  |       |
  |       v
  |--- Task Group 6: Plans Page UI (depends on TG4)
  |
  v
Fase 3: Verification (Task Group 7)
  |
  v
Fase 4: Schema Cleanup (Task Group 8, optional)
```

**Parallelism opportunities:**
- Task Group 3, 4, dan 5 bisa dikerjakan paralel (semua depend on TG2, tapi independen satu sama lain)
- Fase 4 bisa dikerjakan kapan saja setelah Fase 1 (independen dari Fase 2-3)

---

## Test Summary

| Task Group | Test Count | File |
|-----------|-----------|------|
| TG1: Type Safety | 3 | `__tests__/billing-type-safety.test.ts` |
| TG2: InternalKey | 6 | `__tests__/billing-internal-key.test.ts` |
| TG3: Webhook | 4 | `__tests__/billing-webhook-subscription.test.ts` |
| TG4: Subscribe Endpoint | 5 | `__tests__/billing-subscribe-endpoint.test.ts` |
| TG5: Expiration | 3 | `__tests__/billing-subscription-expiration.test.ts` |
| TG6: Pro Card UI | 4 | `__tests__/billing-pro-card-ui.test.tsx` |
| **Total** | **25** | |

Gap analysis di Fase 3 (TG7) dilakukan via manual testing + build verification, bukan automated tests tambahan. Ini memadai karena 25 automated tests sudah cover semua critical paths.
