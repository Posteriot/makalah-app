import type { SearchRetriever } from "./types"
import { perplexityRetriever } from "./retrievers/perplexity"
import { grokRetriever } from "./retrievers/grok"
import { googleGroundingRetriever } from "./retrievers/google-grounding"

const registry = new Map<string, SearchRetriever>([
  ["perplexity", perplexityRetriever],
  ["grok", grokRetriever],
  ["google-grounding", googleGroundingRetriever],
])

export function getRetriever(name: string): SearchRetriever | undefined {
  return registry.get(name)
}
