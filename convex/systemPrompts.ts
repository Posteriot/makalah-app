import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"
import { requireRole } from "./permissions"
import { Id } from "./_generated/dataModel"

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the currently active system prompt
 * Used by chat API - no auth required for reading active prompt
 */
export const getActiveSystemPrompt = queryGeneric({
  args: {},
  handler: async ({ db }) => {
    const active = await db
      .query("systemPrompts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    return active
  },
})

/**
 * List all system prompts (latest versions only)
 * Admin/superadmin only
 */
export const listSystemPrompts = queryGeneric({
  args: { requestorUserId: v.id("users") },
  handler: async ({ db }, { requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    // Get all prompts ordered by createdAt desc
    const allPrompts = await db
      .query("systemPrompts")
      .withIndex("by_createdAt")
      .order("desc")
      .collect()

    // Group by rootId (or self if rootId is undefined) and keep only latest version
    const latestByRoot = new Map<string, typeof allPrompts[0]>()

    for (const prompt of allPrompts) {
      // For v1 prompts, rootId is undefined, so we use the prompt's own ID as key
      const rootKey = prompt.rootId ?? prompt._id

      if (!latestByRoot.has(rootKey)) {
        // First entry is latest since we ordered by createdAt desc
        latestByRoot.set(rootKey, prompt)
      }
    }

    // Convert to array and sort by createdAt desc
    const latestVersions = Array.from(latestByRoot.values())
    latestVersions.sort((a, b) => b.createdAt - a.createdAt)

    // Fetch creator info for each prompt
    const promptsWithCreator = await Promise.all(
      latestVersions.map(async (prompt) => {
        const creator = await db.get(prompt.createdBy)
        return {
          ...prompt,
          creatorEmail: creator?.email ?? "Unknown",
        }
      })
    )

    return promptsWithCreator
  },
})

/**
 * Get version history for a prompt chain
 * Admin/superadmin only
 */
export const getPromptVersionHistory = queryGeneric({
  args: {
    promptId: v.id("systemPrompts"),
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { promptId, requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const prompt = await db.get(promptId)
    if (!prompt) {
      throw new Error("Prompt tidak ditemukan")
    }

    // Determine rootId - for v1 prompts, use their own ID
    const rootId = prompt.rootId ?? promptId

    // Get all prompts in this chain
    // First, get the v1 prompt (which has rootId undefined and _id = rootId)
    const v1Prompt = await db.get(rootId as Id<"systemPrompts">)

    // Then get all subsequent versions (which have rootId = rootId)
    const subsequentVersions = await db
      .query("systemPrompts")
      .withIndex("by_root", (q) => q.eq("rootId", rootId as Id<"systemPrompts">))
      .order("asc")
      .collect()

    // Combine v1 with subsequent versions
    const allVersions = v1Prompt ? [v1Prompt, ...subsequentVersions] : subsequentVersions

    // Sort by version number ascending
    allVersions.sort((a, b) => a.version - b.version)

    // Fetch creator info for each version
    const versionsWithCreator = await Promise.all(
      allVersions.map(async (version) => {
        const creator = await db.get(version.createdBy)
        return {
          ...version,
          creatorEmail: creator?.email ?? "Unknown",
        }
      })
    )

    return versionsWithCreator
  },
})

/**
 * Get a single prompt by ID
 * Admin/superadmin only
 */
export const getSystemPromptById = queryGeneric({
  args: {
    promptId: v.id("systemPrompts"),
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { promptId, requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const prompt = await db.get(promptId)
    if (!prompt) {
      throw new Error("Prompt tidak ditemukan")
    }

    const creator = await db.get(prompt.createdBy)
    return {
      ...prompt,
      creatorEmail: creator?.email ?? "Unknown",
    }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new system prompt (v1)
 * Admin/superadmin only
 */
export const createSystemPrompt = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    name: v.string(),
    content: v.string(),
    description: v.optional(v.string()),
  },
  handler: async ({ db }, { requestorUserId, name, content, description }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    // Validate
    if (!name.trim()) {
      throw new Error("Nama prompt tidak boleh kosong")
    }
    if (!content.trim()) {
      throw new Error("Konten prompt tidak boleh kosong")
    }

    const now = Date.now()

    // Create v1 prompt (rootId and parentId are undefined for v1)
    const promptId = await db.insert("systemPrompts", {
      name: name.trim(),
      content: content.trim(),
      description: description?.trim(),
      version: 1,
      isActive: false, // Not active by default
      parentId: undefined,
      rootId: undefined, // v1 prompts have no rootId
      createdBy: requestorUserId,
      createdAt: now,
      updatedAt: now,
    })

    return { promptId, message: "Prompt berhasil dibuat" }
  },
})

/**
 * Update a system prompt (creates new version)
 * Admin/superadmin only
 */
export const updateSystemPrompt = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    promptId: v.id("systemPrompts"),
    content: v.string(),
    description: v.optional(v.string()),
  },
  handler: async ({ db }, { requestorUserId, promptId, content, description }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const oldPrompt = await db.get(promptId)
    if (!oldPrompt) {
      throw new Error("Prompt tidak ditemukan")
    }

    // Validate
    if (!content.trim()) {
      throw new Error("Konten prompt tidak boleh kosong")
    }

    const now = Date.now()
    const newVersion = oldPrompt.version + 1

    // Determine rootId - for v1 prompts, use their own ID as rootId for children
    const rootId = oldPrompt.rootId ?? promptId

    // Create new version
    const newPromptId = await db.insert("systemPrompts", {
      name: oldPrompt.name, // Keep same name
      content: content.trim(),
      description: description?.trim() ?? oldPrompt.description,
      version: newVersion,
      isActive: oldPrompt.isActive, // Inherit active status
      parentId: promptId, // Link to previous version
      rootId: rootId, // Link to root prompt
      createdBy: requestorUserId,
      createdAt: now,
      updatedAt: now,
    })

    // Deactivate old version if it was active
    if (oldPrompt.isActive) {
      await db.patch(promptId, { isActive: false, updatedAt: now })
    }

    return {
      promptId: newPromptId,
      version: newVersion,
      message: `Prompt berhasil diupdate ke versi ${newVersion}`,
    }
  },
})

/**
 * Activate a system prompt (deactivates all others)
 * Admin/superadmin only
 */
export const activateSystemPrompt = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    promptId: v.id("systemPrompts"),
  },
  handler: async ({ db }, { requestorUserId, promptId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const targetPrompt = await db.get(promptId)
    if (!targetPrompt) {
      throw new Error("Prompt tidak ditemukan")
    }

    if (targetPrompt.isActive) {
      return { message: "Prompt sudah aktif" }
    }

    const now = Date.now()

    // Deactivate all currently active prompts
    const activePrompts = await db
      .query("systemPrompts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()

    for (const prompt of activePrompts) {
      await db.patch(prompt._id, { isActive: false, updatedAt: now })
    }

    // Activate target prompt
    await db.patch(promptId, { isActive: true, updatedAt: now })

    return { message: `Prompt "${targetPrompt.name}" v${targetPrompt.version} berhasil diaktifkan` }
  },
})

