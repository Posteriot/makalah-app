/**
 * Payment Records Management
 * Track Xendit payment transactions
 */

import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { requireAuthUser, requireAuthUserId } from "../authHelpers"
import { requireRole } from "../permissions"

function isInternalKeyValid(internalKey?: string) {
  const expected = process.env.CONVEX_INTERNAL_KEY
  return Boolean(expected && internalKey === expected)
}

/**
 * Create a new payment record
 * Called when initiating a Xendit payment request
 */
export const createPayment = mutation({
  args: {
    userId: v.id("users"),
    sessionId: v.optional(v.id("paperSessions")),
    xenditPaymentRequestId: v.string(),
    xenditReferenceId: v.string(),
    amount: v.number(),
    paymentMethod: v.union(
      v.literal("QRIS"),
      v.literal("VIRTUAL_ACCOUNT"),
      v.literal("EWALLET"),
      v.literal("DIRECT_DEBIT"),
      v.literal("CREDIT_CARD")
    ),
    paymentChannel: v.optional(v.string()),
    paymentType: v.union(
      v.literal("credit_topup"),
      v.literal("paper_completion"),
      v.literal("subscription_initial"),
      v.literal("subscription_renewal")
    ),
    // Credit package info (for credit_topup payments)
    // NOTE: extension_s/extension_m retained for historical records.
    // New purchases only use "paper" — enforced by CREDIT_PACKAGES in constants.ts.
    packageType: v.optional(v.union(
      v.literal("paper"),
      v.literal("extension_s"),
      v.literal("extension_m")
    )),
    credits: v.optional(v.number()),
    description: v.optional(v.string()),
    planType: v.optional(v.union(
      v.literal("pro_monthly"),
      v.literal("pro_yearly")
    )),
    idempotencyKey: v.string(),
    expiredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const now = Date.now()

    const paymentId = await ctx.db.insert("payments", {
      userId: args.userId,
      sessionId: args.sessionId,
      xenditPaymentRequestId: args.xenditPaymentRequestId,
      xenditReferenceId: args.xenditReferenceId,
      amount: args.amount,
      currency: "IDR",
      paymentMethod: args.paymentMethod,
      paymentChannel: args.paymentChannel,
      status: "PENDING",
      paymentType: args.paymentType,
      packageType: args.packageType,
      credits: args.credits,
      description: args.description,
      planType: args.planType,
      idempotencyKey: args.idempotencyKey,
      createdAt: now,
      expiredAt: args.expiredAt,
    })

    return paymentId
  },
})

/**
 * Update payment status after Xendit webhook
 */
export const updatePaymentStatus = mutation({
  args: {
    xenditPaymentRequestId: v.string(),
    status: v.union(
      v.literal("PENDING"),
      v.literal("SUCCEEDED"),
      v.literal("FAILED"),
      v.literal("EXPIRED"),
      v.literal("REFUNDED")
    ),
    paidAt: v.optional(v.number()),
    metadata: v.optional(v.any()),
    internalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isInternalKeyValid(args.internalKey)) {
      throw new Error("Unauthorized")
    }
    // Find payment by Xendit ID
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_xendit_id", (q) =>
        q.eq("xenditPaymentRequestId", args.xenditPaymentRequestId)
      )
      .first()

    if (!payment) {
      throw new Error(`Payment not found: ${args.xenditPaymentRequestId}`)
    }

    // Update status
    await ctx.db.patch(payment._id, {
      status: args.status,
      paidAt: args.paidAt,
      metadata: args.metadata,
    })

    return {
      paymentId: payment._id,
      userId: payment.userId,
      paymentType: payment.paymentType,
      packageType: payment.packageType,
      credits: payment.credits,
      amount: payment.amount,
      previousStatus: payment.status,
      newStatus: args.status,
    }
  },
})

/**
 * Get payment by Xendit reference ID
 * Used for reconciliation
 */
export const getPaymentByReference = query({
  args: {
    userId: v.id("users"),
    xenditReferenceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_reference", (q) =>
        q.eq("xenditReferenceId", args.xenditReferenceId)
      )
      .first()
    if (!payment || payment.userId !== args.userId) {
      return null
    }
    return payment
  },
})

/**
 * Get payment by Xendit payment request ID
 */
