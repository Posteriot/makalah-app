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

/**
 * Split a markdown document into "subsection" blocks: chunks that each
 * begin with a heading at the requested level (default `##` h2) and
 * include everything up to (but not including) the next heading at that
 * same level.
 *
 * Use this when you want each subsection to stay atomic — heading + body
 * + lists + paragraphs in one chunk — so that downstream layout
 * (e.g., line-level pagination with subsection-aware spacing) can keep
 * a heading tight to the body that follows it without splitting them
 * apart at every blank line.
 *
 * **Behavior:**
 * - The very first chunk may NOT start with a heading at the requested
 *   level. That's fine: any "preamble" content before the first heading
 *   is returned as the first block. (For naskah this is the case for
 *   sections like Abstrak that have no internal subsections.)
 * - If the document has no headings at the requested level at all, the
 *   entire input is returned as a single block.
 * - Headings at lower levels (e.g., h3 inside an h2 subsection) are
 *   left in their parent block.
 * - Trims leading/trailing whitespace per block. Skips empty blocks.
 * - CRLF safe.
 *
 * **Why not just split on `\n## `?**
 * That would lose the heading text from each block (the `##` would
 * be on the wrong side of the split). The implementation walks lines
 * one by one so the heading line stays at the top of its block.
 */
export function splitMarkdownAtHeadings(
  markdown: string,
  level: 1 | 2 | 3 | 4 | 5 | 6 = 2,
): string[] {
  if (!markdown) return []

  const headingPrefix = `${"#".repeat(level)} `
  const lines = markdown.split(/\r?\n/)
  const blocks: string[] = []
  let current: string[] = []

  for (const line of lines) {
    const isHeading = line.trimStart().startsWith(headingPrefix)
    if (isHeading && current.length > 0) {
      const finished = current.join("\n").trim()
      if (finished.length > 0) blocks.push(finished)
      current = [line]
    } else {
      current.push(line)
    }
  }
  if (current.length > 0) {
    const finished = current.join("\n").trim()
    if (finished.length > 0) blocks.push(finished)
  }
  return blocks
}
