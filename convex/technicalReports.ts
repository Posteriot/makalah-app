import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import {
  mutation,
  query,
  internalAction,
  internalMutation,
  internalQuery,
  type QueryCtx,
  type MutationCtx,
} from "./_generated/server"
import { internal } from "./_generated/api"
import type { Id } from "./_generated/dataModel"
import { requireAuthUser } from "./authHelpers"
import { requireRole } from "./permissions"

const MAX_DESCRIPTION_LENGTH = 3000
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REPORTS = 3
const DEFAULT_LIST_LIMIT = 20
const MAX_LIST_LIMIT = 50
const TECHNICAL_REPORT_DEVELOPER_EMAIL = "dukungan@makalah.ai"

type TechnicalReportStatus = "open" | "triaged" | "resolved"

type AdminRequestContext = QueryCtx | MutationCtx

function normalizeDescription(raw: string): string {
  const normalized = raw.trim().replace(/\s+/g, " ")
  if (!normalized) {
    throw new Error("Deskripsi laporan wajib diisi.")
  }
  if (normalized.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Deskripsi maksimal ${MAX_DESCRIPTION_LENGTH} karakter.`)
  }
  return normalized
}

function normalizeIssueCategory(raw?: string): string | undefined {
  if (!raw) return undefined
  const normalized = raw.trim()
  return normalized ? normalized.slice(0, 120) : undefined
}

function clampLimit(value: number | undefined, fallback: number, max: number): number {
  const requested = value ?? fallback
  return Math.max(1, Math.min(requested, max))
}

function getStatusLabel(status: TechnicalReportStatus): "Pending" | "Proses" | "Selesai" {
  switch (status) {
    case "open":
      return "Pending"
    case "triaged":
      return "Proses"
    case "resolved":
      return "Selesai"
  }
}

function getBaseAppUrl(): string {
  return process.env.SITE_URL ?? process.env.APP_URL ?? "https://makalah.ai"
}

function buildSummary(description: string): string {
  const compact = description.trim().replace(/\s+/g, " ")
  return compact.length <= 160 ? compact : `${compact.slice(0, 157)}...`
}

function formatEventTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  })
}

async function requireAdminRequestor(
  ctx: AdminRequestContext,
  requestorUserId: Id<"users">
) {
  const authUser = await requireAuthUser(ctx)
  if (authUser._id !== requestorUserId) {
    throw new Error("Unauthorized")
  }
  await requireRole(ctx.db, requestorUserId, "admin")
  return authUser
}

export const submitTechnicalReport = mutation({
  args: {
    source: v.union(
      v.literal("chat-inline"),
      v.literal("footer-link"),
      v.literal("support-page")
    ),
    description: v.string(),
    issueCategory: v.optional(v.string()),
    conversationId: v.optional(v.id("conversations")),
    paperSessionId: v.optional(v.id("paperSessions")),
    contextSnapshot: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx)
    const now = Date.now()
    const windowStart = now - RATE_LIMIT_WINDOW_MS

    const recentReports = await ctx.db
      .query("technicalReports")
      .withIndex("by_user_created", (q) => q.eq("userId", authUser._id))
      .order("desc")
      .take(RATE_LIMIT_MAX_REPORTS)

    const reportsInWindow = recentReports.filter((report) => report.createdAt >= windowStart)
    if (reportsInWindow.length >= RATE_LIMIT_MAX_REPORTS) {
      throw new Error("Terlalu banyak laporan dalam waktu singkat. Coba lagi beberapa menit lagi.")
    }

    const description = normalizeDescription(args.description)
    const issueCategory = normalizeIssueCategory(args.issueCategory)

    if (args.conversationId) {
      const conversation = await ctx.db.get(args.conversationId)
      if (!conversation || conversation.userId !== authUser._id) {
        throw new Error("Conversation tidak ditemukan atau tidak memiliki akses.")
      }
    }

    let paperSessionId = args.paperSessionId
    if (paperSessionId) {
      const paperSession = await ctx.db.get(paperSessionId)
      if (!paperSession || paperSession.userId !== authUser._id) {
        throw new Error("Paper session tidak ditemukan atau tidak memiliki akses.")
      }
      if (args.conversationId && paperSession.conversationId !== args.conversationId) {
        throw new Error("Paper session tidak cocok dengan conversation yang dipilih.")
      }
    }

    if (!paperSessionId && args.conversationId) {
      const session = await ctx.db
        .query("paperSessions")
        .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId!))
        .unique()
      if (session && session.userId === authUser._id) {
        paperSessionId = session._id
      }
    }

    const reportId = await ctx.db.insert("technicalReports", {
      userId: authUser._id,
      scope: "chat",
      source: args.source,
      status: "open",
      description,
      ...(issueCategory ? { issueCategory } : {}),
      ...(args.conversationId ? { conversationId: args.conversationId } : {}),
      ...(paperSessionId ? { paperSessionId } : {}),
      ...(args.contextSnapshot ? { contextSnapshot: args.contextSnapshot } : {}),
      createdAt: now,
      updatedAt: now,
    })

    await ctx.db.insert("technicalReportEvents", {
      reportId,
      actorUserId: authUser._id,
      eventType: "created",
      toStatus: "open",
      payload: {
        source: args.source,
      },
      createdAt: now,
    })

    await ctx.scheduler.runAfter(0, internal.technicalReports.notifyTechnicalReportCreated, {
      reportId,
    })

    return {
      reportId,
      status: "open" as const,
    }
  },
})

export const listRecentChatContexts = query({
  handler: async (ctx) => {
    const authUser = await requireAuthUser(ctx)

    const conversations = await ctx.db
      .query("conversations")
      .withIndex("by_user", (q) => q.eq("userId", authUser._id))
      .order("desc")
      .take(5)

    const contexts = await Promise.all(
      conversations.map(async (conversation) => {
        const paperSession = await ctx.db
          .query("paperSessions")
          .withIndex("by_conversation", (q) => q.eq("conversationId", conversation._id))
          .unique()

        return {
          conversationId: conversation._id,
          title: conversation.title,
          lastMessageAt: conversation.lastMessageAt,
          paperSessionId: paperSession?._id ?? null,
          currentStage: paperSession?.currentStage ?? null,
        }
      })
    )

    return contexts
  },
})

export const listMyTechnicalReports = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const authUser = await requireAuthUser(ctx)
    const limit = clampLimit(args.limit, DEFAULT_LIST_LIMIT, MAX_LIST_LIMIT)

    return await ctx.db
      .query("technicalReports")
      .withIndex("by_user_created", (q) => q.eq("userId", authUser._id))
      .order("desc")
      .take(limit)
  },
})

export const getAdminStats = query({
  args: {
    requestorUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdminRequestor(ctx, args.requestorUserId)

    const reports = await ctx.db.query("technicalReports").collect()
    return {
      total: reports.length,
      open: reports.filter((report) => report.status === "open").length,
      triaged: reports.filter((report) => report.status === "triaged").length,
      resolved: reports.filter((report) => report.status === "resolved").length,
    }
  },
})

export const listForAdmin = query({
  args: {
    requestorUserId: v.id("users"),
    status: v.optional(v.union(v.literal("open"), v.literal("triaged"), v.literal("resolved"))),
    source: v.optional(
      v.union(v.literal("chat-inline"), v.literal("footer-link"), v.literal("support-page"))
    ),
    search: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAdminRequestor(ctx, args.requestorUserId)

    const baseQuery = args.status && args.source
      ? ctx.db
          .query("technicalReports")
          .withIndex("by_status_source_created", (q) =>
            q.eq("status", args.status!).eq("source", args.source!)
          )
          .order("desc")
      : args.status
        ? ctx.db
            .query("technicalReports")
            .withIndex("by_status_created", (q) => q.eq("status", args.status!))
            .order("desc")
        : args.source
          ? ctx.db
              .query("technicalReports")
              .withIndex("by_source_created", (q) => q.eq("source", args.source!))
              .order("desc")
          : ctx.db.query("technicalReports").order("desc")

    const result = await baseQuery.paginate(args.paginationOpts)
    const normalizedSearch = args.search?.trim().toLowerCase() ?? ""

    const mappedPage = await Promise.all(
      result.page.map(async (report) => {
        const reporter = await ctx.db.get(report.userId)
        return {
          ...report,
          userEmail: reporter?.email ?? "unknown@makalah.ai",
          userName: [reporter?.firstName, reporter?.lastName].filter(Boolean).join(" ").trim() || null,
          statusLabel: getStatusLabel(report.status),
          descriptionPreview: buildSummary(report.description),
        }
      })
    )

    const filteredPage = normalizedSearch
      ? mappedPage.filter((item) => {
          return (
            item._id.toLowerCase().includes(normalizedSearch) ||
            item.userEmail.toLowerCase().includes(normalizedSearch) ||
            item.description.toLowerCase().includes(normalizedSearch)
          )
        })
      : mappedPage

    return {
      ...result,
      page: filteredPage,
    }
  },
})

export const getDetailForAdmin = query({
  args: {
    requestorUserId: v.id("users"),
    reportId: v.id("technicalReports"),
  },
  handler: async (ctx, args) => {
    await requireAdminRequestor(ctx, args.requestorUserId)

    const report = await ctx.db.get(args.reportId)
    if (!report) return null

    const reporter = await ctx.db.get(report.userId)
    const conversation = report.conversationId ? await ctx.db.get(report.conversationId) : null
    const paperSession = report.paperSessionId ? await ctx.db.get(report.paperSessionId) : null
    const resolver = report.resolvedBy ? await ctx.db.get(report.resolvedBy) : null

    return {
      report,
      reporter: reporter
        ? {
            _id: reporter._id,
            email: reporter.email,
            firstName: reporter.firstName,
            lastName: reporter.lastName,
          }
        : null,
      conversation: conversation
        ? {
            _id: conversation._id,
            title: conversation.title,
            lastMessageAt: conversation.lastMessageAt,
          }
        : null,
      paperSession: paperSession
        ? {
            _id: paperSession._id,
            currentStage: paperSession.currentStage,
          }
        : null,
      resolvedBy: resolver
        ? {
            _id: resolver._id,
            email: resolver.email,
            firstName: resolver.firstName,
            lastName: resolver.lastName,
          }
        : null,
      statusLabel: getStatusLabel(report.status),
    }
  },
})

export const listEventsByReport = query({
  args: {
    requestorUserId: v.id("users"),
    reportId: v.id("technicalReports"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdminRequestor(ctx, args.requestorUserId)

    const report = await ctx.db.get(args.reportId)
    if (!report) {
      throw new Error("Report tidak ditemukan")
    }

    const limit = clampLimit(args.limit, DEFAULT_LIST_LIMIT, 100)

    const events = await ctx.db
      .query("technicalReportEvents")
      .withIndex("by_report_created", (q) => q.eq("reportId", args.reportId))
      .order("desc")
      .take(limit)

    return await Promise.all(
      events.map(async (event) => {
        const actor = event.actorUserId ? await ctx.db.get(event.actorUserId) : null
        return {
          ...event,
          actorEmail: actor?.email ?? null,
          actorName: actor
            ? [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim() || null
            : null,
        }
      })
    )
  },
})

export const updateStatusByAdmin = mutation({
  args: {
    requestorUserId: v.id("users"),
    reportId: v.id("technicalReports"),
    toStatus: v.union(v.literal("open"), v.literal("triaged"), v.literal("resolved")),
  },
  handler: async (ctx, args) => {
    const requestor = await requireAdminRequestor(ctx, args.requestorUserId)

    const report = await ctx.db.get(args.reportId)
    if (!report) {
      throw new Error("Report tidak ditemukan")
    }

    if (report.status === args.toStatus) {
      return {
        reportId: report._id,
        status: report.status,
        statusLabel: getStatusLabel(report.status),
        changed: false,
      }
    }

    const now = Date.now()

    await ctx.db.patch(args.reportId, {
      status: args.toStatus,
      updatedAt: now,
      ...(args.toStatus === "resolved"
        ? {
            resolvedAt: now,
            resolvedBy: requestor._id,
          }
        : {
            resolvedAt: undefined,
            resolvedBy: undefined,
          }),
    })

    await ctx.db.insert("technicalReportEvents", {
      reportId: args.reportId,
      actorUserId: requestor._id,
      eventType: "status_changed",
      fromStatus: report.status,
      toStatus: args.toStatus,
      createdAt: now,
    })

    await ctx.scheduler.runAfter(0, internal.technicalReports.notifyTechnicalReportStatusChanged, {
      reportId: args.reportId,
      actorUserId: requestor._id,
      fromStatus: report.status,
      toStatus: args.toStatus,
    })

    return {
      reportId: args.reportId,
      status: args.toStatus,
      statusLabel: getStatusLabel(args.toStatus),
      changed: true,
    }
  },
})

export const getNotificationContextInternal = internalQuery({
  args: {
    reportId: v.id("technicalReports"),
  },
  handler: async (ctx, args) => {
    const report = await ctx.db.get(args.reportId)
    if (!report) return null

    const reporter = await ctx.db.get(report.userId)

    return {
      reportId: report._id,
      source: report.source,
      status: report.status,
      description: report.description,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
      userEmail: reporter?.email ?? null,
      userName: [reporter?.firstName, reporter?.lastName].filter(Boolean).join(" ").trim() || null,
    }
  },
})

export const createTechnicalReportEventInternal = internalMutation({
  args: {
    reportId: v.id("technicalReports"),
    actorUserId: v.optional(v.id("users")),
    eventType: v.union(
      v.literal("created"),
      v.literal("status_changed"),
      v.literal("email_sent"),
      v.literal("email_failed")
    ),
    fromStatus: v.optional(v.union(v.literal("open"), v.literal("triaged"), v.literal("resolved"))),
    toStatus: v.optional(v.union(v.literal("open"), v.literal("triaged"), v.literal("resolved"))),
    recipient: v.optional(v.string()),
    payload: v.optional(v.any()),
    createdAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("technicalReportEvents", {
      reportId: args.reportId,
      ...(args.actorUserId ? { actorUserId: args.actorUserId } : {}),
      eventType: args.eventType,
      ...(args.fromStatus ? { fromStatus: args.fromStatus } : {}),
      ...(args.toStatus ? { toStatus: args.toStatus } : {}),
      ...(args.recipient ? { recipient: args.recipient } : {}),
      ...(args.payload ? { payload: args.payload } : {}),
      createdAt: args.createdAt ?? Date.now(),
    })
  },
})

export const notifyTechnicalReportCreated = internalAction({
  args: {
    reportId: v.id("technicalReports"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.runQuery(internal.technicalReports.getNotificationContextInternal, {
      reportId: args.reportId,
    })

    if (!notification) return

    const { sendTechnicalReportDeveloperNotification, sendTechnicalReportUserNotification } = await import("./authEmails")

    const timestampLabel = formatEventTimestamp(notification.createdAt)
    const statusLabel = getStatusLabel(notification.status)
    const summary = buildSummary(notification.description)
    const dashboardUrl = `${getBaseAppUrl()}/dashboard?tab=technical-report`
    const supportUrl = `${getBaseAppUrl()}/support/technical-report`

    try {
      await sendTechnicalReportDeveloperNotification({
        to: TECHNICAL_REPORT_DEVELOPER_EMAIL,
        reportId: notification.reportId,
        source: notification.source,
        statusLabel,
        summary,
        timestampLabel,
        dashboardUrl,
      })

      await ctx.runMutation(internal.technicalReports.createTechnicalReportEventInternal, {
        reportId: notification.reportId,
        eventType: "email_sent",
        recipient: TECHNICAL_REPORT_DEVELOPER_EMAIL,
        payload: { trigger: "created" },
      })
    } catch (error) {
      await ctx.runMutation(internal.technicalReports.createTechnicalReportEventInternal, {
        reportId: notification.reportId,
        eventType: "email_failed",
        recipient: TECHNICAL_REPORT_DEVELOPER_EMAIL,
        payload: {
          trigger: "created",
          reason: error instanceof Error ? error.message : "unknown_error",
        },
      })
    }

    if (!notification.userEmail) {
      await ctx.runMutation(internal.technicalReports.createTechnicalReportEventInternal, {
        reportId: notification.reportId,
        eventType: "email_failed",
        recipient: "<user-email-missing>",
        payload: {
          trigger: "created",
          reason: "missing_user_email",
        },
      })
      return
    }

    try {
      await sendTechnicalReportUserNotification({
        email: notification.userEmail,
        reportId: notification.reportId,
        statusLabel,
        summary,
        timestampLabel,
        supportUrl,
      })

      await ctx.runMutation(internal.technicalReports.createTechnicalReportEventInternal, {
        reportId: notification.reportId,
        eventType: "email_sent",
        recipient: notification.userEmail,
        payload: { trigger: "created" },
      })
    } catch (error) {
      await ctx.runMutation(internal.technicalReports.createTechnicalReportEventInternal, {
        reportId: notification.reportId,
        eventType: "email_failed",
        recipient: notification.userEmail,
        payload: {
          trigger: "created",
          reason: error instanceof Error ? error.message : "unknown_error",
        },
      })
    }
  },
})

export const notifyTechnicalReportStatusChanged = internalAction({
  args: {
    reportId: v.id("technicalReports"),
    actorUserId: v.optional(v.id("users")),
    fromStatus: v.union(v.literal("open"), v.literal("triaged"), v.literal("resolved")),
    toStatus: v.union(v.literal("open"), v.literal("triaged"), v.literal("resolved")),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.runQuery(internal.technicalReports.getNotificationContextInternal, {
      reportId: args.reportId,
    })

    if (!notification) return

    const { sendTechnicalReportDeveloperNotification, sendTechnicalReportUserNotification } = await import("./authEmails")

    const timestampLabel = formatEventTimestamp(notification.updatedAt)
    const statusLabel = getStatusLabel(args.toStatus)
    const fromStatusLabel = getStatusLabel(args.fromStatus)
    const summary = buildSummary(notification.description)
    const dashboardUrl = `${getBaseAppUrl()}/dashboard?tab=technical-report`
    const supportUrl = `${getBaseAppUrl()}/support/technical-report`

    try {
      await sendTechnicalReportDeveloperNotification({
        to: TECHNICAL_REPORT_DEVELOPER_EMAIL,
        reportId: notification.reportId,
        source: notification.source,
        statusLabel,
        fromStatusLabel,
        summary,
        timestampLabel,
        dashboardUrl,
      })

      await ctx.runMutation(internal.technicalReports.createTechnicalReportEventInternal, {
        reportId: notification.reportId,
        actorUserId: args.actorUserId,
        eventType: "email_sent",
        recipient: TECHNICAL_REPORT_DEVELOPER_EMAIL,
        payload: { trigger: "status_changed", fromStatus: args.fromStatus, toStatus: args.toStatus },
      })
    } catch (error) {
      await ctx.runMutation(internal.technicalReports.createTechnicalReportEventInternal, {
        reportId: notification.reportId,
        actorUserId: args.actorUserId,
        eventType: "email_failed",
        recipient: TECHNICAL_REPORT_DEVELOPER_EMAIL,
        payload: {
          trigger: "status_changed",
          fromStatus: args.fromStatus,
          toStatus: args.toStatus,
          reason: error instanceof Error ? error.message : "unknown_error",
        },
      })
    }

    if (!notification.userEmail) {
      await ctx.runMutation(internal.technicalReports.createTechnicalReportEventInternal, {
        reportId: notification.reportId,
        actorUserId: args.actorUserId,
        eventType: "email_failed",
        recipient: "<user-email-missing>",
        payload: {
          trigger: "status_changed",
          fromStatus: args.fromStatus,
          toStatus: args.toStatus,
          reason: "missing_user_email",
        },
      })
      return
    }

    try {
      await sendTechnicalReportUserNotification({
        email: notification.userEmail,
        reportId: notification.reportId,
        statusLabel,
        fromStatusLabel,
        summary,
        timestampLabel,
        supportUrl,
      })

      await ctx.runMutation(internal.technicalReports.createTechnicalReportEventInternal, {
        reportId: notification.reportId,
        actorUserId: args.actorUserId,
        eventType: "email_sent",
        recipient: notification.userEmail,
        payload: { trigger: "status_changed", fromStatus: args.fromStatus, toStatus: args.toStatus },
      })
    } catch (error) {
      await ctx.runMutation(internal.technicalReports.createTechnicalReportEventInternal, {
        reportId: notification.reportId,
        actorUserId: args.actorUserId,
        eventType: "email_failed",
        recipient: notification.userEmail,
        payload: {
          trigger: "status_changed",
          fromStatus: args.fromStatus,
          toStatus: args.toStatus,
          reason: error instanceof Error ? error.message : "unknown_error",
        },
      })
    }
  },
})
