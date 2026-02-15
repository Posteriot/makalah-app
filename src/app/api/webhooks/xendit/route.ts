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
import { SUBSCRIPTION_PRICING } from "@convex/billing/constants"

const internalKey = process.env.CONVEX_INTERNAL_KEY

// Xendit webhook event types
type XenditEventType =
  | "payment_request.succeeded"
  | "payment_request.failed"
  | "payment_request.expired"
  | "recurring.cycle.succeeded"
  | "recurring.cycle.failed"

// Payment data from webhook
interface XenditPaymentData {
  id: string
  reference_id: string
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "EXPIRED"
  amount: number
  currency: string
  paid_at?: string
  failure_reason?: string
  payment_method: {
    type: string
  }
  metadata?: {
    user_id?: string
    payment_type?: string
    session_id?: string
  }
}

// Webhook payload structure
interface XenditWebhookPayload {
  id: string
  type: XenditEventType
  created: number
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

  const { type, data } = payload

  console.log(`[Xendit Webhook] Received: ${type}`, {
    paymentId: data.id,
    referenceId: data.reference_id,
    amount: data.amount,
    status: data.status,
  })

  // 3. Handle event types
  try {
    switch (type) {
      case "payment_request.succeeded":
        await handlePaymentSuccess(data, internalKey)
        break

      case "payment_request.failed":
        await handlePaymentFailed(data, internalKey)
        break

      case "payment_request.expired":
        await handlePaymentExpired(data, internalKey)
        break

      case "recurring.cycle.succeeded":
        await handleSubscriptionRenewal(data)
        break

      case "recurring.cycle.failed":
        console.log(`[Xendit Webhook] Subscription renewal failed: ${data.id}`)
        // TODO: Handle subscription renewal failure (send email, etc.)
        break

      default:
        console.log(`[Xendit Webhook] Unhandled event type: ${type}`)
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
  // 1. Get payment from database
  const payment = await fetchQuery(api.billing.payments.getPaymentByXenditId, {
    xenditPaymentRequestId: data.id,
    internalKey,
  })

  if (!payment) {
    console.error(`[Xendit] Payment not found in DB: ${data.id}`)
    return
  }

  // 2. Prevent duplicate processing
  if (payment.status === "SUCCEEDED") {
    console.log(`[Xendit] Payment already processed: ${data.id}`)
    return
  }

  // 3. Update payment status
  const updateResult = await fetchMutation(api.billing.payments.updatePaymentStatus, {
    xenditPaymentRequestId: data.id,
    status: "SUCCEEDED",
    paidAt: data.paid_at ? new Date(data.paid_at).getTime() : Date.now(),
    metadata: {
      xenditStatus: data.status,
      paymentMethod: data.payment_method.type,
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
        console.warn(`[Xendit] Payment has no credits: ${data.id}`)
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

  // Set subscription plan label for email
  let subscriptionPlanLabel: string | undefined
  if (paymentType === "subscription_initial" || paymentType === "subscription_renewal") {
    const planType = (payment as any).planType ?? "pro_monthly"
    subscriptionPlanLabel = SUBSCRIPTION_PRICING[planType as keyof typeof SUBSCRIPTION_PRICING]?.label
  }

  // 5. Send confirmation email
  try {
    // Fetch user to get email
    const user = await fetchQuery(api.users.getUserById, {
      userId: payment.userId as Id<"users">,
    })

    if (user?.email) {
      const emailResult = await sendPaymentSuccessEmail({
        to: user.email,
        userName: user.firstName || undefined,
        amount: data.amount,
        credits: newCredits,
        newTotalCredits: newTotalCredits,
        transactionId: data.id,
        paidAt: data.paid_at ? new Date(data.paid_at).getTime() : Date.now(),
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
  // 1. Get payment to retrieve userId
  const payment = await fetchQuery(api.billing.payments.getPaymentByXenditId, {
    xenditPaymentRequestId: data.id,
    internalKey,
  })

  // 2. Update payment status
  await fetchMutation(api.billing.payments.updatePaymentStatus, {
    xenditPaymentRequestId: data.id,
    status: "FAILED",
    metadata: {
      failureReason: data.failure_reason,
      xenditStatus: data.status,
    },
    internalKey,
  })

  console.log(`[Xendit] Payment marked as failed: ${data.id}`, {
    reason: data.failure_reason,
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
          amount: data.amount,
          failureReason: data.failure_reason,
          transactionId: data.id,
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
  // Update payment status
  await fetchMutation(api.billing.payments.updatePaymentStatus, {
    xenditPaymentRequestId: data.id,
    status: "EXPIRED",
    metadata: {
      xenditStatus: data.status,
    },
    internalKey,
  })

  console.log(`[Xendit] Payment marked as expired: ${data.id}`)
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
