import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { requireAuthUser } from "./authHelpers"

const MAX_DESCRIPTION_LENGTH = 3000
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REPORTS = 3
const DEFAULT_LIST_LIMIT = 20
const MAX_LIST_LIMIT = 50

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
    const requestedLimit = args.limit ?? DEFAULT_LIST_LIMIT
    const limit = Math.max(1, Math.min(requestedLimit, MAX_LIST_LIMIT))

    return await ctx.db
      .query("technicalReports")
      .withIndex("by_user_created", (q) => q.eq("userId", authUser._id))
      .order("desc")
      .take(limit)
  },
})
