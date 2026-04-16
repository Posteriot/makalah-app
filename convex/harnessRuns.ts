import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAuthUserId, requireConversationOwner, getConversationIfOwner } from "./authHelpers"

// ============================================================
// Agent Harness V1 — Phase 6 persistence: harnessRuns operations.
// Mirrors the `RunState` contract from the research doc:
//   .references/agent-harness/research/
//     2026-04-15-makalahapp-harness-v1-event-model-and-data-contracts.md
// paperSessions / artifacts / conversations / messages remain
// authoritative domain sources — these mutations persist runtime
// facts only (resume + telemetry).
// ============================================================

const runStatusValidator = v.union(
    v.literal("running"),
    v.literal("paused"),
    v.literal("failed"),
    v.literal("completed"),
    v.literal("aborted"),
)

const failureClassValidator = v.union(
    v.literal("entry_failure"),
    v.literal("state_failure"),
    v.literal("tool_failure"),
    v.literal("verification_failure"),
    v.literal("guard_failure"),
    v.literal("unexpected_failure"),
)

const policyStateValidator = v.object({
    approvalMode: v.union(v.literal("default"), v.literal("required_for_high_impact")),
    currentBoundary: v.union(v.literal("read_only"), v.literal("bounded_mutation"), v.literal("blocked")),
    pendingApprovalDecisionId: v.optional(v.string()),
    lastPolicyReason: v.optional(v.string()),
    updatedAt: v.number(),
})

// Fallback UUID v4 generator if crypto.randomUUID is unavailable at runtime.
function generateOwnerToken(): string {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

function mintOwnerToken(): string {
    try {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID()
        }
    } catch {
        // fall through to fallback
    }
    return generateOwnerToken()
}

export const createRun = mutation({
    args: {
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        paperSessionId: v.optional(v.id("paperSessions")),
        workflowStage: v.string(),
        workflowStatus: runStatusValidator,
    },
    handler: async (ctx, args) => {
        await requireConversationOwner(ctx, args.conversationId)
        await requireAuthUserId(ctx, args.userId)

        const now = Date.now()
        const ownerToken = mintOwnerToken()

        const runId = await ctx.db.insert("harnessRuns", {
            conversationId: args.conversationId,
            paperSessionId: args.paperSessionId,
            userId: args.userId,
            ownerToken,
            status: "running",
            workflowStage: args.workflowStage,
            workflowStatus: args.workflowStatus,
            stepNumber: 0,
            startedAt: now,
            updatedAt: now,
        })

        return { runId, ownerToken }
    },
})

