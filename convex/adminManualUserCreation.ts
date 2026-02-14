import { v } from "convex/values"
import { mutation } from "./_generated/server"

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
