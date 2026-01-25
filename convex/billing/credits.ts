/**
 * Credit Balance Management
 * For BPP (pay-as-you-go) tier users
 */

import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { calculateCostIDR, TOKENS_PER_IDR } from "./constants"

/**
 * Get user's credit balance
 */
export const getCreditBalance = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
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
  },
  handler: async (ctx, args) => {
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
        balanceIDR: args.amountIDR,
        balanceTokens: tokensToAdd,
        totalTopUpIDR: args.amountIDR,
        totalSpentIDR: 0,
        lastTopUpAt: now,
        lastTopUpAmount: args.amountIDR,
        createdAt: now,
        updatedAt: now,
      })

      return {
        balanceId,
        newBalanceIDR: args.amountIDR,
        newBalanceTokens: tokensToAdd,
      }
    }

    // Update existing balance
    const newBalanceIDR = balance.balanceIDR + args.amountIDR
    const newBalanceTokens = balance.balanceTokens + tokensToAdd

    await ctx.db.patch(balance._id, {
      balanceIDR: newBalanceIDR,
      balanceTokens: newBalanceTokens,
      totalTopUpIDR: balance.totalTopUpIDR + args.amountIDR,
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
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance) {
      throw new Error("Credit balance not found")
    }

    const costIDR = calculateCostIDR(args.tokensUsed)

    // Check if sufficient balance
    if (balance.balanceIDR < costIDR) {
      throw new Error(`Insufficient credit balance. Required: Rp ${costIDR}, Available: Rp ${balance.balanceIDR}`)
    }

    const newBalanceIDR = balance.balanceIDR - costIDR
    const newBalanceTokens = Math.max(0, balance.balanceTokens - args.tokensUsed)

    await ctx.db.patch(balance._id, {
      balanceIDR: newBalanceIDR,
      balanceTokens: newBalanceTokens,
      totalSpentIDR: balance.totalSpentIDR + costIDR,
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
