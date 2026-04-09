/**
 * Ingestion text cleanup for RAG pipeline.
 *
 * Sits between fetch/extract and chunk/embed/ingest.
 * Pure, synchronous, stateless. No external dependencies.
 *
 * Operations (applied in order):
 * 1. Normalize CRLF -> LF
 * 2. Collapse 3+ consecutive blank lines -> 2 blank lines (one empty line between paragraphs)
 * 3. Deduplicate identical consecutive paragraphs
 * 4. Trim leading/trailing whitespace
 */

export type IngestionSourceType = 'web' | 'upload'

export function cleanForIngestion(
  text: string,
  sourceType: IngestionSourceType
): string {
  // Step 1: Normalize newlines
  let result = text.replace(/\r\n/g, '\n')

  // Step 2: Collapse excessive blank lines (3+ newlines -> 2 newlines)
  result = result.replace(/\n{3,}/g, '\n\n')

  // Step 3: Dedup identical consecutive paragraphs
  const paragraphs = result.split('\n\n')
  const deduped: string[] = []
  for (const para of paragraphs) {
    const trimmed = para.trim()
    const lastTrimmed = deduped.length > 0 ? deduped[deduped.length - 1].trim() : null
    if (trimmed !== lastTrimmed) {
      deduped.push(para)
    }
  }
  result = deduped.join('\n\n')

  // Step 4: Trim leading/trailing whitespace
  result = result.trim()

  // Logging
  if (result.length !== text.length) {
    console.log(
      `[Ingestion Cleanup] source=${sourceType} before=${text.length} after=${result.length} diff=${text.length - result.length}`
    )
  }

  return result
}
