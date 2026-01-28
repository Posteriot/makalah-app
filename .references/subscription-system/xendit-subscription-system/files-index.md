# Xendit Payment System - Files Index

Index lengkap semua file yang terlibat dalam sistem pembayaran Xendit.

> **Last Updated:** 2026-01-26

---

## 1. Xendit API Client

| File | Deskripsi |
|------|-----------|
| `src/lib/xendit/client.ts` | Xendit API client library |

### Functions di `client.ts`:

| Function | Purpose |
|----------|---------|
| `createQRISPayment()` | Buat payment request QRIS |
| `createVAPayment()` | Buat payment request Virtual Account |
| `createOVOPayment()` | Buat payment request OVO (E-Wallet) |
| `createGopayPayment()` | Buat payment request GoPay (E-Wallet) |
| `getPaymentStatus()` | Query status payment ke Xendit API |
| `verifyWebhookToken()` | Verifikasi x-callback-token dari webhook |
| `handleXenditError()` | Error handler dengan user-friendly messages |

### Types di `client.ts`:

| Type | Purpose |
|------|---------|
| `XenditPaymentMethod` | `"QRIS" \| "VIRTUAL_ACCOUNT" \| "EWALLET"` |
| `EWalletChannel` | `"OVO" \| "GOPAY"` |
| `VAChannel` | BCA, BNI, BRI, Mandiri, Permata, CIMB |
| `XenditPaymentResponse` | Response dari Xendit API v2024-11-11 |
| `XenditError` | Error response dari Xendit |

---

## 2. API Routes

| File | Method | Endpoint | Deskripsi |
|------|--------|----------|-----------|
| `src/app/api/payments/topup/route.ts` | POST | `/api/payments/topup` | Create top-up payment |
| `src/app/api/webhooks/xendit/route.ts` | POST | `/api/webhooks/xendit` | Xendit webhook handler |

### `/api/payments/topup` Request Body:

```typescript
interface TopUpRequest {
  amount: number               // 25000 | 50000 | 100000
  paymentMethod: "qris" | "va" | "ewallet"
  vaChannel?: VAChannel        // Required if paymentMethod === "va"
  ewalletChannel?: EWalletChannel // Required if paymentMethod === "ewallet"
  mobileNumber?: string        // Required if ewalletChannel === "OVO"
}
```

### `/api/payments/topup` Response:

```typescript
interface PaymentResult {
  paymentId: string       // Convex payment ID
  xenditId: string        // Xendit payment request ID
  status: string          // REQUIRES_ACTION | ACCEPTING_PAYMENTS
  amount: number          // Amount in IDR
  expiresAt: number       // Timestamp
  // QRIS specific
  qrString?: string       // QR code string (untuk QRCodeSVG)
  // VA specific
  vaNumber?: string       // Virtual Account number
  vaChannel?: string      // Bank code
  // E-Wallet specific
  redirectUrl?: string    // Redirect URL (GoPay only, production)
}
```

---

## 3. UI Pages

| File | Route | Deskripsi |
|------|-------|-----------|
| `src/app/(dashboard)/subscription/topup/page.tsx` | `/subscription/topup` | Top-up payment form |
| `src/app/(dashboard)/subscription/topup/success/page.tsx` | `/subscription/topup/success` | Success confirmation |
| `src/app/(dashboard)/subscription/topup/failed/page.tsx` | `/subscription/topup/failed` | Failed/error page |

### Constants di `topup/page.tsx`:

```typescript
const TOP_UP_OPTIONS = [
  { amount: 25000, tokens: 250000, label: "Rp 25.000" },
  { amount: 50000, tokens: 500000, label: "Rp 50.000", popular: true },
  { amount: 100000, tokens: 1000000, label: "Rp 100.000" },
]

const PAYMENT_METHODS = [
  { id: "qris", label: "QRIS", description: "Scan dengan e-wallet" },
  { id: "va", label: "Virtual Account", description: "Transfer bank" },
  { id: "ewallet", label: "E-Wallet", description: "OVO, GoPay" },
]

const VA_CHANNELS = [
  { code: "BCA_VIRTUAL_ACCOUNT", label: "BCA" },
  { code: "BNI_VIRTUAL_ACCOUNT", label: "BNI" },
  { code: "BRI_VIRTUAL_ACCOUNT", label: "BRI" },
  { code: "MANDIRI_VIRTUAL_ACCOUNT", label: "Mandiri" },
]

const EWALLET_CHANNELS = [
  { code: "OVO", label: "OVO" },
  { code: "GOPAY", label: "GoPay" },
]
```

