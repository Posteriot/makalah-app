import { mutation } from "../_generated/server"

const DEFAULT_WORKING_TITLE = "Paper Tanpa Judul"
const PLACEHOLDER_CONVERSATION_TITLES = new Set(["Percakapan baru", "New Chat"])

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ")
}

function deriveWorkingTitle(params: {
  paperTitle?: string
  conversationTitle?: string
}): string {
  if (params.paperTitle) {
    const normalizedPaperTitle = normalizeTitle(params.paperTitle)
    if (normalizedPaperTitle) return normalizedPaperTitle
  }

  if (params.conversationTitle) {
    const normalizedConversationTitle = normalizeTitle(params.conversationTitle)
    if (
      normalizedConversationTitle &&
      !PLACEHOLDER_CONVERSATION_TITLES.has(normalizedConversationTitle)
    ) {
      return normalizedConversationTitle
    }
  }

  return DEFAULT_WORKING_TITLE
}

/**
 * Backfill workingTitle untuk paperSessions yang belum punya field ini.
 *
 * Run via:
 * npx convex run "migrations/backfillWorkingTitle:backfillWorkingTitle"
 */
export const backfillWorkingTitle = mutation({
  handler: async ({ db }) => {
    const sessions = await db.query("paperSessions").collect()
    const now = Date.now()

    let updatedCount = 0
    let skippedCount = 0
    const updates: string[] = []

    for (const session of sessions) {
      const existingWorkingTitle = session.workingTitle
        ? normalizeTitle(session.workingTitle)
        : ""

      // Idempotent: skip jika workingTitle sudah valid
      if (existingWorkingTitle) {
        skippedCount += 1
        updates.push(`${session._id}: skipped (already has workingTitle)`)
        continue
      }

      const conversation = await db.get(session.conversationId)
      const nextWorkingTitle = deriveWorkingTitle({
        paperTitle: session.paperTitle,
        conversationTitle: conversation?.title,
      })

      await db.patch(session._id, {
        workingTitle: nextWorkingTitle,
        updatedAt: now,
      })

      updatedCount += 1
      updates.push(`${session._id}: set workingTitle="${nextWorkingTitle}"`)
    }

    return {
      success: true,
      totalSessions: sessions.length,
      updatedCount,
      skippedCount,
      updates,
      message: `Backfill workingTitle selesai. Updated: ${updatedCount}, skipped: ${skippedCount}`,
    }
  },
})
