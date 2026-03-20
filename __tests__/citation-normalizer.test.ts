import { describe, it, expect } from 'vitest'
import {
  normalizeSourcesList,
  normalizeGoogleGrounding,
  filterBlockedDomains,
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
// normalizeSourcesList (AI SDK result.sources format)
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeSourcesList', () => {
  it('normalizes array of sources with url and title', () => {
    const sources = [
      { url: 'https://example.com/article-1', title: 'Article One' },
      { url: 'https://example.com/article-2', title: 'Article Two' },
    ]
    const result = normalizeSourcesList(sources)
    expect(result).toEqual([
      { url: 'https://example.com/article-1', title: 'Article One' },
      { url: 'https://example.com/article-2', title: 'Article Two' },
    ])
  })

  it('uses empty string for missing title', () => {
    const sources = [{ url: 'https://example.com/no-title' }]
    const result = normalizeSourcesList(sources)
    expect(result).toEqual([
      { url: 'https://example.com/no-title', title: '' },
    ])
  })

  it('returns empty array for non-array input', () => {
    expect(normalizeSourcesList('not-an-array')).toEqual([])
    expect(normalizeSourcesList(null)).toEqual([])
    expect(normalizeSourcesList(undefined)).toEqual([])
    expect(normalizeSourcesList(42)).toEqual([])
  })

  it('returns empty array for empty sources', () => {
    expect(normalizeSourcesList([])).toEqual([])
  })

  it('skips sources without url', () => {
    const sources = [
      { title: 'No URL here' },
      { url: 'https://example.com/valid', title: 'Valid' },
    ]
    const result = normalizeSourcesList(sources)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://example.com/valid')
  })

  it('skips sources with invalid url', () => {
    const sources = [
      { url: '', title: 'Empty URL' },
      { url: 'https://example.com/valid', title: 'Valid' },
    ]
    const result = normalizeSourcesList(sources)
    expect(result).toHaveLength(1)
  })

  it('filters blocked domains', () => {
    const sources = [
      { url: 'https://en.wikipedia.org/wiki/Test', title: 'Wikipedia' },
      { url: 'https://arxiv.org/abs/2301.12345', title: 'ArXiv Paper' },
      { url: 'https://medium.com/@user/post', title: 'Medium Post' },
    ]
    const result = normalizeSourcesList(sources)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://arxiv.org/abs/2301.12345')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// normalizeGoogleGrounding
// ═══════════════════════════════════════════════════════════════════════════

describe('normalizeGoogleGrounding', () => {
  it('normalizes standard groundingMetadata with citedText', () => {
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

  it('returns empty array for undefined input', () => {
    expect(normalizeGoogleGrounding(undefined)).toEqual([])
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

  it('falls back to chunks without supports', () => {
    const metadata = {
      groundingChunks: [
        { web: { uri: 'https://example.com', title: 'Test' } },
      ],
    }
    const result = normalizeGoogleGrounding(metadata)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://example.com')
    expect(result[0].citedText).toBeUndefined()
  })

  it('filters blocked domains', () => {
    const metadata = {
      groundingChunks: [
        { web: { uri: 'https://en.wikipedia.org/wiki/AI', title: 'AI - Wikipedia' } },
        { web: { uri: 'https://arxiv.org/abs/2301.00001', title: 'AI Paper' } },
      ],
    }
    const result = normalizeGoogleGrounding(metadata)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://arxiv.org/abs/2301.00001')
  })

  it('handles multiple supports pointing to same chunk', () => {
    const metadata = {
      groundingChunks: [
        { web: { uri: 'https://example.com', title: 'Source' } },
      ],
      groundingSupports: [
        { segment: { text: 'First claim' }, groundingChunkIndices: [0] },
        { segment: { text: 'Second claim' }, groundingChunkIndices: [0] },
      ],
    }
    const result = normalizeGoogleGrounding(metadata)
    expect(result).toHaveLength(2)
    expect(result[0].citedText).toBe('First claim')
    expect(result[1].citedText).toBe('Second claim')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// filterBlockedDomains
// ═══════════════════════════════════════════════════════════════════════════

describe('filterBlockedDomains', () => {
  it('removes blocked domains from citation array', () => {
    const citations = [
      { url: 'https://wikipedia.org/wiki/Test', title: 'Wiki' },
      { url: 'https://arxiv.org/abs/123', title: 'ArXiv' },
      { url: 'https://medium.com/article', title: 'Medium' },
    ]
    const result = filterBlockedDomains(citations)
    expect(result).toHaveLength(1)
    expect(result[0].url).toBe('https://arxiv.org/abs/123')
  })

  it('returns empty array when all blocked', () => {
    const citations = [
      { url: 'https://wikipedia.org/wiki/Test', title: 'Wiki' },
      { url: 'https://medium.com/article', title: 'Medium' },
    ]
    expect(filterBlockedDomains(citations)).toEqual([])
  })

  it('returns all when none blocked', () => {
    const citations = [
      { url: 'https://arxiv.org/abs/123', title: 'ArXiv' },
      { url: 'https://kompas.com/news', title: 'Kompas' },
    ]
    expect(filterBlockedDomains(citations)).toHaveLength(2)
  })
})
