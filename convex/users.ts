import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"
import { requireRole } from "./permissions"
import { requireAuthUserId } from "./auth"

export type SubscriptionStatus = "free" | "pro" | "canceled"
export type UserRole = "superadmin" | "admin" | "user"
export type ClerkSyncStatus = "active" | "deleted"

// Hardcoded superadmin email
const SUPERADMIN_EMAIL = "erik.supit@gmail.com"

const clerkSnapshotUserValidator = v.object({
  clerkUserId: v.string(),
  email: v.string(),
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  emailVerified: v.optional(v.boolean()),
  lastSignInAt: v.optional(v.number()),
})

/**
 * Public mutation untuk create user dari Clerk webhook.
 * Dipanggil saat user.created event - tidak memerlukan JWT auth context.
 *
 * KEAMANAN:
 * - Webhook sudah divalidasi via Svix signature sebelum memanggil ini
 * - Operasi idempotent (tidak akan create duplicate)
 * - Hanya bisa create user baru, tidak bisa modify existing dengan role berbeda
 */
export const createUserFromWebhook = mutationGeneric({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    { clerkUserId, email, firstName, lastName, emailVerified }
  ): Promise<string> => {
    const { db } = ctx

    // Check if user already exists by Clerk ID
    const existing = await db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()

    // Check if pending admin exists with this email
    const allUsersWithEmail = await db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()

    const pendingAdmin = allUsersWithEmail.find((u) =>
      u.clerkUserId.startsWith("pending_")
    )

    const now = Date.now()

    if (existing) {
      const shouldBeSuperadmin = email === SUPERADMIN_EMAIL && existing.role !== "superadmin"

      await db.patch(existing._id, {
        email,
        firstName,
        lastName,
        emailVerified: emailVerified ?? existing.emailVerified,
        lastLoginAt: now,
        updatedAt: now,
        clerkSyncStatus: "active" as ClerkSyncStatus,
        clerkDeletedAt: undefined,
        ...(shouldBeSuperadmin ? { role: "superadmin" as UserRole } : {}),
      })
      return existing._id
    }

    if (pendingAdmin) {
      // Update pending admin with real Clerk ID, preserve role
      await db.patch(pendingAdmin._id, {
        clerkUserId,
        email,
        firstName,
        lastName,
        emailVerified: emailVerified ?? false,
        lastLoginAt: now,
        updatedAt: now,
        clerkSyncStatus: "active" as ClerkSyncStatus,
        clerkDeletedAt: undefined,
      })
      return pendingAdmin._id
    }

    // Determine role for new user
    const role: UserRole = email === SUPERADMIN_EMAIL ? "superadmin" : "user"

    // Create new user with default "free" subscription (GRATIS tier)
    const userId = await db.insert("users", {
      clerkUserId,
      email,
      firstName,
      lastName,
      role,
      emailVerified: emailVerified ?? false,
      subscriptionStatus: "free",
      createdAt: now,
      lastLoginAt: now,
      clerkSyncStatus: "active" as ClerkSyncStatus,
    })

    return userId
  },
})

// USER-003: Get user by ID
export const getById = queryGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAuthUserId(ctx, userId)
    return await ctx.db.get(userId)
  },
})

// USER-003b: Get user by ID (internal use, no auth required)
// Used by webhook handlers that need user email for notifications
export const getUserById = queryGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db.get(userId)
    if (!user) return null
    // Return only safe fields needed for email
    return {
      _id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }
  },
})


// USER-004: Get user by Clerk ID
export const getUserByClerkId = queryGeneric({
  args: { clerkUserId: v.string() },
  handler: async ({ db }, { clerkUserId }) => {
    const user = await db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()
    return user
  },
})

// USER-005: Get user role
export const getUserRole = queryGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAuthUserId(ctx, userId)
    const user = await ctx.db.get(userId)
    return (user?.role as UserRole) ?? "user"
  },
})

// USER-006: Check if user is admin (admin or superadmin)
export const checkIsAdmin = queryGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAuthUserId(ctx, userId)
    const user = await ctx.db.get(userId)
    return user?.role === "admin" || user?.role === "superadmin"
  },
})

