import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { requireRole } from "./permissions"
import { documentationBlock } from "./schema"

// ============================================================================
// HELPERS (not exported)
// ============================================================================

/**
 * Recursively extract plain text from a TipTap JSON node.
 */
function extractTextFromTipTap(node: any): string {
  if (node.type === "text") return node.text ?? ""
  if (node.content) return node.content.map((n: any) => extractTextFromTipTap(n)).join(" ")
  return ""
}

/**
 * Build searchText from title, summary, and all block content.
 */
function generateSearchText(data: { title: string; summary?: string; blocks: any[] }): string {
  const parts: string[] = [data.title]
  if (data.summary) parts.push(data.summary)

  for (const block of data.blocks) {
    if ("title" in block && block.title) parts.push(block.title)
    if ("description" in block && block.description) parts.push(block.description)

    if (block.type === "section") {
      if (block.paragraphs) parts.push(...block.paragraphs)
      if (block.richContent) {
        try {
          parts.push(extractTextFromTipTap(JSON.parse(block.richContent)))
        } catch { /* ignore parse errors */ }
      }
      if (block.list) {
        for (const item of block.list.items) {
          parts.push(item.text)
          if (item.subItems) parts.push(...item.subItems)
        }
      }
    }
    if (block.type === "infoCard" && block.items) parts.push(...block.items)
    if (block.type === "ctaCards" && block.items) {
      for (const item of block.items) {
        parts.push(item.title, item.description)
      }
    }
  }

  return parts.join(" ")
}

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get all published documentation sections, ordered by order index.
 * Public — no auth required.
 */
export const getPublishedSections = query({
  args: {},
  handler: async (ctx) => {
    return ctx.db
      .query("documentationSections")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .collect()
  },
})

/**
 * Get a public URL for a stored documentation image.
 * Public — no auth required.
 */
export const getDocImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})

// ============================================================================
// ADMIN QUERIES
// ============================================================================

/**
 * List all documentation sections (including unpublished).
 * Admin only.
 */
export const listAllSections = query({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    return await ctx.db
      .query("documentationSections")
      .withIndex("by_order")
      .collect()
  },
})

/**
 * Get a single documentation section by slug.
 * Admin only.
 */
export const getSectionBySlug = query({
  args: {
    requestorId: v.id("users"),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    return await ctx.db
      .query("documentationSections")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()
  },
})

// ============================================================================
// ADMIN MUTATIONS
// ============================================================================

/**
 * Create or update a documentation section.
 * Admin only. Auto-generates searchText.
 */
export const upsertSection = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.optional(v.id("documentationSections")),
    slug: v.string(),
    title: v.string(),
    group: v.string(),
    order: v.number(),
    icon: v.optional(v.string()),
    headerIcon: v.optional(v.string()),
    summary: v.optional(v.string()),
    blocks: v.array(documentationBlock),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const { requestorId, id, ...data } = args
    const searchText = generateSearchText(data)
    const now = Date.now()

    if (id) {
      await ctx.db.patch(id, { ...data, searchText, updatedAt: now })
      return id
    }

    return await ctx.db.insert("documentationSections", {
      ...data,
      searchText,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Delete a documentation section.
 * Admin only.
 */
export const deleteSection = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.id("documentationSections"),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    const section = await ctx.db.get(args.id)
    if (!section) {
      throw new Error("Documentation section not found")
    }

    await ctx.db.delete(args.id)
  },
})

/**
 * Generate a storage upload URL for documentation images.
 * Admin only.
 */
export const generateDocUploadUrl = mutation({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")

    return await ctx.storage.generateUploadUrl()
  },
})

/**
 * Get a public URL for a stored image by storageId.
 * Mutation wrapper so it can be called imperatively from client components
 * (e.g. after uploading an inline image in the TipTap editor).
 */
export const getDocImageUrlMutation = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})
