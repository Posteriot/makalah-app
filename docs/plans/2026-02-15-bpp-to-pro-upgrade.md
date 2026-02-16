# BPP→Pro Full Subscription Flow — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable BPP users to upgrade to Pro via one-time Xendit payment, with webhook activation, expiry cron, cancellation UI, and smart downgrade (BPP if credits remain, else Gratis).

**Architecture:** Subscribe endpoint mirrors existing topup route (one-time Xendit payment, not recurring). Webhook handler activates subscription on payment success. Convex cron checks daily for expired subscriptions and sends reminder emails 3 days before expiry. Plans page shows active subscription state with cancel/reactivate. Sidebar adds "Upgrade ke Pro" for BPP.

**Tech Stack:** Next.js API routes, Convex mutations/queries/crons, Xendit Payment Request API v2024-11-11, Resend email, pdfkit (existing)

---

## Task 1: Create Subscribe API Endpoint

**Files:**
- Create: `src/app/api/payments/subscribe/route.ts`
- Reference: `src/app/api/payments/topup/route.ts` (template to mirror)
- Reference: `src/lib/xendit/client.ts` (Xendit payment functions)
- Reference: `convex/billing/constants.ts` (SUBSCRIPTION_PRICING)

**Context:** The plans page (`/subscription/plans`) already calls `POST /api/payments/subscribe` (line 150) but the endpoint doesn't exist yet (404). This mirrors the topup route but uses `paymentType: "subscription_initial"` and subscription pricing instead of credit packages.

**Step 1:** Create the subscribe route file:

