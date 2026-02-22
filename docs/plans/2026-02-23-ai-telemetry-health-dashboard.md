# AI Telemetry & Health Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add real-time AI provider and tool health monitoring with telemetry logging, aggregation dashboard at `/ai-ops`, and visual report at `/dashboard`.

**Architecture:** Every AI call in `route.ts` logs a fire-and-forget telemetry record to Convex `aiTelemetry` table. Aggregation queries compute metrics (success rate, latency, failover). Dashboard panels at `/ai-ops` show technical detail; admin overview at `/dashboard` shows visual report with charts in Indonesian.

**Tech Stack:** Convex (schema, queries, mutations, crons), Next.js API route instrumentation, React components with pure CSS/SVG charts, Iconoir icons.

**Design Doc:** `docs/plans/2026-02-23-ai-telemetry-health-dashboard-design.md`

---

### Task 1: Add `aiTelemetry` Table to Schema

**Files:**
- Modify: `convex/schema.ts` (add table definition after `appConfig` table, before CMS tables ~line 930)

**Step 1: Add aiTelemetry table definition**

Insert after the `appConfig` table definition (line 929) and before the CMS comment (line 931):

```typescript
  // ════════════════════════════════════════════════════════════════
  // AI Telemetry - Provider and tool health monitoring
  // ════════════════════════════════════════════════════════════════
  aiTelemetry: defineTable({
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),

    // Provider info
    provider: v.union(v.literal("vercel-gateway"), v.literal("openrouter")),
    model: v.string(),
    isPrimaryProvider: v.boolean(),
    failoverUsed: v.boolean(),

    // Tool info
    toolUsed: v.optional(v.string()),
    mode: v.union(v.literal("normal"), v.literal("websearch"), v.literal("paper")),

    // Result
    success: v.boolean(),
    errorType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),

    // Performance
    latencyMs: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_created", ["createdAt"])
    .index("by_provider", ["provider", "createdAt"])
    .index("by_tool", ["toolUsed", "createdAt"])
    .index("by_success", ["success", "createdAt"]),
```

**Step 2: Verify schema syncs**

Run: `npm run convex:dev` (should auto-sync)
Expected: No errors, new `aiTelemetry` table visible in Convex dashboard

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(telemetry): add aiTelemetry table schema for AI health monitoring"
```

---

### Task 2: Create Convex Backend — `convex/aiTelemetry.ts`

**Files:**
- Create: `convex/aiTelemetry.ts`

**Step 1: Create the backend file with mutation and all queries**

```typescript
import { v } from "convex/values"
import { mutation, query, internalMutation } from "./_generated/server"

// ════════════════════════════════════════════════════════════════
// Helpers
// ════════════════════════════════════════════════════════════════

const periodToMs = (period: "1h" | "24h" | "7d"): number => {
  switch (period) {
    case "1h": return 60 * 60 * 1000
    case "24h": return 24 * 60 * 60 * 1000
    case "7d": return 7 * 24 * 60 * 60 * 1000
  }
}

const classifyErrorType = (error: string): string => {
  const lower = error.toLowerCase()
  if (lower.includes("timeout") || lower.includes("timed out")) return "timeout"
  if (lower.includes("429") || lower.includes("rate limit") || lower.includes("rate_limit")) return "rate_limit"
  if (lower.includes("401") || lower.includes("403") || lower.includes("unauthorized") || lower.includes("api key")) return "auth"
  if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("fetch failed")) return "network"
  if (lower.includes("500") || lower.includes("502") || lower.includes("503")) return "server_error"
  return "api_error"
}

// Re-export classifyErrorType for use in telemetry helper
export { classifyErrorType }

// ════════════════════════════════════════════════════════════════
// Mutation: Log telemetry event
// ════════════════════════════════════════════════════════════════

