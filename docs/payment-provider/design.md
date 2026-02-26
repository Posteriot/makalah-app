# Payment Provider Abstraction — Design Document

**Date:** 2026-02-27
**Status:** Approved
**Branch:** `worktree-payment-provider`

## Goal

Membuat payment provider architecture yang agnostik, minimal compliant untuk Xendit dan Midtrans di Indonesia. Admin bisa switch provider aktif via admin panel tanpa redeploy (secrets tetap di env vars).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pattern | Interface + Adapter | Compile-time safety, test-friendly, clean separation |
| Config model | DB-first, env-fallback | Admin panel switch + safety net saat DB belum seed |
| Secrets | Env vars only | API keys tidak masuk DB — no encryption layer needed |
| Abstraction level | Method-level (QRIS, VA, EWallet) | Channel list beda per provider, per-method dispatch |
| Schema migration | Direct rename | DB bisa reset, no production data to preserve |
| Midtrans adapter | Skeleton (throws not-implemented) | Compile-time complete, implement nanti |

## Architecture

### Interface & Types (`src/lib/payment/types.ts`)

```typescript
type PaymentMethodCategory = "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"
type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED" | "REFUNDED"

interface PaymentResult {
  providerPaymentId: string
  referenceId: string
  status: PaymentStatus
  expiresAt?: number
  qrString?: string
  vaNumber?: string
  vaChannel?: string
  redirectUrl?: string
}

interface WebhookEvent {
  providerPaymentId: string
  status: PaymentStatus
  paidAt?: number
  failureCode?: string
  metadata?: Record<string, unknown>
}

interface QRISParams {
  referenceId: string
  amount: number
  description?: string
  metadata?: Record<string, unknown>
  expiresMinutes?: number
}

interface VAParams {
  referenceId: string
  amount: number
  channelCode: string
  customerName: string
  description?: string
  metadata?: Record<string, unknown>
  expiresMinutes?: number
}

interface EWalletParams {
  referenceId: string
  amount: number
  channelCode: string
  description?: string
  metadata?: Record<string, unknown>
  // OVO-specific
  mobileNumber?: string
  // Redirect-based (GoPay, etc)
  successReturnUrl?: string
  failureReturnUrl?: string
  cancelReturnUrl?: string
}

interface VAChannelOption {
  code: string
  label: string
}

interface EWalletChannelOption {
  code: string
  label: string
  requiresMobileNumber?: boolean
  requiresRedirectUrl?: boolean
}

interface PaymentProvider {
  readonly name: "xendit" | "midtrans"
  createQRIS(params: QRISParams): Promise<PaymentResult>
  createVA(params: VAParams): Promise<PaymentResult>
  createEWallet(params: EWalletParams): Promise<PaymentResult>
  verifyWebhook(request: Request): Promise<WebhookEvent | null>
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus>
  getSupportedVAChannels(): VAChannelOption[]
  getSupportedEWalletChannels(): EWalletChannelOption[]
}
```

### Factory (`src/lib/payment/factory.ts`)

```typescript
async function getProvider(): Promise<PaymentProvider> {
  // 1. DB config (admin panel)
  // 2. Fallback: env var PAYMENT_PROVIDER
  // 3. Default: "xendit"
}
```

### Adapters

- `src/lib/payment/adapters/xendit.ts` — wraps existing Xendit REST API calls, normalizes to PaymentResult/WebhookEvent
- `src/lib/payment/adapters/midtrans.ts` — skeleton, all methods throw "not implemented"

### Shared Payment Creation (`src/lib/payment/create-payment.ts`)

Eliminates duplication between topup and subscribe routes:

```typescript
async function createPaymentViaProvider(input: CreatePaymentInput): Promise<PaymentResponse> {
  // 1. getProvider()
  // 2. Dispatch to provider.createQRIS / createVA / createEWallet
  // 3. Save to Convex (providerPaymentId, providerReferenceId, providerName)
  // 4. Return normalized response
}
```

## Schema Changes

### Table `payments` — rename fields

