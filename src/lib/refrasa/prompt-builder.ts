/**
 * Two-Layer Prompt Builder for Refrasa Tool
 *
 * ARCHITECTURE:
 * - Layer 1 (Core Naturalness Criteria): HARDCODED - Anti-AI detection patterns
 * - Layer 2 (Style Constitution): DYNAMIC - Editable via admin panel
 *
 * CRITICAL RULE: Layer 1 CANNOT be overridden by constitution
 *
 * LLM LIMITATION NOTE:
 * LLM buruk dalam counting → gunakan instruksi KUALITATIF, bukan kuantitatif
 */

// ============================================================================
// LAYER 1: Core Naturalness Criteria (HARDCODED)
// ============================================================================

/**
 * Layer 1 contains QUALITATIVE instructions for naturalness.
 * These criteria are designed to help text pass AI detection tools.
 *
 * NEVER use quantitative instructions like:
 * - "No word >3x per 500 words" (LLM can't count reliably)
 * - "Mix lengths (short <10, medium 10-20, long >20 words)"
 *
 * ALWAYS use qualitative instructions like:
 * - "Strictly avoid repeating vocabulary close together"
 * - "Vary sentence structures naturally"
 */
const LAYER_1_CORE_NATURALNESS = `
## LAYER 1: Core Naturalness Criteria (KRITERIA UTAMA - TIDAK BISA DI-OVERRIDE)

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
`.trim()

// ============================================================================
// ACADEMIC ESCAPE CLAUSE (CRITICAL)
// ============================================================================

/**
 * The Academic Escape Clause protects essential academic elements
 * from being modified in the name of "naturalness".
 *
 * Rule: If unsure whether a word is technical terminology, KEEP IT.
 * Consistency > Variation for technical terms.
 */
const ACADEMIC_ESCAPE_CLAUSE = `
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

**Panduan Utama:** Konsistensi > Variasi untuk elemen-elemen di atas.
`.trim()

// ============================================================================
// OUTPUT FORMAT SPECIFICATION
// ============================================================================

const OUTPUT_FORMAT_SPEC = `
## OUTPUT FORMAT

Berikan output dalam format JSON dengan struktur:

\`\`\`json
{
  "issues": [
    {
      "type": "vocabulary_repetition" | "sentence_pattern" | "paragraph_rhythm" | "hedging_balance" | "burstiness" | "style_violation",
      "category": "naturalness" | "style",
      "message": "Deskripsi masalah dalam Bahasa Indonesia",
      "severity": "info" | "warning" | "critical",
      "suggestion": "Saran perbaikan opsional dalam Bahasa Indonesia"
    }
  ],
  "refrasedText": "Teks hasil perbaikan dalam Bahasa Indonesia"
}
\`\`\`

### Issue Categories:
- **naturalness**: Masalah dari Layer 1 (vocabulary_repetition, sentence_pattern, paragraph_rhythm, hedging_balance, burstiness)
- **style**: Masalah dari Layer 2 Style Constitution (style_violation)

### Severity Levels:
- **info**: Saran minor, perbaikan kosmetik
- **warning**: Masalah terlihat, disarankan untuk diperbaiki
- **critical**: Masalah signifikan, sangat disarankan untuk diperbaiki

### Bahasa Output:
- Semua message dan suggestion HARUS dalam Bahasa Indonesia
- Pengecualian: Istilah teknis dan rujukan boleh dalam Bahasa Inggris
- refrasedText HARUS dalam Bahasa Indonesia (kecuali istilah teknis)
`.trim()

// ============================================================================
// PROMPT BUILDER FUNCTION
// ============================================================================

/**
 * Build the complete Refrasa prompt with two-layer architecture
 *
 * @param content - The text to analyze and refrasa
 * @param constitution - Optional Style Constitution content (Layer 2)
 *                       If null/undefined, only Layer 1 is applied
 * @param naturalnessConstitution - Optional Naturalness Constitution content (Layer 1 from DB)
 *                                  If null/undefined, hardcoded LAYER_1_CORE_NATURALNESS is used as fallback
 * @returns Complete prompt string for LLM
 */
export function buildRefrasaPrompt(
  content: string,
  constitution?: string | null,
  naturalnessConstitution?: string | null
): string {
  const parts: string[] = []

  // System introduction
  parts.push(`# Refrasa: Perbaikan Gaya Penulisan Akademis

Anda adalah Refrasa, asisten perbaikan gaya penulisan akademis Bahasa Indonesia.

**Tugas Anda:**
1. Analisis teks input untuk menemukan masalah naturalness dan style
2. Perbaiki masalah yang ditemukan
3. Kembalikan daftar issues dan teks yang sudah diperbaiki

**Dual Goal:**
1. **Humanize Writing** - Standar penulisan akademis yang natural dan manusiawi
2. **Anti-Deteksi LLM** - Upaya mengurangi pola deteksi AI (tanpa jaminan lolos)
`)

  // Layer 1: Naturalness — from DB if available, else hardcoded fallback
  if (naturalnessConstitution && naturalnessConstitution.trim()) {
    parts.push(`## LAYER 1: Core Naturalness Criteria (KRITERIA UTAMA - TIDAK BISA DI-OVERRIDE)

${naturalnessConstitution.trim()}
`)
  } else {
    parts.push(LAYER_1_CORE_NATURALNESS)
  }

  // Academic Escape Clause (ALWAYS included)
  parts.push(ACADEMIC_ESCAPE_CLAUSE)

  // Layer 2: Style Constitution (Optional, dynamic from database)
  if (constitution && constitution.trim()) {
    parts.push(`
## LAYER 2: Style Constitution (PANDUAN GAYA TAMBAHAN)

${constitution.trim()}

**PENTING:** Style Constitution memberikan panduan gaya TAMBAHAN. Jika ada konflik dengan Layer 1 Core Naturalness, Layer 1 SELALU menang.
`)
  } else {
    parts.push(`
## LAYER 2: Style Constitution

*Tidak ada Style Constitution aktif. Gunakan hanya Layer 1 Core Naturalness.*
`)
  }

  // Output format specification
  parts.push(OUTPUT_FORMAT_SPEC)

  // Content to analyze
  parts.push(`
## TEKS INPUT UNTUK DIANALISIS DAN DIPERBAIKI

\`\`\`
${content}
\`\`\`

Analisis teks di atas menggunakan kriteria Layer 1 ${constitution ? "dan Layer 2 " : ""}kemudian berikan output dalam format JSON yang diminta.
`)

  return parts.join("\n\n")
}

/**
 * Build a simpler prompt for Layer 1 only (when no constitution is available)
 * This is equivalent to buildRefrasaPrompt(content, null) but more explicit
 */
export function buildRefrasaPromptLayer1Only(content: string): string {
  return buildRefrasaPrompt(content, null, null)
}
