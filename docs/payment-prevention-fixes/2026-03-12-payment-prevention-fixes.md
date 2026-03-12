# Payment Prevention Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 3 webhook bugs (invisible failures, no retry, env var trap) + add pre-flight health check + add "Lapor Masalah Pembayaran" escape hatch

**Architecture:** 3 bug fixes in existing webhook/adapter code, 1 new preflight module called by payment API routes, extend existing technicalReports infrastructure for payment scope, new button component rendered in checkout error states

**Tech Stack:** Next.js API routes, Sentry SDK, Convex schema/mutations, React (shadcn Dialog), Vitest

**Design doc:** `docs/payment-prevention-fixes/2026-03-12-payment-prevention-fixes-design.md`

---

### Task 1: M3 — Fix empty string env var trap in xendit.ts

**Files:**
- Modify: `src/lib/payment/adapters/xendit.ts:310`
- Test: `src/lib/payment/adapters/xendit.test.ts`

**Step 1: Write failing tests for empty string env var edge cases**

Add to `src/lib/payment/adapters/xendit.test.ts`:

```typescript
it("falls back to XENDIT_WEBHOOK_SECRET when XENDIT_WEBHOOK_TOKEN is empty string", async () => {
  process.env.XENDIT_WEBHOOK_TOKEN = ""
  process.env.XENDIT_WEBHOOK_SECRET = "fallback-secret"

  const adapter = new XenditAdapter()
  const request = new Request("https://makalah.ai/api/webhooks/payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-callback-token": "fallback-secret",
    },
    body: JSON.stringify({
      created: "2026-03-12T00:00:00.000Z",
      business_id: "biz_test",
      event: "payment.capture",
      api_version: "v3",
      data: {
        payment_id: "py_empty",
        payment_request_id: "pr_empty",
        reference_id: "ref_empty",
        status: "SUCCEEDED",
        request_amount: 80000,
        currency: "IDR",
        channel_code: "QRIS",
      },
    }),
  })

  const result = await adapter.verifyWebhook(request)
  expect(result).not.toBeNull()
  expect(result!.providerPaymentId).toBe("pr_empty")
})

it("falls back to XENDIT_WEBHOOK_SECRET when XENDIT_WEBHOOK_TOKEN is whitespace", async () => {
  process.env.XENDIT_WEBHOOK_TOKEN = "  \n  "
  process.env.XENDIT_WEBHOOK_SECRET = "fallback-secret"

  const adapter = new XenditAdapter()
  const request = new Request("https://makalah.ai/api/webhooks/payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-callback-token": "fallback-secret",
    },
    body: JSON.stringify({
      created: "2026-03-12T00:00:00.000Z",
      business_id: "biz_test",
      event: "payment.capture",
      api_version: "v3",
      data: {
        payment_id: "py_ws",
        payment_request_id: "pr_ws",
        reference_id: "ref_ws",
        status: "SUCCEEDED",
        request_amount: 80000,
        currency: "IDR",
        channel_code: "QRIS",
      },
    }),
  })

  const result = await adapter.verifyWebhook(request)
  expect(result).not.toBeNull()
})

it("returns null when both XENDIT_WEBHOOK_TOKEN and XENDIT_WEBHOOK_SECRET are empty", async () => {
  process.env.XENDIT_WEBHOOK_TOKEN = ""
  process.env.XENDIT_WEBHOOK_SECRET = ""

  const adapter = new XenditAdapter()
  const request = new Request("https://makalah.ai/api/webhooks/payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-callback-token": "any-token",
    },
    body: JSON.stringify({
      created: "2026-03-12T00:00:00.000Z",
      business_id: "biz_test",
      event: "payment.capture",
      api_version: "v3",
      data: {
        payment_id: "py_both",
        payment_request_id: "pr_both",
        reference_id: "ref_both",
        status: "SUCCEEDED",
        request_amount: 80000,
        currency: "IDR",
        channel_code: "QRIS",
      },
    }),
  })

  const result = await adapter.verifyWebhook(request)
  expect(result).toBeNull()
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/payment/adapters/xendit.test.ts`
Expected: First two tests FAIL (empty string `""` is falsy but the current `||` doesn't trim, so `" \n "` passes through as truthy)

**Step 3: Fix the env var resolution in verifyWebhook**

In `src/lib/payment/adapters/xendit.ts`, replace line 310:

```typescript
// BEFORE:
const expectedToken = process.env.XENDIT_WEBHOOK_TOKEN || process.env.XENDIT_WEBHOOK_SECRET

// AFTER:
const rawToken = process.env.XENDIT_WEBHOOK_TOKEN?.trim()
const rawSecret = process.env.XENDIT_WEBHOOK_SECRET?.trim()
const expectedToken = rawToken || rawSecret
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/payment/adapters/xendit.test.ts`
Expected: ALL tests PASS

**Step 5: Commit**

```bash
git add src/lib/payment/adapters/xendit.ts src/lib/payment/adapters/xendit.test.ts
git commit -m "fix(payment): guard against empty string env var in webhook token resolution

Adds .trim() to XENDIT_WEBHOOK_TOKEN and XENDIT_WEBHOOK_SECRET before
fallback comparison. Prevents the JS empty-string-is-falsy trap that
caused the Bambang incident (empty token fell through to wrong secret)."
```

---

### Task 2: M1 — Add Sentry logging to verifyWebhook failures

**Files:**
- Modify: `src/lib/payment/adapters/xendit.ts:307-320`

**Step 1: Add Sentry import and captureMessage calls**

At top of `src/lib/payment/adapters/xendit.ts`, add import:

```typescript
import * as Sentry from "@sentry/nextjs"
```

In the `verifyWebhook` method, update the two failure points:

```typescript
async verifyWebhook(request: Request): Promise<WebhookEvent | null> {
  // 1. Verify callback token
  const callbackToken = request.headers.get("x-callback-token")
  const rawToken = process.env.XENDIT_WEBHOOK_TOKEN?.trim()
  const rawSecret = process.env.XENDIT_WEBHOOK_SECRET?.trim()
  const expectedToken = rawToken || rawSecret

  if (!expectedToken) {
    console.error("[XenditAdapter] XENDIT_WEBHOOK_TOKEN or XENDIT_WEBHOOK_SECRET is not configured")
    Sentry.captureMessage("XENDIT_WEBHOOK_TOKEN/SECRET not configured — webhook cannot verify", {
      level: "fatal",
      tags: { "payment.adapter": "xendit", "payment.step": "verifyWebhook" },
    })
    return null
  }

  if (callbackToken !== expectedToken) {
    console.error("[XenditAdapter] Invalid callback token")
    Sentry.captureMessage("Xendit webhook token mismatch", {
      level: "error",
      tags: { "payment.adapter": "xendit", "payment.step": "verifyWebhook" },
      extra: {
        hasCallbackToken: !!callbackToken,
        expectedTokenSource: rawToken ? "XENDIT_WEBHOOK_TOKEN" : "XENDIT_WEBHOOK_SECRET",
      },
    })
    return null
  }

  // ... rest unchanged
```

**Step 2: Run existing tests to verify no regression**

Run: `npx vitest run src/lib/payment/adapters/xendit.test.ts`
Expected: ALL tests PASS (Sentry calls are fire-and-forget, don't affect return value)

**Step 3: Commit**

```bash
git add src/lib/payment/adapters/xendit.ts
git commit -m "fix(payment): add Sentry alerts for webhook verification failures

Previously verifyWebhook failures were only console.error — invisible
in production. Now fires Sentry fatal for missing config, error for
token mismatch."
```

---

### Task 3: M2 — Smart retry via non-200 status in webhook catch block

**Files:**
- Modify: `src/app/api/webhooks/payment/route.ts:66-78`

**Step 1: Update the catch block to return 500 for transient errors**

Replace the catch block (lines 66-78):

```typescript
  } catch (error) {
    console.error("[Payment Webhook] Processing error:", error)
    Sentry.captureException(error, {
      tags: {
        "api.route": "webhook.payment",
        "payment.status": event.status,
      },
      extra: { providerPaymentId: event.providerPaymentId },
    })

    // Permanent errors (missing data) → 200 so provider doesn't retry uselessly
    const message = error instanceof Error ? error.message : ""
    if (message.includes("not found") || message.includes("tidak ditemukan")) {
      return NextResponse.json({ status: "error", reason: message })
    }

    // Transient errors (DB timeout, network) → 500 so provider retries
    return NextResponse.json(
      { status: "error", reason: "transient" },
      { status: 500 }
    )
  }
```

**Step 2: Verify the build compiles**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -20` (or `npm run lint`)
Expected: No new type errors

**Step 3: Commit**

```bash
git add src/app/api/webhooks/payment/route.ts
git commit -m "fix(payment): return 500 for transient webhook errors to enable provider retry

Previously catch block always returned 200, preventing Xendit from
retrying. Now: permanent errors (not found) return 200, transient
errors return 500 so Xendit auto-retries."
```

---

### Task 4: P1 — Create pre-flight health check module

**Files:**
- Create: `src/lib/payment/preflight.ts`
- Test: `src/lib/payment/preflight.test.ts`

**Step 1: Write failing tests**

Create `src/lib/payment/preflight.test.ts`:

```typescript
import { beforeEach, describe, expect, it } from "vitest"
import { assertPaymentSystemReady } from "./preflight"

describe("assertPaymentSystemReady", () => {
  beforeEach(() => {
    process.env.XENDIT_SECRET_KEY = "xnd_test_key"
    process.env.XENDIT_WEBHOOK_TOKEN = "test-token"
    process.env.XENDIT_WEBHOOK_SECRET = ""
    process.env.CONVEX_INTERNAL_KEY = "test-internal-key"
  })

  it("returns ready when all env vars are set", () => {
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(true)
    expect(result.reason).toBeUndefined()
  })

  it("fails when XENDIT_SECRET_KEY is missing", () => {
    delete process.env.XENDIT_SECRET_KEY
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(false)
    expect(result.reason).toContain("XENDIT_SECRET_KEY")
  })

  it("fails when XENDIT_SECRET_KEY is empty string", () => {
    process.env.XENDIT_SECRET_KEY = ""
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(false)
  })

  it("fails when both webhook token and secret are missing", () => {
    delete process.env.XENDIT_WEBHOOK_TOKEN
    delete process.env.XENDIT_WEBHOOK_SECRET
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(false)
    expect(result.reason).toContain("webhook")
  })

  it("passes when only XENDIT_WEBHOOK_SECRET is set", () => {
    process.env.XENDIT_WEBHOOK_TOKEN = ""
    process.env.XENDIT_WEBHOOK_SECRET = "secret-value"
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(true)
  })

  it("fails when CONVEX_INTERNAL_KEY is missing", () => {
    delete process.env.CONVEX_INTERNAL_KEY
    const result = assertPaymentSystemReady()
    expect(result.ready).toBe(false)
    expect(result.reason).toContain("CONVEX_INTERNAL_KEY")
  })

  it("returns user-facing message in Indonesian", () => {
    delete process.env.XENDIT_SECRET_KEY
    const result = assertPaymentSystemReady()
    expect(result.userMessage).toContain("tidak tersedia")
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/payment/preflight.test.ts`
Expected: FAIL — module doesn't exist yet

**Step 3: Create the preflight module**

Create `src/lib/payment/preflight.ts`:

```typescript
import * as Sentry from "@sentry/nextjs"

interface PreflightResult {
  ready: boolean
  reason?: string
  userMessage?: string
}

interface PreflightCheck {
  name: string
  value: string | undefined
  reason: string
}

export function assertPaymentSystemReady(): PreflightResult {
  const checks: PreflightCheck[] = [
    {
      name: "XENDIT_SECRET_KEY",
      value: process.env.XENDIT_SECRET_KEY?.trim(),
      reason: "XENDIT_SECRET_KEY not configured",
    },
    {
      name: "XENDIT_WEBHOOK_TOKEN/SECRET",
      value:
        process.env.XENDIT_WEBHOOK_TOKEN?.trim() ||
        process.env.XENDIT_WEBHOOK_SECRET?.trim(),
      reason: "Xendit webhook token not configured",
    },
    {
      name: "CONVEX_INTERNAL_KEY",
      value: process.env.CONVEX_INTERNAL_KEY?.trim(),
      reason: "CONVEX_INTERNAL_KEY not configured",
    },
  ]

  for (const check of checks) {
    if (!check.value) {
      Sentry.captureMessage(`Payment preflight failed: ${check.reason}`, {
        level: "fatal",
        tags: { "payment.preflight": check.name },
      })
      return {
        ready: false,
        reason: check.reason,
        userMessage:
          "Sistem pembayaran sedang tidak tersedia. Silakan coba beberapa saat lagi.",
      }
    }
  }

  return { ready: true }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/payment/preflight.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/lib/payment/preflight.ts src/lib/payment/preflight.test.ts
git commit -m "feat(payment): add pre-flight health check for payment system readiness

Checks XENDIT_SECRET_KEY, webhook token, and CONVEX_INTERNAL_KEY
before allowing payment creation. Returns 503 with user-facing
message if any critical env var is missing."
```

---

### Task 5: P1 — Integrate pre-flight check in topup and subscribe routes

**Files:**
- Modify: `src/app/api/payments/topup/route.ts:29-47`
- Modify: `src/app/api/payments/subscribe/route.ts:30-48`

**Step 1: Add pre-flight check to topup route**

In `src/app/api/payments/topup/route.ts`, add import at top:

```typescript
import { assertPaymentSystemReady } from "@/lib/payment/preflight"
```

After the auth check block (after line 41 `const convexOptions = ...`), insert:

```typescript
    // Pre-flight: check payment system readiness
    const preflight = assertPaymentSystemReady()
    if (!preflight.ready) {
      return NextResponse.json(
        {
          error: preflight.userMessage,
          code: "PAYMENT_SYSTEM_UNAVAILABLE",
        },
        { status: 503 }
      )
    }
```

**Step 2: Add pre-flight check to subscribe route**

In `src/app/api/payments/subscribe/route.ts`, add same import and same block after auth check (after line 42 `const convexOptions = ...`).

**Step 3: Verify build compiles**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit**

```bash
git add src/app/api/payments/topup/route.ts src/app/api/payments/subscribe/route.ts
git commit -m "feat(payment): integrate pre-flight health check in topup and subscribe routes

Both routes now call assertPaymentSystemReady() before creating
payment. Returns 503 PAYMENT_SYSTEM_UNAVAILABLE if system not ready,
preventing user from paying into a broken pipeline."
```

---

### Task 6: P3 — Extend technicalReports schema for payment scope

**Files:**
- Modify: `convex/schema.ts:1199-1222`

**Step 1: Update the technicalReports table schema**

In `convex/schema.ts`, replace the `technicalReports` table definition (lines 1199-1222):

```typescript
  technicalReports: defineTable({
    userId: v.id("users"),
    scope: v.union(v.literal("chat"), v.literal("payment")),
    source: v.union(
      v.literal("chat-inline"),
      v.literal("footer-link"),
      v.literal("support-page"),
      v.literal("payment-checkout"),
      v.literal("payment-preflight-error")
    ),
    status: v.union(v.literal("open"), v.literal("triaged"), v.literal("resolved")),
    description: v.string(),
    issueCategory: v.optional(v.string()),
    conversationId: v.optional(v.id("conversations")),
    paperSessionId: v.optional(v.id("paperSessions")),
    contextSnapshot: v.optional(v.any()),
    paymentContext: v.optional(v.object({
      transactionId: v.optional(v.string()),
      amount: v.optional(v.number()),
      paymentMethod: v.optional(v.string()),
      providerPaymentId: v.optional(v.string()),
      errorCode: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
  })
    .index("by_user_created", ["userId", "createdAt"])
    .index("by_status_created", ["status", "createdAt"])
    .index("by_source_created", ["source", "createdAt"])
    .index("by_status_source_created", ["status", "source", "createdAt"])
    .index("by_conversation_created", ["conversationId", "createdAt"]),
```

**Step 2: Verify Convex schema pushes cleanly**

Run: `npx convex dev --once` (or check that `npx convex dev` running in background accepts the schema)
Expected: Schema updated successfully

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(payment): extend technicalReports schema for payment scope

Adds scope 'payment', sources 'payment-checkout' and
'payment-preflight-error', and optional paymentContext field
(transactionId, amount, paymentMethod, providerPaymentId, errorCode)."
```

---

### Task 7: P3 — Update technicalReports mutation, hook, and form for payment scope

**Files:**
- Modify: `convex/technicalReports.ts:93-186`
- Modify: `src/lib/hooks/useTechnicalReport.ts`
- Modify: `src/components/technical-report/TechnicalReportForm.tsx`

**Step 1: Update submitTechnicalReport mutation args and handler**

In `convex/technicalReports.ts`, update the `submitTechnicalReport` mutation:

Update args (lines 94-105):

```typescript
export const submitTechnicalReport = mutation({
  args: {
    source: v.union(
      v.literal("chat-inline"),
      v.literal("footer-link"),
      v.literal("support-page"),
      v.literal("payment-checkout"),
      v.literal("payment-preflight-error")
    ),
    description: v.string(),
    issueCategory: v.optional(v.string()),
    conversationId: v.optional(v.id("conversations")),
    paperSessionId: v.optional(v.id("paperSessions")),
    contextSnapshot: v.optional(v.any()),
    paymentContext: v.optional(v.object({
      transactionId: v.optional(v.string()),
      amount: v.optional(v.number()),
      paymentMethod: v.optional(v.string()),
      providerPaymentId: v.optional(v.string()),
      errorCode: v.optional(v.string()),
    })),
  },
```

In the handler, update the insert call (around line 153) to derive scope and include paymentContext:

```typescript
    const scope = args.source.startsWith("payment-") ? "payment" as const : "chat" as const

    const reportId = await ctx.db.insert("technicalReports", {
      userId: authUser._id,
      scope,
      source: args.source,
      status: "open",
      description,
      ...(issueCategory ? { issueCategory } : {}),
      ...(args.conversationId ? { conversationId: args.conversationId } : {}),
      ...(paperSessionId ? { paperSessionId } : {}),
      ...(args.contextSnapshot ? { contextSnapshot: args.contextSnapshot } : {}),
      ...(args.paymentContext ? { paymentContext: args.paymentContext } : {}),
      createdAt: now,
      updatedAt: now,
    })
```

Also: for payment scope, skip conversation/paperSession ownership validation (they're not relevant). Wrap the existing conversation/paperSession validation in a conditional:

```typescript
    if (scope === "chat") {
      if (args.conversationId) {
        const conversation = await ctx.db.get(args.conversationId)
        if (!conversation || conversation.userId !== authUser._id) {
          throw new Error("Conversation tidak ditemukan atau tidak memiliki akses.")
        }
      }

      // ... existing paperSessionId validation ...
    }
```

**Step 2: Update useTechnicalReport hook type**

In `src/lib/hooks/useTechnicalReport.ts`, update the source type and input type:

```typescript
export type TechnicalReportSource =
  | "chat-inline"
  | "footer-link"
  | "support-page"
  | "payment-checkout"
  | "payment-preflight-error"

export type SubmitTechnicalReportInput = {
  source: TechnicalReportSource
  description: string
  issueCategory?: string
  conversationId?: Id<"conversations">
  paperSessionId?: Id<"paperSessions">
  contextSnapshot?: Record<string, unknown>
  paymentContext?: {
    transactionId?: string
    amount?: number
    paymentMethod?: string
    providerPaymentId?: string
    errorCode?: string
  }
}
```

**Step 3: Update TechnicalReportForm to accept paymentContext prop**

In `src/components/technical-report/TechnicalReportForm.tsx`:

Update the props type to accept `paymentContext`:

```typescript
type TechnicalReportFormProps = {
  source: TechnicalReportSource
  initialConversationId?: Id<"conversations">
  initialPaperSessionId?: Id<"paperSessions">
  initialSnapshot?: Record<string, unknown>
  paymentContext?: {
    transactionId?: string
    amount?: number
    paymentMethod?: string
    providerPaymentId?: string
    errorCode?: string
  }
  onSubmitted?: (reportId: string) => void
}
```

Destructure it in the component:

```typescript
export function TechnicalReportForm({
  source,
  initialConversationId,
  initialPaperSessionId,
  initialSnapshot,
  paymentContext,
  onSubmitted,
}: TechnicalReportFormProps) {
```

In `handleSubmit`, pass `paymentContext` to `submitReport`:

```typescript
      const result = await submitReport({
        source,
        description: normalizedDescription,
        ...(resolvedConversationId ? { conversationId: resolvedConversationId } : {}),
        ...(resolvedPaperSessionId ? { paperSessionId: resolvedPaperSessionId } : {}),
        ...(includeDiagnostics
          ? {
              contextSnapshot: buildClientSnapshot({
                routePath: typeof window !== "undefined" ? window.location.pathname : undefined,
                ...(initialSnapshot ?? {}),
              }),
            }
          : {}),
        ...(paymentContext ? { paymentContext } : {}),
      })
```

Hide the "Sesi chat terkait" dropdown when source is payment:

```typescript
const isPaymentScope = source.startsWith("payment-")
```

Then wrap the chat session dropdown section with `{!isPaymentScope && ( ... )}`.

**Step 4: Verify build**

Run: `npm run lint`
Expected: No errors

**Step 5: Commit**

```bash
git add convex/technicalReports.ts src/lib/hooks/useTechnicalReport.ts src/components/technical-report/TechnicalReportForm.tsx
git commit -m "feat(payment): extend technicalReports mutation, hook, and form for payment scope

Mutation now accepts payment sources and paymentContext. Scope auto-
derived from source prefix. Chat-specific validations skipped for
payment reports. Form hides chat session dropdown for payment scope
and forwards paymentContext to mutation."
```

---

### Task 8: P3 — Create PaymentTechnicalReportButton component

**Files:**
- Create: `src/components/technical-report/PaymentTechnicalReportButton.tsx`

**Step 1: Create the component**

Create `src/components/technical-report/PaymentTechnicalReportButton.tsx`:

```tsx
"use client"

import { useState, useSyncExternalStore } from "react"
import { WarningTriangle } from "iconoir-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { TechnicalReportForm } from "./TechnicalReportForm"
import type { TechnicalReportSource } from "@/lib/hooks/useTechnicalReport"

interface PaymentContext {
  transactionId?: string
  amount?: number
  paymentMethod?: string
  providerPaymentId?: string
  errorCode?: string
}

interface PaymentTechnicalReportButtonProps {
  source: Extract<TechnicalReportSource, "payment-checkout" | "payment-preflight-error">
  paymentContext?: PaymentContext
  compact?: boolean
  className?: string
}

export function PaymentTechnicalReportButton({
  source,
  paymentContext,
  compact = false,
  className,
}: PaymentTechnicalReportButtonProps) {
  const [open, setOpen] = useState(false)
  const isHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const trigger = compact ? (
    <button
      type="button"
      disabled={!isHydrated}
      className={cn(
        "text-muted-foreground active:text-foreground transition-colors duration-150 disabled:pointer-events-none",
        className
      )}
      aria-label="Lapor masalah pembayaran"
      title="Lapor masalah pembayaran"
    >
      <WarningTriangle className="h-5 w-5" strokeWidth={1.5} />
    </button>
  ) : (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={!isHydrated}
      className={cn("h-8 rounded-action text-xs font-medium font-sans", className)}
    >
      <WarningTriangle className="h-3.5 w-3.5" />
      Lapor Masalah Pembayaran
    </Button>
  )

  if (!isHydrated) {
    return trigger
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-left text-sm sm:text-lg">
            Lapor Masalah Pembayaran
          </DialogTitle>
          <DialogDescription className="text-left text-xs leading-relaxed sm:text-sm">
            Ceritakan masalah pembayaran yang lo alami. Tim kami akan menindaklanjuti.
          </DialogDescription>
        </DialogHeader>

        <TechnicalReportForm
          source={source}
          paymentContext={paymentContext}
          onSubmitted={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
```

**Step 2: Export from index**

Check if `src/components/technical-report/index.ts` exists and add the export:

```typescript
export { PaymentTechnicalReportButton } from "./PaymentTechnicalReportButton"
```

**Step 3: Verify build compiles**

Run: `npm run lint`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/technical-report/PaymentTechnicalReportButton.tsx src/components/technical-report/index.ts
git commit -m "feat(payment): add PaymentTechnicalReportButton component

Dialog-based report button for payment error states. Reuses
TechnicalReportForm with payment source and paymentContext snapshot."
```

---

### Task 9: P1+P3 — Integrate pre-flight error + report button in BPP checkout

**Files:**
- Modify: `src/app/(onboarding)/checkout/bpp/page.tsx`

**Step 1: Add import**

At top of the file, add:

```typescript
import { PaymentTechnicalReportButton } from "@/components/technical-report/PaymentTechnicalReportButton"
```

**Step 2: Track error code in state**

After the existing `error` state (line 192), add:

```typescript
const [errorCode, setErrorCode] = useState<string | null>(null)
```

**Step 3: Detect PAYMENT_SYSTEM_UNAVAILABLE in handleTopUp**

In the `handleTopUp` callback, after `const data = await response.json()` and `if (!response.ok)`, update the error throw to capture the code:

```typescript
      if (!response.ok) {
        setErrorCode(data.code ?? null)
        throw new Error(data.error || "Gagal membuat pembayaran")
      }
```

Also reset errorCode at the start of handleTopUp where `setError(null)` is called:

```typescript
    setError(null)
    setErrorCode(null)
```

**Step 4: Render report button next to error banner**

Find the error banner section (around line 431-436):

```tsx
{error && (
  <CheckoutErrorBanner
    title="Gagal memproses pembayaran"
    message={error}
  />
)}
```

Replace with:

```tsx
{error && (
  <div className="space-y-2">
    <CheckoutErrorBanner
      title="Gagal memproses pembayaran"
      message={error}
    />
    {errorCode === "PAYMENT_SYSTEM_UNAVAILABLE" && (
      <PaymentTechnicalReportButton
        source="payment-preflight-error"
        paymentContext={{ errorCode }}
      />
    )}
  </div>
)}
```

**Step 5: Add report button in payment result view for expired/stuck state**

In the payment result section (around line 294-408), after the "Catatan" box (around line 402), add:

```tsx
<div className="text-center pt-2">
  <p className="text-narrative text-xs text-muted-foreground mb-1">
    Sudah bayar tapi status belum berubah?
  </p>
  <PaymentTechnicalReportButton
    source="payment-checkout"
    paymentContext={{
      transactionId: paymentResult.providerPaymentId,
      amount: paymentResult.amount,
      paymentMethod: selectedMethod,
      providerPaymentId: paymentResult.providerPaymentId,
    }}
  />
</div>
```

**Step 6: Verify build**

Run: `npm run lint`
Expected: No errors

**Step 7: Commit**

```bash
git add src/app/(onboarding)/checkout/bpp/page.tsx
git commit -m "feat(payment): add pre-flight error handling and report button to BPP checkout

Shows PaymentTechnicalReportButton when system unavailable (503) and
in payment waiting state for stuck/expired payments."
```

---

### Task 10: P1+P3 — Integrate pre-flight error + report button in Pro checkout

**Files:**
- Modify: `src/app/(onboarding)/checkout/pro/page.tsx`

**Step 1: Apply same changes as Task 9**

The Pro checkout page has the same structure. Apply identical changes:
1. Import `PaymentTechnicalReportButton`
2. Add `errorCode` state
3. Detect `PAYMENT_SYSTEM_UNAVAILABLE` code in payment creation error handler
4. Render report button next to error banner for preflight errors
5. Render report button in payment waiting/expired/failed states

For Pro checkout specifically, it also has status polling. Find the FAILED and EXPIRED conditional renders and add the report button there too:

For the failed state (where it shows "Pembayaran gagal" or destructive badge):

```tsx
<PaymentTechnicalReportButton
  source="payment-checkout"
  paymentContext={{
    transactionId: paymentResult.providerPaymentId,
    amount: paymentResult.amount,
    paymentMethod: selectedMethod,
    providerPaymentId: paymentResult.providerPaymentId,
    errorCode: "FAILED",
  }}
/>
```

For the expired state:

```tsx
<p className="text-narrative text-xs text-muted-foreground mb-1">
  Sudah bayar tapi status belum berubah?
</p>
<PaymentTechnicalReportButton
  source="payment-checkout"
  paymentContext={{
    transactionId: paymentResult.providerPaymentId,
    amount: paymentResult.amount,
    paymentMethod: selectedMethod,
    providerPaymentId: paymentResult.providerPaymentId,
    errorCode: "EXPIRED",
  }}
/>
```

**Step 2: Verify build**

Run: `npm run lint`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/(onboarding)/checkout/pro/page.tsx
git commit -m "feat(payment): add pre-flight error handling and report button to Pro checkout

Same treatment as BPP: preflight error shows report button, plus
report buttons in failed/expired/stuck payment states."
```

---

### Task 11: Final verification

**Step 1: Run all tests**

Run: `npm run test`
Expected: ALL PASS

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Run build**

Run: `npm run build`
Expected: Builds successfully

**Step 4: Manual verification checklist**

- [ ] `npx vitest run src/lib/payment/adapters/xendit.test.ts` — all pass
- [ ] `npx vitest run src/lib/payment/preflight.test.ts` — all pass
- [ ] Convex schema deploys cleanly (`npx convex dev --once`)
- [ ] BPP checkout page loads without errors
- [ ] Pro checkout page loads without errors

**Step 5: Commit if any fixes needed, then final summary commit is not needed (all tasks committed individually)**
