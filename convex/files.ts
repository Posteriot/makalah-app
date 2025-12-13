import { v } from "convex/values"
import { mutation, query } from "./_generated/server"

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
            .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
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
    handler: async ({ db }, { fileId, status, extractedText }) => {
        await db.patch(fileId, { status, extractedText })
    },
})

// Get file by ID
export const getFile = query({
    args: { fileId: v.id("files") },
    handler: async ({ db }, { fileId }) => {
        return await db.get(fileId)
    },
})
// Generate upload URL for client-side upload
export const generateUploadUrl = mutation({
    args: {},
    handler: async (ctx) => {
        return await ctx.storage.generateUploadUrl()
    },
})
