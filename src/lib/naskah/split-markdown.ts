/**
 * Split a markdown document into an array of top-level block chunks.
 *
 * The split rule is "two or more consecutive newlines = block boundary,"
 * which is the standard markdown convention for paragraph / heading /
 * list separation. Each chunk is returned verbatim (trimmed for trailing
 * whitespace only) and can be fed back into a markdown renderer
 * independently.
 *
 * **Known edge cases (acceptable for phase 1):**
 * - Fenced code blocks (```…```) that contain blank lines internally will
 *   be incorrectly split. Naskah content rarely includes fenced code, so
 *   this is deferred.
 * - Tables with blank rows will split. Not encountered in typical paper
 *   bodies.
 * - Lists whose items are separated by blank lines will split per-item,
 *   not per-list. For pagination purposes this is fine — each list item
 *   becomes a paginable block.
 *
 * **Guarantees:**
 * - Pure function. No DOM, no React, no side effects. Safe to use in
 *   hooks, effects, or tests.
 * - Preserves block order.
 * - Returns an empty array for empty or whitespace-only input.
 * - Each returned block has leading and trailing blank lines stripped,
 *   but internal newlines are preserved verbatim.
 */
export function splitMarkdownIntoBlocks(markdown: string): string[] {
  if (!markdown) return []

  // Split on 2+ consecutive newlines (covers \n\n, \n\n\n, \r\n\r\n, etc.)
  const raw = markdown.split(/(?:\r?\n){2,}/)

  const blocks: string[] = []
  for (const chunk of raw) {
    const trimmed = chunk.trim()
    if (trimmed.length > 0) {
      blocks.push(trimmed)
    }
  }
  return blocks
}
