import { v } from "convex/values"
import { mutation, query, internalMutation, action } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { internal } from "./_generated/api"
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
 * Mark entry as registered after user completes signup.
 * Also enforces gratis tier for any existing user with this email.
 * Tier enforcement runs ALWAYS regardless of entry status — security critical.
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
      return null
    }

    // Update entry status if still "invited"
    if (entry.status === "invited") {
      await ctx.db.patch(entry._id, {
        status: "registered",
        registeredAt: Date.now(),
      })
    }

    // SECURITY: Always enforce gratis tier for waitlist users, regardless of entry status.
    // Prevents existing Pro/BPP users from keeping paid tier via waitlist invite.
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique()

    if (existingUser && existingUser.subscriptionStatus !== "free") {
      await ctx.db.patch(existingUser._id, {
        subscriptionStatus: "free",
      })
    }

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

// ════════════════════════════════════════════════════════════════
// Internal Mutations (used by sendInviteEmail action)
// ════════════════════════════════════════════════════════════════

/**
 * Mark entry as invited and return entry data (for HTTP action).
 * Admin role check included.
 */
export const inviteSingleInternal = internalMutation({
  args: {
    adminUserId: v.string(),
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate admin role
    const admin = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), args.adminUserId))
      .unique()

    if (!admin || (admin.role !== "admin" && admin.role !== "superadmin")) {
      throw new Error("Unauthorized")
    }

    const entryId = args.entryId as Id<"waitlistEntries">
    const entry = await ctx.db.get(entryId)
    if (!entry) return null
    if (entry.status !== "pending") return null

    await ctx.db.patch(entry._id, {
      status: "invited",
      invitedAt: Date.now(),
    })

    return {
      email: entry.email,
      firstName: entry.firstName,
      lastName: entry.lastName,
    }
  },
})

// ════════════════════════════════════════════════════════════════
// Actions (orchestrate mutations + side effects)
// ════════════════════════════════════════════════════════════════

/**
 * Send invite email to a waitlist entry (admin only).
 * Marks entry as invited, then sends signup link email via Resend.
 */
export const sendInviteEmail = action({
  args: {
    adminUserId: v.id("users"),
    entryId: v.id("waitlistEntries"),
  },
  handler: async (ctx, args): Promise<{ email: string }> => {
    // Mark entry as invited (admin role check inside mutation)
    const result: { email: string; firstName: string | undefined; lastName: string | undefined } | null = await ctx.runMutation(internal.waitlist.inviteSingleInternal, {
      adminUserId: args.adminUserId as string,
      entryId: args.entryId as string,
    })

    if (!result) {
      throw new Error("Entry tidak ditemukan atau sudah diundang")
    }

    const firstName = result.firstName ?? "Pengguna"
    const appUrl = process.env.APP_URL ?? "https://makalah.ai"
    const signupUrl = `${appUrl}/sign-up`

    // Send invite email via Resend
    const { sendWaitlistInviteEmail } = await import("./authEmails")
    await sendWaitlistInviteEmail(result.email, firstName, signupUrl)

    return { email: result.email }
  },
})
