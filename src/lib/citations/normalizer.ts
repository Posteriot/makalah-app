/**
 * Citation Normalizer
 *
 * Normalize citation formats dari berbagai AI providers ke unified NormalizedCitation[].
 * Semua normalizer functions dirancang untuk fail gracefully (return [] on error, no throw).
 */

import type {
  NormalizedCitation,
  CitationProvider,
  GoogleGroundingMetadata,
  GoogleGroundingChunk,
  GoogleGroundingSupport,
  OpenAIAnnotation,
} from './types'

// ═══════════════════════════════════════════════════════════════════════════
// Type Guards & Helpers
// ═══════════════════════════════════════════════════════════════════════════

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isValidUrl = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.trim().length === 0) return false
  try {
    new URL(value)
    return true
  } catch {
    // Allow URLs without protocol (will be handled by consumer)
    return value.includes('.') && !value.includes(' ')
  }
}

const isValidNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

// ═══════════════════════════════════════════════════════════════════════════
// Task 1.2: Google Grounding Normalizer
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Type guard untuk Google Grounding chunk
 */
const isGroundingChunk = (value: unknown): value is GoogleGroundingChunk => {
  if (!isRecord(value)) return false
  const web = value.web
  if (!isRecord(web)) return false
  return typeof web.uri === 'string' || typeof web.title === 'string'
}

/**
 * Type guard untuk Google Grounding support
 */
const isGroundingSupport = (value: unknown): value is GoogleGroundingSupport => {
  if (!isRecord(value)) return false
  // groundingSupport harus punya segment atau groundingChunkIndices
  return 'segment' in value || 'groundingChunkIndices' in value
}

/**
 * Extract GoogleGroundingMetadata dari provider metadata object.
 * Handles nested structure: providerMetadata.google.groundingMetadata
 */
const extractGoogleGroundingMetadata = (
  providerMetadata: unknown
): GoogleGroundingMetadata | null => {
  if (!isRecord(providerMetadata)) return null

  // Direct groundingMetadata at root level
  if ('groundingChunks' in providerMetadata || 'groundingSupports' in providerMetadata) {
    return providerMetadata as GoogleGroundingMetadata
  }

  // Nested under 'google' key (AI SDK format)
  const google = providerMetadata.google
  if (isRecord(google)) {
    // Check for groundingMetadata inside google
    const groundingMetadata = google.groundingMetadata
    if (isRecord(groundingMetadata)) {
      return groundingMetadata as GoogleGroundingMetadata
    }
    // Or direct at google level
    if ('groundingChunks' in google || 'groundingSupports' in google) {
      return google as GoogleGroundingMetadata
    }
  }

  return null
}

/**
 * Normalize Google Grounding metadata ke NormalizedCitation[].
 *
 * Extraction flow:
 * 1. Extract unique URLs dari groundingChunks[].web.uri
 * 2. Map groundingSupports[].groundingChunkIndices ke citations
 * 3. Extract startIndex/endIndex dari segment data
 *
 * @param providerMetadata - Raw provider metadata (bisa nested atau flat)
 * @returns NormalizedCitation[] - Empty array if invalid/missing data
 */