---

## 4. Convex Database Schema

| File | Tables |
|------|--------|
| `convex/schema.ts:635-692` | `payments` table |
| `convex/schema.ts:614-632` | `creditBalances` table |
| `convex/schema.ts:694-736` | `subscriptions` table |
| `convex/schema.ts:554-574` | `usageEvents` table |
| `convex/schema.ts:576-611` | `userQuotas` table |

### `payments` Table Indexes:

| Index | Fields | Purpose |
|-------|--------|---------|
| `by_user` | `[userId, createdAt]` | Get user payments |
| `by_xendit_id` | `[xenditPaymentRequestId]` | Webhook lookup |
| `by_reference` | `[xenditReferenceId]` | Reconciliation |
| `by_status` | `[status, createdAt]` | Admin queries |
| `by_user_type` | `[userId, paymentType, createdAt]` | History by type |

---

## 5. Convex Functions (Billing Module)

| File | Module | Deskripsi |
|------|--------|-----------|
| `convex/billing/index.ts` | - | Module export index |
| `convex/billing/constants.ts` | Constants | Pricing, tier limits, helpers |
| `convex/billing/payments.ts` | Payments | Payment CRUD operations |
| `convex/billing/credits.ts` | Credits | Credit balance operations |
| `convex/billing/quotas.ts` | Quotas | Quota tracking & enforcement |
| `convex/billing/usage.ts` | Usage | Token usage recording |
| `convex/billing/subscriptions.ts` | Subscriptions | Pro subscription management |

### `convex/billing/payments.ts` Functions:

| Function | Type | Purpose |
|----------|------|---------|
| `createPayment` | mutation | Create payment record |
| `updatePaymentStatus` | mutation | Update status from webhook |
| `getPaymentByReference` | query | Get by reference ID |
| `getPaymentByXenditId` | query | Get by Xendit ID |
| `getPaymentHistory` | query | Get user's payment history |
| `getPendingPayments` | query | Get pending payments |
| `checkIdempotency` | query | Check duplicate payment |
| `getPaymentStats` | query | Admin statistics |

### `convex/billing/credits.ts` Functions:

| Function | Type | Purpose |
|----------|------|---------|
| `getCreditBalance` | query | Get user's credit balance |
| `initializeCreditBalance` | mutation | Create balance for new BPP user |
| `addCredits` | mutation | Add credits after payment success |
| `deductCredits` | mutation | Deduct credits after AI usage |
| `checkCredits` | query | Pre-flight credit check |
| `getCreditHistory` | query | Top-up and usage history |

### `convex/billing/quotas.ts` Functions:

| Function | Type | Purpose |
|----------|------|---------|
| `getUserQuota` | query | Get or compute quota |
| `initializeQuota` | mutation | Initialize quota for period |
| `deductQuota` | mutation | Deduct tokens from quota |
| `incrementCompletedPapers` | mutation | Increment paper count |
| `checkQuota` | query | Pre-flight quota check |
| `getQuotaStatus` | query | Get quota for UI display |

### `convex/billing/usage.ts` Functions:

| Function | Type | Purpose |
|----------|------|---------|
| `recordUsage` | mutation | Record token usage event |
| `getUsageByPeriod` | query | Get usage in time range |
| `getMonthlyBreakdown` | query | Get aggregated monthly usage |
| `getTodayUsage` | query | Get today's usage |
| `getSessionUsage` | query | Get paper session usage |
| `getUsageSummary` | query | Admin summary |

### `convex/billing/subscriptions.ts` Functions:

| Function | Type | Purpose |
|----------|------|---------|
| `createSubscription` | mutation | Create Pro subscription |
| `getActiveSubscription` | query | Get user's active subscription |
| `getSubscriptionByXenditId` | query | Get by Xendit recurring ID |
| `renewSubscription` | mutation | Renew for next period |
| `cancelSubscription` | mutation | Cancel subscription |
| `expireSubscription` | mutation | Expire at period end |
| `markPastDue` | mutation | Mark as past due |
| `reactivateSubscription` | mutation | Reactivate after payment |
| `getSubscriptionHistory` | query | Get subscription history |
| `checkSubscriptionStatus` | query | Check status and validity |