```typescript
/**
 * Pro Subscription Payment API Route
 * Creates a Xendit payment request for Pro subscription
 */

import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import {
  createQRISPayment,
  createVAPayment,
  createOVOPayment,
  createGopayPayment,
  type VAChannel,
  type EWalletChannel,
} from "@/lib/xendit/client"
import { randomUUID } from "crypto"
import { SUBSCRIPTION_PRICING } from "@convex/billing/constants"

type PlanType = keyof typeof SUBSCRIPTION_PRICING

interface SubscribeRequest {
  planType: PlanType
  paymentMethod: "qris" | "va" | "ewallet"
  vaChannel?: VAChannel
  ewalletChannel?: EWalletChannel
  mobileNumber?: string
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const isAuthed = await isAuthenticated()
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const convexToken = await getToken()
    if (!convexToken) {
      return NextResponse.json({ error: "Convex token missing" }, { status: 500 })
    }
    const convexOptions = { token: convexToken }

    // 2. Get Convex user
    const convexUser = await fetchQuery(api.users.getMyUser, {}, convexOptions)
    if (!convexUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 3. Verify user is not already Pro or Unlimited
    const currentTier = convexUser.subscriptionStatus
    if (currentTier === "pro" || convexUser.role === "admin" || convexUser.role === "superadmin") {
      return NextResponse.json(
        { error: "Anda sudah memiliki langganan aktif" },
        { status: 400 }
      )
    }

    // 4. Check no existing active subscription
    const existingSub = await fetchQuery(
      api.billing.subscriptions.getActiveSubscription,
      { userId: convexUser._id },
      convexOptions
    )
    if (existingSub) {
      return NextResponse.json(
        { error: "Sudah ada langganan aktif" },
        { status: 400 }
      )
    }

    // 5. Parse and validate request
    const body = (await req.json()) as SubscribeRequest
    const { planType, paymentMethod, vaChannel, ewalletChannel, mobileNumber } = body

    if (!SUBSCRIPTION_PRICING[planType]) {
      return NextResponse.json(
        { error: "Paket langganan tidak valid" },
        { status: 400 }
      )
    }

    const pricing = SUBSCRIPTION_PRICING[planType]
    const amount = pricing.priceIDR

    // 6. Generate references
    const referenceId = `sub_${convexUser._id}_${Date.now()}`
    const idempotencyKey = randomUUID()

    // 7. Check idempotency
    const existing = await fetchQuery(
      api.billing.payments.checkIdempotency,
      { idempotencyKey },
      convexOptions
    )
    if (existing.exists) {
      return NextResponse.json(
        { error: "Transaksi duplikat. Refresh halaman." },
        { status: 409 }
      )
    }

    // 8. Metadata
    const metadata = {
      user_id: convexUser._id,
      betterauth_user_id: convexUser.betterAuthUserId,
      payment_type: "subscription_initial",
      plan_type: planType,
    }

    // 9. Create Xendit payment (same switch as topup)
    let xenditResponse
    let paymentMethodType: "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"
    let paymentChannel: string | undefined

    const appUrl = process.env.APP_URL || "http://localhost:3000"
    const description = `${pricing.label} — Makalah AI`

    switch (paymentMethod) {
      case "qris":
        xenditResponse = await createQRISPayment({
          referenceId,
          amount,
          description,
          metadata,
          expiresMinutes: 30,
        })
        paymentMethodType = "QRIS"
        break

      case "va":
        if (!vaChannel) {
          return NextResponse.json(
            { error: "Virtual Account channel wajib dipilih" },
            { status: 400 }
          )
        }
        xenditResponse = await createVAPayment({
          referenceId,
          amount,
          channelCode: vaChannel,
          customerName: `${convexUser.firstName || ""} ${convexUser.lastName || ""}`.trim() || "Makalah User",
          description,
          metadata,
          expiresMinutes: 60 * 24,
        })
        paymentMethodType = "VIRTUAL_ACCOUNT"
        paymentChannel = vaChannel
        break

      case "ewallet":
        if (!ewalletChannel) {
          return NextResponse.json(
            { error: "E-Wallet channel wajib dipilih" },
            { status: 400 }
          )
        }

        if (ewalletChannel === "OVO") {
          if (!mobileNumber) {
            return NextResponse.json(
              { error: "Nomor HP wajib diisi untuk pembayaran OVO" },
              { status: 400 }
            )
          }
          let normalizedNumber = mobileNumber.replace(/\s+/g, "").replace(/-/g, "")
          if (normalizedNumber.startsWith("08")) {
            normalizedNumber = "+62" + normalizedNumber.slice(1)
          } else if (normalizedNumber.startsWith("8")) {
            normalizedNumber = "+62" + normalizedNumber
          } else if (!normalizedNumber.startsWith("+")) {
            normalizedNumber = "+" + normalizedNumber
          }

          xenditResponse = await createOVOPayment({
            referenceId,
            amount,
            mobileNumber: normalizedNumber,
            description,
            metadata,
          })
        } else if (ewalletChannel === "GOPAY") {
          xenditResponse = await createGopayPayment({
            referenceId,
            amount,
            successReturnUrl: `${appUrl}/subscription/plans?status=success`,
            failureReturnUrl: `${appUrl}/subscription/plans?status=failed`,
            cancelReturnUrl: `${appUrl}/subscription/plans`,
            description,
            metadata,
          })
        } else {
          return NextResponse.json(
            { error: "E-Wallet channel tidak didukung" },
            { status: 400 }
          )
        }

        paymentMethodType = "EWALLET"
        paymentChannel = ewalletChannel
        break

      default:
        return NextResponse.json(
          { error: "Metode pembayaran tidak valid" },
          { status: 400 }
        )
    }

    // 10. Expiry
    const expiresAt = xenditResponse.channel_properties?.expires_at
      ? new Date(xenditResponse.channel_properties.expires_at).getTime()
      : Date.now() + 30 * 60 * 1000

    // 11. Save payment to Convex
    const paymentId = await fetchMutation(api.billing.payments.createPayment, {
      userId: convexUser._id as Id<"users">,
      xenditPaymentRequestId: xenditResponse.payment_request_id,
      xenditReferenceId: referenceId,
      amount,
      paymentMethod: paymentMethodType,
      paymentChannel,
      paymentType: "subscription_initial",
      description,
      idempotencyKey,
      expiredAt: expiresAt,
    }, convexOptions)

    console.log("[Subscribe] Payment created:", {
      paymentId,
      xenditId: xenditResponse.payment_request_id,
      method: paymentMethodType,
      amount,
      planType,
    })

    // 12. Build response (same shape as topup for shared PaymentResultSection)
    const responseData: {
      paymentId: string
      convexPaymentId: string
      xenditId: string
      status: string
      amount: number
      expiresAt: number
      planType: string
      planLabel: string
      qrString?: string
      qrCodeUrl?: string
      vaNumber?: string
      vaChannel?: string
      redirectUrl?: string
    } = {
      paymentId,
      convexPaymentId: paymentId,
      xenditId: xenditResponse.payment_request_id,
      status: xenditResponse.status,
      amount,
      expiresAt,
      planType,
      planLabel: pricing.label,
    }

    // Method-specific data
    if (paymentMethodType === "QRIS") {
      const qrAction = xenditResponse.actions?.find(
        (a) => a.type === "PRESENT_TO_CUSTOMER" && a.descriptor === "QR_STRING"
      )
      if (qrAction?.value) responseData.qrString = qrAction.value
    }

    if (paymentMethodType === "VIRTUAL_ACCOUNT") {
      const vaAction = xenditResponse.actions?.find(
        (a) => a.type === "PRESENT_TO_CUSTOMER" && a.descriptor === "VIRTUAL_ACCOUNT_NUMBER"
      )
      if (vaAction?.value) responseData.vaNumber = vaAction.value
      responseData.vaChannel = xenditResponse.channel_code
    }

    if (paymentMethodType === "EWALLET") {
      const redirectAction = xenditResponse.actions?.find(
        (a) => a.type === "REDIRECT_CUSTOMER" && (a.descriptor === "WEB_URL" || a.descriptor === "MOBILE_URL")
      )
      if (redirectAction?.value) responseData.redirectUrl = redirectAction.value
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("[Subscribe] Error:", error)
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    )
  }
}
```

