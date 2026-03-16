import { v } from "convex/values"
import { mutation, action, query, internalQuery } from "./_generated/server"
import { internal } from "./_generated/api"

export const ingestChunks = mutation({
  args: {
    conversationId: v.id("conversations"),
    sourceType: v.union(v.literal("web"), v.literal("upload")),
    sourceId: v.string(),
    chunks: v.array(v.object({
      chunkIndex: v.number(),
      content: v.string(),
      embedding: v.array(v.float64()),
      metadata: v.object({
        title: v.optional(v.string()),
        pageNumber: v.optional(v.number()),
        sectionHeading: v.optional(v.string()),
      }),
    })),
  },
  handler: async (ctx, args) => {
    for (const chunk of args.chunks) {
      await ctx.db.insert("sourceChunks", {
        conversationId: args.conversationId,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: chunk.metadata,
        createdAt: Date.now(),
      })
    }
    return { inserted: args.chunks.length }
  },
})

export const hasChunks = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const first = await ctx.db
      .query("sourceChunks")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .first()
    return first !== null
  },
})

export const hasSource = query({
  args: {
    conversationId: v.id("conversations"),
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const first = await ctx.db
      .query("sourceChunks")
      .withIndex("by_source", (q) =>
        q.eq("conversationId", args.conversationId).eq("sourceId", args.sourceId)
      )
      .first()
    return first !== null
  },
})

export const deleteByConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("sourceChunks")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect()
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id)
    }
    return { deleted: chunks.length }
  },
})

export const searchByEmbedding = action({
  args: {
    conversationId: v.id("conversations"),
    embedding: v.array(v.float64()),
    sourceId: v.optional(v.string()),
    sourceType: v.optional(v.union(v.literal("web"), v.literal("upload"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<Array<Record<string, unknown>>> => {
    // Convex VectorFilterBuilder only supports eq and or — no and.
    // We always filter by conversationId in the vector search, then
    // post-filter by sourceId/sourceType after hydrating documents.
    const results = await ctx.vectorSearch("sourceChunks", "by_embedding", {
      vector: args.embedding,
      // Over-fetch when post-filtering to ensure we return enough results
      limit: (args.sourceId || args.sourceType) ? 256 : (args.limit ?? 10),
      filter: (q) => q.eq("conversationId", args.conversationId),
    })

    const desiredLimit = args.limit ?? 10

    const chunks = []
    for (const r of results) {
      if (chunks.length >= desiredLimit) break
      const doc = await ctx.runQuery(internal.sourceChunks.getById, { id: r._id })
      if (!doc) continue
      if (args.sourceId && doc.sourceId !== args.sourceId) continue
      if (args.sourceType && doc.sourceType !== args.sourceType) continue
      chunks.push({ ...doc, _score: r._score })
    }

    return chunks
  },
})

export const getById = internalQuery({
  args: { id: v.id("sourceChunks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})
