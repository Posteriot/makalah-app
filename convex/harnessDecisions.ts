import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireConversationOwner, getConversationIfOwner } from "./authHelpers"

// ============================================================
// Agent Harness V1 — Phase 8 pause/resume mutations.
// Companion to `harnessRuns.ts` pauseRun/resumeRun. Persists the
// DecisionState contract (research doc lines 838-862) for decisions
// that block a run pending user input.
//
// Every decisionId is a stable semantic identifier (UUID) — NOT the
// Convex internal _id — so it can be surfaced in 202 responses,
// events (run_paused.payload.decisionId), and linking from UI.
// paperSessions / artifacts / conversations / messages remain
// untouched. This table mirrors runtime facts only.
// ============================================================

/**
 * Fallback UUID v4 generator using crypto.getRandomValues.
 * Prefer `crypto.randomUUID()` at call site; fall back here if
 * unavailable in the Convex runtime.
 */
function generateDecisionId(): string {
    try {
        return crypto.randomUUID()
    } catch {
        const bytes = new Uint8Array(16)
        crypto.getRandomValues(bytes)
        bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
        bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
}

const decisionTypeValidator = v.union(
    v.literal("clarification"),
    v.literal("approval"),
    v.literal("selection"),
)

const _decisionStatusValidator = v.union(
    v.literal("pending"),
    v.literal("resolved"),
    v.literal("declined"),
    v.literal("invalidated"),
)

const promptValidator = v.object({
    title: v.optional(v.string()),
    question: v.string(),
    options: v.optional(
        v.array(
            v.object({
                label: v.string(),
                description: v.optional(v.string()),
                recommended: v.optional(v.boolean()),
            }),
        ),
    ),
    allowsFreeform: v.optional(v.boolean()),
})

export const createDecision = mutation({
    args: {
        runId: v.id("harnessRuns"),
        type: decisionTypeValidator,
        blocking: v.boolean(),
        workflowStage: v.string(),
        prompt: promptValidator,
        decisionId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        const decisionId = args.decisionId ?? generateDecisionId()
        await ctx.db.insert("harnessDecisions", {
            decisionId,
            runId: args.runId,
            type: args.type,
            status: "pending",
            blocking: args.blocking,
            workflowStage: args.workflowStage,
            prompt: args.prompt,
            requestedAt: Date.now(),
        })

        return { decisionId }
    },
})

export const resolveDecision = mutation({
    args: {
        decisionId: v.string(),
        resolution: v.union(v.literal("resolved"), v.literal("declined")),
        response: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const row = await ctx.db
            .query("harnessDecisions")
            .withIndex("by_decisionId", (q) => q.eq("decisionId", args.decisionId))
            .unique()
        if (!row) throw new Error("harness decision not found")

        const run = await ctx.db.get(row.runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        if (row.status !== "pending") {
            throw new Error(`cannot resolve decision with status=${row.status}`)
        }

        const patch: Partial<typeof row> = {
            status: args.resolution,
            resolvedAt: Date.now(),
        }
        if (args.response !== undefined) {
            patch.response = args.response
        }

        await ctx.db.patch(row._id, patch)
        return null
    },
})

export const invalidateDecision = mutation({
    args: {
        decisionId: v.string(),
    },
    handler: async (ctx, { decisionId }) => {
        const row = await ctx.db
            .query("harnessDecisions")
            .withIndex("by_decisionId", (q) => q.eq("decisionId", decisionId))
            .unique()
        if (!row) throw new Error("harness decision not found")

        const run = await ctx.db.get(row.runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        // Invalidation is only meaningful for pending decisions; idempotent no-op otherwise.
        if (row.status !== "pending") return null

        await ctx.db.patch(row._id, {
            status: "invalidated",
            resolvedAt: Date.now(),
        })
        return null
    },
})

export const getDecision = query({
    args: {
        decisionId: v.string(),
    },
    handler: async (ctx, { decisionId }) => {
        const row = await ctx.db
            .query("harnessDecisions")
            .withIndex("by_decisionId", (q) => q.eq("decisionId", decisionId))
            .unique()
        if (!row) return null

        const run = await ctx.db.get(row.runId)
        if (run === null) return null
        const access = await getConversationIfOwner(ctx, run.conversationId)
        if (!access) return null

        return row
    },
})

export const getPendingByRun = query({
    args: {
        runId: v.id("harnessRuns"),
    },
    handler: async (ctx, { runId }) => {
        const run = await ctx.db.get(runId)
        if (run === null) return null
        const access = await getConversationIfOwner(ctx, run.conversationId)
        if (!access) return null

        return await ctx.db
            .query("harnessDecisions")
            .withIndex("by_run_status", (q) => q.eq("runId", runId).eq("status", "pending"))
            .order("desc")
            .first()
    },
})

export const getDecisionsByRun = query({
    args: {
        runId: v.id("harnessRuns"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { runId, limit }) => {
        const run = await ctx.db.get(runId)
        if (run === null) return []
        const access = await getConversationIfOwner(ctx, run.conversationId)
        if (!access) return []

        const query = ctx.db
            .query("harnessDecisions")
            .withIndex("by_run", (q) => q.eq("runId", runId))
            .order("desc")
        return limit !== undefined ? await query.take(limit) : await query.collect()
    },
})
