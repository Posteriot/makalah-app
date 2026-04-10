import { v } from "convex/values";

import { mutation, query } from "./_generated/server";
import {
  getAuthUser,
  requireAuthUserId,
  verifyAuthUserId,
} from "./authHelpers";

// ────────────────────────────────────────────────────────────────────────────
// deriveUpdatePending — pure helper.
//
// Compares the latest compiled snapshot revision against the user's
// last-viewed revision. Both fields are optional because either side may
// not exist yet. Defensive defaults:
//
//   - both undefined        -> false (no snapshot, no view, nothing pending)
//   - latest defined, viewed undefined -> true (user has never viewed)
//   - latest undefined, viewed defined -> false (degenerate; under-notify
//     is safer than over-notify)
//   - both defined          -> latest !== viewed
// ────────────────────────────────────────────────────────────────────────────

export function deriveUpdatePending(args: {
  latestRevision: number | undefined;
  viewedRevision: number | undefined;
}): boolean {
  const { latestRevision, viewedRevision } = args;
  if (latestRevision == null && viewedRevision == null) return false;
  if (latestRevision == null) return false;
  if (viewedRevision == null) return true;
  return latestRevision !== viewedRevision;
}

// ────────────────────────────────────────────────────────────────────────────
// getLatestSnapshot — defensive read of the most recent compiled snapshot
// row for a session. Returns null when:
//   - the caller is not authenticated
//   - the auth user does not own the requested session
//   - the session does not exist
//   - no snapshot row exists for the session
//
// All four "no" cases collapse to the same null response so a caller cannot
// distinguish "not yours" from "no snapshot" — prevents enumeration leaks.
// ────────────────────────────────────────────────────────────────────────────

export const getLatestSnapshot = query({
  args: {
    sessionId: v.id("paperSessions"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx);
    if (!authUser) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    if (session.userId !== authUser._id) return null;

    return await ctx.db
      .query("naskahSnapshots")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();
  },
});

// ────────────────────────────────────────────────────────────────────────────
// getAvailability — defensive read of the latest snapshot's availability
// fields. Falls back to {isAvailable: false, reasonIfUnavailable:
// "empty_session"} for ALL of:
//   - unauthenticated caller
//   - session not owned by auth user
//   - session not found
//   - no snapshot row
//
// All four cases produce the same response so an unauthorized caller
// cannot distinguish them from a fresh-but-empty session. The snapshot
// row is the source of truth for availability semantics; this query just
// shapes its return.
// ────────────────────────────────────────────────────────────────────────────

const EMPTY_SESSION_AVAILABILITY = {
  isAvailable: false as const,
  availableAtRevision: undefined,
  reasonIfUnavailable: "empty_session" as const,
};

export const getAvailability = query({
  args: {
    sessionId: v.id("paperSessions"),
  },
  handler: async (ctx, args) => {
    const authUser = await getAuthUser(ctx);
    if (!authUser) return EMPTY_SESSION_AVAILABILITY;

    const session = await ctx.db.get(args.sessionId);
    if (!session) return EMPTY_SESSION_AVAILABILITY;
    if (session.userId !== authUser._id) return EMPTY_SESSION_AVAILABILITY;

    const latest = await ctx.db
      .query("naskahSnapshots")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .first();

    if (!latest) return EMPTY_SESSION_AVAILABILITY;

    return {
      isAvailable: latest.isAvailable,
      availableAtRevision: latest.isAvailable ? latest.revision : undefined,
      reasonIfUnavailable: latest.reasonIfUnavailable,
    };
  },
});

// ────────────────────────────────────────────────────────────────────────────
// getViewState — defensive read of the user's view state row for this
// session. Returns null when:
//   - the auth user does not match the userId arg
//   - the auth user does not own the requested session
//   - the session does not exist
//   - no view state row exists
//
// Uses unique() because (sessionId, userId) is a logical single-row
// contract; duplicates must explode loudly, not be silently swept.
// ────────────────────────────────────────────────────────────────────────────

export const getViewState = query({
  args: {
    sessionId: v.id("paperSessions"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const authUser = await verifyAuthUserId(ctx, args.userId);
    if (!authUser) return null;

    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;
    if (session.userId !== authUser._id) return null;

    return await ctx.db
      .query("naskahViews")
      .withIndex("by_session_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", args.userId),
      )
      .unique();
  },
});

// ────────────────────────────────────────────────────────────────────────────
// markViewed — strict-auth upsert of the user's view state for a session.
//
// Throws "Unauthorized" when:
//   - the caller is not authenticated
//   - the auth user does not match the userId arg
//   - the auth user does not own the requested session
// Throws "Session not found" when the session id does not exist.
//
// Behavior on success:
//   - if no view row exists, insert a new one with viewedAt = now
//   - if a row exists, patch it with the new revision + viewedAt
//   - even when the new revision equals the existing lastViewedRevision,
//     we still patch (to bump viewedAt). Idempotent re-view is allowed.
// ────────────────────────────────────────────────────────────────────────────

export const markViewed = mutation({
  args: {
    sessionId: v.id("paperSessions"),
    userId: v.id("users"),
    revision: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAuthUserId(ctx, args.userId);

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");
    if (session.userId !== args.userId) throw new Error("Unauthorized");

    const now = Date.now();

    const existing = await ctx.db
      .query("naskahViews")
      .withIndex("by_session_user", (q) =>
        q.eq("sessionId", args.sessionId).eq("userId", args.userId),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastViewedRevision: args.revision,
        viewedAt: now,
      });
      return { upserted: "patched" as const };
    }

    await ctx.db.insert("naskahViews", {
      sessionId: args.sessionId,
      userId: args.userId,
      lastViewedRevision: args.revision,
      viewedAt: now,
    });
    return { upserted: "inserted" as const };
  },
});
