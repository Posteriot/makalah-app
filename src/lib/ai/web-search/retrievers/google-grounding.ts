import { google } from "@ai-sdk/google"
import { normalizeCitations } from "@/lib/citations/normalizer"
import type { NormalizedCitation } from "@/lib/citations/types"
import type { AnyStreamTextResult, RetrieverConfig, SearchRetriever } from "../types"

const SOURCE_TIMEOUT_MS = 6000

export const googleGroundingRetriever: SearchRetriever = {
  name: "google-grounding",

  buildStreamConfig(config: RetrieverConfig) {
    return {
      model: google(config.modelId),
      tools: { google_search: google.tools.googleSearch({}) },
    }
  },

  async extractSources(
    result: AnyStreamTextResult
  ): Promise<NormalizedCitation[]> {
    try {
      const [sources, metadata] = await Promise.race([
        Promise.all([result.sources, result.providerMetadata]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Google Grounding sources timeout")), SOURCE_TIMEOUT_MS)
        ),
      ])

      const groundingMetadata = (metadata as Record<string, unknown>)?.google as
        | Record<string, unknown>
        | undefined
      if (groundingMetadata?.groundingMetadata) {
        return normalizeCitations(metadata, "gateway")
      }
      return normalizeCitations(sources, "gateway")
    } catch {
      console.warn("[google-grounding] Failed to extract sources within timeout")
      return []
    }
  },
}
