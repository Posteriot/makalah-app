import { v } from "convex/values";
import { query, type QueryCtx } from "./_generated/server";
import { requireAuthUser } from "./authHelpers";
import type { Id } from "./_generated/dataModel";
import {
  pickRecentAttachmentFailures,
  summarizeAttachmentEnv,
  summarizeAttachmentFormat,
  summarizeAttachmentHealth,
} from "./attachmentTelemetryAggregates";

/**
 * AI Ops Dashboard backend queries.
 * Admin/superadmin only — provides observability into paper workflow
 * sessions, memory health, artifact sync, and workflow progress.
 */

function assertAdmin(role: string): void {
  if (role !== "admin" && role !== "superadmin") {
    throw new Error("Unauthorized: admin access required");
  }
}

function periodToMs(period: "1h" | "24h" | "7d"): number {
  switch (period) {
    case "1h":
      return 60 * 60 * 1000;
    case "24h":
      return 24 * 60 * 60 * 1000;
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
  }
}

async function requireAdminRequestor(
  ctx: QueryCtx,
  requestorUserId: Id<"users">
) {
  const authUser = await requireAuthUser(ctx);
  if (authUser._id !== requestorUserId) {
    throw new Error("Unauthorized");
  }
  assertAdmin(authUser.role);
}

/**
 * Get aggregated memory health stats across all active paper sessions.
 */
export const getMemoryHealthStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    assertAdmin(user.role);

    const sessions = await ctx.db
      .query("paperSessions")
      .filter((q) => q.eq(q.field("completedAt"), undefined))
      .collect();

    const totalActive = sessions.length;
    let totalDigestEntries = 0;
    let sessionsWithSuperseded = 0;
    let sessionsWithDirty = 0;

    for (const session of sessions) {
      const digest = session.paperMemoryDigest || [];
      totalDigestEntries += digest.length;
      if (digest.some((d) => d.superseded)) sessionsWithSuperseded++;
      if (session.isDirty) sessionsWithDirty++;
    }

    return {
      totalActive,
      avgDigestEntries:
        totalActive > 0
          ? Math.round((totalDigestEntries / totalActive) * 10) / 10
          : 0,
      sessionsWithSuperseded,
      sessionsWithDirty,
    };
  },
});

/**
 * Get workflow progress statistics across all paper sessions.
 */
export const getWorkflowProgressStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    assertAdmin(user.role);

    const allSessions = await ctx.db.query("paperSessions").collect();
    const active = allSessions.filter((s) => !s.completedAt);
    const completed = allSessions.filter((s) => s.completedAt);
    const inRevision = active.filter((s) => s.stageStatus === "revision");

    const byStage: Record<string, number> = {};
    for (const s of active) {
      byStage[s.currentStage] = (byStage[s.currentStage] || 0) + 1;
    }

    const rewindHistory = await ctx.db.query("rewindHistory").collect();

    return {
      totalSessions: allSessions.length,
      activeSessions: active.length,
      completedSessions: completed.length,
      completionRate:
        allSessions.length > 0
          ? Math.round((completed.length / allSessions.length) * 100)
          : 0,
      inRevision: inRevision.length,
      byStage,
      totalRewinds: rewindHistory.length,
    };
  },
});

/**
 * Get artifact sync statistics (total + invalidated pending).
 */
export const getArtifactSyncStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    assertAdmin(user.role);

    const artifacts = await ctx.db.query("artifacts").collect();
    const invalidated = artifacts.filter((a) => a.invalidatedAt);

    return {
      totalArtifacts: artifacts.length,
      invalidatedPending: invalidated.length,
    };
  },
});

/**
 * Get full drill-down for a specific session.
 */
export const getSessionDrillDown = query({
  args: { sessionId: v.id("paperSessions") },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    assertAdmin(user.role);

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    // Get rewind history
    const rewindHistory = await ctx.db
      .query("rewindHistory")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Get artifacts for this session's conversation
    const artifacts = session.conversationId
      ? await ctx.db
          .query("artifacts")
          .withIndex("by_conversation", (q) =>
            q.eq("conversationId", session.conversationId)
          )
          .collect()
      : [];

    // Build per-stage summary from stageData
    const stageDetails = Object.entries(session.stageData || {}).map(
      ([stageId, data]: [string, any]) => ({
        stageId,
        hasRingkasan: !!data?.ringkasan,
        hasRingkasanDetail: !!data?.ringkasanDetail,
        ringkasan: data?.ringkasan || null,
        ringkasanDetail: data?.ringkasanDetail || null,
        validatedAt: data?.validatedAt || null,
        superseded: data?.superseded || false,
        revisionCount: data?.revisionCount || 0,
      })
    );

    return {
      session: {
        _id: session._id,
        userId: session.userId,
        conversationId: session.conversationId,
        currentStage: session.currentStage,
        stageStatus: session.stageStatus,
        isDirty: session.isDirty,
        paperTitle: session.paperTitle,
        workingTitle: session.workingTitle,
        completedAt: session.completedAt,
        _creationTime: session._creationTime,
        digestCount: (session.paperMemoryDigest || []).length,
        digest: (session.paperMemoryDigest || []).map((d) => ({
          stage: d.stage,
          ringkasan: d.decision,
          superseded: d.superseded || false,
        })),
      },
      stageDetails,
      rewindHistory: rewindHistory.map((r) => ({
        fromStage: r.fromStage,
        toStage: r.toStage,
        invalidatedStages: r.invalidatedStages,
        _creationTime: r._creationTime,
      })),
      artifactCount: artifacts.length,
      invalidatedArtifacts: artifacts.filter((a) => a.invalidatedAt).length,
    };
  },
});