---

## 6. Constants & Configuration

| File | Purpose |
|------|---------|
| `convex/billing/constants.ts` | Pricing, tier limits, helpers |

### Key Constants:

```typescript
// Token pricing
export const TOKEN_PRICE_PER_1K_IDR = 3        // Rp 3 per 1K tokens
export const TOKENS_PER_IDR = 10               // Rp 1 = 10 tokens

// Tier limits
export const TIER_LIMITS = {
  gratis: { monthlyTokens: 100_000, dailyTokens: 50_000, monthlyPapers: 2 },
  bpp: { monthlyTokens: Infinity, creditBased: true },
  pro: { monthlyTokens: 5_000_000, dailyTokens: 200_000, overageAllowed: true },
}

// Top-up packages
export const TOP_UP_PACKAGES = [
  { amount: 25_000, tokens: 250_000 },
  { amount: 50_000, tokens: 500_000, popular: true },
  { amount: 100_000, tokens: 1_000_000 },
]

// Subscription pricing
export const SUBSCRIPTION_PRICING = {
  pro_monthly: { priceIDR: 99_000, intervalMonths: 1 },
  pro_yearly: { priceIDR: 990_000, intervalMonths: 12 },
}
```

---

## 7. Configuration Files

| File | Purpose |
|------|---------|
| `.env.local` | Development environment variables |
| `.env.example` | Environment variable template |
| `next.config.ts` | Next.js config (Xendit image domain) |

### Environment Variables:

```bash
# Xendit
XENDIT_SECRET_KEY="xnd_development_..."
XENDIT_WEBHOOK_SECRET="..."

# Application
APP_URL="http://localhost:3000"

# Email (untuk notifikasi)
RESEND_API_KEY="..."
RESEND_FROM_EMAIL="..."
```

### `next.config.ts` Xendit Image Domain:

```typescript
images: {
  remotePatterns: [
    {
      protocol: "https",
      hostname: "qr.xendit.co",
      pathname: "/**",
    },
  ],
}
```

---

## 8. Email Utilities

| File | Purpose |
|------|---------|
| `src/lib/email/resend.ts` | Resend email client |

### Functions:

| Function | Purpose |
|----------|---------|
| `sendWelcomeEmail()` | Welcome email untuk user baru |
| `sendBillingNotificationEmail()` | Payment/billing notifications |

---

## 9. Documentation Files

| File | Deskripsi |
|------|-----------|
| `.references/subscription-system/xendit-subscription-system/README.md` | Dokumentasi utama |
| `.references/subscription-system/xendit-subscription-system/files-index.md` | File index (this file) |
| `.references/subscription-system/xendit-subscription-system/pending-tasks.md` | Pending implementation tasks |
| `.references/subscription-system/process/xendit-payment-integration.md` | Integration notes |

---

## Directory Structure

```
src/
├── app/
│   ├── api/
│   │   ├── payments/
│   │   │   └── topup/
│   │   │       └── route.ts          # POST /api/payments/topup
│   │   └── webhooks/
│   │       └── xendit/
│   │           └── route.ts          # POST /api/webhooks/xendit
│   └── (dashboard)/
│       └── subscription/
│           └── topup/
│               ├── page.tsx          # Top-up form UI
│               ├── success/
│               │   └── page.tsx      # Success page
│               └── failed/
│                   └── page.tsx      # Failed page
└── lib/
    ├── xendit/
    │   └── client.ts                 # Xendit API client
    └── email/
        └── resend.ts                 # Email utilities

convex/
├── schema.ts                         # Database schema
└── billing/
    ├── index.ts                      # Module exports
    ├── constants.ts                  # Pricing & limits
    ├── payments.ts                   # Payment operations
    ├── credits.ts                    # Credit balance
    ├── quotas.ts                     # Quota management
    ├── usage.ts                      # Usage tracking
    └── subscriptions.ts              # Pro subscriptions

.references/subscription-system/
└── xendit-subscription-system/
    ├── README.md                     # Main documentation
    ├── files-index.md                # This file
    └── pending-tasks.md              # Pending tasks
```
