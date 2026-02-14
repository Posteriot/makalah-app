import { internalMutation } from "../_generated/server"

/**
 * Migration: Remove leftover Clerk fields from users table
 * Run via: npx convex run migrations:removeClerkFields
 *
 * Background:
 *   Clerk was removed in commit a4ab55e ("chore: remove all Clerk artifacts").
 *   Code was cleaned but existing documents still have `clerkSyncStatus` and
 *   `clerkUserId` fields, which cause schema validation to fail.
 *
 * This migration strips those fields using db.replace() (db.patch cannot
 * remove fields — it can only add/update them).
 *
 * After running successfully:
 *   1. Remove the temporary Clerk fields from convex/schema.ts
 *   2. Let convex dev re-sync to confirm clean schema
 */
export const removeClerkFields = internalMutation({
  handler: async ({ db }) => {
    const allUsers = await db.query("users").collect()

    let cleaned = 0
    let skipped = 0

    for (const user of allUsers) {
      const doc = user as Record<string, unknown>
      const hasClerkFields =
        "clerkSyncStatus" in doc || "clerkUserId" in doc

      if (!hasClerkFields) {
        skipped++
        continue
      }

      // Destructure out Clerk fields, keep everything else
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { clerkSyncStatus, clerkUserId, _id, _creationTime, ...cleanDoc } =
        doc as Record<string, unknown>

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await db.replace(user._id, cleanDoc as any)
      cleaned++
    }

    return {
      success: true,
      message: `Migration selesai. ${cleaned} document dibersihkan, ${skipped} sudah bersih.`,
      cleaned,
      skipped,
      total: allUsers.length,
    }
  },
})
