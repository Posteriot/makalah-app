import { query } from "./_generated/server"

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
  args: {},
  handler: async (ctx) => {
    // This is a placeholder - actual implementation would use args
    return null
  },
})