**Step 2:** Add `planType` to payments `createPayment` validator. Currently the mutation in `convex/billing/payments.ts` does NOT have a `planType` arg. We need to store it for the webhook to know which plan was purchased.

In `convex/billing/payments.ts`, add to `createPayment` args (after `description`):

```typescript
planType: v.optional(v.union(
  v.literal("pro_monthly"),
  v.literal("pro_yearly")
)),
```

And in the handler's `ctx.db.insert("payments", { ... })`, add:

```typescript
planType: args.planType,
```

Also update `convex/schema.ts` payments table to include `planType` field:

```typescript
planType: v.optional(v.union(
  v.literal("pro_monthly"),
  v.literal("pro_yearly")
)),
```

Then update the subscribe route to pass `planType` in the `createPayment` call.

**Step 3:** Verify: `npx tsc --noEmit` — zero errors

**Step 4:** Push schema: `npx convex dev --once`

**Step 5:** Commit:
```bash
git add src/app/api/payments/subscribe/ convex/billing/payments.ts convex/schema.ts
git commit -m "feat: add Pro subscription payment endpoint"
```

---

## Task 2: Implement Webhook Handler for Subscription Activation

**Files:**
- Modify: `src/app/api/webhooks/xendit/route.ts:206-210`
- Reference: `convex/billing/subscriptions.ts` (createSubscription, renewSubscription)
- Reference: `src/lib/email/sendPaymentEmail.ts` (sendPaymentSuccessEmail)

**Context:** The webhook handler at lines 206-210 has a TODO for `subscription_initial` and `subscription_renewal`. When Xendit confirms payment success, we need to: (1) call `createSubscription` to activate Pro, (2) reset monthly quota for the new period, (3) send confirmation email with plan label.

**Step 1:** Replace the TODO block in `handlePaymentSuccess` (lines 206-210):

```typescript
case "subscription_initial": {
  // Get planType from payment record metadata or from the payment itself
  const planType = (payment as any).planType ?? "pro_monthly"

  // Create subscription record + set user to "pro"
  const subscriptionId = await fetchMutation(
    api.billing.subscriptions.createSubscription,
    {
      userId: payment.userId as Id<"users">,
      planType: planType as "pro_monthly" | "pro_yearly",
    },
    // No convexOptions here — use internalKey pattern
  )

  console.log(`[Xendit] Subscription created:`, {
    userId: payment.userId,
    subscriptionId,
    planType,
  })

  // Reset/initialize monthly quota for Pro
  await fetchMutation(api.billing.quotas.initializeQuota, {
    userId: payment.userId as Id<"users">,
    internalKey,
  })

  break
}

case "subscription_renewal": {
  // Find active subscription for user
  const subscription = await fetchQuery(
    api.billing.subscriptions.getActiveSubscription,
    { userId: payment.userId as Id<"users"> },
  )

  if (subscription) {
    await fetchMutation(api.billing.subscriptions.renewSubscription, {
      subscriptionId: subscription._id,
    })

    // Reset monthly quota
    await fetchMutation(api.billing.quotas.initializeQuota, {
      userId: payment.userId as Id<"users">,
      internalKey,
    })

    console.log(`[Xendit] Subscription renewed:`, {
      userId: payment.userId,
      subscriptionId: subscription._id,
    })
  } else {
    console.warn(`[Xendit] No active subscription found for renewal: ${payment.userId}`)
  }
  break
}
```

**Step 2:** The `createSubscription` mutation currently doesn't accept `internalKey` — it's a normal mutation expecting auth context. But the webhook runs server-side without user auth. We need to add an `internalKey` variant.

Create a new mutation `createSubscriptionInternal` in `convex/billing/subscriptions.ts`:

```typescript
/**
 * Create subscription (internal — called from webhook, no auth context)
 */
export const createSubscriptionInternal = mutation({
  args: {
    userId: v.id("users"),
    planType: v.union(
      v.literal("pro_monthly"),
      v.literal("pro_yearly")
    ),
    internalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.CONVEX_INTERNAL_KEY
    if (!expected || args.internalKey !== expected) {
      throw new Error("Unauthorized")
    }

    // Reuse exact same logic as createSubscription handler
    const now = Date.now()
    const pricing = SUBSCRIPTION_PRICING[args.planType]

    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + pricing.intervalMonths)

    const existingSub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first()

    if (existingSub) {
      throw new Error("User already has an active subscription")
    }

    const subscriptionId = await ctx.db.insert("subscriptions", {
      userId: args.userId,
      planType: args.planType,
      priceIDR: pricing.priceIDR,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd.getTime(),
      nextBillingDate: periodEnd.getTime(),
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.patch(args.userId, {
      subscriptionStatus: "pro",
      updatedAt: now,
    })

    return subscriptionId
  },
})
```

