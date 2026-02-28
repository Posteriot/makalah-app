import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireConversationOwner } from "./authHelpers"

export const getByConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { conversationId }) => {
    await requireConversationOwner(ctx, conversationId)

    const context = await ctx.db
      .query("conversationAttachmentContexts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .unique()

    return context ?? null
  },
})

export const upsertByConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
    fileIds: v.array(v.id("files")),
    updatedByMessageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, { conversationId, fileIds, updatedByMessageId }) => {
    const { authUser } = await requireConversationOwner(ctx, conversationId)

    const dedupedFileIds = Array.from(new Set(fileIds))

    for (const fileId of dedupedFileIds) {
      const file = await ctx.db.get(fileId)
      if (!file || file.userId !== authUser._id) {
        throw new Error("File tidak ditemukan atau tidak memiliki akses")
      }
    }

    const now = Date.now()
    const existing = await ctx.db
      .query("conversationAttachmentContexts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .unique()

    if (existing) {
      await ctx.db.patch(existing._id, {
        activeFileIds: dedupedFileIds,
        updatedAt: now,
        updatedByMessageId,
      })
      return existing._id
    }

    return await ctx.db.insert("conversationAttachmentContexts", {
      conversationId,
      userId: authUser._id,
      activeFileIds: dedupedFileIds,
      updatedAt: now,
      updatedByMessageId,
    })
  },
})

export const clearByConversation = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, { conversationId }) => {
    await requireConversationOwner(ctx, conversationId)

    const existing = await ctx.db
      .query("conversationAttachmentContexts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .unique()

    if (existing) {
      await ctx.db.delete(existing._id)
    }

    return { success: true }
  },
})
