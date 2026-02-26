/**
 * Subscribe Payment API Route
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
// DB pricing via pricingHelpers (no hardcoded constants)

type PlanType = "pro_monthly"
const PRO_PLAN_TYPE: PlanType = "pro_monthly"

interface SubscribeRequest {
  planType?: string
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
    const { paymentMethod, vaChannel, ewalletChannel, mobileNumber } = body
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

    // 7. Generate unique reference ID and idempotency key
    const referenceId = `sub_${convexUser._id}_${Date.now()}`
    const idempotencyKey = randomUUID()

    // 8. Check for duplicate (idempotency)
    const existing = await fetchQuery(api.billing.payments.checkIdempotency, { idempotencyKey }, convexOptions)
    if (existing.exists) {
      return NextResponse.json(
        { error: "Transaksi duplikat. Refresh halaman." },
        { status: 409 }
      )
    }

    // 9. Prepare metadata
    const metadata = {
      user_id: convexUser._id,
      betterauth_user_id: convexUser.betterAuthUserId,
      payment_type: "subscription_initial",
    }

    // 10. Create Xendit payment based on method
    let xenditResponse
    let paymentMethodType: "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"
    let paymentChannel: string | undefined

    const appUrl = process.env.APP_URL || "http://localhost:3000"

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
          expiresMinutes: 60 * 24, // 24 hours
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

        // OVO requires mobile number, GoPay requires redirect URLs
        if (ewalletChannel === "OVO") {
          if (!mobileNumber) {
            return NextResponse.json(
              { error: "Nomor HP wajib diisi untuk pembayaran OVO" },
              { status: 400 }
            )
          }
          // Normalize mobile number to E.164 format
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
            successReturnUrl: `${appUrl}/checkout/pro?status=success`,
            failureReturnUrl: `${appUrl}/checkout/pro?status=failed`,
            cancelReturnUrl: `${appUrl}/checkout/pro`,
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

    // 11. Calculate expiry time
    const expiresAt = xenditResponse.channel_properties?.expires_at
      ? new Date(xenditResponse.channel_properties.expires_at).getTime()
      : Date.now() + 30 * 60 * 1000 // 30 minutes default

    // 12. Save payment to Convex
    const paymentId = await fetchMutation(api.billing.payments.createPayment, {
      userId: convexUser._id as Id<"users">,
      xenditPaymentRequestId: xenditResponse.payment_request_id,
      xenditReferenceId: referenceId,
      amount,
      paymentMethod: paymentMethodType,
      paymentChannel,
      paymentType: "subscription_initial",
      planType,
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

    // 13. Build response based on payment method
    const responseData: {
      paymentId: string
      convexPaymentId: string
      xenditId: string
      status: string
      amount: number
      expiresAt: number
      // Plan info
      planType: string
      planLabel: string
      // QRIS specific
      qrString?: string
      qrCodeUrl?: string
      // VA specific
      vaNumber?: string
      vaChannel?: string
      // E-Wallet specific
      redirectUrl?: string
    } = {
      paymentId,
      convexPaymentId: paymentId,
      xenditId: xenditResponse.payment_request_id,
      status: xenditResponse.status,
      amount,
      expiresAt,
      planType,
      planLabel,
    }

    // Add method-specific data from actions array (API v2024-11-11)
    if (paymentMethodType === "QRIS") {
      // Get QR string from actions
      const qrAction = xenditResponse.actions?.find(
        (a) => a.type === "PRESENT_TO_CUSTOMER" && a.descriptor === "QR_STRING"
      )
      if (qrAction?.value) {
        responseData.qrString = qrAction.value
      }
    }

    if (paymentMethodType === "VIRTUAL_ACCOUNT") {
      // Get VA number from actions
      const vaAction = xenditResponse.actions?.find(
        (a) => a.type === "PRESENT_TO_CUSTOMER" && a.descriptor === "VIRTUAL_ACCOUNT_NUMBER"
      )
      if (vaAction?.value) {
        responseData.vaNumber = vaAction.value
      }
      responseData.vaChannel = xenditResponse.channel_code
    }

    if (paymentMethodType === "EWALLET") {
      // Log actions for debugging
      console.log("[Subscribe] E-Wallet actions:", JSON.stringify(xenditResponse.actions, null, 2))

      // Get redirect URL from actions
      const redirectAction = xenditResponse.actions?.find(
        (a) => a.type === "REDIRECT_CUSTOMER" && (a.descriptor === "WEB_URL" || a.descriptor === "MOBILE_URL")
      )
      if (redirectAction?.value) {
        responseData.redirectUrl = redirectAction.value
      } else {
        console.log("[Subscribe] No redirect URL found for E-Wallet. Channel:", paymentChannel)
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("[Subscribe] Error:", error)

    // Handle specific Xendit errors
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
