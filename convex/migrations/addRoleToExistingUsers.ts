import { internalMutation } from "../_generated/server"

/**
 * Migration script to add role field to existing users
 * Run via: npx convex run migrations:addRoleToExistingUsers
 */
export const addRoleToExistingUsers = internalMutation({
  handler: async ({ db }) => {
    const users = await db.query("users").collect()
    let migrated = 0

    for (const user of users) {
      // Check if user is missing role field
      if (!user.role) {
        await db.patch(user._id, {
          role: "user", // Default role
          emailVerified: user.emailVerified ?? false,
          updatedAt: Date.now(),
        })
        migrated++
      }
    }

    return {
      total: users.length,
      migrated,
      message: `Migration completed. ${migrated} out of ${users.length} users updated.`,
    }
  },
})
