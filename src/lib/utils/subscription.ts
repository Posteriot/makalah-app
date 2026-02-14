export type EffectiveTier = "gratis" | "bpp" | "pro" | "unlimited"

/**
 * Determine the effective subscription tier from user role and raw subscriptionStatus.
 *
 * Admin/superadmin get "unlimited" tier — derived from role, not stored in DB.
 * Backend admin bypass logic remains unchanged; this only affects the tier label
 * for UI display and consumer logic.
 *
 * See docs/subscription-tier/tier-determination-logic.md for full context.
 */
export function getEffectiveTier(role?: string, subscriptionStatus?: string): EffectiveTier {
  // Admin and superadmin have unlimited access (derived from role)
  if (role === "superadmin" || role === "admin") return "unlimited"

  // Regular users: check subscriptionStatus
  if (subscriptionStatus === "pro") return "pro"
  if (subscriptionStatus === "bpp") return "bpp"

  // Default for "free", "canceled", undefined, or any unknown value
  return "gratis"
}
