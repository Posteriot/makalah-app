/**
 * Naskah-specific DOCX builder.
 *
 * Generates a Word document from a NaskahCompiledSnapshot, mirroring
 * the on-screen NaskahPreview layout:
 *
 * - Cover paragraph with the resolved paper title (centered, large).
 * - Each section starts on a fresh page with the section label as a
 *   heading 1, followed by the section's markdown content rendered as
 *   `Paragraph` instances with bold/italic runs honored.
 * - Subsection h2/h3 markdown headings become `HeadingLevel.HEADING_2`
 *   / `HEADING_3` paragraphs with extra `before` spacing so they read
 *   like the web preview's `mt-12` block separator.
 *
 * **Why a separate builder instead of reusing `word-builder.ts`?**
 * The legacy builder takes `CompiledPaperContent`, which is a deeply
 * structured shape (latarBelakang, rumusanMasalah, …) tied to the
 * stage-based paper export pipeline. Naskah is fundamentally
 * different: a flat list of markdown sections. Trying to shoehorn
 * naskah snapshots through the structured shape would require either
 * lossy parsing or fake "empty" stage data — both worse than just
 * having a focused builder for the naskah path.
 */

import {
  AlignmentType,
  Document,
  HeadingLevel,
  PageBreak,
  Packer,
  Paragraph,
  TextRun,
  convertInchesToTwip,
} from "docx"
import type { NaskahSection } from "@/lib/naskah/types"
import {
  parseNaskahMarkdown,
  type NaskahBlock,
  type TextRun as NaskahTextRun,
} from "./markdown-blocks"

export interface NaskahWordInput {
  title: string
  sections: NaskahSection[]
}

/**
 * Generate a naskah DOCX as a `ReadableStream<Uint8Array>` ready to
 * stream from a Next.js Route Handler.
 *
 * The `docx` library packs in-memory and returns a single Buffer, so
 * the stream emits one chunk and closes. The streaming wrapper exists
 * for API symmetry with `generateNaskahPdfStream` (which IS truly
 * streaming via pdfkit).
 */
export async function generateNaskahWordStream(
  input: NaskahWordInput,
): Promise<ReadableStream<Uint8Array>> {
  const buffer = await generateNaskahWordBuffer(input)
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer))
      controller.close()
    },
  })
}

/**
 * Generate a naskah DOCX as a single Buffer. Used by the streaming
 * wrapper above and by tests.
 */
export async function generateNaskahWordBuffer(
  input: NaskahWordInput,
): Promise<Buffer> {
  const doc = buildNaskahDocument(input)
  return Packer.toBuffer(doc)
}

/**
 * Sanitize a paper title into a filesystem-safe filename. Strips
 * directory separators and control characters, collapses spaces, and
 * caps length to 80 characters.
 */
export function getNaskahWordFilename(
  title: string | null | undefined,
): string {
  const fallback = "naskah"
  const cleaned = (title ?? "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
  const safe = cleaned.length > 0 ? cleaned : fallback
  return `${safe}.docx`
}

// ───────────────────────────────────────────────────────────────────────
// Internal layout
// ───────────────────────────────────────────────────────────────────────

function buildNaskahDocument(input: NaskahWordInput): Document {
  const children: Paragraph[] = []

  // Cover page: title centered, large.
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 4000, after: 400 },
      children: [
        new TextRun({
          text: input.title || "Naskah Akademik",
          bold: true,
          size: 40, // half-points (40 = 20pt)
        }),
      ],
    }),
  )

  // Each section starts on its own page.
  input.sections.forEach((section, sectionIdx) => {
    // Page break before every section except the very first one
    // (because the cover paragraph implicitly occupies page 1).
    children.push(
      new Paragraph({
        children: [new PageBreak()],
      }),
    )

    // Section label as Heading 1.
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 0, after: 240 },
        children: [
          new TextRun({
            text: section.label,
            bold: true,
            size: 32,
          }),
        ],
      }),
    )

    const stripped = stripLeadingDuplicateHeading(section.content, section.label)
    const blocks = parseNaskahMarkdown(stripped)
    blocks.forEach((block) => {
      children.push(...renderBlock(block))
    })

    // Suppress unused-var warning when sectionIdx isn't read inside
    // the loop body. We keep it for clarity in case future changes
    // need it (e.g., differing per-section margins).
    void sectionIdx
  })

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(0.8),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.2),
            },
          },
        },
        children,
      },
    ],
  })
}

function renderBlock(block: NaskahBlock): Paragraph[] {
  if (block.type === "heading") {
    const docxLevel =
      block.level === 1
        ? HeadingLevel.HEADING_2 // section labels already use HEADING_1
        : block.level === 2
          ? HeadingLevel.HEADING_2
          : block.level === 3
            ? HeadingLevel.HEADING_3
            : HeadingLevel.HEADING_4
    return [
      new Paragraph({
        heading: docxLevel,
        // `before: 360` ≈ 18pt ≈ the on-screen mt-12 (48px) separator
        // between subsection blocks.
        spacing: { before: 360, after: 120 },
        children: runsToTextRuns(block.runs, { bold: true }),
      }),
    ]
  }

  if (block.type === "paragraph") {
    return [
      new Paragraph({
        alignment: AlignmentType.JUSTIFIED,
        spacing: { after: 200 },
        children: runsToTextRuns(block.runs),
      }),
    ]
  }

  // List
  return block.items.map((itemRuns, idx) => {
    if (block.ordered) {
      return new Paragraph({
        indent: { left: 360 },
        spacing: { after: 100 },
        children: [
          new TextRun({ text: `${idx + 1}. ` }),
          ...runsToTextRuns(itemRuns),
        ],
      })
    }
    return new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 100 },
      children: runsToTextRuns(itemRuns),
    })
  })
}

interface RunOverrides {
  bold?: boolean
  italics?: boolean
}

function runsToTextRuns(
  runs: NaskahTextRun[],
  overrides: RunOverrides = {},
): TextRun[] {
  return runs.map(
    (run) =>
      new TextRun({
        text: run.text,
        bold: overrides.bold || run.bold || undefined,
        italics: overrides.italics || run.italic || undefined,
      }),
  )
}

/**
 * Mirrored from NaskahPreview's helper. Strips a leading `# Heading`
 * from section content when it duplicates the section label, so the
 * Word output doesn't render the same heading twice.
 */
function stripLeadingDuplicateHeading(
  content: string,
  sectionLabel: string,
): string {
  const lines = content.split(/\r?\n/)
  let firstNonBlank = -1
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().length > 0) {
      firstNonBlank = i
      break
    }
  }
  if (firstNonBlank === -1) return content

  const line = lines[firstNonBlank].trimStart()
  if (!line.startsWith("# ") || line.startsWith("## ")) return content

  const headingText = line.slice(2).trim()
  if (headingText.toLowerCase() !== sectionLabel.toLowerCase()) {
    return content
  }

  let cursor = firstNonBlank + 1
  while (cursor < lines.length && lines[cursor].trim().length === 0) {
    cursor += 1
  }
  return lines.slice(cursor).join("\n")
}
