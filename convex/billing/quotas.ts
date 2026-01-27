/**
 * Quota Management
 * Track, check, dan enforce user quotas
 */

import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import {
  getTierLimits,
  getPeriodBoundaries,
  isSameDay,
  TIER_LIMITS,
  type TierType,
} from "./constants"
import { requireAuthUserId } from "../auth"

/**
 * Get or create user quota for current period
 */
export const getUserQuota = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    // Get user for tier info
    const user = await ctx.db.get(args.userId)
    if (!user) return null

    // Get existing quota
    const existingQuota = await ctx.db
      .query("userQuotas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    // Check if quota exists and is for current period
    const now = Date.now()
    const { periodStart, periodEnd } = getPeriodBoundaries(user.createdAt, now)

    if (existingQuota && existingQuota.periodStart === periodStart) {
      // Compute percentage used
      const percentUsed = existingQuota.allottedTokens > 0
        ? (existingQuota.usedTokens / existingQuota.allottedTokens) * 100
        : 0

      // Check if daily reset needed
      if (!isSameDay(existingQuota.lastDailyReset, now)) {
        // Return with reset daily usage (actual reset happens in mutation)
        return {
          ...existingQuota,
          dailyUsedTokens: 0,
          needsDailyReset: true,
          percentUsed,
        }
      }
      return {
        ...existingQuota,
        percentUsed,
      }
    }

    // No quota or wrong period - return computed defaults
    const tier = (user.subscriptionStatus === "free" ? "gratis" : user.subscriptionStatus) as TierType
    const limits = getTierLimits(tier)

    return {
      _id: null,
      userId: args.userId,
      periodStart,
      periodEnd,
      allottedTokens: limits.monthlyTokens,
      usedTokens: 0,
      remainingTokens: limits.monthlyTokens,
      allottedPapers: limits.monthlyPapers,
      completedPapers: 0,
      dailyUsedTokens: 0,
      lastDailyReset: now,
      tier,
      overageTokens: 0,
      overageCostIDR: 0,
      updatedAt: now,
      needsCreate: true,
      percentUsed: 0,
    }
  },
})

/**
 * Initialize or reset user quota for new period
 */
export const initializeQuota = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const user = await ctx.db.get(args.userId)
    if (!user) throw new Error("User not found")

    const now = Date.now()
    const { periodStart, periodEnd } = getPeriodBoundaries(user.createdAt, now)

    // Get tier limits
    const tier = (user.subscriptionStatus === "free" ? "gratis" : user.subscriptionStatus) as TierType
    const limits = getTierLimits(tier)

    // Check for existing quota
    const existingQuota = await ctx.db
      .query("userQuotas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (existingQuota) {
      // Update for new period
      await ctx.db.patch(existingQuota._id, {
        periodStart,
        periodEnd,
        allottedTokens: limits.monthlyTokens === Infinity ? 999_999_999 : limits.monthlyTokens,
        usedTokens: 0,
        remainingTokens: limits.monthlyTokens === Infinity ? 999_999_999 : limits.monthlyTokens,
        allottedPapers: limits.monthlyPapers === Infinity ? 999 : limits.monthlyPapers,
        completedPapers: 0,
        dailyUsedTokens: 0,
        lastDailyReset: now,
        tier,
        overageTokens: 0,
        overageCostIDR: 0,
        updatedAt: now,
      })
      return existingQuota._id
    }

    // Create new quota
    const quotaId = await ctx.db.insert("userQuotas", {
      userId: args.userId,
      periodStart,
      periodEnd,
      allottedTokens: limits.monthlyTokens === Infinity ? 999_999_999 : limits.monthlyTokens,
      usedTokens: 0,
      remainingTokens: limits.monthlyTokens === Infinity ? 999_999_999 : limits.monthlyTokens,
      allottedPapers: limits.monthlyPapers === Infinity ? 999 : limits.monthlyPapers,
      completedPapers: 0,
      dailyUsedTokens: 0,
      lastDailyReset: now,
      tier,
      overageTokens: 0,
      overageCostIDR: 0,
      updatedAt: now,
    })

    return quotaId
  },
})

/**
 * Deduct tokens from user quota
 * Called after successful AI response
 */
