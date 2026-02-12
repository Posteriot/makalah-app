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

/**
 * Update user subscription tier
 * Requires admin permission (admin or superadmin)
 * Cannot change tier for admin/superadmin users (they always have unlimited access)
 */
export const updateSubscriptionTier = mutation({
  args: {
    targetUserId: v.id("users"),
    newTier: v.union(v.literal("free"), v.literal("bpp"), v.literal("pro")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Tidak terautentikasi")
    }

    const requestor = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique()

    if (!requestor) {
      throw new Error("User tidak ditemukan")
    }

    await requireRole(ctx.db, requestor._id, "admin")

    const targetUser = await ctx.db.get(args.targetUserId)
    if (!targetUser) {
      throw new Error("User target tidak ditemukan")
    }

    // Cannot change tier for admin/superadmin (they always get unlimited via getEffectiveTier)
    if (targetUser.role === "admin" || targetUser.role === "superadmin") {
      throw new Error("Tidak bisa mengubah tier admin/superadmin (selalu unlimited)")
    }

    // No-op if same tier
    if (targetUser.subscriptionStatus === args.newTier) {
      throw new Error(`User sudah di tier "${args.newTier}"`)
    }

    const tierLabels: Record<string, string> = { free: "Gratis", bpp: "BPP", pro: "Pro" }
    const oldLabel = tierLabels[targetUser.subscriptionStatus ?? "free"] ?? targetUser.subscriptionStatus
    const newLabel = tierLabels[args.newTier]

    await ctx.db.patch(args.targetUserId, {
      subscriptionStatus: args.newTier,
      updatedAt: Date.now(),
    })

    return {
      success: true,
      message: `Tier ${targetUser.email} berhasil diubah: ${oldLabel} → ${newLabel}`,
    }
  },
})

/**
 * Soft delete user in Convex (Clerk deletion handled by API route)
 * - superadmin: can delete admin/user (not superadmin, not self)
 * - admin: can delete regular user only
 */
export const softDeleteUser = mutation({
  args: {
    targetUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Tidak terautentikasi")
    }

    const requestor = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique()

    if (!requestor) {
      throw new Error("User tidak ditemukan")
    }

    await requireRole(ctx.db, requestor._id, "admin")

    const targetUser = await ctx.db.get(args.targetUserId)
    if (!targetUser) {
      throw new Error("User target tidak ditemukan")
    }

    if (targetUser._id === requestor._id) {
      throw new Error("Tidak bisa menghapus akun sendiri")
    }

    if (targetUser.role === "superadmin") {
      throw new Error("Tidak bisa menghapus superadmin")
    }

    if (requestor.role === "admin" && targetUser.role !== "user") {
      throw new Error("Admin hanya bisa menghapus user biasa")
    }

    if (targetUser.clerkSyncStatus === "deleted") {
      return {
        success: true,
        message: `User ${targetUser.email} sudah dihapus sebelumnya`,
      }
    }

    const now = Date.now()
    await ctx.db.patch(args.targetUserId, {
      clerkSyncStatus: "deleted",
      clerkDeletedAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      message: `User ${targetUser.email} berhasil dihapus`,
    }
  },
})
