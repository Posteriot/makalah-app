# Payment Provider Abstraction — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the payment architecture provider-agnostic, supporting Xendit and Midtrans via Interface + Adapter pattern with admin panel switching.

**Architecture:** Interface + Adapter pattern. Factory resolves active provider from DB config (admin panel) with env var fallback. Each provider adapter normalizes responses to shared types. Business logic (quota, credits, subscriptions) stays unchanged.

**Tech Stack:** TypeScript, Convex (schema + functions), Next.js API routes, React (admin UI), Iconoir icons

**Design Doc:** `docs/payment-provider/design.md`

---

## Task 1: Create Payment Provider Types

**Files:**
- Create: `src/lib/payment/types.ts`

**Step 1: Write the types file**

```typescript
// src/lib/payment/types.ts

/**
 * Payment Provider Abstraction Types
 * Provider-agnostic interfaces for payment processing
 */

// ════════════════════════════════════════════════════════════════
// Provider Identity
// ════════════════════════════════════════════════════════════════

export type PaymentProviderName = "xendit" | "midtrans"

// ════════════════════════════════════════════════════════════════
// Payment Method Categories
// ════════════════════════════════════════════════════════════════

export type PaymentMethodCategory = "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED" | "REFUNDED"

// ════════════════════════════════════════════════════════════════
// Channel Options (provider returns these)
// ════════════════════════════════════════════════════════════════

export interface VAChannelOption {
  code: string
  label: string
}

export interface EWalletChannelOption {
  code: string
  label: string
  requiresMobileNumber?: boolean
  requiresRedirectUrl?: boolean
}

// ════════════════════════════════════════════════════════════════
// Payment Creation Params (caller sends these)
// ════════════════════════════════════════════════════════════════

export interface QRISParams {
  referenceId: string
  amount: number
  description?: string
  metadata?: Record<string, unknown>
  expiresMinutes?: number
}

export interface VAParams {
  referenceId: string
  amount: number
  channelCode: string
  customerName: string
  description?: string
  metadata?: Record<string, unknown>
  expiresMinutes?: number
}

export interface EWalletParams {
  referenceId: string
  amount: number
  channelCode: string
  description?: string
  metadata?: Record<string, unknown>
  // OVO-specific
  mobileNumber?: string
  // Redirect-based (GoPay, ShopeePay, etc)
  successReturnUrl?: string
  failureReturnUrl?: string
  cancelReturnUrl?: string
}

// ════════════════════════════════════════════════════════════════
// Normalized Results (provider returns these)
// ════════════════════════════════════════════════════════════════

export interface PaymentResult {
  providerPaymentId: string
  referenceId: string
  status: PaymentStatus
  expiresAt?: number
  // Method-specific presentation data
  qrString?: string
  vaNumber?: string
  vaChannel?: string
  redirectUrl?: string
}

export interface WebhookEvent {
  providerPaymentId: string
  status: PaymentStatus
  paidAt?: number
  failureCode?: string
  rawAmount?: number
  channelCode?: string
  metadata?: Record<string, unknown>
}

// ════════════════════════════════════════════════════════════════
// Provider Interface
// ════════════════════════════════════════════════════════════════

export interface PaymentProvider {
  readonly name: PaymentProviderName

  // Payment creation — one per method category
  createQRIS(params: QRISParams): Promise<PaymentResult>
  createVA(params: VAParams): Promise<PaymentResult>
  createEWallet(params: EWalletParams): Promise<PaymentResult>

  // Webhook verification + parsing
  verifyWebhook(request: Request): Promise<WebhookEvent | null>

  // Status check (polling fallback)
  getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus>

  // Available channels (differs per provider)
  getSupportedVAChannels(): VAChannelOption[]
  getSupportedEWalletChannels(): EWalletChannelOption[]
}
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors from `src/lib/payment/types.ts`

**Step 3: Commit**

```bash
git add src/lib/payment/types.ts
git commit -m "feat(payment): add provider-agnostic types and interface"
```

---

## Task 2: Create Xendit Adapter

**Files:**
- Create: `src/lib/payment/adapters/xendit.ts`
- Reference (read-only): `src/lib/xendit/client.ts`

**Step 1: Write the Xendit adapter**

Wrap all existing Xendit API calls from `src/lib/xendit/client.ts` into adapter class. Inline the Xendit REST API logic (don't import from old client — we'll delete it later).

Key mapping:
- `XenditPaymentResponse.payment_request_id` → `PaymentResult.providerPaymentId`
- `XenditPaymentResponse.reference_id` → `PaymentResult.referenceId`
- `XenditPaymentResponse.status` → map to `PaymentStatus`
- `XenditPaymentResponse.actions[]` → extract `qrString`, `vaNumber`, `redirectUrl`
- Webhook: `x-callback-token` verification → parse `XenditWebhookPayload` → return `WebhookEvent`

Channel lists:
- VA: BCA, BNI, BRI, Mandiri (same as current `VA_CHANNELS`)
- EWallet: OVO (requiresMobileNumber), GoPay (requiresRedirectUrl)

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/lib/payment/adapters/xendit.ts
git commit -m "feat(payment): add Xendit adapter implementing PaymentProvider"
```

