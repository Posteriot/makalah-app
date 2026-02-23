import { mutation, query, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRole } from "./permissions"

const LEGACY_UPDATE_STAGE_SIGNATURE = "updateStageData({ stage, data })"
const ARTIFACT_SOURCES_SECTION_MARKER = "**SOURCES DAN SITASI ARTIFACT:**"

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get unresolved alerts (for admin panel badge/indicator)
 * Admin/superadmin only
 */
export const getUnresolvedAlerts = query({
  args: { requestorUserId: v.id("users") },
  handler: async ({ db }, { requestorUserId }) => {
    await requireRole(db, requestorUserId, "admin")

    const alerts = await db
      .query("systemAlerts")
      .withIndex("by_resolved", (q) => q.eq("resolved", false))
      .order("desc")
      .collect()

    return alerts
  },
})

/**
 * Get unresolved alert count (for badge)
 * Admin/superadmin only
 */
export const getUnresolvedAlertCount = query({
  args: { requestorUserId: v.id("users") },
  handler: async ({ db }, { requestorUserId }) => {
    await requireRole(db, requestorUserId, "admin")

    const alerts = await db
      .query("systemAlerts")
      .withIndex("by_resolved", (q) => q.eq("resolved", false))
      .collect()

    // Count by severity
    const critical = alerts.filter((a) => a.severity === "critical").length
    const warning = alerts.filter((a) => a.severity === "warning").length
    const info = alerts.filter((a) => a.severity === "info").length

    return { total: alerts.length, critical, warning, info }
  },
})

/**
 * Get recent alerts (last 50)
 * Admin/superadmin only
 */
export const getRecentAlerts = query({
  args: { requestorUserId: v.id("users"), limit: v.optional(v.number()) },
  handler: async ({ db }, { requestorUserId, limit = 50 }) => {
    await requireRole(db, requestorUserId, "admin")

    const alerts = await db
      .query("systemAlerts")
      .withIndex("by_resolved")
      .order("desc")
      .take(limit)

    return alerts
  },
})

/**
 * Get alerts by type
 * Admin/superadmin only
 */
