import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"
import { requireRole } from "./permissions"
import { Id } from "./_generated/dataModel"

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the currently active constitution
 * Used by Refrasa API - no auth required for reading active constitution
 * Single-active model: only one constitution can be active globally
 */
export const getActive = queryGeneric({
  args: {},
  handler: async ({ db }) => {
    return await db
      .query("styleConstitutions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()
  },
})

/**
 * List all style constitutions (latest versions only)
 * Admin/superadmin only
 */
export const list = queryGeneric({
  args: { requestorUserId: v.id("users") },
  handler: async ({ db }, { requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    // Get all constitutions ordered by createdAt desc
    const allConstitutions = await db
      .query("styleConstitutions")
      .withIndex("by_createdAt")
      .order("desc")
      .collect()

    // Group by rootId (or self if rootId is undefined) and keep only latest version
    const latestByRoot = new Map<string, typeof allConstitutions[0]>()

    for (const constitution of allConstitutions) {
      // For v1 constitutions, rootId is undefined, so we use the constitution's own ID as key
      const rootKey = constitution.rootId ?? constitution._id

      if (!latestByRoot.has(rootKey)) {
        // First entry is latest since we ordered by createdAt desc
        latestByRoot.set(rootKey, constitution)
      }
    }

    // Convert to array and sort by createdAt desc
    const latestVersions = Array.from(latestByRoot.values())
    latestVersions.sort((a, b) => b.createdAt - a.createdAt)

    // Fetch creator info for each constitution
    const constitutionsWithCreator = await Promise.all(
      latestVersions.map(async (constitution) => {
        const creator = await db.get(constitution.createdBy)
        return {
          ...constitution,
          creatorEmail: creator?.email ?? "Unknown",
        }
      })
    )

    return constitutionsWithCreator
  },
})

/**
 * Get version history for a constitution chain
 * Admin/superadmin only
 */
export const getVersionHistory = queryGeneric({
  args: {
    constitutionId: v.id("styleConstitutions"),
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { constitutionId, requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const constitution = await db.get(constitutionId)
    if (!constitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    // Determine rootId - for v1 constitutions, use their own ID
    const rootId = constitution.rootId ?? constitutionId

    // Get all constitutions in this chain
    // First, get the v1 constitution (which has rootId undefined and _id = rootId)
    const v1Constitution = await db.get(rootId as Id<"styleConstitutions">)

    // Then get all subsequent versions (which have rootId = rootId)
    const subsequentVersions = await db
      .query("styleConstitutions")
      .withIndex("by_root", (q) => q.eq("rootId", rootId as Id<"styleConstitutions">))
      .order("asc")
      .collect()

    // Combine v1 with subsequent versions
    const allVersions = v1Constitution ? [v1Constitution, ...subsequentVersions] : subsequentVersions

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
 * Get a single constitution by ID
 * Admin/superadmin only
 */
export const getById = queryGeneric({
  args: {
    constitutionId: v.id("styleConstitutions"),
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { constitutionId, requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const constitution = await db.get(constitutionId)
    if (!constitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    const creator = await db.get(constitution.createdBy)
    return {
      ...constitution,
      creatorEmail: creator?.email ?? "Unknown",
    }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new style constitution (v1)
 * Admin/superadmin only
 */
export const create = mutationGeneric({
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
      throw new Error("Nama constitution tidak boleh kosong")
    }
    if (!content.trim()) {
      throw new Error("Konten constitution tidak boleh kosong")
    }

    const now = Date.now()

    // Create v1 constitution (rootId and parentId are undefined for v1)
    const constitutionId = await db.insert("styleConstitutions", {
      name: name.trim(),
      content: content.trim(),
      description: description?.trim(),
      version: 1,
      isActive: false, // Not active by default
      parentId: undefined,
      rootId: undefined, // v1 constitutions have no rootId
      createdBy: requestorUserId,
      createdAt: now,
      updatedAt: now,
    })

    return { constitutionId, message: "Constitution berhasil dibuat" }
  },
})

/**
 * Seed default style constitution from built-in template
 * Admin/superadmin only
 *
 * This creates the default "Makalah Style Constitution" and activates it.
 * Can only be used when no constitutions exist yet.
 */
export const seedDefault = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    // Check if any constitution already exists
    const existing = await db.query("styleConstitutions").first()
    if (existing) {
      throw new Error("Style constitution sudah ada. Gunakan 'Buat Constitution Baru' untuk membuat constitution tambahan.")
    }

    const now = Date.now()

    // Create default constitution (v1, active)
    const constitutionId = await db.insert("styleConstitutions", {
      name: "Makalah Style Constitution",
      content: "Default constitution content — replace via Admin Panel.",
      description: "Default style constitution untuk Refrasa tool - panduan gaya penulisan akademis Bahasa Indonesia",
      version: 1,
      isActive: true, // Active by default
      parentId: undefined,
      rootId: undefined,
      createdBy: requestorUserId,
      createdAt: now,
      updatedAt: now,
    })

    return {
      constitutionId,
      message: "Default constitution berhasil dibuat dan diaktifkan"
    }
  },
})

/**
 * Update a style constitution (creates new version)
 * Admin/superadmin only
 */
export const update = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    constitutionId: v.id("styleConstitutions"),
    content: v.string(),
    description: v.optional(v.string()),
  },
  handler: async ({ db }, { requestorUserId, constitutionId, content, description }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const oldConstitution = await db.get(constitutionId)
    if (!oldConstitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    // Validate
    if (!content.trim()) {
      throw new Error("Konten constitution tidak boleh kosong")
    }

    const now = Date.now()
    const newVersion = oldConstitution.version + 1

    // Determine rootId - for v1 constitutions, use their own ID as rootId for children
    const rootId = oldConstitution.rootId ?? constitutionId

    // Create new version
    const newConstitutionId = await db.insert("styleConstitutions", {
      name: oldConstitution.name, // Keep same name
      content: content.trim(),
      description: description?.trim() ?? oldConstitution.description,
      version: newVersion,
      isActive: oldConstitution.isActive, // Inherit active status
      parentId: constitutionId, // Link to previous version
      rootId: rootId, // Link to root constitution
      createdBy: requestorUserId,
      createdAt: now,
      updatedAt: now,
    })

    // Deactivate old version if it was active
    if (oldConstitution.isActive) {
      await db.patch(constitutionId, { isActive: false, updatedAt: now })
    }

    return {
      constitutionId: newConstitutionId,
      version: newVersion,
      message: `Constitution berhasil diupdate ke versi ${newVersion}`,
    }
  },
})

/**
 * Activate a style constitution (deactivates all others)
 * Admin/superadmin only
 * Implements single-active constraint
 */
export const activate = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    constitutionId: v.id("styleConstitutions"),
  },
  handler: async ({ db }, { requestorUserId, constitutionId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const targetConstitution = await db.get(constitutionId)
    if (!targetConstitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    if (targetConstitution.isActive) {
      return { message: "Constitution sudah aktif" }
    }

    const now = Date.now()

    // Deactivate ALL currently active constitutions (global single-active constraint)
    const allActive = await db
      .query("styleConstitutions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()

    for (const constitution of allActive) {
      await db.patch(constitution._id, { isActive: false, updatedAt: now })
    }

    // Activate target constitution
    await db.patch(constitutionId, { isActive: true, updatedAt: now })

    return { message: `Constitution "${targetConstitution.name}" v${targetConstitution.version} berhasil diaktifkan` }
  },
})

/**
 * Deactivate a style constitution
 * Admin/superadmin only
 */
export const deactivate = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    constitutionId: v.id("styleConstitutions"),
  },
  handler: async ({ db }, { requestorUserId, constitutionId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const constitution = await db.get(constitutionId)
    if (!constitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    if (!constitution.isActive) {
      return { message: "Constitution sudah tidak aktif" }
    }

    await db.patch(constitutionId, { isActive: false, updatedAt: Date.now() })

    return { message: "Constitution berhasil dinonaktifkan. Refrasa akan berjalan tanpa constitution." }
  },
})

/**
 * Delete a style constitution
 * Admin/superadmin only
 * Cannot delete active constitutions
 */
export const deleteConstitution = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    constitutionId: v.id("styleConstitutions"),
  },
  handler: async ({ db }, { requestorUserId, constitutionId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const constitution = await db.get(constitutionId)
    if (!constitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    if (constitution.isActive) {
      throw new Error("Tidak bisa menghapus constitution yang sedang aktif. Nonaktifkan terlebih dahulu.")
    }

    // Delete this constitution
    await db.delete(constitutionId)

    return { message: "Constitution berhasil dihapus" }
  },
})

/**
 * Delete entire constitution chain (all versions)
 * Admin/superadmin only
 * Cannot delete if any version is active
 */
export const deleteChain = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    constitutionId: v.id("styleConstitutions"),
  },
  handler: async ({ db }, { requestorUserId, constitutionId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const constitution = await db.get(constitutionId)
    if (!constitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    // Determine rootId
    const rootId = constitution.rootId ?? constitutionId

    // Get all constitutions in this chain
    const v1Constitution = await db.get(rootId as Id<"styleConstitutions">)
    const subsequentVersions = await db
      .query("styleConstitutions")
      .withIndex("by_root", (q) => q.eq("rootId", rootId as Id<"styleConstitutions">))
      .collect()

    const allVersions = v1Constitution ? [v1Constitution, ...subsequentVersions] : subsequentVersions

    // Check if any version is active
    const hasActive = allVersions.some((c) => c.isActive)
    if (hasActive) {
      throw new Error(
        "Tidak bisa menghapus constitution chain yang memiliki versi aktif. Nonaktifkan terlebih dahulu."
      )
    }

    // Delete all versions
    for (const version of allVersions) {
      await db.delete(version._id)
    }

    return { message: `${allVersions.length} versi constitution berhasil dihapus` }
  },
})
