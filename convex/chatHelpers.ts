import { v } from "convex/values"
import { query } from "./_generated/server"

export const getUserId = query({
    args: { clerkUserId: v.string() },
    handler: async ({ db }, { clerkUserId }) => {
        const user = await db
            .query("users")
            .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
            .unique()
        return user?._id ?? null
    },
})
