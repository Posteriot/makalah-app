import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

export const createPaperMetadata = mutationGeneric({
  args: {
    userId: v.id("users"),
    title: v.string(),
    abstract: v.optional(v.string()),
  },
  handler: async ({ db }, { userId, title, abstract }) => {
    const now = Date.now()
    const id = await db.insert("papers", {
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
  handler: async ({ db }, { userId }) => {
    const results = await db
      .query("papers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50)

    return results
  },
})

