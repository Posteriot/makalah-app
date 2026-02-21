import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { requireRole } from "./permissions"

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a single config record by key.
 * Public — no auth required.
 */
export const getConfig = query({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first()
  },
})

/**
 * List all config records.
 * Admin only.
 */
export const listAllConfigs = query({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    return await ctx.db.query("siteConfig").collect()
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create or update a site config record by key.
 * Admin only.
 */
export const upsertConfig = mutation({
  args: {
    requestorId: v.id("users"),
    key: v.string(),
    navLinks: v.optional(
      v.array(
        v.object({
          label: v.string(),
          href: v.string(),
          isVisible: v.boolean(),
        })
      )
    ),
    footerSections: v.optional(
      v.array(
        v.object({
          title: v.string(),
          links: v.array(
            v.object({
              label: v.string(),
              href: v.string(),
              isExternal: v.optional(v.boolean()),
            })
          ),
        })
      )
    ),
    socialLinks: v.optional(
      v.array(
        v.object({
          platform: v.string(),
          url: v.string(),
          isVisible: v.boolean(),
          iconId: v.optional(v.id("_storage")),
        })
      )
    ),
    copyrightText: v.optional(v.string()),
    companyDescription: v.optional(v.string()),
    logoDarkId: v.optional(v.id("_storage")),
    logoLightId: v.optional(v.id("_storage")),
    brandTextDarkId: v.optional(v.id("_storage")),
    brandTextLightId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const { requestorId, key, ...fields } = args
    const now = Date.now()

    const existing = await ctx.db
      .query("siteConfig")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...fields,
        updatedAt: now,
        updatedBy: requestorId,
      })
      return existing._id
    } else {
      return await ctx.db.insert("siteConfig", {
        key,
        ...fields,
        updatedAt: now,
        updatedBy: requestorId,
      })
    }
  },
})
