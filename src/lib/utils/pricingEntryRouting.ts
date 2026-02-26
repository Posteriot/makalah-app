import { getEffectiveTier } from "@/lib/utils/subscription"

export const PRICING_ENTRY_ROUTES = {
  bppCheckout: "/checkout/bpp?from=pricing",
  proCheckout: "/checkout/pro?from=pricing",
  unlimitedProFallback: "/subscription/plans",
} as const

type ResolvePricingEntryHrefArgs = {
  planSlug?: string
  ctaHref?: string
  isSignedIn: boolean
  role?: string
  subscriptionStatus?: string
}

/**
 * Resolve pricing CTA destination for /pricing entry.
 * Intent checkout is prioritized for known paid plan slugs.
 */
export function resolvePricingEntryHref(args: ResolvePricingEntryHrefArgs): string {
  const fallbackDestination = args.ctaHref || "/"
  const effectiveTier = getEffectiveTier(args.role, args.subscriptionStatus)

  let destination = fallbackDestination

  if (args.planSlug === "bpp") {
    destination = PRICING_ENTRY_ROUTES.bppCheckout
  } else if (args.planSlug === "pro") {
    destination = effectiveTier === "unlimited"
      ? PRICING_ENTRY_ROUTES.unlimitedProFallback
      : PRICING_ENTRY_ROUTES.proCheckout
  }

  if (!args.isSignedIn) {
    return `/sign-up?redirect_url=${encodeURIComponent(destination)}`
  }

  return destination
}
