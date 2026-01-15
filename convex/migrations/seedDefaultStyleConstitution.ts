import { internalMutation } from "../_generated/server"
import { DEFAULT_CONSTITUTION_CONTENT } from "../styleConstitutions"

/**
 * Migration script to seed the default style constitution for Refrasa tool
 * Run via: npx convex run migrations:seedDefaultStyleConstitution
 *
 * ============================================================================
 * IMPORTANT NOTES:
 * ============================================================================
 *
 * 1. INITIAL BOOTSTRAP ONLY
 *    - This migration is ONLY for fresh database installs or first-time setup
 *    - The guard prevents re-running if any style constitution exists
 *    - Subsequent updates should be done via Admin Panel → Style Constitution Manager
 *
 * 2. TWO-LAYER ARCHITECTURE
 *    - Layer 1 (Core Naturalness Criteria): Hardcoded in prompt-builder.ts
 *    - Layer 2 (Style Constitution): This editable content from database
 *    - Constitution CANNOT override Layer 1 naturalness criteria
 *
 * 3. CONTENT SOURCE
 *    - DEFAULT_CONSTITUTION_CONTENT imported from ../styleConstitutions.ts
 *    - Single source of truth for constitution content
 *    - Based on: .development/knowledge-base/writing_style_tool/makalah-style-constitution.md
 *
 * ============================================================================
 */

export const seedDefaultStyleConstitution = internalMutation({
  handler: async ({ db }) => {
    // Check if any style constitutions exist
    const existing = await db.query("styleConstitutions").first()
    if (existing) {
      return {
        success: false,
        message: "Default style constitution sudah ada. Migration dibatalkan.",
      }
    }

    // Find superadmin user to set as creator
    const superadmin = await db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "superadmin"))
      .first()

    if (!superadmin) {
      return {
        success: false,
        message: "Superadmin user tidak ditemukan. Silakan buat superadmin terlebih dahulu.",
      }
    }

    const now = Date.now()

    // Create default style constitution (v1, active)
    const constitutionId = await db.insert("styleConstitutions", {
      name: "Makalah Style Constitution",
      content: DEFAULT_CONSTITUTION_CONTENT,
      description: "Default style constitution untuk Refrasa tool - panduan gaya penulisan akademis Bahasa Indonesia",
      version: 1,
      isActive: true, // Set as active
      parentId: undefined,
      rootId: undefined, // v1 constitutions have no rootId
      createdBy: superadmin._id,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      constitutionId,
      message: "Default style constitution berhasil dibuat dan diaktifkan.",
    }
  },
})
