import { internalMutation } from "../_generated/server"

/**
 * Migration script to remove old "## PAPER WRITING WORKFLOW" section (14 tahap)
 * Run via: npx convex run "migrations/removeOldPaperWorkflowSection:removeOldPaperWorkflowSection"
 *
 * This removes the outdated 14-tahap section, keeping only the new
 * "## PAPER WORKFLOW (13 TAHAP)" section which is accurate.
 */

export const removeOldPaperWorkflowSection = internalMutation({
  handler: async ({ db }) => {
    // Find the currently active system prompt
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

    // Check if the old section exists
    if (!activePrompt.content.includes("## PAPER WRITING WORKFLOW\n")) {
      return {
        success: false,
        message: "Section lama '## PAPER WRITING WORKFLOW' tidak ditemukan. Tidak perlu cleanup.",
      }
    }

    // Find and remove the old section
    // The old section starts with "## PAPER WRITING WORKFLOW\n" and ends before "## CHAT TITLE"
    const oldSectionStart = "## PAPER WRITING WORKFLOW\n"
    const oldSectionEnd = "## CHAT TITLE"

    const startIdx = activePrompt.content.indexOf(oldSectionStart)
    const endIdx = activePrompt.content.indexOf(oldSectionEnd)

    if (startIdx === -1 || endIdx === -1 || startIdx >= endIdx) {
      return {
        success: false,
        message: "Tidak dapat menemukan batas section lama dengan benar.",
      }
    }

    // Remove the old section (keep everything before and after)
    const beforeOldSection = activePrompt.content.substring(0, startIdx)
    const afterOldSection = activePrompt.content.substring(endIdx)

    const newContent = beforeOldSection + afterOldSection

    const now = Date.now()
    const newVersion = activePrompt.version + 1

    // Determine rootId
    const rootId = activePrompt.rootId ?? activePrompt._id

    // Create new version without the old section
    const newPromptId = await db.insert("systemPrompts", {
      name: activePrompt.name,
      content: newContent,
      description: activePrompt.description
        ? activePrompt.description.replace(" + Paper Workflow", "") + " (cleaned)"
        : "Cleaned up duplicate paper workflow sections",
      version: newVersion,
      isActive: true,
      parentId: activePrompt._id,
      rootId: rootId,
      createdBy: activePrompt.createdBy,
      createdAt: now,
      updatedAt: now,
    })

    // Deactivate old version
    await db.patch(activePrompt._id, { isActive: false, updatedAt: now })

    return {
      success: true,
      promptId: newPromptId,
      version: newVersion,
      message: `System prompt berhasil dibersihkan ke v${newVersion}. Section lama '## PAPER WRITING WORKFLOW' (14 tahap) telah dihapus.`,
    }
  },
})