// USER-007: Check if user is superadmin
export const checkIsSuperAdmin = queryGeneric({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireAuthUserId(ctx, userId)
    const user = await ctx.db.get(userId)
    return user?.role === "superadmin"
  },
})

// USER-008: List all users (admin/superadmin only)
export const listAllUsers = queryGeneric({
  args: {
    requestorUserId: v.id("users"),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async ({ db }, { requestorUserId, includeDeleted }) => {
    // Permission check: requires admin or superadmin
    await requireRole(db, requestorUserId, "admin")

    const users = await db.query("users").order("desc").collect()
    const visibleUsers = includeDeleted
      ? users
      : users.filter((u) => u.clerkSyncStatus !== "deleted")

    return visibleUsers.map((u) => ({
      _id: u._id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      emailVerified: u.emailVerified,
      subscriptionStatus: u.subscriptionStatus,
      clerkSyncStatus: (u.clerkSyncStatus as ClerkSyncStatus | undefined) ?? "active",
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }))
  },
})

// USER-008b: Get target user data for admin management actions
export const getUserForAdminManagement = queryGeneric({
  args: {
    requestorUserId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async ({ db }, { requestorUserId, targetUserId }) => {
    await requireRole(db, requestorUserId, "admin")
    const user = await db.get(targetUserId)
    if (!user) return null

    return {
      _id: user._id,
      clerkUserId: user.clerkUserId,
      email: user.email,
      role: user.role,
      clerkSyncStatus: (user.clerkSyncStatus as ClerkSyncStatus | undefined) ?? "active",
    }
  },
})

// USER-008c: Mark user deleted based on Clerk webhook user.deleted event
export const markUserDeletedFromWebhook = mutationGeneric({
  args: { clerkUserId: v.string() },
  handler: async ({ db }, { clerkUserId }) => {
    const user = await db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()

    if (!user) {
      return { found: false }
    }

    const now = Date.now()
    await db.patch(user._id, {
      clerkSyncStatus: "deleted" as ClerkSyncStatus,
      clerkDeletedAt: now,
      updatedAt: now,
    })

    return { found: true, userId: user._id }
  },
})

// USER-008d: Reconcile Convex users against Clerk snapshot (superadmin only)
export const reconcileWithClerkSnapshot = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    clerkUsers: v.array(clerkSnapshotUserValidator),
  },
  handler: async ({ db }, { requestorUserId, clerkUsers }) => {
    await requireRole(db, requestorUserId, "superadmin")

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
            clerkSyncStatus: "deleted" as ClerkSyncStatus,
            clerkDeletedAt: now,
            updatedAt: now,
          })
          markedDeleted += 1
        }
        continue
      }

      const shouldBeSuperadmin =
        snapshot.email === SUPERADMIN_EMAIL && user.role !== "superadmin"
      const nextSyncStatus = "active" as ClerkSyncStatus

      const shouldPatch =
        user.email !== snapshot.email ||
        user.firstName !== snapshot.firstName ||
        user.lastName !== snapshot.lastName ||
        user.emailVerified !== (snapshot.emailVerified ?? user.emailVerified) ||
        user.clerkSyncStatus !== nextSyncStatus ||
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
          clerkSyncStatus: nextSyncStatus,
          clerkDeletedAt: undefined,
          updatedAt: now,
          ...(shouldBeSuperadmin ? { role: "superadmin" as UserRole } : {}),
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
          clerkSyncStatus: "active" as ClerkSyncStatus,
          clerkDeletedAt: undefined,
          updatedAt: now,
        })
        consumedPendingIds.add(String(pendingMatch._id))
        linkedFromPending += 1
        continue
      }

      const role: UserRole = snapshot.email === SUPERADMIN_EMAIL ? "superadmin" : "user"
      await db.insert("users", {
        clerkUserId: snapshot.clerkUserId,
        email: snapshot.email,
        firstName: snapshot.firstName,
        lastName: snapshot.lastName,
        role,
        emailVerified: snapshot.emailVerified ?? false,
        subscriptionStatus: "free",
        createdAt: now,
        lastLoginAt: snapshot.lastSignInAt ?? now,
        clerkSyncStatus: "active" as ClerkSyncStatus,
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

// USER-004: Create or update user (called by ensureConvexUser)
export const createUser = mutationGeneric({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    subscriptionStatus: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { clerkUserId, email, firstName, lastName, emailVerified, subscriptionStatus }
  ): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== clerkUserId) {
      throw new Error("Unauthorized")
    }

    const { db } = ctx
    // Check if user exists by Clerk ID
    const existing = await db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()

    const now = Date.now()

    if (existing) {
      // Update existing user
      // Auto-promote to superadmin if email matches (in case user was created before this logic)
      const shouldBeSuperadmin = email === SUPERADMIN_EMAIL && existing.role !== "superadmin"

      await db.patch(existing._id, {
        email,
        firstName,
        lastName,
        emailVerified: emailVerified ?? existing.emailVerified,
        lastLoginAt: now,
        updatedAt: now,
        clerkSyncStatus: "active" as ClerkSyncStatus,
        clerkDeletedAt: undefined,
        ...(shouldBeSuperadmin ? { role: "superadmin" as UserRole } : {}),
      })
      return existing._id
    }

    // Check if pending admin/superadmin exists with this email
    const allUsersWithEmail = await db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()

    const pendingAdmin = allUsersWithEmail.find((u) =>
      u.clerkUserId.startsWith("pending_")
    )

    if (pendingAdmin) {
      // Update pending admin dengan real Clerk ID, PRESERVE role
      await db.patch(pendingAdmin._id, {
        clerkUserId,
        email,
        firstName,
        lastName,
        emailVerified: emailVerified ?? false,
        lastLoginAt: now,
        updatedAt: now,
        clerkSyncStatus: "active" as ClerkSyncStatus,
        clerkDeletedAt: undefined,
      })
      return pendingAdmin._id
    }

    // Determine role for new user
    const role: UserRole = email === SUPERADMIN_EMAIL ? "superadmin" : "user"

    // Create new regular user
    const userId = await db.insert("users", {
      clerkUserId,
      email,
      firstName,
      lastName,
      role,
      emailVerified: emailVerified ?? false,
      subscriptionStatus: (subscriptionStatus as SubscriptionStatus) ?? "free",
      createdAt: now,
      lastLoginAt: now,
      clerkSyncStatus: "active" as ClerkSyncStatus,
    })

    return userId
  },
})

