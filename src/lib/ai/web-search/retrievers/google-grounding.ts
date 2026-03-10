import { google } from "@ai-sdk/google"
import { normalizeCitations } from "@/lib/citations/normalizer"
import type { NormalizedCitation } from "@/lib/citations/types"
import type { AnyStreamTextResult, RetrieverConfig, SearchRetriever } from "../types"

const SOURCE_TIMEOUT_MS = 6000
const REDIRECT_TIMEOUT_MS = 3000
const REDIRECT_CONCURRENCY = 10
const MAX_CITATIONS = 20

function isVertexProxyUrl(url: string): boolean {
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
 * Uses GET + redirect:follow so response.url is the final destination.
 * Returns original URL if resolution fails.
 */
async function resolveRedirect(url: string): Promise<string> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REDIRECT_TIMEOUT_MS)
    const resp = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
    })
    clearTimeout(timeout)
    // response.url is the final URL after all redirects
    return resp.url || url
  } catch {
    return url
  }
}

/**
 * Resolve all vertex proxy URLs in a batch with concurrency limit.
 */
async function resolveVertexProxyUrls(
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

      // Try result.sources first, fallback to providerMetadata
      const sourcesArr = Array.isArray(sources) ? sources : []
      let raw: NormalizedCitation[]
      if (sourcesArr.length > 0) {
        raw = normalizeCitations(sources, "perplexity")
        if (raw.length === 0) raw = normalizeCitations(metadata, "gateway")
      } else {
        raw = normalizeCitations(metadata, "gateway")
      }

      // Step 1: Dedup by proxy URL
      const deduped = deduplicateByUrl(raw)

      // Step 2: Resolve vertex proxy URLs → actual URLs
      const resolved = await resolveVertexProxyUrls(deduped)

      // Step 3: Dedup again by actual URL (multiple proxies may point to same site)
      const final = deduplicateByUrl(resolved)

      // Step 4: Cap at maximum
      const capped = final.slice(0, MAX_CITATIONS)

      console.log(`[google-grounding] raw=${raw.length}, deduped=${deduped.length}, final=${final.length}, capped=${capped.length}`)

      return capped
    } catch {
      console.warn("[google-grounding] Failed to extract sources within timeout")
      return []
    }
  },
}
