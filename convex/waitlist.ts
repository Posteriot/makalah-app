import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireRole } from "./permissions"

// ════════════════════════════════════════════════════════════════
// Public Mutations
// ════════════════════════════════════════════════════════════════

/**
 * Register email to waiting list (public)
 * Returns entry ID on success, throws if email already exists
 */
export const register = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim()
    const firstName = args.firstName.trim()
    const lastName = args.lastName.trim()

    if (!firstName || !lastName) {
      throw new Error("Nama depan dan nama belakang wajib diisi")
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error("Format email tidak valid")
    }

    // Check if email already exists
    const existing = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique()

    if (existing) {
      throw new Error("Email sudah terdaftar di waiting list")
    }

    // Insert new entry
    const entryId = await ctx.db.insert("waitlistEntries", {
      firstName,
      lastName,
      email,
      status: "pending",
      createdAt: Date.now(),
    })

    return entryId
  },
})

/**
 * Mark entry as registered after user completes signup (webhook)
 */
export const markAsRegistered = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim()

    const entry = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique()

    if (!entry) {
      // Not from waitlist, ignore silently
      return null
    }

    if (entry.status !== "invited") {
      // Only update if currently invited
      return null
    }

    await ctx.db.patch(entry._id, {
      status: "registered",
      registeredAt: Date.now(),
    })

    return entry._id
  },
})

// ════════════════════════════════════════════════════════════════
// Public Queries
// ════════════════════════════════════════════════════════════════

/**
 * Check if email exists in waitlist (for form validation)
 * Returns boolean only - no sensitive data exposed
 */
export const checkEmailExists = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase().trim()

    const entry = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique()

    return entry !== null
  },
})

/**
 * Validate invite token and return entry if valid
 * Used by sign-up page for magic link flow
 */
export const getByToken = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const entry = await ctx.db
      .query("waitlistEntries")
      .withIndex("by_invite_token", (q) => q.eq("inviteToken", args.token))
      .unique()

    if (!entry) {
      return { valid: false, error: "Token tidak valid" }
    }

    if (entry.status !== "invited") {
      return { valid: false, error: "Token sudah digunakan" }
    }

    if (entry.inviteTokenExpiresAt && entry.inviteTokenExpiresAt < Date.now()) {
      return { valid: false, error: "Token sudah kedaluwarsa" }
    }

    return {
      valid: true,
      email: entry.email,
      firstName: entry.firstName,
      lastName: entry.lastName,
      entryId: entry._id,
    }
  },
})

// ════════════════════════════════════════════════════════════════
// Admin Queries
// ════════════════════════════════════════════════════════════════

/**
 * Get all waitlist entries (admin only)
 */
export const getAll = query({
  args: {
    adminUserId: v.id("users"),
    statusFilter: v.optional(
      v.union(v.literal("pending"), v.literal("invited"), v.literal("registered"))
    ),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.adminUserId, "admin")

    const entries = args.statusFilter
      ? await ctx.db
          .query("waitlistEntries")
          .withIndex("by_status", (q) => q.eq("status", args.statusFilter!))
          .order("desc")
          .collect()
      : await ctx.db
          .query("waitlistEntries")
          .order("desc")
          .collect()

    return entries
  },
})

/**
 * Get waitlist statistics (admin only)
 */
export const getStats = query({
  args: {
    adminUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.adminUserId, "admin")

    const entries = await ctx.db.query("waitlistEntries").collect()

    const stats = {
      total: entries.length,
      pending: entries.filter((e) => e.status === "pending").length,
      invited: entries.filter((e) => e.status === "invited").length,
      registered: entries.filter((e) => e.status === "registered").length,
    }

    return stats
  },
})

// ════════════════════════════════════════════════════════════════
// Admin Mutations
// ════════════════════════════════════════════════════════════════

/**
 * Bulk invite selected entries (admin only)
 * Generates invite tokens and returns entries for email sending
 */
export const bulkInvite = mutation({
  args: {
    adminUserId: v.id("users"),
    entryIds: v.array(v.id("waitlistEntries")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.adminUserId, "admin")

    const invitedEntries: Array<{ email: string; inviteToken: string }> = []
    const now = Date.now()
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000 // 7 days

    for (const entryId of args.entryIds) {
      const entry = await ctx.db.get(entryId)

      if (!entry) continue
      if (entry.status !== "pending") continue

      // Generate secure token
      const inviteToken = crypto.randomUUID()

      await ctx.db.patch(entryId, {
        status: "invited",
        invitedAt: now,
        inviteToken,
        inviteTokenExpiresAt: expiresAt,
      })

      invitedEntries.push({
        email: entry.email,
        inviteToken,
      })
    }

    return invitedEntries
  },
})

/**
 * Delete waitlist entry (admin only)
 */
export const deleteEntry = mutation({
  args: {
    adminUserId: v.id("users"),
    entryId: v.id("waitlistEntries"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.adminUserId, "admin")

    const entry = await ctx.db.get(args.entryId)
    if (!entry) {
      throw new Error("Entry tidak ditemukan")
    }

    await ctx.db.delete(args.entryId)

    return { success: true }
  },
})

/**
 * Resend invite to a single entry (admin only)
 * Generates new token and returns for email sending
 */
export const resendInvite = mutation({
  args: {
    adminUserId: v.id("users"),
    entryId: v.id("waitlistEntries"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.adminUserId, "admin")

    const entry = await ctx.db.get(args.entryId)
    if (!entry) {
      throw new Error("Entry tidak ditemukan")
    }

    if (entry.status === "registered") {
      throw new Error("User sudah terdaftar")
    }

    const now = Date.now()
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000 // 7 days
    const inviteToken = crypto.randomUUID()

    await ctx.db.patch(args.entryId, {
      status: "invited",
      invitedAt: now,
      inviteToken,
      inviteTokenExpiresAt: expiresAt,
    })

    return {
      email: entry.email,
      inviteToken,
    }
  },
})

/**
 * Invite a single waitlist entry (admin only).
 * Generates token and returns data for email sending.
 */
export const inviteSingle = mutation({
  args: {
    adminUserId: v.id("users"),
    entryId: v.id("waitlistEntries"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.adminUserId, "admin")

    const entry = await ctx.db.get(args.entryId)
    if (!entry) {
      throw new Error("Entry tidak ditemukan")
    }

    if (entry.status !== "pending") {
      throw new Error("Entry sudah diundang atau terdaftar")
    }

    const now = Date.now()
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000 // 7 days
    const inviteToken = crypto.randomUUID()

    await ctx.db.patch(args.entryId, {
      status: "invited",
      invitedAt: now,
      inviteToken,
      inviteTokenExpiresAt: expiresAt,
    })

    return {
      email: entry.email,
      firstName: entry.firstName,
      lastName: entry.lastName,
      inviteToken,
    }
  },
})
