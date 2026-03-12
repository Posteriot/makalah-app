/**
 * Generic Payment Webhook Handler
 * Processes payment status updates from any provider via the abstraction layer.
 * Uses provider.verifyWebhook() instead of provider-specific verification.
 */

import { NextRequest, NextResponse } from "next/server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import { getProvider } from "@/lib/payment/factory"
import type { WebhookEvent } from "@/lib/payment/types"
import {
  sendPaymentSuccessEmail,
  sendPaymentFailedEmail,
} from "@/lib/email/sendPaymentEmail"
import * as Sentry from "@sentry/nextjs"

const internalKey = process.env.CONVEX_INTERNAL_KEY

export async function POST(req: NextRequest) {
  if (!internalKey) {
    console.error("[Payment Webhook] CONVEX_INTERNAL_KEY belum diset")
    Sentry.captureMessage("CONVEX_INTERNAL_KEY not configured for payment webhook", {
      level: "fatal",
      tags: { "api.route": "webhook.payment" },
    })
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 })
  }

  // 1. Get provider and verify webhook
  const provider = await getProvider()
  const event = await provider.verifyWebhook(req)

  if (!event) {
    console.error("[Payment Webhook] Verification failed")
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  console.log(`[Payment Webhook] Received:`, {
    providerPaymentId: event.providerPaymentId,
    status: event.status,
    amount: event.rawAmount,
  })

  // 2. Handle based on status
  try {
    switch (event.status) {
      case "SUCCEEDED":
        await handlePaymentSuccess(event, internalKey)
        break

      case "FAILED":
        await handlePaymentFailed(event, internalKey)
        break

      case "EXPIRED":
        await handlePaymentExpired(event, internalKey)
        break

      default:
        console.log(`[Payment Webhook] Unhandled status: ${event.status}`)
    }

    return NextResponse.json({ status: "processed" })
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
}

/**
 * Handle successful payment
 */
async function handlePaymentSuccess(event: WebhookEvent, internalKey: string) {
  const providerPaymentId = event.providerPaymentId

  // 1. Get payment from database
  const payment = await fetchQuery(api.billing.payments.getPaymentByProviderId, {
    providerPaymentId,
    internalKey,
  })

  if (!payment) {
    console.error(`[Payment] Payment not found in DB: ${providerPaymentId}`)
    Sentry.captureMessage(`Payment not found in DB: ${providerPaymentId}`, {
      level: "error",
      tags: { "api.route": "webhook.payment" },
    })
    return
  }

  // 2. Prevent duplicate processing
  if (payment.status === "SUCCEEDED") {
    console.log(`[Payment] Payment already processed: ${providerPaymentId}`)
    return
  }

  // 3. Update payment status
  const updateResult = await fetchMutation(api.billing.payments.updatePaymentStatus, {
    providerPaymentId,
    status: "SUCCEEDED",
    paidAt: event.paidAt ?? Date.now(),
    metadata: {
      providerStatus: event.status,
      paymentMethod: event.channelCode,
    },
    internalKey,
  })

  console.log(`[Payment] Payment status updated:`, {
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
        console.warn(`[Payment] Payment has no credits: ${providerPaymentId}`)
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

      console.log(`[Payment] Credits added:`, {
        userId: payment.userId,
        credits: creditsToAdd,
        packageType,
        newTotalCredits: creditResult.newTotalCredits,
      })
      break
    }

    case "paper_completion":
      console.error(
        "[Payment] paper_completion received on Xendit runtime, but no active fulfillment path exists"
      )
      break

    case "subscription_initial": {
      const planType = (payment as unknown as { planType?: string }).planType ?? "pro_monthly"

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

      console.log(`[Payment] Subscription created:`, {
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

        console.log(`[Payment] Subscription renewed:`, { userId: payment.userId })
      } else {
        console.warn(`[Payment] No active subscription for renewal: ${payment.userId}`)
      }
      break
    }

    default:
      console.warn(`[Payment] Unknown payment type: ${paymentType}`)
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
      const emailResult = await sendPaymentSuccessEmail({
        to: user.email,
        userName: user.firstName || undefined,
        amount: event.rawAmount ?? payment.amount,
        credits: newCredits,
        newTotalCredits: newTotalCredits,
        transactionId: providerPaymentId,
        paidAt: event.paidAt ?? Date.now(),
        subscriptionPlanLabel,
      })

      console.log(`[Payment] Email notification result:`, emailResult)
    } else {
      console.warn(`[Payment] User email not found for userId: ${payment.userId}`)
    }
  } catch (emailError) {
    // Email failure should not break webhook processing
    console.error(`[Payment] Email notification failed:`, emailError)
    Sentry.captureException(emailError, {
      tags: { "api.route": "webhook.payment", subsystem: "email" },
    })
  }
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(event: WebhookEvent, internalKey: string) {
  const providerPaymentId = event.providerPaymentId

  // 1. Get payment to retrieve userId
  const payment = await fetchQuery(api.billing.payments.getPaymentByProviderId, {
    providerPaymentId,
    internalKey,
  })

  // 2. Update payment status
  await fetchMutation(api.billing.payments.updatePaymentStatus, {
    providerPaymentId,
    status: "FAILED",
    metadata: {
      failureCode: event.failureCode,
      providerStatus: event.status,
    },
    internalKey,
  })

  console.log(`[Payment] Payment marked as failed: ${providerPaymentId}`, {
    failureCode: event.failureCode,
  })

  // 3. Send failure email
  if (payment) {
    try {
      // Determine if Pro payment for template routing
      const isPro =
        payment.paymentType === "subscription_initial" ||
        payment.paymentType === "subscription_renewal"
      let subscriptionPlanLabel: string | undefined
      if (isPro) {
        try {
          const proPricing = await fetchQuery(api.billing.pricingHelpers.getProPricing, {})
          subscriptionPlanLabel = proPricing.label
        } catch {
          subscriptionPlanLabel = "Pro Bulanan"
        }
      }

      // Fetch user to get email
      const user = await fetchQuery(api.users.getUserById, {
        userId: payment.userId as Id<"users">,
      })

      if (user?.email) {
        const emailResult = await sendPaymentFailedEmail({
          to: user.email,
          userName: user.firstName || undefined,
          amount: event.rawAmount ?? payment.amount,
          failureReason: event.failureCode,
          transactionId: providerPaymentId,
          subscriptionPlanLabel,
        })

        console.log(`[Payment] Failed email notification result:`, emailResult)
      } else {
        console.warn(`[Payment] User email not found for userId: ${payment.userId}`)
      }
    } catch (emailError) {
      // Email failure should not break webhook processing
      console.error(`[Payment] Failed email notification failed:`, emailError)
      Sentry.captureException(emailError, {
        tags: { "api.route": "webhook.payment", subsystem: "email" },
      })
    }
  }
}

/**
 * Handle expired payment
 */
async function handlePaymentExpired(event: WebhookEvent, internalKey: string) {
  const providerPaymentId = event.providerPaymentId

  // Update payment status
  await fetchMutation(api.billing.payments.updatePaymentStatus, {
    providerPaymentId,
    status: "EXPIRED",
    metadata: {
      providerStatus: event.status,
    },
    internalKey,
  })

  console.log(`[Payment] Payment marked as expired: ${providerPaymentId}`)
}
