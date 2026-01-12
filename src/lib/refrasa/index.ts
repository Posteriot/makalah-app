/**
 * Refrasa Tool - LLM Powered
 *
 * Two-Layer Architecture:
 * - Layer 1: Core Naturalness Criteria (hardcoded)
 * - Layer 2: Style Constitution (editable via admin panel)
 */

// Type definitions
export type {
  RefrasaIssueType,
  RefrasaIssueCategory,
  RefrasaIssueSeverity,
  RefrasaIssue,
  RefrasaRequest,
  RefrasaResponse,
} from "./types"

// Zod schemas
export {
  RefrasaIssueTypeSchema,
  RefrasaIssueCategorySchema,
  RefrasaIssueSeveritySchema,
  RefrasaIssueSchema,
  RefrasaOutputSchema,
  RequestBodySchema,
} from "./schemas"

// Prompt builder
export {
  buildRefrasaPrompt,
  buildRefrasaPromptLayer1Only,
} from "./prompt-builder"

// Loading messages
export {
  LOADING_MESSAGES,
  LOADING_ROTATION_INTERVAL,
  getRandomLoadingMessage,
  getLoadingMessageByIndex,
} from "./loading-messages"
