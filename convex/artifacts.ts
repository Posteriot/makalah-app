import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export const artifactTypeValidator = v.union(
  v.literal("code"),
  v.literal("outline"),
  v.literal("section"),
  v.literal("table"),
  v.literal("citation"),
  v.literal("formula")
)

export const artifactFormatValidator = v.optional(v.union(
  v.literal("markdown"),
  v.literal("latex"),
  v.literal("python"),
  v.literal("r"),
  v.literal("javascript"),
  v.literal("typescript")
))

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a single artifact by ID
 * Requires userId for permission check
 */
export const get = queryGeneric({
  args: {
    artifactId: v.id("artifacts"),
    userId: v.id("users"),
  },
  handler: async ({ db }, { artifactId, userId }) => {
    const artifact = await db.get(artifactId)
    if (!artifact) {
      return null
    }

    // Permission check: user must own the artifact
    if (artifact.userId !== userId) {
      throw new Error("Tidak memiliki akses ke artifact ini")
    }

    return artifact
  },
})

/**
 * List artifacts by conversation
 * Optional filter by type
 */
export const listByConversation = queryGeneric({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    type: v.optional(artifactTypeValidator),
  },
  handler: async ({ db }, { conversationId, userId, type }) => {
    // Verify conversation exists and user owns it
    const conversation = await db.get(conversationId)
    if (!conversation) {
      throw new Error("Conversation tidak ditemukan")
    }
    if (conversation.userId !== userId) {
      throw new Error("Tidak memiliki akses ke conversation ini")
    }

    // Query artifacts
    const artifacts = await db
      .query("artifacts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
      .order("desc")
      .collect()

    // Filter by type if specified
    if (type) {
      return artifacts.filter((a) => a.type === type)
    }

    return artifacts
  },
})

/**
 * List all artifacts for a user
 * Used for global artifact view
 */
export const listByUser = queryGeneric({
  args: {
    userId: v.id("users"),
    type: v.optional(artifactTypeValidator),
    limit: v.optional(v.number()),
  },
  handler: async ({ db }, { userId, type, limit }) => {
    const artifacts = await db
      .query("artifacts")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect()

    // Filter by type if specified
    let filtered = type ? artifacts.filter((a) => a.type === type) : artifacts

    // Apply limit if specified
    if (limit && limit > 0) {
      filtered = filtered.slice(0, limit)
    }

    return filtered
  },
})

/**
 * Get version history for an artifact
 * Traverses parentId chain to get all versions
 */
