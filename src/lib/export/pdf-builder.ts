/**
 * PDF Document Builder untuk Paper Export
 *
 * Generate PDF document dari compiled paper content.
 * Menggunakan library `pdfkit` untuk server-side PDF generation.
 *
 * Margin standar skripsi Indonesia:
 * - Top/Bottom: 2.5cm = 70.87 points
 * - Left: 3cm = 85.04 points
 * - Right: 2cm = 56.69 points
 *
 * 1 cm = 28.35 points
 */

import PDFDocument from "pdfkit"
import type { CompiledPaperContent } from "./content-compiler"

// Konstanta untuk page setup (dalam points)
const CM_TO_POINTS = 28.35
const PAGE_MARGINS = {
  top: 2.5 * CM_TO_POINTS, // 70.87 points
  bottom: 2.5 * CM_TO_POINTS, // 70.87 points
  left: 3 * CM_TO_POINTS, // 85.04 points
  right: 2 * CM_TO_POINTS, // 56.69 points
}

// Konstanta untuk font dan styling
const FONTS = {
  regular: "Times-Roman",
  bold: "Times-Bold",
  italic: "Times-Italic",
}

const FONT_SIZES = {
  title: 16,
  heading1: 14,
  heading2: 12,
  body: 12,
}

const LINE_HEIGHT = 1.5

// Konstanta untuk hanging indent (APA 7th - dalam points)
const HANGING_INDENT = 36 // sekitar 0.5 inch = 36 points

type TextSegment = {
  text: string
  italics: boolean
}

function parseItalicSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  const pattern = /(\*[^*]+\*|_[^_]+_)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), italics: false })
    }
    const raw = match[0]
    const inner = raw.slice(1, -1)
    if (inner) {
      segments.push({ text: inner, italics: true })
    }
    lastIndex = match.index + raw.length
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), italics: false })
  }

  return segments.length > 0 ? segments : [{ text, italics: false }]
}

function writeRichText(
  doc: PDFKit.PDFDocument,
  segments: TextSegment[],
  options: PDFKit.Mixins.TextOptions,
  startX?: number,
  startY?: number
): void {
  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1
    const textOptions = { ...options, continued: !isLast }

    doc
      .font(segment.italics ? FONTS.italic : FONTS.regular)
      .fontSize(FONT_SIZES.body)

    if (index === 0 && startX !== undefined && startY !== undefined) {
      doc.text(segment.text, startX, startY, textOptions)
    } else {
      doc.text(segment.text, textOptions)
    }
  })
}

/**
 * Interface untuk tracking page number
 */
interface PDFBuilderOptions {
  showPageNumbers?: boolean
}

/**
 * Generate PDF document dari CompiledPaperContent.
 * Returns Promise<ArrayBuffer> yang kompatibel dengan Response API.
 */