**Step 3:** Also add `renewSubscriptionInternal` with internalKey:

```typescript
/**
 * Renew subscription (internal — called from webhook)
 */
export const renewSubscriptionInternal = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    internalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expected = process.env.CONVEX_INTERNAL_KEY
    if (!expected || args.internalKey !== expected) {
      throw new Error("Unauthorized")
    }

    const subscription = await ctx.db.get(args.subscriptionId)
    if (!subscription) throw new Error("Subscription not found")

    const now = Date.now()
    const pricing = SUBSCRIPTION_PRICING[subscription.planType]

    const newPeriodStart = subscription.currentPeriodEnd
    const newPeriodEnd = new Date(newPeriodStart)
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + pricing.intervalMonths)

    await ctx.db.patch(args.subscriptionId, {
      status: "active",
      cancelAtPeriodEnd: undefined,
      canceledAt: undefined,
      cancelReason: undefined,
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd.getTime(),
      nextBillingDate: newPeriodEnd.getTime(),
      updatedAt: now,
    })

    return { newPeriodStart, newPeriodEnd: newPeriodEnd.getTime() }
  },
})
```

**Step 4:** Update the webhook handler to use internal mutations with `internalKey`:

```typescript
case "subscription_initial": {
  const planType = (payment as any).planType ?? "pro_monthly"

  const subscriptionId = await fetchMutation(
    api.billing.subscriptions.createSubscriptionInternal,
    {
      userId: payment.userId as Id<"users">,
      planType: planType as "pro_monthly" | "pro_yearly",
      internalKey,
    }
  )

  console.log(`[Xendit] Subscription created:`, {
    userId: payment.userId,
    subscriptionId,
    planType,
  })
  break
}

case "subscription_renewal": {
  const subscription = await fetchQuery(
    api.billing.subscriptions.getActiveSubscription,
    { userId: payment.userId as Id<"users"> }
  )

  if (subscription) {
    await fetchMutation(
      api.billing.subscriptions.renewSubscriptionInternal,
      { subscriptionId: subscription._id, internalKey }
    )
    console.log(`[Xendit] Subscription renewed:`, { userId: payment.userId })
  } else {
    console.warn(`[Xendit] No active subscription for renewal: ${payment.userId}`)
  }
  break
}
```

**Step 5:** Update the email in `handlePaymentSuccess` — when `paymentType` is subscription, pass `subscriptionPlanLabel`:

After the switch block (around line 216), before the email section, add:

```typescript
// Set subscription plan label for email
let subscriptionPlanLabel: string | undefined
if (paymentType === "subscription_initial" || paymentType === "subscription_renewal") {
  const planType = (payment as any).planType ?? "pro_monthly"
  subscriptionPlanLabel = SUBSCRIPTION_PRICING[planType as keyof typeof SUBSCRIPTION_PRICING]?.label
}
```

Then in the `sendPaymentSuccessEmail` call, add the param:

```typescript
subscriptionPlanLabel,
```

Also import `SUBSCRIPTION_PRICING` at the top of the webhook file.

**Step 6:** Also update the `handleSubscriptionRenewal` function (currently a no-op at line 317). This function handles `recurring.cycle.succeeded` events — but since we're doing manual renewal, this will not be used yet. Leave it as-is for now, but update the TODO comment to note it's for future auto-recurring.

**Step 7:** Verify: `npx tsc --noEmit` — zero errors

**Step 8:** Push: `npx convex dev --once`

**Step 9:** Commit:
```bash
git add src/app/api/webhooks/xendit/route.ts convex/billing/subscriptions.ts
git commit -m "feat: implement webhook handler for Pro subscription activation"
```

---

## Task 3: Fix expireSubscription Downgrade Logic (BPP vs Gratis)

**Files:**
- Modify: `convex/billing/subscriptions.ts` — `expireSubscription` mutation (line 198-223)

**Context:** Currently `expireSubscription` always downgrades to `"free"`. Per design, if user has remaining BPP credits → downgrade to `"bpp"`, else → `"free"`.

**Step 1:** Update `expireSubscription` handler:

```typescript
export const expireSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    internalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Allow both auth'd and internal calls
    if (args.internalKey) {
      const expected = process.env.CONVEX_INTERNAL_KEY
      if (!expected || args.internalKey !== expected) {
        throw new Error("Unauthorized")
      }
    }

    const subscription = await ctx.db.get(args.subscriptionId)
    if (!subscription) throw new Error("Subscription not found")

    const now = Date.now()

    // Mark subscription as expired
    await ctx.db.patch(args.subscriptionId, {
      status: "expired",
      updatedAt: now,
    })

    // Check if user has BPP credit balance
    const creditBalance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", subscription.userId))
      .first()

    const hasCredits = creditBalance && creditBalance.remainingCredits > 0
    const newTier = hasCredits ? "bpp" : "free"

    await ctx.db.patch(subscription.userId, {
      subscriptionStatus: newTier,
      updatedAt: now,
    })

    console.log(`[Subscription] Expired:`, {
      userId: subscription.userId,
      subscriptionId: args.subscriptionId,
      downgradedTo: newTier,
      remainingCredits: creditBalance?.remainingCredits ?? 0,
    })

    return { expired: true, downgradedTo: newTier }
  },
})
```

**Step 2:** Also update `cancelSubscription` immediate cancellation (line 170-177) to use same logic:

```typescript
// Immediate cancellation — check credits for downgrade tier
const creditBalance = await ctx.db
  .query("creditBalances")
  .withIndex("by_user", (q) => q.eq("userId", args.userId))
  .first()

const hasCredits = creditBalance && creditBalance.remainingCredits > 0
const newTier = hasCredits ? "bpp" : "free"

await ctx.db.patch(args.userId, {
  subscriptionStatus: newTier,
  updatedAt: now,
})
```

**Step 3:** Verify: `npx tsc --noEmit` — zero errors

**Step 4:** Push: `npx convex dev --once`

**Step 5:** Commit:
```bash
git add convex/billing/subscriptions.ts
git commit -m "fix: smart downgrade on subscription expire (BPP if credits, else Gratis)"
```

---

## Task 4: Create Convex Cron for Subscription Expiry + Reminder

**Files:**
- Create: `convex/crons.ts`
- Create: `convex/billing/subscriptionCron.ts` (action that runs the logic)
- Reference: `convex/billing/subscriptions.ts` (expireSubscription, getActiveSubscription)

**Context:** Convex crons run scheduled functions. We need a daily check for: (1) expired subscriptions → downgrade, (2) subscriptions expiring in 3 days → send reminder email.

**Step 1:** Create `convex/billing/subscriptionCron.ts`:

```typescript
/**
 * Subscription Cron Jobs
 * - Expire overdue subscriptions
 * - Send reminder emails 3 days before expiry
 */

import { internalMutation, internalAction } from "../_generated/server"
import { internal } from "../_generated/api"
import { SUBSCRIPTION_PRICING } from "./constants"

/**
 * Check and expire overdue subscriptions
 * Called daily by cron
 */
export const checkExpiredSubscriptions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()

    // Find active subscriptions past their period end
    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("currentPeriodEnd"), now)
        )
      )
      .collect()

    const results = []
    for (const sub of activeSubscriptions) {
      // Check if user has BPP credit balance for smart downgrade
      const creditBalance = await ctx.db
        .query("creditBalances")
        .withIndex("by_user", (q) => q.eq("userId", sub.userId))
        .first()

      const hasCredits = creditBalance && creditBalance.remainingCredits > 0
      const newTier = hasCredits ? "bpp" : "free"

      // Expire the subscription
      await ctx.db.patch(sub._id, {
        status: "expired",
        updatedAt: now,
      })

      // Downgrade user
      await ctx.db.patch(sub.userId, {
        subscriptionStatus: newTier,
        updatedAt: now,
      })

      results.push({
        userId: sub.userId,
        subscriptionId: sub._id,
        downgradedTo: newTier,
      })
    }

    if (results.length > 0) {
      console.log(`[Cron] Expired ${results.length} subscriptions:`, results)
    }

    return { expired: results.length }
  },
})

/**
 * Collect subscriptions expiring within 3 days for reminder emails
 * Returns list of { userId, email, planType, expiresAt }
 */
export const getExpiringSubscriptions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()
    const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000
    const twoDaysFromNow = now + 2 * 24 * 60 * 60 * 1000

    // Find subscriptions expiring in 2-3 days window
    // (window prevents sending duplicate reminders on consecutive cron runs)
    const expiringSubs = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.gte(q.field("currentPeriodEnd"), twoDaysFromNow),
          q.lte(q.field("currentPeriodEnd"), threeDaysFromNow)
        )
      )
      .collect()

    const results = []
    for (const sub of expiringSubs) {
      // Skip if user already marked cancel
      if (sub.cancelAtPeriodEnd) continue

      const user = await ctx.db.get(sub.userId)
      if (user?.email) {
        results.push({
          email: user.email,
          userName: user.firstName || undefined,
          planLabel: SUBSCRIPTION_PRICING[sub.planType]?.label ?? "Pro",
          expiresAt: sub.currentPeriodEnd,
        })
      }
    }

    return results
  },
})

/**
 * Send reminder emails (action — can use external APIs)
 */
export const sendExpiryReminders = internalAction({
  handler: async (ctx) => {
    // Get expiring subscriptions
    const expiring = await ctx.runMutation(
      internal.billing.subscriptionCron.getExpiringSubscriptions
    )

    if (expiring.length === 0) return { sent: 0 }

    // Import email function dynamically (actions can use Node APIs)
    const { sendSubscriptionReminderEmail } = await import(
      "../../src/lib/email/sendSubscriptionEmail"
    )

    let sent = 0
    for (const sub of expiring) {
      try {
        await sendSubscriptionReminderEmail({
          to: sub.email,
          userName: sub.userName,
          planLabel: sub.planLabel,
          expiresAt: sub.expiresAt,
        })
        sent++
      } catch (err) {
        console.error(`[Cron] Failed to send reminder to ${sub.email}:`, err)
      }
    }

    console.log(`[Cron] Sent ${sent} expiry reminders`)
    return { sent }
  },
})
```