---

## Task 3: Create Midtrans Adapter (Skeleton)

**Files:**
- Create: `src/lib/payment/adapters/midtrans.ts`

**Step 1: Write the skeleton adapter**

All methods throw `Error("MidtransAdapter.<method> not yet implemented")`. TypeScript compiler ensures all interface methods exist.

Include channel lists as comments/TODOs for future implementation:
- VA: BCA, BNI, BRI, Mandiri, Permata (Midtrans equivalents)
- EWallet: GoPay, ShopeePay

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`

**Step 3: Commit**

```bash
git add src/lib/payment/adapters/midtrans.ts
git commit -m "feat(payment): add Midtrans adapter skeleton"
```

---

## Task 4: Create Factory

**Files:**
- Create: `src/lib/payment/factory.ts`

**Step 1: Write the factory**

Logic:
1. Try `fetchQuery(api.billing.paymentProviderConfigs.getActiveConfig)` — will fail until Task 7, that's OK
2. Fallback: `process.env.PAYMENT_PROVIDER ?? "xendit"`
3. Switch on provider name → return adapter instance
4. For now, wrap DB call in try-catch (table doesn't exist yet)

**Step 2: Verify TypeScript compiles**

**Step 3: Commit**

```bash
git add src/lib/payment/factory.ts
git commit -m "feat(payment): add provider factory with DB-first, env-fallback"
```

---

## Task 5: Update Convex Schema — Payments & Subscriptions

**Files:**
- Modify: `convex/schema.ts` (payments table ~line 813-888, subscriptions table ~line 891-925)

**Step 1: Rename fields in `payments` table**

| Old | New |
|-----|-----|
| `xenditPaymentRequestId: v.string()` | `providerPaymentId: v.string()` |
| `xenditReferenceId: v.string()` | `providerReferenceId: v.string()` |
| (add new) | `providerName: v.union(v.literal("xendit"), v.literal("midtrans"))` |
| Index `by_xendit_id` on `["xenditPaymentRequestId"]` | `by_provider_id` on `["providerPaymentId"]` |
| Index `by_reference` on `["xenditReferenceId"]` | `by_provider_reference` on `["providerReferenceId"]` |

Comment on line 812 change: `// Payment records (Xendit transactions)` → `// Payment records (provider-agnostic)`

**Step 2: Rename fields in `subscriptions` table**

| Old | New |
|-----|-----|
| `xenditRecurringId: v.optional(v.string())` | `providerRecurringId: v.optional(v.string())` |
| `xenditCustomerId: v.optional(v.string())` | `providerCustomerId: v.optional(v.string())` |
| Index `by_xendit_recurring` on `["xenditRecurringId"]` | `by_provider_recurring` on `["providerRecurringId"]` |

**Step 3: Add `paymentProviderConfigs` table**

Add after `subscriptions` table definition:

```typescript
// Payment provider configuration (admin-managed)
paymentProviderConfigs: defineTable({
  activeProvider: v.union(v.literal("xendit"), v.literal("midtrans")),
  enabledMethods: v.array(
    v.union(v.literal("QRIS"), v.literal("VIRTUAL_ACCOUNT"), v.literal("EWALLET"))
  ),
  webhookUrl: v.optional(v.string()),
  defaultExpiryMinutes: v.optional(v.number()),
  isActive: v.boolean(),
  updatedBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_active", ["isActive"]),
```

