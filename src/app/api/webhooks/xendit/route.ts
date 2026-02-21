/**
 * Xendit Webhook Handler
 * Processes payment status updates from Xendit
 */

import { NextRequest, NextResponse } from "next/server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import { verifyWebhookToken } from "@/lib/xendit/client"
import {
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
} from "@/lib/email/sendPaymentEmail"

const internalKey = process.env.CONVEX_INTERNAL_KEY

// Xendit v3 webhook event types
type XenditEventType =
  | "payment.capture"
  | "payment.failed"
  | "payment_request.expired"
  | "recurring.cycle.succeeded"
  | "recurring.cycle.failed"

// Xendit v3 payment data from webhook
interface XenditPaymentData {
  payment_id: string
  payment_request_id: string
  reference_id: string
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED"
  request_amount: number
  currency: string
  channel_code: string
  capture_method?: string
  captures?: Array<{
    capture_id: string
    capture_timestamp: string
    capture_amount: number
  }>
  failure_code?: string
  metadata?: {
    user_id?: string
    betterauth_user_id?: string
    payment_type?: string
  }
}

// Xendit v3 webhook payload structure
interface XenditWebhookPayload {
  event: XenditEventType
  business_id: string
  created: string
  api_version: string
  data: XenditPaymentData
}

export async function POST(req: NextRequest) {
  if (!internalKey) {
    console.error("[Xendit Webhook] CONVEX_INTERNAL_KEY belum diset")
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  // 1. Verify webhook token
  const callbackToken = req.headers.get("x-callback-token")

  if (!verifyWebhookToken(callbackToken)) {
    console.error("[Xendit Webhook] Invalid callback token")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 2. Parse payload
  let payload: XenditWebhookPayload
  try {
    payload = await req.json()
  } catch {
    console.error("[Xendit Webhook] Invalid JSON payload")
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
  }

  const { event, data } = payload

  console.log(`[Xendit Webhook] Received: ${event}`, {
    paymentRequestId: data.payment_request_id,
    referenceId: data.reference_id,
    amount: data.request_amount,
    status: data.status,
  })

  // 3. Handle event types
  try {
    switch (event) {
      case "payment.capture":
        await handlePaymentSuccess(data, internalKey)
        break

      case "payment.failed":
        await handlePaymentFailed(data, internalKey)
        break

      case "payment_request.expired":
        await handlePaymentExpired(data, internalKey)
        break

      case "recurring.cycle.succeeded":
        await handleSubscriptionRenewal(data)
        break

      case "recurring.cycle.failed":
        console.log(`[Xendit Webhook] Subscription renewal failed: ${data.payment_request_id}`)
        // TODO: Handle subscription renewal failure (send email, etc.)
        break

      default:
        console.log(`[Xendit Webhook] Unhandled event type: ${event}`)
    }

    return NextResponse.json({ status: "processed" })
  } catch (error) {
    console.error("[Xendit Webhook] Processing error:", error)
    // Return 200 to prevent Xendit from retrying
    // Log error for investigation
    return NextResponse.json({
      status: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(data: XenditPaymentData, internalKey: string) {
  const xenditPrId = data.payment_request_id

  // 1. Get payment from database
  const payment = await fetchQuery(api.billing.payments.getPaymentByXenditId, {
    xenditPaymentRequestId: xenditPrId,
    internalKey,
  })

  if (!payment) {
    console.error(`[Xendit] Payment not found in DB: ${xenditPrId}`)
    return
  }

  // 2. Prevent duplicate processing
  if (payment.status === "SUCCEEDED") {
    console.log(`[Xendit] Payment already processed: ${xenditPrId}`)
    return
  }

  // 3. Update payment status
  const captureTimestamp = data.captures?.[0]?.capture_timestamp
  const updateResult = await fetchMutation(api.billing.payments.updatePaymentStatus, {
    xenditPaymentRequestId: xenditPrId,
    status: "SUCCEEDED",
    paidAt: captureTimestamp ? new Date(captureTimestamp).getTime() : Date.now(),
    metadata: {
      xenditStatus: data.status,
      paymentMethod: data.channel_code,
    },
    internalKey,
  })

  console.log(`[Xendit] Payment status updated:`, {
    paymentId: updateResult.paymentId,
    previousStatus: updateResult.previousStatus,
    newStatus: updateResult.newStatus,
  })

  // 4. Business logic based on payment type
  const paymentType = payment.paymentType
  let newCredits: number | undefined
  let newTotalCredits: number | undefined

  switch (paymentType) {
    case "credit_topup": {
      // Get credits from payment record
      const creditsToAdd = payment.credits ?? 0
      const packageType = payment.packageType ?? "paper"

      if (creditsToAdd === 0) {
        console.warn(`[Xendit] Payment has no credits: ${xenditPrId}`)
        break
      }

      // Add credits to user balance
      const creditResult = await fetchMutation(api.billing.credits.addCredits, {
        userId: payment.userId as Id<"users">,
        credits: creditsToAdd,
        packageType,
        paymentId: payment._id as Id<"payments">,
        internalKey,
      })

      newCredits = creditsToAdd
      newTotalCredits = creditResult.newTotalCredits

      console.log(`[Xendit] Credits added:`, {
        userId: payment.userId,
        credits: creditsToAdd,
        packageType,
        newTotalCredits: creditResult.newTotalCredits,
      })
      break
    }

    case "paper_completion":
      // TODO: Unlock paper export
      console.log(`[Xendit] Paper completion payment - unlock export`)
      break

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

      // Initialize/reset monthly quota for the new Pro period
      await fetchMutation(api.billing.quotas.initializeQuotaInternal, {
        userId: payment.userId as Id<"users">,
        internalKey,
      })

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

        // Reset monthly quota for new period
        await fetchMutation(api.billing.quotas.initializeQuotaInternal, {
          userId: payment.userId as Id<"users">,
          internalKey,
        })

        console.log(`[Xendit] Subscription renewed:`, { userId: payment.userId })
      } else {
        console.warn(`[Xendit] No active subscription for renewal: ${payment.userId}`)
      }
      break
    }

    default:
      console.warn(`[Xendit] Unknown payment type: ${paymentType}`)
  }

  // Set subscription plan label for email (from DB)
  let subscriptionPlanLabel: string | undefined
  if (paymentType === "subscription_initial" || paymentType === "subscription_renewal") {
    try {
      const proPricing = await fetchQuery(api.billing.pricingHelpers.getProPricing, {})
      subscriptionPlanLabel = proPricing.label
    } catch {
      subscriptionPlanLabel = "Pro Bulanan"
    }
  }

  // 5. Send confirmation email
  try {
    // Fetch user to get email
    const user = await fetchQuery(api.users.getUserById, {
      userId: payment.userId as Id<"users">,
    })

    if (user?.email) {
      const captureTs = data.captures?.[0]?.capture_timestamp
      const emailResult = await sendPaymentSuccessEmail({
        to: user.email,
        userName: user.firstName || undefined,
        amount: data.request_amount,
        credits: newCredits,
        newTotalCredits: newTotalCredits,
        transactionId: xenditPrId,
        paidAt: captureTs ? new Date(captureTs).getTime() : Date.now(),
        subscriptionPlanLabel,
      })

      console.log(`[Xendit] Email notification result:`, emailResult)
    } else {
      console.warn(`[Xendit] User email not found for userId: ${payment.userId}`)
    }
  } catch (emailError) {
    // Email failure should not break webhook processing
    console.error(`[Xendit] Email notification failed:`, emailError)
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(data: XenditPaymentData, internalKey: string) {
  const xenditPrId = data.payment_request_id

  // 1. Get payment to retrieve userId
  const payment = await fetchQuery(api.billing.payments.getPaymentByXenditId, {
    xenditPaymentRequestId: xenditPrId,
    internalKey,
  })

  // 2. Update payment status
  await fetchMutation(api.billing.payments.updatePaymentStatus, {
    xenditPaymentRequestId: xenditPrId,
    status: "FAILED",
    metadata: {
      failureCode: data.failure_code,
      xenditStatus: data.status,
    },
    internalKey,
  })

  console.log(`[Xendit] Payment marked as failed: ${xenditPrId}`, {
    failureCode: data.failure_code,
  })

  // 3. Send failure email
  if (payment) {
    try {
      // Fetch user to get email
      const user = await fetchQuery(api.users.getUserById, {
        userId: payment.userId as Id<"users">,
      })

      if (user?.email) {
        const emailResult = await sendPaymentFailedEmail({
          to: user.email,
          userName: user.firstName || undefined,
          amount: data.request_amount,
          failureReason: data.failure_code,
          transactionId: xenditPrId,
        })

        console.log(`[Xendit] Failed email notification result:`, emailResult)
      } else {
        console.warn(`[Xendit] User email not found for userId: ${payment.userId}`)
      }
    } catch (emailError) {
      // Email failure should not break webhook processing
      console.error(`[Xendit] Failed email notification failed:`, emailError)
    }
  }
}

/**
 * Handle expired payment
 */
async function handlePaymentExpired(data: XenditPaymentData, internalKey: string) {
  const xenditPrId = data.payment_request_id

  // Update payment status
  await fetchMutation(api.billing.payments.updatePaymentStatus, {
    xenditPaymentRequestId: xenditPrId,
    status: "EXPIRED",
    metadata: {
      xenditStatus: data.status,
    },
    internalKey,
  })

  console.log(`[Xendit] Payment marked as expired: ${xenditPrId}`)
}

/**
 * Handle subscription renewal
 */
async function handleSubscriptionRenewal(data: XenditPaymentData) {
  const userId = data.metadata?.user_id

  if (!userId) {
    console.error(`[Xendit] No user_id in subscription renewal metadata`)
    return
  }

  // TODO: Reset monthly quota
  // await fetchMutation(api.billing.quotas.resetMonthly, { userId, internalKey })

  console.log(`[Xendit] Subscription renewed for user: ${userId}`)
}