export async function generatePDFBuffer(
  content: CompiledPaperContent,
  options: PDFBuilderOptions = { showPageNumbers: true }
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create PDF document dengan A4 size dan margins
      const doc = new PDFDocument({
        size: "A4",
        margins: PAGE_MARGINS,
        bufferPages: true, // Enable page buffering untuk page numbers
        info: {
          Title: content.title || "Paper Akademik",
          Author: "Makalah App",
          Creator: "Makalah App - pdfkit",
        },
      })

      // Collect chunks untuk buffer
      const chunks: Buffer[] = []
      doc.on("data", (chunk: Buffer) => chunks.push(chunk))
      doc.on("end", () => {
        const buffer = Buffer.concat(chunks)
        // Convert Buffer ke ArrayBuffer untuk kompatibilitas dengan Response API
        const arrayBuffer = new ArrayBuffer(buffer.byteLength)
        const view = new Uint8Array(arrayBuffer)
        for (let i = 0; i < buffer.byteLength; i++) {
          view[i] = buffer[i]
        }
        resolve(arrayBuffer)
      })
      doc.on("error", reject)

      // Build document content
      buildPDFContent(doc, content)

      // Add page numbers di footer (setelah semua content)
      if (options.showPageNumbers) {
        addPageNumbers(doc)
      }

      // Finalize document
      doc.end()
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Generate PDF ReadableStream untuk response streaming.
 */
export function generatePDFStream(
  content: CompiledPaperContent,
  options: PDFBuilderOptions = { showPageNumbers: true }
): ReadableStream<Uint8Array> {
  const doc = new PDFDocument({
    size: "A4",
    margins: PAGE_MARGINS,
    bufferPages: true,
    info: {
      Title: content.title || "Paper Akademik",
      Author: "Makalah App",
      Creator: "Makalah App - pdfkit",
    },
  })

  return new ReadableStream({
    start(controller) {
      doc.on("data", (chunk: Buffer) => {
        controller.enqueue(new Uint8Array(chunk))
      })
      doc.on("end", () => controller.close())
      doc.on("error", (error) => controller.error(error))

      buildPDFContent(doc, content)

      if (options.showPageNumbers) {
        addPageNumbers(doc)
      }

      doc.end()
    },
  })
}

/**
 * Build semua content PDF dalam urutan yang benar.
 */
function buildPDFContent(
  doc: PDFKit.PDFDocument,
  content: CompiledPaperContent
): void {
  // 1. Title
  if (content.title) {
    buildTitleSection(doc, content.title)
  }

  // 2. Abstrak + Keywords
  buildAbstractSection(doc, content.abstract, content.keywords)

  // 3. Pendahuluan (major section - page break)
  if (content.pendahuluan) {
    doc.addPage()
    buildPendahuluanSection(doc, content.pendahuluan)
  }

  // 4. Tinjauan Literatur
  if (content.tinjauanLiteratur) {
    buildTinjauanLiteraturSection(doc, content.tinjauanLiteratur)
  }

  // 5. Metodologi
  if (content.metodologi) {
    buildMetodologiSection(doc, content.metodologi)
  }

  // 6. Hasil
  if (content.hasil) {
    buildHasilSection(doc, content.hasil)
  }

  // 7. Diskusi
  if (content.diskusi) {
    buildDiskusiSection(doc, content.diskusi)
  }

  // 8. Kesimpulan
  if (content.kesimpulan) {
    buildKesimpulanSection(doc, content.kesimpulan)
  }

  // 9. Daftar Pustaka (major section - page break)
  if (content.daftarPustaka && content.daftarPustaka.length > 0) {
    doc.addPage()
    buildDaftarPustakaSection(doc, content.daftarPustaka)
  }

  // 10. Lampiran
  if (content.lampiran && content.lampiran.length > 0) {
    doc.addPage()
    buildLampiranSection(doc, content.lampiran)
  }
}

/**
 * Add page numbers ke footer center di semua halaman.
 */
function addPageNumbers(doc: PDFKit.PDFDocument): void {
  const pages = doc.bufferedPageRange()

  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i)

    // Position di footer center
    const pageWidth = doc.page.width
    const pageHeight = doc.page.height
    const pageNumber = i + 1

    // Footer position: 30 points dari bottom
    doc
      .font(FONTS.regular)
      .fontSize(10)
      .text(String(pageNumber), 0, pageHeight - 50, {
        align: "center",
        width: pageWidth,
      })
  }
}

/**
 * Helper: Write heading level 1
 */
function writeHeading1(doc: PDFKit.PDFDocument, text: string): void {
  doc
    .font(FONTS.bold)
    .fontSize(FONT_SIZES.heading1)
    .text(text, { lineGap: FONT_SIZES.heading1 * (LINE_HEIGHT - 1) })
  doc.moveDown(0.5)
}

/**
 * Helper: Write heading level 2
 */
function writeHeading2(doc: PDFKit.PDFDocument, text: string): void {
  doc
    .font(FONTS.bold)
    .fontSize(FONT_SIZES.heading2)
    .text(text, { lineGap: FONT_SIZES.heading2 * (LINE_HEIGHT - 1) })
  doc.moveDown(0.3)
}

/**
 * Helper: Write paragraph body text
 */
function writeParagraph(doc: PDFKit.PDFDocument, text: string): void {
  const segments = parseItalicSegments(text)
  writeRichText(doc, segments, {
    lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
    align: "justify",
  })
  doc.moveDown(0.5)
}

