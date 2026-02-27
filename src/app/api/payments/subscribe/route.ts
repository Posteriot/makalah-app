/**
 * Subscribe Payment API Route
 * Creates a payment request for Pro subscription via payment provider abstraction
 */

import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import { createPaymentViaProvider } from "@/lib/payment/create-payment"
import { randomUUID } from "crypto"

type PlanType = "pro_monthly"
const PRO_PLAN_TYPE: PlanType = "pro_monthly"

interface SubscribeRequest {
  planType?: string
  paymentMethod: "qris" | "va" | "ewallet"
  vaChannel?: string
  ewalletChannel?: string
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

    // 3. Guard: reject unlimited/admin/superadmin only
    if (
      convexUser.subscriptionStatus === "unlimited" ||
      convexUser.role === "admin" ||
      convexUser.role === "superadmin"
    ) {
      return NextResponse.json(
        { error: "Tier akun lo tidak dapat menggunakan checkout Pro ini." },
        { status: 400 }
      )
    }

    // 4. Guard: reject if user has active subscription
    const activeSubscription = await fetchQuery(
      api.billing.subscriptions.getActiveSubscription,
      { userId: convexUser._id as Id<"users"> },
      convexOptions
    )
    if (activeSubscription) {
      return NextResponse.json(
        {
          error: "Kamu sudah memiliki langganan aktif.",
          code: "ACTIVE_SUBSCRIPTION",
          subscription: {
            id: activeSubscription._id,
            status: activeSubscription.status,
            currentPeriodEnd: activeSubscription.currentPeriodEnd,
            cancelAtPeriodEnd: activeSubscription.cancelAtPeriodEnd === true,
          },
        },
        { status: 409 }
      )
    }

    // 5. Parse request body
    const body = (await req.json()) as SubscribeRequest
    const planType: PlanType = PRO_PLAN_TYPE

    // Check if Pro tier is disabled
    const proDisabled = await fetchQuery(api.billing.pricingHelpers.isPlanDisabled, { slug: "pro" }, convexOptions)
    if (proDisabled) {
      return NextResponse.json(
        { error: "Paket Pro sedang tidak tersedia" },
        { status: 403 }
      )
    }

    // Get pricing from DB (fallback to constants)
    const pricing = await fetchQuery(api.billing.pricingHelpers.getProPricing, {}, convexOptions)
    const { priceIDR: amount, label: planLabel } = pricing
    const description = `${planLabel} — Makalah AI`

    // 6. Generate unique reference ID and idempotency key
    const referenceId = `sub_${convexUser._id}_${Date.now()}`
    const idempotencyKey = randomUUID()

    // 7. Check for duplicate (idempotency)
    const existing = await fetchQuery(api.billing.payments.checkIdempotency, { idempotencyKey }, convexOptions)
    if (existing.exists) {
      return NextResponse.json(
        { error: "Transaksi duplikat. Refresh halaman." },
        { status: 409 }
      )
    }

    // 8. Create payment via provider abstraction
    const appUrl = process.env.APP_URL || "http://localhost:3000"

    const result = await createPaymentViaProvider({
      userId: convexUser._id as Id<"users">,
      referenceId,
      amount,
      description,
      paymentMethod: body.paymentMethod,
      paymentType: "subscription_initial",
      metadata: {
        user_id: convexUser._id,
        betterauth_user_id: convexUser.betterAuthUserId,
        payment_type: "subscription_initial",
      },
      idempotencyKey,
      convexToken,
      appUrl,
      vaChannel: body.vaChannel,
      ewalletChannel: body.ewalletChannel,
      mobileNumber: body.mobileNumber,
      customerName: `${convexUser.firstName || ""} ${convexUser.lastName || ""}`.trim() || "Makalah User",
      planType: planType,
    })

    return NextResponse.json({ ...result, planType, planLabel })
  } catch (error) {
    console.error("[Subscribe] Error:", error)

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    )
  }
}
