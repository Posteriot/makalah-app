import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { MutationCtx } from "./_generated/server"
import { requireAuthUserId, verifyAuthUserId, requireConversationOwner, getConversationIfOwner } from "./authHelpers"
import { Id } from "./_generated/dataModel"

const DEFAULT_WORKING_TITLE = "Paper Tanpa Judul"
const PLACEHOLDER_CONVERSATION_TITLES = new Set(["Percakapan baru", "New Chat"])
const PLACEHOLDER_WORKING_TITLES = new Set([
    ...PLACEHOLDER_CONVERSATION_TITLES,
    DEFAULT_WORKING_TITLE,
])
const MAX_CONVERSATION_TITLE_LENGTH = 50

function normalizeTitle(title?: string | null): string {
    if (!title) return ""
    return title.trim().replace(/\s+/g, " ")
}

function isMeaningfulConversationTitle(title: string): boolean {
    return !!title && !PLACEHOLDER_CONVERSATION_TITLES.has(title)
}

async function syncPaperSessionWorkingTitleIfEligible(
    ctx: MutationCtx,
    params: {
        conversationId: Id<"conversations">
        previousConversationTitle: string
        nextConversationTitle: string
        now: number
    }
) {
    const session = await ctx.db
        .query("paperSessions")
        .withIndex("by_conversation", (q) => q.eq("conversationId", params.conversationId))
        .unique()

    if (!session) return

    // Final title is authoritative and must not be changed by conversation rename.
    const normalizedPaperTitle = normalizeTitle(session.paperTitle)
    if (normalizedPaperTitle) return

    const nextTitle = normalizeTitle(params.nextConversationTitle)
    if (!isMeaningfulConversationTitle(nextTitle)) return

    const previousTitle = normalizeTitle(params.previousConversationTitle)
    const workingTitle = normalizeTitle(session.workingTitle)

    // Sync only if working title is still placeholder/default, empty, or mirroring old conversation title.
    const canSync =
        !workingTitle ||
        PLACEHOLDER_WORKING_TITLES.has(workingTitle) ||
        (!!previousTitle && workingTitle === previousTitle)

    if (!canSync) return

    await ctx.db.patch(session._id, {
        workingTitle: nextTitle,
        updatedAt: params.now,
    })
}

// List conversations for user
export const listConversations = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        if (!await verifyAuthUserId(ctx, userId)) return []
        return await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(50)
    },
})

// Get latest conversation for user (most recent by lastMessageAt)
export const getLatestForUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        await requireAuthUserId(ctx, userId)
        const conversation = await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .first()
        return conversation
    },
})

// Get single conversation (defensive - returns null if not owner or auth not ready)
export const getConversation = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        const result = await getConversationIfOwner(ctx, conversationId)
        return result?.conversation ?? null
    },
})

// Create new conversation
export const createConversation = mutation({
    args: {
        userId: v.id("users"),
        title: v.optional(v.string()),
    },
    handler: async (ctx, { userId, title }) => {
        await requireAuthUserId(ctx, userId)
        const now = Date.now()
        return await ctx.db.insert("conversations", {
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
    handler: async (ctx, { conversationId, title }) => {
        const { conversation } = await requireConversationOwner(ctx, conversationId)
        const now = Date.now()
        const updates: { updatedAt: number; lastMessageAt: number; title?: string } = {
            updatedAt: now,
            lastMessageAt: now,
        }
        const normalizedTitle = title
            ? normalizeTitle(title).slice(0, MAX_CONVERSATION_TITLE_LENGTH)
            : ""
        if (normalizedTitle && conversation.titleLocked) {
            return
        }
        if (normalizedTitle) {
            updates.title = normalizedTitle
        }
        await ctx.db.patch(conversationId, updates)

        if (normalizedTitle) {
            await syncPaperSessionWorkingTitleIfEligible(ctx, {
                conversationId,
                previousConversationTitle: conversation.title,
                nextConversationTitle: normalizedTitle,
                now,
            })
        }
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
    handler: async (ctx, { conversationId, userId, title, nextTitleUpdateCount }) => {
        await requireAuthUserId(ctx, userId)
        const conversation = await ctx.db.get(conversationId)
        if (!conversation) {
            throw new Error("Conversation tidak ditemukan")
        }
        if (conversation.userId !== userId) {
            throw new Error("Tidak memiliki akses ke conversation ini")
        }
        if (conversation.titleLocked) {
            return { success: false, reason: "locked" as const }
        }

        const normalizedTitle = normalizeTitle(title).slice(0, MAX_CONVERSATION_TITLE_LENGTH)
        if (!normalizedTitle) {
            return { success: false, reason: "empty_title" as const }
        }

        const now = Date.now()
        await ctx.db.patch(conversationId, {
            title: normalizedTitle,
            titleUpdateCount: nextTitleUpdateCount,
            updatedAt: now,
            lastMessageAt: now,
        })

        await syncPaperSessionWorkingTitleIfEligible(ctx, {
            conversationId,
            previousConversationTitle: conversation.title,
            nextConversationTitle: normalizedTitle,
            now,
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
    handler: async (ctx, { conversationId, userId, title }) => {
        await requireAuthUserId(ctx, userId)
        const conversation = await ctx.db.get(conversationId)
        if (!conversation) {
            throw new Error("Conversation tidak ditemukan")
        }
        if (conversation.userId !== userId) {
            throw new Error("Tidak memiliki akses ke conversation ini")
        }

        const normalizedTitle = normalizeTitle(title).slice(0, MAX_CONVERSATION_TITLE_LENGTH)
        if (!normalizedTitle) {
            throw new Error("Judul percakapan tidak boleh kosong")
        }

        const now = Date.now()
        await ctx.db.patch(conversationId, {
            title: normalizedTitle,
            titleLocked: true,
            updatedAt: now,
            lastMessageAt: now,
        })

        await syncPaperSessionWorkingTitleIfEligible(ctx, {
            conversationId,
            previousConversationTitle: conversation.title,
            nextConversationTitle: normalizedTitle,
            now,
        })

        return { success: true }
    },
})

// Delete conversation (cascade delete messages)
export const deleteConversation = mutation({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, { conversationId }) => {
        await requireConversationOwner(ctx, conversationId)
        // Delete all messages first
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect()

        for (const message of messages) {
            await ctx.db.delete(message._id)
        }

        // Delete conversation
        await ctx.db.delete(conversationId)
    },
})

// Cleanup empty conversations (0 messages) for a user
// Called when user enters /chat to prevent clutter
export const cleanupEmptyConversations = mutation({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        await requireAuthUserId(ctx, userId)

        // Get all conversations for user
        const conversations = await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect()

        let deletedCount = 0

        for (const conv of conversations) {
            // Check if conversation has any messages
            const firstMessage = await ctx.db
                .query("messages")
                .withIndex("by_conversation", (q) => q.eq("conversationId", conv._id))
                .first()

            // If no messages, delete the conversation
            if (!firstMessage) {
                await ctx.db.delete(conv._id)
                deletedCount++
            }
        }

        return { deletedCount }
    },
})
