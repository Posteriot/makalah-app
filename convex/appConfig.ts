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

    return config?.value ?? false
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

/**
 * Check if the /get-started page is enabled.
 * Returns true if no config entry exists (default: on).
 */
export const getGetStartedEnabled = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "getStartedEnabled"))
      .unique()

    return config?.value ?? true
  },
})

/**
 * Toggle /get-started page on/off (admin/superadmin only).
 */
export const setGetStartedEnabled = mutation({
  args: {
    adminUserId: v.id("users"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.adminUserId, "admin")

    const existing = await ctx.db
      .query("appConfig")
      .withIndex("by_key", (q) => q.eq("key", "getStartedEnabled"))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        value: args.enabled,
        updatedAt: Date.now(),
        updatedBy: args.adminUserId,
      })
    } else {
      await ctx.db.insert("appConfig", {
        key: "getStartedEnabled",
        value: args.enabled,
        updatedAt: Date.now(),
        updatedBy: args.adminUserId,
      })
    }

    return { success: true }
  },
})
