import { internalMutation } from "../_generated/server"

/**
 * Migration: Update active system prompt from 13 to 14 stages
 *
 * Run via: npx convex run migrations:updateSystemPromptTo14Stages
 *
 * Changes:
 * 1. Heading "13 TAHAP" → "14 TAHAP"
 * 2. Intro text "alur kerja 13 tahap" → "alur kerja 14 tahap"
 * 3. Stage table: insert pembaruan_abstrak at row 11, shift 11-13 → 12-14
 * 4. "tahap 13 disetujui" → "tahap 14 disetujui"
 * 5. KEMAMPUAN UTAMA reference if present
 *
 * Guard: skips if prompt already contains "14 TAHAP" or "pembaruan_abstrak"
 */

export default internalMutation({
  args: {},
  handler: async ({ db }) => {
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

    // Guard: already updated
    if (
      activePrompt.content.includes("14 TAHAP") ||
      activePrompt.content.includes("pembaruan_abstrak")
    ) {
      return {
        success: false,
        message: "Prompt sudah mengandung referensi 14 tahap atau pembaruan_abstrak. Tidak perlu update.",
      }
    }

    // Guard: must have paper workflow section
    if (!activePrompt.content.includes("PAPER WORKFLOW")) {
      return {
        success: false,
        message: "Prompt tidak memiliki section PAPER WORKFLOW. Jalankan updatePromptWithPaperWorkflow terlebih dahulu.",
      }
    }

    let newContent = activePrompt.content
    const changes: string[] = []

    // ========================================================================
    // FIX 1: Heading "13 TAHAP" → "14 TAHAP"
    // ========================================================================
    if (newContent.includes("13 TAHAP")) {
      newContent = newContent.replace(/13 TAHAP/g, "14 TAHAP")
      changes.push("heading 13→14 TAHAP")
    }

    // ========================================================================
    // FIX 2: Intro text "alur kerja 13 tahap" → "alur kerja 14 tahap"
    // ========================================================================
    if (newContent.includes("alur kerja 13 tahap")) {
      newContent = newContent.replace(/alur kerja 13 tahap/g, "alur kerja 14 tahap")
      changes.push("intro alur kerja 13→14")
    }

    // ========================================================================
    // FIX 3: Stage table — insert pembaruan_abstrak, shift numbers
    // The old table has rows ending at:
    //   | 10 | kesimpulan | ...
    //   | 11 | daftar_pustaka | ...
    //   | 12 | lampiran | ...
    //   | 13 | judul | ...
    // ========================================================================

    // Replace the old 3-row block (11-13) with new 4-row block (11-14)
    const oldTableRows = [
      "| 11 | daftar_pustaka | Daftar Pustaka | Kompilasi referensi APA |",
      "| 12 | lampiran | Lampiran | Opsional, bisa kosong |",
      "| 13 | judul | Pemilihan Judul | 5 opsi + 1 judul terpilih |",
    ].join("\n")

    const newTableRows = [
      "| 11 | pembaruan_abstrak | Pembaruan Abstrak | Revisi abstrak sesuai temuan aktual |",
      "| 12 | daftar_pustaka | Daftar Pustaka | Kompilasi referensi APA |",
      "| 13 | lampiran | Lampiran | Opsional, bisa kosong |",
      "| 14 | judul | Pemilihan Judul | 5 opsi + 1 judul terpilih |",
    ].join("\n")

    if (newContent.includes(oldTableRows)) {
      newContent = newContent.replace(oldTableRows, newTableRows)
      changes.push("stage table: +pembaruan_abstrak, renumbered 11-14")
    } else {
      // Fallback: try regex-based replacement for slightly different formatting
      const tableRegex = /\| 11 \| daftar_pustaka \|[^\n]*\n\| 12 \| lampiran \|[^\n]*\n\| 13 \| judul \|[^\n]*/
      if (tableRegex.test(newContent)) {
        newContent = newContent.replace(tableRegex, newTableRows)
        changes.push("stage table (regex): +pembaruan_abstrak, renumbered 11-14")
      }
    }

    // ========================================================================
    // FIX 4: "tahap 13 disetujui" → "tahap 14 disetujui"
    // ========================================================================
    if (newContent.includes("tahap 13 disetujui")) {
      newContent = newContent.replace(/tahap 13 disetujui/g, "tahap 14 disetujui")
      changes.push("tahap 13→14 disetujui")
    }
    // Also handle parenthetical form: (tahap 13)
    if (newContent.includes("(tahap 13)")) {
      newContent = newContent.replace(/\(tahap 13\)/g, "(tahap 14)")
      changes.push("(tahap 13)→(tahap 14)")
    }

    // ========================================================================
    // FIX 5: "13 tahap" in any remaining references
    // ========================================================================
    // Catch any remaining "13 tahap" that wasn't part of heading/intro
    if (newContent.includes("13 tahap")) {
      newContent = newContent.replace(/13 tahap/g, "14 tahap")
      changes.push("remaining 13→14 tahap references")
    }

    // ========================================================================
    // FIX 6: KEMAMPUAN UTAMA if it mentions "13 tahap"
    // Already handled by FIX 5 global replace, but track explicitly
    // ========================================================================

    if (changes.length === 0) {
      return {
        success: false,
        message: "Tidak ada perubahan yang bisa dilakukan. Cek format prompt secara manual.",
      }
    }

    // Verify the new content actually has pembaruan_abstrak
    if (!newContent.includes("pembaruan_abstrak")) {
      return {
        success: false,
        message: `Perubahan terdeteksi (${changes.join(", ")}), tapi pembaruan_abstrak tidak berhasil ditambahkan ke tabel. Cek format tabel secara manual.`,
      }
    }

    const now = Date.now()
    const newVersion = activePrompt.version + 1
    const rootId = activePrompt.rootId ?? activePrompt._id

    const newPromptId = await db.insert("systemPrompts", {
      name: activePrompt.name,
      content: newContent,
      description: `Updated to 14-stage workflow: added pembaruan_abstrak (Stage 11)`,
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
      changes,
      message: `System prompt v${newVersion}: Updated to 14-stage workflow. Changes: ${changes.join(", ")}`,
    }
  },
})
