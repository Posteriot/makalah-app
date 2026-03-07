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

