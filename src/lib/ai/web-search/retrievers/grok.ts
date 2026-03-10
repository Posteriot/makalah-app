import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { normalizeCitations } from "@/lib/citations/normalizer"
import type { NormalizedCitation } from "@/lib/citations/types"
import type { AnyStreamTextResult, RetrieverConfig, SearchRetriever } from "../types"

const SOURCE_TIMEOUT_MS = 8000

function isVertexProxyUrl(raw: string): boolean {
  try {
    const hostname = new URL(raw).hostname
    return (
      hostname === "vertexaisearch.cloud.google.com" ||
      hostname.startsWith("vertexaisearch.cloud.google.")
    )
  } catch {
    return false
  }
}

export const grokRetriever: SearchRetriever = {
  name: "grok",

  buildStreamConfig(config: RetrieverConfig) {
    const openrouter = createOpenRouter({ apiKey: config.apiKey })
    const maxResults = (config.providerOptions?.maxResults as number) ?? 5
    const engine = config.providerOptions?.engine as string | undefined

    return {
      model: openrouter.chat(config.modelId, {
        web_search_options: {
          max_results: maxResults,
          ...(engine && engine !== "auto" ? { search_engine: engine } : {}),
        },
      }),
    }
  },

  async extractSources(
    result: AnyStreamTextResult
  ): Promise<NormalizedCitation[]> {
    try {
      const metadata = await Promise.race([
        result.providerMetadata,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Grok metadata timeout")), SOURCE_TIMEOUT_MS)
        ),
      ])
      const citations = normalizeCitations(metadata, "openrouter")
      return citations.filter((c) => !isVertexProxyUrl(c.url))
    } catch {
      console.warn("[grok] Failed to extract sources within timeout")
      return []
    }
  },
}