export const deductQuota = mutation({
  args: {
    userId: v.id("users"),
    tokens: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const user = await ctx.db.get(args.userId)
    if (!user) throw new Error("User not found")

    // Admin/superadmin bypass
    if (user.role === "admin" || user.role === "superadmin") {
      return { success: true, bypassed: true }
    }

    const now = Date.now()
    const { periodStart, periodEnd } = getPeriodBoundaries(user.createdAt, now)

    // Get or create quota
    let quota = await ctx.db
      .query("userQuotas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!quota || quota.periodStart !== periodStart) {
      // Initialize quota first
      const tier = (user.subscriptionStatus === "free" ? "gratis" : user.subscriptionStatus) as TierType
      const limits = getTierLimits(tier)

      const quotaId = await ctx.db.insert("userQuotas", {
        userId: args.userId,
        periodStart,
        periodEnd,
        allottedTokens: limits.monthlyTokens === Infinity ? 999_999_999 : limits.monthlyTokens,
        usedTokens: 0,
        remainingTokens: limits.monthlyTokens === Infinity ? 999_999_999 : limits.monthlyTokens,
        allottedPapers: limits.monthlyPapers === Infinity ? 999 : limits.monthlyPapers,
        completedPapers: 0,
        dailyUsedTokens: 0,
        lastDailyReset: now,
        tier,
        overageTokens: 0,
        overageCostIDR: 0,
        updatedAt: now,
      })

      quota = await ctx.db.get(quotaId)
    }

    if (!quota) throw new Error("Failed to get quota")

    // Handle daily reset if needed
    let dailyUsedTokens = quota.dailyUsedTokens
    let lastDailyReset = quota.lastDailyReset
    if (!isSameDay(quota.lastDailyReset, now)) {
      dailyUsedTokens = 0
      lastDailyReset = now
    }

    // Calculate new values
    const newUsedTokens = quota.usedTokens + args.tokens
    const newRemainingTokens = Math.max(0, quota.allottedTokens - newUsedTokens)
    const newDailyUsedTokens = dailyUsedTokens + args.tokens

    // Check for overage (Pro tier only)
    let overageTokens = quota.overageTokens
    let overageCostIDR = quota.overageCostIDR

    if (quota.tier === "pro" && newUsedTokens > quota.allottedTokens) {
      const newOverage = newUsedTokens - quota.allottedTokens - quota.overageTokens
      if (newOverage > 0) {
        overageTokens += newOverage
        overageCostIDR += newOverage * TIER_LIMITS.pro.overageRatePerToken
      }
    }

    // Update quota
    await ctx.db.patch(quota._id, {
      usedTokens: newUsedTokens,
      remainingTokens: newRemainingTokens,
      dailyUsedTokens: newDailyUsedTokens,
      lastDailyReset,
      overageTokens,
      overageCostIDR,
      updatedAt: now,
    })

    return {
      success: true,
      usedTokens: newUsedTokens,
      remainingTokens: newRemainingTokens,
      dailyUsedTokens: newDailyUsedTokens,
      overageTokens,
    }
  },
})

/**
 * Increment completed papers count
 */
export const incrementCompletedPapers = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const quota = await ctx.db
      .query("userQuotas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!quota) {
      throw new Error("Quota not found. Initialize quota first.")
    }

    await ctx.db.patch(quota._id, {
      completedPapers: quota.completedPapers + 1,
      updatedAt: Date.now(),
    })

    return { completedPapers: quota.completedPapers + 1 }
  },
})

/**
 * Check if user has sufficient quota (pre-flight check)
 * Returns allowed: boolean and reason if blocked
 */
