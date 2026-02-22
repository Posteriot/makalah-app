import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireRole } from "./permissions"

/**
 * Get the current waitlist mode status.
 * Returns false if no config entry exists (default: off).
 */
export const getWaitlistMode = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "waitlistMode"))
      .unique()

    return config?.value === true
  },
})

/**
 * Get custom waitlist UI texts (subtitle + CTA button).
 * Returns empty strings if not set — frontend uses defaults.
 */
export const getWaitlistTexts = query({
  args: {},
  handler: async (ctx) => {
    const [subtitle, ctaText] = await Promise.all([
      ctx.db.query("appConfig").withIndex("by_key", (q) => q.eq("key", "waitlistSubtitle")).unique(),
      ctx.db.query("appConfig").withIndex("by_key", (q) => q.eq("key", "waitlistCtaText")).unique(),
    ])

    return {
      subtitle: (typeof subtitle?.value === "string" ? subtitle.value : "") as string,
      ctaText: (typeof ctaText?.value === "string" ? ctaText.value : "") as string,
    }
  },
})

/**
 * Set custom waitlist UI texts (admin/superadmin only).
 */
export const setWaitlistTexts = mutation({
  args: {
    adminUserId: v.id("users"),
    subtitle: v.string(),
    ctaText: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.adminUserId, "admin")

    const keys = [
      { key: "waitlistSubtitle", value: args.subtitle },
      { key: "waitlistCtaText", value: args.ctaText },
    ] as const

    for (const { key, value } of keys) {
      const existing = await ctx.db
        .query("appConfig")
        .withIndex("by_key", (q) => q.eq("key", key))
        .unique()

      if (existing) {
        await ctx.db.patch(existing._id, {
          value,
          updatedAt: Date.now(),
          updatedBy: args.adminUserId,
        })
      } else {
        await ctx.db.insert("appConfig", {
          key,
          value,
          updatedAt: Date.now(),
          updatedBy: args.adminUserId,
        })
      }
    }

    return { success: true }
  },
})

/**
 * Toggle waitlist mode on/off (admin/superadmin only).
 */
export const setWaitlistMode = mutation({
  args: {
    adminUserId: v.id("users"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.adminUserId, "admin")

    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "waitlistMode"))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.enabled,
        updatedAt: Date.now(),
        updatedBy: args.adminUserId,
      })
    } else {
      await ctx.db.insert("appConfig", {
        key: "waitlistMode",
        value: args.enabled,
        updatedAt: Date.now(),
        updatedBy: args.adminUserId,
      })
    }

    return { success: true }
  },
})
