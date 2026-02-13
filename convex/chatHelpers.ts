import { v } from "convex/values"
import { query } from "./_generated/server"

export const getUserId = query({
    args: { betterAuthUserId: v.string() },
    handler: async ({ db }, { betterAuthUserId }) => {
        const user = await db
            .query("users")
            .withIndex("by_betterAuthUserId", (q) => q.eq("betterAuthUserId", betterAuthUserId))
            .unique()
        return user?._id ?? null
    },
})
