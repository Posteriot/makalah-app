> **⚠️ DOKUMEN ARSIP — JANGAN GUNAKAN SEBAGAI REFERENSI AKTIF**
>
> Dokumen ini adalah arsip historis dari fase perencanaan awal billing-tier-enforcement.
> Banyak keputusan di dokumen ini yang sudah berubah selama implementasi.
>
> **Referensi aktif:** [`docs/billing-tier-enforcement/README.md`](./README.md)
>
> ---

# Spesifikasi: End-to-End Subscription Tier Enforcement

## 1. Konteks

### 1.1 Kondisi Saat Ini

Sistem billing Makalah App sudah punya fondasi solid:

| Komponen | Status | File |
|----------|--------|------|
| Pre-flight quota check | Berfungsi | `src/lib/billing/enforcement.ts` |
| Post-operation usage recording | Berfungsi | `convex/billing/usage.ts` |
| Credit system BPP | Berfungsi | `convex/billing/credits.ts` |
| Quota system Gratis/Pro | Berfungsi (parsial) | `convex/billing/quotas.ts` |
| Tier limits & pricing | Berfungsi | `convex/billing/constants.ts` |
| Subscription CRUD mutations | Berfungsi | `convex/billing/subscriptions.ts` |
| Payment creation (BPP topup) | Berfungsi | `src/app/api/payments/topup/route.ts` |
| Xendit webhook handler | Berfungsi (parsial) | `src/app/api/webhooks/xendit/route.ts` |
| Plans page UI (BPP checkout) | Berfungsi | `src/app/(dashboard)/subscription/plans/page.tsx` |

### 1.2 Gap yang Teridentifikasi

1. **Type safety hole** -- `"bpp"` tidak ada di `SubscriptionStatus` type (`convex/users.ts:6`), padahal `credits.ts:138` sudah set `subscriptionStatus: "bpp"`.
2. **Multiplier inkonsisten** -- `enforcement.ts:60-65` punya hardcoded multiplier (1.5, 2.5, 2.0, 1.2) yang berbeda dari `constants.ts:204-209` (1.0, 1.5, 2.0, 0.8).
3. **Pro subscription lifecycle TODO** -- Xendit webhook handler (`route.ts:206-209`) masih TODO untuk `subscription_initial` dan `subscription_renewal`.
4. **Monthly quota reset tidak ada** -- User Pro yang renew tetap pakai quota lama karena `initializeQuota` tidak dipanggil saat renewal.
5. **Subscription expiration tidak ada** -- Tidak ada cron job untuk expire subscription yang `cancelAtPeriodEnd === true`.
6. **Pro payment initiation endpoint tidak ada** -- BPP punya `/api/payments/topup`, Pro belum punya endpoint.
7. **Plans page Pro card disabled** -- Menampilkan "Segera Hadir" (`plans/page.tsx:579-586`).
8. **Schema legacy fields** -- `creditBalances` punya optional fields yang seharusnya required dan legacy fields yang deprecated.
9. **Auth missing di subscription mutations** -- `createSubscription`, `renewSubscription`, `markPastDue` tidak punya `requireAuthUserId` (security hole).
10. **Webhook recurring idempotency** -- `handleSubscriptionRenewal` dan `recurring.cycle.failed` tidak punya duplicate protection. Xendit retry bisa reset quota mid-month.
11. **Email template BPP-specific** -- `sendPaymentSuccessEmail` render kredit info, akan tampilkan "-" untuk subscription.
12. **PaymentResultSection BPP-specific** -- Success message dan CTA di Plans page hardcoded untuk kredit, perlu variant untuk Pro.

### 1.3 Tujuan

Setiap tier (Gratis, BPP, Pro) memiliki enforcement yang benar dan berjalan end-to-end:
- Pre-flight check -> AI operation -> Post-operation deduction
- Payment -> Webhook -> Tier activation -> Quota initialization
- Renewal -> Quota reset -> Continued access
- Cancellation -> Period end -> Expiration -> Downgrade

