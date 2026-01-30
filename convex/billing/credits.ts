/**
 * Credit Balance Management
 * For BPP (Bayar Per Paper) tier users
 */

import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { calculateCostIDR, TOKENS_PER_IDR } from "./constants"
import { requireAuthUserId } from "../auth"

function isInternalKeyValid(internalKey?: string) {
  const expected = process.env.CONVEX_INTERNAL_KEY
  return Boolean(expected && internalKey === expected)
}

/**
 * Get user's credit balance
 */
export const getCreditBalance = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance) {
      return {
        balanceIDR: 0,
        balanceTokens: 0,
        totalTopUpIDR: 0,
        totalSpentIDR: 0,
        lastTopUpAt: null,
        lastTopUpAmount: null,
      }
    }

    return balance
  },
})

/**
 * Initialize credit balance for a new BPP user
 */
export const initializeCreditBalance = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    // Check if already exists
    const existing = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (existing) {
      return existing._id
    }

    const now = Date.now()
    const balanceId = await ctx.db.insert("creditBalances", {
      userId: args.userId,
      // New credit-based fields (required)
      totalCredits: 0,
      usedCredits: 0,
      remainingCredits: 0,
      totalPurchasedCredits: 0,
      totalSpentCredits: 0,
      // Legacy fields (optional, for backward compat)
      balanceIDR: 0,
      balanceTokens: 0,
      totalTopUpIDR: 0,
      totalSpentIDR: 0,
      lastTopUpAt: undefined,
      lastTopUpAmount: undefined,
      createdAt: now,
      updatedAt: now,
    })

    return balanceId
  },
})

/**
 * Add credits after successful top-up payment
 * Called from payment webhook handler
 */
export const addCredits = mutation({
  args: {
    userId: v.id("users"),
    amountIDR: v.number(),
    paymentId: v.optional(v.id("payments")),
    internalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isInternalKeyValid(args.internalKey)) {
      await requireAuthUserId(ctx, args.userId)
    }
    const now = Date.now()
    const tokensToAdd = args.amountIDR * TOKENS_PER_IDR

    // Get or create balance
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance) {
      // Create new balance
      const balanceId = await ctx.db.insert("creditBalances", {
        userId: args.userId,
        // New credit-based fields (required)
        totalCredits: 0,
        usedCredits: 0,
        remainingCredits: 0,
        totalPurchasedCredits: 0,
        totalSpentCredits: 0,
        // Legacy fields (for backward compat during migration)
        balanceIDR: args.amountIDR,
        balanceTokens: tokensToAdd,
        totalTopUpIDR: args.amountIDR,
        totalSpentIDR: 0,
        lastTopUpAt: now,
        lastTopUpAmount: args.amountIDR,
        createdAt: now,
        updatedAt: now,
      })

      // Also update user subscriptionStatus to "bpp" if they were on "free"
      const user = await ctx.db.get(args.userId)
      if (user && user.subscriptionStatus === "free") {
        await ctx.db.patch(args.userId, {
          subscriptionStatus: "bpp",
          updatedAt: now,
        })
      }

      return {
        balanceId,
        newBalanceIDR: args.amountIDR,
        newBalanceTokens: tokensToAdd,
      }
    }

    // Update existing balance (use ?? 0 for optional legacy fields)
    const newBalanceIDR = (balance.balanceIDR ?? 0) + args.amountIDR
    const newBalanceTokens = (balance.balanceTokens ?? 0) + tokensToAdd

    await ctx.db.patch(balance._id, {
      balanceIDR: newBalanceIDR,
      balanceTokens: newBalanceTokens,
      totalTopUpIDR: (balance.totalTopUpIDR ?? 0) + args.amountIDR,
      lastTopUpAt: now,
      lastTopUpAmount: args.amountIDR,
      updatedAt: now,
    })

    // Also update user subscriptionStatus to "bpp" if they were on "free"
    const user = await ctx.db.get(args.userId)
    if (user && user.subscriptionStatus === "free") {
      await ctx.db.patch(args.userId, {
        subscriptionStatus: "bpp",
        updatedAt: now,
      })
    }

    return {
      balanceId: balance._id,
      newBalanceIDR,
      newBalanceTokens,
      previousBalanceIDR: balance.balanceIDR,
    }
  },
})

