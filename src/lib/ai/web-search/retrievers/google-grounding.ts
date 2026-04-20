import { google } from "@ai-sdk/google"
import { normalizeGoogleGrounding, normalizeSourcesList } from "@/lib/citations/normalizer"
import type { NormalizedCitation } from "@/lib/citations/types"
import type { AnyStreamTextResult, RetrieverConfig, SearchRetriever } from "../types"

const SOURCE_TIMEOUT_MS = 6000
const REDIRECT_TIMEOUT_MS = 3000
const REDIRECT_CONCURRENCY = 10
const MAX_CITATIONS = 20

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isVertexProxyUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname
    return (
      hostname === "vertexaisearch.cloud.google.com" ||
      hostname.startsWith("vertexaisearch.cloud.google.")
    )
  } catch {
    return false
  }
}

/**
 * Resolve a single vertex proxy redirect URL to the actual destination.
 * Uses HEAD + redirect:follow so response.url is the final destination.
 * Returns original URL if resolution fails.
 */
async function resolveRedirect(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REDIRECT_TIMEOUT_MS)
    const resp = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    })
    clearTimeout(timeout)
    // resp.url is the final URL after following all redirects
    return resp.url || url
  } catch {
    return url
  }
}

/**
 * Resolve all vertex proxy URLs in a batch with concurrency limit.
 */
export async function resolveVertexProxyUrls(
  citations: NormalizedCitation[]
): Promise<NormalizedCitation[]> {
  const proxyIndices: number[] = []
  for (let i = 0; i < citations.length; i++) {
    if (isVertexProxyUrl(citations[i].url)) proxyIndices.push(i)
  }

  if (proxyIndices.length === 0) return citations

  // Resolve in batches
  const resolved = [...citations]
  for (let i = 0; i < proxyIndices.length; i += REDIRECT_CONCURRENCY) {
    const batch = proxyIndices.slice(i, i + REDIRECT_CONCURRENCY)
    const results = await Promise.all(
      batch.map((idx) => resolveRedirect(resolved[idx].url))
    )
    for (let j = 0; j < batch.length; j++) {
      resolved[batch[j]] = { ...resolved[batch[j]], url: results[j] }
    }
  }

  return resolved
}

function deduplicateByUrl(citations: NormalizedCitation[]): NormalizedCitation[] {
  const seen = new Set<string>()
  return citations.filter((c) => {
    if (seen.has(c.url)) return false
    seen.add(c.url)
    return true
  })
}

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

      const metadataRecord = isRecord(metadata) ? metadata : null
      const googleMetadata = metadataRecord && isRecord(metadataRecord.google) ? metadataRecord.google : null
      const groundingMetadata = googleMetadata && isRecord(googleMetadata.groundingMetadata)
        ? googleMetadata.groundingMetadata
        : metadataRecord
      const groundingRecord = isRecord(groundingMetadata) ? groundingMetadata : null
      const groundingChunks = Array.isArray(groundingRecord?.groundingChunks) ? groundingRecord.groundingChunks.length : 0
      const groundingSupports = Array.isArray(groundingRecord?.groundingSupports) ? groundingRecord.groundingSupports.length : 0
      const sdkSourcesCount = Array.isArray(sources) ? sources.length : 0

      console.info("[google-grounding][extract-debug] metadata snapshot", {
        sdkSourcesCount,
        providerKeys: metadataRecord ? Object.keys(metadataRecord) : [],
        googleKeys: googleMetadata ? Object.keys(googleMetadata) : [],
        hasGroundingMetadata: Boolean(googleMetadata && "groundingMetadata" in googleMetadata),
        groundingChunks,
        groundingSupports,
      })

      // Use Google Grounding normalizer — extracts citedText from
      // groundingSupports[].segment.text via direct Google API.
      let raw: NormalizedCitation[] = normalizeGoogleGrounding(metadata)
      if (raw.length === 0) {
        // Fallback: if providerMetadata has no grounding data, try AI SDK result.sources
        const sourcesArr = Array.isArray(sources) ? sources : []
        console.info("[google-grounding][fallback-sources-list]", {
          providerMetadataNormalizedCount: raw.length,
          sdkSourcesCount: sourcesArr.length,
        })
        if (sourcesArr.length > 0) {
          raw = normalizeSourcesList(sources)
        }
        console.info("[google-grounding][fallback-sources-list-result]", {
          normalizedCount: raw.length,
        })
      }

      // Dedup by proxy URL and cap. Proxy URLs are returned as-is —
      // resolution is deferred to FetchWeb (redirect:follow) and
      // parallel batch resolve in orchestrator. This eliminates ~8.8s
      // of blocking HEAD requests from Phase 1.
      const deduped = deduplicateByUrl(raw)
      const capped = deduped.slice(0, MAX_CITATIONS)

      console.info("[google-grounding][extract-debug] citation pipeline", {
        rawCount: raw.length,
        dedupedCount: deduped.length,
        cappedCount: capped.length,
      })

      return capped
    } catch {
      console.warn("[google-grounding] Failed to extract sources within timeout")
      return []
    }
  },
}
