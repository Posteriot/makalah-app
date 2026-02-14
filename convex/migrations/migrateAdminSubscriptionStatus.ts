import { mutation } from "../_generated/server"

/**
 * One-off migration: Set subscriptionStatus to "unlimited" for all admin/superadmin users.
 * Run via: npx convex run migrations/migrateAdminSubscriptionStatus
 * Safe to delete after running.
 */
export default mutation({
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect()
    const admins = allUsers.filter(
      (u) => u.role === "admin" || u.role === "superadmin"
    )

    const results = []
    for (const admin of admins) {
      if (admin.subscriptionStatus !== "unlimited") {
        await ctx.db.patch(admin._id, {
          subscriptionStatus: "unlimited",
          updatedAt: Date.now(),
        })
        results.push({
          email: admin.email,
          role: admin.role,
          from: admin.subscriptionStatus,
          to: "unlimited",
        })
      }
    }

    return {
      migrated: results.length,
      details: results,
    }
  },
})
