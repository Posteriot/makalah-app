/**
 * Prompt Builder for Refrasa Tool
 *
 * ARCHITECTURE:
 * - Constitution: Single, editable via admin panel (optional)
 * - Academic Escape Clause: HARDCODED safety rule (always included)
 * - System/prompt split: constitution in system role, user text in prompt role
 */

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
- **naturalness**: Masalah naturalness (vocabulary_repetition, sentence_pattern, paragraph_rhythm, hedging_balance, burstiness)
- **style**: Masalah gaya penulisan dari constitution (style_violation)

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
 * Build the Refrasa prompt split into system (instructions) and prompt (user input).
 *
 * system role = constitution + instructions → highest LLM compliance
 * prompt role = user text to analyze → treated as input data
 *
 * @param content - The text to analyze and refrasa
 * @param constitution - Optional Style Constitution content
 * @returns { system, prompt } for separate passing to generateObject()
 */
export function buildRefrasaPrompt(
  content: string,
  constitution?: string | null
): { system: string; prompt: string } {
  const systemParts: string[] = []

  systemParts.push(`# Refrasa: Perbaikan Gaya Penulisan Akademis

Anda adalah Refrasa, asisten perbaikan gaya penulisan akademis Bahasa Indonesia.

**Tugas Anda:**
1. Analisis teks input untuk menemukan masalah naturalness dan style
2. Perbaiki masalah yang ditemukan
3. Kembalikan daftar issues dan teks yang sudah diperbaiki

**Dual Goal:**
1. **Humanize Writing** - Standar penulisan akademis yang natural dan manusiawi
2. **Anti-Deteksi LLM** - Upaya mengurangi pola deteksi AI (tanpa jaminan lolos)
`)

  if (constitution && constitution.trim()) {
    systemParts.push(`## CONSTITUTION (ATURAN WAJIB)

${constitution.trim()}
`)
  } else {
    systemParts.push(`## CONSTITUTION

*Tidak ada constitution aktif. Perbaiki naturalness teks secara umum: variasi kosakata, pola kalimat, ritme paragraf, dan hedging akademik.*
`)
  }

  systemParts.push(ACADEMIC_ESCAPE_CLAUSE)
  systemParts.push(OUTPUT_FORMAT_SPEC)

  const system = systemParts.join("\n\n")

  const prompt = `## TEKS INPUT UNTUK DIANALISIS DAN DIPERBAIKI

\`\`\`
${content}
\`\`\`

Analisis teks di atas menggunakan constitution${constitution ? " " : " (instruksi umum) "}kemudian berikan output dalam format JSON yang diminta.`

  return { system, prompt }
}