export const log = mutation({
  args: {
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    provider: v.union(v.literal("vercel-gateway"), v.literal("openrouter")),
    model: v.string(),
    isPrimaryProvider: v.boolean(),
    failoverUsed: v.boolean(),
    toolUsed: v.optional(v.string()),
    mode: v.union(v.literal("normal"), v.literal("websearch"), v.literal("paper")),
    success: v.boolean(),
    errorType: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    latencyMs: v.number(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("aiTelemetry", {
      ...args,
      createdAt: Date.now(),
    })
  },
})

// ════════════════════════════════════════════════════════════════
// Query: Overview stats (headline numbers)
// ════════════════════════════════════════════════════════════════

export const getOverviewStats = query({
  args: {
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d")),
  },
  handler: async (ctx, { period }) => {
    const cutoff = Date.now() - periodToMs(period)
    const records = await ctx.db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect()

    const total = records.length
    if (total === 0) {
      return {
        totalRequests: 0,
        successRate: 100,
        avgLatencyMs: 0,
        failoverCount: 0,
        failoverRate: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
      }
    }

    const successCount = records.filter((r) => r.success).length
    const failoverCount = records.filter((r) => r.failoverUsed).length
    const totalLatency = records.reduce((sum, r) => sum + r.latencyMs, 0)
    const totalInput = records.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0)
    const totalOutput = records.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0)

    return {
      totalRequests: total,
      successRate: Math.round((successCount / total) * 1000) / 10,
      avgLatencyMs: Math.round(totalLatency / total),
      failoverCount,
      failoverRate: Math.round((failoverCount / total) * 1000) / 10,
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
    }
  },
})

// ════════════════════════════════════════════════════════════════
// Query: Per-provider health
// ════════════════════════════════════════════════════════════════

export const getProviderHealth = query({
  args: {
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d")),
  },
  handler: async (ctx, { period }) => {
    const cutoff = Date.now() - periodToMs(period)
    const records = await ctx.db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect()

    const byProvider = new Map<string, typeof records>()
    for (const r of records) {
      const list = byProvider.get(r.provider) ?? []
      list.push(r)
      byProvider.set(r.provider, list)
    }

    return Array.from(byProvider.entries()).map(([provider, items]) => {
      const successCount = items.filter((r) => r.success).length
      const totalLatency = items.reduce((sum, r) => sum + r.latencyMs, 0)
      return {
        provider,
        totalRequests: items.length,
        successCount,
        failureCount: items.length - successCount,
        successRate: items.length > 0 ? Math.round((successCount / items.length) * 1000) / 10 : 100,
        avgLatencyMs: items.length > 0 ? Math.round(totalLatency / items.length) : 0,
      }
    })
  },
})

// ════════════════════════════════════════════════════════════════
// Query: Per-tool health
// ════════════════════════════════════════════════════════════════

export const getToolHealth = query({
  args: {
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d")),
  },
  handler: async (ctx, { period }) => {
    const cutoff = Date.now() - periodToMs(period)
    const records = await ctx.db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect()

    const byTool = new Map<string, typeof records>()
    for (const r of records) {
      const key = r.toolUsed ?? "(chat biasa)"
      const list = byTool.get(key) ?? []
      list.push(r)
      byTool.set(key, list)
    }

    return Array.from(byTool.entries()).map(([tool, items]) => {
      const successCount = items.filter((r) => r.success).length
      const totalLatency = items.reduce((sum, r) => sum + r.latencyMs, 0)
      const failures = items.filter((r) => !r.success)
      const lastFailure = failures.length > 0
        ? failures.sort((a, b) => b.createdAt - a.createdAt)[0]
        : null

      return {
        tool,
        totalCalls: items.length,
        successCount,
        failureCount: items.length - successCount,
        successRate: items.length > 0 ? Math.round((successCount / items.length) * 1000) / 10 : 100,
        avgLatencyMs: items.length > 0 ? Math.round(totalLatency / items.length) : 0,
        lastFailure: lastFailure
          ? {
              errorType: lastFailure.errorType ?? "unknown",
              errorMessage: lastFailure.errorMessage ?? "",
              createdAt: lastFailure.createdAt,
            }
          : null,
      }
    })
  },
})