/**
 * Get recent paper session list for the dashboard table.
 */
export const getSessionList = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireAuthUser(ctx);
    assertAdmin(user.role);

    const limit = args.limit ?? 20;
    const sessions = await ctx.db
      .query("paperSessions")
      .order("desc")
      .take(limit);

    return sessions.map((s) => ({
      _id: s._id,
      userId: s.userId,
      currentStage: s.currentStage,
      stageStatus: s.stageStatus,
      isDirty: s.isDirty,
      paperTitle: s.paperTitle,
      workingTitle: s.workingTitle,
      completedAt: s.completedAt,
      _creationTime: s._creationTime,
      digestCount: (s.paperMemoryDigest || []).length,
    }));
  },
});

/**
 * Get aggregated dropped keys from systemAlerts.
 * Groups by stage + keyName, returns count and last seen time.
 * Used by AI Ops dashboard to show potential schema promotion candidates.
 */
export const getDroppedKeysAggregation = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuthUser(ctx);
    assertAdmin(user.role);

    const alerts = await ctx.db
      .query("systemAlerts")
      .withIndex("by_type", (q) => q.eq("alertType", "stage_key_dropped"))
      .order("desc")
      .take(200); // Cap at 200 to avoid scanning too many

    // Aggregate by stage + keyName
    const aggregation = new Map<string, {
      stage: string;
      keyName: string;
      count: number;
      lastSeen: number;
      resolved: number;
    }>();

    for (const alert of alerts) {
      const meta = alert.metadata as { stage?: string; keyName?: string } | undefined;
      if (!meta?.stage || !meta?.keyName) continue;

      const key = `${meta.stage}::${meta.keyName}`;
      const existing = aggregation.get(key);
      if (existing) {
        existing.count++;
        if (alert.createdAt > existing.lastSeen) existing.lastSeen = alert.createdAt;
        if (alert.resolved) existing.resolved++;
      } else {
        aggregation.set(key, {
          stage: meta.stage,
          keyName: meta.keyName,
          count: 1,
          lastSeen: alert.createdAt,
          resolved: alert.resolved ? 1 : 0,
        });
      }
    }

    // Sort by count desc
    return Array.from(aggregation.values())
      .sort((a, b) => b.count - a.count);
  },
});

/**
 * Attachment health overview for AI Ops dashboard.
 */
export const getAttachmentHealthOverview = query({
  args: {
    requestorUserId: v.id("users"),
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d")),
  },
  handler: async (ctx, args) => {
    await requireAdminRequestor(ctx, args.requestorUserId);

    const cutoff = Date.now() - periodToMs(args.period);
    const records = await ctx.db
      .query("attachmentTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect();

    return summarizeAttachmentHealth(records);
  },
});

/**
 * Recent degraded/failed attachment requests.
 */
export const getAttachmentRecentFailures = query({
  args: {
    requestorUserId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdminRequestor(ctx, args.requestorUserId);

    const limit = args.limit ?? 20;
    const samples = await ctx.db
      .query("attachmentTelemetry")
      .withIndex("by_created")
      .order("desc")
      .take(300);

    return pickRecentAttachmentFailures(samples, limit)
      .map((record) => ({
        _id: record._id,
        requestId: record.requestId,
        conversationId: record.conversationId,
        createdAt: record.createdAt,
        runtimeEnv: record.runtimeEnv,
        requestedAttachmentMode: record.requestedAttachmentMode,
        resolutionReason: record.resolutionReason,
        healthStatus: record.healthStatus,
        failureReason: record.failureReason,
        docFileCount: record.docFileCount,
        imageFileCount: record.imageFileCount,
        docExtractionSuccessCount: record.docExtractionSuccessCount,
        docExtractionPendingCount: record.docExtractionPendingCount,
        docExtractionFailedCount: record.docExtractionFailedCount,
        docContextChars: record.docContextChars,
      }));
  },
});

/**
 * Attachment format/category breakdown for selected period.
 */
export const getAttachmentFormatBreakdown = query({
  args: {
    requestorUserId: v.id("users"),
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d")),
  },
  handler: async (ctx, args) => {
    await requireAdminRequestor(ctx, args.requestorUserId);

    const cutoff = Date.now() - periodToMs(args.period);
    const records = await ctx.db
      .query("attachmentTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect();

    return summarizeAttachmentFormat(records);
  },
});

/**
 * Runtime environment breakdown (local vs vercel) for selected period.
 */
export const getAttachmentEnvBreakdown = query({
  args: {
    requestorUserId: v.id("users"),
    period: v.union(v.literal("1h"), v.literal("24h"), v.literal("7d")),
  },
  handler: async (ctx, args) => {
    await requireAdminRequestor(ctx, args.requestorUserId);

    const cutoff = Date.now() - periodToMs(args.period);
    const records = await ctx.db
      .query("attachmentTelemetry")
      .withIndex("by_created", (q) => q.gte("createdAt", cutoff))
      .collect();

    return summarizeAttachmentEnv(records);
  },
});