---

## 2. Fase 1: Fix Type Safety & Multiplier Inconsistency

### 2.1 Fix `SubscriptionStatus` Type

**File:** `convex/users.ts:6`

**Sebelum:**
```typescript
export type SubscriptionStatus = "free" | "pro" | "canceled"
```

**Sesudah:**
```typescript
export type SubscriptionStatus = "free" | "bpp" | "pro" | "canceled"
```

**Alasan:** `credits.ts:138` dan `credits.ts:169` sudah set `subscriptionStatus: "bpp"` saat user pertama kali beli kredit. Tanpa "bpp" di type, ini silent type mismatch.

**Impact:** Perubahan ini murni type-level, tidak mengubah behavior. Schema `convex/schema.ts:57` sudah `v.string()` jadi tidak perlu migration.

### 2.2 Reconcile Multiplier Values

**File:** `src/lib/billing/enforcement.ts:60-65`

**Masalah:**

| Operation | `enforcement.ts` (saat ini) | `constants.ts` (source of truth) |
|-----------|---------------------------|--------------------------------|
| chat_message | 1.5 | 1.0 |
| paper_generation | 2.5 | 1.5 |
| web_search | 2.0 | 2.0 |
| refrasa | 1.2 | 0.8 |

**Solusi:** Import `OPERATION_COST_MULTIPLIERS` dari `@convex/billing/constants` (path alias sudah tersedia via tsconfig: `@convex/*` -> `convex/*`).

**Sesudah:**
```typescript
import { OPERATION_COST_MULTIPLIERS } from "@convex/billing/constants"

export function estimateTotalTokens(
  inputText: string,
  operationType: OperationType = "chat_message"
): number {
  const inputTokens = estimateTokens(inputText)
  const multiplier = OPERATION_COST_MULTIPLIERS[operationType] ?? 1.0
  return Math.ceil(inputTokens * (1 + multiplier))
}
```

**Keputusan:** Pakai nilai `constants.ts` karena lebih konservatif dan merupakan single source of truth yang juga digunakan untuk cost tracking.

**BEHAVIORAL CHANGE:** Perubahan multiplier menurunkan estimasi token (chat: 1.5→1.0, paper: 2.5→1.5, refrasa: 1.2→0.8). Pre-flight check jadi lebih permissive, tapi post-operation deduction tetap berdasarkan actual tokens dari AI SDK, jadi billing tetap akurat.

---

## 3. Fase 2: Wire Pro Subscription Lifecycle

### 3.1 Handle `subscription_initial` Payment Success

**File:** `src/app/api/webhooks/xendit/route.ts:206-209`

**Saat ini (TODO):**
```typescript
case "subscription_initial":
case "subscription_renewal":
  // TODO: Activate/renew subscription
  console.log(`[Xendit] Subscription payment - activate/renew`)
  break
```

**Sesudah:**
```typescript
case "subscription_initial": {
  const planType = payment.metadata?.plan_type as "pro_monthly" | "pro_yearly"
  if (!planType) {
    console.error(`[Xendit] Missing plan_type in subscription_initial metadata`)
    break
  }

  // 1. Create subscription record
  await fetchMutation(api.billing.subscriptions.createSubscription, {
    userId: payment.userId as Id<"users">,
    planType,
    internalKey,
  })

  // 2. Initialize Pro quota
  await fetchMutation(api.billing.quotas.initializeQuota, {
    userId: payment.userId as Id<"users">,
    internalKey,
  })

  console.log(`[Xendit] Pro subscription activated for user: ${payment.userId}`)
  break
}
```

