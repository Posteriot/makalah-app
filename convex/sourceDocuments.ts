import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { getConversationIfOwner, requireConversationOwner } from "./authHelpers"

const paragraphValidator = v.object({
    index: v.number(),
    text: v.string(),
})

export const upsertDocument = mutation({
    args: {
        conversationId: v.id("conversations"),
        sourceId: v.string(),
        originalUrl: v.string(),
        resolvedUrl: v.string(),
        title: v.optional(v.string()),
        author: v.optional(v.string()),
        publishedAt: v.optional(v.string()),
        siteName: v.optional(v.string()),
        paragraphs: v.array(paragraphValidator),
        documentText: v.string(),
    },
    handler: async (ctx, args) => {
        const { conversation } = await requireConversationOwner(ctx, args.conversationId)
        const now = Date.now()

        const existing = await ctx.db
            .query("sourceDocuments")
            .withIndex("by_source", (q) =>
                q.eq("conversationId", args.conversationId).eq("sourceId", args.sourceId)
            )
            .unique()

        const nextDocument = {
            conversationId: conversation._id,
            sourceId: args.sourceId,
            originalUrl: args.originalUrl,
            resolvedUrl: args.resolvedUrl,
            ...(typeof args.title === "string" ? { title: args.title } : {}),
            ...(typeof args.author === "string" ? { author: args.author } : {}),
            ...(typeof args.publishedAt === "string" ? { publishedAt: args.publishedAt } : {}),
            ...(typeof args.siteName === "string" ? { siteName: args.siteName } : {}),
            paragraphs: args.paragraphs,
            documentText: args.documentText,
            updatedAt: now,
        }

        if (existing) {
            await ctx.db.patch(existing._id, nextDocument)
            return { success: true as const, inserted: false as const, id: existing._id }
        }

        const id = await ctx.db.insert("sourceDocuments", {
            ...nextDocument,
            createdAt: now,
        })
        return { success: true as const, inserted: true as const, id }
    },
})

export const getBySource = query({
    args: {
        conversationId: v.id("conversations"),
        sourceId: v.string(),
    },
    handler: async (ctx, args) => {
        if (!(await getConversationIfOwner(ctx, args.conversationId))) return null

        return await ctx.db
            .query("sourceDocuments")
            .withIndex("by_source", (q) =>
                q.eq("conversationId", args.conversationId).eq("sourceId", args.sourceId)
            )
            .unique()
    },
})

export const deleteByConversation = mutation({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        await requireConversationOwner(ctx, args.conversationId)

        const docs = await ctx.db
            .query("sourceDocuments")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .collect()

        for (const doc of docs) {
            await ctx.db.delete(doc._id)
        }

        return { deleted: docs.length }
    },
})
