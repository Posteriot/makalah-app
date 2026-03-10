import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { normalizeCitations } from "@/lib/citations/normalizer"
import type { NormalizedCitation } from "@/lib/citations/types"
import type { AnyStreamTextResult, RetrieverConfig, SearchRetriever } from "../types"

const SOURCE_TIMEOUT_MS = 6000

export const openaiSearchRetriever: SearchRetriever = {
  name: "openai-search",

  buildStreamConfig(config: RetrieverConfig) {
    const openrouter = createOpenRouter({ apiKey: config.apiKey })
    return { model: openrouter.chat(config.modelId) }
  },

  async extractSources(
    result: AnyStreamTextResult
  ): Promise<NormalizedCitation[]> {
    try {
      const metadata = await Promise.race([
        result.providerMetadata,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("OpenAI Search metadata timeout")), SOURCE_TIMEOUT_MS)
        ),
      ])
      return normalizeCitations(metadata, "openrouter")
    } catch {
      console.warn("[openai-search] Failed to extract sources within timeout")
      return []
    }
  },
}
