import { v } from "convex/values";
import { query } from "./_generated/server";
import { requireAuthUser } from "./authHelpers";

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
