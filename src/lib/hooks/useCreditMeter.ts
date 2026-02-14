"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { useCurrentUser } from "@/lib/hooks/useCurrentUser"
import { getEffectiveTier } from "@/lib/utils/subscription"
import type { EffectiveTier } from "@/lib/utils/subscription"
import { TOKENS_PER_CREDIT, TIER_LIMITS, type TierType } from "@convex/billing/constants"

export type CreditMeterLevel = "normal" | "warning" | "critical" | "depleted"

export interface CreditMeterData {
  tier: EffectiveTier
  used: number
  total: number
  remaining: number
  percentage: number
  level: CreditMeterLevel
  overage?: number
  overageCost?: number
  periodEnd?: number
  cancelAtPeriodEnd?: boolean
  isLoading: boolean
  isAdmin: boolean
}

/**
 * Normalizes data from 3 existing Convex queries into universal kredit format.
 * 1 kredit = 1.000 tokens (TOKENS_PER_CREDIT from constants).
 *
 * Subscribes to:
 * - api.billing.quotas.getQuotaStatus (Gratis/Pro tokens + BPP credits)
 * - api.billing.credits.getCreditBalance (BPP detailed balance)
 * - api.billing.subscriptions.checkSubscriptionStatus (Pro subscription info)
 */
export function useCreditMeter(): CreditMeterData {
  const { user, isLoading: userLoading } = useCurrentUser()

  const tier = user ? getEffectiveTier(user.role, user.subscriptionStatus) : "gratis"
  const isAdmin = user?.role === "admin" || user?.role === "superadmin"

  // Query quota status (all tiers)
  const quotaStatus = useQuery(
    api.billing.quotas.getQuotaStatus,
    user?._id ? { userId: user._id } : "skip"
  )

  // Query credit balance (BPP only, skip for other tiers)
  const creditBalance = useQuery(
    api.billing.credits.getCreditBalance,
    user?._id && tier === "bpp" ? { userId: user._id } : "skip"
  )

  // Query subscription status (Pro only)
  const subscriptionStatus = useQuery(
    api.billing.subscriptions.checkSubscriptionStatus,
    user?._id && tier === "pro" ? { userId: user._id } : "skip"
  )

  // Loading state
  if (userLoading || !user || quotaStatus === undefined) {
    return {
      tier,
      used: 0,
      total: 0,
      remaining: 0,
      percentage: 0,
      level: "normal",
      isLoading: true,
      isAdmin,
    }
  }

  // Admin/superadmin — unlimited access
  if (isAdmin) {
    return {
      tier: "unlimited",
      used: 0,
      total: Infinity,
      remaining: Infinity,
      percentage: 0,
      level: "normal",
      isLoading: false,
      isAdmin: true,
    }
  }

  // BPP tier — credit-based
  if (tier === "bpp") {
    const used = creditBalance?.usedCredits ?? 0
    const totalCredits = creditBalance?.totalCredits ?? 0
    const remaining = creditBalance?.remainingCredits ?? quotaStatus?.currentCredits ?? 0
    const level: CreditMeterLevel =
      remaining < 30 ? "critical" : remaining < 100 ? "warning" : "normal"

    return {
      tier: "bpp",
      used,
      total: totalCredits,
      remaining,
      percentage: totalCredits > 0 ? Math.round((used / totalCredits) * 100) : 0,
      level,
      isLoading: creditBalance === undefined,
      isAdmin: false,
    }
  }

  // Gratis / Pro tier — token-based, convert to kredit
  const usedTokens = quotaStatus?.usedTokens ?? 0
  // When quota not initialized (needsInit), use tier's expected monthly allocation
  const tierMonthlyTokens = TIER_LIMITS[tier as TierType]?.monthlyTokens ?? 0
  const allottedTokens = quotaStatus?.allottedTokens ?? tierMonthlyTokens
  const used = Math.ceil(usedTokens / TOKENS_PER_CREDIT)
  const total = Math.floor(allottedTokens / TOKENS_PER_CREDIT)
  const remaining = Math.max(0, total - used)
  const percentage = total > 0 ? Math.round((used / total) * 100) : 0

  // Level from warningLevel
  const warningLevel = quotaStatus?.warningLevel ?? "none"
  let level: CreditMeterLevel = "normal"
  if (warningLevel === "blocked") level = "depleted"
  else if (warningLevel === "critical") level = "critical"
  else if (warningLevel === "warning") level = "warning"

  // Pro overage
  const overageTokens = quotaStatus?.overageTokens ?? 0
  const overage = overageTokens > 0 ? Math.ceil(overageTokens / TOKENS_PER_CREDIT) : undefined
  const overageCost = overageTokens > 0 ? (quotaStatus?.overageCostIDR ?? 0) : undefined

  // Pro subscription details
  const periodEnd = subscriptionStatus?.currentPeriodEnd ?? quotaStatus?.periodEnd
  const cancelAtPeriodEnd = subscriptionStatus?.isPendingCancel

  return {
    tier,
    used,
    total,
    remaining,
    percentage,
    level,
    overage,
    overageCost,
    periodEnd,
    cancelAtPeriodEnd,
    isLoading: false,
    isAdmin: false,
  }
}
