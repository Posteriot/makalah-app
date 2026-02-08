export type EffectiveTier = "gratis" | "bpp" | "pro"

/**
 * Determine the effective subscription tier from user role and raw subscriptionStatus.
 *
 * Admin/superadmin are always treated as PRO (unlimited access) regardless of
 * their subscriptionStatus in the database (which defaults to "free").
 *
 * See docs/subscription-tier/tier-determination-logic.md for full context.
 */
export function getEffectiveTier(role?: string, subscriptionStatus?: string): EffectiveTier {
  // Admin and superadmin are always treated as PRO (unlimited access)
  if (role === "superadmin" || role === "admin") return "pro"

  // Regular users: check subscriptionStatus
  if (subscriptionStatus === "pro") return "pro"
  if (subscriptionStatus === "bpp") return "bpp"

  // Default for "free", "canceled", undefined, or any unknown value
  return "gratis"
}
