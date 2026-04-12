/**
 * Naskah-specific markdown → block AST.
 *
 * This parser exists because the naskah download path needs to convert
 * the same markdown the on-screen `MarkdownRenderer` consumes into
 * structured data that PDF and DOCX builders can render. Going through
 * a full markdown library (remark, markdown-it) is overkill for the
 * subset of syntax naskah content uses, and would pull a chunky
 * dependency into the export route.
 *
 * **Supported syntax (the only things naskah content actually uses):**
 *
 * - `#` … `######` headings (level 1–6)
 * - Plain paragraphs (one or more consecutive non-empty lines)
 * - Ordered lists `1. item` (consecutive lines that start with `\d+. `)
 * - Unordered lists `- item` and `* item`
 * - Inline `**bold**` and `*italic*`
 *
 * **NOT supported (intentional — naskah doesn't use these):**
 *
 * - Code blocks (fenced or indented)
 * - Links / images
 * - Block quotes
 * - Tables
 * - Setext headings (`===` / `---`)
 * - HTML passthrough
 *
 * If a future naskah artifact uses a syntax that's not covered, it
 * gracefully degrades to a paragraph rendering of the raw line — no
 * crash, just plain text.
 */

/** A formatted text fragment within a paragraph, list item, or heading. */
export interface TextRun {
  text: string
  bold?: boolean
  italic?: boolean
}

/** Top-level structural blocks the PDF/DOCX builders consume. */
export type NaskahBlock =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; runs: TextRun[] }
  | { type: "paragraph"; runs: TextRun[] }
  | { type: "list"; ordered: boolean; items: TextRun[][] }

/**
 * Parse a markdown string into a flat array of `NaskahBlock` chunks.
 *
 * **Algorithm (line-walking, single pass):**
 *
 * 1. Split on `\r?\n`.
 * 2. Walk lines top-to-bottom. For each non-blank line:
 *    - If it matches `^#{1,6} `, emit a heading block and advance one
 *      line.
 *    - If it matches `^\d+\. `, consume consecutive matching lines and
 *      emit one ordered list block.
 *    - If it matches `^[-*] `, consume consecutive matching lines and
 *      emit one unordered list block.
 *    - Otherwise, consume consecutive non-blank, non-block-prefix lines
 *      as a single paragraph (joined with a space, mirroring how
 *      markdown collapses single newlines inside paragraphs).
 * 3. Skip blank lines between blocks.
 *
 * Inline `**bold**` and `*italic*` runs inside heading text, paragraph
 * text, and list-item text are extracted by `parseInlineRuns`.
 */
export function parseNaskahMarkdown(markdown: string): NaskahBlock[] {
  if (!markdown) return []

  const lines = markdown.split(/\r?\n/)
  const blocks: NaskahBlock[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip blank lines between blocks.
    if (line.trim().length === 0) {
      i += 1
      continue
    }

    // Heading: `^#{1,6} text`
    const headingMatch = line.match(/^(#{1,6}) (.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6
      blocks.push({
        type: "heading",
        level,
        runs: parseInlineRuns(headingMatch[2]),
      })
      i += 1
      continue
    }

    // Ordered list: `^\d+\. text`. Consume contiguous matching lines.
    if (/^\d+\. /.test(line)) {
      const items: TextRun[][] = []
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\. /, "")
        items.push(parseInlineRuns(itemText))
        i += 1
      }
      blocks.push({ type: "list", ordered: true, items })
      continue
    }

    // Unordered list: `^[-*] text`.
    if (/^[-*] /.test(line)) {
      const items: TextRun[][] = []
      while (i < lines.length && /^[-*] /.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*] /, "")
        items.push(parseInlineRuns(itemText))
        i += 1
      }
      blocks.push({ type: "list", ordered: false, items })
      continue
    }

    // Paragraph: consume contiguous non-blank, non-block-prefix lines.
    // Join with a single space — markdown convention is that a single
    // newline inside a paragraph is just whitespace, not a hard break.
    const paragraphLines: string[] = [line]
    i += 1
    while (
      i < lines.length &&
      lines[i].trim().length > 0 &&
      !/^(#{1,6} |\d+\. |[-*] )/.test(lines[i])
    ) {
      paragraphLines.push(lines[i])
      i += 1
    }
    blocks.push({
      type: "paragraph",
      runs: parseInlineRuns(paragraphLines.join(" ")),
    })
  }

  return blocks
}

/**
 * Extract `**bold**` and `*italic*` runs from a single text fragment.
 *
 * Uses `String.prototype.matchAll` for a clean iterator-based pass.
 * Bold is matched FIRST so that `**word**` is consumed as one bold run
 * before the italic alternation can grab the inner `*word*`. Plain
 * text segments are emitted between matches.
 *
 * **Limitations (acceptable for naskah content):**
 * - No nested formatting (`**bold _italic_ bold**` would emit one bold
 *   run with the inner asterisks intact).
 * - No escape sequences (`\*` is treated as `\*` literally).
 *
 * If the input is empty or has no formatting markers, the function
 * returns a single plain run with the verbatim text.
 */
export function parseInlineRuns(text: string): TextRun[] {
  if (!text) return [{ text: "" }]

  const runs: TextRun[] = []
  // Bold first (`**…**`), then italic (`*…*` with no internal newline).
  const pattern = /\*\*([^*]+)\*\*|\*([^*\n]+)\*/g
  let lastIdx = 0

  for (const match of text.matchAll(pattern)) {
    const matchIndex = match.index ?? 0
    if (matchIndex > lastIdx) {
      runs.push({ text: text.slice(lastIdx, matchIndex) })
    }
    if (match[1] != null) {
      runs.push({ text: match[1], bold: true })
    } else if (match[2] != null) {
      runs.push({ text: match[2], italic: true })
    }
    lastIdx = matchIndex + match[0].length
  }

  if (lastIdx < text.length) {
    runs.push({ text: text.slice(lastIdx) })
  }

  // Defensive: never return an empty run array — callers may iterate
  // and expect at least one entry per non-empty input.
  if (runs.length === 0) return [{ text }]
  return runs
}
