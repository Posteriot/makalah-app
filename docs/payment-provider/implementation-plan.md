# Payment Provider Xendit-Only Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove Midtrans from active payment runtime and admin surface while preserving the internal payment abstraction and keeping Xendit checkout flow fully operational.

**Architecture:** The implementation keeps the generic payment record model and generic webhook flow, but simplifies runtime provider resolution to Xendit only. Admin configuration is narrowed from provider switching to payment method settings, and both frontend and API routes are hardened so enabled methods are enforced consistently.

**Tech Stack:** Next.js 16 App Router, TypeScript, Convex, React 19, Vitest

---

## Implementation Tasks

### Task 1: Add Payment Runtime Settings Helpers

**Files:**
- Create: `src/lib/payment/runtime-settings.ts`
- Test: `src/lib/payment/runtime-settings.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest"
import {
  getEnabledCheckoutMethods,
  getRuntimeProviderLabel,
  isPaymentMethodEnabled,
  resolveCheckoutMethodSelection,
} from "./runtime-settings"

describe("payment runtime settings", () => {
  it("returns checkout methods in canonical order", () => {
    expect(getEnabledCheckoutMethods(["QRIS", "EWALLET"])).toEqual([
      "qris",
      "ewallet",
    ])
  })

  it("keeps current checkout method when still enabled", () => {
    expect(resolveCheckoutMethodSelection("ewallet", ["QRIS", "EWALLET"])).toBe(
      "ewallet"
    )
  })

  it("falls back to first enabled checkout method when current one is disabled", () => {
    expect(resolveCheckoutMethodSelection("va", ["QRIS", "EWALLET"])).toBe(
      "qris"
    )
  })

  it("returns null when no checkout method is enabled", () => {
    expect(resolveCheckoutMethodSelection("qris", [])).toBeNull()
  })

  it("validates payment method against enabled methods", () => {
    expect(isPaymentMethodEnabled("va", ["VIRTUAL_ACCOUNT"])).toBe(true)
    expect(isPaymentMethodEnabled("va", ["QRIS"])).toBe(false)
  })

  it("returns xendit as the only runtime provider label", () => {
    expect(getRuntimeProviderLabel()).toBe("Xendit")
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/payment/runtime-settings.test.ts
```

Expected:
- FAIL karena module belum ada

**Step 3: Write minimal implementation**

```ts
export type EnabledPaymentMethod = "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"
export type CheckoutPaymentMethod = "qris" | "va" | "ewallet"

const CHECKOUT_ORDER: Array<{
  enabled: EnabledPaymentMethod
  checkout: CheckoutPaymentMethod
}> = [
  { enabled: "QRIS", checkout: "qris" },
  { enabled: "VIRTUAL_ACCOUNT", checkout: "va" },
  { enabled: "EWALLET", checkout: "ewallet" },
]

export function getEnabledCheckoutMethods(
  enabledMethods: EnabledPaymentMethod[]
): CheckoutPaymentMethod[] {
  return CHECKOUT_ORDER
    .filter((item) => enabledMethods.includes(item.enabled))
    .map((item) => item.checkout)
}

export function resolveCheckoutMethodSelection(
  current: CheckoutPaymentMethod,
  enabledMethods: EnabledPaymentMethod[]
): CheckoutPaymentMethod | null {
  const enabled = getEnabledCheckoutMethods(enabledMethods)
  if (enabled.includes(current)) return current
  return enabled[0] ?? null
}

export function isPaymentMethodEnabled(
  method: CheckoutPaymentMethod,
  enabledMethods: EnabledPaymentMethod[]
): boolean {
  return getEnabledCheckoutMethods(enabledMethods).includes(method)
}

export function getRuntimeProviderLabel(): "Xendit" {
  return "Xendit"
}
```

**Step 4: Run test to verify it passes**

Run:
```bash
npx vitest run src/lib/payment/runtime-settings.test.ts
```

Expected:
- PASS semua test di file itu

**Step 5: Commit**

```bash
git add src/lib/payment/runtime-settings.ts src/lib/payment/runtime-settings.test.ts
git commit -m "test(payment): add xendit-only runtime settings helpers"
```