| Old | New |
|-----|-----|
| `xenditPaymentRequestId` | `providerPaymentId` |
| `xenditReferenceId` | `providerReferenceId` |
| (new) | `providerName` (`"xendit" \| "midtrans"`) |

Indexes: `by_xendit_id` → `by_provider_id`, `by_reference` → `by_provider_reference`

### Table `subscriptions` — rename fields

| Old | New |
|-----|-----|
| `xenditRecurringId` | `providerRecurringId` |
| `xenditCustomerId` | `providerCustomerId` |

### New table: `paymentProviderConfigs`

```
activeProvider: "xendit" | "midtrans"
enabledMethods: ["QRIS", "VIRTUAL_ACCOUNT", "EWALLET"]
webhookUrl: optional string (display reference)
defaultExpiry: optional number (minutes)
isActive: boolean
updatedBy: optional string
createdAt: number
updatedAt: number
```

Index: `by_active` on `isActive`

## API Route Changes

### Refactored routes

- `src/app/api/payments/topup/route.ts` — use `createPaymentViaProvider()`
- `src/app/api/payments/subscribe/route.ts` — use `createPaymentViaProvider()`

### New generic webhook

- `src/app/api/webhooks/payment/route.ts` — `provider.verifyWebhook(req)` → business logic
- Delete `src/app/api/webhooks/xendit/route.ts`

### Business logic (webhook handlers)

`handlePaymentSuccess`, `handlePaymentFailed`, `handlePaymentExpired` — same logic, receive normalized `WebhookEvent` instead of Xendit-specific types.

## Admin Panel UI

New tab "Payment Provider" in admin sidebar.

### Component: `PaymentProviderManager.tsx`

- Radio: Xendit / Midtrans (with env status indicator)
- Checkboxes: enabled payment methods (QRIS, VA, EWallet)
- Default expiry config
- Webhook URL display (read-only reference)
- Save button → `paymentProviderConfigs.upsertConfig`

### Convex functions: `convex/billing/paymentProviderConfigs.ts`

- `getActiveConfig` — query, no auth (used by payment API)
- `upsertConfig` — mutation, admin only
- `checkProviderEnvStatus` — query, admin only

## Checkout UI Changes

- `xenditId` → `providerPaymentId` in state
- Dynamic branding: "Pembayaran diproses oleh {providerLabel}"
- Payment method tabs filtered by `enabledMethods` from config

## File Impact

### New files
- `src/lib/payment/types.ts`
- `src/lib/payment/factory.ts`
- `src/lib/payment/create-payment.ts`
- `src/lib/payment/adapters/xendit.ts`
- `src/lib/payment/adapters/midtrans.ts`
- `convex/billing/paymentProviderConfigs.ts`
- `src/components/admin/PaymentProviderManager.tsx`
- `src/app/api/webhooks/payment/route.ts`

### Modified files
- `convex/schema.ts`
- `convex/billing/payments.ts`
- `convex/billing/subscriptions.ts`
- `src/app/api/payments/topup/route.ts`
- `src/app/api/payments/subscribe/route.ts`
- `src/app/(onboarding)/checkout/bpp/page.tsx`
- `src/app/(onboarding)/checkout/pro/page.tsx`
- `src/components/admin/adminPanelConfig.ts`
- `src/components/admin/AdminPanelContainer.tsx`
- `src/app/api/export/receipt/[paymentId]/route.ts` (check)

### Deleted files
- `src/lib/xendit/client.ts` (logic moves to adapters/xendit.ts)
- `src/app/api/webhooks/xendit/route.ts` (replaced by /payment/)

## Execution Phases

**Phase 1 — Foundation:** types.ts, factory.ts, adapters/xendit.ts, adapters/midtrans.ts
**Phase 2 — Schema:** schema.ts, payments.ts, subscriptions.ts, paymentProviderConfigs.ts
**Phase 3 — API Routes:** create-payment.ts, topup refactor, subscribe refactor, webhook/payment
**Phase 4 — UI:** checkout pages, PaymentProviderManager.tsx, admin config
**Phase 5 — Verify:** build check, lint check, cleanup deleted files
