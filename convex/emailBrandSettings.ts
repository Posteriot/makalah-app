import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { requireRole } from "./permissions"

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULTS = {
  appName: "Makalah AI",
  primaryColor: "#2563eb",
  secondaryColor: "#16a34a",
  backgroundColor: "#f8fafc",
  contentBackgroundColor: "#ffffff",
  textColor: "#1e293b",
  mutedTextColor: "#64748b",
  fontFamily: "Geist, Arial, sans-serif",
  footerText: "© 2026 Makalah AI. All rights reserved.",
  footerLinks: [
    { label: "Website", url: "https://makalah.ai" },
    { label: "Bantuan", url: "https://makalah.ai/documentation" },
  ],
}

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get brand settings for admin UI.
 * Public query — returns existing record or defaults with `_id: null`.
 */
export const getBrandSettings = query({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("emailBrandSettings").first()

    if (existing) {
      return existing
    }

    return {
      _id: null as null,
      _creationTime: 0,
      logoUrl: undefined,
      logoStorageId: undefined,
      ...DEFAULTS,
    }
  },
})

/**
 * Get brand settings for internal use (email rendering).
 * Returns record or defaults without `_id`.
 */
export const getBrandSettingsInternal = query({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("emailBrandSettings").first()

    if (existing) {
      const { _id, _creationTime, ...settings } = existing
      return settings
    }

    return {
      logoUrl: undefined,
      logoStorageId: undefined,
      ...DEFAULTS,
    }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create or update email brand settings.
 * Admin only. Single-row table — upserts.
 */
export const upsertBrandSettings = mutation({
  args: {
    requestorId: v.id("users"),
    appName: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    backgroundColor: v.optional(v.string()),
    contentBackgroundColor: v.optional(v.string()),
    textColor: v.optional(v.string()),
    mutedTextColor: v.optional(v.string()),
    fontFamily: v.optional(v.string()),
    footerText: v.optional(v.string()),
    footerLinks: v.optional(
      v.array(
        v.object({
          label: v.string(),
          url: v.string(),
        })
      )
    ),
    logoUrl: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const { requestorId: _requestorId, ...fields } = args

    // Remove undefined fields so we only patch what's provided
    const cleanFields: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        cleanFields[key] = value
      }
    }

    const existing = await ctx.db.query("emailBrandSettings").first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...cleanFields,
        updatedAt: Date.now(),
        updatedBy: args.requestorId,
      })
      return existing._id
    } else {
      return await ctx.db.insert("emailBrandSettings", {
        ...DEFAULTS,
        ...cleanFields,
        updatedAt: Date.now(),
        updatedBy: args.requestorId,
      })
    }
  },
})
