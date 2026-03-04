import type { GoogleSearchToolUnavailableReason } from "./google-search-tool"

export type SearchExecutionMode =
  | "primary_google_search"
  | "fallback_online_search"
  | "blocked_unavailable"
  | "off"

export function resolveSearchExecutionMode(input: {
  searchRequired: boolean
  primaryToolReady: boolean
  primaryEnabled: boolean
  fallbackOnlineEnabled: boolean
  fallbackProvider: string
}): SearchExecutionMode {
  if (!input.searchRequired) return "off"
  if (input.primaryToolReady && input.primaryEnabled) return "primary_google_search"
  if (input.fallbackOnlineEnabled && input.fallbackProvider === "openrouter") {
    return "fallback_online_search"
  }
  return "blocked_unavailable"
}

export function mapSearchToolReasonToFallbackReason(
  reason: GoogleSearchToolUnavailableReason
): string {
  if (reason === "import_failed") return "google_search_tool_import_failed"
  if (reason === "factory_missing") return "google_search_tool_factory_missing"
  if (reason === "factory_init_failed") return "google_search_tool_factory_init_failed"
  return "google_search_tool_unknown_unavailable"
}

