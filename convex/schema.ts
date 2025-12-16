import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    role: v.string(), // "superadmin" | "admin" | "user"
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    emailVerified: v.boolean(),
    subscriptionStatus: v.string(), // "free" | "pro" | "canceled" | etc.
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
    updatedAt: v.optional(v.number()),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_role", ["role"])
    .index("by_email", ["email"]),
  papers: defineTable({
    userId: v.id("users"),
    title: v.string(),
    abstract: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId", "createdAt"]),

  conversations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    // Chat title generation metadata (untuk AI rename 2x + lock kalau user rename sendiri)
    titleUpdateCount: v.optional(v.number()),
    titleLocked: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.number(),
  })
    .index("by_user", ["userId", "lastMessageAt"])
    .index("by_user_updated", ["userId", "updatedAt"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    role: v.string(), // "user" | "assistant" | "system"
    content: v.string(),
    createdAt: v.number(),
    fileIds: v.optional(v.array(v.id("files"))),
    metadata: v.optional(v.object({
      model: v.optional(v.string()),
      tokens: v.optional(v.number()),
      finishReason: v.optional(v.string()),
    })),
    sources: v.optional(v.array(v.object({
      url: v.string(),
      title: v.string()
    }))),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_conversation_role", ["conversationId", "role", "createdAt"]),

  files: defineTable({
    userId: v.id("users"),
    conversationId: v.optional(v.id("conversations")),
    messageId: v.optional(v.id("messages")),
    storageId: v.string(),
    name: v.string(),
    type: v.string(),
    size: v.number(),
    status: v.string(), // "uploading" | "processing" | "ready" | "error"
    extractedText: v.optional(v.string()),
    extractionStatus: v.optional(v.string()), // "pending" | "success" | "failed"
    extractionError: v.optional(v.string()),
    processedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId", "createdAt"])
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_message", ["messageId"])
    .index("by_extraction_status", ["extractionStatus"]),

  // System Prompts for AI chat (admin-managed)
  systemPrompts: defineTable({
    name: v.string(), // Display name (e.g., "Default Academic Assistant")
    content: v.string(), // Full prompt text
    description: v.optional(v.string()), // Optional description
    version: v.number(), // Version number (1, 2, 3, ...)
    isActive: v.boolean(), // Only one can be active at a time
    parentId: v.optional(v.id("systemPrompts")), // Link to parent version (null for v1)
    rootId: v.optional(v.id("systemPrompts")), // Link to root prompt (for easier history queries)
    createdBy: v.id("users"), // User who created this version
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["isActive"]) // Query active prompt
    .index("by_root", ["rootId", "version"]) // Query version history
    .index("by_createdAt", ["createdAt"]), // List all by date

  // Artifacts - Standalone deliverable content from AI (non-conversational)
  artifacts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    messageId: v.optional(v.id("messages")), // Which message generated this artifact

    // Artifact metadata
    type: v.union(
      v.literal("code"),
      v.literal("outline"),
      v.literal("section"),
      v.literal("table"),
      v.literal("citation"),
      v.literal("formula")
    ),
    title: v.string(),
    description: v.optional(v.string()),

    // Content
    content: v.string(),
    format: v.optional(v.union(
      v.literal("markdown"),
      v.literal("latex"),
      v.literal("python"),
      v.literal("r"),
      v.literal("javascript"),
      v.literal("typescript")
    )),

    // Versioning (pattern from systemPrompts)
    version: v.number(),
    parentId: v.optional(v.id("artifacts")), // Link to previous version

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_type", ["type"])
    .index("by_user", ["userId", "createdAt"])
    .index("by_parent", ["parentId"]),

  // AI Provider Configurations (admin-managed)
  aiProviderConfigs: defineTable({
    name: v.string(), // Display name (e.g., "Production Config")
    description: v.optional(v.string()), // Optional description

    // Primary Provider Config
    primaryProvider: v.string(), // "vercel-gateway" | "openrouter"
    primaryModel: v.string(), // e.g., "google/gemini-2.5-flash-lite"
    primaryApiKey: v.string(), // API key (stored as-is, DB is private)

    // Fallback Provider Config
    fallbackProvider: v.string(), // "openrouter" | "vercel-gateway"
    fallbackModel: v.string(), // e.g., "google/gemini-2.5-flash-lite"
    fallbackApiKey: v.string(), // API key (stored as-is, DB is private)

    // AI Settings
    temperature: v.number(), // 0.0 - 2.0, default 0.7
    topP: v.optional(v.number()), // Optional: 0.0 - 1.0

    // Versioning & Activation (pattern from systemPrompts)
    version: v.number(), // 1, 2, 3, ...
    isActive: v.boolean(), // Only one active at a time
    parentId: v.optional(v.id("aiProviderConfigs")), // Link to parent version
    rootId: v.optional(v.id("aiProviderConfigs")), // Link to root config

    // Audit Trail
    createdBy: v.id("users"), // Admin who created this version
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["isActive"]) // Query active config
    .index("by_root", ["rootId", "version"]) // Version history
    .index("by_createdAt", ["createdAt"]), // List all by date
})
