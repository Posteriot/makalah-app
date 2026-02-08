/**
 * Billing Enforcement Middleware
 * Pre-flight quota checks and post-request usage tracking
 */

import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import { Id } from "../../../convex/_generated/dataModel"
import { getEffectiveTier } from "@/lib/utils/subscription"
// Note: tokensToCredits conversion handled internally by deductCredits mutation

// Token estimation: ~4 chars = 1 token for English, ~2-3 chars for Indonesian
const CHARS_PER_TOKEN = 3

// Operation type for usage tracking
export type OperationType = "chat_message" | "paper_generation" | "web_search" | "refrasa"

export interface QuotaCheckResult {
  allowed: boolean
  tier: string
  reason?: string
  message?: string
  action?: "wait" | "upgrade" | "topup"
  warning?: string
  bypassed?: boolean
  currentBalance?: number
  requiredAmount?: number
  // Credit-specific
  currentCredits?: number
  estimatedCredits?: number
  isSoftBlocked?: boolean
}

export interface UsageRecordResult {
  eventId: string
  costIDR: number
  deducted: boolean
}

/**
 * Estimate tokens from text content
 * Used for pre-flight quota check
 */
export function estimateTokens(text: string): number {
  if (!text) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Estimate output tokens based on input
 * Output is typically 1.5-2x input for chat, higher for paper generation
 */
export function estimateTotalTokens(
  inputText: string,
  operationType: OperationType = "chat_message"
): number {
  const inputTokens = estimateTokens(inputText)

  // Multipliers based on operation type
  const outputMultipliers: Record<OperationType, number> = {
    chat_message: 1.5,
    paper_generation: 2.5,
    web_search: 2.0,
    refrasa: 1.2,
  }

  const multiplier = outputMultipliers[operationType] ?? 1.5
  return Math.ceil(inputTokens * (1 + multiplier))
}

/**
 * Pre-flight quota check before AI operation
 * Returns whether the operation is allowed
 */
export async function checkQuotaBeforeOperation(
  userId: Id<"users">,
  inputText: string,
  operationType: OperationType,
  convexToken?: string
): Promise<QuotaCheckResult> {
  const estimatedTokens = estimateTotalTokens(inputText, operationType)
  const convexOptions = convexToken ? { token: convexToken } : undefined

  const result = await fetchQuery(api.billing.quotas.checkQuota, {
    userId,
    estimatedTokens,
    operationType: operationType === "paper_generation" ? "paper" : "chat",
  }, convexOptions)

  return result as QuotaCheckResult
}

/**
 * Record token usage after AI response completes
 * Also deducts from quota/credits
 *
 * Note: AI SDK v5 uses inputTokens/outputTokens naming
 */
export async function recordUsageAfterOperation(params: {
  userId: Id<"users">
  conversationId?: Id<"conversations">
  sessionId?: Id<"paperSessions">
  inputTokens: number
  outputTokens: number
  totalTokens: number
  model: string
  operationType: OperationType
  convexToken?: string
}): Promise<UsageRecordResult | null> {
  try {
    const convexOptions = params.convexToken ? { token: params.convexToken } : undefined
    // 1. Record the usage event (map to promptTokens/completionTokens for database)
    const recordResult = await fetchMutation(api.billing.usage.recordUsage, {
      userId: params.userId,
      conversationId: params.conversationId,
      sessionId: params.sessionId,
      promptTokens: params.inputTokens,
      completionTokens: params.outputTokens,
      totalTokens: params.totalTokens,
      model: params.model,
      operationType: params.operationType,
    }, convexOptions)

    // 2. Get user to check tier
    const user = await fetchQuery(api.users.getById, { userId: params.userId }, convexOptions)
    if (!user) return null

    // 3. Admin/superadmin: skip deduction (Convex backend also bypasses)
    if (user.role === "admin" || user.role === "superadmin") {
      return {
        eventId: recordResult.eventId,
        costIDR: recordResult.costIDR,
        deducted: false,
      }
    }

    // 4. Deduct based on tier
    const tier = getEffectiveTier(user.role, user.subscriptionStatus)

    if (tier === "bpp") {
      // BPP: Deduct from credit balance
      try {
        const deductResult = await fetchMutation(api.billing.credits.deductCredits, {
          userId: params.userId,
          tokensUsed: params.totalTokens,
          sessionId: params.sessionId, // For soft-block tracking
        }, convexOptions)

        console.log(`[Billing] Credits deducted:`, {
          userId: params.userId,
          tokensUsed: params.totalTokens,
          creditsDeducted: deductResult.creditsDeducted,
          remainingCredits: deductResult.remainingCredits,
        })
      } catch (error) {
        // Check for insufficient credits (soft-block)
        if (error instanceof Error && error.message.includes("Insufficient credits")) {
          console.warn("[Billing] Soft-block triggered:", error.message)
          // Don't throw - let the response complete, UI will show soft-block
        } else {
          console.warn("[Billing] Credit deduction failed:", error)
        }
      }
    } else {
      // Gratis/Pro: Deduct from quota
      await fetchMutation(api.billing.quotas.deductQuota, {
        userId: params.userId,
        tokens: params.totalTokens,
      }, convexOptions)
    }

    return {
      eventId: recordResult.eventId,
      costIDR: recordResult.costIDR,
      deducted: true,
    }
  } catch (error) {
    console.error("[Billing] Failed to record usage:", error)
    return null
  }
}

/**
 * Create a quota exceeded response
 */
export function createQuotaExceededResponse(result: QuotaCheckResult): Response {
  return new Response(
    JSON.stringify({
      error: "quota_exceeded",
      reason: result.reason,
      message: result.message,
      action: result.action,
      currentBalance: result.currentBalance,
      requiredAmount: result.requiredAmount,
      currentCredits: result.currentCredits,
      estimatedCredits: result.estimatedCredits,
    }),
    {
      status: 402, // Payment Required
      headers: { "Content-Type": "application/json" },
    }
  )
}

/**
 * Check if user is admin (bypasses quota)
 */
export async function isAdminUser(userId: Id<"users">, convexToken?: string): Promise<boolean> {
  const convexOptions = convexToken ? { token: convexToken } : undefined
  const user = await fetchQuery(api.users.getById, { userId }, convexOptions)
  return user?.role === "admin" || user?.role === "superadmin"
}

/**
 * Determine operation type from context
 */
export function determineOperationType(params: {
  paperSessionId?: string | null
  enableWebSearch?: boolean
  isRefrasa?: boolean
}): OperationType {
  if (params.isRefrasa) return "refrasa"
  if (params.enableWebSearch) return "web_search"
  if (params.paperSessionId) return "paper_generation"
  return "chat_message"
}
