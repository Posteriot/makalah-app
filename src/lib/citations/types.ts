/**
 * Citation Normalization Types
 *
 * Unified citation schema untuk normalize berbagai format citation
 * dari provider yang berbeda (Gateway/Google, OpenRouter/OpenAI, dll).
 *
 * Design Decision:
 * - Interface ini intentionally simple untuk maximum compatibility
 * - startIndex/endIndex opsional karena tidak semua provider provide position data
 * - citedText opsional untuk debugging/display purposes
 * - publishedAt opsional untuk enrichment dari web page metadata
 */

/**
 * Normalized citation format yang digunakan di seluruh aplikasi.
 * Semua provider-specific formats harus di-normalize ke interface ini.
 */
export interface NormalizedCitation {
  /** URL sumber referensi */
  url: string

  /** Judul sumber (bisa dari provider atau dari URL jika tidak tersedia) */
  title: string

  /** Character position di text dimana citation dimulai (0-indexed) */
  startIndex?: number

  /** Character position di text dimana citation berakhir (exclusive) */
  endIndex?: number

  /** Text yang di-cite dari sumber (untuk debugging/display) */
  citedText?: string

  /** Unix timestamp (ms) kapan sumber dipublish */
  publishedAt?: number
}

/**
 * Supported AI providers yang punya citation capability.
 *
 * - 'gateway': Vercel AI Gateway with Google Grounding (groundingMetadata format)
 * - 'openrouter': OpenRouter dengan :online suffix (annotations format)
 * - 'anthropic': Anthropic Claude (future support)
 * - 'openai': Direct OpenAI (same format as openrouter annotations)
 */
export type CitationProvider = 'gateway' | 'openrouter' | 'anthropic' | 'openai'

/**
 * Raw Google Grounding chunk from groundingMetadata.groundingChunks[]
 */
export interface GoogleGroundingChunk {
  web?: {
    uri?: string
    title?: string
  }
}

/**
 * Raw Google Grounding support from groundingMetadata.groundingSupports[]
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
 * Full Google Grounding metadata structure
 */
export interface GoogleGroundingMetadata {
  groundingChunks?: GoogleGroundingChunk[]
  groundingSupports?: GoogleGroundingSupport[]
  webSearchQueries?: string[]
}

/**
 * Raw OpenRouter/OpenAI URL citation annotation
 */
export interface OpenAIUrlCitationAnnotation {
  type: 'url_citation'
  url: string
  title?: string
  start_index?: number
  end_index?: number
}

/**
 * Generic annotation type (OpenRouter/OpenAI can have multiple types)
 */
export interface OpenAIAnnotation {
  type: string
  url?: string
  title?: string
  start_index?: number
  end_index?: number
  [key: string]: unknown
}

/**
 * OpenRouter response structure dengan annotations
 */
export interface OpenRouterAnnotationsResponse {
  annotations?: OpenAIAnnotation[]
}
