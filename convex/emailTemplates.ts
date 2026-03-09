import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { requireRole } from "./permissions"

// ============================================================================
// CONSTANTS
// ============================================================================

export const TEMPLATE_GROUPS = {
  auth: [
    "verification",
    "magic_link",
    "password_reset",
    "two_factor_otp",
    "signup_success",
    "waitlist_confirmation",
  ],
  payment: ["payment_success", "payment_failed"],
  notification: [
    "waitlist_invite",
    "waitlist_admin",
    "technical_report_dev",
    "technical_report_user",
  ],
} as const

export const TEMPLATE_LABELS: Record<string, string> = {
  verification: "Verifikasi Email",
  magic_link: "Magic Link",
  password_reset: "Reset Password",
  two_factor_otp: "Kode 2FA",
  signup_success: "Pendaftaran Berhasil",
  waitlist_confirmation: "Konfirmasi Waitlist",
  waitlist_invite: "Undangan Waitlist",
  waitlist_admin: "Notifikasi Admin Waitlist",
  technical_report_dev: "Laporan Teknis (Developer)",
  technical_report_user: "Laporan Teknis (User)",
  payment_success: "Pembayaran Berhasil",
  payment_failed: "Pembayaran Gagal",
}

// ============================================================================
// SHARED VALIDATORS
// ============================================================================

const sectionValidator = v.object({
  id: v.string(),
  type: v.string(),
  content: v.optional(v.string()),
  url: v.optional(v.string()),
  label: v.optional(v.string()),
  style: v.optional(
    v.object({
      backgroundColor: v.optional(v.string()),
      textColor: v.optional(v.string()),
      fontSize: v.optional(v.string()),
      textAlign: v.optional(v.string()),
      padding: v.optional(v.string()),
    })
  ),
  rows: v.optional(
    v.array(
      v.object({
        label: v.string(),
        value: v.string(),
      })
    )
  ),
})

const placeholderValidator = v.object({
  key: v.string(),
  description: v.string(),
  example: v.string(),
})

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get template by templateType. Public query.
 */
export const getTemplateByType = query({
  args: { templateType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailTemplates")
      .withIndex("by_templateType", (q) =>
        q.eq("templateType", args.templateType)
      )
      .first()
  },
})

/**
 * Get all templates. Admin only.
 */
export const getAllTemplates = query({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return await ctx.db.query("emailTemplates").collect()
  },
})

/**
 * Get templates by group. Admin only.
 * Group: "auth" | "payment" | "notification"
 */
export const getTemplatesByGroup = query({
  args: {
    requestorId: v.id("users"),
    group: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const groupTypes =
      TEMPLATE_GROUPS[args.group as keyof typeof TEMPLATE_GROUPS]
    if (!groupTypes) {
      throw new Error(`Invalid group: ${args.group}`)
    }

    const results = []
    for (const templateType of groupTypes) {
      const template = await ctx.db
        .query("emailTemplates")
        .withIndex("by_templateType", (q) =>
          q.eq("templateType", templateType)
        )
        .first()
      if (template) {
        results.push(template)
      }
    }

    return results
  },
})

/**
 * Get active template for email sending.
 * Returns single active template or null.
 */
export const getActiveTemplate = query({
  args: { templateType: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emailTemplates")
      .withIndex("by_active", (q) =>
        q.eq("isActive", true).eq("templateType", args.templateType)
      )
      .first()
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create or update email template. Admin only.
 * If id provided → patch (increment version).
 * If not → insert with version 1.
 */
export const upsertTemplate = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.optional(v.id("emailTemplates")),
    templateType: v.string(),
    subject: v.string(),
    sections: v.array(sectionValidator),
    availablePlaceholders: v.array(placeholderValidator),
    preRenderedHtml: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const { requestorId, id, ...fields } = args
    const now = Date.now()

    if (id) {
      const existing = await ctx.db.get(id)
      if (!existing) {
        throw new Error("Template not found")
      }

      await ctx.db.patch(id, {
        ...fields,
        version: existing.version + 1,
        updatedBy: requestorId,
        updatedAt: now,
      })
      return id
    } else {
      return await ctx.db.insert("emailTemplates", {
        ...fields,
        version: 1,
        updatedBy: requestorId,
        updatedAt: now,
      })
    }
  },
})

// ============================================================================
// HELPERS (not Convex functions)
// ============================================================================

/**
 * Replace {{placeholder}} tokens in a template string.
 * Unmatched placeholders are left as-is.
 */
export function replacePlaceholders(
  template: string,
  data: Record<string, string>
): string {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => data[key] ?? `{{${key}}}`
  )
}