export const getVersionHistory = queryGeneric({
  args: {
    artifactId: v.id("artifacts"),
    userId: v.id("users"),
  },
  handler: async ({ db }, { artifactId, userId }) => {
    const artifact = await db.get(artifactId)
    if (!artifact) {
      throw new Error("Artifact tidak ditemukan")
    }

    // Permission check
    if (artifact.userId !== userId) {
      throw new Error("Tidak memiliki akses ke artifact ini")
    }

    // Find root artifact (traverse up parentId chain)
    let currentId = artifactId
    let current = artifact
    while (current.parentId) {
      const parent = await db.get(current.parentId)
      if (!parent) break
      currentId = current.parentId
      current = parent
    }
    const rootId = currentId

    // Get all artifacts in this conversation
    const allArtifacts = await db
      .query("artifacts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", artifact.conversationId))
      .collect()

    // Filter to get only versions in this chain
    const chainArtifacts = allArtifacts.filter((a) => {
      // It's part of chain if it's the root or has rootId as ancestor
      let check = a
      while (check) {
        if (check._id === rootId) return true
        if (!check.parentId) return false
        const parent = allArtifacts.find((p) => p._id === check.parentId)
        if (!parent) return false
        check = parent
      }
      return false
    })

    // Sort by version number
    chainArtifacts.sort((a, b) => a.version - b.version)

    return chainArtifacts
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new artifact
 * Called by AI tool or manually
 */
export const create = mutationGeneric({
  args: {
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    messageId: v.optional(v.id("messages")),
    type: artifactTypeValidator,
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    format: artifactFormatValidator,
  },
  handler: async (
    { db },
    { conversationId, userId, messageId, type, title, description, content, format }
  ) => {
    // Verify conversation exists and user owns it
    const conversation = await db.get(conversationId)
    if (!conversation) {
      throw new Error("Conversation tidak ditemukan")
    }
    if (conversation.userId !== userId) {
      throw new Error("Tidak memiliki akses ke conversation ini")
    }

    // Validate title
    if (!title.trim()) {
      throw new Error("Judul artifact tidak boleh kosong")
    }

    // Validate content
    if (!content.trim()) {
      throw new Error("Konten artifact tidak boleh kosong")
    }

    const now = Date.now()

    // Create artifact (v1)
    const artifactId = await db.insert("artifacts", {
      conversationId,
      userId,
      messageId,
      type,
      title: title.trim(),
      description: description?.trim(),
      content: content.trim(),
      format,
      version: 1,
      parentId: undefined,
      createdAt: now,
      updatedAt: now,
    })

    return { artifactId }
  },
})

/**
 * Update artifact (creates new version)
 * Preserves version history via parentId chain
 */
export const update = mutationGeneric({
  args: {
    artifactId: v.id("artifacts"),
    userId: v.id("users"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    content: v.string(),
    format: artifactFormatValidator,
  },
  handler: async ({ db }, { artifactId, userId, title, description, content, format }) => {
    const oldArtifact = await db.get(artifactId)
    if (!oldArtifact) {
      throw new Error("Artifact tidak ditemukan")
    }

    // Permission check
    if (oldArtifact.userId !== userId) {
      throw new Error("Tidak memiliki akses ke artifact ini")
    }

    // Validate content
    if (!content.trim()) {
      throw new Error("Konten artifact tidak boleh kosong")
    }

    const now = Date.now()
    const newVersion = oldArtifact.version + 1

    // Create new version
    const newArtifactId = await db.insert("artifacts", {
      conversationId: oldArtifact.conversationId,
      userId: oldArtifact.userId,
      messageId: oldArtifact.messageId,
      type: oldArtifact.type,
      title: title?.trim() ?? oldArtifact.title,
      description: description?.trim() ?? oldArtifact.description,
      content: content.trim(),
      format: format ?? oldArtifact.format,
      version: newVersion,
      parentId: artifactId, // Link to previous version
      createdAt: now,
      updatedAt: now,
    })

    return {
      artifactId: newArtifactId,
      version: newVersion,
    }
  },
})

/**
 * Delete a single artifact
 */
export const remove = mutationGeneric({
  args: {
    artifactId: v.id("artifacts"),
    userId: v.id("users"),
  },
  handler: async ({ db }, { artifactId, userId }) => {
    const artifact = await db.get(artifactId)
    if (!artifact) {
      throw new Error("Artifact tidak ditemukan")
    }

    // Permission check
    if (artifact.userId !== userId) {
      throw new Error("Tidak memiliki akses ke artifact ini")
    }

    // Check if this artifact has children (newer versions)
    const children = await db
      .query("artifacts")
      .withIndex("by_parent", (q) => q.eq("parentId", artifactId))
      .collect()

    if (children.length > 0) {
      throw new Error("Tidak bisa menghapus artifact yang memiliki versi lebih baru. Hapus versi terbaru terlebih dahulu.")
    }

    await db.delete(artifactId)

    return { message: "Artifact berhasil dihapus" }
  },
})

/**
 * Delete entire artifact chain (all versions)
 */
export const removeChain = mutationGeneric({
  args: {
    artifactId: v.id("artifacts"),
    userId: v.id("users"),
  },
  handler: async ({ db }, { artifactId, userId }) => {
    const artifact = await db.get(artifactId)
    if (!artifact) {
      throw new Error("Artifact tidak ditemukan")
    }

    // Permission check
    if (artifact.userId !== userId) {
      throw new Error("Tidak memiliki akses ke artifact ini")
    }

    // Find root artifact
    let currentId = artifactId
    let current = artifact
    while (current.parentId) {
      const parent = await db.get(current.parentId)
      if (!parent) break
      currentId = current.parentId
      current = parent
    }
    const rootId = currentId

    // Get all artifacts in conversation for chain traversal
    const allArtifacts = await db
      .query("artifacts")
      .withIndex("by_conversation", (q) => q.eq("conversationId", artifact.conversationId))
      .collect()

    // Find all versions in this chain
    const chainIds: typeof artifactId[] = []
    const findChainMembers = (id: typeof artifactId) => {
      chainIds.push(id)
      // Find children
      const children = allArtifacts.filter((a) => a.parentId === id)
      for (const child of children) {
        findChainMembers(child._id)
      }
    }
    findChainMembers(rootId)

    // Delete all versions
    for (const id of chainIds) {
      await db.delete(id)
    }

    return { message: `${chainIds.length} versi artifact berhasil dihapus` }
  },
})
