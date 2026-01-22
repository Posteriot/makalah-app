import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getPublishedPosts = query({
    args: {
        category: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let postsQuery = ctx.db
            .query("blogSections")
            .withIndex("by_published", (q) => q.eq("isPublished", true))
            .order("desc");

        if (args.category && args.category !== "Semua") {
            postsQuery = ctx.db
                .query("blogSections")
                .withIndex("by_category", (q) =>
                    q.eq("category", args.category!).eq("isPublished", true)
                )
                .order("desc");
        }

        const posts = await postsQuery.take(args.limit ?? 50);
        return posts;
    },
});

export const getPostBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("blogSections")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();
    },
});

export const getFeaturedPost = query({
    handler: async (ctx) => {
        return await ctx.db
            .query("blogSections")
            .withIndex("by_featured", (q) => q.eq("featured", true).eq("isPublished", true))
            .order("desc")
            .first();
    },
});

// Seed data mutation (hanya untuk testing/internal)
export const seedBlogPosts = mutation({
    handler: async (ctx) => {
        // const existing = await ctx.db.query("blogSections").first();
        // if (existing) return "Already has data";

        const posts = [
            {
                title: "Panduan Lengkap Menulis Makalah Akademik dengan AI",
                slug: "panduan-menulis-makalah-ai",
                excerpt: "Pelajari cara memanfaatkan kekuatan AI untuk meningkatkan kualitas penulisan akademik Anda dengan 7 fase terstruktur.",
                author: "Dr. Sarah Wijaya",
                category: "Produk",
                readTime: "8 menit",
                featured: true,
                isPublished: true,
                publishedAt: Date.now(),
                blocks: [
                    {
                        type: "section",
                        title: "Pengantar",
                        description: "Teknologi AI telah mengubah cara kita menulis karya ilmiah.",
                        paragraphs: [
                            "AI bukan pengganti penulis, tapi partner brainstorming yang kuat.",
                            "Di Makalah Ai, kami mendesain workflow yang memastikan integritas akademik tetap terjaga."
                        ]
                    }
                ],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            {
                title: "Metodologi Penelitian Modern: Integrasi Teknologi AI",
                slug: "metodologi-penelitian-modern-ai",
                excerpt: "Eksplorasi bagaimana teknologi AI dapat membantu dalam proses penelitian dan analisis data akademik.",
                author: "Prof. Ahmad Rahman",
                category: "Penelitian",
                readTime: "12 menit",
                featured: false,
                isPublished: true,
                publishedAt: Date.now() - 86400000,
                blocks: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            {
                title: "Industri AI 2026: Persaingan Provider Meningkat",
                slug: "industri-ai-2026",
                excerpt: "Bagaimana peta persaingan antara OpenAI, Anthropic, dan Google di tahun 2026 mengubah cara kita bekerja.",
                author: "Evan Pratama",
                category: "Dinamika",
                readTime: "6 menit",
                featured: false,
                isPublished: true,
                publishedAt: Date.now() - 172800000,
                blocks: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            },
            {
                title: "Masa Depan AI: Kawan atau Lawan bagi Akademisi?",
                slug: "masa-depan-ai-akademik",
                excerpt: "Opini mendalam mengenai perubahan peran dosen dan mahasiswa di era otonom AI.",
                author: "Dr. Maya Sari",
                category: "Perspektif",
                readTime: "10 menit",
                featured: false,
                isPublished: true,
                publishedAt: Date.now() - 259200000,
                blocks: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
            }
        ];

        for (const post of posts) {
            await ctx.db.insert("blogSections", post as any); // eslint-disable-line @typescript-eslint/no-explicit-any
        }

        return "Seeded blog posts";
    },
});

export const clearBlogPosts = mutation({
    handler: async (ctx) => {
        const posts = await ctx.db.query("blogSections").collect();
        for (const post of posts) {
            await ctx.db.delete(post._id);
        }
        return "Cleared all blog posts";
    },
});
