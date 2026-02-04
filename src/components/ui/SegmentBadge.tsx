"use client"

import { cn } from "@/lib/utils"

/**
 * Subscription tier types for badge display
 * This badge shows subscription status, not user role.
 * Admin/superadmin are treated as "pro" since they have full access.
 */
type SubscriptionTier = "gratis" | "bpp" | "pro"

/**
 * Subscription tier badge configuration
 * Colors follow the pricing page design:
 * - GRATIS: Emerald 600 (Secondary Brand)
 * - BPP: Sky 600 (Info/Professional)
 * - PRO: Amber 500 (Main Brand)
 */
const TIER_CONFIG: Record<SubscriptionTier, { label: string; className: string }> = {
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
 * Determine subscription tier from user role and subscription status
 * Admin/superadmin are treated as "pro" since they have full access.
 */
function getSubscriptionTier(role?: string, subscriptionStatus?: string): SubscriptionTier {
  // Admin and superadmin are always treated as pro
  if (role === "superadmin" || role === "admin") return "pro"

  // Check subscription status
  if (subscriptionStatus === "pro") return "pro"
  if (subscriptionStatus === "bpp") return "bpp"

  return "gratis"
}

/**
 * SegmentBadge - User subscription tier indicator
 *
 * Displays the user's current subscription tier as a colored badge.
 * This badge represents subscription status (related to model quality features),
 * not user role. Admin/superadmin are shown as "PRO" since they have full access.
 *
 * Variations:
 * - GRATIS (green) - free tier
 * - BPP (blue) - pay per paper
 * - PRO (orange) - premium subscription
 */
export function SegmentBadge({ role, subscriptionStatus, className }: SegmentBadgeProps) {
  const tier = getSubscriptionTier(role, subscriptionStatus)
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