export const getAlertsByType = query({
  args: {
    requestorUserId: v.id("users"),
    alertType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async ({ db }, { requestorUserId, alertType, limit = 20 }) => {
    await requireRole(db, requestorUserId, "admin")

    const alerts = await db
      .query("systemAlerts")
      .withIndex("by_type", (q) => q.eq("alertType", alertType))
      .order("desc")
      .take(limit)

    return alerts
  },
})

/**
 * Check if fallback is currently active (has unresolved fallback_activated alert)
 * Admin/superadmin only
 */
export const isFallbackActive = query({
  args: { requestorUserId: v.id("users") },
  handler: async ({ db }, { requestorUserId }) => {
    await requireRole(db, requestorUserId, "admin")

    const fallbackAlert = await db
      .query("systemAlerts")
      .withIndex("by_type", (q) => q.eq("alertType", "fallback_activated"))
      .order("desc")
      .first()

    if (!fallbackAlert) {
      return { active: false, lastActivation: null }
    }

    return {
      active: !fallbackAlert.resolved,
      lastActivation: fallbackAlert.createdAt,
      alert: fallbackAlert,
    }
  },
})

/**
 * Analyze prompt contract drift for active system prompt
 * Admin/superadmin only
 */
export const getPromptContractDriftStatus = query({
  args: { requestorUserId: v.id("users") },
  handler: async ({ db }, { requestorUserId }) => {
    await requireRole(db, requestorUserId, "admin")

    const activePrompt = await db
      .query("systemPrompts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    if (!activePrompt) {
      return {
        hasDrift: true,
        issues: ["Tidak ada system prompt aktif"],
        promptId: null,
      }
    }

    const issues: string[] = []

    if (activePrompt.content.includes(LEGACY_UPDATE_STAGE_SIGNATURE)) {
      issues.push("Legacy signature updateStageData({ stage, data }) masih ada")
    }

    if (!activePrompt.content.includes(ARTIFACT_SOURCES_SECTION_MARKER)) {
      issues.push("Section SOURCES DAN SITASI ARTIFACT belum ada")
    }

    return {
      hasDrift: issues.length > 0,
      issues,
      promptId: activePrompt._id,
      promptVersion: activePrompt.version,
      checkedAt: Date.now(),
    }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new alert
 * Can be called from chat API (no auth required for system alerts)
 */
export const createAlert = mutation({
  args: {
    alertType: v.string(),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical")
    ),
    message: v.string(),
    source: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async ({ db }, { alertType, severity, message, source, metadata }) => {
    const alertId = await db.insert("systemAlerts", {
      alertType,
      severity,
      message,
      source,
      resolved: false,
      metadata,
      createdAt: Date.now(),
    })

    return { alertId, message: `Alert created: ${alertType}` }
  },
})

/**
 * Internal mutation for creating alerts (from server-side code)
 */
export const createAlertInternal = internalMutation({
  args: {
    alertType: v.string(),
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical")
    ),
    message: v.string(),
    source: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async ({ db }, { alertType, severity, message, source, metadata }) => {
    const alertId = await db.insert("systemAlerts", {
      alertType,
      severity,
      message,
      source,
      resolved: false,
      metadata,
      createdAt: Date.now(),
    })

    return { alertId }
  },
})

/**
 * Create or refresh warning alert for prompt contract drift
 * Admin/superadmin only
 */
export const upsertPromptContractDriftAlert = mutation({
  args: {
    requestorUserId: v.id("users"),
    issues: v.array(v.string()),
  },
  handler: async ({ db }, { requestorUserId, issues }) => {
    await requireRole(db, requestorUserId, "admin")

    if (issues.length === 0) {
      return { created: false, message: "No drift issues provided" }
    }

    const driftMessage = `Prompt contract drift terdeteksi: ${issues.join(" | ")}`

    const unresolvedDrift = await db
      .query("systemAlerts")
      .withIndex("by_type", (q) => q.eq("alertType", "prompt_contract_drift"))
      .filter((q) => q.eq(q.field("resolved"), false))
      .collect()

    const alreadyExists = unresolvedDrift.some((alert) => alert.message === driftMessage)
    if (alreadyExists) {
      return { created: false, message: "Drift alert already exists" }
    }

    const alertId = await db.insert("systemAlerts", {
      alertType: "prompt_contract_drift",
      severity: "warning",
      message: driftMessage,
      source: "system-health-panel",
      resolved: false,
      metadata: {
        issues,
        requestorUserId,
      },
      createdAt: Date.now(),
    })

    return { created: true, alertId, message: "Prompt drift alert created" }
  },
})

/**
 * Resolve an alert
 * Admin/superadmin only
 */
export const resolveAlert = mutation({
  args: {
    alertId: v.id("systemAlerts"),
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { alertId, requestorUserId }) => {
    await requireRole(db, requestorUserId, "admin")

    const alert = await db.get(alertId)
    if (!alert) {
      throw new Error("Alert tidak ditemukan")
    }

    if (alert.resolved) {
      return { message: "Alert sudah resolved" }
    }

    await db.patch(alertId, {
      resolved: true,
      resolvedAt: Date.now(),
      resolvedBy: requestorUserId,
    })

    return { message: "Alert berhasil di-resolve" }
  },
})

/**
 * Resolve all alerts of a specific type
 * Admin/superadmin only
 */
export const resolveAlertsByType = mutation({
  args: {
    alertType: v.string(),
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { alertType, requestorUserId }) => {
    await requireRole(db, requestorUserId, "admin")

    const alerts = await db
      .query("systemAlerts")
      .withIndex("by_type", (q) => q.eq("alertType", alertType))
      .filter((q) => q.eq(q.field("resolved"), false))
      .collect()

    const now = Date.now()
    let resolvedCount = 0

    for (const alert of alerts) {
      await db.patch(alert._id, {
        resolved: true,
        resolvedAt: now,
        resolvedBy: requestorUserId,
      })
      resolvedCount++
    }

    return { resolvedCount, message: `${resolvedCount} alert(s) berhasil di-resolve` }
  },
})

/**
 * Delete old resolved alerts (cleanup)
 * Admin/superadmin only
 */
export const cleanupOldAlerts = mutation({
  args: {
    requestorUserId: v.id("users"),
    olderThanDays: v.optional(v.number()), // Default 30 days
  },
  handler: async ({ db }, { requestorUserId, olderThanDays = 30 }) => {
    await requireRole(db, requestorUserId, "admin")

    const cutoffTime = Date.now() - olderThanDays * 24 * 60 * 60 * 1000

    const oldAlerts = await db
      .query("systemAlerts")
      .withIndex("by_resolved", (q) => q.eq("resolved", true))
      .filter((q) => q.lt(q.field("createdAt"), cutoffTime))
      .collect()

    let deletedCount = 0
    for (const alert of oldAlerts) {
      await db.delete(alert._id)
      deletedCount++
    }

    return { deletedCount, message: `${deletedCount} alert lama berhasil dihapus` }
  },
})
