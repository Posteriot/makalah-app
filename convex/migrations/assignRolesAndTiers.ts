import { internalMutation } from "../_generated/server"

/**
 * Assign roles and subscription tiers to users based on env vars.
 * Run via: npx convex run migrations/assignRolesAndTiers
 *
 * Env vars (comma-separated emails):
 *   SUPERADMIN_EMAILS  → role: superadmin
 *   ADMIN_EMAILS       → role: admin
 *
 * Admin and superadmin are always treated as Pro unlimited
 * via getEffectiveTier() — no need to change their subscriptionStatus.
 */
export default internalMutation({
  handler: async ({ db }) => {
    const parseEmails = (envVar: string | undefined) =>
      (envVar ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)

    const superadminEmails = parseEmails(process.env.SUPERADMIN_EMAILS)
    const adminEmails = parseEmails(process.env.ADMIN_EMAILS)

    if (superadminEmails.length === 0 && adminEmails.length === 0) {
      return { error: "No SUPERADMIN_EMAILS or ADMIN_EMAILS env vars set" }
    }

    const users = await db.query("users").collect()
    const results: string[] = []

    for (const user of users) {
      const email = user.email.toLowerCase()

      if (superadminEmails.includes(email) && user.role !== "superadmin") {
        await db.patch(user._id, { role: "superadmin", updatedAt: Date.now() })
        results.push(`${user.email} → superadmin`)
      } else if (adminEmails.includes(email) && user.role !== "admin") {
        await db.patch(user._id, { role: "admin", updatedAt: Date.now() })
        results.push(`${user.email} → admin`)
      }
    }

    return {
      total: users.length,
      updated: results.length,
      changes: results,
      superadminEmails,
      adminEmails,
    }
  },
})
