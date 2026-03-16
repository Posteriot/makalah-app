import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { normalizeSourcesList } from "@/lib/citations/normalizer"
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
    return { model: openrouter.chat(config.modelId) }
  },

  async extractSources(
    result: AnyStreamTextResult
  ): Promise<NormalizedCitation[]> {
    try {
      const rawSources = await Promise.race([
        result.sources,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Grok sources timeout")), SOURCE_TIMEOUT_MS)
        ),
      ])
      const citations = normalizeSourcesList(rawSources)
      return citations.filter((c) => !isVertexProxyUrl(c.url))
    } catch {
      console.warn("[grok] Failed to extract sources within timeout")
      return []
    }
  },
}
