import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { requireRole } from "./permissions"
import type { Doc, Id } from "./_generated/dataModel"

// ════════════════════════════════════════════════════════════════
// Helper - resolve cover image URL from storage
// ════════════════════════════════════════════════════════════════

async function resolvePostCoverUrl(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  post: Doc<"blogSections">
) {
  return {
    ...post,
    coverImageUrl: post.coverImageId
      ? await ctx.storage.getUrl(post.coverImageId)
      : null,
  }
}

// ════════════════════════════════════════════════════════════════
// Public Queries
// ════════════════════════════════════════════════════════════════

export const getPublishedPosts = query({
  args: {
    category: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let postsQuery = ctx.db
      .query("blogSections")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .order("desc")

    if (args.category && args.category !== "Semua") {
      postsQuery = ctx.db
        .query("blogSections")
        .withIndex("by_category", (q) =>
          q.eq("category", args.category!).eq("isPublished", true)
        )
        .order("desc")
    }

    const posts = await postsQuery.take(args.limit ?? 50)
    return Promise.all(posts.map((p) => resolvePostCoverUrl(ctx, p)))
  },
})

export const getPostBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const post = await ctx.db
      .query("blogSections")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()

    if (!post) return null
    return resolvePostCoverUrl(ctx, post)
  },
})

export const getFeaturedPost = query({
  handler: async (ctx) => {
    const post = await ctx.db
      .query("blogSections")
      .withIndex("by_featured", (q) =>
        q.eq("featured", true).eq("isPublished", true)
      )
      .order("desc")
      .first()

    if (!post) return null
    return resolvePostCoverUrl(ctx, post)
  },
})

// ════════════════════════════════════════════════════════════════
// Admin Queries
// ════════════════════════════════════════════════════════════════

export const listAllPosts = query({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return await ctx.db.query("blogSections").order("desc").collect()
  },
})

export const getPostBySlugAdmin = query({
  args: { requestorId: v.id("users"), slug: v.string() },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return await ctx.db
      .query("blogSections")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first()
  },
})

// ════════════════════════════════════════════════════════════════
// Admin Mutations
// ════════════════════════════════════════════════════════════════

export const upsertPost = mutation({
  args: {
    requestorId: v.id("users"),
    id: v.optional(v.id("blogSections")),
    slug: v.string(),
    title: v.string(),
    excerpt: v.string(),
    author: v.string(),
    category: v.string(),
    readTime: v.string(),
    featured: v.boolean(),
    isPublished: v.boolean(),
    publishedAt: v.number(),
    content: v.optional(v.string()),
    coverImageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    const { requestorId, id, ...data } = args
    const now = Date.now()

    if (id) {
      await ctx.db.patch(id, { ...data, updatedAt: now })
      return id
    }
    return await ctx.db.insert("blogSections", {
      ...data,
      blocks: [],
      createdAt: now,
      updatedAt: now,
    })
  },
})

export const deletePost = mutation({
  args: { requestorId: v.id("users"), id: v.id("blogSections") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    const post = await ctx.db.get(args.id)
    if (!post) throw new Error("Blog post not found")
    await ctx.db.delete(args.id)
  },
})

export const generateBlogUploadUrl = mutation({
  args: { requestorId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx.db, args.requestorId, "admin")
    return await ctx.storage.generateUploadUrl()
  },
})

export const getBlogImageUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})

export const getBlogImageUrlMutation = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId)
  },
})

// ════════════════════════════════════════════════════════════════
// Seed Data (testing/internal only)
// ════════════════════════════════════════════════════════════════

export const seedBlogPosts = mutation({
  handler: async (ctx) => {
    const now = Date.now()
    const posts = [
      {
        title: "Panduan Lengkap Menulis Makalah Akademik dengan AI",
        slug: "panduan-menulis-makalah-ai",
        excerpt:
          "Pelajari cara memanfaatkan kekuatan AI untuk meningkatkan kualitas penulisan akademik Anda dengan 7 fase terstruktur.",
        author: "Dr. Sarah Wijaya",
        category: "Produk",
        readTime: "8 menit",
        featured: true,
        isPublished: true,
        publishedAt: now,
        blocks: [
          {
            type: "section" as const,
            title: "Pengantar",
            description:
              "Teknologi AI telah mengubah cara kita menulis karya ilmiah.",
            paragraphs: [
              "AI bukan pengganti penulis, tapi partner brainstorming yang kuat.",
              "Di Makalah Ai, kami mendesain workflow yang memastikan integritas akademik tetap terjaga.",
            ],
          },
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        title: "Metodologi Penelitian Modern: Integrasi Teknologi AI",
        slug: "metodologi-penelitian-modern-ai",
        excerpt:
          "Eksplorasi bagaimana teknologi AI dapat membantu dalam proses penelitian dan analisis data akademik.",
        author: "Prof. Ahmad Rahman",
        category: "Penelitian",
        readTime: "12 menit",
        featured: false,
        isPublished: true,
        publishedAt: now - 86400000,
        blocks: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        title: "Industri AI 2026: Persaingan Provider Meningkat",
        slug: "industri-ai-2026",
        excerpt:
          "Bagaimana peta persaingan antara OpenAI, Anthropic, dan Google di tahun 2026 mengubah cara kita bekerja.",
        author: "Evan Pratama",
        category: "Dinamika",
        readTime: "6 menit",
        featured: false,
        isPublished: true,
        publishedAt: now - 172800000,
        blocks: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        title: "Masa Depan AI: Kawan atau Lawan bagi Akademisi?",
        slug: "masa-depan-ai-akademik",
        excerpt:
          "Opini mendalam mengenai perubahan peran dosen dan mahasiswa di era otonom AI.",
        author: "Dr. Maya Sari",
        category: "Perspektif",
        readTime: "10 menit",
        featured: false,
        isPublished: true,
        publishedAt: now - 259200000,
        blocks: [],
        createdAt: now,
        updatedAt: now,
      },
    ]

    for (const post of posts) {
      await ctx.db.insert("blogSections", post)
    }

    return "Seeded blog posts"
  },
})

export const clearBlogPosts = mutation({
  handler: async (ctx) => {
    const posts = await ctx.db.query("blogSections").collect()
    for (const post of posts) {
      await ctx.db.delete(post._id)
    }
    return "Cleared all blog posts"
  },
})