// ════════════════════════════════════════════════════════════════
// Onboarding Status (untuk pricing flow redesign)
// ════════════════════════════════════════════════════════════════

// ONBOARDING-001: Get onboarding status for current user
export const getOnboardingStatus = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return { hasCompleted: false, isAuthenticated: false }
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) {
      return { hasCompleted: false, isAuthenticated: true }
    }

    return {
      hasCompleted: user.hasCompletedOnboarding ?? false,
      isAuthenticated: true,
    }
  },
})

// ONBOARDING-002: Mark onboarding as completed for current user
export const completeOnboarding = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Unauthorized")
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) {
      throw new Error("User not found")
    }

    await ctx.db.patch(user._id, {
      hasCompletedOnboarding: true,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// LINKING-001: Mark account linking notice as seen
export const markLinkingNoticeSeen = mutationGeneric({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Unauthorized")
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique()

    if (!user) {
      throw new Error("User not found")
    }

    await ctx.db.patch(user._id, {
      hasSeenLinkingNotice: true,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// USER-009: Update user profile (self-edit)
export const updateProfile = mutationGeneric({
  args: {
    userId: v.id("users"),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, { userId, firstName, lastName }) => {
    await requireAuthUserId(ctx, userId)
    const user = await ctx.db.get(userId)
    if (!user) {
      throw new Error("User tidak ditemukan")
    }

    const updates: {
      updatedAt: number
      firstName?: string
      lastName?: string
    } = { updatedAt: Date.now() }
    if (firstName !== undefined) updates.firstName = firstName
    if (lastName !== undefined) updates.lastName = lastName

    await ctx.db.patch(userId, updates)
    return { success: true }
  },
})