**Step 2:** Wait — Convex actions cannot import from `src/` (they run in Convex runtime, not Next.js). The email sending needs to happen via a Next.js API route or be done entirely within Convex using the Resend HTTP API directly.

**Simpler approach:** Skip the email reminder for now. The cron only handles expiry. Reminder emails can be added later via a separate Next.js cron endpoint or Convex HTTP action.

Simplify `convex/billing/subscriptionCron.ts` to just the expiry check:

```typescript
/**
 * Subscription Cron: Expire overdue subscriptions
 */

import { internalMutation } from "../_generated/server"

export const checkExpiredSubscriptions = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()

    // Find active subscriptions past their period end
    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("currentPeriodEnd"), now)
        )
      )
      .collect()

    const results = []
    for (const sub of activeSubscriptions) {
      const creditBalance = await ctx.db
        .query("creditBalances")
        .withIndex("by_user", (q) => q.eq("userId", sub.userId))
        .first()

      const hasCredits = creditBalance && creditBalance.remainingCredits > 0
      const newTier = hasCredits ? "bpp" : "free"

      await ctx.db.patch(sub._id, {
        status: "expired",
        updatedAt: now,
      })

      await ctx.db.patch(sub.userId, {
        subscriptionStatus: newTier,
        updatedAt: now,
      })

      results.push({
        userId: sub.userId,
        subscriptionId: sub._id,
        downgradedTo: newTier,
      })
    }

    if (results.length > 0) {
      console.log(`[Cron] Expired ${results.length} subscriptions:`, results)
    }

    return { expired: results.length }
  },
})
```

**Step 3:** Create `convex/crons.ts`:

```typescript
import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Check for expired subscriptions daily at 00:05 WIB (17:05 UTC)
crons.daily(
  "check-expired-subscriptions",
  { hourUTC: 17, minuteUTC: 5 },
  internal.billing.subscriptionCron.checkExpiredSubscriptions
)

export default crons
```

**Step 4:** Verify: `npx tsc --noEmit` — zero errors

**Step 5:** Push: `npx convex dev --once`

**Step 6:** Commit:
```bash
git add convex/crons.ts convex/billing/subscriptionCron.ts
git commit -m "feat: add daily cron for subscription expiry with smart downgrade"
```

---

## Task 5: Add "Upgrade ke Pro" in BPP Sidebar

**Files:**
- Modify: `src/app/(dashboard)/subscription/layout.tsx:22-59`

**Context:** Current sidebar shows "Top Up" for BPP but no upgrade path. Add "Upgrade ke Pro" menu item for BPP users, linking to `/subscription/plans`.

**Step 1:** In `getSidebarItems` function, add upgrade option for BPP. Insert after the "Top Up" block (line 50-56):

```typescript
// Upgrade ke Pro: BPP only (Gratis has generic "Upgrade")
if (tier === "bpp") {
  items.push({
    href: "/subscription/plans",
    label: "Upgrade ke Pro",
    icon: Sparks,
  })
}
```

**Step 2:** Add `Sparks` to the import from iconoir-react (line 9).

**Step 3:** Update the `isActive` logic in `SidebarNav` — the "Upgrade ke Pro" item should be active when on `/subscription/plans`:

The existing `isActive` logic for `/subscription/upgrade` already matches `/subscription/plans/*` (lines 80-86). Since BPP won't have the "Upgrade" item (that's Gratis-only), we need to add plans matching for the new BPP item:

```typescript
if (item.href === "/subscription/plans") {
  return pathname === "/subscription/plans" || pathname.startsWith("/subscription/plans/")
}
```

**Step 4:** Verify: `npx tsc --noEmit` — zero errors

**Step 5:** Commit:
```bash
git add src/app/(dashboard)/subscription/layout.tsx
git commit -m "feat: add Upgrade ke Pro menu item for BPP users"
```

