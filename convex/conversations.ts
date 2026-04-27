import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { paginationOptsValidator } from "convex/server"
import type { MutationCtx } from "./_generated/server"
import { requireAuthUser, requireAuthUserId, verifyAuthUserId, requireConversationOwner, getConversationIfOwner } from "./authHelpers"
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

async function deleteConversationCascade(ctx: MutationCtx, conversationId: Id<"conversations">) {
    const attachmentContext = await ctx.db
        .query("conversationAttachmentContexts")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .unique()

    if (attachmentContext) {
        await ctx.db.delete(attachmentContext._id)
    }

    const paperSession = await ctx.db
        .query("paperSessions")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .unique()

    if (paperSession) {
        const rewindEntries = await ctx.db
            .query("rewindHistory")
            .withIndex("by_session", (q) => q.eq("sessionId", paperSession._id))
            .collect()

        for (const entry of rewindEntries) {
            await ctx.db.delete(entry._id)
        }
    }

    const files = await ctx.db
        .query("files")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect()

    for (const file of files) {
        try {
            await ctx.storage.delete(file.storageId as Id<"_storage">)
        } catch {
            // Ignore stale or already-deleted blobs; row cleanup must still proceed.
        }
        await ctx.db.delete(file._id)
    }

    // Delete source chunks (RAG data)
    const sourceChunks = await ctx.db
        .query("sourceChunks")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect()
    for (const chunk of sourceChunks) {
        await ctx.db.delete(chunk._id)
    }

    // Delete exact source documents used for exact-source inspection
    const sourceDocuments = await ctx.db
        .query("sourceDocuments")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect()
    for (const doc of sourceDocuments) {
        await ctx.db.delete(doc._id)
    }

    const artifacts = await ctx.db
        .query("artifacts")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect()

    for (const artifact of artifacts) {
        await ctx.db.delete(artifact._id)
    }

    const messages = await ctx.db
        .query("messages")
        .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
        .collect()

    for (const message of messages) {
        await ctx.db.delete(message._id)
    }

    if (paperSession) {
        await ctx.db.delete(paperSession._id)
    }

    await ctx.db.delete(conversationId)
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

export const listConversationsWindow = query({
    args: {
        userId: v.id("users"),
        paginationOpts: paginationOptsValidator,
    },
    handler: async (ctx, { userId, paginationOpts }) => {
        if (!await verifyAuthUserId(ctx, userId)) {
            return {
                page: [],
                isDone: true,
                continueCursor: "",
                splitCursor: null,
                pageStatus: null,
            }
        }

        return await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .paginate(paginationOpts)
    },
})

export const countConversations = query({
    args: { userId: v.id("users") },
    handler: async (ctx, { userId }) => {
        if (!await verifyAuthUserId(ctx, userId)) return 0
        const conversations = await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect()
        return conversations.length
    },
})

export const listConversationsPaginated = query({
    args: {
        userId: v.id("users"),
        page: v.number(),
        pageSize: v.number(),
    },
    handler: async (ctx, { userId, page, pageSize }) => {
        if (!await verifyAuthUserId(ctx, userId)) {
            return {
                items: [],
                totalCount: 0,
                page: 1,
                pageSize,
            }
        }

        const safePage = Math.max(1, Math.floor(page))
        const safePageSize = Math.max(1, Math.floor(pageSize))
        const allConversations = await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .collect()

        const start = (safePage - 1) * safePageSize
        const items = allConversations.slice(start, start + safePageSize)

        return {
            items,
            totalCount: allConversations.length,
            page: safePage,
            pageSize: safePageSize,
        }
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
        const workingTitle = title ?? "Percakapan baru"
        const conversationId = await ctx.db.insert("conversations", {
            userId,
            title: workingTitle,
            titleUpdateCount: 0,
            titleLocked: false,
            createdAt: now,
            updatedAt: now,
            lastMessageAt: now,
        })

        // Auto-create paper session — every conversation is a paper session.
        // Same transaction = atomic, no race condition possible.
        console.info(`[PAPER][auto-create] conversationId=${conversationId} stage=gagasan`)
        await ctx.db.insert("paperSessions", {
            userId,
            conversationId,
            currentStage: "gagasan",
            stageStatus: "drafting",
            workingTitle,
            stageData: {},
            createdAt: now,
            updatedAt: now,
        })

        return conversationId
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
        await deleteConversationCascade(ctx, conversationId)
        return { deletedCount: 1 }
    },
})

export const bulkDeleteConversations = mutation({
    args: { conversationIds: v.array(v.id("conversations")) },
    handler: async (ctx, { conversationIds }) => {
        const uniqueConversationIds = [...new Set(conversationIds)]

        for (const conversationId of uniqueConversationIds) {
            await requireConversationOwner(ctx, conversationId)
        }

        for (const conversationId of uniqueConversationIds) {
            await deleteConversationCascade(ctx, conversationId)
        }

        return { deletedCount: uniqueConversationIds.length }
    },
})

export const deleteAllConversations = mutation({
    args: {},
    handler: async (ctx) => {
        const authUser = await requireAuthUser(ctx)
        // Paginate: delete up to 5 conversations per mutation call to stay
        // within Convex's 16 MB read limit. The client should call repeatedly
        // until remaining === 0.
        const BATCH_SIZE = 5
        const conversations = await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", authUser._id))
            .take(BATCH_SIZE)

        for (const conversation of conversations) {
            await deleteConversationCascade(ctx, conversation._id)
        }

        // Check if there are more conversations remaining
        const remaining = await ctx.db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", authUser._id))
            .first()

        return { deletedCount: conversations.length, hasMore: remaining !== null }
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
                await deleteConversationCascade(ctx, conv._id)
                deletedCount++
            }
        }

        return { deletedCount }
    },
})
