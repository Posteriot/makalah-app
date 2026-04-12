/**
 * Naskah-specific PDF builder.
 *
 * Generates an A4 PDF directly from a NaskahCompiledSnapshot, mirroring
 * the on-screen NaskahPreview layout:
 *
 * - Cover page with the resolved paper title centered.
 * - One section per page block sequence: section label as a level-1
 *   heading, followed by the section's markdown content rendered into
 *   paragraphs / sub-headings / lists with `**bold**` and `*italic*`
 *   inline formatting honored.
 * - Margins match the on-screen preview AND the existing
 *   `src/lib/export/pdf-builder.ts` (top/bottom 2.5cm, left 3cm, right
 *   2cm) so the downloaded PDF feels visually consistent with both the
 *   web preview and the legacy structured export.
 *
 * **Why a separate builder instead of reusing `pdf-builder.ts`?**
 * The legacy builder takes `CompiledPaperContent`, which is a deeply
 * structured shape (latarBelakang, rumusanMasalah, metodologi…) keyed
 * to the stage-based paper export pipeline. Naskah is fundamentally
 * different: it's a flat list of `NaskahSection` chunks whose body is
 * markdown, not pre-validated structured fields. Trying to shoehorn
 * naskah snapshots through the structured shape would require either
 * lossy parsing or fake "empty" stage data — both worse than just
 * having a focused builder for the naskah path.
 */

import PDFDocument from "pdfkit"
import type { NaskahSection } from "@/lib/naskah/types"
import { parseNaskahMarkdown, type TextRun } from "./markdown-blocks"

// ───────────────────────────────────────────────────────────────────────
// Layout constants — copied from src/lib/export/pdf-builder.ts so the
// naskah PDF and the legacy structured PDF share visual identity.
// ───────────────────────────────────────────────────────────────────────

const CM_TO_POINTS = 28.35
const PAGE_MARGINS = {
  top: 2.5 * CM_TO_POINTS,
  bottom: 2.5 * CM_TO_POINTS,
  left: 3 * CM_TO_POINTS,
  right: 2 * CM_TO_POINTS,
}

const FONTS = {
  regular: "Times-Roman",
  bold: "Times-Bold",
  italic: "Times-Italic",
  boldItalic: "Times-BoldItalic",
}

const FONT_SIZES = {
  coverTitle: 20,
  sectionLabel: 16,
  heading2: 14,
  heading3: 12,
  body: 12,
}

// Inter-block spacing in points. `subsectionGap` ≈ the on-screen
// `mt-12` (48px) translated to print: 48px ≈ 36pt at 72dpi mapping.
const SPACING = {
  paragraphGap: 6,
  subsectionGap: 18,
  postHeadingGap: 4,
  postSectionLabelGap: 14,
}

// ───────────────────────────────────────────────────────────────────────
// Public surface
// ───────────────────────────────────────────────────────────────────────

export interface NaskahPdfInput {
  title: string
  sections: NaskahSection[]
}

/**
 * Generate a naskah PDF as a `ReadableStream<Uint8Array>` ready to be
 * returned from a Next.js Route Handler. Streams chunks as pdfkit
 * emits them so very large papers don't have to fit in memory.
 */
export function generateNaskahPdfStream(
  input: NaskahPdfInput,
): ReadableStream<Uint8Array> {
  const doc = new PDFDocument({
    size: "A4",
    margins: PAGE_MARGINS,
    bufferPages: true,
    info: {
      Title: input.title || "Naskah Akademik",
      Author: "Makalah App",
      Creator: "Makalah App — naskah export",
    },
  })

  return new ReadableStream({
    start(controller) {
      doc.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      doc.on("end", () => controller.close())
      doc.on("error", (error) => controller.error(error))

      buildNaskahPdf(doc, input)
      doc.end()
    },
  })
}

/**
 * Generate a naskah PDF as a single `Buffer`. Useful for tests and for
 * small papers where streaming is overkill.
 */
export async function generateNaskahPdfBuffer(
  input: NaskahPdfInput,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margins: PAGE_MARGINS,
      bufferPages: true,
      info: {
        Title: input.title || "Naskah Akademik",
        Author: "Makalah App",
        Creator: "Makalah App — naskah export",
      },
    })

    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    buildNaskahPdf(doc, input)
    doc.end()
  })
}

/**
 * Sanitize a paper title into a filesystem-safe filename. Strips
 * directory separators and control characters, collapses spaces, and
 * caps length to 80 characters.
 */
