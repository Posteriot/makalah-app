import type { SearchExecutionMode } from "./types"

interface RetrieverEntry {
  name: SearchExecutionMode
  enabled: boolean
  modelId: string | undefined
}

export function resolveSearchExecutionMode(input: {
  searchRequired: boolean
  retrievers: RetrieverEntry[]
}): SearchExecutionMode {
  if (!input.searchRequired) return "off"
  for (const r of input.retrievers) {
    if (r.enabled && r.modelId) return r.name
  }
  return "blocked_unavailable"
}
