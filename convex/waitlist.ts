import { v } from "convex/values"
import { mutation, query, internalMutation, internalAction, action } from "./_generated/server"
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

/**
 * Reset entry back to "pending" (admin only).
 * Allows re-inviting the same email for testing without deleting the entry.
 */
export const resetToPending = mutation({
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

    if (entry.status === "pending") {
      throw new Error("Entry sudah berstatus pending")
    }

    await ctx.db.patch(args.entryId, {
      status: "pending",
      invitedAt: undefined,
      registeredAt: undefined,
    })

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
    const signupUrl = `${appUrl}/waitinglist/sign-up`

    // Send invite email via Resend
    const { sendWaitlistInviteEmail } = await import("./authEmails")
    await sendWaitlistInviteEmail(result.email, firstName, signupUrl)

    return { email: result.email }
  },
})

// ════════════════════════════════════════════════════════════════
// Admin Notification (internal, called by scheduler or other actions)
// ════════════════════════════════════════════════════════════════

/**
 * Send email notification to all admins/superadmins about a waitlist event.
 * Called via ctx.scheduler.runAfter(0, ...) from mutations,
 * or directly from actions.
 */
export const notifyAdminsWaitlistEvent = internalAction({
  args: {
    event: v.union(
      v.literal("new_registration"),
      v.literal("invited"),
      v.literal("registered")
    ),
    entryEmail: v.string(),
    entryName: v.string(),
  },
  handler: async (_ctx, args) => {
    const superadminEmails = (process.env.SUPERADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    // Dedupe
    const allAdmins = [...new Set([...superadminEmails, ...adminEmails])]

    if (allAdmins.length === 0) {
      console.warn("[Waitlist Admin] No admin emails configured, skipping notification")
      return
    }

    const { sendWaitlistAdminNotification } = await import("./authEmails")
    await sendWaitlistAdminNotification(allAdmins, args.event, args.entryEmail, args.entryName)
  },
})
