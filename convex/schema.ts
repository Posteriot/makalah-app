import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"
import {
  DiskusiData,
  HasilData,
  KesimpulanData,
  DaftarPustakaData,
  LampiranData,
  JudulData,
  OutlineData,
  ElaborasiData,
} from "./paperSessions/types"

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
      title: v.string(),
      publishedAt: v.optional(v.number()),
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

  // Paper Writing Workflow Sessions
  paperSessions: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),

    // Workflow State
    currentStage: v.string(), // PaperStage enum (gagasan, topik, etc.)
    stageStatus: v.string(), // StageStatus (drafting, pending_validation, approved, revision)

    // Accumulated data for all 14 stages
    stageData: v.object({
      // Phase 1: Foundation Stages
      gagasan: v.optional(v.object({
        ideKasar: v.optional(v.string()), // Optional: may not exist during initial revision
        analisis: v.optional(v.string()),
        angle: v.optional(v.string()),
        novelty: v.optional(v.string()),
        referensiAwal: v.optional(v.array(v.object({
          title: v.string(),
          authors: v.optional(v.string()),
          year: v.optional(v.number()),
          url: v.optional(v.string()),
        }))),
        artifactId: v.optional(v.id("artifacts")),
        validatedAt: v.optional(v.number()),
        revisionCount: v.optional(v.number()),
      })),
      topik: v.optional(v.object({
        definitif: v.optional(v.string()), // Optional: may not exist during initial revision
        angleSpesifik: v.optional(v.string()),
        argumentasiKebaruan: v.optional(v.string()),
        researchGap: v.optional(v.string()), // Gap spesifik yang akan diisi
        referensiPendukung: v.optional(v.array(v.object({
          title: v.string(),
          authors: v.optional(v.string()),
          year: v.optional(v.number()),
          url: v.optional(v.string()),
        }))),
        artifactId: v.optional(v.id("artifacts")),
        validatedAt: v.optional(v.number()),
        revisionCount: v.optional(v.number()),
      })),

      // Phase 2: Core Stages
      abstrak: v.optional(v.object({
        ringkasanPenelitian: v.optional(v.string()),
        keywords: v.optional(v.array(v.string())),
        wordCount: v.optional(v.number()),
        artifactId: v.optional(v.id("artifacts")),
        validatedAt: v.optional(v.number()),
        revisionCount: v.optional(v.number()),
      })),
      pendahuluan: v.optional(v.object({
        latarBelakang: v.optional(v.string()),
        rumusanMasalah: v.optional(v.string()),
        researchGapAnalysis: v.optional(v.string()),
        tujuanPenelitian: v.optional(v.string()),
        signifikansiPenelitian: v.optional(v.string()), // Mengapa penelitian ini penting
        hipotesis: v.optional(v.string()), // Hipotesis atau pertanyaan penelitian
        sitasiAPA: v.optional(v.array(v.object({
          inTextCitation: v.string(),
          fullReference: v.string(),
          url: v.optional(v.string()),
        }))),
        artifactId: v.optional(v.id("artifacts")),
        validatedAt: v.optional(v.number()),
        revisionCount: v.optional(v.number()),
      })),
      tinjauan_literatur: v.optional(v.object({
        kerangkaTeoretis: v.optional(v.string()),
        reviewLiteratur: v.optional(v.string()),
        gapAnalysis: v.optional(v.string()),
        justifikasiPenelitian: v.optional(v.string()), // Mengapa penelitian ini diperlukan
        referensi: v.optional(v.array(v.object({
          title: v.string(),
          authors: v.optional(v.string()),
          year: v.optional(v.number()),
          url: v.optional(v.string()),
          inTextCitation: v.string(),
          isFromPhase1: v.boolean(),
        }))),
        artifactId: v.optional(v.id("artifacts")),
        validatedAt: v.optional(v.number()),
        revisionCount: v.optional(v.number()),
      })),
      metodologi: v.optional(v.object({
        desainPenelitian: v.optional(v.string()),
        metodePerolehanData: v.optional(v.string()),
        teknikAnalisis: v.optional(v.string()),
        etikaPenelitian: v.optional(v.string()),
        alatInstrumen: v.optional(v.string()), // Alat atau instrumen penelitian
        pendekatanPenelitian: v.optional(v.union(
          v.literal("kualitatif"),
          v.literal("kuantitatif"),
          v.literal("mixed")
        )),
        artifactId: v.optional(v.id("artifacts")),
        validatedAt: v.optional(v.number()),
        revisionCount: v.optional(v.number()),
      })),

      // Phase 3: Results & Analysis
      hasil: v.optional(HasilData),
      diskusi: v.optional(DiskusiData),
      kesimpulan: v.optional(KesimpulanData),

      // Phase 4: Finalization
      daftar_pustaka: v.optional(DaftarPustakaData),
      lampiran: v.optional(LampiranData),
      judul: v.optional(JudulData),
      outline: v.optional(OutlineData),
      elaborasi: v.optional(ElaborasiData),
    }),

    // Paper metadata (Phase 5)
    paperTitle: v.optional(v.string()),
    archivedAt: v.optional(v.number()), // Soft delete timestamp untuk archive

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_stage", ["currentStage", "stageStatus"])
    .index("by_user_archived", ["userId", "archivedAt"]), // Filter archived sessions
})