**Perubahan yang diperlukan di backend:**
- `createSubscription` (`subscriptions.ts:14`): **PERHATIAN: saat ini TIDAK PUNYA auth sama sekali.** Tambahkan `requireAuthUserId` + `internalKey` conditional bypass agar: (1) callable dari webhook via internalKey, (2) sekaligus menutup security hole auth yang missing.
- `initializeQuota` (`quotas.ts:92`): Sudah punya `requireAuthUserId` di line 97. Tambahkan `internalKey` conditional bypass.
- `renewSubscription` (`subscriptions.ts:104`): **Tidak punya auth.** Tambahkan auth + `internalKey` (sama pattern).
- `markPastDue` (`subscriptions.ts:229`): **Tidak punya auth.** Tambahkan auth + `internalKey` (sama pattern).

### 3.2 Handle `subscription_renewal`

**File:** `src/app/api/webhooks/xendit/route.ts:317-329`

**Saat ini (TODO):**
```typescript
async function handleSubscriptionRenewal(data: XenditPaymentData) {
  // TODO: Reset monthly quota
  console.log(`[Xendit] Subscription renewed for user: ${userId}`)
}
```

**Sesudah:** Implementasi lengkap yang:
1. Cari subscription by metadata `user_id` atau Xendit recurring ID
2. **IDEMPOTENCY GUARD:** Cek `subscription.currentPeriodEnd > Date.now()` — jika ya, renewal sudah diproses, SKIP. Mencegah Xendit retry me-reset quota yang sudah terpakai.
3. Call `renewSubscription` mutation (sudah ada di `subscriptions.ts:104`)
4. Call `initializeQuota` untuk reset quota bulan baru
5. Send confirmation email

### 3.3 Handle `recurring.cycle.failed`

**File:** `src/app/api/webhooks/xendit/route.ts:104-107`

**Saat ini (TODO):**
```typescript
case "recurring.cycle.failed":
  console.log(`[Xendit Webhook] Subscription renewal failed: ${data.id}`)
  // TODO: Handle subscription renewal failure
  break
```

**Sesudah:**
1. Cari subscription by user metadata
2. **IDEMPOTENCY GUARD:** Cek `subscription.status === "past_due"` — jika ya, sudah diproses, SKIP.
3. Call `markPastDue` (sudah ada di `subscriptions.ts:229`)
4. Send warning email ke user

### 3.4 Pro Subscription Payment Initiation Endpoint

**File baru:** `src/app/api/payments/subscribe/route.ts`

Pattern identik dengan `/api/payments/topup/route.ts` (one-time payment via Xendit):

1. Auth check via Clerk
2. Validate `planType` ("pro_monthly" | "pro_yearly") dan `paymentMethod`
3. Check: user belum punya active subscription
4. Generate `referenceId` = `subscription_initial_{userId}_{timestamp}`
5. Create Xendit payment (reuse `createQRISPayment`/`createVAPayment`/etc.)
6. Save ke Convex via `createPayment` dengan `paymentType: "subscription_initial"`
7. Return payment details

**Request body:**
```typescript
{
  planType: "pro_monthly" | "pro_yearly",
  paymentMethod: "qris" | "va" | "ewallet",
  vaChannel?: "BCA_VIRTUAL_ACCOUNT" | "BNI_VIRTUAL_ACCOUNT" | "BRI_VIRTUAL_ACCOUNT" | "MANDIRI_VIRTUAL_ACCOUNT",
  ewalletChannel?: "OVO" | "GOPAY",
  mobileNumber?: string
}
```

**Pricing:** Dari `SUBSCRIPTION_PRICING` di `constants.ts` (pro_monthly: Rp 200.000, pro_yearly: Rp 2.000.000).

**Metadata ke Xendit:**
```typescript
metadata: {
  user_id: convexUser._id,
  payment_type: "subscription_initial",
  plan_type: planType
}
```

**Tambahan fields:** Populate `subscriptionPeriodStart` dan `subscriptionPeriodEnd` di `createPayment` call (schema `payments` sudah punya kedua field ini di schema.ts:739-740). Hitung berdasarkan `SUBSCRIPTION_PRICING[planType].intervalMonths`.

**Catatan:** One-time payment, bukan Xendit Recurring. Auto-renewal via Xendit Recurring Plans di fase terpisah nanti.

