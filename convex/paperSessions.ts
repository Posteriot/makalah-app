import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getNextStage, PaperStageId } from "./paperSessions/constants";

// ═══════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════

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

        await ctx.db.patch(args.sessionId, {
            currentStage: nextStage,
            stageStatus: nextStage === "completed" ? "approved" : "drafting",
            stageData: updatedStageData,
            updatedAt: now,
            ...(nextStage === "completed" ? { completedAt: now } : {}),
        });

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