/**
 * Helper: Write numbered list item
 */
function writeNumberedItem(
  doc: PDFKit.PDFDocument,
  number: number,
  text: string
): void {
  const indent = 20
  const startX = PAGE_MARGINS.left + indent
  const width = doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right - indent
  const startY = doc.y
  const segments = parseItalicSegments(text)

  doc
    .font(FONTS.regular)
    .fontSize(FONT_SIZES.body)
    .text(`${number}. `, startX, startY, {
      width,
      lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
      continued: segments.length > 0,
    })

  if (segments.length > 0) {
    writeRichText(doc, segments, {
      width,
      lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
    })
  }
  doc.moveDown(0.3)
}

/**
 * Helper: Write bullet list item
 */
function writeBulletItem(doc: PDFKit.PDFDocument, text: string): void {
  const indent = 20
  const bulletX = PAGE_MARGINS.left + 5
  const textX = PAGE_MARGINS.left + indent
  const startY = doc.y
  const segments = parseItalicSegments(text)

  // Draw bullet
  doc
    .font(FONTS.regular)
    .fontSize(FONT_SIZES.body)
    .text("\u2022", bulletX, startY)

  // Write text
  writeRichText(doc, segments, {
    width: doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right - indent,
    lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
  }, textX, startY)
  doc.moveDown(0.3)
}

/**
 * Helper: Write hanging indent paragraph (untuk Daftar Pustaka)
 * pdfkit tidak support hanging indent native, workaround dengan manual word wrapping.
 */
function writeHangingIndentParagraph(
  doc: PDFKit.PDFDocument,
  text: string
): void {
  // Simpan posisi awal
  const startX = PAGE_MARGINS.left
  const startY = doc.y
  const maxWidth =
    doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right - HANGING_INDENT

  // Setup font
  doc.font(FONTS.regular).fontSize(FONT_SIZES.body)

  // Render text dengan indent dari baris kedua
  // pdfkit workaround: split text dan render manual
  const words = text.split(" ")
  let currentLine = ""
  let isFirstLine = true

  doc.text("", startX, startY) // Reset position

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word
    const testWidth = doc.widthOfString(testLine)

    if (testWidth > maxWidth && currentLine) {
      // Output current line
      if (isFirstLine) {
        doc.text(currentLine, startX, doc.y, {
          continued: false,
          lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
        })
        isFirstLine = false
      } else {
        doc.text(currentLine, startX + HANGING_INDENT, doc.y, {
          continued: false,
          lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
        })
      }
      currentLine = word
    } else {
      currentLine = testLine
    }
  }

  // Output remaining text
  if (currentLine) {
    if (isFirstLine) {
      doc.text(currentLine, startX, doc.y, {
        continued: false,
        lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
      })
    } else {
      doc.text(currentLine, startX + HANGING_INDENT, doc.y, {
        continued: false,
        lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
      })
    }
  }

  doc.moveDown(0.3)
}

/**
 * Build section: Title
 */
function buildTitleSection(doc: PDFKit.PDFDocument, title: string): void {
  doc
    .font(FONTS.bold)
    .fontSize(FONT_SIZES.title)
    .text(title, {
      align: "center",
      lineGap: FONT_SIZES.title * (LINE_HEIGHT - 1),
    })
  doc.moveDown(2)
}

/**
 * Build section: Abstrak + Keywords
 */
function buildAbstractSection(
  doc: PDFKit.PDFDocument,
  abstract: string | null,
  keywords: string[] | null
): void {
  writeHeading1(doc, "ABSTRAK")

  if (abstract) {
    writeParagraph(doc, abstract)
  }

  if (keywords && keywords.length > 0) {
    doc.font(FONTS.bold).fontSize(FONT_SIZES.body).text("Kata Kunci: ", {
      continued: true,
    })
    doc
      .font(FONTS.italic)
      .text(keywords.join(", "), {
        lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
      })
    doc.moveDown(1)
  }
}

/**
 * Build section: Pendahuluan
 */