### Task 2: Refactor Admin Payment Settings Surface

**Files:**
- Modify: `src/components/admin/PaymentProviderManager.tsx`
- Modify: `convex/billing/paymentProviderConfigs.ts`
- Modify: `convex/schema.ts`
- Create: `src/components/admin/PaymentProviderManager.test.tsx`

**Step 1: Write the failing component test**

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PaymentProviderManager } from "./PaymentProviderManager"

const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mutate = vi.fn()

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockUseMutation(),
}))

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

describe("PaymentProviderManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMutation.mockReturnValue(mutate)
    mockUseQuery
      .mockReturnValueOnce({
        enabledMethods: ["QRIS", "VIRTUAL_ACCOUNT", "EWALLET"],
        webhookUrl: "/api/webhooks/payment",
      })
      .mockReturnValueOnce({
        xendit: {
          secretKey: true,
          webhookToken: true,
        },
      })
  })

  it("renders xendit-only settings without midtrans selector", () => {
    render(<PaymentProviderManager userId={"user_123" as never} />)

    expect(screen.getByText("Provider Aktif")).toBeInTheDocument()
    expect(screen.getByText("Xendit")).toBeInTheDocument()
    expect(screen.queryByText("Midtrans")).not.toBeInTheDocument()
  })

  it("saves enabled methods without activeProvider payload", async () => {
    render(<PaymentProviderManager userId={"user_123" as never} />)

    fireEvent.click(screen.getByLabelText("E-Wallet"))
    fireEvent.click(screen.getByRole("button", { name: /simpan konfigurasi/i }))

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        requestorUserId: "user_123",
        enabledMethods: ["QRIS", "VIRTUAL_ACCOUNT"],
      })
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/components/admin/PaymentProviderManager.test.tsx
```

Expected:
- FAIL karena komponen masih merender Midtrans dan mutation masih mengirim `activeProvider`

**Step 3: Write minimal implementation**

Update `src/components/admin/PaymentProviderManager.tsx`:

```tsx
const PAYMENT_METHODS = [
  { value: "QRIS" as const, label: "QRIS" },
  { value: "VIRTUAL_ACCOUNT" as const, label: "Virtual Account" },
  { value: "EWALLET" as const, label: "E-Wallet" },
]

function isXenditConfigured() {
  return Boolean(envStatus?.xendit.secretKey && envStatus?.xendit.webhookToken)
}

await upsertConfig({
  requestorUserId: userId,
  enabledMethods,
})
```

Update `convex/billing/paymentProviderConfigs.ts`:

```ts
export const getActiveConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("paymentProviderConfigs")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    return {
      enabledMethods: config?.enabledMethods ?? [
        "QRIS",
        "VIRTUAL_ACCOUNT",
        "EWALLET",
      ],
      webhookUrl: config?.webhookUrl ?? "/api/webhooks/payment",
      defaultExpiryMinutes: config?.defaultExpiryMinutes ?? 30,
    }
  },
})

export const upsertConfig = mutation({
  args: {
    requestorUserId: v.id("users"),
    enabledMethods: v.array(
      v.union(v.literal("QRIS"), v.literal("VIRTUAL_ACCOUNT"), v.literal("EWALLET"))
    ),
    webhookUrl: v.optional(v.string()),
    defaultExpiryMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // upsert without activeProvider
  },
})

