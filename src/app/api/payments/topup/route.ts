/**
 * Top Up Payment API Route
 * Creates a payment request for BPP credit top-up via the shared payment provider abstraction.
 */

import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { randomUUID } from "crypto"
import { isValidPackageType } from "@convex/billing/constants"
import { createPaymentViaProvider } from "@/lib/payment/create-payment"

// Request body type
interface TopUpRequest {
  packageType: "paper"
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

    // 3. Parse request body
    const body = (await req.json()) as TopUpRequest
    const { packageType, paymentMethod, vaChannel, ewalletChannel, mobileNumber } = body

    // 4. Validate package type
    if (!isValidPackageType(packageType)) {
      return NextResponse.json(
        { error: `Paket tidak valid. Hanya tersedia: paper (300 kredit)` },
        { status: 400 }
      )
    }

    // 5. Check if BPP tier is disabled
    const bppDisabled = await fetchQuery(api.billing.pricingHelpers.isPlanDisabled, { slug: "bpp" }, convexOptions)
    if (bppDisabled) {
      return NextResponse.json(
        { error: "Paket BPP sedang tidak tersedia" },
        { status: 403 }
      )
    }

    // 6. Get pricing from DB (fallback to constants)
    const pkg = await fetchQuery(api.billing.pricingHelpers.getBppCreditPackage, { packageType }, convexOptions)
    if (!pkg) {
      return NextResponse.json(
        { error: "Paket tidak ditemukan" },
        { status: 400 }
      )
    }
    const { credits, priceIDR: amount, label: packageLabel } = pkg

    // 7. Generate unique reference ID and idempotency key
    const referenceId = `topup_${convexUser._id}_${Date.now()}`
    const idempotencyKey = randomUUID()

    // 8. Check for duplicate (idempotency)
    const existing = await fetchQuery(api.billing.payments.checkIdempotency, { idempotencyKey }, convexOptions)
    if (existing.exists) {
      return NextResponse.json(
        { error: "Transaksi duplikat. Refresh halaman." },
        { status: 409 }
      )
    }

    // 9. Create payment via provider abstraction
    const appUrl = process.env.APP_URL || "http://localhost:3000"
    const description = `${packageLabel} (${credits} kredit)`

    const result = await createPaymentViaProvider({
      userId: convexUser._id as Id<"users">,
      referenceId,
      amount,
      description,
      paymentMethod,
      paymentType: "credit_topup",
      metadata: {
        user_id: convexUser._id,
        betterauth_user_id: convexUser.betterAuthUserId,
        payment_type: "credit_topup",
      },
      idempotencyKey,
      convexToken,
      appUrl,
      vaChannel,
      ewalletChannel,
      mobileNumber,
      customerName: `${convexUser.firstName || ""} ${convexUser.lastName || ""}`.trim() || undefined,
      packageType,
      credits,
    })

    console.log("[TopUp] Payment created:", {
      paymentId: result.paymentId,
      providerPaymentId: result.providerPaymentId,
      provider: result.providerName,
      method: paymentMethod,
      amount,
      packageType,
      credits,
    })

    return NextResponse.json({
      ...result,
      packageLabel,
    })
  } catch (error) {
    console.error("[TopUp] Error:", error)

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