**Step 4: Verify schema compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: Errors in `convex/billing/payments.ts` and `convex/billing/subscriptions.ts` (old field names) — that's expected, we fix those next.

**Step 5: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): rename xendit-specific fields to provider-agnostic names"
```

---

## Task 6: Update Convex Billing Functions — Payments

**Files:**
- Modify: `convex/billing/payments.ts`

**Step 1: Rename all xendit references**

Global replacements in this file:
- `xenditPaymentRequestId` → `providerPaymentId` (in args, handler body, index names)
- `xenditReferenceId` → `providerReferenceId`
- `by_xendit_id` → `by_provider_id`
- `by_reference` → `by_provider_reference`
- `getPaymentByXenditId` → `getPaymentByProviderId`
- `getPaymentByReference` → `getPaymentByProviderReference`

Add `providerName` to `createPayment` args:
```typescript
providerName: v.union(v.literal("xendit"), v.literal("midtrans")),
```

Update file header comment: `Track Xendit payment transactions` → `Track payment transactions (provider-agnostic)`

**Step 2: Verify no TypeScript errors in this file**

Run: `npx tsc --noEmit --pretty 2>&1 | grep payments`

**Step 3: Commit**

```bash
git add convex/billing/payments.ts
git commit -m "refactor(billing): rename xendit-specific payment functions to provider-agnostic"
```

---

## Task 7: Update Convex Billing Functions — Subscriptions

**Files:**
- Modify: `convex/billing/subscriptions.ts`

**Step 1: Rename xendit references**

- `xenditRecurringId` → `providerRecurringId` (in args, handler body)
- `xenditCustomerId` → `providerCustomerId`
- `getSubscriptionByXenditId` → `getSubscriptionByProviderId`
- `by_xendit_recurring` → `by_provider_recurring`

**Step 2: Verify TypeScript compiles**

**Step 3: Commit**

```bash
git add convex/billing/subscriptions.ts
git commit -m "refactor(billing): rename xendit-specific subscription fields to provider-agnostic"
```

---

## Task 8: Create Convex Payment Provider Config Functions

**Files:**
- Create: `convex/billing/paymentProviderConfigs.ts`

**Step 1: Write CRUD functions**

Three functions following `aiProviderConfigs.ts` pattern:

1. `getActiveConfig` — query, no auth (used by payment API routes)
   - Query `paymentProviderConfigs` with `by_active` index where `isActive === true`
   - Return config with defaults if no record: `{ activeProvider: "xendit", enabledMethods: ["QRIS", "VIRTUAL_ACCOUNT", "EWALLET"] }`

2. `upsertConfig` — mutation, admin only (via `requireRole`)
   - Args: `activeProvider`, `enabledMethods`, `webhookUrl?`, `defaultExpiryMinutes?`, `requestorUserId`
   - If existing active config → patch it. Otherwise → insert new.
   - Set `updatedBy` to admin email, `updatedAt` to now

3. `checkProviderEnvStatus` — query, admin only
   - Check env vars exist (truthy check, never return values):
     - Xendit: `XENDIT_SECRET_KEY`, `XENDIT_WEBHOOK_TOKEN` or `XENDIT_WEBHOOK_SECRET`
     - Midtrans: `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`
   - Return: `{ xendit: { secretKey: boolean, webhookToken: boolean }, midtrans: { serverKey: boolean, clientKey: boolean } }`

**Step 2: Verify TypeScript compiles**

**Step 3: Commit**

```bash
git add convex/billing/paymentProviderConfigs.ts
git commit -m "feat(billing): add payment provider config CRUD functions"
```

---

## Task 9: Create Shared Payment Creation Function

**Files:**
- Create: `src/lib/payment/create-payment.ts`
- Reference: `src/app/api/payments/topup/route.ts` (for current logic to extract)

**Step 1: Write the shared function**

Extract the duplicated payment-method dispatch + Convex save logic from topup/subscribe routes:

```typescript
import { getProvider } from "./factory"
import type { PaymentMethodCategory } from "./types"

