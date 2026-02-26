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
const stageScopeValidator = v.union(
  v.literal("gagasan"),
  v.literal("topik"),
  v.literal("outline"),
  v.literal("abstrak"),
  v.literal("pendahuluan"),
  v.literal("tinjauan_literatur"),
  v.literal("metodologi"),
  v.literal("hasil"),
  v.literal("diskusi"),
  v.literal("kesimpulan"),
  v.literal("daftar_pustaka"),
  v.literal("lampiran"),
  v.literal("judul"),
)
const stageInstructionSourceValidator = v.union(
  v.literal("skill"),
  v.literal("fallback"),
  v.literal("none"),
)

type StageScope =
  | "gagasan"
  | "topik"
  | "outline"
  | "abstrak"
  | "pendahuluan"
  | "tinjauan_literatur"
  | "metodologi"
  | "hasil"
  | "diskusi"
  | "kesimpulan"
  | "daftar_pustaka"
  | "lampiran"
  | "judul"

type SkillRuntimeRecord = {
  _id: string
  createdAt: number
  conversationId?: string
  stageScope?: StageScope
  stageInstructionSource?: "skill" | "fallback" | "none"
  activeSkillId?: string
  activeSkillVersion?: number
  fallbackReason?: string
  mode: "normal" | "websearch" | "paper"
  toolUsed?: string
  success: boolean
  provider: "vercel-gateway" | "openrouter"
  model: string
  failoverUsed: boolean
  latencyMs: number
  skillResolverFallback?: boolean
  isSkillRuntime?: boolean
  errorType?: string
  errorMessage?: string
}

