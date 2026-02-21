import { query } from "../_generated/server"
import { v } from "convex/values"
import { CREDIT_PACKAGES, SUBSCRIPTION_PRICING } from "./constants"

/**
 * Get BPP credit package pricing from DB, fallback to constants.
 * Used by topup payment endpoint.
 */
export const getBppCreditPackage = query({
  args: { packageType: v.string() },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", "bpp"))
      .first()

    if (plan?.creditPackages && plan.creditPackages.length > 0) {
      const dbPkg = plan.creditPackages.find((p) => p.type === args.packageType)
      if (dbPkg) {
        return {
          source: "db" as const,
          credits: dbPkg.credits,
          tokens: dbPkg.tokens,
          priceIDR: dbPkg.priceIDR,
          label: dbPkg.label,
          description: dbPkg.description ?? "",
        }
      }
    }

    const constPkg = CREDIT_PACKAGES.find((p) => p.type === args.packageType)
    if (!constPkg) return null

    return {
      source: "constants" as const,
      credits: constPkg.credits,
      tokens: constPkg.tokens,
      priceIDR: constPkg.priceIDR,
      label: constPkg.label,
      description: constPkg.description,
    }
  },
})

/**
 * Get Pro subscription pricing from DB, fallback to constants.
 * Used by subscribe payment endpoint.
 */
export const getProPricing = query({
  args: {},
  handler: async (ctx) => {
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", "pro"))
      .first()

    if (plan?.priceValue) {
      return {
        source: "db" as const,
        priceIDR: plan.priceValue,
        label: plan.name ?? "Pro Bulanan",
        intervalMonths: 1,
      }
    }

    const pricing = SUBSCRIPTION_PRICING.pro_monthly
    return {
      source: "constants" as const,
      priceIDR: pricing.priceIDR,
      label: pricing.label,
      intervalMonths: pricing.intervalMonths,
    }
  },
})

/**
 * Check if a plan tier is disabled (not available for purchase).
 */
export const isPlanDisabled = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    return plan?.isDisabled ?? false
  },
})
