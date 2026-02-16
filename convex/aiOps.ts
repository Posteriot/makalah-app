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
