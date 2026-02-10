import { mutation } from "../_generated/server"
import { v } from "convex/values"

const SUPERADMIN_EMAIL = "erik.supit@gmail.com"

/**
 * One-time reconciliation migration between Clerk users and Convex users.
 *
 * Run via CLI:
 * npm run convex -- run "migrations/reconcileClerkUsers:reconcileClerkUsers" --args '{...}'
 */
export const reconcileClerkUsers = mutation({
  args: {
    clerkUsers: v.array(
      v.object({
        clerkUserId: v.string(),
        email: v.string(),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
        emailVerified: v.optional(v.boolean()),
        lastSignInAt: v.optional(v.number()),
      })
    ),
  },
  handler: async ({ db }, { clerkUsers }) => {
    const now = Date.now()
    const allUsers = await db.query("users").collect()

    const clerkById = new Map(clerkUsers.map((user) => [user.clerkUserId, user]))
    const pendingUsers = allUsers.filter((user) => user.clerkUserId.startsWith("pending_"))
    const consumedPendingIds = new Set<string>()

    let reactivated = 0
    let updated = 0
    let markedDeleted = 0
    let inserted = 0
    let linkedFromPending = 0

    for (const user of allUsers) {
      if (user.clerkUserId.startsWith("pending_")) {
        continue
      }

      const snapshot = clerkById.get(user.clerkUserId)
      if (!snapshot) {
        if (user.clerkSyncStatus !== "deleted") {
          await db.patch(user._id, {
            clerkSyncStatus: "deleted",
            clerkDeletedAt: now,
            updatedAt: now,
          })
          markedDeleted += 1
        }
        continue
      }

      const shouldBeSuperadmin =
        snapshot.email === SUPERADMIN_EMAIL && user.role !== "superadmin"

      const shouldPatch =
        user.email !== snapshot.email ||
        user.firstName !== snapshot.firstName ||
        user.lastName !== snapshot.lastName ||
        user.emailVerified !== (snapshot.emailVerified ?? user.emailVerified) ||
        user.clerkSyncStatus !== "active" ||
        user.clerkDeletedAt !== undefined ||
        user.lastLoginAt !== (snapshot.lastSignInAt ?? user.lastLoginAt) ||
        shouldBeSuperadmin

      if (shouldPatch) {
        await db.patch(user._id, {
          email: snapshot.email,
          firstName: snapshot.firstName,
          lastName: snapshot.lastName,
          emailVerified: snapshot.emailVerified ?? user.emailVerified,
          lastLoginAt: snapshot.lastSignInAt ?? user.lastLoginAt,
          clerkSyncStatus: "active",
          clerkDeletedAt: undefined,
          updatedAt: now,
          ...(shouldBeSuperadmin ? { role: "superadmin" } : {}),
        })
        if (user.clerkSyncStatus === "deleted") {
          reactivated += 1
        } else {
          updated += 1
        }
      }

      clerkById.delete(user.clerkUserId)
    }

    for (const snapshot of clerkById.values()) {
      const pendingMatch = pendingUsers.find(
        (user) =>
          !consumedPendingIds.has(String(user._id)) &&
          user.email === snapshot.email
      )

      if (pendingMatch) {
        await db.patch(pendingMatch._id, {
          clerkUserId: snapshot.clerkUserId,
          email: snapshot.email,
          firstName: snapshot.firstName,
          lastName: snapshot.lastName,
          emailVerified: snapshot.emailVerified ?? pendingMatch.emailVerified,
          lastLoginAt: snapshot.lastSignInAt ?? pendingMatch.lastLoginAt,
          clerkSyncStatus: "active",
          clerkDeletedAt: undefined,
          updatedAt: now,
        })
        consumedPendingIds.add(String(pendingMatch._id))
        linkedFromPending += 1
        continue
      }

      await db.insert("users", {
        clerkUserId: snapshot.clerkUserId,
        email: snapshot.email,
        firstName: snapshot.firstName,
        lastName: snapshot.lastName,
        role: snapshot.email === SUPERADMIN_EMAIL ? "superadmin" : "user",
        emailVerified: snapshot.emailVerified ?? false,
        subscriptionStatus: "free",
        createdAt: now,
        lastLoginAt: snapshot.lastSignInAt ?? now,
        clerkSyncStatus: "active",
      })
      inserted += 1
    }

    return {
      scannedConvexUsers: allUsers.length,
      snapshotUsers: clerkUsers.length,
      updated,
      reactivated,
      markedDeleted,
      inserted,
      linkedFromPending,
    }
  },
})