### 3.5 Subscription Expiration Cron Job

**File baru:** `convex/crons.ts`

Convex cron job yang check `cancelAtPeriodEnd === true && currentPeriodEnd < now`:
- Schedule: daily
- Query subscriptions with `status === "active"` dan `cancelAtPeriodEnd === true`
- Filter yang `currentPeriodEnd < Date.now()`
- Call `expireSubscription` untuk setiap yang expired

**File baru:** `convex/billing/subscriptionJobs.ts`
- `expirePendingCancellations` -- internal mutation yang dijalankan oleh cron

### 3.6 Enable Pro Card di Plans Page

**File:** `src/app/(dashboard)/subscription/plans/page.tsx:578-586`

**Saat ini:**
```typescript
{isPro && (
  <button disabled className="...cursor-not-allowed">
    {plan.ctaText}
  </button>
)}
```

**Sesudah:**
Copy pattern dari BPP checkout flow (lines 372-576) yang sudah ada di file yang sama:
1. Plan selection: monthly (Rp 200K) / yearly (Rp 2M)
2. Payment method selection: QRIS / VA / E-Wallet
3. POST ke `/api/payments/subscribe`
4. Real-time payment status tracking via `watchPaymentStatus`
5. Success state -> redirect ke `/chat`

**Adaptasi `PaymentResultSection` (lines 636-870):** Komponen ini punya konten BPP-specific (kredit display, "Mulai Menyusun Paper" CTA). Tambahkan prop `variant: "bpp" | "pro"` — untuk Pro, tampilkan "Langganan Pro Aktif! Berlaku sampai {periodEnd}" dan CTA "Mulai Menggunakan Pro".

**Adaptasi email template:** `sendPaymentSuccessEmail` saat ini render kredit info yang undefined untuk subscription → tampilkan "-". Tambahkan `subscriptionPlanLabel` param dan conditional rendering di `PaymentSuccessEmail.tsx`: jika `subscriptionPlanLabel` ada → tampilkan subscription info, jika `credits` ada → tampilkan kredit info.

---

## 4. Fase 3: Verifikasi Quota Enforcement per Tier

### 4.1 Gratis Tier -- Sudah Berfungsi

| Check | Lokasi | Status |
|-------|--------|--------|
| Daily limit | `quotas.ts:350-360` | OK |
| Monthly limit (hard) | `quotas.ts:363-373` | OK |
| Paper limit | `quotas.ts:391-398` | OK |
| Deduction + daily tracking | `quotas.ts:160+` | OK |

### 4.2 BPP Tier -- Sudah Berfungsi

| Check | Lokasi | Status |
|-------|--------|--------|
| Credit balance check | `quotas.ts:312-334` | OK |
| Credit deduction + soft-block | `enforcement.ts:140-163` | OK |
| Paper session credit tracking | `credits.ts:224-239` | OK |

### 4.3 Pro Tier -- Gap yang Perlu Ditutup

| Check | Lokasi | Status |
|-------|--------|--------|
| Overage warning | `quotas.ts:376-387` | OK |
| Overage tracking di deductQuota | `quotas.ts:228-234` | OK -- perlu verifikasi |
| Quota initialization saat subscribe | MISSING | Fix di Fase 2.1 |
| Quota reset saat renewal | MISSING | Fix di Fase 2.2 |

### 4.4 Verifikasi `deductQuota` Overage

**File:** `convex/billing/quotas.ts:228-234`

```typescript
if (quota.tier === "pro" && newUsedTokens > quota.allottedTokens) {
  const newOverage = newUsedTokens - quota.allottedTokens - quota.overageTokens
  if (newOverage > 0) {
    overageTokens += newOverage
    overageCostIDR += newOverage * TIER_LIMITS.pro.overageRatePerToken
  }
}
```

Logika sudah benar. `overageRatePerToken` = 0.00005 (Rp 0.05/1K tokens).

---

## 5. Fase 4: Schema Cleanup

### 5.1 Promote Optional Fields di `creditBalances`

