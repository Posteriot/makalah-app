# Payment Prevention Fixes — Design Document

**Date:** 2026-03-12
**Trigger:** Bug post-mortem — Bambang Sutrisno payment succeeded but tier unchanged
**Approach:** B+ (Fix + Pre-flight + Payment Report Link)

## Root Cause (Bambang Incident)

1. `XENDIT_WEBHOOK_TOKEN` empty string in Vercel production
2. JS `"" || "RTuByPA4..."` fell through to wrong token (`XENDIT_WEBHOOK_SECRET`)
3. Token mismatch → webhook rejected → payment stuck PENDING
4. Catch block returned HTTP 200 → Xendit didn't retry
5. No Sentry alert → team didn't know

## Layer Overview

| Layer | Type | Function | Detector |
|-------|------|----------|----------|
| **M1** | Bug fix | Sentry logging on `verifyWebhook` failure | System → Sentry alert |
| **M2** | Bug fix | Non-200 for transient errors (enables Xendit retry) | System → auto-retry |
| **M3** | Bug fix | Empty string env var guard (`.trim()`) | System → prevents silent fallthrough |
| **P1** | Prevention | Pre-flight health check before payment creation | System → blocks payment + shows error |
| **P3** | Escape hatch | "Lapor Masalah Pembayaran" link in error states | User → manual report |

P2 (reconciliation cron) dropped per YAGNI. P3 replaces it as human-driven safety net.

## M1: Sentry Logging on verifyWebhook Failure

**File:** `src/lib/payment/adapters/xendit.ts`

Add `Sentry.captureMessage()` at two failure points:
- Missing token config → `level: "fatal"`
- Token mismatch → `level: "error"`

Currently these return `null` with only `console.error` — invisible in production.

## M2: Smart Retry via Non-200 Status

**File:** `src/app/api/webhooks/payment/route.ts`

Change catch block from `200 {"status":"error"}` to:
- **Permanent errors** (e.g., "payment not found in DB") → `200` (don't retry, pointless)
- **Transient errors** (DB timeout, network) → `500` (Xendit will retry)

Detection: `error.message.includes("not found")` = permanent, else = transient.

## M3: Empty String Env Var Guard

**File:** `src/lib/payment/adapters/xendit.ts`

Replace:
```
const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN || process.env.XENDIT_WEBHOOK_SECRET
```

With:
```
const rawToken = process.env.XENDIT_WEBHOOK_TOKEN?.trim()
const rawSecret = process.env.XENDIT_WEBHOOK_SECRET?.trim()
const expectedToken = rawToken || rawSecret
```

`.trim()` handles: empty strings, trailing newlines from `echo`, whitespace.

## P1: Pre-flight Health Check

**New file:** `src/lib/payment/preflight.ts`

Synchronous function `assertPaymentSystemReady()` that checks:

| Check | Env Var | Why |
|-------|---------|-----|
| Xendit API key | `XENDIT_SECRET_KEY` | Without this, Xendit API call fails |
| Webhook token | `XENDIT_WEBHOOK_TOKEN` or `XENDIT_WEBHOOK_SECRET` (non-empty) | Root cause of Bambang bug |
| Convex internal key | `CONVEX_INTERNAL_KEY` | Webhook handler needs this to update DB |

NOT checked: Xendit API reachability (too slow), Convex reachability (already covered by auth query), Resend API key (email is non-critical).

**Integration:** Called at top of `topup/route.ts` and `subscribe/route.ts`, after auth check but before any business logic. Returns `503` with `code: "PAYMENT_SYSTEM_UNAVAILABLE"` if any check fails. Sentry fatal alert on failure.

## P3: Payment Report Link

Reuse existing `technicalReports` infrastructure. Extend scope to `"payment"`.

### Schema Changes

**`convex/schema.ts` — `technicalReports` table:**
- `scope`: add `v.literal("payment")`
- `source`: add `v.literal("payment-checkout")`, `v.literal("payment-preflight-error")`
- New optional field: `paymentContext` with `transactionId`, `amount`, `paymentMethod`, `providerPaymentId`, `errorCode`

### Backend Changes

**`convex/technicalReports.ts`:**
- Update source whitelist validation
- Accept + store `paymentContext` for scope `"payment"`

### New Component

**`src/components/technical-report/PaymentTechnicalReportButton.tsx`**

Dialog modal (like `ChatTechnicalReportButton.tsx`) with:
- Source: `"payment-checkout"` or `"payment-preflight-error"`
- Auto-attaches `paymentContext` (transactionId, amount, method, errorCode)
- Placeholder: "Sudah bayar tapi status tidak berubah..."
- Passes `paymentContext` as a dedicated prop to `TechnicalReportForm`

### Form Extension

**`src/components/technical-report/TechnicalReportForm.tsx`:**
- Accept optional `paymentContext` prop
- Forward to `submitReport({ ...input, paymentContext })` so it reaches the typed mutation field
- Hide "Sesi chat terkait" dropdown when scope is payment (not relevant)

### Checkout Integration (3 touchpoints)

1. **Pre-flight error** (P1 blocks payment):
   - "Sistem pembayaran sedang tidak tersedia" + [Lapor Masalah Pembayaran]
   - Source: `"payment-preflight-error"`, context: `{ errorCode }`

2. **Payment expired** (QRIS/VA timeout):
   - "Sudah bayar tapi status belum berubah?" + [Lapor Masalah]
   - Source: `"payment-checkout"`, context: `{ transactionId, amount, paymentMethod }`

3. **Payment failed**:
   - "Merasa ini salah?" + [Lapor Masalah Pembayaran]
   - Source: `"payment-checkout"`, context: `{ transactionId, amount, errorCode }`

### Admin Panel

Existing `TechnicalReportManager` already supports filtering by source — payment reports appear automatically with new sources. One small addition needed:

**`convex/technicalReports.ts` — `getDetailForAdmin` query:**
- Include `paymentContext` in returned detail when `scope === "payment"`

### Hook Extension

**`src/lib/hooks/useTechnicalReport.ts`:**
- Accept optional `paymentContext` parameter
- Pass through to mutation

## File Changes Summary

| File | Change Type | Layer |
|------|------------|-------|
| `src/lib/payment/adapters/xendit.ts` | Edit | M1, M3 |
| `src/app/api/webhooks/payment/route.ts` | Edit | M2 |
| `src/lib/payment/preflight.ts` | **New** | P1 |
| `src/app/api/payments/topup/route.ts` | Edit | P1 |
| `src/app/api/payments/subscribe/route.ts` | Edit | P1 |
| `convex/schema.ts` | Edit | P3 |
| `convex/technicalReports.ts` | Edit | P3 |
| `src/components/technical-report/PaymentTechnicalReportButton.tsx` | **New** | P3 |
| `src/components/technical-report/TechnicalReportForm.tsx` | Edit | P3 |
| `src/app/(onboarding)/checkout/bpp/page.tsx` | Edit | P1, P3 |
| `src/app/(onboarding)/checkout/pro/page.tsx` | Edit | P1, P3 |
| `src/lib/hooks/useTechnicalReport.ts` | Edit | P3 |
