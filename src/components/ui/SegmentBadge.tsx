"use client"

import { cn } from "@/lib/utils"
import { getEffectiveTier } from "@/lib/utils/subscription"
import type { EffectiveTier } from "@/lib/utils/subscription"

/**
 * Subscription tier badge configuration
 * Colors follow the pricing page design:
 * - GRATIS: Emerald 600 (Secondary Brand)
 * - BPP: Sky 600 (Info/Professional)
 * - PRO: Amber 500 (Main Brand)
 */
const TIER_CONFIG: Record<EffectiveTier, { label: string; className: string }> = {
  gratis: {
    label: "GRATIS",
    className: "bg-segment-gratis text-white",
  },
  bpp: {
    label: "BPP",
    className: "bg-segment-bpp text-white",
  },
  pro: {
    label: "PRO",
    className: "bg-segment-pro text-black",
  },
}

interface SegmentBadgeProps {
  /** User role from Convex */
  role?: string
  /** Subscription status from Convex */
  subscriptionStatus?: string
  /** Optional className for custom styling */
  className?: string
}

/**
 * SegmentBadge - User subscription tier indicator
 *
 * Displays the user's current subscription tier as a colored badge.
 * Uses shared getEffectiveTier() for tier determination.
 * Admin/superadmin are shown as "PRO" since they have full access.
 *
 * Variations:
 * - GRATIS (green) - free tier
 * - BPP (blue) - pay per paper
 * - PRO (orange) - premium subscription
 */
export function SegmentBadge({ role, subscriptionStatus, className }: SegmentBadgeProps) {
  const tier = getEffectiveTier(role, subscriptionStatus)
  const config = TIER_CONFIG[tier]

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-badge",
        "text-signal text-[10px] font-bold",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

export default SegmentBadge
