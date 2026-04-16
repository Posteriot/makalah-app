import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireConversationOwner, getConversationIfOwner } from "./authHelpers"

// ============================================================
// Agent Harness V1 — Phase 6 persistence: harnessRunSteps operations.
// Companion to `harnessRuns.ts`. Persists per-step runtime facts
// (executor result summary, verification summary, tool calls).
// paperSessions / artifacts / conversations / messages remain
// authoritative domain sources — these mutations persist runtime
// telemetry only.
// ============================================================

const completedStepStatusValidator = v.union(
    v.literal("completed"),
    v.literal("failed"),
)

const executorResultSummaryValidator = v.object({
    finishReason: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
})

const verificationSummaryValidator = v.object({
    canContinue: v.boolean(),
    mustPause: v.boolean(),
    pauseReason: v.optional(v.string()),
    canComplete: v.boolean(),
    completionBlockers: v.array(v.string()),
    leakageDetected: v.boolean(),
    artifactChainComplete: v.boolean(),
    planComplete: v.boolean(),
    streamContentOverridden: v.boolean(),
})

const toolCallValidator = v.object({
    toolName: v.string(),
    toolCallId: v.optional(v.string()),
    resultStatus: v.optional(v.string()),
})

// Callers MUST obtain `stepIndex` from `api.harnessRuns.incrementStepNumber`
// to maintain per-run monotonicity. The two-mutation pattern (increment +
// create) is intentional — the Task 6.3 adapter composes them. This mutation
// does NOT enforce monotonicity; it accepts whatever index is provided so the
// composition stays explicit at the call site.
export const createStep = mutation({
    args: {
        runId: v.id("harnessRuns"),
        stepIndex: v.number(),
        startedAt: v.number(),
    },
    handler: async (ctx, { runId, stepIndex, startedAt }) => {
        const run = await ctx.db.get(runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        const stepId = await ctx.db.insert("harnessRunSteps", {
            runId,
            stepIndex,
            status: "running",
            toolCalls: [],
            startedAt,
        })

        return { stepId }
    },
})

export const completeStep = mutation({
    args: {
        stepId: v.id("harnessRunSteps"),
        status: completedStepStatusValidator,
        executorResultSummary: v.optional(executorResultSummaryValidator),
        verificationSummary: v.optional(verificationSummaryValidator),
        toolCalls: v.array(toolCallValidator),
        completedAt: v.number(),
    },
    handler: async (ctx, args) => {
        const step = await ctx.db.get(args.stepId)
        if (step === null) throw new Error("harness run step not found")

        const run = await ctx.db.get(step.runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        const patch: Partial<typeof step> = {
            status: args.status,
            toolCalls: args.toolCalls,
            completedAt: args.completedAt,
        }
        if (args.executorResultSummary !== undefined) {
            patch.executorResultSummary = args.executorResultSummary
        }
        if (args.verificationSummary !== undefined) {
            patch.verificationSummary = args.verificationSummary
        }

        await ctx.db.patch(args.stepId, patch)
        return null
    },
})

export const getStepsByRun = query({
    args: {
        runId: v.id("harnessRuns"),
    },
    handler: async (ctx, { runId }) => {
        // Queries must be permissive — return [] on missing auth/ownership
        // rather than throwing, so UI subscribers handle logout gracefully.
        const run = await ctx.db.get(runId)
        if (run === null) return []

        const access = await getConversationIfOwner(ctx, run.conversationId)
        if (!access) return []

        return await ctx.db
            .query("harnessRunSteps")
            .withIndex("by_run_step", (q) => q.eq("runId", runId))
            .order("asc")
            .collect()
    },
})

export const getCurrentStep = query({
    args: {
        runId: v.id("harnessRuns"),
    },
    handler: async (ctx, { runId }) => {
        const run = await ctx.db.get(runId)
        if (run === null) return null

        const access = await getConversationIfOwner(ctx, run.conversationId)
        if (!access) return null

        if (run.currentStepId === undefined) return null
        return await ctx.db.get(run.currentStepId)
    },
})
