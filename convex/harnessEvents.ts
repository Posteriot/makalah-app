import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireConversationOwner, getConversationIfOwner } from "./authHelpers"

// ============================================================
// Agent Harness V1 — Phase 6 persistence: harnessEvents operations.
// Stores the 12-field event envelope from the research doc:
//   .references/agent-harness/research/
//     2026-04-15-makalahapp-harness-v1-event-model-and-data-contracts.md
// `eventType` is intentionally accepted as an arbitrary string here —
// canonical-name validation lives at the adapter layer (Task 6.2c note),
// not at the persistence boundary.
// ============================================================

// Fallback UUID v4 generator if crypto.randomUUID is unavailable at runtime.
function generateEventId(): string {
    try {
        if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
            return crypto.randomUUID()
        }
    } catch {
        // fall through to fallback
    }
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// Returns the resolved/generated `eventId` string (NOT the Convex `_id`)
// because consumers care about the dedupable identifier for correlation
// and causation chaining across adapters.
export const emitEvent = mutation({
    args: {
        eventId: v.optional(v.string()),
        eventType: v.string(),
        schemaVersion: v.optional(v.number()),
        occurredAt: v.optional(v.number()),
        userId: v.id("users"),
        sessionId: v.string(),
        chatId: v.id("conversations"),
        runId: v.optional(v.id("harnessRuns")),
        stepId: v.optional(v.id("harnessRunSteps")),
        correlationId: v.optional(v.string()),
        causationEventId: v.optional(v.string()),
        payload: v.any(),
    },
    handler: async (ctx, args) => {
        await requireConversationOwner(ctx, args.chatId)

        const eventId = args.eventId ?? generateEventId()
        const schemaVersion = args.schemaVersion ?? 1
        const occurredAt = args.occurredAt ?? Date.now()

        await ctx.db.insert("harnessEvents", {
            eventId,
            eventType: args.eventType,
            schemaVersion,
            occurredAt,
            userId: args.userId,
            sessionId: args.sessionId,
            chatId: args.chatId,
            runId: args.runId,
            stepId: args.stepId,
            correlationId: args.correlationId,
            causationEventId: args.causationEventId,
            payload: args.payload,
        })

        return { eventId }
    },
})

export const getEventsByRun = query({
    args: {
        runId: v.id("harnessRuns"),
        eventTypeFilter: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { runId, eventTypeFilter, limit }) => {
        // Queries must be permissive — return [] on missing auth/ownership
        // rather than throwing, so UI subscribers handle logout gracefully.
        const run = await ctx.db.get(runId)
        if (run === null) return []

        const access = await getConversationIfOwner(ctx, run.conversationId)
        if (!access) return []

        const base = ctx.db
            .query("harnessEvents")
            .withIndex("by_run_time", (q) => q.eq("runId", runId))
            .order("asc")

        const filtered =
            eventTypeFilter !== undefined
                ? base.filter((f) => f.eq(f.field("eventType"), eventTypeFilter))
                : base

        if (limit !== undefined) {
            return await filtered.take(limit)
        }
        return await filtered.collect()
    },
})

export const getEventsByCorrelation = query({
    args: {
        correlationId: v.string(),
    },
    handler: async (ctx, { correlationId }) => {
        const events = await ctx.db
            .query("harnessEvents")
            .withIndex("by_correlation", (q) => q.eq("correlationId", correlationId))
            .order("asc")
            .collect()

        if (events.length === 0) return []

        // All events in a correlation should share the same chatId, so
        // verifying ownership against the first result is sufficient.
        const access = await getConversationIfOwner(ctx, events[0].chatId)
        if (!access) return []

        return events
    },
})

// Debug/observability helper. Defaults to limit=100 to keep wire payloads
// bounded; latest-first because that's what dashboards typically want.
export const getEventsByChat = query({
    args: {
        chatId: v.id("conversations"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { chatId, limit }) => {
        const access = await getConversationIfOwner(ctx, chatId)
        if (!access) return []

        const effectiveLimit = limit ?? 100
        return await ctx.db
            .query("harnessEvents")
            .withIndex("by_chat_time", (q) => q.eq("chatId", chatId))
            .order("desc")
            .take(effectiveLimit)
    },
})
