/**
 * Unit Tests untuk Citation Normalizers
 *
 * Coverage:
 * - normalizeGoogleGrounding(): Google grounding metadata format
 * - normalizeSourcesList(): AI SDK `result.sources` format
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  normalizeGoogleGrounding,
  normalizeSourcesList,
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

const VALID_SOURCES_LIST = [
  {
    url: 'https://example.com/source-1',
    title: 'Source One',
  },
  {
    url: 'https://example.com/source-2',
    title: 'Source Two',
  },
]

const VALID_SOURCES_LIST_WITH_GAPS = [
  {
    url: 'https://example.com/source-1',
  },
  {
    url: '',
    title: 'Invalid Source',
  },
  {
    title: 'Missing URL',
  },
  {
    url: 'https://example.com/source-2',
    title: 'Source Two',
  },
  {
    url: 'not a full url but.has-domain',
    title: 'Domainish Source',
  },
  {
    url: 'contains spaces invalid',
    title: 'Bad URL',
  },
] as Array<
  | {
      url?: string
      title?: string
    }
  | null
>

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
// Test: normalizeSourcesList()
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeSourcesList', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('should correctly parse valid AI SDK sources', () => {
    const result = normalizeSourcesList(VALID_SOURCES_LIST)

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      url: 'https://example.com/source-1',
      title: 'Source One',
    })
    expect(result[1]).toEqual({
      url: 'https://example.com/source-2',
      title: 'Source Two',
    })
  })

  it('should return empty array for empty sources list', () => {
    const result = normalizeSourcesList([])
    expect(result).toEqual([])
  })

  it('should return empty array for non-array input', () => {
    const missing = { someOtherField: 'value' }

    const result = normalizeSourcesList(missing)
    expect(result).toEqual([])
  })

  it('should skip invalid entries and keep valid URLs', () => {
    const result = normalizeSourcesList(VALID_SOURCES_LIST_WITH_GAPS)

    expect(result).toEqual([
      {
        url: 'https://example.com/source-1',
        title: '',
      },
      {
        url: 'https://example.com/source-2',
        title: 'Source Two',
      },
    ])
  })

  it('should return empty array for malformed data (null)', () => {
    const result = normalizeSourcesList(null)
    expect(result).toEqual([])
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('should return empty array for malformed data (undefined)', () => {
    const result = normalizeSourcesList(undefined)
    expect(result).toEqual([])
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})
