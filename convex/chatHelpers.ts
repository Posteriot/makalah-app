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

// Auth-context query: get current app user ID from auth identity
// No args needed - uses ctx.auth.getUserIdentity()
export const getMyUserId = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity()
        if (!identity) return null
        const user = await ctx.db
            .query("users")
            .withIndex("by_betterAuthUserId", (q) => q.eq("betterAuthUserId", identity.subject))
            .unique()
        return user?._id ?? null
    },
})