// ════════════════════════════════════════════════════════════════
// Query: Latency distribution
// ════════════════════════════════════════════════════════════════

export const getLatencyDistribution = query({
  args: {
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d")),
  },
  handler: async (ctx, { period }) => {
    const cutoff = Date.now() - periodToMs(period)
    const records = await ctx.db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect()

    const latencies = records.map((r) => r.latencyMs).sort((a, b) => a - b)

    if (latencies.length === 0) {
      return {
        p50: 0, p75: 0, p95: 0, p99: 0, max: 0,
        buckets: [
          { range: "0-500ms", count: 0 },
          { range: "500ms-1d", count: 0 },
          { range: "1-2d", count: 0 },
          { range: "2-5d", count: 0 },
          { range: "5d+", count: 0 },
        ],
      }
    }

    const percentile = (arr: number[], p: number) => {
      const idx = Math.ceil((p / 100) * arr.length) - 1
      return arr[Math.max(0, idx)]
    }

    return {
      p50: percentile(latencies, 50),
      p75: percentile(latencies, 75),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      max: latencies[latencies.length - 1],
      buckets: [
        { range: "0-500ms", count: latencies.filter((l) => l < 500).length },
        { range: "500ms-1d", count: latencies.filter((l) => l >= 500 && l < 1000).length },
        { range: "1-2d", count: latencies.filter((l) => l >= 1000 && l < 2000).length },
        { range: "2-5d", count: latencies.filter((l) => l >= 2000 && l < 5000).length },
        { range: "5d+", count: latencies.filter((l) => l >= 5000).length },
      ],
    }
  },
})

// ════════════════════════════════════════════════════════════════
// Query: Recent failures
// ════════════════════════════════════════════════════════════════

export const getRecentFailures = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { limit }) => {
    const maxItems = limit ?? 20
    const records = await ctx.db
      .query("aiTelemetry")
      .withIndex("by_success", (q) => q.eq("success", false))
      .order("desc")
      .take(maxItems)

    return records.map((r) => ({
      provider: r.provider,
      model: r.model,
      toolUsed: r.toolUsed ?? null,
      mode: r.mode,
      errorType: r.errorType ?? "unknown",
      errorMessage: r.errorMessage ?? "",
      failoverUsed: r.failoverUsed,
      latencyMs: r.latencyMs,
      createdAt: r.createdAt,
    }))
  },
})

// ════════════════════════════════════════════════════════════════
// Query: Failover timeline
// ════════════════════════════════════════════════════════════════

export const getFailoverTimeline = query({
  args: {
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d")),
  },
  handler: async (ctx, { period }) => {
    const cutoff = Date.now() - periodToMs(period)
    const records = await ctx.db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect()

    return records
      .filter((r) => r.failoverUsed)
      .map((r) => ({
        createdAt: r.createdAt,
        provider: r.provider,
        model: r.model,
        errorType: r.errorType ?? "unknown",
        latencyMs: r.latencyMs,
      }))
      .sort((a, b) => a.createdAt - b.createdAt)
  },
})

// ════════════════════════════════════════════════════════════════
// Query: Dashboard report (combined for admin overview)
// ════════════════════════════════════════════════════════════════

