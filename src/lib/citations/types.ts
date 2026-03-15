/**
 * Citation Normalization Types
 *
 * Unified citation schema. All citation formats from any provider
 * are normalized to NormalizedCitation[].
 */

/**
 * Normalized citation format used throughout the application.
 */
export interface NormalizedCitation {
  /** Source URL */
  url: string

  /** Source title (falls back to URL if unavailable) */
  title: string

  /** Character position in text where citation starts (0-indexed) */
  startIndex?: number

  /** Character position in text where citation ends (exclusive) */
  endIndex?: number

  /** Cited text segment — propagated to compose context as Snippet: lines */
  citedText?: string

  /** Unix timestamp (ms) when source was published */
  publishedAt?: number
}

/**
 * Google Grounding chunk from groundingMetadata.groundingChunks[]
 */
export interface GoogleGroundingChunk {
  web?: {
    uri?: string
    title?: string
  }
}

/**
 * Google Grounding support from groundingMetadata.groundingSupports[]
 */
export interface GoogleGroundingSupport {
  segment?: {
    startIndex?: number
    endIndex?: number
    text?: string
  }
  groundingChunkIndices?: number[]
}

/**
 * Google Grounding metadata structure from providerMetadata
 */
export interface GoogleGroundingMetadata {
  groundingChunks?: GoogleGroundingChunk[]
  groundingSupports?: GoogleGroundingSupport[]
  webSearchQueries?: string[]
}
