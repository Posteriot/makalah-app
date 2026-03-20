import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { normalizeSourcesList } from "@/lib/citations/normalizer"
import type { NormalizedCitation } from "@/lib/citations/types"
import type { AnyStreamTextResult, RetrieverConfig, SearchRetriever } from "../types"

const SOURCE_TIMEOUT_MS = 4000

export const perplexityRetriever: SearchRetriever = {
  name: "perplexity",

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
          setTimeout(() => reject(new Error("Perplexity sources timeout")), SOURCE_TIMEOUT_MS)
        ),
      ])
      return normalizeSourcesList(rawSources)
    } catch {
      console.warn("[perplexity] Failed to extract sources within timeout")
      return []
    }
  },
}
