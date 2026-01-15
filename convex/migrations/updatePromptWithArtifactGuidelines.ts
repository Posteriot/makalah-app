import { internalMutation } from "../_generated/server"

/**
 * Migration script to update active system prompt with artifact guidelines
 * Run via: npx convex run migrations:updatePromptWithArtifactGuidelines
 *
 * This creates a new version of the active prompt that includes the
 * artifact creation guidelines necessary for the AI to use createArtifact tool.
 */

const ARTIFACT_GUIDELINES_SECTION = `

## ARTIFACT CREATION

Anda memiliki kemampuan untuk membuat "artifact" - konten standalone yang dapat diedit, dicopy, atau diexport oleh user. Gunakan tool createArtifact untuk membuat artifact.

**KAPAN MEMBUAT ARTIFACT (✓ Gunakan createArtifact):**
- Outline atau struktur paper (type: "outline")
- Draft section: Pendahuluan, Metodologi, Hasil, Pembahasan, Kesimpulan (type: "section")
- Code untuk analisis data dalam Python, R, JavaScript, TypeScript (type: "code")
- Tabel dan data terformat (type: "table")
- Daftar pustaka dan sitasi (type: "citation")
- Formula matematika LaTeX (type: "formula")
- Ringkasan penelitian dan abstrak (type: "section")
- Paragraf parafrase (type: "section")

**KAPAN TIDAK MEMBUAT ARTIFACT (✗ Tetap di chat):**
- Penjelasan konsep atau tutorial
- Diskusi dan brainstorming
- Pertanyaan klarifikasi
- Saran dan feedback singkat
- Percakapan tentang proses penulisan
- Jawaban singkat (kurang dari 3 kalimat)

**GUIDELINES ARTIFACT:**
- Judul harus deskriptif dan singkat (maksimal 50 karakter)
- Contoh judul baik: "Outline Skripsi AI Ethics", "Kode Analisis Regresi", "Draft Pendahuluan"
- Pilih format yang sesuai: markdown untuk teks, nama bahasa untuk code
- Setelah membuat artifact, beritahu user bahwa artifact dapat dilihat di panel samping

**CONTOH PENGGUNAAN:**

User: "Buatkan outline untuk skripsi tentang dampak AI di pendidikan"
→ Gunakan createArtifact dengan type="outline", title="Outline Skripsi AI Pendidikan"

User: "Apa saja langkah-langkah menulis pendahuluan?"
→ JANGAN buat artifact, jelaskan di chat saja

User: "Buatkan draft pendahuluan berdasarkan outline di atas"
→ Gunakan createArtifact dengan type="section", title="Draft Pendahuluan"

User: "Tolong perbaiki kalimat ini"
→ JANGAN buat artifact, berikan saran perbaikan di chat`

export const updatePromptWithArtifactGuidelines = internalMutation({
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

    // Check if prompt already has artifact section
    if (activePrompt.content.includes("## ARTIFACT CREATION")) {
      return {
        success: false,
        message: "Prompt sudah memiliki artifact guidelines. Tidak perlu update.",
      }
    }

    // Find the ending phrase to insert before
    const endingPhrase = "Selalu respons dengan helpful, terstruktur, dan actionable."

    let newContent: string
    if (activePrompt.content.includes(endingPhrase)) {
      // Insert artifact section before the ending phrase
      newContent = activePrompt.content.replace(
        endingPhrase,
        ARTIFACT_GUIDELINES_SECTION + "\n\n" + endingPhrase
      )
    } else {
      // Append at the end
      newContent = activePrompt.content + ARTIFACT_GUIDELINES_SECTION
    }

    const now = Date.now()
    const newVersion = activePrompt.version + 1

    // Determine rootId - for v1 prompts, use their own ID as rootId for children
    const rootId = activePrompt.rootId ?? activePrompt._id

    // Create new version with artifact guidelines
    const newPromptId = await db.insert("systemPrompts", {
      name: activePrompt.name,
      content: newContent,
      description: activePrompt.description
        ? `${activePrompt.description} + Artifact Guidelines`
        : "Updated with artifact creation guidelines",
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
      message: `System prompt berhasil diupdate ke v${newVersion} dengan artifact guidelines.`,
    }
  },
})
