import { internalMutation } from "../_generated/server"

const SOURCES_AND_CITATION_SECTION = `

**SOURCES DAN SITASI ARTIFACT:**
Sistem akan meng-inject context "AVAILABLE_WEB_SOURCES" jika ada hasil web search sebelumnya.

Jika context AVAILABLE_WEB_SOURCES tersedia dan konten artifact BERBASIS sumber tersebut:
- WAJIB copy array sources ke parameter \`sources\` di createArtifact/updateArtifact
- Gunakan format object sumber apa adanya agar citation tetap valid
- Ini memungkinkan inline citation [1], [2] berfungsi di artifact viewer

PENTING: Jika artifact berbasis web sources dibuat tanpa parameter sources, kualitas sitasi dan traceability referensi akan menurun.`

export const createContractAlignedSystemPrompt = internalMutation({
  handler: async ({ db }) => {
    const activePrompt = await db
      .query("systemPrompts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    if (!activePrompt) {
      return {
        success: false,
        message: "Tidak ada system prompt aktif.",
      }
    }

    let newContent = activePrompt.content

    // Fix legacy signature in active prompt text
    newContent = newContent.replace(
      "**updateStageData({ stage, data })**: Update data tahap (hanya untuk currentStage)",
      "**updateStageData({ ringkasan, ringkasanDetail?, data? })**: Simpan progres tahap aktif (stage ditentukan otomatis dari currentStage)."
    )

    // If section is missing, insert before CONTOH PENGGUNAAN in artifact section
    if (!newContent.includes("**SOURCES DAN SITASI ARTIFACT:**")) {
      const marker = "**CONTOH PENGGUNAAN:**"
      if (newContent.includes(marker)) {
        newContent = newContent.replace(
          marker,
          `${SOURCES_AND_CITATION_SECTION}\n\n${marker}`
        )
      } else {
        newContent = `${newContent}${SOURCES_AND_CITATION_SECTION}`
      }
    }

    if (newContent.includes("updateStageData({ stage, data })")) {
      return {
        success: false,
        message: "Legacy signature masih ada setelah transformasi. Update dibatalkan.",
      }
    }

    const now = Date.now()

    // Deactivate current active prompts first
    const activePrompts = await db
      .query("systemPrompts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()

    for (const prompt of activePrompts) {
      await db.patch(prompt._id, {
        isActive: false,
        updatedAt: now,
      })
    }

    // Create a new clean chain (v1) for future strict cleanliness
    const newPromptId = await db.insert("systemPrompts", {
      name: "Default Academic Assistant - Contract Aligned",
      content: newContent,
      description: "Contract aligned: auto-stage updateStageData + artifact sources citation policy",
      version: 1,
      isActive: true,
      parentId: undefined,
      rootId: undefined,
      createdBy: activePrompt.createdBy,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      oldPromptId: activePrompt._id,
      oldRootId: activePrompt.rootId ?? activePrompt._id,
      newPromptId,
      message: "Prompt baru contract-aligned berhasil dibuat dan diaktifkan.",
    }
  },
})

