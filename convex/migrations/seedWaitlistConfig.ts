import { internalMutationGeneric } from "convex/server"

/**
 * Migration: Seed default waitlist mode config (off by default)
 *
 * Run with: npx convex run migrations/seedWaitlistConfig:seedWaitlistConfig
 */
export const seedWaitlistConfig = internalMutationGeneric({
  args: {},
  handler: async ({ db }) => {
    console.log("[Migration] Starting seedWaitlistConfig...")

    const existing = await db
      .query("appConfig")
      .withIndex("by_key", (q: any) => q.eq("key", "waitlistMode"))
      .unique()

    if (existing) {
      console.log("[Migration] waitlistMode config already exists, skipping")
      return { created: false, existing: true }
    }

    await db.insert("appConfig", {
      key: "waitlistMode",
      value: false,
      updatedAt: Date.now(),
      updatedBy: "system",
    })

    console.log("[Migration] Created waitlistMode config (default: false)")
    return { created: true }
  },
})
