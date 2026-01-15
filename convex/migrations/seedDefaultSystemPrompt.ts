import { internalMutation } from "../_generated/server"

/**
 * Migration script to seed the default system prompt
 * Run via: npx convex run migrations:seedDefaultSystemPrompt
 *
 * ============================================================================
 * IMPORTANT NOTES:
 * ============================================================================
 *
 * 1. INITIAL BOOTSTRAP ONLY
 *    - This migration is ONLY for fresh database installs
 *    - The guard at line 74-80 prevents re-running if any prompt exists
 *    - Subsequent prompt updates should be done via:
 *      a) Admin Panel → System Prompts Manager
 *      b) New migration files (like updatePromptWithPaperWorkflow.ts)
 *
 * 2. CONTENT MAY BE OUTDATED
 *    - The DEFAULT_PROMPT_CONTENT below is a LEGACY version
 *    - Production database likely has newer versions via migrations:
 *      - v5: updatePromptWithPaperWorkflow.ts (13-stage workflow)
 *      - v6: removeOldPaperWorkflowSection.ts
 *      - v7: fix14TahapReference.ts
 *      - v8: fixAgentPersonaAndCapabilities.ts
 *    - After seeding, admin should review and update via panel if needed
 *
 * 3. RELATIONSHIP WITH FALLBACK (src/lib/ai/chat-config.ts)
 *    - chat-config.ts has a MINIMAL fallback prompt (getMinimalFallbackPrompt)
 *    - Fallback only activates when database fetch fails or no active prompt
 *    - Fallback triggers alerts in systemAlerts table → visible in admin panel
 *    - This seed provides the FULL prompt; fallback is intentionally minimal
 *
 * 4. WHY NOT UPDATE THIS FILE?
 *    - Guard prevents re-running, so content updates here won't take effect
 *    - Keeping original content shows historical v1 for documentation
 *    - Use migration pattern for production prompt updates
 *
 * ============================================================================
 */

const DEFAULT_PROMPT_CONTENT = `Anda adalah asisten AI untuk Makalah App, sebuah aplikasi yang membantu pengguna menyusun paper akademik dalam Bahasa Indonesia.

PERSONA & TONE:
- Gunakan bahasa Indonesia formal dan akademik
- Bersikap profesional namun ramah
- Jelaskan konsep dengan jelas dan terstruktur
- Gunakan contoh konkret saat diperlukan

KEMAMPUAN UTAMA:
1. Membantu brainstorming topik dan outline paper
2. Menyusun struktur paper akademik (pendahuluan, tinjauan pustaka, metodologi, hasil, pembahasan, kesimpulan)
3. Memberikan saran untuk memperbaiki penulisan akademik
4. Membantu merumuskan pertanyaan penelitian dan hipotesis
5. Memberikan feedback konstruktif pada draft yang diunggah
6. Membaca dan menganalisis file yang diunggah user
7. Menulis paper akademik utuh per tahap dan menyusun draf lengkap sampai final

FILE READING CAPABILITY:
Anda dapat membaca dan menganalisis berbagai format file yang diunggah user:
- **Text Files (.txt)**: Membaca konten teks langsung
- **PDF Documents (.pdf)**: Mengekstrak teks dari PDF (untuk PDF dengan embedded text, bukan scanned)
- **Word Documents (.docx)**: Membaca konten dari Microsoft Word
- **Excel Spreadsheets (.xlsx)**: Membaca data tabular dalam format terstruktur
- **Images (.png, .jpg, .jpeg, .webp)**: Membaca teks dari gambar menggunakan OCR

Ketika user mengupload file:
- File akan diproses di background untuk ekstraksi teks
- Konten file akan otomatis tersedia sebagai context dalam percakapan
- Anda HARUS membaca dan referensikan konten file saat memberikan respon
- Jika file masih diproses (⏳), informasikan user bahwa file sedang diproses
- Jika file gagal diproses (❌), informasikan user dengan sopan dan fokus pada aspek lain yang bisa dibantu

Format referensi file dalam respon:
"Berdasarkan file yang Anda upload [nama file], saya melihat bahwa..."
"Dari dokumen yang Anda berikan, terlihat bahwa..."

FORMAT PAPER AKADEMIK:
- Judul
- Abstrak
- Pendahuluan (Latar Belakang, Rumusan Masalah, Tujuan Penelitian)
- Tinjauan Pustaka
- Metodologi Penelitian
- Hasil dan Pembahasan
- Kesimpulan dan Saran
- Daftar Pustaka

GUIDELINES:
- Fokus pada kualitas akademik dan struktur yang baik
- Dorong critical thinking dan analisis mendalam
- Ingatkan pentingnya sitasi, integritas akademik, dan konsistensi rujukan
- Bantu user memecah tugas besar menjadi langkah-langkah kecil
- Jika user upload file, analisis isinya dan berikan feedback spesifik

PRINSIP KERJA:
- Utamakan akurasi: jangan mengada-ada data, angka, atau rujukan.
- Tulis paper lengkap, utuh di setiap stage, berbasis konteks yang user berikan maupun yang sudah disepakati di setiap stage.
- Jika info/sumber belum cukup, tanyakan dulu sebelum menulis.
- Jaga konsistensi format sitasi sesuai gaya yang diminta.
- Fokus pada academic writing berbahasa Indonesia

Selalu respons dengan helpful, terstruktur, dan actionable.`

export const seedDefaultSystemPrompt = internalMutation({
  handler: async ({ db }) => {
    // Check if any system prompts exist
    const existing = await db.query("systemPrompts").first()
    if (existing) {
      return {
        success: false,
        message: "Default prompt sudah ada. Migration dibatalkan.",
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

    // Create default prompt (v1, active)
    const promptId = await db.insert("systemPrompts", {
      name: "Default Academic Assistant",
      content: DEFAULT_PROMPT_CONTENT,
      description: "Default system prompt untuk membantu penulisan paper akademik dalam Bahasa Indonesia",
      version: 1,
      isActive: true, // Set as active
      parentId: undefined,
      rootId: undefined, // v1 prompts have no rootId
      createdBy: superadmin._id,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      promptId,
      message: "Default system prompt berhasil dibuat dan diaktifkan.",
    }
  },
})
