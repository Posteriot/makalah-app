import { internalMutation } from "../_generated/server"

/**
 * Migration script to update active system prompt with artifact sources guidelines
 * Run via: npx convex run migrations:updatePromptWithArtifactSources
 *
 * This updates the artifact guidelines to include instructions for passing
 * web search sources to artifact creation for proper citation rendering.
 */

const ARTIFACT_SOURCES_ADDITION = `
**SOURCES DAN SITASI ARTIFACT:**
Sistem akan meng-inject context "AVAILABLE_WEB_SOURCES" jika ada hasil web search sebelumnya.

Jika context AVAILABLE_WEB_SOURCES tersedia dan konten artifact BERBASIS sumber tersebut:
- WAJIB copy-paste array sources dari AVAILABLE_WEB_SOURCES ke parameter \`sources\` di createArtifact
- Jangan modifikasi format, langsung gunakan JSON array yang sudah disediakan
- Ini memungkinkan inline citation [1], [2] berfungsi di artifact viewer

Contoh alur:
1. Turn 1: User minta cari referensi → AI gunakan web search → sources disimpan
2. Turn 2: User minta buat outline → Context AVAILABLE_WEB_SOURCES muncul dengan array sources
3. AI gunakan createArtifact dengan sources: [copy dari AVAILABLE_WEB_SOURCES]
4. Artifact menampilkan inline citations yang bisa di-klik

PENTING: Tanpa parameter sources, sitasi di artifact tidak akan interaktif.`

export const updatePromptWithArtifactSources = internalMutation({
  handler: async ({ db }) => {
    // Find the currently active system prompt
    const activePrompt = await db
      .query("systemPrompts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    if (!activePrompt) {
      return {
        success: false,
        message: "Tidak ada system prompt yang aktif. Jalankan seedDefaultSystemPrompt terlebih dahulu.",
      }
    }

    // Check if prompt already has this section (idempotent)
    if (activePrompt.content.includes("**SOURCES DAN SITASI ARTIFACT:**") ||
        activePrompt.content.includes("AVAILABLE_WEB_SOURCES")) {
      return {
        success: false,
        message: "Prompt sudah memiliki artifact sources guidelines. Tidak perlu update.",
      }
    }

    // Check if artifact section exists
    if (!activePrompt.content.includes("## ARTIFACT CREATION")) {
      return {
        success: false,
        message: "Prompt belum memiliki artifact guidelines. Jalankan updatePromptWithArtifactGuidelines terlebih dahulu.",
      }
    }

    // Find the CONTOH PENGGUNAAN section to insert before it
    const targetPhrase = "**CONTOH PENGGUNAAN:**"

    let newContent: string
    if (activePrompt.content.includes(targetPhrase)) {
      // Insert sources section before CONTOH PENGGUNAAN
      newContent = activePrompt.content.replace(
        targetPhrase,
        ARTIFACT_SOURCES_ADDITION + "\n\n" + targetPhrase
      )
    } else {
      // Fallback: Insert after GUIDELINES ARTIFACT section
      const guidelinesPhrase = "**GUIDELINES ARTIFACT:**"
      if (activePrompt.content.includes(guidelinesPhrase)) {
        // Find the end of GUIDELINES ARTIFACT section and insert after
        const guidelinesIndex = activePrompt.content.indexOf(guidelinesPhrase)
        const nextSectionIndex = activePrompt.content.indexOf("**", guidelinesIndex + guidelinesPhrase.length)

        if (nextSectionIndex > 0) {
          newContent =
            activePrompt.content.slice(0, nextSectionIndex) +
            ARTIFACT_SOURCES_ADDITION + "\n\n" +
            activePrompt.content.slice(nextSectionIndex)
        } else {
          // Append at the end of artifact section
          newContent = activePrompt.content + ARTIFACT_SOURCES_ADDITION
        }
      } else {
        // Last fallback: append after artifact section header
        newContent = activePrompt.content + ARTIFACT_SOURCES_ADDITION
      }
    }

    const now = Date.now()
    const newVersion = activePrompt.version + 1

    // Determine rootId - for v1 prompts, use their own ID as rootId for children
    const rootId = activePrompt.rootId ?? activePrompt._id

    // Create new version with sources guidelines
    const newPromptId = await db.insert("systemPrompts", {
      name: activePrompt.name,
      content: newContent,
      description: activePrompt.description
        ? `${activePrompt.description} + Artifact Sources`
        : "Updated with artifact sources guidelines",
      version: newVersion,
      isActive: true, // New version is active
      parentId: activePrompt._id,
      rootId: rootId,
      createdBy: activePrompt.createdBy, // Keep same creator
      createdAt: now,
      updatedAt: now,
    })

    // Deactivate old version
    await db.patch(activePrompt._id, { isActive: false, updatedAt: now })

    return {
      success: true,
      promptId: newPromptId,
      version: newVersion,
      message: `System prompt berhasil diupdate ke v${newVersion} dengan artifact sources guidelines.`,
    }
  },
})