interface CreatePaymentInput {
  userId: Id<"users">
  referenceId: string
  amount: number
  description: string
  paymentMethod: "qris" | "va" | "ewallet"
  paymentType: "credit_topup" | "paper_completion" | "subscription_initial" | "subscription_renewal"
  metadata: Record<string, unknown>
  idempotencyKey: string
  convexToken: string
  appUrl: string
  // Method-specific
  vaChannel?: string
  ewalletChannel?: string
  mobileNumber?: string
  customerName?: string
  // Package info (pass-through to DB)
  packageType?: string
  credits?: number
  planType?: string
}

interface CreatePaymentResponse {
  paymentId: string
  convexPaymentId: string
  providerPaymentId: string
  providerName: string
  status: string
  amount: number
  expiresAt: number
  // Method-specific
  qrString?: string
  vaNumber?: string
  vaChannel?: string
  redirectUrl?: string
}
```

Function body:
1. `const provider = await getProvider()`
2. Switch `paymentMethod` → call `provider.createQRIS/createVA/createEWallet`
3. `fetchMutation(api.billing.payments.createPayment, { providerPaymentId, providerReferenceId, providerName: provider.name, ... })`
4. Return `CreatePaymentResponse`

**Step 2: Verify TypeScript compiles**

**Step 3: Commit**

```bash
git add src/lib/payment/create-payment.ts
git commit -m "feat(payment): add shared createPaymentViaProvider function"
```

---

## Task 10: Refactor Topup API Route

**Files:**
- Modify: `src/app/api/payments/topup/route.ts`

**Step 1: Replace Xendit imports with shared function**

Remove:
```typescript
import { createQRISPayment, createVAPayment, createOVOPayment, createGopayPayment, type VAChannel, type EWalletChannel } from "@/lib/xendit/client"
```

Add:
```typescript
import { createPaymentViaProvider } from "@/lib/payment/create-payment"
```

Replace the entire switch block (lines ~102-300) + Convex save + response building with single call to `createPaymentViaProvider()`.

Route should only keep: auth check, user fetch, package validation, BPP disabled check, pricing fetch, idempotency check. Then delegate to shared function.

**Step 2: Verify route still compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep topup`

**Step 3: Commit**

```bash
git add src/app/api/payments/topup/route.ts
git commit -m "refactor(topup): use shared createPaymentViaProvider"
```

---

## Task 11: Refactor Subscribe API Route

**Files:**
- Modify: `src/app/api/payments/subscribe/route.ts`

**Step 1: Same pattern as Task 10**

Replace Xendit imports → `createPaymentViaProvider`. Keep only subscribe-specific business logic (active sub check, Pro disabled check, pricing).

**Step 2: Verify compiles**

**Step 3: Commit**

```bash
git add src/app/api/payments/subscribe/route.ts
git commit -m "refactor(subscribe): use shared createPaymentViaProvider"
```

---

## Task 12: Create Generic Webhook Route

**Files:**
- Create: `src/app/api/webhooks/payment/route.ts`
- Reference: `src/app/api/webhooks/xendit/route.ts` (current webhook)

**Step 1: Write generic webhook handler**

Structure:
1. `const provider = await getProvider()`
2. `const event = await provider.verifyWebhook(req)` — returns `WebhookEvent | null`
3. If null → 401
4. Switch `event.status`:
   - `SUCCEEDED` → `handlePaymentSuccess(event, internalKey)` (same business logic)
   - `FAILED` → `handlePaymentFailed(event, internalKey)`
   - `EXPIRED` → `handlePaymentExpired(event, internalKey)`

Business logic functions (`handlePaymentSuccess`, etc.) stay almost identical, but receive `WebhookEvent` (normalized) instead of `XenditPaymentData`. Key changes:
- `data.payment_request_id` → `event.providerPaymentId`
- `api.billing.payments.getPaymentByXenditId` → `api.billing.payments.getPaymentByProviderId`
- `xenditPaymentRequestId` arg → `providerPaymentId` arg
- `xenditStatus` in metadata → `providerStatus`

Email sending logic: no change (already uses generic params).

**Step 2: Verify compiles**

**Step 3: Commit**

