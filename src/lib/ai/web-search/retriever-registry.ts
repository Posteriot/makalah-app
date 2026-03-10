import type { SearchRetriever } from "./types"
import { perplexityRetriever } from "./retrievers/perplexity"
import { grokRetriever } from "./retrievers/grok"
import { openaiSearchRetriever } from "./retrievers/openai-search"
import { googleGroundingRetriever } from "./retrievers/google-grounding"

const registry = new Map<string, SearchRetriever>([
  ["perplexity", perplexityRetriever],
  ["grok", grokRetriever],
  ["openai-search", openaiSearchRetriever],
  ["google-grounding", googleGroundingRetriever],
])

export function getRetriever(name: string): SearchRetriever | undefined {
  return registry.get(name)
}

export function getRetrieverNames(): string[] {
  return Array.from(registry.keys())
}