**File:** `convex/schema.ts:664-666`

```
totalCredits: v.optional(v.number())   ->  v.number()
usedCredits: v.optional(v.number())    ->  v.number()
remainingCredits: v.optional(v.number()) -> v.number()
```

**Prasyarat:** Verifikasi di Convex Dashboard bahwa tidak ada record dengan null values. Kalau ada, buat migration script dulu.

### 5.2 Remove Deprecated Constants (DEFER)

**File:** `convex/billing/constants.ts:115-129`

`TOP_UP_PACKAGES` masih dipakai di:
- `convex/pricingPlans.ts:3,59,79`
- `convex/migrations/seedPricingPlans.ts:2,263`

**Jangan hapus sekarang.** Perlu migration `pricingPlans` table dulu.

### 5.3 Remove Legacy `creditBalances` Fields (DEFER)

**File:** `convex/schema.ts:677-683`

Fields `balanceIDR`, `balanceTokens`, `totalTopUpIDR`, `totalSpentIDR`, `lastTopUpAt`, `lastTopUpAmount` sudah deprecated. Cek consumer sebelum hapus.

---

## 6. Tabel File yang Akan Dimodifikasi

| # | File | Scope | Fase |
|---|------|-------|------|
| 1 | `convex/users.ts` | Tambah "bpp" ke SubscriptionStatus type | 1 |
| 2 | `src/lib/billing/enforcement.ts` | Import multipliers dari constants, hapus hardcoded | 1 |
| 3 | `convex/billing/subscriptions.ts` | Tambah `internalKey` support ke `createSubscription` | 2 |
| 4 | `convex/billing/quotas.ts` | Tambah `internalKey` support ke `initializeQuota` | 2 |
| 5 | `src/app/api/webhooks/xendit/route.ts` | Wire subscription_initial, renewal, failure handling | 2 |
| 6 | `src/app/api/payments/subscribe/route.ts` | **File baru:** Pro payment initiation endpoint | 2 |
| 7 | `convex/billing/subscriptionJobs.ts` | **File baru:** Internal mutation untuk cron | 2 |
| 8 | `convex/crons.ts` | **File baru:** Daily subscription expiration cron | 2 |
| 9 | `src/app/(dashboard)/subscription/plans/page.tsx` | Enable Pro card dengan checkout flow + adaptasi PaymentResultSection (tambah prop `variant`) | 2 |
| 10 | `src/lib/email/sendPaymentEmail.ts` | Tambah `subscriptionPlanLabel` param | 2 |
| 11 | `src/lib/email/templates/PaymentSuccessEmail.tsx` | Conditional rendering: kredit info (BPP) vs subscription info (Pro) | 2 |
| 12 | `convex/schema.ts` | Promote optional creditBalances fields | 4 |

---

## 7. Fungsi yang Sudah Ada (REUSE, Jangan Buat Ulang)

