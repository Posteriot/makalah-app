import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getNextStage, PaperStageId } from "./paperSessions/constants";

// ═══════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════

/**
 * Mendapatkan paper session berdasarkan session ID.
 */
export const getById = query({
    args: { sessionId: v.id("paperSessions") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.sessionId);
    },
});

/**
 * Mendapatkan paper session berdasarkan conversation ID.
 */
export const getByConversation = query({
    args: { conversationId: v.id("conversations") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("paperSessions")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .unique();
    },
});

/**
 * Mendapatkan daftar paper session milik user (sorted by updatedAt desc).
 */
export const getByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("paperSessions")
            .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
    },
});

/**
 * Mendapatkan daftar paper session milik user dengan filter.
 * - status: "all" | "in_progress" | "completed"
 * - includeArchived: boolean (default false)
 * - sortBy: "updatedAt" | "createdAt" (default "updatedAt")
 */
export const getByUserWithFilter = query({
    args: {
        userId: v.id("users"),
        status: v.optional(v.union(
            v.literal("all"),
            v.literal("in_progress"),
            v.literal("completed")
        )),
        includeArchived: v.optional(v.boolean()),
        sortBy: v.optional(v.union(
            v.literal("updatedAt"),
            v.literal("createdAt")
        )),
    },
    handler: async (ctx, args) => {
        const { userId, status = "all", includeArchived = false, sortBy = "updatedAt" } = args;

        let sessions;

        if (includeArchived) {
            sessions = await ctx.db
                .query("paperSessions")
                .withIndex("by_user_archived", (q) => q.eq("userId", userId))
                .order("desc")
                .collect();
            sessions = sessions.filter(s => s.archivedAt);
        } else {
            sessions = await ctx.db
                .query("paperSessions")
                .withIndex("by_user_updated", (q) => q.eq("userId", userId))
                .order("desc")
                .collect();
            sessions = sessions.filter(s => !s.archivedAt);
        }

        // Filter by status
        if (status === "in_progress") {
            sessions = sessions.filter(s => s.currentStage !== "completed");
        } else if (status === "completed") {
            sessions = sessions.filter(s => s.currentStage === "completed");
        }

        // Sort by specified field
        if (sortBy === "createdAt") {
            sessions = sessions.sort((a, b) => b.createdAt - a.createdAt);
        } else if (sortBy === "updatedAt") {
            sessions = sessions.sort((a, b) => b.updatedAt - a.updatedAt);
        }

        return sessions;
    },
});

/**
 * Mendapatkan detail session dengan conversation untuk display.
 */
export const getSessionWithConversation = query({
    args: { sessionId: v.id("paperSessions") },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) return null;

        const conversation = await ctx.db.get(session.conversationId);

        return {
            ...session,
            conversation,
        };
    },
});

// ═══════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════

/**
 * Membuat paper session baru.
 */
export const create = mutation({
    args: {
        userId: v.id("users"),
        conversationId: v.id("conversations"),
        initialIdea: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        // Check if session already exists for this conversation
        const existing = await ctx.db
            .query("paperSessions")
            .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
            .unique();

        if (existing) return existing._id;

        return await ctx.db.insert("paperSessions", {
            userId: args.userId,
            conversationId: args.conversationId,
            currentStage: "gagasan",
            stageStatus: "drafting",
            stageData: {
                gagasan: args.initialIdea ? {
                    ideKasar: args.initialIdea,
                    revisionCount: 0,
                } : undefined,
            },
            createdAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Mengupdate data untuk tahap saat ini.
 */
export const updateStageData = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        stage: v.string(),
        data: v.any(), // Partial of the stage data (flexible for different stages)
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.currentStage !== args.stage) {
            throw new Error(`Cannot update ${args.stage} while in ${session.currentStage}`);
        }

        const now = Date.now();
        const stageKey = args.stage;
        const stageDataObj = session.stageData as Record<string, Record<string, unknown>>;
        const existingStageData = stageDataObj[stageKey] || {};

        const updatedStageData = {
            ...session.stageData,
            [stageKey]: {
                ...existingStageData,
                ...args.data,
            },
        };

        await ctx.db.patch(args.sessionId, {
            stageData: updatedStageData,
            updatedAt: now,
        });
    },
});

/**
 * Submit draf tahap saat ini untuk validasi user.
 */
export const submitForValidation = mutation({
    args: { sessionId: v.id("paperSessions") },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");

        await ctx.db.patch(args.sessionId, {
            stageStatus: "pending_validation",
            updatedAt: Date.now(),
        });
    },
});

/**
 * User menyetujui tahap saat ini dan lanjut ke tahap berikutnya.
 */
