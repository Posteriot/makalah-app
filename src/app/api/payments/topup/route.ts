/**
 * Top Up Payment API Route
 * Creates a Xendit payment request for credit top-up
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
import { isValidPackageType, getPackageByType } from "@convex/billing/constants"

// Request body type
interface TopUpRequest {
  packageType: "paper" | "extension_s" | "extension_m"
  paymentMethod: "qris" | "va" | "ewallet"
  vaChannel?: VAChannel
  ewalletChannel?: EWalletChannel
  mobileNumber?: string
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const session = await isAuthenticated()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const convexToken = await getToken()
    if (!convexToken) {
      return NextResponse.json({ error: "Convex token missing" }, { status: 500 })
    }
    const convexOptions = { token: convexToken }

    // 2. Get Convex user
    const convexUser = await fetchQuery(api.users.getUserByBetterAuthId, { betterAuthUserId: session.user.id }, convexOptions)
    if (!convexUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // 3. Parse request body
    const body = (await req.json()) as TopUpRequest
    const { packageType, paymentMethod, vaChannel, ewalletChannel, mobileNumber } = body

    // 4. Validate package type
    if (!isValidPackageType(packageType)) {
      return NextResponse.json(
        { error: `Paket tidak valid. Pilih: paper, extension_s, atau extension_m` },
        { status: 400 }
      )
    }

    const pkg = getPackageByType(packageType)
    if (!pkg) {
      return NextResponse.json(
        { error: "Paket tidak ditemukan" },
        { status: 400 }
      )
    }

    const { credits, priceIDR: amount, label: packageLabel } = pkg

    // 5. Generate unique reference ID and idempotency key
    const referenceId = `topup_${convexUser._id}_${Date.now()}`
    const idempotencyKey = randomUUID()

    // 6. Check for duplicate (idempotency)
    const existing = await fetchQuery(api.billing.payments.checkIdempotency, { idempotencyKey }, convexOptions)
    if (existing.exists) {
      return NextResponse.json(
        { error: "Transaksi duplikat. Refresh halaman." },
        { status: 409 }
      )
    }

    // 7. Prepare metadata
    const metadata = {
      user_id: convexUser._id,
      betterauth_user_id: session.user.id,
      payment_type: "credit_topup",
    }

    // 8. Create Xendit payment based on method
    let xenditResponse
    let paymentMethodType: "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"
    let paymentChannel: string | undefined

    const appUrl = process.env.APP_URL || "http://localhost:3000"

    switch (paymentMethod) {
      case "qris":
        xenditResponse = await createQRISPayment({
          referenceId,
          amount,
          description: `${packageLabel} (${credits} kredit)`,
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
          description: `${packageLabel} (${credits} kredit)`,
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
            description: `${packageLabel} (${credits} kredit)`,
            metadata,
          })
        } else if (ewalletChannel === "GOPAY") {
          xenditResponse = await createGopayPayment({
            referenceId,
            amount,
            successReturnUrl: `${appUrl}/subscription/topup/success`,
            failureReturnUrl: `${appUrl}/subscription/topup/failed`,
            cancelReturnUrl: `${appUrl}/subscription/topup`,
            description: `${packageLabel} (${credits} kredit)`,
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

    // 9. Calculate expiry time
    const expiresAt = xenditResponse.channel_properties?.expires_at
      ? new Date(xenditResponse.channel_properties.expires_at).getTime()
      : Date.now() + 30 * 60 * 1000 // 30 minutes default

    // 10. Save payment to Convex
    const paymentId = await fetchMutation(api.billing.payments.createPayment, {
      userId: convexUser._id as Id<"users">,
      xenditPaymentRequestId: xenditResponse.payment_request_id,
      xenditReferenceId: referenceId,
      amount,
      paymentMethod: paymentMethodType,
      paymentChannel,
      paymentType: "credit_topup",
      packageType,
      credits,
      description: `${packageLabel} (${credits} kredit)`,
      idempotencyKey,
      expiredAt: expiresAt,
    }, convexOptions)

    console.log("[TopUp] Payment created:", {
      paymentId,
      xenditId: xenditResponse.payment_request_id,
      method: paymentMethodType,
      amount,
      packageType,
      credits,
    })

    // 11. Build response based on payment method
    const responseData: {
      paymentId: string
      convexPaymentId: string
      xenditId: string
      status: string
      amount: number
      expiresAt: number
      // Package info
      packageType: string
      credits: number
      packageLabel: string
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
      packageType,
      credits,
      packageLabel,
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
      console.log("[TopUp] E-Wallet actions:", JSON.stringify(xenditResponse.actions, null, 2))

      // Get redirect URL from actions
      const redirectAction = xenditResponse.actions?.find(
        (a) => a.type === "REDIRECT_CUSTOMER" && (a.descriptor === "WEB_URL" || a.descriptor === "MOBILE_URL")
      )
      if (redirectAction?.value) {
        responseData.redirectUrl = redirectAction.value
      } else {
        console.log("[TopUp] No redirect URL found for E-Wallet. Channel:", paymentChannel)
      }
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error("[TopUp] Error:", error)

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
