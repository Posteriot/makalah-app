import { describe, it, expect } from 'vitest'
import {
  normalizePerplexityCitations,
  normalizeGoogleGrounding,
  normalizeOpenAIAnnotations,
  normalizeCitations,
} from '@/lib/citations/normalizer'
import { isBlockedSourceDomain } from '@/lib/ai/blocked-domains'

// ═══════════════════════════════════════════════════════════════════════════
// isBlockedSourceDomain
// ═══════════════════════════════════════════════════════════════════════════

describe('isBlockedSourceDomain', () => {
  it('blocks wikipedia.org', () => {
    expect(isBlockedSourceDomain('https://wikipedia.org/wiki/Test')).toBe(true)
  })

  it('blocks en.wikipedia.org (subdomain)', () => {
    expect(isBlockedSourceDomain('https://en.wikipedia.org/wiki/Test')).toBe(true)
  })

  it('blocks id.wikipedia.org (subdomain)', () => {
    expect(isBlockedSourceDomain('https://id.wikipedia.org/wiki/Test')).toBe(true)
  })

  it('blocks blog.wordpress.com', () => {
    expect(isBlockedSourceDomain('https://blog.wordpress.com/some-post')).toBe(true)
  })

  it('blocks medium.com', () => {
    expect(isBlockedSourceDomain('https://medium.com/@author/article')).toBe(true)
  })

  it('blocks reddit.com', () => {
    expect(isBlockedSourceDomain('https://www.reddit.com/r/science/comments/abc')).toBe(true)
  })

  it('allows kompas.com', () => {
    expect(isBlockedSourceDomain('https://kompas.com/article/123')).toBe(false)
  })

  it('allows arxiv.org', () => {
    expect(isBlockedSourceDomain('https://arxiv.org/abs/2301.12345')).toBe(false)
  })

  it('allows scholar.google.com', () => {
    expect(isBlockedSourceDomain('https://scholar.google.com/scholar?q=test')).toBe(false)
  })

  it('returns false for malformed URL (no protocol)', () => {
    expect(isBlockedSourceDomain('not-a-url')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isBlockedSourceDomain('')).toBe(false)
  })

  it('returns false for completely invalid URL', () => {
    expect(isBlockedSourceDomain(':::invalid:::')).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// normalizePerplexityCitations
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizePerplexityCitations', () => {
  it('normalizes array of sources with url and title', () => {
    const sources = [
      { url: 'https://example.com/article-1', title: 'Article One' },
      { url: 'https://example.com/article-2', title: 'Article Two' },
    ]
    const result = normalizePerplexityCitations(sources)
    expect(result).toEqual([
      { url: 'https://example.com/article-1', title: 'Article One' },
      { url: 'https://example.com/article-2', title: 'Article Two' },
    ])
  })

  it('uses empty string for missing title', () => {
    const sources = [{ url: 'https://example.com/no-title' }]
    const result = normalizePerplexityCitations(sources)
    expect(result).toEqual([
      { url: 'https://example.com/no-title', title: '' },
    ])
  })

  it('returns empty array for non-array input', () => {
    expect(normalizePerplexityCitations('not-an-array')).toEqual([])
    expect(normalizePerplexityCitations(null)).toEqual([])
    expect(normalizePerplexityCitations(undefined)).toEqual([])
    expect(normalizePerplexityCitations(42)).toEqual([])
  })

  it('returns empty array for empty sources', () => {
    expect(normalizePerplexityCitations([])).toEqual([])
  })

  it('skips sources without url', () => {
    const sources = [
      { title: 'No URL here' },
      { url: 'https://example.com/valid', title: 'Valid' },
    ]
    const result = normalizePerplexityCitations(sources)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://example.com/valid')
  })

  it('skips sources with invalid url', () => {
    const sources = [
      { url: '', title: 'Empty URL' },
      { url: 'https://example.com/valid', title: 'Valid' },
    ]
    const result = normalizePerplexityCitations(sources)
    expect(result).toHaveLength(1)
  })

  it('does NOT filter blocked domains (pure mapping)', () => {
    const sources = [
      { url: 'https://en.wikipedia.org/wiki/Test', title: 'Wikipedia' },
    ]
    // normalizePerplexityCitations is pure mapping — no filtering
    const result = normalizePerplexityCitations(sources)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://en.wikipedia.org/wiki/Test')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// normalizeCitations dispatcher — domain filtering
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeCitations dispatcher', () => {
  it('filters blocked domains for perplexity provider', () => {
    const sources = [
      { url: 'https://en.wikipedia.org/wiki/Test', title: 'Wikipedia' },
      { url: 'https://arxiv.org/abs/2301.12345', title: 'ArXiv Paper' },
      { url: 'https://medium.com/@user/post', title: 'Medium Post' },
    ]
    const result = normalizeCitations(sources, 'perplexity')
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://arxiv.org/abs/2301.12345')
  })

  it('filters blocked domains for gateway provider', () => {
    const providerMetadata = {
      groundingChunks: [
        { web: { uri: 'https://en.wikipedia.org/wiki/AI', title: 'AI - Wikipedia' } },
        { web: { uri: 'https://arxiv.org/abs/2301.00001', title: 'AI Paper' } },
      ],
    }
    const result = normalizeCitations(providerMetadata, 'gateway')
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://arxiv.org/abs/2301.00001')
  })

  it('filters blocked domains for openrouter provider', () => {
    const response = {
      annotations: [
        { type: 'url_citation', url: 'https://reddit.com/r/science', title: 'Reddit' },
        { type: 'url_citation', url: 'https://nature.com/article', title: 'Nature' },
      ],
    }
    const result = normalizeCitations(response, 'openrouter')
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://nature.com/article')
  })

  it('returns empty array for unknown provider', () => {
    const result = normalizeCitations({}, 'unknown' as never)
    expect(result).toEqual([])
  })

  it('handles perplexity with all sources blocked', () => {
    const sources = [
      { url: 'https://wikipedia.org/wiki/Test', title: 'Wiki' },
      { url: 'https://medium.com/article', title: 'Medium' },
    ]
    const result = normalizeCitations(sources, 'perplexity')
    expect(result).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Existing normalizers — regression tests
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeGoogleGrounding (regression)', () => {
  it('normalizes standard groundingMetadata', () => {
    const metadata = {
      groundingChunks: [
        { web: { uri: 'https://example.com/page', title: 'Example Page' } },
      ],
      groundingSupports: [
        {
          segment: { startIndex: 0, endIndex: 50, text: 'Some cited text' },
          groundingChunkIndices: [0],
        },
      ],
    }
    const result = normalizeGoogleGrounding(metadata)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      url: 'https://example.com/page',
      title: 'Example Page',
      startIndex: 0,
      endIndex: 50,
      citedText: 'Some cited text',
    })
  })

  it('returns empty array for null input', () => {
    expect(normalizeGoogleGrounding(null)).toEqual([])
  })

  it('handles nested google.groundingMetadata structure', () => {
    const metadata = {
      google: {
        groundingMetadata: {
          groundingChunks: [
            { web: { uri: 'https://example.com', title: 'Test' } },
          ],
        },
      },
    }
    const result = normalizeGoogleGrounding(metadata)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://example.com')
  })
})

describe('normalizeOpenAIAnnotations (regression)', () => {
  it('normalizes url_citation annotations', () => {
    const response = {
      annotations: [
        {
          type: 'url_citation',
          url: 'https://example.com/article',
          title: 'Article Title',
          start_index: 10,
          end_index: 50,
        },
      ],
    }
    const result = normalizeOpenAIAnnotations(response)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      url: 'https://example.com/article',
      title: 'Article Title',
      startIndex: 10,
      endIndex: 50,
    })
  })

  it('returns empty array for null input', () => {
    expect(normalizeOpenAIAnnotations(null)).toEqual([])
  })

  it('skips non-url_citation annotation types', () => {
    const response = {
      annotations: [
        { type: 'file_citation', file_id: 'abc' },
        { type: 'url_citation', url: 'https://example.com', title: 'Valid' },
      ],
    }
    const result = normalizeOpenAIAnnotations(response)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://example.com')
  })
})
