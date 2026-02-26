import { mutation, query, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRole } from "./permissions"

// ============================================================================
// HELPERS
// ============================================================================

function periodToMs(period: "1h" | "24h" | "7d"): number {
  switch (period) {
    case "1h":
      return 60 * 60 * 1000
    case "24h":
      return 24 * 60 * 60 * 1000
    case "7d":
      return 7 * 24 * 60 * 60 * 1000
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.ceil((p / 100) * sorted.length) - 1
  return sorted[Math.max(0, idx)]
}

const periodValidator = v.union(v.literal("1h"), v.literal("24h"), v.literal("7d"))

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Log a telemetry record.
 * Called server-side from chat API — no auth guard needed.
 */
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
    skillResolverFallback: v.optional(v.boolean()),
  },
  handler: async ({ db }, args) => {
    const id = await db.insert("aiTelemetry", {
      ...args,
      createdAt: Date.now(),
    })

    // ── Health check: only on failures, 50% sample to limit cost ──
    if (!args.success && Math.random() < 0.5) {
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      const recentRecords = await db
        .query("aiTelemetry")
        .withIndex("by_created", (q) => q.gte("createdAt", oneHourAgo))
        .collect()

      if (recentRecords.length >= 10) {
        const failures = recentRecords.filter((r) => !r.success).length
        const successRate =
          ((recentRecords.length - failures) / recentRecords.length) * 100

        if (successRate < 70) {
          await db.insert("systemAlerts", {
            alertType: "ai_health_critical",
            severity: "critical",
            message: `Tingkat keberhasilan AI hanya ${Math.round(successRate)}% dalam 1 jam terakhir (${failures} gagal dari ${recentRecords.length} permintaan)`,
            source: "ai-telemetry",
            resolved: false,
            metadata: {
              successRate: Math.round(successRate),
              failures,
              total: recentRecords.length,
            },
            createdAt: Date.now(),
          })
        } else if (successRate < 90) {
          await db.insert("systemAlerts", {
            alertType: "ai_health_degraded",
            severity: "warning",
            message: `Tingkat keberhasilan AI turun ke ${Math.round(successRate)}% dalam 1 jam terakhir (${failures} gagal dari ${recentRecords.length} permintaan)`,
            source: "ai-telemetry",
            resolved: false,
            metadata: {
              successRate: Math.round(successRate),
              failures,
              total: recentRecords.length,
            },
            createdAt: Date.now(),
          })
        }
      }
    }

    return { id }
  },
})

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Overview stats for a given period.
 * Admin/superadmin only.
 */
export const getOverviewStats = query({
  args: {
    requestorUserId: v.id("users"),
    period: periodValidator,
  },
  handler: async ({ db }, { requestorUserId, period }) => {
    await requireRole(db, requestorUserId, "admin")

    const cutoff = Date.now() - periodToMs(period)
    const records = await db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect()

    const totalRequests = records.length
    const successCount = records.filter((r) => r.success).length
    const successRate = totalRequests > 0 ? successCount / totalRequests : 0
    const avgLatencyMs =
      totalRequests > 0
        ? records.reduce((sum, r) => sum + r.latencyMs, 0) / totalRequests
        : 0
    const failoverRecords = records.filter((r) => r.failoverUsed)
    const failoverCount = failoverRecords.length
    const failoverRate = totalRequests > 0 ? failoverCount / totalRequests : 0
    const totalInputTokens = records.reduce(
      (sum, r) => sum + (r.inputTokens ?? 0),
      0
    )
    const totalOutputTokens = records.reduce(
      (sum, r) => sum + (r.outputTokens ?? 0),
      0
    )

    return {
      totalRequests,
      successRate,
      avgLatencyMs,
      failoverCount,
      failoverRate,
      totalInputTokens,
      totalOutputTokens,
    }
  },
})

/**
 * Health stats grouped by provider.
 * Admin/superadmin only.
 */
export const getProviderHealth = query({
  args: {
    requestorUserId: v.id("users"),
    period: periodValidator,
  },
  handler: async ({ db }, { requestorUserId, period }) => {
    await requireRole(db, requestorUserId, "admin")

    const cutoff = Date.now() - periodToMs(period)
    const records = await db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect()

    const grouped = new Map<
      string,
      { total: number; success: number; failure: number; latencySum: number }
    >()

    for (const r of records) {
      const existing = grouped.get(r.provider) ?? {
        total: 0,
        success: 0,
        failure: 0,
        latencySum: 0,
      }
      existing.total++
      if (r.success) existing.success++
      else existing.failure++
      existing.latencySum += r.latencyMs
      grouped.set(r.provider, existing)
    }

    return Array.from(grouped.entries()).map(([provider, stats]) => ({
      provider,
      totalRequests: stats.total,
      successCount: stats.success,
      failureCount: stats.failure,
      successRate: stats.total > 0 ? stats.success / stats.total : 0,
      avgLatencyMs: stats.total > 0 ? stats.latencySum / stats.total : 0,
    }))
  },
})