export const getPaymentByXenditId = query({
  args: {
    xenditPaymentRequestId: v.string(),
    internalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (isInternalKeyValid(args.internalKey)) {
      return await ctx.db
        .query("payments")
        .withIndex("by_xendit_id", (q) =>
          q.eq("xenditPaymentRequestId", args.xenditPaymentRequestId)
        )
        .first()
    }

    const authUser = await requireAuthUser(ctx)
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_xendit_id", (q) =>
        q.eq("xenditPaymentRequestId", args.xenditPaymentRequestId)
      )
      .first()
    if (!payment || payment.userId !== authUser._id) {
      return null
    }
    return payment
  },
})

/**
 * Get user's payment history
 */
export const getPaymentHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
    paymentType: v.optional(
      v.union(
        v.literal("credit_topup"),
        v.literal("paper_completion"),
        v.literal("subscription_initial"),
        v.literal("subscription_renewal")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const limitCount = args.limit ?? 30

    if (args.paymentType) {
      return await ctx.db
        .query("payments")
        .withIndex("by_user_type", (q) =>
          q.eq("userId", args.userId).eq("paymentType", args.paymentType!)
        )
        .order("desc")
        .take(limitCount)
    }

    return await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limitCount)
  },
})

/**
 * Get pending payments for user
 * Useful for showing "awaiting payment" status
 */
export const getPendingPayments = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const now = Date.now()

    const pendingPayments = await ctx.db
      .query("payments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect()

    // Filter out expired ones
    return pendingPayments.filter(
      (p) => !p.expiredAt || p.expiredAt > now
    )
  },
})

/**
 * Get a single payment by ID
 * Used for receipt generation
 */
export const getPaymentById = query({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId)
    if (!payment) return null

    // Auth check: verify requester owns this payment
    await requireAuthUserId(ctx, payment.userId)
    return payment
  },
})

/**
 * Check for duplicate payment (idempotency)
 */
export const checkIdempotency = query({
  args: {
    idempotencyKey: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAuthUser(ctx)
    const existing = await ctx.db
      .query("payments")
      .filter((q) => q.eq(q.field("idempotencyKey"), args.idempotencyKey))
      .first()

    return existing ? { exists: true, payment: existing } : { exists: false }
  },
})

/**
 * Watch payment status for real-time updates
 * Used by frontend to subscribe to payment status changes
 * Auto-updates when webhook updates the payment record
 */
export const watchPaymentStatus = query({
  args: {
    paymentId: v.id("payments"),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.paymentId)
    if (!payment) return null

    return {
      status: payment.status,
      amount: payment.amount,
      paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod,
      paymentChannel: payment.paymentChannel,
      createdAt: payment.createdAt,
      expiredAt: payment.expiredAt,
    }
  },
})

/**
 * Get payment statistics for admin
 */
export const getPaymentStats = query({
  args: {
    requestorUserId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorUserId, "admin")
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_status")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), args.periodStart),
          q.lte(q.field("createdAt"), args.periodEnd)
        )
      )
      .collect()

    const stats = {
      total: payments.length,
      succeeded: 0,
      failed: 0,
      pending: 0,
      expired: 0,
      totalAmountSucceeded: 0,
      byType: {
        credit_topup: { count: 0, amount: 0 },
        paper_completion: { count: 0, amount: 0 },
        subscription_initial: { count: 0, amount: 0 },
        subscription_renewal: { count: 0, amount: 0 },
      },
      byMethod: {} as Record<string, { count: number; amount: number }>,
    }

    for (const payment of payments) {
      // Status counts
      if (payment.status === "SUCCEEDED") {
        stats.succeeded++
        stats.totalAmountSucceeded += payment.amount
      } else if (payment.status === "FAILED") {
        stats.failed++
      } else if (payment.status === "PENDING") {
        stats.pending++
      } else if (payment.status === "EXPIRED") {
        stats.expired++
      }

      // By type
      const type = payment.paymentType as keyof typeof stats.byType
      if (stats.byType[type]) {
        stats.byType[type].count++
        if (payment.status === "SUCCEEDED") {
          stats.byType[type].amount += payment.amount
        }
      }

      // By method
      if (!stats.byMethod[payment.paymentMethod]) {
        stats.byMethod[payment.paymentMethod] = { count: 0, amount: 0 }
      }
      stats.byMethod[payment.paymentMethod].count++
      if (payment.status === "SUCCEEDED") {
        stats.byMethod[payment.paymentMethod].amount += payment.amount
      }
    }

    return stats
  },
})