```bash
git add src/app/api/webhooks/payment/route.ts
git commit -m "feat(webhook): add provider-agnostic payment webhook handler"
```

---

## Task 13: Delete Old Xendit Files

**Files:**
- Delete: `src/lib/xendit/client.ts`
- Delete: `src/app/api/webhooks/xendit/route.ts`

**Step 1: Verify no remaining imports to deleted files**

Run: `grep -r "xendit/client" src/ --include="*.ts" --include="*.tsx"`
Run: `grep -r "webhooks/xendit" src/ --include="*.ts" --include="*.tsx"`

Expected: no results (all references updated in Tasks 10-12)

**Step 2: Delete files**

```bash
rm src/lib/xendit/client.ts
rmdir src/lib/xendit 2>/dev/null  # remove dir if empty
rm src/app/api/webhooks/xendit/route.ts
rmdir src/app/api/webhooks/xendit 2>/dev/null
```

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old Xendit-specific client and webhook route"
```

---

## Task 14: Update Receipt Export Route

**Files:**
- Modify: `src/app/api/export/receipt/[paymentId]/route.ts`

**Step 1: Rename xendit references**

Line 88: `payment.xenditReferenceId` → `payment.providerReferenceId` (in PDF title)
Line 119: `payment.xenditReferenceId` → `payment.providerReferenceId` (in receipt row)
Line 142: `payment.xenditReferenceId` → `payment.providerReferenceId` (in filename)

**Step 2: Verify compiles**

**Step 3: Commit**

```bash
git add src/app/api/export/receipt/[paymentId]/route.ts
git commit -m "refactor(receipt): use provider-agnostic field names"
```

---

## Task 15: Update Checkout BPP Page

**Files:**
- Modify: `src/app/(onboarding)/checkout/bpp/page.tsx`

**Step 1: Update PaymentResult interface**

```typescript
// Before:
interface PaymentResult {
  xenditId: string
  // ...
}

