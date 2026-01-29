# Phase 2: Backend - Implementation Report

**Date**: 2025-01-30
**Status**: COMPLETED
**Branch**: feat/bpp-payment-activation

---

## Task 2.1: Buat query watchPaymentStatus

### Changes Made
**File**: `convex/billing/payments.ts`

Added `watchPaymentStatus` query for real-time payment status subscription:

```typescript
export const watchPaymentStatus = query({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId)
    if (!payment) return null

    return {
      status: payment.status,
      amount: payment.amount,
      paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod,
      paymentChannel: payment.paymentChannel,
      createdAt: payment.createdAt,
      expiredAt: payment.expiredAt,
    }
  },
})
```

### Verification
- Query dapat di-subscribe dari frontend via `useQuery(api.billing.payments.watchPaymentStatus, { paymentId })`
- Return null jika payment tidak ditemukan
- Auto-update saat webhook mengubah status (Convex reactive)

---

## Task 2.2: Buat query getTopupOptionsForPlan

### Changes Made
**File**: `convex/pricingPlans.ts`

1. Fixed `getPlanBySlug` - implemented properly with args
2. Added `getTopupOptionsForPlan` with fallback logic:

```typescript
export const getTopupOptionsForPlan = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const plan = await ctx.db.query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    // Fallback to TOP_UP_PACKAGES if plan not found or no topupOptions
    if (!plan || !plan.topupOptions?.length) {
      return {
        planExists: !!plan,
        topupOptions: TOP_UP_PACKAGES.map(pkg => ({...})),
      }
    }

    return { planExists: true, topupOptions: plan.topupOptions }
  },
})
```

### Verification
- Return topupOptions dari database (jika ada)
- Graceful fallback ke hardcoded constants
- Type-safe return value dengan `planExists` flag

---

## Task 2.3: Update webhook dengan email placeholder

### Changes Made
**File**: `src/app/api/webhooks/xendit/route.ts`

1. Added `EmailPaymentData` interface
2. Added `sendPaymentSuccessEmail` placeholder function
3. Added `sendPaymentFailedEmail` placeholder function
4. Integrated email calls into `handlePaymentSuccess` and `handlePaymentFailed`
5. Fixed variable scoping issue (`newBalanceIDR` extracted outside switch)

### Email Integration Points

**Success Email** (in `handlePaymentSuccess`):
```typescript
await sendPaymentSuccessEmail({
  userId: payment.userId,
  amount: data.amount,
  transactionId: data.id,
  paymentMethod: data.payment_method.type,
  newBalance: newBalanceIDR,
})
```

**Failed Email** (in `handlePaymentFailed`):
```typescript
await sendPaymentFailedEmail({
  userId: payment.userId,
  amount: data.amount,
  transactionId: data.id,
  paymentMethod: data.payment_method.type,
  failureReason: data.failure_reason,
})
```

### Verification
- Placeholder functions log to console for debugging
- Email failure does not break webhook processing (try-catch)
- Ready for Phase 4 React Email implementation

---

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript (`tsc --noEmit`) | PASS |
| ESLint | PASS (existing warnings not related to changes) |
| Build (`npm run build`) | PASS |

---

## Files Modified

1. `convex/billing/payments.ts` - Added watchPaymentStatus query
2. `convex/pricingPlans.ts` - Fixed getPlanBySlug, added getTopupOptionsForPlan
3. `src/app/api/webhooks/xendit/route.ts` - Added email placeholder functions

## API Surface Added

| Query/Function | Description |
|----------------|-------------|
| `api.billing.payments.watchPaymentStatus` | Real-time payment status subscription |
| `api.pricingPlans.getPlanBySlug` | Get single plan by slug |
| `api.pricingPlans.getTopupOptionsForPlan` | Get topup options with fallback |
