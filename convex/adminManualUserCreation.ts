import { v } from "convex/values"
import { mutation } from "./_generated/server"

/**
 * Link an existing BetterAuth user to Convex users table.
 * Use via CLI: npx convex run adminManualUserCreation:linkBetterAuthUser '{...}'
 * For manual user creation when sign-up flow is unavailable.
 */
export const linkBetterAuthUser = mutation({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    role: v.union(v.literal("user"), v.literal("admin"), v.literal("superadmin")),
    subscriptionStatus: v.union(
      v.literal("free"),
      v.literal("pro"),
      v.literal("canceled"),
      v.literal("unlimited")
    ),
  },
  handler: async (ctx, args) => {
    // Check if already linked
    const existing = await ctx.db
      .query("users")
      .withIndex("by_betterAuthUserId", (q) =>
        q.eq("betterAuthUserId", args.betterAuthUserId)
      )
      .unique()

    if (existing) {
      return {
        userId: existing._id,
        message: `User sudah terhubung: ${existing.email}`,
      }
    }

    // Check if email already exists
    const byEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect()

    const realUser = byEmail.find(
      (u) => !u.betterAuthUserId?.startsWith("pending_")
    )

    if (realUser) {
      throw new Error(`Email ${args.email} sudah terdaftar di users table`)
    }

    const now = Date.now()
    const userId = await ctx.db.insert("users", {
      betterAuthUserId: args.betterAuthUserId,
      email: args.email,
      firstName: args.firstName,
      lastName: args.lastName,
      role: args.role,
      emailVerified: true,
      subscriptionStatus: args.subscriptionStatus,
      createdAt: now,
      lastLoginAt: now,
    })

    return {
      userId,
      message: `User ${args.email} berhasil ditambahkan dan di-link ke BetterAuth.`,
    }
  },
})

/**
 * Manually create admin or superadmin user
 * Creates a "pending" user record that will be updated when they sign up via BetterAuth
 */
export const createAdminUser = mutation({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("superadmin")),
    firstName: v.string(),
    lastName: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all users with this email
    const usersWithEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .collect()

    // Check if real user exists (non-pending)
    const existingUser = usersWithEmail.find(
      (u) => !u.betterAuthUserId?.startsWith("pending_")
    )

    if (existingUser) {
      throw new Error(`User dengan email ${args.email} sudah terdaftar`)
    }

    // Check if pending user exists
    const pendingUser = usersWithEmail.find((u) =>
      u.betterAuthUserId?.startsWith("pending_")
    )

    if (pendingUser) {
      // Update existing pending user
      await ctx.db.patch(pendingUser._id, {
        role: args.role,
        firstName: args.firstName,
        lastName: args.lastName,
        updatedAt: Date.now(),
      })

      return {
        userId: pendingUser._id,
        message: `Pending admin user updated. Instruksikan ${args.email} untuk signup via BetterAuth.`,
      }
    }

    // Create new pending user
    const timestamp = Date.now()
    const userId = await ctx.db.insert("users", {
      betterAuthUserId: `pending_${args.email}_${timestamp}`,
      email: args.email,
      role: args.role,
      firstName: args.firstName,
      lastName: args.lastName,
      emailVerified: false,
      subscriptionStatus: "unlimited",
      createdAt: timestamp,
    })

    return {
      userId,
      message: `Admin user created. Instruksikan ${args.email} untuk signup via BetterAuth.`,
    }
  },
})
