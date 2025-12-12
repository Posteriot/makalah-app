import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

export type SubscriptionStatus = "free" | "pro" | "canceled"

export const getUserByClerkId = queryGeneric({
  args: { clerkUserId: v.string() },
  handler: async ({ db }, { clerkUserId }) => {
    const user = await db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()
    return user
  },
})

export const createUser = mutationGeneric({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    subscriptionStatus: v.optional(v.string()),
  },
  handler: async (
    { db },
    { clerkUserId, email, subscriptionStatus }
  ): Promise<string> => {
    const existing = await db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique()

    if (existing) {
      return existing._id
    }

    const now = Date.now()

    const id = await db.insert("users", {
      clerkUserId,
      email,
      subscriptionStatus: subscriptionStatus ?? ("free" as SubscriptionStatus),
      createdAt: now,
    })

    return id
  },
})