// After:
interface PaymentResult {
  providerPaymentId: string
  providerName: string
  // ...
}
```

**Step 2: Update all `xenditId` references in component**

Replace `result.xenditId` → `result.providerPaymentId` everywhere.

**Step 3: Add dynamic provider branding**

Replace hardcoded "Pembayaran diproses oleh Xendit. Aman dan terenkripsi." with:
```tsx
const providerLabel = result.providerName === "midtrans" ? "Midtrans" : "Xendit"
// ...
<p>Pembayaran diproses oleh {providerLabel}. Aman dan terenkripsi.</p>
```

**Step 4: Add method filtering from config**

Add query for enabled methods:
```tsx
const paymentConfig = useQuery(api.billing.paymentProviderConfigs.getActiveConfig)
const enabledMethods = paymentConfig?.enabledMethods ?? ["QRIS", "VIRTUAL_ACCOUNT", "EWALLET"]
```

Filter `PAYMENT_METHODS` array by `enabledMethods`.

**Step 5: Verify compiles**

**Step 6: Commit**

```bash
git add src/app/(onboarding)/checkout/bpp/page.tsx
git commit -m "refactor(checkout-bpp): use provider-agnostic fields and dynamic branding"
```

---

## Task 16: Update Checkout Pro Page

**Files:**
- Modify: `src/app/(onboarding)/checkout/pro/page.tsx`

**Step 1-6: Same changes as Task 15**

Apply identical changes: `PaymentResult` interface, `xenditId` references, dynamic branding, method filtering.

**Step 7: Commit**

```bash
git add src/app/(onboarding)/checkout/pro/page.tsx
git commit -m "refactor(checkout-pro): use provider-agnostic fields and dynamic branding"
```

---

## Task 17: Create Admin Panel — Payment Provider Manager

**Files:**
- Create: `src/components/admin/PaymentProviderManager.tsx`
- Modify: `src/components/admin/adminPanelConfig.ts`
- Modify: `src/components/admin/AdminContentSection.tsx`

**Step 1: Add sidebar entry in `adminPanelConfig.ts`**

Import `CreditCard` from `iconoir-react`. Add new item after "refrasa" entry:

```typescript
{
  id: "payment",
  label: "Payment Provider",
  icon: CreditCard,
  headerTitle: "Payment Provider",
  headerDescription: "Konfigurasi provider pembayaran",
  headerIcon: CreditCard,
},
```

Add `"payment"` to `AdminTabId` type union.

**Step 2: Create `PaymentProviderManager.tsx`**

Component structure (following AIProviderManager pattern):
- Props: `{ userId: Id<"users"> }`
- Queries: `useQuery(api.billing.paymentProviderConfigs.getActiveConfig)`, `useQuery(api.billing.paymentProviderConfigs.checkProviderEnvStatus, { requestorUserId: userId })`
- Mutation: `useMutation(api.billing.paymentProviderConfigs.upsertConfig)`
- State: `activeProvider`, `enabledMethods[]`, `defaultExpiryMinutes`

UI sections:
1. **Provider Selection** — Radio group: Xendit / Midtrans. Show env status indicator (green check or yellow warning).
2. **Payment Methods** — Checkbox group: QRIS, Virtual Account, E-Wallet.
3. **Settings** — Default QRIS expiry (number input, minutes).
4. **Webhook URL** — Read-only display: `/api/webhooks/payment`
5. **Save Button** — `CmsSaveButton` pattern or inline button with loading state.

Styling: Follow Mechanical Grace design system (rounded-shell, border-hairline, text-interface, Iconoir icons 1.5px stroke).

**Step 3: Wire into `AdminContentSection.tsx`**

Import `PaymentProviderManager`. Add render block:
```tsx
{activeTab === "payment" && (
  <div className="space-y-6">
    <PaymentProviderManager userId={userId} />
  </div>
)}
```

**Step 4: Verify compiles**

**Step 5: Commit**

```bash
git add src/components/admin/PaymentProviderManager.tsx src/components/admin/adminPanelConfig.ts src/components/admin/AdminContentSection.tsx
git commit -m "feat(admin): add Payment Provider configuration panel"
```

---

## Task 18: Update Factory to Use DB Config (Remove Try-Catch)

**Files:**
- Modify: `src/lib/payment/factory.ts`

**Step 1: Now that `paymentProviderConfigs` table exists, clean up factory**

Remove the try-catch fallback added in Task 4. Factory should now cleanly query DB and fall back to env var only when no active config exists (null result), not on error.

**Step 2: Verify compiles**

**Step 3: Commit**

```bash
git add src/lib/payment/factory.ts
git commit -m "refactor(payment): clean up factory now that DB config exists"
```

---

## Task 19: Grep Audit — Find Remaining Xendit References

**Files:**
- Audit across entire `src/` and `convex/` directories

**Step 1: Search for remaining xendit references**

```bash
grep -rn "xendit" src/ convex/ --include="*.ts" --include="*.tsx" -i | grep -v node_modules | grep -v ".backup"
```

Expected: Only results in:
- `convex/migrations/` (historical seed data — OK to keep)
- `.references/` (documentation — OK to keep)
- `docs/` (documentation — OK to keep)

Any results in `src/app/`, `src/lib/`, `src/components/`, or `convex/billing/` = missed reference, fix it.

**Step 2: Fix any remaining references found**

**Step 3: Commit if changes made**

```bash
git add -A
git commit -m "chore: fix remaining xendit references"
```

---

## Task 20: Build Verification

**Step 1: Run TypeScript check**

```bash
npx tsc --noEmit --pretty
```

Expected: 0 errors

**Step 2: Run ESLint**

```bash
npm run lint
```

Expected: 0 errors (warnings OK)

**Step 3: Run build**

```bash
npm run build
```

Expected: Build succeeds

**Step 4: Fix any errors found, commit fixes**

```bash
git add -A
git commit -m "fix: resolve build errors from payment provider refactor"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Foundation | 1-4 | Types, Xendit adapter, Midtrans skeleton, factory |
| Schema | 5-8 | Schema rename, payments CRUD, subscriptions, provider config |
| API Routes | 9-13 | Shared function, topup refactor, subscribe refactor, webhook, delete old files |
| Peripheral | 14 | Receipt export |
| UI | 15-17 | Checkout BPP, checkout Pro, admin panel |
| Cleanup | 18-20 | Factory cleanup, grep audit, build verification |

Total: 20 tasks, ~20 commits.