export const getDashboardReport = query({
  args: {},
  handler: async (ctx) => {
    const cutoff7d = Date.now() - 7 * 24 * 60 * 60 * 1000
    const records = await ctx.db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff7d))
      .collect()

    const total = records.length
    const successCount = records.filter((r) => r.success).length
    const failoverCount = records.filter((r) => r.failoverUsed).length
    const failovers = records.filter((r) => r.failoverUsed)

    // Daily success rates for sparkline (7 days)
    const dailyRates: { date: string; rate: number; total: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date()
      dayStart.setHours(0, 0, 0, 0)
      dayStart.setDate(dayStart.getDate() - i)
      const dayEnd = new Date(dayStart)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const dayRecords = records.filter(
        (r) => r.createdAt >= dayStart.getTime() && r.createdAt < dayEnd.getTime()
      )
      const daySuccess = dayRecords.filter((r) => r.success).length
      dailyRates.push({
        date: dayStart.toISOString().slice(0, 10),
        rate: dayRecords.length > 0 ? Math.round((daySuccess / dayRecords.length) * 1000) / 10 : 100,
        total: dayRecords.length,
      })
    }

    // Latency tiers
    const latencies = records.map((r) => r.latencyMs)
    const avgLatency = latencies.length > 0
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0
    const fastCount = latencies.filter((l) => l < 1000).length
    const mediumCount = latencies.filter((l) => l >= 1000 && l < 3000).length
    const slowCount = latencies.filter((l) => l >= 3000).length
    const minLatency = latencies.length > 0 ? Math.min(...latencies) : 0
    const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0

    // Tool health groups
    const toolGroups: Record<string, { total: number; failures: number }> = {}
    for (const r of records) {
      const key = r.toolUsed === "google_search"
        ? "Pencarian Web"
        : r.mode === "paper"
          ? "Penulisan Paper"
          : "Obrolan Biasa"
      if (!toolGroups[key]) toolGroups[key] = { total: 0, failures: 0 }
      toolGroups[key].total++
      if (!r.success) toolGroups[key].failures++
    }

    // Failover causes
    const failoverCauses: Record<string, number> = {}
    for (const f of failovers) {
      const cause = f.errorType ?? "unknown"
      failoverCauses[cause] = (failoverCauses[cause] ?? 0) + 1
    }
    const failoverAllSuccess = failovers.every((f) => f.success)

    return {
      totalRequests: total,
      successRate: total > 0 ? Math.round((successCount / total) * 1000) / 10 : 100,
      failureCount: total - successCount,
      dailyRates,
      avgLatencyMs: avgLatency,
      minLatencyMs: minLatency,
      maxLatencyMs: maxLatency,
      latencyTiers: { fast: fastCount, medium: mediumCount, slow: slowCount },
      toolGroups: Object.entries(toolGroups).map(([name, data]) => ({
        name,
        total: data.total,
        failures: data.failures,
        successRate: data.total > 0 ? Math.round(((data.total - data.failures) / data.total) * 1000) / 10 : 100,
      })),
      failoverCount,
      failoverCauses: Object.entries(failoverCauses)
        .map(([cause, count]) => ({ cause, count }))
        .sort((a, b) => b.count - a.count),
      failoverAllSuccess,
      failoverTimeline: failovers.map((f) => ({
        createdAt: f.createdAt,
        errorType: f.errorType ?? "unknown",
      })).sort((a, b) => a.createdAt - b.createdAt),
    }
  },
})

// ════════════════════════════════════════════════════════════════
// Internal: Cleanup old telemetry (called by cron)
// ════════════════════════════════════════════════════════════════