/**
 * Deactivate a system prompt
 * Admin/superadmin only
 */
export const deactivateSystemPrompt = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    promptId: v.id("systemPrompts"),
  },
  handler: async ({ db }, { requestorUserId, promptId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const prompt = await db.get(promptId)
    if (!prompt) {
      throw new Error("Prompt tidak ditemukan")
    }

    if (!prompt.isActive) {
      return { message: "Prompt sudah tidak aktif" }
    }

    await db.patch(promptId, { isActive: false, updatedAt: Date.now() })

    return { message: "Prompt berhasil dinonaktifkan. Chat akan menggunakan fallback prompt." }
  },
})

/**
 * Delete a system prompt
 * Admin/superadmin only
 * Cannot delete active prompts
 */
export const deleteSystemPrompt = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    promptId: v.id("systemPrompts"),
  },
  handler: async ({ db }, { requestorUserId, promptId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const prompt = await db.get(promptId)
    if (!prompt) {
      throw new Error("Prompt tidak ditemukan")
    }

    if (prompt.isActive) {
      throw new Error("Tidak bisa menghapus prompt yang sedang aktif. Nonaktifkan terlebih dahulu.")
    }

    // Delete this prompt
    await db.delete(promptId)

    return { message: "Prompt berhasil dihapus" }
  },
})

/**
 * Delete entire prompt chain (all versions)
 * Admin/superadmin only
 * Cannot delete if any version is active
 */
export const deletePromptChain = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    promptId: v.id("systemPrompts"),
  },
  handler: async ({ db }, { requestorUserId, promptId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const prompt = await db.get(promptId)
    if (!prompt) {
      throw new Error("Prompt tidak ditemukan")
    }

    // Determine rootId
    const rootId = prompt.rootId ?? promptId

    // Get all prompts in this chain
    const v1Prompt = await db.get(rootId as Id<"systemPrompts">)
    const subsequentVersions = await db
      .query("systemPrompts")
      .withIndex("by_root", (q) => q.eq("rootId", rootId as Id<"systemPrompts">))
      .collect()

    const allVersions = v1Prompt ? [v1Prompt, ...subsequentVersions] : subsequentVersions

    // Check if any version is active
    const hasActive = allVersions.some((p) => p.isActive)
    if (hasActive) {
      throw new Error(
        "Tidak bisa menghapus prompt chain yang memiliki versi aktif. Nonaktifkan terlebih dahulu."
      )
    }

    // Delete all versions
    for (const version of allVersions) {
      await db.delete(version._id)
    }

    return { message: `${allVersions.length} versi prompt berhasil dihapus` }
  },
})