export function getNaskahPdfFilename(title: string | null | undefined): string {
  const fallback = "naskah"
  const cleaned = (title ?? "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
  const safe = cleaned.length > 0 ? cleaned : fallback
  return `${safe}.pdf`
}

// ───────────────────────────────────────────────────────────────────────
// Internal layout
// ───────────────────────────────────────────────────────────────────────

function buildNaskahPdf(
  doc: PDFKit.PDFDocument,
  input: NaskahPdfInput,
): void {
  // Cover page: title centered vertically.
  drawCoverPage(doc, input.title || "Naskah Akademik")

  // Each section starts on a fresh page, mirroring the web preview's
  // first PageContainer per section.
  for (const section of input.sections) {
    doc.addPage()
    drawSectionLabel(doc, section.label)
    const stripped = stripLeadingDuplicateHeading(section.content, section.label)
    const blocks = parseNaskahMarkdown(stripped)
    drawBlocks(doc, blocks)
  }
}

function drawCoverPage(doc: PDFKit.PDFDocument, title: string): void {
  const pageHeight = doc.page.height
  const usableHeight =
    pageHeight - PAGE_MARGINS.top - PAGE_MARGINS.bottom
  // Place the title roughly at the vertical center.
  const titleY = PAGE_MARGINS.top + usableHeight / 2 - FONT_SIZES.coverTitle

  doc
    .font(FONTS.bold)
    .fontSize(FONT_SIZES.coverTitle)
    .text(title, PAGE_MARGINS.left, titleY, {
      align: "center",
      width:
        doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right,
    })
}

function drawSectionLabel(
  doc: PDFKit.PDFDocument,
  label: string,
): void {
  doc
    .font(FONTS.bold)
    .fontSize(FONT_SIZES.sectionLabel)
    .text(label, PAGE_MARGINS.left, PAGE_MARGINS.top, {
      width:
        doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right,
    })
  doc.moveDown(SPACING.postSectionLabelGap / FONT_SIZES.sectionLabel)
}

function drawBlocks(
  doc: PDFKit.PDFDocument,
  blocks: ReturnType<typeof parseNaskahMarkdown>,
): void {
  blocks.forEach((block, idx) => {
    const isSubsequent = idx > 0
    if (block.type === "heading") {
      // Subsection separation: every non-first heading gets the
      // subsection gap, mirroring the web preview's `mt-12`.
      if (isSubsequent) {
        doc.moveDown(SPACING.subsectionGap / FONT_SIZES.body)
      }
      drawHeading(doc, block.level, block.runs)
      return
    }

    if (block.type === "paragraph") {
      if (isSubsequent) {
        doc.moveDown(SPACING.paragraphGap / FONT_SIZES.body)
      }
      drawParagraph(doc, block.runs)
      return
    }

    // List
    if (isSubsequent) {
      doc.moveDown(SPACING.paragraphGap / FONT_SIZES.body)
    }
    drawList(doc, block.ordered, block.items)
  })
}

function drawHeading(
  doc: PDFKit.PDFDocument,
  level: 1 | 2 | 3 | 4 | 5 | 6,
  runs: TextRun[],
): void {
  const fontSize =
    level <= 2 ? FONT_SIZES.heading2 : FONT_SIZES.heading3
  doc.font(FONTS.bold).fontSize(fontSize)
  drawRichLine(doc, runs, { fontSize, fontFamily: FONTS.bold })
  doc.moveDown(SPACING.postHeadingGap / fontSize)
}

function drawParagraph(
  doc: PDFKit.PDFDocument,
  runs: TextRun[],
): void {
  doc.font(FONTS.regular).fontSize(FONT_SIZES.body)
  drawRichLine(doc, runs, {
    fontSize: FONT_SIZES.body,
    fontFamily: FONTS.regular,
    align: "justify",
  })
}

function drawList(
  doc: PDFKit.PDFDocument,
  ordered: boolean,
  items: TextRun[][],
): void {
  const indent = 18
  const usableWidth =
    doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right - indent

  items.forEach((itemRuns, idx) => {
    const marker = ordered ? `${idx + 1}.` : "•"
    const startY = doc.y
    doc
      .font(FONTS.regular)
      .fontSize(FONT_SIZES.body)
      .text(marker, PAGE_MARGINS.left, startY, {
        width: indent,
      })
    // Move cursor back to the indent column for the item body, then
    // emit the rich-text runs there.
    doc.font(FONTS.regular).fontSize(FONT_SIZES.body)
    drawRichLine(doc, itemRuns, {
      fontSize: FONT_SIZES.body,
      fontFamily: FONTS.regular,
      x: PAGE_MARGINS.left + indent,
      y: startY,
      width: usableWidth,
    })
    if (idx < items.length - 1) {
      doc.moveDown(0.2)
    }
  })
}

interface DrawRichLineOptions {
  fontSize: number
  fontFamily: string
  x?: number
  y?: number
  width?: number
  align?: "left" | "right" | "center" | "justify"
}

/**
 * Render a sequence of `TextRun` segments as a single flowing line of
 * text in pdfkit, swapping fonts for bold / italic runs and using the
 * `continued: true` flag so the segments stay on the same paragraph.
 *
 * The last run is emitted with `continued: false` so pdfkit advances
 * the cursor to the next line, ready for the next block.
 */
function drawRichLine(
  doc: PDFKit.PDFDocument,
  runs: TextRun[],
  opts: DrawRichLineOptions,
): void {
  const width =
    opts.width ??
    doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right
  const align = opts.align ?? "left"

  runs.forEach((run, idx) => {
    const isLast = idx === runs.length - 1
    const fontFamily = run.bold
      ? run.italic
        ? FONTS.boldItalic
        : FONTS.bold
      : run.italic
        ? FONTS.italic
        : opts.fontFamily
    doc.font(fontFamily).fontSize(opts.fontSize)

    const textOptions: PDFKit.Mixins.TextOptions = {
      continued: !isLast,
      width,
      align,
    }

    if (idx === 0 && opts.x !== undefined && opts.y !== undefined) {
      doc.text(run.text, opts.x, opts.y, textOptions)
    } else {
      doc.text(run.text, textOptions)
    }
  })
}

/**
 * Naskah preview's `stripLeadingDuplicateHeading` mirrored here so the
 * downloaded PDF doesn't render a duplicate H1 above its already-
 * displayed section label. The two functions intentionally implement
 * the same contract — we duplicate the logic instead of importing it
 * across the client/server boundary because the preview file is a
 * `"use client"` module that can't be bundled into a Node-side route
 * without dragging React into the build.
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