/**
 * Deduct credits after token usage
 * Called after successful AI response for BPP users
 */
export const deductCredits = mutation({
  args: {
    userId: v.id("users"),
    tokensUsed: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance) {
      throw new Error("Credit balance not found")
    }

    const costIDR = calculateCostIDR(args.tokensUsed)
    const currentBalanceIDR = balance.balanceIDR ?? 0

    // Check if sufficient balance
    if (currentBalanceIDR < costIDR) {
      throw new Error(`Insufficient credit balance. Required: Rp ${costIDR}, Available: Rp ${currentBalanceIDR}`)
    }

    const newBalanceIDR = currentBalanceIDR - costIDR
    const newBalanceTokens = Math.max(0, (balance.balanceTokens ?? 0) - args.tokensUsed)

    await ctx.db.patch(balance._id, {
      balanceIDR: newBalanceIDR,
      balanceTokens: newBalanceTokens,
      totalSpentIDR: (balance.totalSpentIDR ?? 0) + costIDR,
      updatedAt: Date.now(),
    })

    return {
      deductedIDR: costIDR,
      deductedTokens: args.tokensUsed,
      newBalanceIDR,
      newBalanceTokens,
    }
  },
})

/**
 * Check if user has sufficient credits
 * Pre-flight check before AI operation
 */
export const checkCredits = query({
  args: {
    userId: v.id("users"),
    estimatedTokens: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    const estimatedCost = calculateCostIDR(args.estimatedTokens)
    const currentBalance = balance?.balanceIDR ?? 0

    if (currentBalance < estimatedCost) {
      return {
        sufficient: false,
        currentBalanceIDR: currentBalance,
        estimatedCostIDR: estimatedCost,
        shortfallIDR: estimatedCost - currentBalance,
        message: `Saldo tidak cukup. Estimasi: Rp ${estimatedCost.toLocaleString("id-ID")}, saldo: Rp ${currentBalance.toLocaleString("id-ID")}`,
      }
    }

    return {
      sufficient: true,
      currentBalanceIDR: currentBalance,
      estimatedCostIDR: estimatedCost,
      remainingAfterIDR: currentBalance - estimatedCost,
    }
  },
})

/**
 * Get credit transaction history
 * Top-ups and deductions
 */
export const getCreditHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const limitCount = args.limit ?? 30

    // Get top-up payments
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("paymentType", "credit_topup")
      )
      .order("desc")
      .take(limitCount)

    // Get usage events for this user
    const usageEvents = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limitCount)

    // Combine and sort by date
    const transactions = [
      ...payments
        .filter((p) => p.status === "SUCCEEDED")
        .map((p) => ({
          id: p._id,
          type: "topup" as const,
          description: `Top Up via ${p.paymentMethod}`,
          amount: p.amount,
          balanceAfter: 0, // Will calculate if needed
          createdAt: p.paidAt ?? p.createdAt,
        })),
      ...usageEvents.map((e) => ({
        id: e._id,
        type: "deduct" as const,
        description: `${e.operationType === "chat_message" ? "Chat" : e.operationType === "paper_generation" ? "Paper" : e.operationType === "web_search" ? "Web Search" : "Refrasa"} - ${e.totalTokens.toLocaleString("id-ID")} tokens`,
        amount: -e.costIDR,
        balanceAfter: 0,
        createdAt: e.createdAt,
      })),
    ].sort((a, b) => b.createdAt - a.createdAt)

    return transactions.slice(0, limitCount)
  },
})
