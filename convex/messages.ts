import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAuthUser, requireAuthUserId, requireConversationOwner, getConversationIfOwner } from "./authHelpers"

// Get messages for conversation
export const getMessages = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const result = await getConversationIfOwner(ctx, conversationId)
        if (!result) return []
        return await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .order("asc")
            .collect()
    },
})

// Hitung jumlah "pasang pesan" (user+assistant) untuk satu conversation.
// Dipakai buat gating rename judul final oleh AI.
export const countMessagePairsForConversation = query({
    args: {
        conversationId: v.id("conversations"),
        userId: v.id("users"),
    },
    handler: async (ctx, { conversationId, userId }) => {
        await requireAuthUserId(ctx, userId)
        const conversation = await ctx.db.get(conversationId)
        if (!conversation) {
            throw new Error("Conversation tidak ditemukan")
        }
        if (conversation.userId !== userId) {
            throw new Error("Tidak memiliki akses ke conversation ini")
        }

        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect()

        let userCount = 0
        let assistantCount = 0
        for (const msg of messages) {
            if (msg.role === "user") userCount += 1
            if (msg.role === "assistant") assistantCount += 1
        }

        return {
            userCount,
            assistantCount,
            pairCount: Math.min(userCount, assistantCount),
        }
    },
})

// Create message
export const createMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        role: v.string(), // "user" | "assistant" | "system"
        content: v.string(),
        fileIds: v.optional(v.array(v.id("files"))),
        metadata: v.optional(v.object({
            model: v.optional(v.string()),
            tokens: v.optional(v.number()),
            finishReason: v.optional(v.string()),
        })),
        sources: v.optional(v.array(v.object({
            url: v.string(),
            title: v.string(),
            publishedAt: v.optional(v.number()),
        }))),
    },
    handler: async (ctx, args) => {
        await requireConversationOwner(ctx, args.conversationId)
        const now = Date.now()
        const messageId = await ctx.db.insert("messages", {
            ...args,
            createdAt: now,
        })

        // Update conversation lastMessageAt
        await ctx.db.patch(args.conversationId, {
            lastMessageAt: now,
            updatedAt: now,
        })

        return messageId
    },
})

// Update message (for edit functionality)
// Update message (for edit functionality)
export const updateMessage = mutation({
    args: {
        messageId: v.id("messages"),
        content: v.string(),
    },
    handler: async (ctx, { messageId, content }) => {
        const authUser = await requireAuthUser(ctx)
        const message = await ctx.db.get(messageId)
        if (!message) {
            throw new Error("Message not found")
        }
        const conversation = await ctx.db.get(message.conversationId)
        if (!conversation || conversation.userId !== authUser._id) {
            throw new Error("Unauthorized")
        }
        await ctx.db.patch(messageId, { content })
    },
})

// Get recent assistant messages with sources (for artifact creation context)
// Returns sources from last N assistant messages that have sources
export const getRecentSources = query({
    args: {
        conversationId: v.id("conversations"),
        limit: v.optional(v.number()), // default 5
    },
    handler: async (ctx, { conversationId, limit = 5 }) => {
        await requireConversationOwner(ctx, conversationId)
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .order("desc")
            .collect()

        // Filter to assistant messages with sources
        const messagesWithSources = messages
            .filter((m) => m.role === "assistant" && m.sources && m.sources.length > 0)
            .slice(0, limit)

        // Flatten and deduplicate sources by URL
        const sourcesMap = new Map<string, { url: string; title: string; publishedAt?: number }>()
        for (const msg of messagesWithSources) {
            for (const source of msg.sources || []) {
                if (!sourcesMap.has(source.url)) {
                    sourcesMap.set(source.url, source)
                }
            }
        }

        return Array.from(sourcesMap.values())
    },
})

// Truncate conversation from a specific message (delete it and all subsequent)
// Used for edit-and-resend flow: delete the message, then sendMessage() creates new one
export const editAndTruncateConversation = mutation({
    args: {
        messageId: v.id("messages"),
        content: v.string(), // Kept for backwards compatibility, but not used
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, { messageId, conversationId }) => {
        const authUser = await requireAuthUser(ctx)
        const conversation = await ctx.db.get(conversationId)
        if (!conversation || conversation.userId !== authUser._id) {
            throw new Error("Unauthorized")
        }
        // 1. Get the message to define the split point
        const message = await ctx.db.get(messageId)
        if (!message) throw new Error("Message not found")
        if (message.conversationId !== conversationId) {
            throw new Error("Message tidak cocok dengan conversation")
        }

        // 2. Find and delete all subsequent messages in this conversation
        const subsequentMessages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .filter((q) => q.gt(q.field("createdAt"), message.createdAt))
            .collect()

        for (const msg of subsequentMessages) {
            await ctx.db.delete(msg._id)
        }

        // 3. Delete the edited message itself - sendMessage() will create a new one
        await ctx.db.delete(messageId)
    },
})