export const checkProviderEnvStatus = query({
  args: { requestorUserId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorUserId, "admin")
    return {
      xendit: {
        secretKey: Boolean(process.env.XENDIT_SECRET_KEY),
        webhookToken: Boolean(
          process.env.XENDIT_WEBHOOK_TOKEN || process.env.XENDIT_WEBHOOK_SECRET
        ),
      },
    }
  },
})
```

Update `convex/schema.ts`:

```ts
paymentProviderConfigs: defineTable({
  enabledMethods: v.array(
    v.union(v.literal("QRIS"), v.literal("VIRTUAL_ACCOUNT"), v.literal("EWALLET"))
  ),
  webhookUrl: v.optional(v.string()),
  defaultExpiryMinutes: v.optional(v.number()),
  isActive: v.boolean(),
  updatedBy: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
}).index("by_active", ["isActive"])
```

**Step 4: Run test and typecheck**

Run:
```bash
npx vitest run src/components/admin/PaymentProviderManager.test.tsx
npm run typecheck
```

Expected:
- PASS untuk component test
- `typecheck` selesai tanpa error `activeProvider` yang tertinggal

**Step 5: Commit**

```bash
git add src/components/admin/PaymentProviderManager.tsx src/components/admin/PaymentProviderManager.test.tsx convex/billing/paymentProviderConfigs.ts convex/schema.ts
git commit -m "refactor(payment): narrow admin payment settings to xendit only"
```

### Task 3: Simplify Runtime Provider Types and Factory

**Files:**
- Modify: `src/lib/payment/types.ts`
- Modify: `src/lib/payment/factory.ts`
- Delete: `src/lib/payment/adapters/midtrans.ts`
- Create: `src/lib/payment/factory.test.ts`

**Step 1: Write the failing factory test**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest"

const fetchQuery = vi.fn()

vi.mock("convex/nextjs", () => ({
  fetchQuery: (...args: unknown[]) => fetchQuery(...args),
}))

describe("getProvider", () => {
  beforeEach(() => {
    vi.resetModules()
    fetchQuery.mockReset()
  })

  it("returns xendit adapter when config query fails", async () => {
    fetchQuery.mockRejectedValueOnce(new Error("db unavailable"))
    const { getProvider } = await import("./factory")

    const provider = await getProvider()

    expect(provider.name).toBe("xendit")
  })

  it("returns xendit adapter when config query succeeds", async () => {
    fetchQuery.mockResolvedValueOnce({
      enabledMethods: ["QRIS"],
      webhookUrl: "/api/webhooks/payment",
    })
    const { getProvider } = await import("./factory")

    const provider = await getProvider()

    expect(provider.name).toBe("xendit")
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/payment/factory.test.ts
```

Expected:
- FAIL karena factory masih punya branch Midtrans atau mengandalkan `activeProvider`

**Step 3: Write minimal implementation**

Update `src/lib/payment/types.ts`:

```ts
export type PaymentProviderName = "xendit"
```

Update `src/lib/payment/factory.ts`:

```ts
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import type { PaymentProvider } from "./types"
import { XenditAdapter } from "./adapters/xendit"

export async function getProvider(): Promise<PaymentProvider> {
  try {
    await fetchQuery(api.billing.paymentProviderConfigs.getActiveConfig, {})
  } catch {
    // ignore settings query failure, runtime provider is still Xendit
  }

  return new XenditAdapter()
}
```

Delete `src/lib/payment/adapters/midtrans.ts`.

**Step 4: Run test and regression scan**

Run:
```bash
npx vitest run src/lib/payment/factory.test.ts
rg -n "midtrans" src/lib/payment convex/schema.ts convex/billing/paymentProviderConfigs.ts
npm run typecheck
```

Expected:
- PASS untuk factory test
- tidak ada referensi runtime aktif Midtrans pada file payment utama
- typecheck bersih

**Step 5: Commit**

```bash
git add src/lib/payment/types.ts src/lib/payment/factory.ts src/lib/payment/factory.test.ts convex/schema.ts convex/billing/paymentProviderConfigs.ts
git rm src/lib/payment/adapters/midtrans.ts
git commit -m "refactor(payment): simplify runtime provider resolution to xendit"
```

### Task 4: Harden Checkout Pages Against Disabled Methods and Remove Midtrans Branding

**Files:**
- Modify: `src/app/(onboarding)/checkout/bpp/page.tsx`
- Modify: `src/app/(onboarding)/checkout/pro/page.tsx`
- Modify: `__tests__/billing-pro-card-ui.test.tsx`
- Create: `__tests__/billing-bpp-payment-config.test.tsx`
- Modify: `src/lib/payment/runtime-settings.ts`

**Step 1: Write the failing checkout tests**

Add to `__tests__/billing-pro-card-ui.test.tsx`:

