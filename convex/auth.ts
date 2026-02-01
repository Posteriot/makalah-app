import type { MutationCtx, QueryCtx } from "./_generated/server"
import type { Doc, Id } from "./_generated/dataModel"

type AnyCtx = QueryCtx | MutationCtx

async function getUserByClerkId(ctx: AnyCtx, clerkUserId: string) {
  return await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
    .unique()
}

/**
 * Ambil user yang sedang login berdasarkan identity Convex.
 * Return null kalau tidak ada identity atau user belum tersinkron.
 */
export async function getAuthUser(ctx: AnyCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null
  const user = await getUserByClerkId(ctx, identity.subject)
  return user ?? null
}

/**
 * Wajib ada identity + user Convex yang cocok.
 */
export async function requireAuthUser(ctx: AnyCtx): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error("Unauthorized")
  }

  const user = await getUserByClerkId(ctx, identity.subject)
  if (!user) {
    throw new Error("User not found")
  }

  return user
}

/**
 * Validasi bahwa userId yang dikirim client sama dengan identity yang login.
 */
export async function requireAuthUserId(
  ctx: AnyCtx,
  userId: Id<"users">
): Promise<Doc<"users">> {
  const authUser = await requireAuthUser(ctx)
  if (authUser._id !== userId) {
    throw new Error("Unauthorized")
  }
  return authUser
}

/**
 * Validasi ownership conversation berdasarkan identity yang login.
 */
export async function requireConversationOwner(
  ctx: AnyCtx,
  conversationId: Id<"conversations">
) {
  const authUser = await requireAuthUser(ctx)
  const conversation = await ctx.db.get(conversationId)
  if (!conversation) {
    throw new Error("Conversation tidak ditemukan")
  }
  if (conversation.userId !== authUser._id) {
    throw new Error("Tidak memiliki akses ke conversation ini")
  }
  return { authUser, conversation }
}

/**
 * Defensive version: Return conversation + authUser if owner, null otherwise.
 * Use this for queries where unauthorized access should return null, not throw.
 */
export async function getConversationIfOwner(
  ctx: AnyCtx,
  conversationId: Id<"conversations">
): Promise<{ authUser: Doc<"users">; conversation: Doc<"conversations"> } | null> {
  const authUser = await getAuthUser(ctx)
  if (!authUser) return null

  const conversation = await ctx.db.get(conversationId)
  if (!conversation) return null
  if (conversation.userId !== authUser._id) return null

  return { authUser, conversation }
}

/**
 * Validasi ownership paper session berdasarkan identity yang login.
 */
export async function requirePaperSessionOwner(
  ctx: AnyCtx,
  sessionId: Id<"paperSessions">
) {
  const authUser = await requireAuthUser(ctx)
  const session = await ctx.db.get(sessionId)
  if (!session) {
    throw new Error("Session not found")
  }
  if (session.userId !== authUser._id) {
    throw new Error("Unauthorized")
  }
  return { authUser, session }
}

/**
 * Validasi ownership file berdasarkan identity yang login.
 */
export async function requireFileOwner(ctx: AnyCtx, fileId: Id<"files">) {
  const authUser = await requireAuthUser(ctx)
  const file = await ctx.db.get(fileId)
  if (!file) {
    throw new Error("File tidak ditemukan")
  }
  if (file.userId !== authUser._id) {
    throw new Error("Unauthorized")
  }
  return { authUser, file }
}

