import { v } from "convex/values"
import { mutation, query } from "../_generated/server"
import { requireRole } from "../permissions"

/**
 * Get the currently active payment provider configuration.
 * No auth required — used by payment API routes at runtime.
 * Returns sensible defaults when no config exists in DB.
 */
export const getActiveConfig = query({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db
      .query("paymentProviderConfigs")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    if (!config) {
      // Return defaults when no config exists
      return {
        activeProvider: "xendit" as const,
        enabledMethods: ["QRIS", "VIRTUAL_ACCOUNT", "EWALLET"] as const,
        webhookUrl: "/api/webhooks/payment",
        defaultExpiryMinutes: 30,
      }
    }

    return {
      activeProvider: config.activeProvider,
      enabledMethods: config.enabledMethods,
      webhookUrl: config.webhookUrl ?? "/api/webhooks/payment",
      defaultExpiryMinutes: config.defaultExpiryMinutes ?? 30,
    }
  },
})

/**
 * Create or update the active payment provider configuration.
 * Admin only. Upserts: patches existing active config or inserts new one.
 */
export const upsertConfig = mutation({
  args: {
    requestorUserId: v.id("users"),
    activeProvider: v.union(v.literal("xendit"), v.literal("midtrans")),
    enabledMethods: v.array(
      v.union(v.literal("QRIS"), v.literal("VIRTUAL_ACCOUNT"), v.literal("EWALLET"))
    ),
    webhookUrl: v.optional(v.string()),
    defaultExpiryMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorUserId, "admin")

    const now = Date.now()

    // Get admin email for audit trail
    const admin = await ctx.db.get(args.requestorUserId)
    const updatedBy = admin?.email ?? "unknown"

    const existing = await ctx.db
      .query("paymentProviderConfigs")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        activeProvider: args.activeProvider,
        enabledMethods: args.enabledMethods,
        webhookUrl: args.webhookUrl,
        defaultExpiryMinutes: args.defaultExpiryMinutes,
        updatedBy,
        updatedAt: now,
      })
      return existing._id
    }

    return await ctx.db.insert("paymentProviderConfigs", {
      activeProvider: args.activeProvider,
      enabledMethods: args.enabledMethods,
      webhookUrl: args.webhookUrl,
      defaultExpiryMinutes: args.defaultExpiryMinutes,
      isActive: true,
      updatedBy,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Check if payment provider environment variables are configured.
 * Admin only. Returns boolean flags only — never exposes actual values.
 */
export const checkProviderEnvStatus = query({
  args: {
    requestorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorUserId, "admin")

    return {
      xendit: {
        secretKey: Boolean(process.env.XENDIT_SECRET_KEY),
        webhookToken: Boolean(process.env.XENDIT_WEBHOOK_TOKEN || process.env.XENDIT_WEBHOOK_SECRET),
      },
      midtrans: {
        serverKey: Boolean(process.env.MIDTRANS_SERVER_KEY),
        clientKey: Boolean(process.env.MIDTRANS_CLIENT_KEY),
      },
    }
  },
})
