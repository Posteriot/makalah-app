/**
 * Citation Normalizers
 *
 * Two normalizer functions — one per citation format:
 * - normalizeSourcesList(): AI SDK result.sources — [{ url, title }]
 * - normalizeGoogleGrounding(): Google providerMetadata — groundingChunks + groundingSupports
 *
 * Each retriever calls the normalizer it needs directly.
 * No dispatcher, no provider routing, no hardcoded provider names.
 */

import type {
  NormalizedCitation,
  GoogleGroundingMetadata,
  GoogleGroundingChunk,
  GoogleGroundingSupport,
} from './types'
import { isBlockedSourceDomain } from '@/lib/ai/blocked-domains'
import { isValidCitationUrl } from './url-validation'

// ═══════════════════════════════════════════════════════════════════════════
// Shared Helpers
// ═══════════════════════════════════════════════════════════════════════════

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isValidUrl = (value: unknown): value is string => {
  return isValidCitationUrl(value)
}

const isValidNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

/**
 * Post-filter: remove blocked domains from any citation array.
 */
export function filterBlockedDomains(citations: NormalizedCitation[]): NormalizedCitation[] {
  return citations.filter(c => !isBlockedSourceDomain(c.url))
}

// ═══════════════════════════════════════════════════════════════════════════
// AI SDK Sources Normalizer
// ═══════════════════════════════════════════════════════════════════════════

interface AiSdkSource {
  url: string
  title?: string
}

const isAiSdkSource = (value: unknown): value is AiSdkSource => {
  if (!isRecord(value)) return false
  return typeof value.url === 'string'
}

/**
 * Normalize AI SDK result.sources to NormalizedCitation[].
 *
 * AI SDK unified format: [{ url, title? }] — returned by all providers
 * via result.sources (Perplexity via OpenRouter, Grok via OpenRouter,
 * Google direct, etc). No content snippets — only URL and title.
 */
export function normalizeSourcesList(
  sources: unknown
): NormalizedCitation[] {
  try {
    if (!Array.isArray(sources)) return []

    const citations: NormalizedCitation[] = []

    for (const source of sources) {
      if (!isAiSdkSource(source)) continue
      if (!isValidUrl(source.url)) continue

      citations.push({
        url: source.url,
        title: source.title ?? '',
      })
    }

    return filterBlockedDomains(citations)
  } catch (error) {
    console.error('[normalizeSourcesList] Error:', error)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Google Grounding Normalizer
// ═══════════════════════════════════════════════════════════════════════════

const isGroundingChunk = (value: unknown): value is GoogleGroundingChunk => {
  if (!isRecord(value)) return false
  const web = value.web
  if (!isRecord(web)) return false
  return typeof web.uri === 'string' || typeof web.title === 'string'
}

const isGroundingSupport = (value: unknown): value is GoogleGroundingSupport => {
  if (!isRecord(value)) return false
  return 'segment' in value || 'groundingChunkIndices' in value
}

/**
 * Extract GoogleGroundingMetadata from providerMetadata.
 * Handles nested structure: providerMetadata.google.groundingMetadata
 */
const extractGoogleGroundingMetadata = (
  providerMetadata: unknown
): GoogleGroundingMetadata | null => {
  if (!isRecord(providerMetadata)) return null

  if ('groundingChunks' in providerMetadata || 'groundingSupports' in providerMetadata) {
    return providerMetadata as GoogleGroundingMetadata
  }

  const google = providerMetadata.google
  if (isRecord(google)) {
    const groundingMetadata = google.groundingMetadata
    if (isRecord(groundingMetadata)) {
      return groundingMetadata as GoogleGroundingMetadata
    }
    if ('groundingChunks' in google || 'groundingSupports' in google) {
      return google as GoogleGroundingMetadata
    }
  }

  return null
}

/**
 * Normalize Google Grounding metadata to NormalizedCitation[].
 *
 * Extracts from providerMetadata returned by direct Google API
 * (@ai-sdk/google) when using google.tools.googleSearch().
 * Captures citedText from groundingSupports[].segment.text.
 */
export function normalizeGoogleGrounding(
  providerMetadata: unknown
): NormalizedCitation[] {
  try {
    const metadata = extractGoogleGroundingMetadata(providerMetadata)
    if (!metadata) {
      console.info('[normalizeGoogleGrounding][debug] no grounding metadata found')
      return []
    }

    const chunks = metadata.groundingChunks
    if (!Array.isArray(chunks) || chunks.length === 0) {
      console.info('[normalizeGoogleGrounding][debug] no grounding chunks found', {
        metadataKeys: isRecord(metadata) ? Object.keys(metadata) : [],
      })
      return []
    }

    const sourceMap = new Map<number, { url: string; title: string }>()
    let invalidChunkUrlCount = 0

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      if (!isGroundingChunk(chunk)) continue

      const uri = chunk.web?.uri
      if (!isValidUrl(uri)) {
        invalidChunkUrlCount += 1
        continue
      }

      sourceMap.set(i, {
        url: uri,
        title: chunk.web?.title || uri,
      })
    }

    if (sourceMap.size === 0) {
      console.info('[normalizeGoogleGrounding][debug] no valid chunk URLs survived validation', {
        chunksRaw: chunks.length,
        invalidChunkUrlCount,
      })
      return []
    }

    const supports = metadata.groundingSupports
    const citations: NormalizedCitation[] = []
    let validSupports = 0
    let fallbackNoSupportsUsed = false

    if (Array.isArray(supports)) {
      for (const support of supports) {
        if (!isGroundingSupport(support)) continue

        const chunkIndices = support.groundingChunkIndices
        if (!Array.isArray(chunkIndices)) continue
        validSupports += 1

        const segment = support.segment
        const startIndex = isValidNumber(segment?.startIndex) ? segment.startIndex : undefined
        const endIndex = isValidNumber(segment?.endIndex) ? segment.endIndex : undefined
        const citedText = typeof segment?.text === 'string' ? segment.text : undefined

        for (const chunkIndex of chunkIndices) {
          if (typeof chunkIndex !== 'number') continue
          const source = sourceMap.get(chunkIndex)
          if (!source) continue

          citations.push({
            url: source.url,
            title: source.title,
            ...(startIndex !== undefined && { startIndex }),
            ...(endIndex !== undefined && { endIndex }),
            ...(citedText && { citedText }),
          })
        }
      }
    }

    // Fallback: chunks exist but no supports mapping
    if (citations.length === 0) {
      fallbackNoSupportsUsed = true
      for (const [, source] of sourceMap) {
        citations.push({
          url: source.url,
          title: source.title,
        })
      }
    }

    console.info('[normalizeGoogleGrounding][debug]', {
      chunksRaw: chunks.length,
      validChunkSources: sourceMap.size,
      invalidChunkUrlCount,
      supportsRaw: Array.isArray(supports) ? supports.length : 0,
      validSupports,
      citationsBeforeFilter: citations.length,
      fallbackNoSupportsUsed,
    })

    const filtered = filterBlockedDomains(citations)
    console.info('[normalizeGoogleGrounding][debug-filter]', {
      citationsBeforeFilter: citations.length,
      citationsAfterFilter: filtered.length,
    })

    return filtered
  } catch (error) {
    console.error('[normalizeGoogleGrounding] Error:', error)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Re-export types
// ═══════════════════════════════════════════════════════════════════════════

export type { NormalizedCitation } from './types'