export const checkQuota = query({
  args: {
    userId: v.id("users"),
    estimatedTokens: v.number(),
    operationType: v.union(
      v.literal("chat"),
      v.literal("paper")
    ),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const user = await ctx.db.get(args.userId)
    if (!user) {
      return { allowed: false, reason: "user_not_found", message: "User tidak ditemukan" }
    }

    // Admin/superadmin bypass
    if (user.role === "admin" || user.role === "superadmin") {
      return { allowed: true, tier: "pro", bypassed: true }
    }

    const tier = (user.subscriptionStatus === "free" ? "gratis" : user.subscriptionStatus) as TierType
    const limits = getTierLimits(tier)

    // BPP: Check credit balance instead
    if (limits.creditBased) {
      const balance = await ctx.db
        .query("creditBalances")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first()

      const estimatedCost = Math.ceil((args.estimatedTokens / 1000) * 3) // ~Rp 3/1K tokens
      const currentBalance = balance?.balanceIDR ?? 0

      if (currentBalance < estimatedCost) {
        return {
          allowed: false,
          reason: "insufficient_credit",
          message: `Saldo tidak cukup. Estimasi: Rp ${estimatedCost.toLocaleString("id-ID")}, saldo: Rp ${currentBalance.toLocaleString("id-ID")}`,
          action: "topup",
          currentBalance,
          requiredAmount: estimatedCost,
        }
      }

      return { allowed: true, tier: "bpp", currentBalance }
    }

    // Get quota
    const quota = await ctx.db
      .query("userQuotas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!quota) {
      // No quota yet - will be created on first use
      return { allowed: true, tier, needsInit: true }
    }

    const now = Date.now()

    // Check daily limit
    const dailyUsed = isSameDay(quota.lastDailyReset, now) ? quota.dailyUsedTokens : 0
    if (dailyUsed + args.estimatedTokens > limits.dailyTokens) {
      return {
        allowed: false,
        reason: "daily_limit",
        message: "Limit harian tercapai. Reset besok jam 00:00.",
        action: "wait",
        dailyUsed,
        dailyLimit: limits.dailyTokens,
      }
    }

    // Check monthly limit
    if (quota.remainingTokens < args.estimatedTokens) {
      if (limits.hardLimit) {
        return {
          allowed: false,
          reason: "monthly_limit",
          message: `Quota bulanan habis. Upgrade ke Pro untuk akses unlimited.`,
          action: "upgrade",
          used: quota.usedTokens,
          allotted: quota.allottedTokens,
        }
      }

      // Soft limit (Pro): Allow with overage warning
      if (limits.overageAllowed) {
        const overage = args.estimatedTokens - quota.remainingTokens
        const overageCost = Math.ceil(overage * limits.overageRatePerToken)

        return {
          allowed: true,
          tier: "pro",
          warning: `Estimasi overage: ${overage.toLocaleString("id-ID")} tokens = Rp ${overageCost.toLocaleString("id-ID")}`,
          overageTokens: overage,
          overageCost,
        }
      }
    }

    // Check paper limit (untuk gratis tier)
    if (args.operationType === "paper" && quota.completedPapers >= quota.allottedPapers) {
      return {
        allowed: false,
        reason: "paper_limit",
        message: `Limit paper bulanan tercapai (${quota.completedPapers}/${quota.allottedPapers}). Upgrade untuk unlimited.`,
        action: "upgrade",
      }
    }

    return {
      allowed: true,
      tier,
      remainingTokens: quota.remainingTokens,
      dailyRemaining: limits.dailyTokens - dailyUsed,
    }
  },
})

/**
 * Get quota status for UI display
 * Returns percentage used and warning level
 */
export const getQuotaStatus = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const user = await ctx.db.get(args.userId)
    if (!user) return null

    // Admin/superadmin always have unlimited
    if (user.role === "admin" || user.role === "superadmin") {
      return {
        tier: "pro",
        unlimited: true,
        percentageUsed: 0,
        warningLevel: "none" as const,
      }
    }

    const tier = (user.subscriptionStatus === "free" ? "gratis" : user.subscriptionStatus) as TierType
    const limits = getTierLimits(tier)

    // BPP: Return credit balance status
    if (limits.creditBased) {
      const balance = await ctx.db
        .query("creditBalances")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .first()

      const currentBalance = balance?.balanceIDR ?? 0

      return {
        tier: "bpp",
        creditBased: true,
        balanceIDR: currentBalance,
        balanceTokens: balance?.balanceTokens ?? 0,
        warningLevel: currentBalance < 5000 ? "critical" : currentBalance < 15000 ? "warning" : "none",
      }
    }

    // Get quota
    const quota = await ctx.db
      .query("userQuotas")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!quota) {
      return {
        tier,
        needsInit: true,
        percentageUsed: 0,
        warningLevel: "none" as const,
      }
    }

    const percentageUsed = Math.round((quota.usedTokens / quota.allottedTokens) * 100)
    const percentageRemaining = 100 - percentageUsed

    let warningLevel: "none" | "warning" | "critical" | "blocked" = "none"
    if (percentageRemaining <= 0) {
      warningLevel = "blocked"
    } else if (percentageRemaining <= 10) {
      warningLevel = "critical"
    } else if (percentageRemaining <= 20) {
      warningLevel = "warning"
    }

    return {
      tier,
      percentageUsed,
      percentageRemaining,
      usedTokens: quota.usedTokens,
      allottedTokens: quota.allottedTokens,
      remainingTokens: quota.remainingTokens,
      dailyUsedTokens: quota.dailyUsedTokens,
      dailyLimit: limits.dailyTokens,
      completedPapers: quota.completedPapers,
      allottedPapers: quota.allottedPapers,
      periodEnd: quota.periodEnd,
      warningLevel,
      overageTokens: quota.overageTokens,
      overageCostIDR: quota.overageCostIDR,
    }
  },
})