function buildPendahuluanSection(
  doc: PDFKit.PDFDocument,
  pendahuluan: CompiledPaperContent["pendahuluan"]
): void {
  if (!pendahuluan) return

  writeHeading1(doc, "1. PENDAHULUAN")

  if (pendahuluan.latarBelakang) {
    writeHeading2(doc, "1.1 Latar Belakang")
    writeParagraph(doc, pendahuluan.latarBelakang)
  }

  if (pendahuluan.rumusanMasalah) {
    writeHeading2(doc, "1.2 Rumusan Masalah")
    writeParagraph(doc, pendahuluan.rumusanMasalah)
  }

  if (pendahuluan.researchGapAnalysis) {
    writeHeading2(doc, "1.3 Analisis Research Gap")
    writeParagraph(doc, pendahuluan.researchGapAnalysis)
  }

  if (pendahuluan.tujuanPenelitian) {
    writeHeading2(doc, "1.4 Tujuan Penelitian")
    writeParagraph(doc, pendahuluan.tujuanPenelitian)
  }

  if (pendahuluan.signifikansiPenelitian) {
    writeHeading2(doc, "1.5 Signifikansi Penelitian")
    writeParagraph(doc, pendahuluan.signifikansiPenelitian)
  }

  if (pendahuluan.hipotesis) {
    writeHeading2(doc, "1.6 Hipotesis")
    writeParagraph(doc, pendahuluan.hipotesis)
  }
}

/**
 * Build section: Tinjauan Literatur
 */
function buildTinjauanLiteraturSection(
  doc: PDFKit.PDFDocument,
  tinjauanLiteratur: CompiledPaperContent["tinjauanLiteratur"]
): void {
  if (!tinjauanLiteratur) return

  writeHeading1(doc, "2. TINJAUAN LITERATUR")

  if (tinjauanLiteratur.kerangkaTeoretis) {
    writeHeading2(doc, "2.1 Kerangka Teoretis")
    writeParagraph(doc, tinjauanLiteratur.kerangkaTeoretis)
  }

  if (tinjauanLiteratur.reviewLiteratur) {
    writeHeading2(doc, "2.2 Review Literatur")
    writeParagraph(doc, tinjauanLiteratur.reviewLiteratur)
  }

  if (tinjauanLiteratur.gapAnalysis) {
    writeHeading2(doc, "2.3 Gap Analysis")
    writeParagraph(doc, tinjauanLiteratur.gapAnalysis)
  }

  if (tinjauanLiteratur.justifikasiPenelitian) {
    writeHeading2(doc, "2.4 Justifikasi Penelitian")
    writeParagraph(doc, tinjauanLiteratur.justifikasiPenelitian)
  }
}

/**
 * Build section: Metodologi
 */
function buildMetodologiSection(
  doc: PDFKit.PDFDocument,
  metodologi: CompiledPaperContent["metodologi"]
): void {
  if (!metodologi) return

  writeHeading1(doc, "3. METODOLOGI PENELITIAN")

  if (metodologi.pendekatanPenelitian) {
    writeHeading2(doc, "3.1 Pendekatan Penelitian")
    const pendekatan =
      metodologi.pendekatanPenelitian === "kualitatif"
        ? "Kualitatif"
        : metodologi.pendekatanPenelitian === "kuantitatif"
          ? "Kuantitatif"
          : "Mixed Methods"
    writeParagraph(doc, `Penelitian ini menggunakan pendekatan ${pendekatan}.`)
  }

  if (metodologi.desainPenelitian) {
    writeHeading2(doc, "3.2 Desain Penelitian")
    writeParagraph(doc, metodologi.desainPenelitian)
  }

  if (metodologi.metodePerolehanData) {
    writeHeading2(doc, "3.3 Metode Pengumpulan Data")
    writeParagraph(doc, metodologi.metodePerolehanData)
  }

  if (metodologi.teknikAnalisis) {
    writeHeading2(doc, "3.4 Teknik Analisis Data")
    writeParagraph(doc, metodologi.teknikAnalisis)
  }

  if (metodologi.etikaPenelitian) {
    writeHeading2(doc, "3.5 Etika Penelitian")
    writeParagraph(doc, metodologi.etikaPenelitian)
  }

  if (metodologi.alatInstrumen) {
    writeHeading2(doc, "3.6 Alat/Instrumen")
    writeParagraph(doc, metodologi.alatInstrumen)
  }
}