/**
 * Health stats grouped by tool.
 * Admin/superadmin only.
 */
export const getToolHealth = query({
  args: {
    requestorUserId: v.id("users"),
    period: periodValidator,
  },
  handler: async ({ db }, { requestorUserId, period }) => {
    await requireRole(db, requestorUserId, "admin")

    const cutoff = Date.now() - periodToMs(period)
    const records = await db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect()

    const grouped = new Map<
      string,
      {
        total: number
        success: number
        failure: number
        latencySum: number
        lastFailure?: number
      }
    >()

    for (const r of records) {
      const key = r.toolUsed ?? "(chat biasa)"
      const existing = grouped.get(key) ?? {
        total: 0,
        success: 0,
        failure: 0,
        latencySum: 0,
      }
      existing.total++
      if (r.success) existing.success++
      else {
        existing.failure++
        if (
          !existing.lastFailure ||
          r.createdAt > existing.lastFailure
        ) {
          existing.lastFailure = r.createdAt
        }
      }
      existing.latencySum += r.latencyMs
      grouped.set(key, existing)
    }

    return Array.from(grouped.entries()).map(([tool, stats]) => ({
      tool,
      totalCalls: stats.total,
      successCount: stats.success,
      failureCount: stats.failure,
      successRate: stats.total > 0 ? stats.success / stats.total : 0,
      avgLatencyMs: stats.total > 0 ? stats.latencySum / stats.total : 0,
      ...(stats.lastFailure !== undefined
        ? { lastFailure: stats.lastFailure }
        : {}),
    }))
  },
})

/**
 * Latency distribution with percentiles and histogram buckets.
 * Admin/superadmin only.
 */
export const getLatencyDistribution = query({
  args: {
    requestorUserId: v.id("users"),
    period: periodValidator,
  },
  handler: async ({ db }, { requestorUserId, period }) => {
    await requireRole(db, requestorUserId, "admin")

    const cutoff = Date.now() - periodToMs(period)
    const records = await db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect()

    const latencies = records.map((r) => r.latencyMs).sort((a, b) => a - b)

    const buckets = [
      { label: "0-500ms", min: 0, max: 500, count: 0 },
      { label: "500ms-1s", min: 500, max: 1000, count: 0 },
      { label: "1-2s", min: 1000, max: 2000, count: 0 },
      { label: "2-5s", min: 2000, max: 5000, count: 0 },
      { label: "5s+", min: 5000, max: Infinity, count: 0 },
    ]

    for (const ms of latencies) {
      for (const bucket of buckets) {
        if (ms >= bucket.min && ms < bucket.max) {
          bucket.count++
          break
        }
      }
    }

    return {
      p50: percentile(latencies, 50),
      p75: percentile(latencies, 75),
      p95: percentile(latencies, 95),
      p99: percentile(latencies, 99),
      max: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
      buckets: buckets.map(({ label, count }) => ({ label, count })),
    }
  },
})

/**
 * Recent failure records.
 * Admin/superadmin only.
 */
