import { internalMutation } from "../_generated/server"

/**
 * Migration script to update active system prompt with Paper Workflow knowledge
 * Run via: npx convex run migrations:updatePromptWithPaperWorkflow
 *
 * This creates a new version of the active prompt that includes the
 * paper workflow documentation so the AI is "aware" of the 13-stage workflow.
 */

const PAPER_WORKFLOW_SECTION = `

## PAPER WORKFLOW (13 TAHAP)

Anda memiliki kemampuan untuk menulis paper akademik secara utuh melalui **alur kerja 13 tahap** yang terstruktur. Gunakan tool paper untuk mengelola sesi penulisan.

### PRINSIP KERJA

1. **Dialog Dulu**: Selalu diskusi dengan user sebelum membuat draft. Tanya kebutuhan, konteks, dan preferensi mereka.
2. **Validasi Wajib**: Setiap tahap harus divalidasi user (setujui/revisi) sebelum lanjut ke tahap berikutnya.
3. **Linear & Konsisten**: Tahap harus diselesaikan berurutan. Tidak bisa loncat tahap.
4. **Outline Sebagai Panduan**: Setelah outline dibuat (tahap 3), semua tahap berikutnya mengikuti struktur outline.

### 13 TAHAP BERURUTAN

| No | Stage ID | Label | Fokus |
|----|----------|-------|-------|
| 1 | gagasan | Gagasan Paper | Curah gagasan + referensi awal |
| 2 | topik | Penentuan Topik | Topik definitif + gap riset |
| 3 | outline | Menyusun Outline | Struktur paper + checklist |
| 4 | abstrak | Penyusunan Abstrak | Ringkasan penelitian + kata kunci |
| 5 | pendahuluan | Pendahuluan | Latar belakang + rumusan masalah |
| 6 | tinjauan_literatur | Tinjauan Literatur | Kerangka teoretis + review |
| 7 | metodologi | Metodologi | Desain penelitian + teknik analisis |
| 8 | hasil | Hasil Penelitian | Temuan + data |
| 9 | diskusi | Diskusi | Interpretasi + implikasi |
| 10 | kesimpulan | Kesimpulan | Ringkasan + saran |
| 11 | daftar_pustaka | Daftar Pustaka | Kompilasi referensi APA |
| 12 | lampiran | Lampiran | Opsional, bisa kosong |
| 13 | judul | Pemilihan Judul | 5 opsi + 1 judul terpilih |

### STATUS TAHAP

- \`drafting\`: Tahap aktif, sedang menyusun
- \`pending_validation\`: Draft selesai, tunggu user setujui/revisi
- \`revision\`: User minta revisi
- \`approved\`: Tahap selesai (hanya untuk status akhir setelah semua tahap)

### TOOL YANG TERSEDIA

1. **startPaperSession({ initialIdea })**: Mulai sesi baru dengan ide awal
2. **getCurrentPaperState({})**: Lihat status sesi saat ini
3. **updateStageData({ stage, data })**: Update data tahap (hanya untuk currentStage)
4. **submitStageForValidation({})**: Kirim draft untuk validasi user

### ALUR PENGGUNAAN TOOL

1. Saat user ingin menulis paper → panggil \`startPaperSession\`
2. Diskusi dengan user tentang tahap aktif
3. Setelah draft matang → panggil \`updateStageData\` + \`createArtifact\`
4. Minta persetujuan user → panggil \`submitStageForValidation\`
5. Tunggu user klik "Setujui" atau "Revisi" di UI
6. Ulangi untuk tahap berikutnya

### CATATAN PENTING

- **google_search** dan tool paper tidak bisa dipakai bersamaan dalam satu request
- Setiap tahap punya **ringkasan** yang akan jadi konteks untuk tahap berikutnya
- Setelah tahap 3 (outline), checklist outline selalu tampil sebagai panduan
- Saat sesi selesai (tahap 13 disetujui), user bisa ekspor ke Word/PDF`

export const updatePromptWithPaperWorkflow = internalMutation({
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

    // Check if prompt already has paper workflow section
    if (activePrompt.content.includes("## PAPER WORKFLOW (13 TAHAP)")) {
      return {
        success: false,
        message: "Prompt sudah memiliki paper workflow section. Tidak perlu update.",
      }
    }

    // Find the ending phrase to insert before
    const endingPhrase = "Selalu respons dengan helpful, terstruktur, dan actionable."

    let newContent: string
    if (activePrompt.content.includes(endingPhrase)) {
      // Insert paper workflow section before the ending phrase
      newContent = activePrompt.content.replace(
        endingPhrase,
        PAPER_WORKFLOW_SECTION + "\n\n" + endingPhrase
      )
    } else {
      // Append at the end
      newContent = activePrompt.content + PAPER_WORKFLOW_SECTION
    }

    const now = Date.now()
    const newVersion = activePrompt.version + 1

    // Determine rootId - for v1 prompts, use their own ID as rootId for children
    const rootId = activePrompt.rootId ?? activePrompt._id

    // Create new version with paper workflow section
    const newPromptId = await db.insert("systemPrompts", {
      name: activePrompt.name,
      content: newContent,
      description: activePrompt.description
        ? `${activePrompt.description} + Paper Workflow`
        : "Updated with paper workflow knowledge",
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
      message: `System prompt berhasil diupdate ke v${newVersion} dengan paper workflow knowledge.`,
    }
  },
})
