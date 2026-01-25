"use client"

import { cn } from "@/lib/utils"

/**
 * User segment types based on role and subscription status
 */
type SegmentType = "gratis" | "bpp" | "pro" | "admin" | "superadmin"

/**
 * Segment badge configuration for each segment type
 * Colors follow the mockup design:
 * - superadmin: purple
 * - admin: blue
 * - pro: green
 * - bpp: orange
 * - gratis: yellow
 */
const SEGMENT_CONFIG: Record<SegmentType, { label: string; className: string }> = {
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
    className: "bg-segment-pro text-white",
  },
  admin: {
    label: "ADMIN",
    className: "bg-segment-admin text-white",
  },
  superadmin: {
    label: "SUPERADMIN",
    className: "bg-segment-superadmin text-white",
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
 * Determine segment type from user role and subscription status
 */
function getSegmentFromUser(role?: string, subscriptionStatus?: string): SegmentType {
  // Check role first for admin/superadmin
  if (role === "superadmin") return "superadmin"
  if (role === "admin") return "admin"

  // Then check subscription status
  if (subscriptionStatus === "pro") return "pro"
  if (subscriptionStatus === "bpp") return "bpp"

  return "gratis"
}

/**
 * SegmentBadge - User segment indicator
 *
 * Displays the user's current segment/tier as a colored badge.
 * Variations:
 * - superadmin (purple)
 * - admin (blue)
 * - pro (green)
 * - bpp (orange)
 * - gratis (yellow)
 */
export function SegmentBadge({ role, subscriptionStatus, className }: SegmentBadgeProps) {
  const segment = getSegmentFromUser(role, subscriptionStatus)
  const config = SEGMENT_CONFIG[segment]

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded",
        "text-[10px] font-bold uppercase tracking-wide",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

export default SegmentBadge
