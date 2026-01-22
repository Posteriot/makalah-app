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
} from "./paperSessions/types"

const documentationListItem = v.object({
  text: v.string(),
  subItems: v.optional(v.array(v.string())),
})

const documentationList = v.object({
  variant: v.union(v.literal("bullet"), v.literal("numbered")),
  items: v.array(documentationListItem),
})

const documentationBlock = v.union(
  v.object({
    type: v.literal("infoCard"),
    title: v.string(),
    description: v.optional(v.string()),
    items: v.array(v.string()),
  }),
  v.object({
    type: v.literal("ctaCards"),
    items: v.array(v.object({
      title: v.string(),
      description: v.string(),
      targetSection: v.string(),
      ctaText: v.string(),
      icon: v.optional(v.string()),
    })),
  }),
  v.object({
    type: v.literal("section"),
    title: v.string(),
    description: v.optional(v.string()),
    paragraphs: v.optional(v.array(v.string())),
    list: v.optional(documentationList),
  })
)

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

  // Style Constitutions for Refrasa tool (admin-managed)
  // Two-layer architecture: Layer 1 (Core Naturalness) hardcoded in prompt-builder,
  // Layer 2 (Style Constitution) editable via this table
  styleConstitutions: defineTable({
    name: v.string(), // Display name (e.g., "Makalah Style Constitution")
    content: v.string(), // Full constitution content (markdown)
    description: v.optional(v.string()), // Optional description
    version: v.number(), // Version number (1, 2, 3, ...)
    isActive: v.boolean(), // Only one can be active at a time
    parentId: v.optional(v.id("styleConstitutions")), // Link to parent version (null for v1)
    rootId: v.optional(v.id("styleConstitutions")), // Link to root constitution (for easier history queries)
    createdBy: v.id("users"), // User who created this version
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_active", ["isActive"]) // Query active constitution
    .index("by_root", ["rootId", "version"]) // Query version history
    .index("by_createdAt", ["createdAt"]), // List all by date

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

    // Web sources (from web search) - same structure as messages.sources
    sources: v.optional(v.array(v.object({
      url: v.string(),
      title: v.string(),
      publishedAt: v.optional(v.number()),
    }))),

    // Versioning (pattern from systemPrompts)
    version: v.number(),
    parentId: v.optional(v.id("artifacts")), // Link to previous version

    // ════════════════════════════════════════════════════════════════
    // Rewind Feature: Artifact Invalidation Tracking
    // ════════════════════════════════════════════════════════════════
    invalidatedAt: v.optional(v.number()), // Timestamp when invalidated by rewind
    invalidatedByRewindToStage: v.optional(v.string()), // Stage that triggered invalidation

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_type", ["type"])
    .index("by_user", ["userId", "createdAt"])
    .index("by_parent", ["parentId"]),

  // System Alerts for monitoring (admin panel)
  systemAlerts: defineTable({
    alertType: v.string(), // "fallback_activated", "prompt_missing", "database_error", etc.
    severity: v.union(
      v.literal("info"),
      v.literal("warning"),
      v.literal("critical")
    ),
    message: v.string(),
    source: v.string(), // "chat-api", "admin-panel", etc.
    resolved: v.boolean(),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
    metadata: v.optional(v.any()), // Additional context (reason, error, etc.)
    createdAt: v.number(),
  })
    .index("by_type", ["alertType", "createdAt"])
    .index("by_severity", ["severity", "resolved", "createdAt"])
    .index("by_resolved", ["resolved", "createdAt"]),

  // AI Provider Configurations (admin-managed)
  aiProviderConfigs: defineTable({
    name: v.string(), // Display name (e.g., "Production Config")
    description: v.optional(v.string()), // Optional description

    // Primary Provider Config
    primaryProvider: v.string(), // "vercel-gateway" | "openrouter"
    primaryModel: v.string(), // e.g., "google/gemini-2.5-flash-lite"

    // Fallback Provider Config
    fallbackProvider: v.string(), // "openrouter" | "vercel-gateway"
    fallbackModel: v.string(), // e.g., "google/gemini-2.5-flash-lite"

    // Provider API keys (global per provider)
    gatewayApiKey: v.optional(v.string()), // Vercel AI Gateway key (stored as-is)
    openrouterApiKey: v.optional(v.string()), // OpenRouter key (stored as-is)

    // Legacy slot-based keys (kept for backward compatibility)
    primaryApiKey: v.optional(v.string()),
    fallbackApiKey: v.optional(v.string()),

    // AI Settings
    temperature: v.number(), // 0.0 - 2.0, default 0.7
    topP: v.optional(v.number()), // Optional: 0.0 - 1.0
    maxTokens: v.optional(v.number()), // Optional: max output tokens

    // ════════════════════════════════════════════════════════════════
    // Web Search Settings (Phase 4 - OpenRouter :online fallback)
    // ════════════════════════════════════════════════════════════════
    primaryWebSearchEnabled: v.optional(v.boolean()), // Enable web search for primary (default: true)
    fallbackWebSearchEnabled: v.optional(v.boolean()), // Enable web search for fallback :online (default: true)
    fallbackWebSearchEngine: v.optional(v.string()), // "native" | "exa" | "auto" (default: "auto")
    fallbackWebSearchMaxResults: v.optional(v.number()), // Max search results (default: 5, range: 1-10)

    // ════════════════════════════════════════════════════════════════
    // Tool Visibility Settings (Admin maintenance toggle)
    // ════════════════════════════════════════════════════════════════
    isRefrasaEnabled: v.optional(v.boolean()), // Show/hide Refrasa button in artifact (default: true)

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

    // Accumulated data for all 13 stages
    stageData: v.object({
      // Phase 1: Foundation Stages
      gagasan: v.optional(v.object({
        ringkasan: v.optional(v.string()),
        ideKasar: v.optional(v.string()), // Optional: may not exist during initial revision
        analisis: v.optional(v.string()),
        angle: v.optional(v.string()),
        novelty: v.optional(v.string()),
        referensiAwal: v.optional(v.array(v.object({
          title: v.string(),
          authors: v.optional(v.string()),
          year: v.optional(v.number()),
          url: v.optional(v.string()),
          publishedAt: v.optional(v.number()), // Timestamp from google_search
        }))),
        artifactId: v.optional(v.id("artifacts")),
        validatedAt: v.optional(v.number()),
        revisionCount: v.optional(v.number()),
      })),
      topik: v.optional(v.object({
        ringkasan: v.optional(v.string()),
        definitif: v.optional(v.string()), // Optional: may not exist during initial revision
        angleSpesifik: v.optional(v.string()),
        argumentasiKebaruan: v.optional(v.string()),
        researchGap: v.optional(v.string()), // Gap spesifik yang akan diisi
        referensiPendukung: v.optional(v.array(v.object({
          title: v.string(),
          authors: v.optional(v.string()),
          year: v.optional(v.number()),
          url: v.optional(v.string()),
          publishedAt: v.optional(v.number()), // Timestamp from google_search
        }))),
        artifactId: v.optional(v.id("artifacts")),
        validatedAt: v.optional(v.number()),
        revisionCount: v.optional(v.number()),
      })),

      // Phase 2: Outline Stage
      outline: v.optional(OutlineData),

      // Phase 3: Core Stages
      abstrak: v.optional(v.object({
        ringkasan: v.optional(v.string()),
        ringkasanPenelitian: v.optional(v.string()),
        keywords: v.optional(v.array(v.string())),
        wordCount: v.optional(v.number()),
        artifactId: v.optional(v.id("artifacts")),
        validatedAt: v.optional(v.number()),
        revisionCount: v.optional(v.number()),
      })),
      pendahuluan: v.optional(v.object({
        ringkasan: v.optional(v.string()),
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
        ringkasan: v.optional(v.string()),
        kerangkaTeoretis: v.optional(v.string()),
        reviewLiteratur: v.optional(v.string()),
        gapAnalysis: v.optional(v.string()),
        justifikasiPenelitian: v.optional(v.string()), // Mengapa penelitian ini diperlukan
        referensi: v.optional(v.array(v.object({
          title: v.string(),
          authors: v.optional(v.string()),
          year: v.optional(v.number()),
          url: v.optional(v.string()),
          publishedAt: v.optional(v.number()), // Timestamp from google_search
          inTextCitation: v.string(),
          isFromPhase1: v.boolean(),
        }))),
        artifactId: v.optional(v.id("artifacts")),
        validatedAt: v.optional(v.number()),
        revisionCount: v.optional(v.number()),
      })),
      metodologi: v.optional(v.object({
        ringkasan: v.optional(v.string()),
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

      // Phase 4: Results & Analysis
      hasil: v.optional(HasilData),
      diskusi: v.optional(DiskusiData),
      kesimpulan: v.optional(KesimpulanData),

      // Phase 5: Finalization
      daftar_pustaka: v.optional(DaftarPustakaData),
      lampiran: v.optional(LampiranData),
      judul: v.optional(JudulData),
    }),

    // Paper metadata (Phase 5)
    paperTitle: v.optional(v.string()),
    archivedAt: v.optional(v.number()), // Soft delete timestamp untuk archive

    // ════════════════════════════════════════════════════════════════
    // Phase 3 Task 3.1.1: Dirty Flag for Edit/Regenerate Sync
    // ════════════════════════════════════════════════════════════════
    isDirty: v.optional(v.boolean()), // True when chat edited/regenerated after stageData update

    // ════════════════════════════════════════════════════════════════
    // Phase 3 Task 3.2.1: Paper Memory Digest (Optional)
    // ════════════════════════════════════════════════════════════════
    paperMemoryDigest: v.optional(v.array(v.object({
      stage: v.string(),
      decision: v.string(),
      timestamp: v.number(),
      // Rewind Feature: Mark entry as superseded when stage is rewound
      superseded: v.optional(v.boolean()), // true = decision replaced by rewind
    }))),

    // ════════════════════════════════════════════════════════════════
    // Phase 3 Task 3.3.1: Estimated Content Tracking
    // ════════════════════════════════════════════════════════════════
    estimatedContentChars: v.optional(v.number()), // Total chars of validated content
    estimatedTokenUsage: v.optional(v.number()), // Estimated tokens (chars / 4)

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_conversation", ["conversationId"])
    .index("by_user_updated", ["userId", "updatedAt"])
    .index("by_stage", ["currentStage", "stageStatus"])
    .index("by_user_archived", ["userId", "archivedAt"]), // Filter archived sessions

  // ════════════════════════════════════════════════════════════════
  // Rewind History - Audit trail for stage rewind operations
  // ════════════════════════════════════════════════════════════════
  rewindHistory: defineTable({
    sessionId: v.id("paperSessions"),
    userId: v.id("users"),

    // Rewind details
    fromStage: v.string(), // Stage before rewind (e.g., "outline")
    toStage: v.string(), // Target stage (e.g., "topik")

    // Affected artifacts
    invalidatedArtifactIds: v.array(v.id("artifacts")), // Artifacts that were invalidated

    // Invalidated stages (for reference)
    invalidatedStages: v.optional(v.array(v.string())), // e.g., ["topik", "outline"]

    // Timestamps
    createdAt: v.number(),
  })
    .index("by_session", ["sessionId", "createdAt"])
    .index("by_user", ["userId", "createdAt"]),

  // ════════════════════════════════════════════════════════════════
  // Pricing Plans - Marketing page pricing tiers
  // ════════════════════════════════════════════════════════════════
  pricingPlans: defineTable({
    name: v.string(), // Plan name (e.g., "Gratis", "Bayar Per Tugas", "Pro")
    slug: v.string(), // URL-safe identifier (e.g., "gratis", "bpp", "pro")
    price: v.string(), // Display price (e.g., "Rp.0", "Rpxx.xxx")
    priceValue: v.optional(v.number()), // Numeric price value for sorting/comparison
    unit: v.optional(v.string()), // Price unit (e.g., "per paper", "per bulan")
    tagline: v.string(), // Short description
    features: v.array(v.string()), // List of feature descriptions
    isHighlighted: v.boolean(), // Highlight this plan (border brand)
    isDisabled: v.boolean(), // Plan not yet available
    ctaText: v.string(), // Button text (e.g., "Coba Gratis", "Belum Aktif")
    ctaHref: v.optional(v.string()), // Button link (null for disabled)
    sortOrder: v.number(), // Display order (1, 2, 3...)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_sortOrder", ["sortOrder"])
    .index("by_slug", ["slug"]),

  // ════════════════════════════════════════════════════════════════
  // Documentation Sections - Marketing documentation content
  // ════════════════════════════════════════════════════════════════
  documentationSections: defineTable({
    slug: v.string(), // "welcome", "installation", etc.
    title: v.string(),
    group: v.string(), // "Mulai" | "Fitur Utama" | "Panduan Lanjutan"
    order: v.number(),
    icon: v.optional(v.string()), // Sidebar icon key
    headerIcon: v.optional(v.string()), // Optional header icon key
    summary: v.optional(v.string()), // Section intro text
    blocks: v.array(documentationBlock),
    searchText: v.string(),
    isPublished: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_order", ["order"])
    .index("by_slug", ["slug"])
    .index("by_published", ["isPublished", "order"]),

  // ════════════════════════════════════════════════════════════════
  // Blog Sections - Marketing blog content
  // ════════════════════════════════════════════════════════════════
  blogSections: defineTable({
    slug: v.string(), // URL-safe identifier
    title: v.string(),
    excerpt: v.string(),
    author: v.string(),
    category: v.string(),
    readTime: v.string(),
    featured: v.boolean(),
    isPublished: v.boolean(),
    publishedAt: v.number(),
    blocks: v.array(documentationBlock),
    coverImage: v.optional(v.string()), // Optional cover image URL
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_published", ["isPublished", "publishedAt"])
    .index("by_slug", ["slug"])
    .index("by_category", ["category", "isPublished", "publishedAt"])
    .index("by_featured", ["featured", "isPublished", "publishedAt"]),
})
