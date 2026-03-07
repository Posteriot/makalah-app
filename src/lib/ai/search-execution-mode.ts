import type { GoogleSearchToolUnavailableReason } from "./google-search-tool"

export type SearchExecutionMode =
  | "primary_perplexity"
  | "fallback_web_search"
  | "blocked_unavailable"
  | "off"

/**
 * Resolve which web search execution mode to use.
 *
 * Priority: primary (Perplexity Sonar) → fallback (Grok w/ web_search_options) → blocked.
 *
 * NOTE: If primary is disabled but fallback is enabled, "fallback_web_search" is returned
 * directly — the fallback model (e.g. Grok) becomes the sole web search provider.
 * This is intentional and allows admins to disable Perplexity while keeping web search active.
 */
export function resolveSearchExecutionMode(input: {
  searchRequired: boolean
  webSearchEnabled: boolean
  webSearchModel: string | undefined
  fallbackWebSearchEnabled: boolean
  webSearchFallbackModel: string | undefined
}): SearchExecutionMode {
  if (!input.searchRequired) return "off"
  if (input.webSearchEnabled && input.webSearchModel) return "primary_perplexity"
  if (input.fallbackWebSearchEnabled && input.webSearchFallbackModel) return "fallback_web_search"
  return "blocked_unavailable"
}

// TODO: Remove in Phase 5 cleanup if unused — this mapped google_search init failure reasons
// which may no longer be relevant after Perplexity migration.
export function mapSearchToolReasonToFallbackReason(
  reason: GoogleSearchToolUnavailableReason
): string {
  if (reason === "import_failed") return "google_search_tool_import_failed"
  if (reason === "factory_missing") return "google_search_tool_factory_missing"
  if (reason === "factory_init_failed") return "google_search_tool_factory_init_failed"
  return "google_search_tool_unknown_unavailable"
}