export const updateRunStatus = mutation({
    args: {
        runId: v.id("harnessRuns"),
        status: runStatusValidator,
        workflowStatus: v.optional(runStatusValidator),
        pausedAt: v.optional(v.number()),
        failureClass: v.optional(failureClassValidator),
        failureReason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const run = await ctx.db.get(args.runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        const patch: Partial<typeof run> = { status: args.status, updatedAt: Date.now() }
        if (args.workflowStatus !== undefined) patch.workflowStatus = args.workflowStatus
        if (args.pausedAt !== undefined) patch.pausedAt = args.pausedAt
        if (args.failureClass !== undefined) patch.failureClass = args.failureClass
        if (args.failureReason !== undefined) patch.failureReason = args.failureReason

        await ctx.db.patch(args.runId, patch)
        return null
    },
})

export const linkPaperSession = mutation({
    args: {
        runId: v.id("harnessRuns"),
        paperSessionId: v.id("paperSessions"),
    },
    handler: async (ctx, { runId, paperSessionId }) => {
        const run = await ctx.db.get(runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        await ctx.db.patch(runId, { paperSessionId, updatedAt: Date.now() })
        return null
    },
})

export const recordPolicyState = mutation({
    args: {
        runId: v.id("harnessRuns"),
        policyState: policyStateValidator,
    },
    handler: async (ctx, { runId, policyState }) => {
        const run = await ctx.db.get(runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        await ctx.db.patch(runId, { policyState, updatedAt: Date.now() })
        return null
    },
})

// Atomic step counter increment — resolves BLOCKER B1.
// Convex mutations are serialized per document, so concurrent calls targeting
// the same runId queue server-side and each call reads the freshly-updated
// stepNumber value. Callers must rely on the returned stepNumber rather than
// computing it client-side.
export const incrementStepNumber = mutation({
    args: {
        runId: v.id("harnessRuns"),
    },
    handler: async (ctx, { runId }) => {
        const run = await ctx.db.get(runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        const nextStepNumber = run.stepNumber + 1
        await ctx.db.patch(runId, { stepNumber: nextStepNumber, updatedAt: Date.now() })
        return { stepNumber: nextStepNumber }
    },
})

export const setCurrentStep = mutation({
    args: {
        runId: v.id("harnessRuns"),
        stepId: v.id("harnessRunSteps"),
    },
    handler: async (ctx, { runId, stepId }) => {
        const run = await ctx.db.get(runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        await ctx.db.patch(runId, { currentStepId: stepId, updatedAt: Date.now() })
        return null
    },
})

// ------------------------------------------------------------------
// Atomic step-start (Phase 6 audit fix — HIGH 1).
// ------------------------------------------------------------------
// Collapses the legacy 3-call composition (incrementStepNumber →
// createStep → setCurrentStep) into a single mutation handler so the
// three writes live inside one Convex transaction:
//   1. Patch `harnessRuns.stepNumber` (bump + updatedAt).
//   2. Insert a `harnessRunSteps` row at the new index (status=running).
//   3. Patch `harnessRuns.currentStepId` to the new step id.
// Convex executes a mutation handler atomically: all `ctx.db` writes
// within a single handler invocation either commit together or not at
// all. That means this mutation gives all-or-nothing semantics for the
// full step-start — no more partial-write window where stepNumber got
// bumped but createStep failed (or currentStepId was never pointed at
// the fresh row), which was the root cause of orphaned "running" rows.
//
// Callers MUST use this mutation for new step creation. The legacy
// `incrementStepNumber` and `setCurrentStep` mutations are preserved
// above for backwards compatibility and explicit lifecycle control
// (e.g., resume flows that want to re-point currentStepId without
// inserting a row) but are no longer on the hot path.
export const startStepAtomic = mutation({
    args: { runId: v.id("harnessRuns") },
    handler: async (ctx, { runId }) => {
        const run = await ctx.db.get(runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)
        const now = Date.now()

        // 1. Atomically increment stepNumber.
        const nextStepNumber = run.stepNumber + 1
        await ctx.db.patch(runId, { stepNumber: nextStepNumber, updatedAt: now })

        // 2. Insert harnessRunSteps row at the new index.
        const stepId = await ctx.db.insert("harnessRunSteps", {
            runId,
            stepIndex: nextStepNumber,
            status: "running",
            toolCalls: [],
            startedAt: now,
        })

        // 3. Point the run at the new step.
        await ctx.db.patch(runId, { currentStepId: stepId, updatedAt: now })

        return { stepId, stepIndex: nextStepNumber }
    },
})

export const completeRun = mutation({
    args: {
        runId: v.id("harnessRuns"),
    },
    handler: async (ctx, { runId }) => {
        const run = await ctx.db.get(runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        const now = Date.now()
        await ctx.db.patch(runId, {
            status: "completed",
            completedAt: now,
            updatedAt: now,
        })
        return null
    },
})

// ────────────────────────────────────────────────────────────────
// Phase 8 — pause/resume mutations.
//
// pauseRun: called by the orchestrator after policy evaluation when
// requiresApproval is true. Takes a decisionId already minted by
// harnessDecisions.createDecision (adapter composes the two calls).
//
// resumeRun: called by the UI path AFTER harnessDecisions.resolveDecision
// has written the user response. Validates ownerToken as a strict
// ownership check (the resume entrypoint doubles as an auth barrier).
// ────────────────────────────────────────────────────────────────

export const pauseRun = mutation({
    args: {
        runId: v.id("harnessRuns"),
        reason: v.string(),
        decisionId: v.string(),
    },
    handler: async (ctx, { runId, reason, decisionId }) => {
        const run = await ctx.db.get(runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        if (run.status !== "running") {
            throw new Error(`cannot pause run with status=${run.status}`)
        }

        const now = Date.now()

        // Preserve existing policyState if present; stamp the pause reason
        // into lastPolicyReason so observability has a single surfaced cause.
        const nextPolicyState = run.policyState
            ? { ...run.policyState, lastPolicyReason: reason, updatedAt: now }
            : undefined

        const patch: Partial<typeof run> = {
            status: "paused",
            pendingDecisionId: decisionId,
            pausedAt: now,
            updatedAt: now,
        }
        if (nextPolicyState !== undefined) {
            patch.policyState = nextPolicyState
        }

        await ctx.db.patch(runId, patch)
        return null
    },
})

export const resumeRun = mutation({
    args: {
        runId: v.id("harnessRuns"),
        ownerToken: v.string(),
    },
    handler: async (ctx, { runId, ownerToken }) => {
        const run = await ctx.db.get(runId)
        if (run === null) throw new Error("harness run not found")
        await requireConversationOwner(ctx, run.conversationId)

        // Strict ownership check — resume is the sole re-entry point for a
        // paused run, so we double-check the token matches persistence.
        if (run.ownerToken !== ownerToken) {
            throw new Error("ownerToken mismatch")
        }

        if (run.status !== "paused") {
            throw new Error(`run is not paused (status=${run.status})`)
        }

        const now = Date.now()
        await ctx.db.patch(runId, {
            status: "running",
            pendingDecisionId: undefined,
            pausedAt: undefined,
            updatedAt: now,
        })
        return null
    },
})

export const getRunByConversation = query({
    args: {
        conversationId: v.id("conversations"),
        statusFilter: v.optional(runStatusValidator),
    },
    handler: async (ctx, { conversationId, statusFilter }) => {
        // Queries must be permissive — return null on missing auth/ownership
        // rather than throwing, so UI subscribers handle logout gracefully.
        const access = await getConversationIfOwner(ctx, conversationId)
        if (!access) return null

        const base = ctx.db
            .query("harnessRuns")
            .withIndex("by_conversation", (qb) => qb.eq("conversationId", conversationId))
            .order("desc")

        if (statusFilter !== undefined) {
            return await base.filter((fb) => fb.eq(fb.field("status"), statusFilter)).first()
        }
        return await base.first()
    },
})

// ownerToken is minted with crypto.randomUUID (or a v4 fallback) per run, so
// duplicates must never occur. `.unique()` will throw if they do — treat that
// as a data-integrity error rather than a lookup miss.
export const getRunByOwnerToken = query({
    args: {
        ownerToken: v.string(),
    },
    handler: async (ctx, { ownerToken }) => {
        const run = await ctx.db
            .query("harnessRuns")
            .withIndex("by_ownerToken", (q) => q.eq("ownerToken", ownerToken))
            .unique()

        if (run === null) return null

        const access = await getConversationIfOwner(ctx, run.conversationId)
        if (!access) return null

        return run
    },
})