export const getRecentFailures = query({
  args: {
    requestorUserId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async ({ db }, { requestorUserId, limit = 20 }) => {
    await requireRole(db, requestorUserId, "admin")

    const failures = await db
      .query("aiTelemetry")
      .withIndex("by_success", (q) => q.eq("success", false))
      .order("desc")
      .take(limit)

    return failures
  },
})

/**
 * Failover events within a period, sorted by time.
 * Admin/superadmin only.
 */
export const getFailoverTimeline = query({
  args: {
    requestorUserId: v.id("users"),
    period: periodValidator,
  },
  handler: async ({ db }, { requestorUserId, period }) => {
    await requireRole(db, requestorUserId, "admin")

    const cutoff = Date.now() - periodToMs(period)
    const records = await db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect()

    return records
      .filter((r) => r.failoverUsed)
      .sort((a, b) => a.createdAt - b.createdAt)
  },
})

/**
 * Combined dashboard report for admin panel.
 * Returns daily success rates (7 days), latency tiers, tool groups, failover info.
 * Admin/superadmin only.
 */
export const getDashboardReport = query({
  args: {
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { requestorUserId }) => {
    await requireRole(db, requestorUserId, "admin")

    const now = Date.now()
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000
    const records = await db
      .query("aiTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", sevenDaysAgo))
      .collect()

    // --- Daily success rates (7 days for sparkline) ---
    const dayMs = 24 * 60 * 60 * 1000
    const dailySuccessRates: { date: string; successRate: number; total: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = now - (i + 1) * dayMs
      const dayEnd = now - i * dayMs
      const dayRecords = records.filter(
        (r) => r.createdAt >= dayStart && r.createdAt < dayEnd
      )
      const total = dayRecords.length
      const success = dayRecords.filter((r) => r.success).length
      const d = new Date(dayStart)
      dailySuccessRates.push({
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        successRate: total > 0 ? success / total : 0,
        total,
      })
    }

    // --- Top-level aggregates ---
    const totalRequests = records.length
    const successCount = records.filter((r) => r.success).length
    const failureCount = totalRequests - successCount
    const latencies = records.map((r) => r.latencyMs)
    const avgLatencyMs =
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0
    const minLatencyMs = latencies.length > 0 ? Math.min(...latencies) : 0
    const maxLatencyMs = latencies.length > 0 ? Math.max(...latencies) : 0

    // --- Latency tiers (fast / medium / slow) ---
    const fast = records.filter((r) => r.latencyMs < 1000).length
    const medium = records.filter(
      (r) => r.latencyMs >= 1000 && r.latencyMs < 3000
    ).length
    const slow = records.filter((r) => r.latencyMs >= 3000).length
    const latencyTiers = { fast, medium, slow }

    // --- Tool groups ---
    const toolGroups = new Map<
      string,
      { total: number; success: number; failure: number }
    >()
    for (const r of records) {
      let group: string
      if (r.toolUsed === "google_search") {
        group = "Pencarian Web"
      } else if (r.mode === "paper") {
        group = "Penulisan Paper"
      } else {
        group = "Obrolan Biasa"
      }

      const existing = toolGroups.get(group) ?? {
        total: 0,
        success: 0,
        failure: 0,
      }
      existing.total++
      if (r.success) existing.success++
      else existing.failure++
      toolGroups.set(group, existing)
    }

    const toolGroupsResult = Array.from(toolGroups.entries()).map(
      ([group, stats]) => ({
        group,
        totalRequests: stats.total,
        successCount: stats.success,
        failureCount: stats.failure,
        successRate: stats.total > 0 ? stats.success / stats.total : 0,
      })
    )

    // --- Failover causes and timeline ---
    const failoverRecords = records.filter((r) => r.failoverUsed)

    const failoverCauses = new Map<string, number>()
    for (const r of failoverRecords) {
      const cause = r.errorType ?? "unknown"
      failoverCauses.set(cause, (failoverCauses.get(cause) ?? 0) + 1)
    }

    const failoverCausesResult = Array.from(failoverCauses.entries())
      .map(([cause, count]) => ({ cause, count }))
      .sort((a, b) => b.count - a.count)

    const failoverTimeline = failoverRecords
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((r) => ({
        createdAt: r.createdAt,
        provider: r.provider,
        model: r.model,
        errorType: r.errorType,
        errorMessage: r.errorMessage,
        success: r.success,
      }))

    return {
      totalRequests,
      successCount,
      failureCount,
      avgLatencyMs,
      minLatencyMs,
      maxLatencyMs,
      dailySuccessRates,
      latencyTiers,
      toolGroups: toolGroupsResult,
      failoverCauses: failoverCausesResult,
      failoverTimeline,
    }
  },
})

// ============================================================================
// INTERNAL MUTATIONS
// ============================================================================

/**
 * Cleanup telemetry records older than 30 days.
 * Deletes in batches of 200.
 */
export const cleanupOldTelemetry = internalMutation({
  args: {},
  handler: async ({ db }) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    const oldRecords = await db
      .query("aiTelemetry")
      .withIndex("by_created")
      .order("asc")
      .take(200)

    let deletedCount = 0
    for (const record of oldRecords) {
      if (record.createdAt < cutoff) {
        await db.delete(record._id)
        deletedCount++
      } else {
        // Records are ordered asc by createdAt, so once we hit a newer one, stop
        break
      }
    }

    return { deletedCount }
  },
})
