import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAuthUser, requireAuthUserId, requireFileOwner } from "./authHelpers"

// Upload file mutation (returns file ID)
// Upload file mutation (returns file ID)
export const createFile = mutation({
    args: {
        // userId: v.id("users"), // Infer from auth
        conversationId: v.optional(v.id("conversations")),
        storageId: v.string(),
        name: v.string(),
        type: v.string(),
        size: v.number(),
    },
    handler: async ({ db, auth }, args) => {
        const identity = await auth.getUserIdentity()
        if (!identity) {
            throw new Error("Unauthorized")
        }

        const user = await db
            .query("users")
            .withIndex("by_betterAuthUserId", (q) => q.eq("betterAuthUserId", identity.subject))
            .unique()

        if (!user) {
            throw new Error("User not found")
        }

        const now = Date.now()
        return await db.insert("files", {
            ...args,
            userId: user._id,
            status: "uploading",
            createdAt: now,
        })
    },
})

// Update file status after processing
export const updateFileStatus = mutation({
    args: {
        fileId: v.id("files"),
        status: v.string(),
        extractedText: v.optional(v.string()),
    },
    handler: async (ctx, { fileId, status, extractedText }) => {
        await requireFileOwner(ctx, fileId)
        await ctx.db.patch(fileId, { status, extractedText })
    },
})

// Update file extraction result after background processing
export const updateExtractionResult = mutation({
    args: {
        fileId: v.id("files"),
        extractedText: v.optional(v.string()),
        extractionStatus: v.string(), // "pending" | "success" | "failed"
        extractionError: v.optional(v.string()),
        processedAt: v.number(),
    },
    handler: async (ctx, { fileId, extractedText, extractionStatus, extractionError, processedAt }) => {
        await requireFileOwner(ctx, fileId)
        await ctx.db.patch(fileId, {
            extractedText,
            extractionStatus,
            extractionError,
            processedAt,
        })
    },
})

// Get file by ID
export const getFile = query({
    args: { fileId: v.id("files") },
    handler: async (ctx, { fileId }) => {
        const { file } = await requireFileOwner(ctx, fileId)
        return file
    },
})

// Get file storage URL untuk download/processing
export const getFileUrl = query({
    args: { storageId: v.string() },
    handler: async (ctx, { storageId }) => {
        const authUser = await requireAuthUser(ctx)
        const file = await ctx.db
            .query("files")
            .filter((q) => q.eq(q.field("storageId"), storageId))
            .first()
        if (!file || file.userId !== authUser._id) {
            throw new Error("Unauthorized")
        }
        return await ctx.storage.getUrl(storageId)
    },
})

// Get multiple files by IDs (untuk chat context injection)
export const getFilesByIds = query({
    args: {
        userId: v.id("users"),
        fileIds: v.array(v.id("files")),
    },
    handler: async (ctx, { userId, fileIds }) => {
        await requireAuthUserId(ctx, userId)
        const files = await Promise.all(fileIds.map((id) => ctx.db.get(id)))
        return files.filter((file) => file !== null && file.userId === userId)
    },
})

// Generate upload URL for client-side upload
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        await requireAuthUser(ctx)
        return await ctx.storage.generateUploadUrl()
    },
})
