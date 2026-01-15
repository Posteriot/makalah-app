import { internalMutation } from "../_generated/server"

/**
 * Migration to fix agent persona and capabilities:
 * 1. Agent can write complete papers (not just guide)
 * 2. Perbarui prinsip kerja agar menekankan akurasi dan penulisan paper utuh
 * 3. Clarify tool usage (google_search vs other tools - alternating based on state)
 *
 * Run via: npx convex run "migrations/fixAgentPersonaAndCapabilities:fixAgentPersonaAndCapabilities"
 */

export const fixAgentPersonaAndCapabilities = internalMutation({
  handler: async ({ db }) => {
    const activePrompt = await db
      .query("systemPrompts")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    if (!activePrompt) {
      return { success: false, message: "Tidak ada system prompt yang aktif." }
    }

    let newContent = activePrompt.content

    // ========================================================================
    // FIX 1: Update KEMAMPUAN UTAMA #7
    // From: "Memandu penulisan paper"
    // To: "Menulis paper utuh per tahap"
    // ========================================================================
    newContent = newContent.replace(
      /7\. \*\*Memandu penulisan paper melalui Paper Writing Workflow\*\* - sistem terstruktur 13 tahap dengan pendekatan dialog-first/,
      `7. **Menulis paper akademik utuh per tahap** - menyusun draf lengkap sampai final melalui Paper Writing Workflow`
    )

    // ========================================================================
    // FIX 2: Update PRINSIP KERJA section
    // ========================================================================
    const prinsipKerjaRegex = /(?:BATASAN|PRINSIP KERJA):\n[\s\S]*?(?=\n\nSelalu respons dengan helpful, terstruktur, dan actionable\.|$)/
    newContent = newContent.replace(
      prinsipKerjaRegex,
      `PRINSIP KERJA:
- Utamakan akurasi: jangan mengada-ada data, angka, atau rujukan.
- Tulis paper lengkap, utuh di setiap stage, berbasis konteks yang user berikan maupun yang sudah disepakati di setiap stage.
- Jika info/sumber belum cukup, tanyakan dulu sebelum menulis.
- Jaga konsistensi format sitasi sesuai gaya yang diminta.
- Fokus pada academic writing berbahasa Indonesia

CATATAN PENTING:
- Dalam Paper Writing Workflow, Anda MAMPU dan DIHARAPKAN menulis konten paper secara utuh per tahap
- Setiap tahap menghasilkan output konkret (draft section, outline, dll) yang disimpan sebagai artifact
- User tetap memiliki kontrol penuh melalui sistem validasi (setujui/revisi)`
    )

    // ========================================================================
    // FIX 3: Update PAPER WORKFLOW intro
    // From: "memandu user menulis"
    // To: "menulis paper akademik untuk user"
    // ========================================================================
    newContent = newContent.replace(
      /## PAPER WORKFLOW \(13 TAHAP\)\n\nAnda memiliki kemampuan untuk memandu user menulis paper akademik melalui \*\*alur kerja 13 tahap\*\* yang terstruktur\. Gunakan tool paper untuk mengelola sesi penulisan\./,
      `## PAPER WORKFLOW (13 TAHAP)

Anda memiliki kemampuan untuk **menulis paper akademik secara utuh** untuk user melalui **alur kerja 13 tahap** yang terstruktur. Anda bukan hanya pendamping, tetapi juga penulis aktif yang menghasilkan konten lengkap per tahap. Gunakan tool paper untuk mengelola sesi penulisan.`
    )

    // ========================================================================
    // FIX 4: Update CATATAN PENTING with explicit tool usage rules
    // ========================================================================
    newContent = newContent.replace(
      /### CATATAN PENTING\n\n- \*\*google_search\*\* dan tool paper tidak bisa dipakai bersamaan dalam satu request\n- Setiap tahap punya \*\*ringkasan\*\* yang akan jadi konteks untuk tahap berikutnya\n- Setelah tahap 3 \(outline\), checklist outline selalu tampil sebagai panduan\n- Saat sesi selesai \(tahap 13 disetujui\), user bisa ekspor ke Word\/PDF/,
      `### PENGGUNAAN TOOL (PENTING!)

**Tool Mode - Bergantian Berdasarkan Kebutuhan:**

1. **Web Search Mode** (google_search):
   - Gunakan saat perlu data terkini, referensi, atau literatur
   - Aktif di tahap awal (gagasan, topik, tinjauan_literatur)
   - TIDAK bisa dipakai bersamaan dengan tool paper dalam satu request

2. **Paper Tools Mode** (startPaperSession, updateStageData, submitStageForValidation):
   - Gunakan saat menyusun, menyimpan, dan memvalidasi konten
   - Selalu simpan hasil kerja dengan \`updateStageData\`
   - Buat artifact untuk konten yang sudah matang

3. **Artifact Tool** (createArtifact):
   - Gunakan untuk menyimpan draft section, outline, atau konten final
   - Bisa dipakai bersamaan dengan paper tools
   - Setiap tahap HARUS menghasilkan artifact sebagai output

**Aturan Alternasi:**
- Dalam satu response, pilih SATU mode: web search ATAU paper tools
- Jika butuh search lalu update, lakukan di response terpisah
- Artifact bisa dibuat kapan saja (tidak terikat mode)

### CATATAN TAMBAHAN

- Setiap tahap punya **ringkasan** yang jadi konteks untuk tahap berikutnya
- Setelah tahap 3 (outline), checklist outline selalu tampil sebagai panduan
- Saat sesi selesai (tahap 13 disetujui), user bisa ekspor ke Word/PDF
- Anda HARUS menghasilkan konten konkret, bukan hanya saran atau panduan`
    )

    const now = Date.now()
    const newVersion = activePrompt.version + 1
    const rootId = activePrompt.rootId ?? activePrompt._id

    const newPromptId = await db.insert("systemPrompts", {
      name: activePrompt.name,
      content: newContent,
      description: "Fixed agent persona: dapat menulis paper utuh + tool usage rules",
      version: newVersion,
      isActive: true,
      parentId: activePrompt._id,
      rootId: rootId,
      createdBy: activePrompt.createdBy,
      createdAt: now,
      updatedAt: now,
    })

    await db.patch(activePrompt._id, { isActive: false, updatedAt: now })

    // Count changes made
    const changes = []
    if (newContent.includes("Menulis paper akademik utuh per tahap")) changes.push("KEMAMPUAN UTAMA #7")
    if (newContent.includes("MAMPU dan DIHARAPKAN menulis konten paper")) changes.push("BATASAN section")
    if (newContent.includes("menulis paper akademik secara utuh")) changes.push("PAPER WORKFLOW intro")
    if (newContent.includes("PENGGUNAAN TOOL (PENTING!)")) changes.push("Tool usage rules")

    return {
      success: true,
      promptId: newPromptId,
      version: newVersion,
      changes: changes,
      message: `System prompt v${newVersion}: Fixed ${changes.length} issues - ${changes.join(", ")}`,
    }
  },
})
