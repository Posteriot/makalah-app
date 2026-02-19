import { internalMutation } from "../_generated/server"

/**
 * Migration script to seed the default naturalness constitution for Refrasa tool
 * Run via: npx convex run migrations:seedNaturalnessConstitution
 *
 * ============================================================================
 * IMPORTANT NOTES:
 * ============================================================================
 *
 * 1. INITIAL BOOTSTRAP ONLY
 *    - This migration is ONLY for fresh database installs or first-time setup
 *    - The guard prevents re-running if any active naturalness constitution exists
 *    - Subsequent updates should be done via Admin Panel -> Style Constitution Manager
 *
 * 2. TWO-LAYER ARCHITECTURE
 *    - Layer 1 (Core Naturalness Criteria): This editable content from database
 *    - Layer 2 (Style Constitution): Separate editable content from database
 *    - If no active naturalness constitution exists, hardcoded fallback is used
 *
 * 3. CONTENT SOURCE
 *    - Content copied from src/lib/refrasa/prompt-builder.ts (LAYER_1_CORE_NATURALNESS + ACADEMIC_ESCAPE_CLAUSE)
 *    - Convex functions cannot import from src/ (different runtimes)
 *
 * ============================================================================
 */

const DEFAULT_NATURALNESS_CONTENT = `## LAYER 1: Core Naturalness Criteria (KRITERIA UTAMA - TIDAK BISA DI-OVERRIDE)

### 1. Vocabulary Diversity (Variasi Kosakata)
Strictly avoid repeating non-technical vocabulary close together. Use synonyms aggressively for common words.
- Jika kata yang sama muncul dalam jarak dekat, WAJIB ganti dengan sinonim
- Pengecualian: Istilah teknis dan proper nouns (lihat Academic Escape Clause)
- Fokus pada kata kerja, kata sifat, dan kata keterangan umum

### 2. Sentence Pattern Variance (Variasi Pola Kalimat)
Vary sentence structures naturally. Mix short punchy sentences with longer explanatory ones.
- Hindari memulai kalimat berturut-turut dengan kata atau frasa yang sama
- Variasikan posisi subjek, predikat, dan keterangan
- Gunakan kalimat pendek untuk penekanan, kalimat panjang untuk penjelasan detail

### 3. Paragraph Rhythm (Ritme Paragraf)
Create natural paragraph flow. Some paragraphs should be brief for emphasis, others more developed for detailed explanation.
- Jangan membuat semua paragraf sama panjangnya
- Paragraf pendek untuk transisi atau penekanan
- Paragraf panjang untuk pembahasan mendalam

### 4. Hedging Balance (Keseimbangan Hedging Akademik)
Include appropriate academic hedging language where claims are not absolute.
- Gunakan penanda seperti 'cenderung', 'kemungkinan', 'tampaknya', 'dapat diargumentasikan', 'mengindikasikan'
- Hedging WAJIB untuk klaim yang bersifat interpretatif atau tidak mutlak
- Hindari hedging berlebihan yang melemahkan argumen

### 5. Burstiness (Variabilitas Kompleksitas)
Write with variable complexity like humans do. Mix technical precision with accessible explanations.
- Manusia menulis dengan variasi kompleksitas alami
- Kalimat teknis boleh lebih kompleks
- Selingi dengan penjelasan sederhana untuk readability
- Pertahankan formalitas akademis secara keseluruhan

## ACADEMIC ESCAPE CLAUSE (WAJIB DIPERTAHANKAN)

SELALU PERTAHANKAN elemen-elemen berikut TANPA PERUBAHAN:

1. **Technical Terminology Consistency**
   - Istilah teknis TIDAK diganti sinonim
   - Contoh: "machine learning" tetap "machine learning", bukan "pembelajaran mesin"
   - Jika ragu apakah kata adalah istilah teknis, PILIH UNTUK MEMPERTAHANKAN

2. **Academic Rigor and Formality**
   - Pertahankan nada formal akademis
   - Jangan menurunkan register bahasa

3. **Markdown Formatting Structure**
   - Heading (#, ##, ###)
   - List (-, *, 1., 2.)
   - Bold (**text**) dan Italic (*text*)
   - Links [text](url)
   - Code blocks (\`code\` dan \`\`\`code\`\`\`)
   - Blockquote (>)

4. **Citation/Reference Formatting**
   - Pertahankan format sitasi: "Menurut Smith (2020)..."
   - Citation keys: [@smith2020], [1], [2]
   - Bibliographic entries

5. **Discipline-Specific Conventions**
   - Konvensi penulisan sesuai bidang ilmu
   - Notasi matematika/ilmiah

6. **Proper Nouns and Named Entities**
   - Nama orang, tempat, organisasi
   - Judul karya, nama produk

**Panduan Utama:** Konsistensi > Variasi untuk elemen-elemen di atas.`

export const seedNaturalnessConstitution = internalMutation({
  handler: async ({ db }) => {
    // Check if active naturalness constitution already exists
    const activeConstitutions = await db
      .query("styleConstitutions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()

    const existingNaturalness = activeConstitutions.find(
      (c) => c.type === "naturalness"
    )

    if (existingNaturalness) {
      return {
        success: false,
        message:
          "Naturalness constitution aktif sudah ada. Migration dibatalkan.",
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
        message:
          "Superadmin user tidak ditemukan. Silakan buat superadmin terlebih dahulu.",
      }
    }

    const now = Date.now()

    // Create default naturalness constitution (v1, active)
    const constitutionId = await db.insert("styleConstitutions", {
      name: "Core Naturalness Criteria",
      content: DEFAULT_NATURALNESS_CONTENT,
      description:
        "Default naturalness criteria (Layer 1) untuk Refrasa tool - kriteria inti anti-AI detection",
      version: 1,
      isActive: true,
      type: "naturalness",
      parentId: undefined,
      rootId: undefined,
      createdBy: superadmin._id,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      constitutionId,
      message:
        "Default naturalness constitution berhasil dibuat dan diaktifkan.",
    }
  },
})
