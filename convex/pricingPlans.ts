import { v } from "convex/values"
import { query } from "./_generated/server"
import { TOP_UP_PACKAGES, CREDIT_PACKAGES } from "./billing/constants"

/**
 * Query active pricing plans sorted by sortOrder
 * Used on marketing home page and pricing page
 */
export const getActivePlans = query({
  args: {},
  handler: async (ctx) => {
    const plans = await ctx.db
      .query("pricingPlans")
      .withIndex("by_sortOrder")
      .collect()

    return plans
  },
})

/**
 * Query a single plan by slug
 * Used for plan detail pages
 */
export const getPlanBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    return plan
  },
})

/**
 * Get topup options for a specific plan (BPP)
 * Returns topupOptions from database with fallback to hardcoded constants
 * Used by Plans Hub page for inline payment
 */
export const getTopupOptionsForPlan = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    // If plan not found, return fallback
    if (!plan) {
      console.warn(`[pricingPlans] Plan not found: ${args.slug}, using fallback`)
      return {
        planExists: false,
        topupOptions: TOP_UP_PACKAGES.map((pkg) => ({
          amount: pkg.amount,
          tokens: pkg.tokens,
          label: pkg.label,
          popular: "popular" in pkg ? pkg.popular : false,
        })),
      }
    }

    // If plan has topupOptions, use them
    if (plan.topupOptions && plan.topupOptions.length > 0) {
      return {
        planExists: true,
        topupOptions: plan.topupOptions,
      }
    }

    // Fallback to hardcoded constants
    return {
      planExists: true,
      topupOptions: TOP_UP_PACKAGES.map((pkg) => ({
        amount: pkg.amount,
        tokens: pkg.tokens,
        label: pkg.label,
        popular: "popular" in pkg ? pkg.popular : false,
      })),
    }
  },
})

/**
 * Get credit packages for a specific plan (BPP)
 * Returns creditPackages from database with fallback to hardcoded constants
 */
export const getCreditPackagesForPlan = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db
      .query("pricingPlans")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    if (!plan) {
      console.warn(`[pricingPlans] Plan not found: ${args.slug}, using fallback`)
      return {
        planExists: false,
        creditPackages: CREDIT_PACKAGES.map(pkg => ({
          type: pkg.type,
          credits: pkg.credits,
          tokens: pkg.tokens,
          priceIDR: pkg.priceIDR,
          label: pkg.label,
          description: pkg.description,
          ratePerCredit: pkg.ratePerCredit,
          popular: pkg.type === "paper",
        })),
      }
    }

    if (plan.creditPackages && plan.creditPackages.length > 0) {
      return {
        planExists: true,
        creditPackages: plan.creditPackages,
      }
    }

    // Fallback to constants
    return {
      planExists: true,
      creditPackages: CREDIT_PACKAGES.map(pkg => ({
        type: pkg.type,
        credits: pkg.credits,
        tokens: pkg.tokens,
        priceIDR: pkg.priceIDR,
        label: pkg.label,
        description: pkg.description,
        ratePerCredit: pkg.ratePerCredit,
        popular: pkg.type === "paper",
      })),
    }
  },
})