export const cleanupOldTelemetry = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days
    const oldRecords = await ctx.db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.lt("createdAt", cutoff))
      .take(200)

    let deleted = 0
    for (const record of oldRecords) {
      await ctx.db.delete(record._id)
      deleted++
    }

    if (deleted > 0) {
      console.log(`[aiTelemetry] Cleaned up ${deleted} records older than 30 days`)
    }
  },
})
```

**Step 2: Verify Convex syncs without error**

Run: `npm run convex:dev`
Expected: New functions available in Convex dashboard

**Step 3: Commit**

```bash
git add convex/aiTelemetry.ts
git commit -m "feat(telemetry): add aiTelemetry backend with mutations, queries, and cleanup"
```

---

### Task 3: Add Cleanup Cron Job

**Files:**
- Modify: `convex/crons.ts` (add daily cleanup job)

**Step 1: Add cron schedule**

Add after the existing `check-expired-subscriptions` cron (line 11):

```typescript
// Cleanup old AI telemetry records (older than 30 days) daily at 03:00 WIB (20:00 UTC)
crons.daily(
  "cleanup-old-ai-telemetry",
  { hourUTC: 20, minuteUTC: 0 },
  internal.aiTelemetry.cleanupOldTelemetry
)
```

**Step 2: Verify cron registers**

Run: `npm run convex:dev`
Expected: Cron visible in Convex dashboard under Scheduled Functions

**Step 3: Commit**

```bash
git add convex/crons.ts
git commit -m "feat(telemetry): add daily cleanup cron for aiTelemetry (30d retention)"
```

---

### Task 4: Create Telemetry Helper — `src/lib/ai/telemetry.ts`

**Files:**
- Create: `src/lib/ai/telemetry.ts`

**Step 1: Create the fire-and-forget helper**

```typescript
import { fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

type TelemetryParams = {
  token: string
  userId: Id<"users">
  conversationId?: Id<"conversations">
  provider: "vercel-gateway" | "openrouter"
  model: string
  isPrimaryProvider: boolean
  failoverUsed: boolean
  toolUsed?: string
  mode: "normal" | "websearch" | "paper"
  success: boolean
  errorType?: string
  errorMessage?: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
}

/**
 * Classify error string into a standard error type category.
 */
export function classifyError(error: unknown): { errorType: string; errorMessage: string } {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  let errorType = "api_error"
  if (lower.includes("timeout") || lower.includes("timed out")) errorType = "timeout"
  else if (lower.includes("429") || lower.includes("rate limit") || lower.includes("rate_limit")) errorType = "rate_limit"
  else if (lower.includes("401") || lower.includes("403") || lower.includes("unauthorized") || lower.includes("api key")) errorType = "auth"
  else if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("fetch failed")) errorType = "network"
  else if (lower.includes("500") || lower.includes("502") || lower.includes("503")) errorType = "server_error"

  return {
    errorType,
    errorMessage: message.slice(0, 200), // Truncate to 200 chars
  }
}

/**
 * Fire-and-forget telemetry logger.
 * NEVER awaited — must not block or crash the chat response.
 */