/**
 * Build section: Hasil
 */
function buildHasilSection(
  doc: PDFKit.PDFDocument,
  hasil: CompiledPaperContent["hasil"]
): void {
  if (!hasil) return

  writeHeading1(doc, "4. HASIL PENELITIAN")

  if (hasil.temuanUtama && hasil.temuanUtama.length > 0) {
    writeHeading2(doc, "4.1 Temuan Utama")
    hasil.temuanUtama.forEach((temuan, index) => {
      writeNumberedItem(doc, index + 1, temuan)
    })
    doc.moveDown(0.5)
  }

  if (hasil.dataPoints && hasil.dataPoints.length > 0) {
    writeHeading2(doc, "4.2 Data Pendukung")
    hasil.dataPoints.forEach((dp) => {
      const value = typeof dp.value === "number" ? dp.value.toString() : dp.value
      const unit = dp.unit ? ` ${dp.unit}` : ""
      writeBulletItem(doc, `${dp.label}: ${value}${unit}`)
    })
  }

  if (hasil.metodePenyajian) {
    writeHeading2(doc, "4.3 Metode Penyajian")
    const metode =
      hasil.metodePenyajian === "narrative"
        ? "Naratif"
        : hasil.metodePenyajian === "tabular"
          ? "Tabular"
          : "Mixed"
    writeParagraph(doc, `Metode penyajian hasil: ${metode}.`)
  }
}

/**
 * Build section: Diskusi
 */
function buildDiskusiSection(
  doc: PDFKit.PDFDocument,
  diskusi: CompiledPaperContent["diskusi"]
): void {
  if (!diskusi) return

  writeHeading1(doc, "5. DISKUSI")

  if (diskusi.interpretasiTemuan) {
    writeHeading2(doc, "5.1 Interpretasi Temuan")
    writeParagraph(doc, diskusi.interpretasiTemuan)
  }

  if (diskusi.perbandinganLiteratur) {
    writeHeading2(doc, "5.2 Perbandingan dengan Literatur")
    writeParagraph(doc, diskusi.perbandinganLiteratur)
  }

  if (diskusi.implikasiTeoretis) {
    writeHeading2(doc, "5.3 Implikasi Teoretis")
    writeParagraph(doc, diskusi.implikasiTeoretis)
  }

  if (diskusi.implikasiPraktis) {
    writeHeading2(doc, "5.4 Implikasi Praktis")
    writeParagraph(doc, diskusi.implikasiPraktis)
  }

  if (diskusi.keterbatasanPenelitian) {
    writeHeading2(doc, "5.5 Keterbatasan Penelitian")
    writeParagraph(doc, diskusi.keterbatasanPenelitian)
  }

  if (diskusi.saranPenelitianMendatang) {
    writeHeading2(doc, "5.6 Saran Penelitian Mendatang")
    writeParagraph(doc, diskusi.saranPenelitianMendatang)
  }
}

/**
 * Build section: Kesimpulan
 */
