import { v } from "convex/values"
import { mutation } from "./_generated/server"
import { requireRole } from "./permissions"

/**
 * Promote user to admin role
 * Requires superadmin permission
 */
export const promoteToAdmin = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Tidak terautentikasi")
    }

    // Get requestor user from Convex
    const requestor = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique()

    if (!requestor) {
      throw new Error("User tidak ditemukan")
    }

    // Check superadmin permission
    await requireRole(ctx.db, requestor._id, "superadmin")

    // Get target user
    const targetUser = await ctx.db.get(args.targetUserId)
    if (!targetUser) {
      throw new Error("User target tidak ditemukan")
    }

    // Cannot promote superadmin
    if (targetUser.role === "superadmin") {
      throw new Error("Tidak bisa mengubah role superadmin")
    }

    // Cannot promote already admin
    if (targetUser.role === "admin") {
      throw new Error("User sudah menjadi admin")
    }

    // Update to admin
    await ctx.db.patch(args.targetUserId, {
      role: "admin",
      subscriptionStatus: "pro",
      updatedAt: Date.now(),
    })

    return {
      success: true,
      message: `User ${targetUser.email} berhasil dipromosikan menjadi admin`,
    }
  },
})

/**
 * Demote admin to user role
 * Requires superadmin permission
 */
export const demoteToUser = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Get current user
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Tidak terautentikasi")
    }

    // Get requestor user from Convex
    const requestor = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique()

    if (!requestor) {
      throw new Error("User tidak ditemukan")
    }

    // Check superadmin permission
    await requireRole(ctx.db, requestor._id, "superadmin")

    // Get target user
    const targetUser = await ctx.db.get(args.targetUserId)
    if (!targetUser) {
      throw new Error("User target tidak ditemukan")
    }

    // Cannot demote superadmin
    if (targetUser.role === "superadmin") {
      throw new Error("Tidak bisa mengubah role superadmin")
    }

    // Cannot demote already user
    if (targetUser.role === "user") {
      throw new Error("User sudah berstatus user biasa")
    }

    // Update to user
    await ctx.db.patch(args.targetUserId, {
      role: "user",
      updatedAt: Date.now(),
    })

    return {
      success: true,
      message: `User ${targetUser.email} berhasil diturunkan menjadi user biasa`,
    }
  },
})
