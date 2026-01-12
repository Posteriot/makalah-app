import { z } from "zod"

/**
 * Zod schemas for Refrasa tool - LLM Powered
 *
 * Used for:
 * 1. Request validation (API input)
 * 2. LLM output parsing (generateObject schema)
 */

// ============================================================================
// Issue Type Enums
// ============================================================================

/**
 * All possible issue types
 *
 * Naturalness (Layer 1):
 * - vocabulary_repetition, sentence_pattern, paragraph_rhythm, hedging_balance, burstiness
 *
 * Style (Layer 2):
 * - style_violation
 */
export const RefrasaIssueTypeSchema = z.enum([
  "vocabulary_repetition",
  "sentence_pattern",
  "paragraph_rhythm",
  "hedging_balance",
  "burstiness",
  "style_violation",
])

/**
 * Issue category: naturalness (Layer 1) or style (Layer 2)
 */
export const RefrasaIssueCategorySchema = z.enum(["naturalness", "style"])

/**
 * Issue severity levels
 */
export const RefrasaIssueSeveritySchema = z.enum(["info", "warning", "critical"])

// ============================================================================
// Issue Schema
// ============================================================================

/**
 * Single issue schema for LLM output
 */
export const RefrasaIssueSchema = z.object({
  type: RefrasaIssueTypeSchema.describe(
    "Tipe masalah yang ditemukan"
  ),
  category: RefrasaIssueCategorySchema.describe(
    "Kategori sumber: 'naturalness' (kriteria inti) atau 'style' (konstitusi gaya)"
  ),
  message: z.string().min(5).max(500).describe(
    "Pesan deskriptif tentang masalah dalam Bahasa Indonesia"
  ),
  severity: RefrasaIssueSeveritySchema.describe(
    "Tingkat keparahan: 'info', 'warning', atau 'critical'"
  ),
  suggestion: z.string().max(500).optional().describe(
    "Saran perbaikan opsional dalam Bahasa Indonesia"
  ),
})

// ============================================================================
// Output Schema (for generateObject)
// ============================================================================

/**
 * LLM output schema for generateObject
 *
 * Note: Score removed due to self-grading bias
 */
export const RefrasaOutputSchema = z.object({
  issues: z.array(RefrasaIssueSchema).describe(
    "Daftar masalah yang ditemukan dan diperbaiki. Boleh kosong jika tidak ada masalah."
  ),
  refrasedText: z.string().min(10).describe(
    "Teks hasil perbaikan dalam Bahasa Indonesia. HARUS mempertahankan struktur markdown dan citation keys dari input."
  ),
})

// ============================================================================
// Request Body Schema
// ============================================================================

/**
 * Request body validation for POST /api/refrasa
 */
export const RequestBodySchema = z.object({
  content: z.string()
    .min(50, "Konten minimal 50 karakter")
    .describe("Teks yang akan dianalisis dan diperbaiki"),
  artifactId: z.string().optional().describe(
    "ID artifact opsional untuk tracking"
  ),
})

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type RefrasaIssueTypeZod = z.infer<typeof RefrasaIssueTypeSchema>
export type RefrasaIssueCategoryZod = z.infer<typeof RefrasaIssueCategorySchema>
export type RefrasaIssueSeverityZod = z.infer<typeof RefrasaIssueSeveritySchema>
export type RefrasaIssueZod = z.infer<typeof RefrasaIssueSchema>
export type RefrasaOutputZod = z.infer<typeof RefrasaOutputSchema>
export type RequestBodyZod = z.infer<typeof RequestBodySchema>
