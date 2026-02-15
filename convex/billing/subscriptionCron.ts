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
      // Check if user has BPP credit balance for smart downgrade
      const creditBalance = await ctx.db
        .query("creditBalances")
        .withIndex("by_user", (q) => q.eq("userId", sub.userId))
        .first()

      const hasCredits = creditBalance && (creditBalance.remainingCredits ?? 0) > 0
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
