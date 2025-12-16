import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// Get messages for conversation
export const getMessages = query({
    args: { conversationId: v.id("conversations") },
    handler: async ({ db }, { conversationId }) => {
        return await db
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
    handler: async ({ db }, { conversationId, userId }) => {
        const conversation = await db.get(conversationId)
        if (!conversation) {
            throw new Error("Conversation tidak ditemukan")
        }
        if (conversation.userId !== userId) {
            throw new Error("Tidak memiliki akses ke conversation ini")
        }

        const messages = await db
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
            title: v.string()
        }))),
    },
    handler: async ({ db }, args) => {
        const now = Date.now()
        const messageId = await db.insert("messages", {
            ...args,
            createdAt: now,
        })

        // Update conversation lastMessageAt
        await db.patch(args.conversationId, {
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
    handler: async ({ db }, { messageId, content }) => {
        await db.patch(messageId, { content })
    },
})

// Edit message and truncate conversation (for regeneration)
export const editAndTruncateConversation = mutation({
    args: {
        messageId: v.id("messages"),
        content: v.string(),
        conversationId: v.id("conversations"),
    },
    handler: async ({ db }, { messageId, content, conversationId }) => {
        // 1. Get the message to define the split point
        const message = await db.get(messageId)
        if (!message) throw new Error("Message not found")

        // 2. Update the message content
        await db.patch(messageId, { content })

        // 3. Find and delete all subsequent messages in this conversation
        const subsequentMessages = await db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .filter((q) => q.gt(q.field("createdAt"), message.createdAt))
            .collect()

        for (const msg of subsequentMessages) {
            await db.delete(msg._id)
        }
    },
})
