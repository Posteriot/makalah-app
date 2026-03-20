export interface ContentChunk {
  chunkIndex: number
  content: string
  metadata: {
    sectionHeading?: string
  }
}

const TARGET_CHUNK_CHARS = 2000   // ~500 tokens
const MIN_CHUNK_CHARS = 50
const HEADING_REGEX = /^#{1,6}\s+(.+)$/

export function chunkContent(text: string): ContentChunk[] {
  if (!text?.trim()) return []

  const sections = splitBySections(text)
  const rawChunks: Array<{ content: string; sectionHeading?: string }> = []

  for (const section of sections) {
    const paragraphs = section.content.split(/\n\s*\n+/).filter((p) => p.trim())
    let buffer = ""

    for (const para of paragraphs) {
      const combined = buffer ? `${buffer}\n\n${para}` : para

      if (combined.length > TARGET_CHUNK_CHARS && buffer) {
        if (buffer.length >= MIN_CHUNK_CHARS) {
          rawChunks.push({ content: buffer.trim(), sectionHeading: section.heading })
        }
        if (para.length > TARGET_CHUNK_CHARS) {
          const sentenceChunks = splitAtSentenceBoundary(para, TARGET_CHUNK_CHARS)
          for (const sc of sentenceChunks) {
            if (sc.length >= MIN_CHUNK_CHARS) {
              rawChunks.push({ content: sc.trim(), sectionHeading: section.heading })
            }
          }
          buffer = ""
        } else {
          buffer = para
        }
      } else if (combined.length > TARGET_CHUNK_CHARS && !buffer) {
        const sentenceChunks = splitAtSentenceBoundary(para, TARGET_CHUNK_CHARS)
        for (const sc of sentenceChunks) {
          if (sc.length >= MIN_CHUNK_CHARS) {
            rawChunks.push({ content: sc.trim(), sectionHeading: section.heading })
          }
        }
        buffer = ""
      } else {
        buffer = combined
      }
    }

    if (buffer.trim().length >= MIN_CHUNK_CHARS) {
      rawChunks.push({ content: buffer.trim(), sectionHeading: section.heading })
    }
  }

  // If all chunks were filtered out but input had content, preserve the whole text
  if (rawChunks.length === 0) {
    const trimmed = text.trim()
    if (trimmed) {
      rawChunks.push({ content: trimmed })
    }
  }

  return rawChunks.map((chunk, i) => ({
    chunkIndex: i,
    content: chunk.content,
    metadata: {
      ...(chunk.sectionHeading ? { sectionHeading: chunk.sectionHeading } : {}),
    },
  }))
}

function splitBySections(text: string): Array<{ heading?: string; content: string }> {
  const lines = text.split("\n")
  const sections: Array<{ heading?: string; content: string }> = []
  let currentHeading: string | undefined
  let currentLines: string[] = []

  for (const line of lines) {
    const match = line.match(HEADING_REGEX)
    if (match) {
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, content: currentLines.join("\n") })
      }
      currentHeading = match[1].trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  if (currentLines.length > 0) {
    sections.push({ heading: currentHeading, content: currentLines.join("\n") })
  }

  return sections
}

function splitAtSentenceBoundary(text: string, maxChars: number): string[] {
  const chunks: string[] = []
  let remaining = text

  while (remaining.length > maxChars) {
    const slice = remaining.slice(0, maxChars)
    const lastPeriod = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf("! "),
    )

    if (lastPeriod > maxChars * 0.3) {
      chunks.push(remaining.slice(0, lastPeriod + 1))
      remaining = remaining.slice(lastPeriod + 1).trimStart()
    } else {
      chunks.push(slice)
      remaining = remaining.slice(maxChars).trimStart()
    }
  }

  if (remaining.trim()) {
    chunks.push(remaining.trim())
  }

  return chunks
}