```tsx
it("hides disabled methods and shows xendit-only payment copy", async () => {
  let objectQueryCount = 0

  mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
    if (args && typeof args === "object" && "slug" in args) {
      return { _id: "plan-pro", slug: "pro", isDisabled: false }
    }

    if (args === undefined) {
      objectQueryCount += 1
      if (objectQueryCount === 1) {
        return { priceIDR: 200_000, label: "Pro Bulanan" }
      }
      return {
        enabledMethods: ["QRIS"],
        webhookUrl: "/api/webhooks/payment",
      }
    }

    if (args && typeof args === "object" && "userId" in args) {
      return { remainingCredits: 0 }
    }

    return undefined
  })

  const { default: CheckoutPROPage } = await import("@/app/(onboarding)/checkout/pro/page")
  render(<CheckoutPROPage />)

  expect(screen.getByText("QRIS")).toBeInTheDocument()
  expect(screen.queryByText("Virtual Account")).not.toBeInTheDocument()
  expect(screen.queryByText("E-Wallet")).not.toBeInTheDocument()
  expect(screen.getByText(/pembayaran diproses oleh xendit/i)).toBeInTheDocument()
})
```

Create `__tests__/billing-bpp-payment-config.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// mock useCurrentUser, useOnboardingStatus, useQuery same pattern as checkout pro test

describe("Checkout BPP payment settings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("shows only enabled payment methods and xendit copy", async () => {
    const { default: CheckoutBPPPage } = await import("@/app/(onboarding)/checkout/bpp/page")
    render(<CheckoutBPPPage />)

    expect(screen.getByText("QRIS")).toBeInTheDocument()
    expect(screen.queryByText("Virtual Account")).not.toBeInTheDocument()
    expect(screen.getByText(/pembayaran diproses oleh xendit/i)).toBeInTheDocument()
  })
})
```

**Step 2: Run tests to verify they fail**

Run:
```bash
npx vitest run __tests__/billing-pro-card-ui.test.tsx __tests__/billing-bpp-payment-config.test.tsx
```

Expected:
- FAIL karena checkout masih punya copy/conditional Midtrans dan belum pakai helper fallback method

**Step 3: Write minimal implementation**

Update both checkout pages to use `runtime-settings.ts`:

```ts
import {
  getEnabledCheckoutMethods,
  getRuntimeProviderLabel,
  resolveCheckoutMethodSelection,
} from "@/lib/payment/runtime-settings"

const enabledMethods = paymentConfig?.enabledMethods ?? [
  "QRIS",
  "VIRTUAL_ACCOUNT",
  "EWALLET",
]

const availableMethods = getEnabledCheckoutMethods(enabledMethods)

useEffect(() => {
  const next = resolveCheckoutMethodSelection(selectedMethod, enabledMethods)
  if (next && next !== selectedMethod) {
    setSelectedMethod(next)
  }
}, [enabledMethods, selectedMethod])
```

Replace provider copy:

```tsx
Pembayaran diproses oleh {getRuntimeProviderLabel()}. Aman dan terenkripsi.
```

Render methods from `availableMethods`, not hardcoded `enabledMethods.includes(...)`.

**Step 4: Run tests and typecheck**

Run:
```bash
npx vitest run __tests__/billing-pro-card-ui.test.tsx __tests__/billing-bpp-payment-config.test.tsx src/lib/payment/runtime-settings.test.ts
npm run typecheck
```

Expected:
- PASS untuk checkout tests dan runtime helper tests
- typecheck bersih

**Step 5: Commit**

```bash
git add src/app/'(onboarding)'/checkout/bpp/page.tsx src/app/'(onboarding)'/checkout/pro/page.tsx __tests__/billing-pro-card-ui.test.tsx __tests__/billing-bpp-payment-config.test.tsx src/lib/payment/runtime-settings.ts
git commit -m "refactor(payment): harden checkout pages for xendit-only settings"
```

### Task 5: Enforce Enabled Payment Methods in API Routes

**Files:**
- Modify: `src/app/api/payments/topup/route.ts`
- Modify: `src/app/api/payments/subscribe/route.ts`
- Create: `src/lib/payment/request-validation.ts`
- Test: `src/lib/payment/request-validation.test.ts`

**Step 1: Write the failing validation test**

