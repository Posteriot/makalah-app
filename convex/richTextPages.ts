import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { requireRole } from "./permissions"

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a published page by slug.
 * Public — no auth required.
 */
export const getPageBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("richTextPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    if (!page || !page.isPublished) return null
    return page
  },
})

/**
 * List all pages (including unpublished).
 * Admin only.
 */
export const listAllPages = query({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    return await ctx.db.query("richTextPages").collect()
  },
})

/**
 * Get a page by slug without filtering by isPublished.
 * Admin only — needed to edit draft pages.
 */
export const getPageBySlugAdmin = query({
  args: {
    requestorId: v.id("users"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    return await ctx.db
      .query("richTextPages")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create or update a rich text page.
 * Admin only.
 */
export const upsertPage = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.optional(v.id("richTextPages")),
    slug: v.string(),
    title: v.string(),
    content: v.string(),
    lastUpdatedLabel: v.optional(v.string()),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const { requestorId, id, ...fields } = args
    const now = Date.now()

    if (id) {
      // Update existing
      await ctx.db.patch(id, {
        ...fields,
        updatedAt: now,
        updatedBy: requestorId,
      })
      return id
    } else {
      // Insert new
      return await ctx.db.insert("richTextPages", {
        ...fields,
        updatedAt: now,
        updatedBy: requestorId,
      })
    }
  },
})
