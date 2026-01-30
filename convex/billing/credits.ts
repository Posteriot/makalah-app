/**
 * Credit Balance Management
 * For BPP (Bayar Per Paper) tier users
 *
 * Credit System: 1 kredit = 1.000 tokens
 */

import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { tokensToCredits } from "./constants"
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
        totalCredits: 0,
        usedCredits: 0,
        remainingCredits: 0,
        totalPurchasedCredits: 0,
        totalSpentCredits: 0,
        lastPurchaseAt: null,
        lastPurchaseType: null,
        lastPurchaseCredits: null,
      }
    }

    return {
      totalCredits: balance.totalCredits,
      usedCredits: balance.usedCredits,
      remainingCredits: balance.remainingCredits,
      totalPurchasedCredits: balance.totalPurchasedCredits,
      totalSpentCredits: balance.totalSpentCredits,
      lastPurchaseAt: balance.lastPurchaseAt,
      lastPurchaseType: balance.lastPurchaseType,
      lastPurchaseCredits: balance.lastPurchaseCredits,
    }
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
      totalCredits: 0,
      usedCredits: 0,
      remainingCredits: 0,
      totalPurchasedCredits: 0,
      totalSpentCredits: 0,
      createdAt: now,
      updatedAt: now,
    })

    return balanceId
  },
})

/**
 * Add credits after successful payment
 * Called from payment webhook handler
 */
export const addCredits = mutation({
  args: {
    userId: v.id("users"),
    credits: v.number(),
    packageType: v.string(),
    paymentId: v.optional(v.id("payments")),
    internalKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!isInternalKeyValid(args.internalKey)) {
      await requireAuthUserId(ctx, args.userId)
    }

    const now = Date.now()

    // Get or create balance
    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance) {
      // Create new balance
      const balanceId = await ctx.db.insert("creditBalances", {
        userId: args.userId,
        totalCredits: args.credits,
        usedCredits: 0,
        remainingCredits: args.credits,
        totalPurchasedCredits: args.credits,
        totalSpentCredits: 0,
        lastPurchaseAt: now,
        lastPurchaseType: args.packageType,
        lastPurchaseCredits: args.credits,
        createdAt: now,
        updatedAt: now,
      })

      // Upgrade user to BPP tier if on free
      const user = await ctx.db.get(args.userId)
      if (user && user.subscriptionStatus === "free") {
        await ctx.db.patch(args.userId, {
          subscriptionStatus: "bpp",
          updatedAt: now,
        })
      }

      return {
        balanceId,
        newTotalCredits: args.credits,
        newRemainingCredits: args.credits,
      }
    }

    // Update existing balance (use ?? 0 for migration safety)
    const newTotalCredits = (balance.totalCredits ?? 0) + args.credits
    const newRemainingCredits = (balance.remainingCredits ?? 0) + args.credits

    await ctx.db.patch(balance._id, {
      totalCredits: newTotalCredits,
      remainingCredits: newRemainingCredits,
      totalPurchasedCredits: (balance.totalPurchasedCredits ?? 0) + args.credits,
      lastPurchaseAt: now,
      lastPurchaseType: args.packageType,
      lastPurchaseCredits: args.credits,
      updatedAt: now,
    })

    // Upgrade user to BPP tier if on free
    const user = await ctx.db.get(args.userId)
    if (user && user.subscriptionStatus === "free") {
      await ctx.db.patch(args.userId, {
        subscriptionStatus: "bpp",
        updatedAt: now,
      })
    }

    return {
      balanceId: balance._id,
      newTotalCredits,
      newRemainingCredits,
      previousRemainingCredits: balance.remainingCredits ?? 0,
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
    sessionId: v.optional(v.id("paperSessions")),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)

    const creditsToDeduct = tokensToCredits(args.tokensUsed)

    const balance = await ctx.db
      .query("creditBalances")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first()

    if (!balance) {
      throw new Error("Credit balance not found")
    }

    const currentRemaining = balance.remainingCredits ?? 0
    if (currentRemaining < creditsToDeduct) {
      throw new Error(
        `Insufficient credits. Required: ${creditsToDeduct}, Available: ${currentRemaining}`
      )
    }

    const newUsedCredits = (balance.usedCredits ?? 0) + creditsToDeduct
    const newRemainingCredits = currentRemaining - creditsToDeduct

    await ctx.db.patch(balance._id, {
      usedCredits: newUsedCredits,
      remainingCredits: newRemainingCredits,
      totalSpentCredits: (balance.totalSpentCredits ?? 0) + creditsToDeduct,
      updatedAt: Date.now(),
    })

    // Update paper session credit tracking if provided
    if (args.sessionId) {
      const session = await ctx.db.get(args.sessionId)
      if (session) {
        const sessionCreditUsed = (session.creditUsed ?? 0) + creditsToDeduct
        const sessionCreditRemaining =
          (session.creditAllotted ?? 300) - sessionCreditUsed
        const isSoftBlocked = sessionCreditRemaining <= 0

        await ctx.db.patch(args.sessionId, {
          creditUsed: sessionCreditUsed,
          creditRemaining: sessionCreditRemaining,
          isSoftBlocked,
          ...(isSoftBlocked ? { softBlockedAt: Date.now() } : {}),
        })
      }
    }

    return {
      creditsDeducted: creditsToDeduct,
      tokensUsed: args.tokensUsed,
      remainingCredits: newRemainingCredits,
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

    const estimatedCredits = tokensToCredits(args.estimatedTokens)
    const currentCredits = balance?.remainingCredits ?? 0

    if (currentCredits < estimatedCredits) {
      return {
        sufficient: false,
        currentCredits,
        estimatedCredits,
        shortfallCredits: estimatedCredits - currentCredits,
        message: `Kredit tidak cukup. Estimasi: ${estimatedCredits} kredit, saldo: ${currentCredits} kredit`,
      }
    }

    return {
      sufficient: true,
      currentCredits,
      estimatedCredits,
      remainingAfter: currentCredits - estimatedCredits,
    }
  },
})

/**
 * Get credit transaction history
 */
export const getCreditHistory = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const limitCount = args.limit ?? 30

    // Get purchases (payments with packageType)
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_user_type", (q) =>
        q.eq("userId", args.userId).eq("paymentType", "credit_topup")
      )
      .order("desc")
      .take(limitCount)

    // Get usage events
    const usageEvents = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_time", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limitCount)

    // Combine and sort
    const transactions = [
      ...payments
        .filter((p) => p.status === "SUCCEEDED")
        .map((p) => ({
          id: p._id,
          type: "purchase" as const,
          description: `Beli ${p.packageType ?? "Paket"}`,
          credits: p.credits ?? 0,
          createdAt: p.paidAt ?? p.createdAt,
        })),
      ...usageEvents.map((e) => ({
        id: e._id,
        type: "usage" as const,
        description: `${e.operationType === "chat_message" ? "Chat" : e.operationType === "paper_generation" ? "Paper" : e.operationType === "web_search" ? "Web Search" : "Refrasa"}`,
        credits: -tokensToCredits(e.totalTokens),
        createdAt: e.createdAt,
      })),
    ].sort((a, b) => b.createdAt - a.createdAt)

    return transactions.slice(0, limitCount)
  },
})