```ts
import { describe, expect, it } from "vitest"
import { assertEnabledPaymentMethod } from "./request-validation"

describe("assertEnabledPaymentMethod", () => {
  it("allows enabled payment methods", () => {
    expect(() =>
      assertEnabledPaymentMethod("qris", ["QRIS", "EWALLET"])
    ).not.toThrow()
  })

  it("throws when payment method is disabled", () => {
    expect(() =>
      assertEnabledPaymentMethod("va", ["QRIS"])
    ).toThrow("Metode pembayaran tidak tersedia")
  })
})
```

**Step 2: Run test to verify it fails**

Run:
```bash
npx vitest run src/lib/payment/request-validation.test.ts
```

Expected:
- FAIL karena helper belum ada

**Step 3: Write minimal implementation**

Create `src/lib/payment/request-validation.ts`:

```ts
import {
  type EnabledPaymentMethod,
  isPaymentMethodEnabled,
  type CheckoutPaymentMethod,
} from "./runtime-settings"

export function assertEnabledPaymentMethod(
  method: CheckoutPaymentMethod,
  enabledMethods: EnabledPaymentMethod[]
): void {
  if (!isPaymentMethodEnabled(method, enabledMethods)) {
    throw new Error("Metode pembayaran tidak tersedia")
  }
}
```

Use it in both routes:

```ts
const paymentConfig = await fetchQuery(
  api.billing.paymentProviderConfigs.getActiveConfig,
  {},
  convexOptions
)

assertEnabledPaymentMethod(paymentMethod, paymentConfig.enabledMethods)
```

Map thrown error to `400` response:

```ts
if (error instanceof Error && error.message === "Metode pembayaran tidak tersedia") {
  return NextResponse.json({ error: error.message }, { status: 400 })
}
```

**Step 4: Run test and targeted route verification**

Run:
```bash
npx vitest run src/lib/payment/request-validation.test.ts
npm run typecheck
```

Expected:
- PASS untuk validation test
- typecheck bersih setelah kedua route memakai helper

**Step 5: Commit**

```bash
git add src/lib/payment/request-validation.ts src/lib/payment/request-validation.test.ts src/app/api/payments/topup/route.ts src/app/api/payments/subscribe/route.ts
git commit -m "feat(payment): enforce enabled payment methods in api routes"
```

### Task 6: Final Verification and Documentation Cleanup

**Files:**
- Modify: `docs/payment-provider/design.md`
- Modify: `docs/payment-provider/implementation-plan.md`

**Step 1: Confirm the canonical docs set**

Make sure the canonical docs now live only in `docs/payment-provider/`:

- `docs/payment-provider/design.md`
- `docs/payment-provider/implementation-plan.md`

Delete any duplicate plan copy under `docs/plans/`.

**Step 2: Run regression search against runtime paths only**

Run:
```bash
rg -n "midtrans|activeProvider" src/lib/payment src/app/api/payments src/components/admin convex/billing/paymentProviderConfigs.ts convex/schema.ts --glob '!convex/migrations/**'
```

Expected:
- no runtime references to `midtrans`
- no runtime references to `activeProvider`

**Step 3: Run final verification commands**

Run:
```bash
npx vitest run src/lib/payment/runtime-settings.test.ts src/components/admin/PaymentProviderManager.test.tsx src/lib/payment/factory.test.ts src/lib/payment/request-validation.test.ts __tests__/billing-pro-card-ui.test.tsx __tests__/billing-bpp-payment-config.test.tsx
npm run typecheck
```

Expected:
- PASS untuk seluruh targeted tests
- PASS untuk typecheck

**Step 4: Manual smoke checklist**

Verify manually in dev server:

```text
1. Open /admin?tab=payment and confirm only Xendit is shown.
2. Disable one payment method and save settings.
3. Open /checkout/bpp and /checkout/pro and confirm disabled method is hidden.
4. Trigger payment creation with an enabled method and confirm Xendit response still renders.
5. Confirm webhook URL displayed remains /api/webhooks/payment.
```

Expected:
- admin UI jujur terhadap runtime capability
- checkout follows admin settings
- Xendit flow remains intact

**Step 5: Commit**

```bash
git add docs/payment-provider/design.md docs/payment-provider/implementation-plan.md
git commit -m "docs(payment): consolidate canonical xendit-only payment docs"
```
