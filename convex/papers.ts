import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"
import { requireAuthUserId } from "./authHelpers"

export const createPaperMetadata = mutationGeneric({
  args: {
    userId: v.id("users"),
    title: v.string(),
    abstract: v.optional(v.string()),
  },
  handler: async (ctx, { userId, title, abstract }) => {
    await requireAuthUserId(ctx, userId)
    const now = Date.now()
    const id = await ctx.db.insert("papers", {
      userId,
      title,
      abstract: abstract ?? "",
      createdAt: now,
      updatedAt: now,
    })
    return id
  },
})

export const listPapersForUser = queryGeneric({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, { userId }) => {
    await requireAuthUserId(ctx, userId)
    const results = await ctx.db
      .query("papers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50)

    return results
  },
})
