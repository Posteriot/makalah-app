/**
 * Subscription Management
 * For Pro tier recurring billing
 */

import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { SUBSCRIPTION_PRICING } from "./constants"
import type { DatabaseReader } from "../_generated/server"

/**
 * Internal helper: resolve subscription pricing from DB, fallback to constants.
 * Queries pricingPlans table for Pro plan's priceValue + name.
 * intervalMonths derived from planType (monthly=1, yearly=12).
 */
async function resolveSubscriptionPricing(
  db: DatabaseReader,
  planType: "pro_monthly" | "pro_yearly"
) {
  const plan = await db
    .query("pricingPlans")
    .withIndex("by_slug", (q) => q.eq("slug", "pro"))
    .first()

  const constantPricing = SUBSCRIPTION_PRICING[planType]
  const intervalMonths = planType === "pro_yearly" ? 12 : 1

  return {
    priceIDR: plan?.priceValue ?? constantPricing.priceIDR,
    intervalMonths,
    label: plan?.name ?? constantPricing.label,
  }
}

/**
 * Create a new subscription
 * Called after successful initial payment
 */
export const createSubscription = mutation({
  args: {
    userId: v.id("users"),
    planType: v.union(
      v.literal("pro_monthly"),
      v.literal("pro_yearly")
    ),
    xenditRecurringId: v.optional(v.string()),
    xenditCustomerId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const pricing = await resolveSubscriptionPricing(ctx.db, args.planType)

    // Calculate period
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + pricing.intervalMonths)

    // Check for existing active subscription
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
      xenditRecurringId: args.xenditRecurringId,
      xenditCustomerId: args.xenditCustomerId,
      planType: args.planType,
      priceIDR: pricing.priceIDR,
      status: "active",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd.getTime(),
      nextBillingDate: periodEnd.getTime(),
      createdAt: now,
      updatedAt: now,
    })

    // Update user subscription status to "pro"
    await ctx.db.patch(args.userId, {
      subscriptionStatus: "pro",
      updatedAt: now,
    })

    return subscriptionId
  },
})

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

    const now = Date.now()
    const pricing = await resolveSubscriptionPricing(ctx.db, args.planType)

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
    const pricing = await resolveSubscriptionPricing(ctx.db, subscription.planType)

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

/**
 * Get user's active subscription
 */
export const getActiveSubscription = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first()
  },
})

/**
 * Get subscription by Xendit recurring ID
 */
export const getSubscriptionByXenditId = query({
  args: {
    xenditRecurringId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_xendit_recurring", (q) =>
        q.eq("xenditRecurringId", args.xenditRecurringId)
      )
      .first()
  },
})

/**
 * Renew subscription for next period
 * Called from Xendit webhook on successful recurring payment
 */
export const renewSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId)
    if (!subscription) {
      throw new Error("Subscription not found")
    }

    const now = Date.now()
    const pricing = await resolveSubscriptionPricing(ctx.db, subscription.planType)

    // Calculate new period
    const newPeriodStart = subscription.currentPeriodEnd
    const newPeriodEnd = new Date(newPeriodStart)
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + pricing.intervalMonths)

    await ctx.db.patch(args.subscriptionId, {
      status: "active",
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd.getTime(),
      nextBillingDate: newPeriodEnd.getTime(),
      updatedAt: now,
    })

    return {
      newPeriodStart,
      newPeriodEnd: newPeriodEnd.getTime(),
    }
  },
})

/**
 * Cancel subscription
 * Can be immediate or at end of period
 */
export const cancelSubscription = mutation({
  args: {
    userId: v.id("users"),
    reason: v.optional(v.string()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first()

    if (!subscription) {
      throw new Error("No active subscription found")
    }

    const now = Date.now()
    const cancelAtEnd = args.cancelAtPeriodEnd ?? true

    if (cancelAtEnd) {
      // Keep active until period end
      await ctx.db.patch(subscription._id, {
        canceledAt: now,
        cancelReason: args.reason,
        cancelAtPeriodEnd: true,
        updatedAt: now,
      })
    } else {
      // Immediate cancellation
      await ctx.db.patch(subscription._id, {
        status: "canceled",
        canceledAt: now,
        cancelReason: args.reason,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      })

      // Smart downgrade: BPP if credits remain, else free
      const creditBalance = await ctx.db
        .query("creditBalances")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first()

      const hasCredits = creditBalance && (creditBalance.remainingCredits ?? 0) > 0
      const newTier = hasCredits ? "bpp" : "free"

      await ctx.db.patch(args.userId, {
        subscriptionStatus: newTier,
        updatedAt: now,
      })
    }

    return {
      canceledAt: now,
      cancelAtPeriodEnd: cancelAtEnd,
      effectiveEndDate: cancelAtEnd ? subscription.currentPeriodEnd : now,
    }
  },
})

/**
 * Handle subscription expiration
 * Called when cancelAtPeriodEnd reaches period end
 */
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
    if (!subscription) {
      throw new Error("Subscription not found")
    }

    const now = Date.now()

    await ctx.db.patch(args.subscriptionId, {
      status: "expired",
      updatedAt: now,
    })

    // Check if user has BPP credit balance for smart downgrade
    const creditBalance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", subscription.userId))
      .first()

    const hasCredits = creditBalance && (creditBalance.remainingCredits ?? 0) > 0
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

/**
 * Mark subscription as past due
 * Called when recurring payment fails
 */
export const markPastDue = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.subscriptionId, {
      status: "past_due",
      updatedAt: Date.now(),
    })

    return { status: "past_due" }
  },
})

/**
 * Reactivate past due subscription
 * Called when payment succeeds after being past due
 */
export const reactivateSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId)
    if (!subscription) {
      throw new Error("Subscription not found")
    }

    const now = Date.now()

    await ctx.db.patch(args.subscriptionId, {
      status: "active",
      cancelAtPeriodEnd: false,
      canceledAt: undefined,
      updatedAt: now,
    })

    // Ensure user is on Pro
    await ctx.db.patch(subscription.userId, {
      subscriptionStatus: "pro",
      updatedAt: now,
    })

    return { reactivated: true }
  },
})

/**
 * Get subscription history for user
 */
export const getSubscriptionHistory = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect()
  },
})

/**
 * Check subscription status and validity
 */
export const checkSubscriptionStatus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "past_due")
        )
      )
      .first()

    if (!subscription) {
      return {
        hasSubscription: false,
        status: null,
      }
    }

    const now = Date.now()
    const isExpired = subscription.currentPeriodEnd < now
    const isPendingCancel = subscription.cancelAtPeriodEnd === true

    return {
      hasSubscription: true,
      subscriptionId: subscription._id,
      status: subscription.status,
      planType: subscription.planType,
      priceIDR: subscription.priceIDR,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      nextBillingDate: subscription.nextBillingDate,
      isExpired,
      isPendingCancel,
      canceledAt: subscription.canceledAt,
      daysRemaining: isExpired
        ? 0
        : Math.ceil((subscription.currentPeriodEnd - now) / (1000 * 60 * 60 * 24)),
    }
  },
})
