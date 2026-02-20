import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { requireRole } from "./permissions"

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all published sections for a page, sorted by sortOrder.
 * Public — no auth required.
 */
export const getPageSections = query({
  args: { pageSlug: v.string() },
  handler: async (ctx, args) => {
    const sections = await ctx.db
      .query("pageContent")
      .withIndex("by_page", (q) => q.eq("pageSlug", args.pageSlug))
      .collect()

    // Filter to published only (index sorts by sortOrder already)
    return sections.filter((s) => s.isPublished)
  },
})

/**
 * Get a single section by page + section slug.
 * Public — no auth required.
 */
export const getSection = query({
  args: {
    pageSlug: v.string(),
    sectionSlug: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pageContent")
      .withIndex("by_page_section", (q) =>
        q.eq("pageSlug", args.pageSlug).eq("sectionSlug", args.sectionSlug)
      )
      .first()
  },
})

/**
 * List all sections (including unpublished).
 * Admin only.
 */
export const listAllSections = query({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    return await ctx.db.query("pageContent").collect()
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create or update a page content section.
 * Admin only.
 */
export const upsertSection = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.optional(v.id("pageContent")),
    pageSlug: v.string(),
    sectionSlug: v.string(),
    sectionType: v.union(
      v.literal("hero"),
      v.literal("benefits"),
      v.literal("feature-showcase"),
    ),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    ctaText: v.optional(v.string()),
    ctaHref: v.optional(v.string()),
    badgeText: v.optional(v.string()),
    items: v.optional(
      v.array(
        v.object({
          title: v.string(),
          description: v.string(),
          icon: v.optional(v.string()),
          imageId: v.optional(v.id("_storage")),
        })
      )
    ),
    primaryImageId: v.optional(v.id("_storage")),
    primaryImageAlt: v.optional(v.string()),
    isPublished: v.boolean(),
    sortOrder: v.number(),
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
      return await ctx.db.insert("pageContent", {
        ...fields,
        updatedAt: now,
        updatedBy: requestorId,
      })
    }
  },
})

/**
 * Toggle isPublished for a section.
 * Admin only.
 */
export const togglePublish = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.id("pageContent"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const section = await ctx.db.get(args.id)
    if (!section) {
      throw new Error("Section not found")
    }

    await ctx.db.patch(args.id, {
      isPublished: !section.isPublished,
      updatedAt: Date.now(),
      updatedBy: args.requestorId,
    })
  },
})

/**
 * Generate a storage upload URL.
 * Admin only.
 */
export const generateUploadUrl = mutation({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * Get a public URL for a stored image.
 * Public — no auth required.
 */
export const getImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})