| Fungsi | File | Tujuan |
|--------|------|--------|
| `createSubscription` | `convex/billing/subscriptions.ts:14` | Create subscription record + set user to "pro" |
| `renewSubscription` | `convex/billing/subscriptions.ts:104` | Update period dates |
| `markPastDue` | `convex/billing/subscriptions.ts:229` | Set status "past_due" |
| `expireSubscription` | `convex/billing/subscriptions.ts:198` | Set status "expired" + downgrade user |
| `reactivateSubscription` | `convex/billing/subscriptions.ts:247` | Reactivate from past_due |
| `initializeQuota` | `convex/billing/quotas.ts:92` | Create/reset quota for current period |
| `checkQuota` | `convex/billing/quotas.ts:288` | Pre-flight quota check |
| `deductQuota` | `convex/billing/quotas.ts:160` | Post-operation deduction |
| `addCredits` | `convex/billing/credits.ts:97` | Add credits after payment |
| `deductCredits` | `convex/billing/credits.ts:186` | Deduct credits after usage |
| `getEffectiveTier` | `src/lib/utils/subscription.ts` | Determine tier from role + status |
| `OPERATION_COST_MULTIPLIERS` | `convex/billing/constants.ts:204` | Single source of truth for multipliers |
| `SUBSCRIPTION_PRICING` | `convex/billing/constants.ts:175` | Pro pricing constants |
| `createQRISPayment` | `src/lib/xendit/client.ts:84` | Create QRIS payment |
| `createVAPayment` | `src/lib/xendit/client.ts:127` | Create VA payment |
| `createOVOPayment` | `src/lib/xendit/client.ts:173` | Create OVO payment |
| `createGopayPayment` | `src/lib/xendit/client.ts:213` | Create GoPay payment |
| `createPayment` | `convex/billing/payments.ts:20` | Save payment record |
| `checkIdempotency` | `convex/billing/payments.ts:254` | Prevent duplicate payment |
| `watchPaymentStatus` | `convex/billing/payments.ts:274` | Real-time payment status |
| `getActiveSubscription` | `convex/billing/subscriptions.ts:70` | Check existing subscription |
| `sendPaymentSuccessEmail` | `src/lib/email/sendPaymentEmail.ts:63` | Success notification (perlu adaptasi untuk subscription context — lihat 3.1) |
| `sendPaymentFailedEmail` | `src/lib/email/sendPaymentEmail.ts:111` | Failure notification |

---

## 8. Verification Plan

### 8.1 Unit Verification

1. `npm run build` -- Pastikan no TypeScript errors
2. `npm run lint` -- Pastikan no linting issues
3. Grep "TODO" di billing files -- Pastikan TODO utama resolved

### 8.2 Integration Verification per Tier

| # | Skenario | Expected Outcome |
|---|----------|-----------------|
| 1 | **Gratis:** User baru chat sampai daily limit | Return 402, `reason: "daily_limit"` |
| 2 | **Gratis:** User baru chat sampai monthly limit | Return 402, `reason: "monthly_limit"` |
| 3 | **Gratis:** User buat paper ke-3 | Return 402, `reason: "paper_limit"` |
| 4 | **BPP:** Beli credit package -> chat | Credits berkurang di `creditBalances` |
| 5 | **BPP:** Chat sampai kredit habis | Soft-block triggered, `isSoftBlocked = true` |
| 6 | **Pro initiation:** POST `/api/payments/subscribe` | Xendit payment created, payment record in Convex |
| 7 | **Pro activation:** Simulate webhook `payment_request.succeeded` dengan `paymentType: "subscription_initial"` | `createSubscription` called, `user.subscriptionStatus = "pro"`, quota initialized |
| 8 | **Pro renewal:** Simulate webhook `recurring.cycle.succeeded` | Quota reset, period updated |
| 9 | **Pro expiration:** Set `cancelAtPeriodEnd`, trigger cron | User downgrade to "free" |
| 10 | **Plans page:** Navigate ke `/subscription/plans` | Pro card interactive, checkout form works |

### 8.3 Data Verification (Convex Dashboard)

1. `userQuotas` -- Verify quota records exist for active users
2. `creditBalances` -- Verify no null required fields (setelah Fase 4)
3. `subscriptions` -- Verify status transitions correct
4. `usageEvents` -- Verify token recording consistent
5. `payments` -- Verify `subscription_initial` payments recorded with correct metadata

---

## 9. Urutan Eksekusi

```
Fase 1 (Type Safety) ------> Paling aman, tidak ada perubahan behavior
    |
    v
Fase 2 (Pro Lifecycle) ----> Fitur baru, perlu testing
    |
    v
Fase 3 (Verification) -----> Validasi semua tier benar
    |
    v
Fase 4 (Schema Cleanup) ---> Optional, bisa di-defer
```

Fase 1 dan Fase 4 bisa dikerjakan paralel karena independen. Fase 2 harus sequential (backend dulu, lalu webhook, lalu frontend). Fase 3 adalah verifikasi setelah Fase 1-2 selesai.
