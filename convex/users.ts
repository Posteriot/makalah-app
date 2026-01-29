import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"
import { requireRole } from "./permissions"
import { requireAuthUserId } from "./auth"

export type SubscriptionStatus = "free" | "pro" | "canceled"
export type UserRole = "superadmin" | "admin" | "user"

// Hardcoded superadmin email
const SUPERADMIN_EMAIL = "erik.supit@gmail.com"

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
  },
  handler: async (ctx, { clerkUserId, email, firstName, lastName }): Promise<string> => {
    const { db } = ctx

    // Check if user already exists by Clerk ID
    const existing = await db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()

    if (existing) {
      return existing._id
    }

    // Check if pending admin exists with this email
    const allUsersWithEmail = await db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()

    const pendingAdmin = allUsersWithEmail.find((u) =>
      u.clerkUserId.startsWith("pending_")
    )

    const now = Date.now()

    if (pendingAdmin) {
      // Update pending admin with real Clerk ID, preserve role
      await db.patch(pendingAdmin._id, {
        clerkUserId,
        firstName,
        lastName,
        emailVerified: false,
        lastLoginAt: now,
        updatedAt: now,
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
      emailVerified: false,
      subscriptionStatus: "free",
      createdAt: now,
      lastLoginAt: now,
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
  args: { requestorUserId: v.id("users") },
  handler: async ({ db }, { requestorUserId }) => {
    // Permission check: requires admin or superadmin
    await requireRole(db, requestorUserId, "admin")

    const users = await db.query("users").order("desc").collect()

    return users.map((u) => ({
      _id: u._id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
      emailVerified: u.emailVerified,
      subscriptionStatus: u.subscriptionStatus,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    }))
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
        firstName,
        lastName,
        emailVerified: emailVerified ?? false,
        lastLoginAt: now,
        updatedAt: now,
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
    })

    return userId
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
