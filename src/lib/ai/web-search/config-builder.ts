import { getRetriever } from "./retriever-registry"
import type { RetrieverChainEntry } from "./types"

interface WebSearchRetrieverConfig {
  name: string
  enabled: boolean
  modelId: string
  priority: number
  providerOptions?: { maxResults?: number; engine?: string }
}

interface LegacyWebSearchConfig {
  primaryWebSearchEnabled?: boolean
  fallbackWebSearchEnabled?: boolean
  webSearchModel?: string
  webSearchFallbackModel?: string
  fallbackWebSearchEngine?: string
  fallbackWebSearchMaxResults?: number
}

interface BuildChainInput {
  webSearchRetrievers?: WebSearchRetrieverConfig[]
  legacyConfig?: LegacyWebSearchConfig
  openrouterApiKey: string
  googleApiKey?: string
}

export function buildRetrieverChain(input: BuildChainInput): RetrieverChainEntry[] {
  return input.webSearchRetrievers
    ? fromRetrieverArray(input)
    : fromTwoSlotFields(input)
}

function fromRetrieverArray(input: BuildChainInput): RetrieverChainEntry[] {
  if (!input.webSearchRetrievers) return []

  const chain: RetrieverChainEntry[] = []

  const sorted = input.webSearchRetrievers
    .filter((r) => r.enabled && r.modelId)
    .sort((a, b) => a.priority - b.priority)

  for (const r of sorted) {
    const retriever = getRetriever(r.name)
    if (!retriever) {
      console.warn(`[config-builder] Unknown retriever: ${r.name}`)
      continue
    }

    const isGoogleDirect = r.name === "google-grounding"
    chain.push({
      retriever,
      retrieverConfig: {
        apiKey: isGoogleDirect
          ? (input.googleApiKey ?? "")
          : input.openrouterApiKey,
        modelId: r.modelId,
        providerOptions: r.providerOptions
          ? { ...r.providerOptions }
          : undefined,
      },
    })
  }

  return chain
}

function fromTwoSlotFields(input: BuildChainInput): RetrieverChainEntry[] {
  const chain: RetrieverChainEntry[] = []
  const legacy = input.legacyConfig ?? {}

  if (legacy.primaryWebSearchEnabled !== false && legacy.webSearchModel) {
    const retriever = getRetriever("perplexity")
    if (retriever) {
      chain.push({
        retriever,
        retrieverConfig: {
          apiKey: input.openrouterApiKey,
          modelId: legacy.webSearchModel,
        },
      })
    }
  }

  if (legacy.fallbackWebSearchEnabled !== false && legacy.webSearchFallbackModel) {
    const retriever = getRetriever("grok")
    if (retriever) {
      chain.push({
        retriever,
        retrieverConfig: {
          apiKey: input.openrouterApiKey,
          modelId: legacy.webSearchFallbackModel,
          providerOptions: {
            maxResults: legacy.fallbackWebSearchMaxResults ?? 5,
            engine: legacy.fallbackWebSearchEngine ?? "auto",
          },
        },
      })
    }
  }

  return chain
}
