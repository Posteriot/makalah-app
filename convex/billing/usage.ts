/**
 * Usage Event Tracking
 * Record dan query token usage events
 */

import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { calculateCostIDR } from "./constants"
import { requireAuthUserId, verifyAuthUserId } from "../authHelpers"

/**
 * Record a token usage event
 * Called from chat API onFinish callback
 */
export const recordUsage = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    sessionId: v.optional(v.id("paperSessions")),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    model: v.string(),
    operationType: v.union(
      v.literal("chat_message"),
      v.literal("paper_generation"),
      v.literal("web_search"),
      v.literal("refrasa")
    ),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const costIDR = calculateCostIDR(args.totalTokens)

    const eventId = await ctx.db.insert("usageEvents", {
      userId: args.userId,
      conversationId: args.conversationId,
      sessionId: args.sessionId,
      promptTokens: args.promptTokens,
      completionTokens: args.completionTokens,
      totalTokens: args.totalTokens,
      costIDR,
      model: args.model,
      operationType: args.operationType,
      createdAt: Date.now(),
    })

    return { eventId, costIDR }
  },
})

/**
 * Get usage events for a user within a time period
 */
export const getUsageByPeriod = query({
  args: {
    userId: v.id("users"),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId)
    const events = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_time", (q) =>
        q
          .eq("userId", args.userId)
          .gte("createdAt", args.periodStart)
          .lte("createdAt", args.periodEnd)
      )
      .collect()

    return events
  },
})

/**
 * Get aggregated usage for current month
 * Returns total tokens and cost breakdown by operation type
 */
export const getMonthlyBreakdown = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (!await verifyAuthUserId(ctx, args.userId)) return null
    // Get current month boundaries
    const now = new Date()
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime()

    const events = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_time", (q) =>
        q
          .eq("userId", args.userId)
          .gte("createdAt", periodStart)
          .lte("createdAt", periodEnd)
      )
      .collect()

    // Aggregate by operation type
    const breakdown = {
      chat_message: { tokens: 0, cost: 0, count: 0 },
      paper_generation: { tokens: 0, cost: 0, count: 0 },
      web_search: { tokens: 0, cost: 0, count: 0 },
      refrasa: { tokens: 0, cost: 0, count: 0 },
    }

    let totalTokens = 0
    let totalCost = 0

    for (const event of events) {
      const type = event.operationType as keyof typeof breakdown
      breakdown[type].tokens += event.totalTokens
      breakdown[type].cost += event.costIDR
      breakdown[type].count += 1
      totalTokens += event.totalTokens
      totalCost += event.costIDR
    }

    return {
      periodStart,
      periodEnd,
      totalTokens,
      totalCost,
      breakdown: [
        { type: "Chat", ...breakdown.chat_message, icon: "MessageSquare" },
        { type: "Paper", ...breakdown.paper_generation, icon: "FileText" },
        { type: "Web Search", ...breakdown.web_search, icon: "Search" },
        { type: "Refrasa", ...breakdown.refrasa, icon: "RefreshCw" },
      ].filter((b) => b.count > 0),
    }
  },
})

/**
 * Get today's usage for daily limit check
 */
export const getTodayUsage = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    const events = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_time", (q) =>
        q.eq("userId", args.userId).gte("createdAt", todayStart)
      )
      .collect()

    const totalTokens = events.reduce((sum, e) => sum + e.totalTokens, 0)

    return { totalTokens, eventCount: events.length }
  },
})

/**
 * Get usage for a specific paper session
 */
export const getSessionUsage = query({
  args: {
    sessionId: v.id("paperSessions"),
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("usageEvents")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect()

    const totalTokens = events.reduce((sum, e) => sum + e.totalTokens, 0)
    const totalCost = events.reduce((sum, e) => sum + e.costIDR, 0)

    return {
      totalTokens,
      totalCost,
      eventCount: events.length,
      events,
    }
  },
})

/**
 * Get usage summary for admin dashboard
 */
export const getUsageSummary = query({
  args: {
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    // Note: This is a simple implementation
    // For production, consider using aggregate queries or pre-computed summaries
    const events = await ctx.db
      .query("usageEvents")
      .withIndex("by_user_time")
      .filter((q) =>
        q.and(
          q.gte(q.field("createdAt"), args.periodStart),
          q.lte(q.field("createdAt"), args.periodEnd)
        )
      )
      .collect()

    // Count unique users
    const uniqueUsers = new Set(events.map((e) => e.userId)).size

    const totalTokens = events.reduce((sum, e) => sum + e.totalTokens, 0)
    const totalCost = events.reduce((sum, e) => sum + e.costIDR, 0)

    return {
      uniqueUsers,
      totalEvents: events.length,
      totalTokens,
      totalCost,
    }
  },
})