export function normalizeGoogleGrounding(
  providerMetadata: unknown
): NormalizedCitation[] {
  try {
    const metadata = extractGoogleGroundingMetadata(providerMetadata)
    if (!metadata) return []

    const chunks = metadata.groundingChunks
    if (!Array.isArray(chunks) || chunks.length === 0) return []

    // Step 1: Build source map from chunks
    const sourceMap = new Map<number, { url: string; title: string }>()

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]
      if (!isGroundingChunk(chunk)) continue

      const uri = chunk.web?.uri
      if (!isValidUrl(uri)) continue

      sourceMap.set(i, {
        url: uri,
        title: chunk.web?.title || uri,
      })
    }

    if (sourceMap.size === 0) return []

    // Step 2: Process groundingSupports to get position data
    const supports = metadata.groundingSupports
    const citations: NormalizedCitation[] = []

    // Track which chunks have been used (for deduplication)
    const processedChunkIndices = new Set<number>()

    if (Array.isArray(supports)) {
      for (const support of supports) {
        if (!isGroundingSupport(support)) continue

        const chunkIndices = support.groundingChunkIndices
        if (!Array.isArray(chunkIndices)) continue

        const segment = support.segment
        const startIndex = isValidNumber(segment?.startIndex) ? segment.startIndex : undefined
        const endIndex = isValidNumber(segment?.endIndex) ? segment.endIndex : undefined
        const citedText = typeof segment?.text === 'string' ? segment.text : undefined

        for (const chunkIndex of chunkIndices) {
          if (typeof chunkIndex !== 'number') continue
          const source = sourceMap.get(chunkIndex)
          if (!source) continue

          // Mark this chunk as processed
          processedChunkIndices.add(chunkIndex)

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

    // Step 3: If no supports, return citations without position data
    // This handles case where chunks exist but no supports mapping
    if (citations.length === 0) {
      for (const [, source] of sourceMap) {
        citations.push({
          url: source.url,
          title: source.title,
        })
      }
    }

    return citations
  } catch (error) {
    // Graceful failure - log for debugging but don't throw
    console.error('[normalizeGoogleGrounding] Error:', error)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Task 1.3: OpenRouter/OpenAI Annotations Normalizer
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Type guard untuk OpenAI URL citation annotation
 */
const isUrlCitationAnnotation = (value: unknown): value is OpenAIAnnotation => {
  if (!isRecord(value)) return false
  return value.type === 'url_citation' && typeof value.url === 'string'
}

/**
 * Extract annotations array dari response object.
 * Handles multiple possible locations.
 */
const extractAnnotations = (response: unknown): OpenAIAnnotation[] => {
  if (!isRecord(response)) return []

  // Direct annotations array
  if (Array.isArray(response.annotations)) {
    return response.annotations.filter(isRecord) as OpenAIAnnotation[]
  }

  // Nested under message (OpenAI chat completion format)
  const message = response.message
  if (isRecord(message) && Array.isArray(message.annotations)) {
    return message.annotations.filter(isRecord) as OpenAIAnnotation[]
  }

  // Nested under experimental_providerMetadata.openrouter
  const providerMeta = response.experimental_providerMetadata
  if (isRecord(providerMeta)) {
    const openrouter = providerMeta.openrouter
    if (isRecord(openrouter) && Array.isArray(openrouter.annotations)) {
      return openrouter.annotations.filter(isRecord) as OpenAIAnnotation[]
    }
  }

  return []
}

/**
 * Normalize OpenRouter/OpenAI annotations ke NormalizedCitation[].
 *
 * Format yang di-handle:
 * - response.annotations[] dengan type === 'url_citation'
 * - response.message.annotations[] (chat completion format)
 * - experimental_providerMetadata.openrouter.annotations[]
 *
 * @param response - Raw response object dari OpenRouter/OpenAI
 * @returns NormalizedCitation[] - Empty array if invalid/missing data
 */
export function normalizeOpenAIAnnotations(
  response: unknown
): NormalizedCitation[] {
  try {
    const annotations = extractAnnotations(response)
    if (annotations.length === 0) return []

    const citations: NormalizedCitation[] = []

    for (const annotation of annotations) {
      // Only process url_citation type
      if (!isUrlCitationAnnotation(annotation)) continue

      const url = annotation.url
      if (!isValidUrl(url)) continue

      const title = typeof annotation.title === 'string' && annotation.title.trim()
        ? annotation.title.trim()
        : url

      // Map snake_case to camelCase
      const startIndex = isValidNumber(annotation.start_index)
        ? annotation.start_index
        : undefined
      const endIndex = isValidNumber(annotation.end_index)
        ? annotation.end_index
        : undefined

      citations.push({
        url,
        title,
        ...(startIndex !== undefined && { startIndex }),
        ...(endIndex !== undefined && { endIndex }),
      })
    }

    return citations
  } catch (error) {
    // Graceful failure - log for debugging but don't throw
    console.error('[normalizeOpenAIAnnotations] Error:', error)
    return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Task 1.4: Anthropic Citations Normalizer (Stub)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalize Anthropic citations ke NormalizedCitation[].
 *
 * TODO: Implement when Anthropic adds citation support.
 * Currently returns empty array as placeholder.
 *
 * @param _providerMetadata - Raw provider metadata from Anthropic
 * @returns NormalizedCitation[] - Always empty (not yet implemented)
 */
 
export function normalizeAnthropicCitations(
  _providerMetadata: unknown
): NormalizedCitation[] {
  void _providerMetadata
  // TODO: Implement when Anthropic adds native citation support
  // Reference: https://docs.anthropic.com/
  return []
}

// ═══════════════════════════════════════════════════════════════════════════
// Task 1.4: Main Normalizer Dispatcher
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Main dispatcher untuk normalize citations dari berbagai providers.
 *
 * Usage:
 * ```typescript
 * // Gateway (Google Grounding)
 * const citations = normalizeCitations(providerMetadata, 'gateway')
 *
 * // OpenRouter (:online)
 * const citations = normalizeCitations(response, 'openrouter')
 * ```
 *
 * @param providerData - Raw provider metadata atau response object
 * @param provider - Provider type untuk determine normalizer yang digunakan
 * @returns NormalizedCitation[] - Empty array for unknown providers
 */
export function normalizeCitations(
  providerData: unknown,
  provider: CitationProvider
): NormalizedCitation[] {
  switch (provider) {
    case 'gateway':
      return normalizeGoogleGrounding(providerData)

    case 'openrouter':
    case 'openai':
      return normalizeOpenAIAnnotations(providerData)

    case 'anthropic':
      return normalizeAnthropicCitations(providerData)

    default:
      // Unknown provider - return empty array (no throw)
      console.warn(`[normalizeCitations] Unknown provider: ${provider}`)
      return []
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Re-export types for convenience
// ═══════════════════════════════════════════════════════════════════════════

export type { NormalizedCitation, CitationProvider } from './types'