---

## Task 6: Update Plans Page for Active Subscription State

**Files:**
- Modify: `src/app/(dashboard)/subscription/plans/page.tsx`

**Context:** When a Pro user visits the plans page, they should see their active subscription info + cancel button instead of the checkout form. BPP users should see a note that their credits will be preserved.

**Step 1:** Add subscription status query. After `creditBalance` query (line 96-99), add:

```typescript
// Check active subscription (for Pro users)
const subscriptionStatus = useQuery(
  api.billing.subscriptions.checkSubscriptionStatus,
  user?._id ? { userId: user._id } : "skip"
)
```

**Step 2:** Add cancel/reactivate state and handler:

```typescript
const [isCanceling, setIsCanceling] = useState(false)
const [isReactivating, setIsReactivating] = useState(false)
const [showCancelConfirm, setShowCancelConfirm] = useState(false)
```

**Step 3:** Add cancel handler using `fetchMutation`:

```typescript
const handleCancelSubscription = useCallback(async () => {
  if (!user?._id || isCanceling) return
  setIsCanceling(true)
  try {
    const response = await fetch("/api/payments/cancel-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cancelAtPeriodEnd: true }),
    })
    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || "Gagal membatalkan langganan")
    }
    toast.success("Langganan akan berakhir di akhir periode")
    setShowCancelConfirm(false)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
  } finally {
    setIsCanceling(false)
  }
}, [user?._id, isCanceling])
```

Wait — we'd need a cancel endpoint too. Simpler approach: use Convex mutation directly via `useMutation`.

**Step 3 (revised):** Import `useMutation` from convex/react. Use direct mutation:

```typescript
import { useQuery, useMutation } from "convex/react"

// In component:
const cancelSubscription = useMutation(api.billing.subscriptions.cancelSubscription)
const reactivateSubscription = useMutation(api.billing.subscriptions.reactivateSubscription)

const handleCancelSubscription = useCallback(async () => {
  if (!user?._id || isCanceling) return
  setIsCanceling(true)
  try {
    await cancelSubscription({
      userId: user._id,
      cancelAtPeriodEnd: true,
    })
    toast.success("Langganan akan berakhir di akhir periode")
    setShowCancelConfirm(false)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
  } finally {
    setIsCanceling(false)
  }
}, [user?._id, isCanceling, cancelSubscription])

const handleReactivate = useCallback(async () => {
  if (!subscriptionStatus?.subscriptionId || isReactivating) return
  setIsReactivating(true)
  try {
    // reactivateSubscription needs subscriptionId — we need to get it
    // checkSubscriptionStatus doesn't return subscriptionId. We need to add it.
    toast.success("Langganan diaktifkan kembali!")
  } catch (err) {
    toast.error(err instanceof Error ? err.message : "Terjadi kesalahan")
  } finally {
    setIsReactivating(false)
  }
}, [subscriptionStatus, isReactivating])
```

**Step 4:** We need `checkSubscriptionStatus` to also return `subscriptionId`. Modify `convex/billing/subscriptions.ts:checkSubscriptionStatus` to include it:

```typescript
return {
  hasSubscription: true,
  subscriptionId: subscription._id, // ADD THIS
  status: subscription.status,
  // ... rest unchanged
}
```

**Step 5:** In the plans page JSX, add Pro active subscription view. Inside the Pro plan card section (around line 304), change the condition:

```typescript
{/* Pro Plan */}
{isPro && currentTier === "pro" && subscriptionStatus?.hasSubscription && (
  <ActiveSubscriptionView
    subscriptionStatus={subscriptionStatus}
    showCancelConfirm={showCancelConfirm}
    setShowCancelConfirm={setShowCancelConfirm}
    isCanceling={isCanceling}
    isReactivating={isReactivating}
    onCancel={handleCancelSubscription}
    onReactivate={handleReactivate}
  />
)}

{isPro && !isCurrentTier && currentTier !== "unlimited" && (
  <>
    {/* BPP credit preservation note */}
    {currentTier === "bpp" && currentCredits > 0 && (
      <p className="text-xs text-muted-foreground mt-2 px-1">
        Sisa {currentCredits} kredit BPP Anda tetap tersimpan.
      </p>
    )}
    {/* Existing checkout button + expanded section */}
    ...
  </>
)}
```

**Step 6:** Create `ActiveSubscriptionView` component within the same file:

