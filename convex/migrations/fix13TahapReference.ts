import { internalMutation } from "../_generated/server"

/**
 * Migration script to fix remaining "14-tahap" reference to "13 tahap"
 * Run via: npx convex run "migrations/fix14TahapReference:fix14TahapReference"
 */

export const fix14TahapReference = internalMutation({
  handler: async ({ db }) => {
    const activePrompt = await db
      .query("systemPrompts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    if (!activePrompt) {
      return {
        success: false,
        message: "Tidak ada system prompt yang aktif.",
      }
    }

    // Check if the old reference exists
    if (!activePrompt.content.includes("14-tahap")) {
      return {
        success: false,
        message: "Referensi '14-tahap' tidak ditemukan. Tidak perlu fix.",
      }
    }

    // Replace "14-tahap" with "13 tahap"
    const newContent = activePrompt.content.replace(
      /14-tahap/g,
      "13 tahap"
    )

    const now = Date.now()
    const newVersion = activePrompt.version + 1
    const rootId = activePrompt.rootId ?? activePrompt._id

    const newPromptId = await db.insert("systemPrompts", {
      name: activePrompt.name,
      content: newContent,
      description: "Fixed: 14-tahap → 13 tahap reference",
      version: newVersion,
      isActive: true,
      parentId: activePrompt._id,
      rootId: rootId,
      createdBy: activePrompt.createdBy,
      createdAt: now,
      updatedAt: now,
    })

    await db.patch(activePrompt._id, { isActive: false, updatedAt: now })

    return {
      success: true,
      promptId: newPromptId,
      version: newVersion,
      message: `Fixed ke v${newVersion}. Referensi '14-tahap' diganti jadi '13 tahap'.`,
    }
  },
})