export const approveStage = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");
        if (session.stageStatus !== "pending_validation") {
            throw new Error("Stage is not pending validation");
        }

        const now = Date.now();
        const currentStage = session.currentStage as PaperStageId;

        // Mark current stage validated
        const updatedStageData = { ...session.stageData } as Record<string, Record<string, unknown>>;
        if (updatedStageData[currentStage]) {
            updatedStageData[currentStage] = {
                ...updatedStageData[currentStage],
                validatedAt: now,
            };
        }

        const nextStage = getNextStage(currentStage);

        const patchData: Record<string, unknown> = {
            currentStage: nextStage,
            stageStatus: nextStage === "completed" ? "approved" : "drafting",
            stageData: updatedStageData,
            updatedAt: now,
            ...(nextStage === "completed" ? { completedAt: now } : {}),
        };

        if (currentStage === "judul") {
            const judulData = updatedStageData.judul;
            const judulTerpilih = judulData?.judulTerpilih;
            if (typeof judulTerpilih === "string" && judulTerpilih.trim().length > 0) {
                patchData.paperTitle = judulTerpilih;
            }
        }

        await ctx.db.patch(args.sessionId, patchData);

        return {
            previousStage: currentStage,
            nextStage,
            isCompleted: nextStage === "completed",
        };
    },
});

/**
 * User meminta revisi untuk tahap saat ini.
 */
export const requestRevision = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
        feedback: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        const now = Date.now();
        const currentStage = session.currentStage;

        const updatedStageData = { ...session.stageData } as Record<string, Record<string, unknown>>;
        const stageData = updatedStageData[currentStage] || { revisionCount: 0 };

        const currentRevisionCount = typeof stageData.revisionCount === 'number' ? stageData.revisionCount : 0;
        updatedStageData[currentStage] = {
            ...stageData,
            revisionCount: currentRevisionCount + 1,
        };

        await ctx.db.patch(args.sessionId, {
            stageStatus: "revision",
            stageData: updatedStageData,
            updatedAt: now,
        });

        return {
            stage: currentStage,
            revisionCount: updatedStageData[currentStage].revisionCount,
        };
    },
});

// ═══════════════════════════════════════════════════════════
// SESSION MANAGEMENT MUTATIONS (Phase 5)
// ═══════════════════════════════════════════════════════════

/**
 * Archive paper session (soft delete).
 * Sets archivedAt timestamp.
 */
export const archiveSession = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        const now = Date.now();
        await ctx.db.patch(args.sessionId, {
            archivedAt: now,
            updatedAt: now,
        });

        return { success: true, archivedAt: now };
    },
});

/**
 * Unarchive paper session.
 * Clears archivedAt timestamp.
 */
export const unarchiveSession = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        await ctx.db.patch(args.sessionId, {
            archivedAt: undefined,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

/**
 * Delete paper session (hard delete).
 * Also deletes related conversation and its messages via cascade.
 */
export const deleteSession = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        const conversationId = session.conversationId;

        // Delete all messages in conversation
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect();

        for (const message of messages) {
            await ctx.db.delete(message._id);
        }

        // Delete all artifacts in conversation
        const artifacts = await ctx.db
            .query("artifacts")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect();

        for (const artifact of artifacts) {
            await ctx.db.delete(artifact._id);
        }

        // Delete all files in conversation
        const files = await ctx.db
            .query("files")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .collect();

        for (const file of files) {
            await ctx.db.delete(file._id);
        }

        // Delete the conversation itself
        await ctx.db.delete(conversationId);

        // Finally, delete the paper session
        await ctx.db.delete(args.sessionId);

        return { success: true };
    },
});

/**
 * Sync judulTerpilih dari stageData.judul ke paperTitle.
 * Fulfills Phase 4 promise from finalization.ts:242.
 */
export const syncPaperTitle = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        // Extract judulTerpilih from stageData.judul
        const stageData = session.stageData as Record<string, Record<string, unknown>>;
        const judulData = stageData.judul;
        const judulTerpilih = judulData?.judulTerpilih as string | undefined;

        if (!judulTerpilih) {
            return { success: false, reason: "No judulTerpilih found in stageData.judul" };
        }

        await ctx.db.patch(args.sessionId, {
            paperTitle: judulTerpilih,
            updatedAt: Date.now(),
        });

        return { success: true, paperTitle: judulTerpilih };
    },
});

/**
 * Update paper title manually.
 */
export const updatePaperTitle = mutation({
    args: {
        sessionId: v.id("paperSessions"),
        userId: v.id("users"),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");
        if (session.userId !== args.userId) throw new Error("Unauthorized");

        await ctx.db.patch(args.sessionId, {
            paperTitle: args.title,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});
