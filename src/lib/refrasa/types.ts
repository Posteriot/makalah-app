/**
 * Type definitions for Refrasa tool - LLM Powered
 *
 * Two-Layer Architecture:
 * - Layer 1 (Core Naturalness Criteria): Hardcoded in prompt-builder
 * - Layer 2 (Style Constitution): Editable via admin panel
 *
 * Note: Score removed due to self-grading bias (same model analyze + rewrite = bias)
 */

/**
 * Issue types from Refrasa analysis
 *
 * Naturalness issues (Layer 1 - hardcoded criteria):
 * - vocabulary_repetition: Non-technical vocabulary repeated too close together
 * - sentence_pattern: Monotonous sentence structure/length
 * - paragraph_rhythm: Unnatural paragraph flow
 * - hedging_balance: Missing or excessive academic hedging
 * - burstiness: Lack of variable complexity (too uniform writing)
 *
 * Style issues (Layer 2 - from constitution):
 * - style_violation: Violation of style constitution rules
 */
export type RefrasaIssueType =
  | "vocabulary_repetition"
  | "sentence_pattern"
  | "paragraph_rhythm"
  | "hedging_balance"
  | "burstiness"
  | "style_violation"

/**
 * Category of issue source
 * - naturalness: From Layer 1 (Core Naturalness Criteria)
 * - style: From Layer 2 (Style Constitution)
 */
export type RefrasaIssueCategory = "naturalness" | "style"

/**
 * Severity levels for issues
 * - info: Minor suggestion, cosmetic improvement
 * - warning: Noticeable issue, recommended to fix
 * - critical: Significant issue, strongly recommended to fix
 */
export type RefrasaIssueSeverity = "info" | "warning" | "critical"

/**
 * Single issue detected and fixed by Refrasa
 */
export interface RefrasaIssue {
  /** Type of the issue */
  type: RefrasaIssueType
  /** Source category: naturalness (Layer 1) or style (Layer 2) */
  category: RefrasaIssueCategory
  /** Human-readable message describing the issue (Bahasa Indonesia) */
  message: string
  /** Severity level */
  severity: RefrasaIssueSeverity
  /** Optional suggestion for improvement (Bahasa Indonesia) */
  suggestion?: string
}

/**
 * Request body for POST /api/refrasa
 */
export interface RefrasaRequest {
  /** Text content to analyze and refrasa (minimum 50 chars) */
  content: string
  /** Optional artifact ID for tracking purposes */
  artifactId?: string
}

/**
 * Response from POST /api/refrasa
 *
 * Note: Score fields removed due to self-grading bias.
 * UI should use issue count as indicator instead.
 */
export interface RefrasaResponse {
  /** List of issues found and addressed */
  issues: RefrasaIssue[]
  /** Text after refrasa improvements */
  refrasedText: string
}
