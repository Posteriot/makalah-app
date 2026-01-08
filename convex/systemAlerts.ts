import { mutation, query, internalMutation } from "./_generated/server"
import { v } from "convex/values"
import { requireRole } from "./permissions"

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
