import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { requireRole } from "./permissions"
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

/**
 * Update a pricing plan's editable fields.
 * Admin only. Gratis plan has locked price and isDisabled.
 */
export const updatePricingPlan = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.id("pricingPlans"),
    name: v.optional(v.string()),
    price: v.optional(v.string()),
    priceValue: v.optional(v.number()),
    unit: v.optional(v.string()),
    tagline: v.optional(v.string()),
    teaserDescription: v.optional(v.string()),
    teaserCreditNote: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    ctaText: v.optional(v.string()),
    ctaHref: v.optional(v.string()),
    isHighlighted: v.optional(v.boolean()),
    isDisabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const plan = await ctx.db.get(args.id)
    if (!plan) throw new Error("Plan not found")

    // Gratis lockdown: reject price and disable changes
    if (plan.slug === "gratis") {
      if (args.price !== undefined || args.priceValue !== undefined) {
        throw new Error("Cannot change Gratis plan price")
      }
      if (args.isDisabled !== undefined) {
        throw new Error("Cannot disable Gratis plan")
      }
    }

    const { requestorId, id, ...updates } = args
    const patch: Record<string, unknown> = { updatedAt: Date.now() }
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        patch[key] = value
      }
    }

    await ctx.db.patch(id, patch)
  },
})

/**
 * Update credit packages for a pricing plan (BPP only).
 * Admin only.
 */
export const updateCreditPackages = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.id("pricingPlans"),
    creditPackages: v.array(
      v.object({
        type: v.union(v.literal("paper"), v.literal("extension_s"), v.literal("extension_m")),
        credits: v.number(),
        tokens: v.number(),
        priceIDR: v.number(),
        label: v.string(),
        description: v.optional(v.string()),
        ratePerCredit: v.optional(v.number()),
        popular: v.optional(v.boolean()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const plan = await ctx.db.get(args.id)
    if (!plan) throw new Error("Plan not found")
    if (plan.slug !== "bpp") throw new Error("Credit packages only for BPP plan")

    await ctx.db.patch(args.id, {
      creditPackages: args.creditPackages,
      updatedAt: Date.now(),
    })
  },
})
