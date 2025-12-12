import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    subscriptionStatus: v.string(), // "free" | "pro" | "canceled" | etc.
    createdAt: v.number(),
  }).index("by_clerkUserId", ["clerkUserId"]),
  papers: defineTable({
    userId: v.id("users"),
    title: v.string(),
    abstract: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId", "createdAt"]),
})

