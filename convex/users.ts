import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"
import { requireRole } from "./permissions"
import { requireAuthUserId } from "./authHelpers"

export type SubscriptionStatus = "free" | "pro" | "canceled"
export type UserRole = "superadmin" | "admin" | "user"

// Superadmin emails — comma-separated list from env var
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean)

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

// Auth-context query: get current user from auth identity
// No args needed - uses ctx.auth.getUserIdentity() to find the user
export const getMyUser = queryGeneric({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) return null
    return await ctx.db
      .query("users")
      .withIndex("by_betterAuthUserId", (q) =>
        q.eq("betterAuthUserId", identity.subject)
      )
      .unique()
  },
})

// USER-004: Get user by BetterAuth ID
export const getUserByBetterAuthId = queryGeneric({
  args: { betterAuthUserId: v.string() },
  handler: async ({ db }, { betterAuthUserId }) => {
    return await db
      .query("users")
      .withIndex("by_betterAuthUserId", (q) =>
        q.eq("betterAuthUserId", betterAuthUserId)
      )
      .unique()
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
      betterAuthUserId: user.betterAuthUserId,
      email: user.email,
      role: user.role,
    }
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
      .withIndex("by_betterAuthUserId", (q) => q.eq("betterAuthUserId", identity.subject))
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
      .withIndex("by_betterAuthUserId", (q) => q.eq("betterAuthUserId", identity.subject))
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
      .withIndex("by_betterAuthUserId", (q) => q.eq("betterAuthUserId", identity.subject))
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

// ════════════════════════════════════════════════════════════════
// Create App User (for BetterAuth signup)
// ════════════════════════════════════════════════════════════════

/**
 * Create or link application user record after BetterAuth signup.
 * Called from the frontend after successful authentication.
 *
 * Linking priority:
 * 1. Already linked by betterAuthUserId → return (idempotent)
 * 2. Existing user with same email, no betterAuthUserId → link (migration path)
 * 3. No match → create new user
 */
export const createAppUser = mutationGeneric({
  args: {
    betterAuthUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, { betterAuthUserId, email, firstName, lastName }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity || identity.subject !== betterAuthUserId) {
      throw new Error("Unauthorized")
    }

    // 1. Already linked by betterAuthUserId
    const alreadyLinked = await ctx.db
      .query("users")
      .withIndex("by_betterAuthUserId", (q) =>
        q.eq("betterAuthUserId", betterAuthUserId)
      )
      .unique()

    if (alreadyLinked) return alreadyLinked._id

    // 2. Find existing user by email (migration linking)
    const existingByEmail = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .collect()

    // Pick the best match: prefer unlinked user, most recent login
    const linkCandidate = existingByEmail
      .filter((u) => !u.betterAuthUserId)
      .sort((a, b) => (b.lastLoginAt ?? 0) - (a.lastLoginAt ?? 0))[0]

    if (linkCandidate) {
      await ctx.db.patch(linkCandidate._id, {
        betterAuthUserId,
        lastLoginAt: Date.now(),
        updatedAt: Date.now(),
      })
      return linkCandidate._id
    }

    // 3. No match — create new user
    const now = Date.now()
    const role: UserRole = SUPERADMIN_EMAILS.includes(email.toLowerCase())
      ? "superadmin"
      : "user"

    return await ctx.db.insert("users", {
      betterAuthUserId,
      email,
      firstName,
      lastName,
      role,
      emailVerified: false,
      subscriptionStatus: "free",
      createdAt: now,
      lastLoginAt: now,
    })
  },
})
