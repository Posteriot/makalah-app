/**
 * Auth Helper Functions (BetterAuth-based)
 *
 * Uses identity.subject (BetterAuth user ID) to look up users
 * in the Convex users table via by_betterAuthUserId index.
 */

import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

type AnyCtx = QueryCtx | MutationCtx;

/**
 * Get the authenticated user from the Convex users table.
 * Returns null if not authenticated or user not found.
 */
export async function getAuthUser(ctx: AnyCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  // identity.subject = BetterAuth user ID
  const user = await ctx.db
    .query("users")
    .withIndex("by_betterAuthUserId", (q) =>
      q.eq("betterAuthUserId", identity.subject)
    )
    .unique();

  return user ?? null;
}

/**
 * Require an authenticated user. Throws if not authenticated.
 */
export async function requireAuthUser(ctx: AnyCtx): Promise<Doc<"users">> {
  const user = await getAuthUser(ctx);
  if (!user) throw new Error("Unauthorized");
  return user;
}

/**
 * Require that the authenticated user matches the given userId.
 * Throws if not authenticated or userId doesn't match.
 */
export async function requireAuthUserId(ctx: AnyCtx, userId: Id<"users">): Promise<Doc<"users">> {
  const user = await requireAuthUser(ctx);
  if (user._id !== userId) throw new Error("Unauthorized");
  return user;
}

/**
 * Require that the authenticated user owns the given conversation.
 * Throws if not authenticated, conversation not found, or not owner.
 */
export async function requireConversationOwner(ctx: AnyCtx, conversationId: Id<"conversations">) {
  const authUser = await requireAuthUser(ctx);
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) throw new Error("Conversation tidak ditemukan");
  if (conversation.userId !== authUser._id) throw new Error("Tidak memiliki akses ke conversation ini");
  return { authUser, conversation };
}

/**
 * Defensive version: get conversation if the authenticated user owns it.
 * Returns null instead of throwing if auth/ownership checks fail.
 */
export async function getConversationIfOwner(
  ctx: AnyCtx,
  conversationId: Id<"conversations">
): Promise<{ authUser: Doc<"users">; conversation: Doc<"conversations"> } | null> {
  const authUser = await getAuthUser(ctx);
  if (!authUser) return null;
  const conversation = await ctx.db.get(conversationId);
  if (!conversation) return null;
  if (conversation.userId !== authUser._id) return null;
  return { authUser, conversation };
}

/**
 * Require that the authenticated user owns the given paper session.
 * Throws if not authenticated, session not found, or not owner.
 */
export async function requirePaperSessionOwner(ctx: AnyCtx, sessionId: Id<"paperSessions">) {
  const authUser = await requireAuthUser(ctx);
  const session = await ctx.db.get(sessionId);
  if (!session) throw new Error("Session not found");
  if (session.userId !== authUser._id) throw new Error("Unauthorized");
  return { authUser, session };
}

/**
 * Require that the authenticated user owns the given file.
 * Throws if not authenticated, file not found, or not owner.
 */
export async function requireFileOwner(ctx: AnyCtx, fileId: Id<"files">) {
  const authUser = await requireAuthUser(ctx);
  const file = await ctx.db.get(fileId);
  if (!file) throw new Error("File tidak ditemukan");
  if (file.userId !== authUser._id) throw new Error("Unauthorized");
  return { authUser, file };
}