function buildKesimpulanSection(
  doc: PDFKit.PDFDocument,
  kesimpulan: CompiledPaperContent["kesimpulan"]
): void {
  if (!kesimpulan) return

  writeHeading1(doc, "6. KESIMPULAN DAN SARAN")

  if (kesimpulan.ringkasanHasil) {
    writeHeading2(doc, "6.1 Kesimpulan")
    writeParagraph(doc, kesimpulan.ringkasanHasil)
  }

  if (
    kesimpulan.jawabanRumusanMasalah &&
    kesimpulan.jawabanRumusanMasalah.length > 0
  ) {
    writeHeading2(doc, "6.2 Jawaban Rumusan Masalah")
    kesimpulan.jawabanRumusanMasalah.forEach((jawaban, index) => {
      writeNumberedItem(doc, index + 1, jawaban)
    })
    doc.moveDown(0.5)
  }

  if (kesimpulan.implikasiPraktis) {
    writeHeading2(doc, "6.3 Implikasi Praktis")
    writeParagraph(doc, kesimpulan.implikasiPraktis)
  }

  const hasSaran =
    kesimpulan.saranPraktisi ||
    kesimpulan.saranPeneliti ||
    kesimpulan.saranKebijakan

  if (hasSaran) {
    writeHeading2(doc, "6.4 Saran")

    if (kesimpulan.saranPraktisi) {
      doc.font(FONTS.bold).fontSize(FONT_SIZES.body).text("Saran untuk Praktisi: ", {
        continued: true,
      })
      doc.font(FONTS.regular).text(kesimpulan.saranPraktisi, {
        lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
      })
      doc.moveDown(0.3)
    }

    if (kesimpulan.saranPeneliti) {
      doc.font(FONTS.bold).fontSize(FONT_SIZES.body).text("Saran untuk Peneliti: ", {
        continued: true,
      })
      doc.font(FONTS.regular).text(kesimpulan.saranPeneliti, {
        lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
      })
      doc.moveDown(0.3)
    }

    if (kesimpulan.saranKebijakan) {
      doc.font(FONTS.bold).fontSize(FONT_SIZES.body).text("Saran untuk Kebijakan: ", {
        continued: true,
      })
      doc.font(FONTS.regular).text(kesimpulan.saranKebijakan, {
        lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
      })
      doc.moveDown(0.3)
    }
  }
}

/**
 * Build section: Daftar Pustaka dengan hanging indent (APA 7th)
 */
function buildDaftarPustakaSection(
  doc: PDFKit.PDFDocument,
  daftarPustaka: CompiledPaperContent["daftarPustaka"]
): void {
  if (!daftarPustaka || daftarPustaka.length === 0) return

  writeHeading1(doc, "DAFTAR PUSTAKA")

  // Sort entries alphabetically by fullReference atau title
  const sortedEntries = [...daftarPustaka].sort((a, b) => {
    const refA = a.fullReference || a.title || ""
    const refB = b.fullReference || b.title || ""
    return refA.localeCompare(refB)
  })

  // Render each entry dengan hanging indent
  sortedEntries.forEach((entry) => {
    const reference = entry.fullReference || formatReference(entry)
    writeHangingIndentParagraph(doc, reference)
  })
}

/**
 * Format reference entry jika fullReference tidak tersedia.
 */
function formatReference(entry: {
  title: string
  authors?: string
  year?: number
  url?: string
  doi?: string
}): string {
  const parts: string[] = []

  if (entry.authors) {
    parts.push(entry.authors)
  }

  if (entry.year) {
    parts.push(`(${entry.year}).`)
  }

  parts.push(entry.title)

  if (entry.doi) {
    parts.push(`https://doi.org/${entry.doi}`)
  } else if (entry.url) {
    parts.push(entry.url)
  }

  return parts.join(" ")
}

/**
 * Build section: Lampiran
 */
function buildLampiranSection(
  doc: PDFKit.PDFDocument,
  lampiran: CompiledPaperContent["lampiran"]
): void {
  if (!lampiran || lampiran.length === 0) return

  writeHeading1(doc, "LAMPIRAN")

  lampiran.forEach((item) => {
    // Heading untuk setiap lampiran
    const title = item.judul || item.label
    doc.font(FONTS.bold).fontSize(FONT_SIZES.body).text(`${item.label}: `, {
      continued: true,
    })
    doc.font(FONTS.regular).text(title, {
      lineGap: FONT_SIZES.body * (LINE_HEIGHT - 1),
    })
    doc.moveDown(0.3)

    // Konten lampiran jika ada
    if (item.konten) {
      writeParagraph(doc, item.konten)
    }

    doc.moveDown(0.5)
  })
}

/**
 * Get suggested filename untuk PDF export.
 */
export function getPDFFilename(title: string | null): string {
  if (!title) return "paper.pdf"

  // Sanitize title untuk filename
  const sanitized = title
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid filename chars
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .substring(0, 100) // Limit length

  return `${sanitized}.pdf`
}
