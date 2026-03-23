import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { getConversationIfOwner, requireConversationOwner } from "./authHelpers"

const paragraphValidator = v.object({
    index: v.number(),
    text: v.string(),
})

type SourceDocumentRecord = {
    _id: Id<"sourceDocuments">
    _creationTime: number
    conversationId: Id<"conversations">
    sourceId: string
    originalUrl: string
    resolvedUrl: string
    createdAt: number
    updatedAt: number
}

function sortSourceDocumentsForDeterministicSelection(
    documents: SourceDocumentRecord[]
): SourceDocumentRecord[] {
    return [...documents].sort((left, right) => {
        if (left.createdAt !== right.createdAt) return left.createdAt - right.createdAt
        if (left._creationTime !== right._creationTime) {
            return left._creationTime - right._creationTime
        }
        return left._id.localeCompare(right._id)
    })
}

export function selectExactSourceDocument(
    documents: SourceDocumentRecord[],
    sourceId: string
): SourceDocumentRecord | null {
    const matchingDocuments = documents.filter(
        (document) =>
            document.sourceId === sourceId ||
            document.originalUrl === sourceId ||
            document.resolvedUrl === sourceId
    )

    if (matchingDocuments.length === 0) return null

    return sortSourceDocumentsForDeterministicSelection(matchingDocuments)[0] ?? null
}

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

        const existingDocuments = await ctx.db
            .query("sourceDocuments")
            .withIndex("by_source", (q) =>
                q.eq("conversationId", args.conversationId).eq("sourceId", args.sourceId)
            )
            .collect()
        const sortedDocuments = sortSourceDocumentsForDeterministicSelection(
            existingDocuments as SourceDocumentRecord[]
        )
        const canonicalDocument = sortedDocuments[0] ?? null
        const duplicateDocuments = sortedDocuments.slice(1)

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

        if (canonicalDocument) {
            await ctx.db.patch(canonicalDocument._id, nextDocument)
            for (const duplicate of duplicateDocuments) {
                await ctx.db.delete(duplicate._id)
            }
            return { success: true as const, inserted: false as const, id: canonicalDocument._id }
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

        const documents = await ctx.db
            .query("sourceDocuments")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .collect()

        return selectExactSourceDocument(documents as SourceDocumentRecord[], args.sourceId)
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
