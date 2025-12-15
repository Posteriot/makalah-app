import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

// List conversations for user
export const listConversations = query({
    args: { userId: v.id("users") },
    handler: async ({ db }, { userId }) => {
        return await db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(50)
    },
})

// Get single conversation
export const getConversation = query({
    args: { conversationId: v.id("conversations") },
    handler: async ({ db }, { conversationId }) => {
        return await db.get(conversationId)
    },
})

// Create new conversation
export const createConversation = mutation({
    args: {
        userId: v.id("users"),
        title: v.optional(v.string()),
    },
    handler: async ({ db }, { userId, title }) => {
        const now = Date.now()
        return await db.insert("conversations", {
            userId,
            title: title ?? "Percakapan baru",
            titleUpdateCount: 0,
            titleLocked: false,
            createdAt: now,
            updatedAt: now,
            lastMessageAt: now,
        })
    },
})

// Update conversation title and timestamp
export const updateConversation = mutation({
    args: {
        conversationId: v.id("conversations"),
        title: v.optional(v.string()),
    },
    handler: async ({ db }, { conversationId, title }) => {
        const now = Date.now()
        const updates: { updatedAt: number; lastMessageAt: number; title?: string } = {
            updatedAt: now,
            lastMessageAt: now,
        }
        if (title) {
            updates.title = title
        }
        await db.patch(conversationId, updates)
    },
})

// Update judul dari AI (dibatasi max 2x dan stop kalau user lock)
export const updateConversationTitleFromAI = mutation({
    args: {
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        title: v.string(),
        nextTitleUpdateCount: v.number(),
    },
    handler: async ({ db }, { conversationId, userId, title, nextTitleUpdateCount }) => {
        const conversation = await db.get(conversationId)
        if (!conversation) {
            throw new Error("Conversation tidak ditemukan")
        }
        if (conversation.userId !== userId) {
            throw new Error("Tidak memiliki akses ke conversation ini")
        }
        if (conversation.titleLocked) {
            return { success: false, reason: "locked" as const }
        }

        const now = Date.now()
        await db.patch(conversationId, {
            title: title.trim().slice(0, 50),
            titleUpdateCount: nextTitleUpdateCount,
            updatedAt: now,
            lastMessageAt: now,
        })

        return { success: true }
    },
})

// Update judul oleh user (langsung lock supaya AI nggak ngubah lagi)
export const updateConversationTitleFromUser = mutation({
    args: {
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        title: v.string(),
    },
    handler: async ({ db }, { conversationId, userId, title }) => {
        const conversation = await db.get(conversationId)
        if (!conversation) {
            throw new Error("Conversation tidak ditemukan")
        }
        if (conversation.userId !== userId) {
            throw new Error("Tidak memiliki akses ke conversation ini")
        }

        const now = Date.now()
        await db.patch(conversationId, {
            title: title.trim().slice(0, 50),
            titleLocked: true,
            updatedAt: now,
            lastMessageAt: now,
        })

        return { success: true }
    },
})

// Delete conversation (cascade delete messages)
export const deleteConversation = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async ({ db }, { conversationId }) => {
        // Delete all messages first
        const messages = await db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect()

        for (const message of messages) {
            await db.delete(message._id)
        }

        // Delete conversation
        await db.delete(conversationId)
    },
})