```typescript
function ActiveSubscriptionView({
  subscriptionStatus,
  showCancelConfirm,
  setShowCancelConfirm,
  isCanceling,
  isReactivating,
  onCancel,
  onReactivate,
}: {
  subscriptionStatus: any
  showCancelConfirm: boolean
  setShowCancelConfirm: (v: boolean) => void
  isCanceling: boolean
  isReactivating: boolean
  onCancel: () => void
  onReactivate: () => void
}) {
  const daysRemaining = subscriptionStatus.daysRemaining ?? 0
  const isPendingCancel = subscriptionStatus.isPendingCancel
  const periodEnd = subscriptionStatus.currentPeriodEnd
    ? new Date(subscriptionStatus.currentPeriodEnd).toLocaleDateString("id-ID", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "-"

  return (
    <div className="mt-auto space-y-3">
      {/* Active status badge */}
      <div className={cn(
        "flex items-center justify-center gap-2 py-2 rounded-action text-sm font-medium",
        isPendingCancel
          ? "bg-amber-500/10 text-amber-600 border border-amber-500/30"
          : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
      )}>
        <CheckCircle className="h-4 w-4" />
        {isPendingCancel ? "Akan berakhir" : "Aktif"}
      </div>

      {/* Period info */}
      <div className="text-center text-xs text-muted-foreground space-y-0.5">
        <p>Berlaku sampai: <span className="font-mono font-medium text-foreground">{periodEnd}</span></p>
        <p>{daysRemaining} hari tersisa</p>
      </div>

      {/* Cancel / Reactivate */}
      {isPendingCancel ? (
        <button
          onClick={onReactivate}
          disabled={isReactivating}
          className="focus-ring w-full py-2 rounded-action text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isReactivating ? "Memproses..." : "Aktifkan Kembali"}
        </button>
      ) : showCancelConfirm ? (
        <div className="space-y-2 p-3 bg-destructive/5 border border-destructive/20 rounded-action">
          <p className="text-xs text-muted-foreground">
            Pro akan tetap aktif sampai {periodEnd}. Setelah itu akun kembali ke BPP/Gratis.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={isCanceling}
              className="flex-1 py-1.5 rounded-action text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {isCanceling ? "Membatalkan..." : "Ya, Batalkan"}
            </button>
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="flex-1 py-1.5 rounded-action text-xs font-medium border border-border hover:bg-muted"
            >
              Tidak
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="w-full py-2 rounded-action text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
        >
          Batalkan Langganan
        </button>
      )}
    </div>
  )
}
```

**Step 7:** Verify: `npx tsc --noEmit` — zero errors

**Step 8:** Commit:
```bash
git add src/app/(dashboard)/subscription/plans/page.tsx convex/billing/subscriptions.ts
git commit -m "feat: add active subscription view with cancel/reactivate on plans page"
```

---

## Task 7: Final Verification

**Step 1:** TypeScript:
```bash
npx tsc --noEmit
```
Expected: zero errors

**Step 2:** Tests:
```bash
npm run test
```
Expected: all tests pass (no regressions)

**Step 3:** Push to Convex:
```bash
npx convex dev --once
```

**Step 4:** Manual verification checklist:

| Scenario | Expected |
|----------|----------|
| BPP user → Sidebar | Shows "Upgrade ke Pro" menu item |
| BPP user → Plans page | Pro card has checkout, note about credits preserved |
| BPP user → Pro checkout → QRIS | Creates payment, shows QR code |
| Webhook: subscription_initial SUCCEEDED | Creates subscription, user becomes Pro |
| Pro user → Plans page | Shows active subscription info + cancel button |
| Pro user → Cancel | Shows confirmation, marks cancelAtPeriodEnd |
| Pro user → Reactivate | Removes cancelAtPeriodEnd |
| Cron (daily) | Expires overdue subscriptions, downgrades to BPP/Gratis |
| Pro expire + has credits | Downgrade to BPP |
| Pro expire + no credits | Downgrade to Gratis |

**Step 5:** Commit final (if adjustments needed)

---

## File Summary

| Task | File | Change |
|------|------|--------|
| 1 | `src/app/api/payments/subscribe/route.ts` | NEW — Subscribe payment endpoint |
| 1 | `convex/billing/payments.ts` | Add planType to createPayment |
| 1 | `convex/schema.ts` | Add planType to payments table |
| 2 | `src/app/api/webhooks/xendit/route.ts` | Implement subscription_initial/renewal handlers |
| 2 | `convex/billing/subscriptions.ts` | Add internal mutations with internalKey |
| 3 | `convex/billing/subscriptions.ts` | Smart downgrade logic (BPP vs Gratis) |
| 4 | `convex/crons.ts` | NEW — Daily cron for subscription expiry |
| 4 | `convex/billing/subscriptionCron.ts` | NEW — Expiry check mutation |
| 5 | `src/app/(dashboard)/subscription/layout.tsx` | Add "Upgrade ke Pro" for BPP sidebar |
| 6 | `src/app/(dashboard)/subscription/plans/page.tsx` | Active subscription view + cancel UI |
| 6 | `convex/billing/subscriptions.ts` | Return subscriptionId in checkSubscriptionStatus |