function isSkillRuntimeRecord(record: {
  mode: "normal" | "websearch" | "paper"
  stageInstructionSource?: "skill" | "fallback" | "none"
  stageScope?: StageScope
  skillResolverFallback?: boolean
}): boolean {
  if (record.stageInstructionSource !== undefined) return true
  if (record.stageScope !== undefined) return true
  return record.mode === "paper" && record.skillResolverFallback !== undefined
}

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
    stageScope: v.optional(stageScopeValidator),
    stageInstructionSource: v.optional(stageInstructionSourceValidator),
    activeSkillId: v.optional(v.string()),
    activeSkillVersion: v.optional(v.number()),
    fallbackReason: v.optional(v.string()),
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
    const isSkillRuntime = isSkillRuntimeRecord({
      mode: args.mode,
      stageInstructionSource: args.stageInstructionSource,
      stageScope: args.stageScope,
      skillResolverFallback: args.skillResolverFallback,
    })

    const id = await db.insert("aiTelemetry", {
      ...args,
      isSkillRuntime,
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
 * Conversation-level telemetry trace for debugging stage-skill resolver behavior.
 * Admin/superadmin only.
 */
export const getConversationTrace = query({
  args: {
    requestorUserId: v.id("users"),
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
  },
  handler: async ({ db }, { requestorUserId, conversationId, limit = 100 }) => {
    await requireRole(db, requestorUserId, "admin")

    const filtered = await db
      .query("aiTelemetry")
      .withIndex("by_conversation_created", (q) => q.eq("conversationId", conversationId))
      .order("desc")
      .take(limit)

    return filtered.map((item) => ({
      _id: item._id,
      createdAt: item.createdAt,
      conversationId: item.conversationId ?? null,
      stageScope: item.stageScope ?? null,
      stageInstructionSource: item.stageInstructionSource ?? null,
      activeSkillId: item.activeSkillId ?? null,
      activeSkillVersion: item.activeSkillVersion ?? null,
      fallbackReason: item.fallbackReason ?? null,
      mode: item.mode,
      toolUsed: item.toolUsed,
      success: item.success,
      provider: item.provider,
      model: item.model,
      failoverUsed: item.failoverUsed,
      latencyMs: item.latencyMs,
      skillResolverFallback: item.skillResolverFallback ?? null,
      errorType: item.errorType ?? null,
      errorMessage: item.errorMessage ?? null,
    }))
  },
})

/**
 * Skill runtime observability overview (active skill vs fallback).
 * Admin/superadmin only.
 */
export const getSkillRuntimeOverview = query({
  args: {
    requestorUserId: v.id("users"),
    period: periodValidator,
  },
  handler: async ({ db }, { requestorUserId, period }) => {
    await requireRole(db, requestorUserId, "admin")

    const cutoff = Date.now() - periodToMs(period)
    const skillRecords = await db
      .query("aiTelemetry")
      .withIndex("by_skill_runtime_created", (q) =>
        q.eq("isSkillRuntime", true).gte("createdAt", cutoff)
      )
      .collect()

    const totalRequests = skillRecords.length
    const fallbackCount = skillRecords.filter((item) => item.skillResolverFallback === true).length
    const skillAppliedCount = skillRecords.filter((item) => item.stageInstructionSource === "skill").length
    const fallbackRate = totalRequests > 0 ? fallbackCount / totalRequests : 0

    const reasonMap = new Map<string, number>()
    const stageMap = new Map<string, { stage: string; total: number; fallback: number }>()

    for (const rawRecord of skillRecords) {
      const record = rawRecord as unknown as SkillRuntimeRecord
      if (record.skillResolverFallback) {
        const reason = record.fallbackReason ?? "unknown"
        reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1)
      }

      const stage = record.stageScope ?? "unknown"
      const existing = stageMap.get(stage) ?? { stage, total: 0, fallback: 0 }
      existing.total += 1
      if (record.skillResolverFallback) existing.fallback += 1
      stageMap.set(stage, existing)
    }

    const topFallbackReasons = Array.from(reasonMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)

    const byStage = Array.from(stageMap.values())
      .map((stage) => ({
        stage: stage.stage,
        requestCount: stage.total,
        fallbackCount: stage.fallback,
        fallbackRate: stage.total > 0 ? stage.fallback / stage.total : 0,
      }))
      .sort((a, b) => {
        if (a.stage === "unknown") return 1
        if (b.stage === "unknown") return -1
        return a.stage.localeCompare(b.stage)
      })

    return {
      totalRequests,
      skillAppliedCount,
      fallbackCount,
      fallbackRate,
      topFallbackReasons,
      byStage,
    }
  },
})

/**
 * Skill runtime trace for quick debugging in AI Ops.
 * Admin/superadmin only.
 */
export const getSkillRuntimeTrace = query({
  args: {
    requestorUserId: v.id("users"),
    period: periodValidator,
    limit: v.optional(v.number()),
    stageScope: v.optional(stageScopeValidator),
    conversationId: v.optional(v.id("conversations")),
    onlyFallback: v.optional(v.boolean()),
  },
  handler: async (
    { db },
    { requestorUserId, period, limit = 50, stageScope, conversationId, onlyFallback = false }
  ) => {
    await requireRole(db, requestorUserId, "admin")

    const cutoff = Date.now() - periodToMs(period)
    let rows: SkillRuntimeRecord[] = []

    if (conversationId) {
      const byConversation = await db
        .query("aiTelemetry")
        .withIndex("by_conversation_skill_runtime_created", (q) =>
          q.eq("conversationId", conversationId).eq("isSkillRuntime", true).gte("createdAt", cutoff)
        )
        .order("desc")
        .take(limit)
      rows = byConversation as unknown as SkillRuntimeRecord[]
    } else if (stageScope) {
      const byStage = await db
        .query("aiTelemetry")
        .withIndex("by_stage_skill_runtime_created", (q) =>
          q.eq("stageScope", stageScope).eq("isSkillRuntime", true).gte("createdAt", cutoff)
        )
        .order("desc")
        .take(limit)
      rows = byStage as unknown as SkillRuntimeRecord[]
    } else {
      const byCreated = await db
        .query("aiTelemetry")
        .withIndex("by_skill_runtime_created", (q) =>
          q.eq("isSkillRuntime", true).gte("createdAt", cutoff)
        )
        .order("desc")
        .take(limit)
      rows = byCreated as unknown as SkillRuntimeRecord[]
    }

    const filtered = rows
      .filter((record) => (onlyFallback ? record.skillResolverFallback === true : true))

    return filtered.map((record) => ({
      _id: record._id,
      createdAt: record.createdAt,
      conversationId: record.conversationId ?? null,
      stageScope: record.stageScope ?? "unknown",
      stageInstructionSource: record.stageInstructionSource ?? "unknown",
      activeSkillId: record.activeSkillId ?? null,
      activeSkillVersion: record.activeSkillVersion ?? null,
      fallbackReason: record.fallbackReason ?? null,
      skillResolverFallback: record.skillResolverFallback ?? null,
      mode: record.mode,
      toolUsed: record.toolUsed ?? null,
      provider: record.provider,
      model: record.model,
      latencyMs: record.latencyMs,
      failoverUsed: record.failoverUsed,
      success: record.success,
      errorType: record.errorType ?? null,
      errorMessage: record.errorMessage ?? null,
    }))
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
