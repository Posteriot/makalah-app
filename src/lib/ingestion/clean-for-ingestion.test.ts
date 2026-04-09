/**
 * Unit Tests for cleanForIngestion()
 *
 * Validates the 4-step ingestion text cleanup pipeline:
 * 1. CRLF normalization
 * 2. Excessive blank line collapse
 * 3. Consecutive paragraph deduplication
 * 4. Leading/trailing whitespace trim
 */

import { describe, it, expect, vi, afterEach } from 'vitest'
import { cleanForIngestion } from './clean-for-ingestion'
import type { IngestionSourceType } from './clean-for-ingestion'

// Suppress console.log in tests
const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

afterEach(() => {
  consoleSpy.mockClear()
})

// ═══════════════════════════════════════════════════════════════════════════
// No-op / Identity
// ═══════════════════════════════════════════════════════════════════════════

describe('cleanForIngestion - no-op on clean text', () => {
  it('returns identical output for already clean text', () => {
    const input = 'Hello world\n\nParagraph two'
    expect(cleanForIngestion(input, 'web')).toBe(input)
  })

  it('does not log when text is unchanged', () => {
    cleanForIngestion('Hello world\n\nParagraph two', 'upload')
    expect(consoleSpy).not.toHaveBeenCalled()
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// CRLF Normalization
// ═══════════════════════════════════════════════════════════════════════════

describe('cleanForIngestion - CRLF normalization', () => {
  it('converts \\r\\n to \\n', () => {
    expect(cleanForIngestion('Line one\r\nLine two', 'web')).toBe(
      'Line one\nLine two'
    )
  })

  it('converts bare \\r to \\n', () => {
    expect(cleanForIngestion('Line one\rLine two', 'web')).toBe(
      'Line one\nLine two'
    )
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Blank Line Collapse
// ═══════════════════════════════════════════════════════════════════════════

describe('cleanForIngestion - collapse blank lines', () => {
  it('collapses 3+ blank lines to 2 blank lines', () => {
    expect(cleanForIngestion('A\n\n\n\n\nB', 'web')).toBe('A\n\nB')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Consecutive Paragraph Deduplication
// ═══════════════════════════════════════════════════════════════════════════

describe('cleanForIngestion - dedup consecutive paragraphs', () => {
  it('removes consecutive duplicate paragraphs', () => {
    expect(cleanForIngestion('Para A\n\nPara A\n\nPara B', 'upload')).toBe(
      'Para A\n\nPara B'
    )
  })

  it('preserves non-consecutive duplicates', () => {
    const input = 'A\n\nB\n\nA'
    expect(cleanForIngestion(input, 'web')).toBe(input)
  })

  it('dedupes paragraphs that differ only by whitespace', () => {
    expect(
      cleanForIngestion('Hello World\n\n  Hello World\n\nPara B', 'web')
    ).toBe('Hello World\n\nPara B')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Trim Whitespace
// ═══════════════════════════════════════════════════════════════════════════

describe('cleanForIngestion - trim whitespace', () => {
  it('trims leading and trailing whitespace', () => {
    expect(cleanForIngestion('  \n text \n  ', 'web')).toBe('text')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Edge Cases: Empty / Whitespace-only
// ═══════════════════════════════════════════════════════════════════════════

describe('cleanForIngestion - edge cases', () => {
  it('returns empty string for empty input', () => {
    expect(cleanForIngestion('', 'web')).toBe('')
  })

  it('returns empty string for whitespace-only input', () => {
    expect(cleanForIngestion('   \n\n  ', 'upload')).toBe('')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Content Preservation (markdown)
// ═══════════════════════════════════════════════════════════════════════════

describe('cleanForIngestion - content preservation', () => {
  it('preserves markdown headings', () => {
    const input = '# Title\n\nText'
    expect(cleanForIngestion(input, 'web')).toBe(input)
  })

  it('preserves markdown tables', () => {
    const input = '| A | B |\n| --- | --- |\n| 1 | 2 |'
    expect(cleanForIngestion(input, 'upload')).toBe(input)
  })

  it('preserves code blocks', () => {
    const input = '```\ncode\n```'
    expect(cleanForIngestion(input, 'web')).toBe(input)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Mixed Operations
// ═══════════════════════════════════════════════════════════════════════════

describe('cleanForIngestion - mixed operations', () => {
  it('applies all operations: CRLF + blank lines + dedup', () => {
    const input =
      '  \r\nHello\r\n\r\n\r\n\r\nHello\r\n\r\nWorld\r\n  '
    const result = cleanForIngestion(input, 'web')
    // CRLF -> LF, collapse blank lines, dedup consecutive "Hello", trim
    expect(result).toBe('Hello\n\nWorld')
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Logging
// ═══════════════════════════════════════════════════════════════════════════

describe('cleanForIngestion - logging', () => {
  it('logs when text length changes', () => {
    cleanForIngestion('A\r\nB', 'web')
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Ingestion Cleanup]')
    )
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('source=web')
    )
  })

  it('includes before/after/diff in log message', () => {
    cleanForIngestion('Line\r\nTwo', 'upload')
    const logMsg = consoleSpy.mock.calls[0][0] as string
    expect(logMsg).toMatch(/before=\d+/)
    expect(logMsg).toMatch(/after=\d+/)
    expect(logMsg).toMatch(/diff=\d+/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
// Type export verification
// ═══════════════════════════════════════════════════════════════════════════

describe('cleanForIngestion - type exports', () => {
  it('IngestionSourceType accepts "web" and "upload"', () => {
    const web: IngestionSourceType = 'web'
    const upload: IngestionSourceType = 'upload'
    expect(web).toBe('web')
    expect(upload).toBe('upload')
  })
})
