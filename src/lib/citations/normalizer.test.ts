/**
 * Unit Tests untuk Citation Normalizers
 *
 * Coverage:
 * - normalizeGoogleGrounding(): Google grounding metadata format
 * - normalizeOpenAIAnnotations(): OpenRouter/OpenAI annotations format
 * - normalizeCitations(): Main dispatcher
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeGoogleGrounding,
  normalizeOpenAIAnnotations,
  normalizeAnthropicCitations,
  normalizeCitations,
} from './normalizer'

// ═══════════════════════════════════════════════════════════════════════════
// Test Data Fixtures
// ═══════════════════════════════════════════════════════════════════════════

const VALID_GOOGLE_GROUNDING_METADATA = {
  groundingChunks: [
    {
      web: {
        uri: 'https://example.com/article-1',
        title: 'Article One',
      },
    },
    {
      web: {
        uri: 'https://example.com/article-2',
        title: 'Article Two',
      },
    },
  ],
  groundingSupports: [
    {
      segment: {
        startIndex: 0,
        endIndex: 50,
        text: 'Some cited text from article one.',
      },
      groundingChunkIndices: [0],
    },
    {
      segment: {
        startIndex: 51,
        endIndex: 100,
      },
      groundingChunkIndices: [1],
    },
  ],
}

const VALID_OPENAI_ANNOTATIONS = {
  annotations: [
    {
      type: 'url_citation',
      url: 'https://example.com/source-1',
      title: 'Source One',
      start_index: 0,
      end_index: 45,
    },
    {
      type: 'url_citation',
      url: 'https://example.com/source-2',
      title: 'Source Two',
      start_index: 46,
      end_index: 90,
    },
  ],
}

// ═══════════════════════════════════════════════════════════════════════════
// Test: normalizeGoogleGrounding()
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeGoogleGrounding', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should correctly parse valid grounding metadata', () => {
    const result = normalizeGoogleGrounding(VALID_GOOGLE_GROUNDING_METADATA)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      url: 'https://example.com/article-1',
      title: 'Article One',
      startIndex: 0,
      endIndex: 50,
      citedText: 'Some cited text from article one.',
    })
    expect(result[1]).toEqual({
      url: 'https://example.com/article-2',
      title: 'Article Two',
      startIndex: 51,
      endIndex: 100,
    })
  })

  it('should handle nested providerMetadata.google.groundingMetadata structure', () => {
    const nested = {
      google: {
        groundingMetadata: VALID_GOOGLE_GROUNDING_METADATA,
      },
    }

    const result = normalizeGoogleGrounding(nested)

    expect(result).toHaveLength(2)
    expect(result[0].url).toBe('https://example.com/article-1')
  })

  it('should return empty array for empty groundingChunks', () => {
    const empty = {
      groundingChunks: [],
      groundingSupports: [],
    }

    const result = normalizeGoogleGrounding(empty)
    expect(result).toEqual([])
  })

  it('should return citations without indices when groundingSupports is missing', () => {
    const noSupports = {
      groundingChunks: [
        {
          web: {
            uri: 'https://example.com/no-support',
            title: 'No Support Citation',
          },
        },
      ],
      // No groundingSupports
    }

    const result = normalizeGoogleGrounding(noSupports)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      url: 'https://example.com/no-support',
      title: 'No Support Citation',
    })
    // Should NOT have startIndex/endIndex
    expect(result[0].startIndex).toBeUndefined()
    expect(result[0].endIndex).toBeUndefined()
  })

  it('should return citations without indices when groundingSupports is empty array', () => {
    const emptySupports = {
      groundingChunks: [
        {
          web: {
            uri: 'https://example.com/empty-support',
            title: 'Empty Support',
          },
        },
      ],
      groundingSupports: [],
    }

    const result = normalizeGoogleGrounding(emptySupports)

    expect(result).toHaveLength(1)
    expect(result[0].startIndex).toBeUndefined()
  })

  it('should return empty array for malformed data (null)', () => {
    const result = normalizeGoogleGrounding(null)
    expect(result).toEqual([])
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('should return empty array for malformed data (undefined)', () => {
    const result = normalizeGoogleGrounding(undefined)
    expect(result).toEqual([])
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('should return empty array for malformed data (string)', () => {
    const result = normalizeGoogleGrounding('invalid string')
    expect(result).toEqual([])
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('should return empty array for malformed data (number)', () => {
    const result = normalizeGoogleGrounding(12345)
    expect(result).toEqual([])
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('should skip chunks with invalid URLs', () => {
    const invalidUrl = {
      groundingChunks: [
        { web: { uri: '', title: 'Empty URL' } },
        { web: { uri: 'https://valid.com', title: 'Valid' } },
        { web: { uri: null, title: 'Null URL' } },
      ],
      groundingSupports: [],
    }

    const result = normalizeGoogleGrounding(invalidUrl)

    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://valid.com')
  })

  it('should use URL as title when title is missing', () => {
    const noTitle = {
      groundingChunks: [
        { web: { uri: 'https://example.com/no-title' } },
      ],
      groundingSupports: [],
    }

    const result = normalizeGoogleGrounding(noTitle)

    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('https://example.com/no-title')
  })

  it('should handle multiple groundingChunkIndices in single support', () => {
    const multiIndex = {
      groundingChunks: [
        { web: { uri: 'https://example.com/a', title: 'A' } },
        { web: { uri: 'https://example.com/b', title: 'B' } },
      ],
      groundingSupports: [
        {
          segment: { endIndex: 100 },
          groundingChunkIndices: [0, 1],
        },
      ],
    }

    const result = normalizeGoogleGrounding(multiIndex)

    expect(result).toHaveLength(2)
    expect(result[0].url).toBe('https://example.com/a')
    expect(result[1].url).toBe('https://example.com/b')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Test: normalizeOpenAIAnnotations()
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeOpenAIAnnotations', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should correctly parse valid annotations', () => {
    const result = normalizeOpenAIAnnotations(VALID_OPENAI_ANNOTATIONS)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      url: 'https://example.com/source-1',
      title: 'Source One',
      startIndex: 0,
      endIndex: 45,
    })
    expect(result[1]).toEqual({
      url: 'https://example.com/source-2',
      title: 'Source Two',
      startIndex: 46,
      endIndex: 90,
    })
  })

  it('should handle nested message.annotations structure', () => {
    const nested = {
      message: {
        annotations: VALID_OPENAI_ANNOTATIONS.annotations,
      },
    }

    const result = normalizeOpenAIAnnotations(nested)

    expect(result).toHaveLength(2)
    expect(result[0].url).toBe('https://example.com/source-1')
  })

  it('should handle experimental_providerMetadata.openrouter.annotations structure', () => {
    const providerMeta = {
      experimental_providerMetadata: {
        openrouter: {
          annotations: VALID_OPENAI_ANNOTATIONS.annotations,
        },
      },
    }

    const result = normalizeOpenAIAnnotations(providerMeta)

    expect(result).toHaveLength(2)
    expect(result[0].url).toBe('https://example.com/source-1')
  })

  it('should return empty array for empty annotations', () => {
    const empty = { annotations: [] }

    const result = normalizeOpenAIAnnotations(empty)
    expect(result).toEqual([])
  })

  it('should return empty array for missing annotations', () => {
    const missing = { someOtherField: 'value' }

    const result = normalizeOpenAIAnnotations(missing)
    expect(result).toEqual([])
  })

  it('should only extract url_citation type (filter mixed types)', () => {
    const mixed = {
      annotations: [
        {
          type: 'url_citation',
          url: 'https://example.com/valid',
          title: 'Valid Citation',
        },
        {
          type: 'file_citation',
          file_id: 'some-file-id',
          quote: 'some quote',
        },
        {
          type: 'other_type',
          data: 'some data',
        },
        {
          type: 'url_citation',
          url: 'https://example.com/another-valid',
          title: 'Another Valid',
        },
      ],
    }

    const result = normalizeOpenAIAnnotations(mixed)

    expect(result).toHaveLength(2)
    expect(result[0].url).toBe('https://example.com/valid')
    expect(result[1].url).toBe('https://example.com/another-valid')
  })

  it('should handle missing fields gracefully', () => {
    const partial = {
      annotations: [
        {
          type: 'url_citation',
          url: 'https://example.com/minimal',
          // No title, no indices
        },
      ],
    }

    const result = normalizeOpenAIAnnotations(partial)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      url: 'https://example.com/minimal',
      title: 'https://example.com/minimal', // Falls back to URL
    })
    expect(result[0].startIndex).toBeUndefined()
    expect(result[0].endIndex).toBeUndefined()
  })

  it('should return empty array for malformed data (null)', () => {
    const result = normalizeOpenAIAnnotations(null)
    expect(result).toEqual([])
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('should return empty array for malformed data (undefined)', () => {
    const result = normalizeOpenAIAnnotations(undefined)
    expect(result).toEqual([])
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('should skip annotations with invalid URLs', () => {
    const invalidUrls = {
      annotations: [
        { type: 'url_citation', url: '', title: 'Empty' },
        { type: 'url_citation', url: 'https://valid.com', title: 'Valid' },
        { type: 'url_citation', url: null, title: 'Null' },
        { type: 'url_citation', title: 'Missing URL' },
      ],
    }

    const result = normalizeOpenAIAnnotations(invalidUrls)

    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://valid.com')
  })

  it('should handle negative index values gracefully', () => {
    const negativeIndex = {
      annotations: [
        {
          type: 'url_citation',
          url: 'https://example.com/negative',
          title: 'Negative Index',
          start_index: -5,
          end_index: 50,
        },
      ],
    }

    const result = normalizeOpenAIAnnotations(negativeIndex)

    expect(result).toHaveLength(1)
    // Negative index should be filtered out
    expect(result[0].startIndex).toBeUndefined()
    expect(result[0].endIndex).toBe(50)
  })

  it('should map snake_case to camelCase correctly', () => {
    const snakeCase = {
      annotations: [
        {
          type: 'url_citation',
          url: 'https://example.com/snake',
          title: 'Snake Case',
          start_index: 10,
          end_index: 20,
        },
      ],
    }

    const result = normalizeOpenAIAnnotations(snakeCase)

    expect(result[0].startIndex).toBe(10)
    expect(result[0].endIndex).toBe(20)
    // Should not have snake_case properties
    expect((result[0] as unknown as Record<string, unknown>).start_index).toBeUndefined()
    expect((result[0] as unknown as Record<string, unknown>).end_index).toBeUndefined()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Test: normalizeAnthropicCitations() (Stub)
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeAnthropicCitations', () => {
  it('should return empty array (not yet implemented)', () => {
    const result = normalizeAnthropicCitations({ some: 'data' })
    expect(result).toEqual([])
  })

  it('should return empty array for any input', () => {
    expect(normalizeAnthropicCitations(null)).toEqual([])
    expect(normalizeAnthropicCitations(undefined)).toEqual([])
    expect(normalizeAnthropicCitations({})).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Test: normalizeCitations() Dispatcher
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeCitations', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
  })

  it('should route gateway provider to Google normalizer', () => {
    const result = normalizeCitations(VALID_GOOGLE_GROUNDING_METADATA, 'gateway')

    expect(result).toHaveLength(2)
    expect(result[0].url).toBe('https://example.com/article-1')
  })

  it('should route openrouter provider to OpenAI normalizer', () => {
    const result = normalizeCitations(VALID_OPENAI_ANNOTATIONS, 'openrouter')

    expect(result).toHaveLength(2)
    expect(result[0].url).toBe('https://example.com/source-1')
  })

  it('should route openai provider to OpenAI normalizer', () => {
    const result = normalizeCitations(VALID_OPENAI_ANNOTATIONS, 'openai')

    expect(result).toHaveLength(2)
    expect(result[0].url).toBe('https://example.com/source-1')
  })

  it('should route anthropic provider to Anthropic normalizer (stub)', () => {
    const result = normalizeCitations({ some: 'data' }, 'anthropic')
    expect(result).toEqual([])
  })

  it('should return empty array for unknown provider', () => {
    // @ts-expect-error Testing unknown provider
    const result = normalizeCitations({ some: 'data' }, 'unknown_provider')

    expect(result).toEqual([])
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown provider: unknown_provider')
    )
  })

  it('should not throw for any provider with invalid data', () => {
    expect(() => normalizeCitations(null, 'gateway')).not.toThrow()
    expect(() => normalizeCitations(undefined, 'openrouter')).not.toThrow()
    expect(() => normalizeCitations('invalid', 'openai')).not.toThrow()
    // @ts-expect-error Testing unknown provider
    expect(() => normalizeCitations({}, 'nonexistent')).not.toThrow()
  })
})