export function logAiTelemetry(params: TelemetryParams): void {
  const { token, ...args } = params

  fetchMutation(api.aiTelemetry.log, args, { token })
    .catch((err) => {
      console.error("[Telemetry] Failed to log:", err)
    })
}
```

**Step 2: Commit**

```bash
git add src/lib/ai/telemetry.ts
git commit -m "feat(telemetry): add fire-and-forget telemetry logger helper"
```

---

### Task 5: Instrument Chat API Route

**Files:**
- Modify: `src/app/api/chat/route.ts`

This is the most critical task. We instrument 4 points in the existing route.

**Step 1: Add import at top of file (after existing imports, ~line 41)**

```typescript
import { logAiTelemetry, classifyError } from "@/lib/ai/telemetry"
```

**Step 2: Add telemetry start timestamp (before the try block at ~line 1091)**

Insert before `try {` at line 1091:

```typescript
        // ════════════════════════════════════════════════════════════════
        // TELEMETRY: Start timing
        // ════════════════════════════════════════════════════════════════
        const telemetryStartTime = Date.now()
        const telemetryMode: "normal" | "websearch" | "paper" = isPaperMode
            ? "paper"
            : "normal" // Will be updated to "websearch" if enableWebSearch is true
```

**Step 3: Add success telemetry in Gateway onFinish callback (~line 1289-1351)**

Inside the `onFinish` callback for the non-websearch gateway path, after the billing `recordUsageAfterOperation` call (~line 1337), add:

```typescript
                            // ═══ TELEMETRY: Log success ═══
                            logAiTelemetry({
                                token: convexToken,
                                userId: userId as Id<"users">,
                                conversationId: currentConversationId as Id<"conversations">,
                                provider: modelNames.primary.provider as "vercel-gateway" | "openrouter",
                                model: modelNames.primary.model,
                                isPrimaryProvider: true,
                                failoverUsed: false,
                                toolUsed: undefined,
                                mode: telemetryMode,
                                success: true,
                                latencyMs: Date.now() - telemetryStartTime,
                                inputTokens: usage?.inputTokens,
                                outputTokens: usage?.outputTokens,
                            })
                            // ═══════════════════════════════
```

**Step 4: Add success telemetry for websearch gateway path**

In the websearch stream's `finish` handler (around the area where `saveAssistantMessage` is called for websearch, after the billing record call), add the same telemetry call but with:
- `toolUsed: "google_search"`
- `mode: "websearch"`

**Step 5: Add telemetry in fallback catch block (~line 1833)**

At the start of the catch block (line 1833), after the console.error, add:

```typescript
            // ═══ TELEMETRY: Log primary failure ═══
            const primaryErrorInfo = classifyError(error)
            logAiTelemetry({
                token: convexToken,
                userId: userId as Id<"users">,
                conversationId: currentConversationId as Id<"conversations">,
                provider: modelNames.primary.provider as "vercel-gateway" | "openrouter",
                model: modelNames.primary.model,
                isPrimaryProvider: true,
                failoverUsed: false,
                toolUsed: enableWebSearch ? "google_search" : undefined,
                mode: enableWebSearch ? "websearch" : (isPaperMode ? "paper" : "normal"),
                success: false,
                errorType: primaryErrorInfo.errorType,
                errorMessage: primaryErrorInfo.errorMessage,
                latencyMs: Date.now() - telemetryStartTime,
            })
            // ═══════════════════════════════════════
```

**Step 6: Add success telemetry in fallback onFinish callbacks**

In `runFallbackWithoutSearch` onFinish (~line 1860) and the web-search fallback onFinish, add telemetry logging with:
- `isPrimaryProvider: false`
- `failoverUsed: true`
- `success: true`

**Step 7: Verify build passes**

Run: `npm run build`
Expected: No TypeScript errors

**Step 8: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "feat(telemetry): instrument chat API route with telemetry logging at 4 points"
```

---

### Task 6: Create AI Ops Dashboard — `ModelHealthSection`

**Files:**
- Create: `src/components/ai-ops/ModelHealthSection.tsx`
- Create: `src/components/ai-ops/panels/OverviewStatsPanel.tsx`
- Create: `src/components/ai-ops/panels/ProviderHealthPanel.tsx`
- Create: `src/components/ai-ops/panels/ToolHealthPanel.tsx`
- Create: `src/components/ai-ops/panels/LatencyDistributionPanel.tsx`
- Create: `src/components/ai-ops/panels/RecentFailuresPanel.tsx`
- Create: `src/components/ai-ops/panels/FailoverTimelinePanel.tsx`
- Modify: `src/components/ai-ops/AiOpsContainer.tsx` (add ModelHealthSection)

**Step 1: Create ModelHealthSection container**

Create `src/components/ai-ops/ModelHealthSection.tsx` — a container that:
- Manages `period` state (`"1h" | "24h" | "7d"`, default `"24h"`)
- Fetches all 6 queries from `api.aiTelemetry.*` with the selected period
- Renders period toggle buttons and all 6 child panels
- Header: satellite-dish icon + "MODEL & TOOL HEALTH" title + subtitle

Design system: `rounded-action` toggle buttons, active state `bg-primary text-primary-foreground`, Iconoir `AntennaSignal` icon.

**Step 2: Create OverviewStatsPanel**

4 cards in a grid: Total Permintaan, Tingkat Keberhasilan, Rata-rata Latensi, Perpindahan Server.
- Color coding: success ≥95% green, <95% yellow, <80% red
- All numbers in `font-mono`

**Step 3: Create ProviderHealthPanel**

Row per provider showing: name, request count, success rate badge, avg latency.

**Step 4: Create ToolHealthPanel**

Table with rows per tool. Last failure expandable. Tool name mapped to Indonesian labels.

**Step 5: Create LatencyDistributionPanel**

Percentile numbers (p50, p95, p99) + horizontal bar chart (pure CSS with Tailwind `w-[%]`).

**Step 6: Create RecentFailuresPanel**

List of last 20 failures, each showing: tool, error type, provider, failover status, timestamp relative.

**Step 7: Create FailoverTimelinePanel**

Simple dot timeline using flex layout. Cluster detection text.

**Step 8: Integrate into AiOpsContainer**

In `src/components/ai-ops/AiOpsContainer.tsx`, add after `SessionListPanel` (line 59):

```tsx
      {/* Section Divider */}
      <div className="my-10 border-t border-hairline" />

      {/* Model & Tool Health */}
      <ModelHealthSection />
```

Add import: `import { ModelHealthSection } from "./ModelHealthSection"`

**Step 9: Verify in browser**

Run: `npm run dev`
Navigate to `/ai-ops`
Expected: New section visible below existing panels (empty state if no telemetry data yet)

**Step 10: Commit**

```bash
git add src/components/ai-ops/
git commit -m "feat(telemetry): add Model & Tool Health section to AI Ops dashboard"
```

---

### Task 7: Create Admin Dashboard Report — `AiPerformanceReport`

**Files:**
- Create: `src/components/admin/AiPerformanceReport.tsx`
- Create: `src/components/admin/charts/SuccessRateChart.tsx`
- Create: `src/components/admin/charts/LatencyOverviewChart.tsx`
- Create: `src/components/admin/charts/ToolHealthBars.tsx`
- Create: `src/components/admin/charts/FailoverTimeline.tsx`
- Create: `src/components/admin/charts/AiSummaryNarrative.tsx`
- Modify: `src/components/admin/AdminOverviewContent.tsx`

**Step 1: Create AiPerformanceReport container**

Uses single `useQuery(api.aiTelemetry.getDashboardReport)`. Renders 4 chart panels + summary narrative. Header: "LAPORAN KINERJA AI — 7 HARI TERAKHIR". Link to AI Ops at bottom.

**Step 2: Create SuccessRateChart**

SVG sparkline (7 data points from `dailyRates`). Big number for overall success rate. Subtitle: "X permintaan, Y gagal".

Pure SVG: `<svg viewBox>` with `<polyline>` for the line, `<circle>` for data points.

**Step 3: Create LatencyOverviewChart**

Big number "rata-rata X detik". Three horizontal bars: cepat (<1d), sedang (1-3d), lambat (3d+). Footer: tercepat/terlambat.

Pure CSS bars with Tailwind `w-[%]` and `bg-emerald-500/bg-amber-500/bg-rose-500`.

**Step 4: Create ToolHealthBars**

Per tool group: name + progress bar + "X dari Y gagal" text. Progress bar color: ≥95% green, <95% yellow, <80% red.

**Step 5: Create FailoverTimeline**

Count + dot timeline + top causes list + "server cadangan: semua berhasil ✓" status.

**Step 6: Create AiSummaryNarrative**

Auto-generated Indonesian paragraph based on thresholds:
- successRate ≥99: "Sistem AI berjalan sangat baik..."
- successRate ≥95: "Sistem AI berjalan baik secara keseluruhan..."
- successRate ≥80: "Sistem AI mengalami beberapa gangguan..."
- successRate <80: "Sistem AI mengalami gangguan serius..."

Plus tool-specific, failover, and latency context sentences.

**Step 7: Integrate into AdminOverviewContent**

In `src/components/admin/AdminOverviewContent.tsx`, add `AiPerformanceReport` between the "AI OPS DASHBOARD" card (line 125) and the "Pengguna Berdasarkan Role" section (line 127):

```tsx
      {/* AI Performance Report */}
      <AiPerformanceReport />
```

Add import at top.

**Step 8: Verify in browser**

Navigate to `/dashboard`
Expected: Report section visible with charts (empty state if no data)

**Step 9: Commit**

```bash
git add src/components/admin/AiPerformanceReport.tsx src/components/admin/charts/ src/components/admin/AdminOverviewContent.tsx
git commit -m "feat(telemetry): add AI performance report with charts to admin dashboard"
```

---

### Task 8: Add Auto-Alert for Health Degradation

**Files:**
- Modify: `convex/aiTelemetry.ts` (add health check logic inside `log` mutation)

**Step 1: Add health check in log mutation**

Inside the `log` mutation handler, after the `ctx.db.insert`, add a check that runs every 50th record:

```typescript
    // Health check: every 50th record, check failure rate
    const recentCount = await ctx.db
      .query("aiTelemetry")
      .withIndex("by_created")
      .order("desc")
      .take(1)

    // Use a simple modulo check based on total count
    // This is approximate but avoids expensive full-table counts
    if (recentCount.length > 0) {
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      const recentRecords = await ctx.db
        .query("aiTelemetry")
        .withIndex("by_created", (q) => q.gte("createdAt", oneHourAgo))
        .collect()

      // Only check if we have at least 10 records in the last hour
      if (recentRecords.length >= 10 && recentRecords.length % 50 < 1) {
        const failures = recentRecords.filter((r) => !r.success).length
        const successRate = ((recentRecords.length - failures) / recentRecords.length) * 100

        if (successRate < 70) {
          await ctx.db.insert("systemAlerts", {
            alertType: "ai_health_critical",
            severity: "critical",
            message: `Tingkat keberhasilan AI hanya ${Math.round(successRate)}% dalam 1 jam terakhir (${failures} gagal dari ${recentRecords.length} permintaan)`,
            source: "ai-telemetry",
            resolved: false,
            metadata: { successRate: Math.round(successRate), failures, total: recentRecords.length },
            createdAt: Date.now(),
          })
        } else if (successRate < 90) {
          await ctx.db.insert("systemAlerts", {
            alertType: "ai_health_degraded",
            severity: "warning",
            message: `Tingkat keberhasilan AI turun ke ${Math.round(successRate)}% dalam 1 jam terakhir (${failures} gagal dari ${recentRecords.length} permintaan)`,
            source: "ai-telemetry",
            resolved: false,
            metadata: { successRate: Math.round(successRate), failures, total: recentRecords.length },
            createdAt: Date.now(),
          })
        }
      }
    }
```

**Step 2: Verify no build errors**

Run: `npm run build`

**Step 3: Commit**

```bash
git add convex/aiTelemetry.ts
git commit -m "feat(telemetry): add auto-alert when AI health degrades below threshold"
```

---

### Task 9: End-to-End Verification

**Step 1: Start dev servers**

```bash
npm run dev       # Terminal 1
npm run convex:dev # Terminal 2
```

**Step 2: Trigger a chat message**

Go to `/chat`, send any message. Check Convex dashboard → `aiTelemetry` table.
Expected: 1 new record with `success: true`, `provider`, `model`, `latencyMs` populated.

**Step 3: Verify AI Ops dashboard**

Go to `/ai-ops`, scroll to "MODEL & TOOL HEALTH".
Expected: Overview stats show 1 request, 100% success rate.

**Step 4: Verify Admin dashboard report**

Go to `/dashboard`.
Expected: "LAPORAN KINERJA AI" section visible with sparkline and summary text.

**Step 5: Trigger web search**

Send a message like "cari informasi terbaru tentang AI" in chat.
Expected: New telemetry record with `toolUsed: "google_search"`, `mode: "websearch"`.

**Step 6: Verify tool health**

Go to `/ai-ops` → Tool Health panel.
Expected: `google_search` row visible with call count.

**Step 7: Commit final**

```bash
git commit --allow-empty -m "feat(telemetry): verify end-to-end AI health monitoring pipeline"
```
