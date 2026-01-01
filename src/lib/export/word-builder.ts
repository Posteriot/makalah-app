/**
 * Word Document Builder untuk Paper Export
 *
 * Generate Word document (.docx) dari compiled paper content.
 * Menggunakan library `docx` untuk server-side document generation.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  convertInchesToTwip,
} from "docx"
import type { CompiledPaperContent } from "./content-compiler"

// Konstanta untuk styling (dalam twips, 1 inch = 1440 twips)
const HANGING_INDENT_TWIPS = 720 // 0.5 inch untuk APA 7th

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

function createTextRuns(text: string): TextRun[] {
  return parseItalicSegments(text).map((segment) => new TextRun({
    text: segment.text,
    italics: segment.italics,
  }))
}

/**
 * Helper untuk buat paragraph biasa.
 */
function createParagraph(text: string): Paragraph {
  return new Paragraph({
    children: createTextRuns(text),
    spacing: { after: 200 },
  })
}

/**
 * Helper untuk buat heading section.
 */
function createSectionHeading(
  text: string,
  level: typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2 = HeadingLevel.HEADING_1
): Paragraph {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 400, after: 200 },
  })
}

/**
 * Helper untuk buat paragraph dengan hanging indent (APA 7th untuk Daftar Pustaka).
 */
function createHangingIndentParagraph(text: string): Paragraph {
  return new Paragraph({
    indent: {
      left: HANGING_INDENT_TWIPS,
      hanging: HANGING_INDENT_TWIPS,
    },
    children: createTextRuns(text),
    spacing: { after: 120 },
  })
}

/**
 * Helper untuk buat bullet list item.
 */
function createBulletItem(text: string): Paragraph {
  return new Paragraph({
    bullet: { level: 0 },
    children: createTextRuns(text),
    spacing: { after: 100 },
  })
}

/**
 * Helper untuk buat numbered list item.
 */
function createNumberedItem(number: number, text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${number}. ` }),
      ...createTextRuns(text),
    ],
    indent: { left: 360 },
    spacing: { after: 100 },
  })
}

/**
 * Build section Judul (Title).
 */
function buildTitleSection(title: string): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 32, // 16pt
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 600 },
    }),
  ]
}

/**
 * Build section Abstrak.
 */
function buildAbstractSection(
  abstract: string | null,
  keywords: string[] | null
): Paragraph[] {
  const paragraphs: Paragraph[] = []

  paragraphs.push(createSectionHeading("ABSTRAK"))

  if (abstract) {
    paragraphs.push(createParagraph(abstract))
  }

  if (keywords && keywords.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: "Kata Kunci: ", bold: true }),
          new TextRun({ text: keywords.join(", "), italics: true }),
        ],
        spacing: { before: 200, after: 400 },
      })
    )
  }

  return paragraphs
}

/**
 * Build section Pendahuluan.
 */
function buildPendahuluanSection(
  pendahuluan: CompiledPaperContent["pendahuluan"]
): Paragraph[] {
  if (!pendahuluan) return []

  const paragraphs: Paragraph[] = []

  paragraphs.push(createSectionHeading("1. PENDAHULUAN"))

  // Latar Belakang
  if (pendahuluan.latarBelakang) {
    paragraphs.push(
      createSectionHeading("1.1 Latar Belakang", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(pendahuluan.latarBelakang))
  }

  // Rumusan Masalah
  if (pendahuluan.rumusanMasalah) {
    paragraphs.push(
      createSectionHeading("1.2 Rumusan Masalah", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(pendahuluan.rumusanMasalah))
  }

  // Research Gap Analysis
  if (pendahuluan.researchGapAnalysis) {
    paragraphs.push(
      createSectionHeading("1.3 Analisis Research Gap", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(pendahuluan.researchGapAnalysis))
  }

  // Tujuan Penelitian
  if (pendahuluan.tujuanPenelitian) {
    paragraphs.push(
      createSectionHeading("1.4 Tujuan Penelitian", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(pendahuluan.tujuanPenelitian))
  }

  // Signifikansi Penelitian (jika ada)
  if (pendahuluan.signifikansiPenelitian) {
    paragraphs.push(
      createSectionHeading("1.5 Signifikansi Penelitian", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(pendahuluan.signifikansiPenelitian))
  }

  // Hipotesis
  if (pendahuluan.hipotesis) {
    paragraphs.push(
      createSectionHeading("1.6 Hipotesis", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(pendahuluan.hipotesis))
  }

  return paragraphs
}

/**
 * Build section Tinjauan Literatur.
 */
function buildTinjauanLiteraturSection(
  tinjauanLiteratur: CompiledPaperContent["tinjauanLiteratur"]
): Paragraph[] {
  if (!tinjauanLiteratur) return []

  const paragraphs: Paragraph[] = []

  paragraphs.push(createSectionHeading("2. TINJAUAN LITERATUR"))

  // Kerangka Teoretis
  if (tinjauanLiteratur.kerangkaTeoretis) {
    paragraphs.push(
      createSectionHeading("2.1 Kerangka Teoretis", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(tinjauanLiteratur.kerangkaTeoretis))
  }

  // Review Literatur
  if (tinjauanLiteratur.reviewLiteratur) {
    paragraphs.push(
      createSectionHeading("2.2 Review Literatur", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(tinjauanLiteratur.reviewLiteratur))
  }

  // Gap Analysis
  if (tinjauanLiteratur.gapAnalysis) {
    paragraphs.push(
      createSectionHeading("2.3 Gap Analysis", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(tinjauanLiteratur.gapAnalysis))
  }

  // Justifikasi Penelitian
  if (tinjauanLiteratur.justifikasiPenelitian) {
    paragraphs.push(
      createSectionHeading("2.4 Justifikasi Penelitian", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(tinjauanLiteratur.justifikasiPenelitian))
  }

  return paragraphs
}

/**
 * Build section Metodologi.
 */
function buildMetodologiSection(
  metodologi: CompiledPaperContent["metodologi"]
): Paragraph[] {
  if (!metodologi) return []

  const paragraphs: Paragraph[] = []

  paragraphs.push(createSectionHeading("3. METODOLOGI PENELITIAN"))

  // Pendekatan Penelitian
  if (metodologi.pendekatanPenelitian) {
    paragraphs.push(
      createSectionHeading("3.1 Pendekatan Penelitian", HeadingLevel.HEADING_2)
    )
    const pendekatan =
      metodologi.pendekatanPenelitian === "kualitatif"
        ? "Kualitatif"
        : metodologi.pendekatanPenelitian === "kuantitatif"
          ? "Kuantitatif"
          : "Mixed Methods"
    paragraphs.push(createParagraph(`Penelitian ini menggunakan pendekatan ${pendekatan}.`))
  }

  // Desain Penelitian
  if (metodologi.desainPenelitian) {
    paragraphs.push(
      createSectionHeading("3.2 Desain Penelitian", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(metodologi.desainPenelitian))
  }

  // Metode Perolehan Data
  if (metodologi.metodePerolehanData) {
    paragraphs.push(
      createSectionHeading("3.3 Metode Pengumpulan Data", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(metodologi.metodePerolehanData))
  }

  // Teknik Analisis
  if (metodologi.teknikAnalisis) {
    paragraphs.push(
      createSectionHeading("3.4 Teknik Analisis Data", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(metodologi.teknikAnalisis))
  }

  // Etika Penelitian
  if (metodologi.etikaPenelitian) {
    paragraphs.push(
      createSectionHeading("3.5 Etika Penelitian", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(metodologi.etikaPenelitian))
  }

  // Alat/Instrumen
  if (metodologi.alatInstrumen) {
    paragraphs.push(
      createSectionHeading("3.6 Alat/Instrumen", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(metodologi.alatInstrumen))
  }

  return paragraphs
}

/**
 * Build section Hasil.
 */
function buildHasilSection(hasil: CompiledPaperContent["hasil"]): Paragraph[] {
  if (!hasil) return []

  const paragraphs: Paragraph[] = []

  paragraphs.push(createSectionHeading("4. HASIL PENELITIAN"))

  // Temuan Utama
  if (hasil.temuanUtama && hasil.temuanUtama.length > 0) {
    paragraphs.push(
      createSectionHeading("4.1 Temuan Utama", HeadingLevel.HEADING_2)
    )
    hasil.temuanUtama.forEach((temuan, index) => {
      paragraphs.push(createNumberedItem(index + 1, temuan))
    })
  }

  // Data Points
  if (hasil.dataPoints && hasil.dataPoints.length > 0) {
    paragraphs.push(
      createSectionHeading("4.2 Data Pendukung", HeadingLevel.HEADING_2)
    )
    hasil.dataPoints.forEach((dp) => {
      const value = typeof dp.value === "number" ? dp.value.toString() : dp.value
      const unit = dp.unit ? ` ${dp.unit}` : ""
      paragraphs.push(createBulletItem(`${dp.label}: ${value}${unit}`))
    })
  }

  // Metode Penyajian
  if (hasil.metodePenyajian) {
    paragraphs.push(
      createSectionHeading("4.3 Metode Penyajian", HeadingLevel.HEADING_2)
    )
    const metode =
      hasil.metodePenyajian === "narrative"
        ? "Naratif"
        : hasil.metodePenyajian === "tabular"
          ? "Tabular"
          : "Mixed"
    paragraphs.push(createParagraph(`Metode penyajian hasil: ${metode}.`))
  }

  return paragraphs
}

/**
 * Build section Diskusi.
 */
function buildDiskusiSection(
  diskusi: CompiledPaperContent["diskusi"]
): Paragraph[] {
  if (!diskusi) return []

  const paragraphs: Paragraph[] = []

  paragraphs.push(createSectionHeading("5. DISKUSI"))

  // Interpretasi Temuan
  if (diskusi.interpretasiTemuan) {
    paragraphs.push(
      createSectionHeading("5.1 Interpretasi Temuan", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(diskusi.interpretasiTemuan))
  }

  // Perbandingan dengan Literatur
  if (diskusi.perbandinganLiteratur) {
    paragraphs.push(
      createSectionHeading(
        "5.2 Perbandingan dengan Literatur",
        HeadingLevel.HEADING_2
      )
    )
    paragraphs.push(createParagraph(diskusi.perbandinganLiteratur))
  }

  // Implikasi Teoretis
  if (diskusi.implikasiTeoretis) {
    paragraphs.push(
      createSectionHeading("5.3 Implikasi Teoretis", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(diskusi.implikasiTeoretis))
  }

  // Implikasi Praktis
  if (diskusi.implikasiPraktis) {
    paragraphs.push(
      createSectionHeading("5.4 Implikasi Praktis", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(diskusi.implikasiPraktis))
  }

  // Keterbatasan Penelitian
  if (diskusi.keterbatasanPenelitian) {
    paragraphs.push(
      createSectionHeading(
        "5.5 Keterbatasan Penelitian",
        HeadingLevel.HEADING_2
      )
    )
    paragraphs.push(createParagraph(diskusi.keterbatasanPenelitian))
  }

  // Saran Penelitian Mendatang
  if (diskusi.saranPenelitianMendatang) {
    paragraphs.push(
      createSectionHeading(
        "5.6 Saran Penelitian Mendatang",
        HeadingLevel.HEADING_2
      )
    )
    paragraphs.push(createParagraph(diskusi.saranPenelitianMendatang))
  }

  return paragraphs
}

/**
 * Build section Kesimpulan.
 */
function buildKesimpulanSection(
  kesimpulan: CompiledPaperContent["kesimpulan"]
): Paragraph[] {
  if (!kesimpulan) return []

  const paragraphs: Paragraph[] = []

  paragraphs.push(createSectionHeading("6. KESIMPULAN DAN SARAN"))

  // Ringkasan Hasil
  if (kesimpulan.ringkasanHasil) {
    paragraphs.push(
      createSectionHeading("6.1 Kesimpulan", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(kesimpulan.ringkasanHasil))
  }

  // Jawaban Rumusan Masalah
  if (kesimpulan.jawabanRumusanMasalah && kesimpulan.jawabanRumusanMasalah.length > 0) {
    paragraphs.push(
      createSectionHeading(
        "6.2 Jawaban Rumusan Masalah",
        HeadingLevel.HEADING_2
      )
    )
    kesimpulan.jawabanRumusanMasalah.forEach((jawaban, index) => {
      paragraphs.push(createNumberedItem(index + 1, jawaban))
    })
  }

  // Implikasi Praktis
  if (kesimpulan.implikasiPraktis) {
    paragraphs.push(
      createSectionHeading("6.3 Implikasi Praktis", HeadingLevel.HEADING_2)
    )
    paragraphs.push(createParagraph(kesimpulan.implikasiPraktis))
  }

  // Saran
  const hasSaran =
    kesimpulan.saranPraktisi ||
    kesimpulan.saranPeneliti ||
    kesimpulan.saranKebijakan

  if (hasSaran) {
    paragraphs.push(createSectionHeading("6.4 Saran", HeadingLevel.HEADING_2))

    if (kesimpulan.saranPraktisi) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Saran untuk Praktisi: ", bold: true }),
            new TextRun({ text: kesimpulan.saranPraktisi }),
          ],
          spacing: { after: 100 },
        })
      )
    }

    if (kesimpulan.saranPeneliti) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Saran untuk Peneliti: ", bold: true }),
            new TextRun({ text: kesimpulan.saranPeneliti }),
          ],
          spacing: { after: 100 },
        })
      )
    }

    if (kesimpulan.saranKebijakan) {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Saran untuk Kebijakan: ", bold: true }),
            new TextRun({ text: kesimpulan.saranKebijakan }),
          ],
          spacing: { after: 100 },
        })
      )
    }
  }

  return paragraphs
}

/**
 * Build section Daftar Pustaka dengan hanging indent (APA 7th).
 */
function buildDaftarPustakaSection(
  daftarPustaka: CompiledPaperContent["daftarPustaka"]
): Paragraph[] {
  if (!daftarPustaka || daftarPustaka.length === 0) return []

  const paragraphs: Paragraph[] = []

  // Page break sebelum Daftar Pustaka
  paragraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  )

  paragraphs.push(createSectionHeading("DAFTAR PUSTAKA"))

  // Sort entries alphabetically by fullReference atau title
  const sortedEntries = [...daftarPustaka].sort((a, b) => {
    const refA = a.fullReference || a.title || ""
    const refB = b.fullReference || b.title || ""
    return refA.localeCompare(refB)
  })

  // Render each entry dengan hanging indent
  sortedEntries.forEach((entry) => {
    const reference = entry.fullReference || formatReference(entry)
    paragraphs.push(createHangingIndentParagraph(reference))
  })

  return paragraphs
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
 * Build section Lampiran.
 */
function buildLampiranSection(
  lampiran: CompiledPaperContent["lampiran"]
): Paragraph[] {
  if (!lampiran || lampiran.length === 0) return []

  const paragraphs: Paragraph[] = []

  // Page break sebelum Lampiran
  paragraphs.push(
    new Paragraph({
      children: [new PageBreak()],
    })
  )

  paragraphs.push(createSectionHeading("LAMPIRAN"))

  lampiran.forEach((item) => {
    // Heading untuk setiap lampiran
    const title = item.judul || item.label
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${item.label}: `, bold: true }),
          new TextRun({ text: title }),
        ],
        spacing: { before: 300, after: 100 },
      })
    )

    // Konten lampiran jika ada
    if (item.konten) {
      paragraphs.push(createParagraph(item.konten))
    }
  })

  return paragraphs
}

/**
 * Build complete Word document dari CompiledPaperContent.
 */
export function buildWordDocument(content: CompiledPaperContent): Document {
  const children: Paragraph[] = []

  // Title
  if (content.title) {
    children.push(...buildTitleSection(content.title))
  }

  // Abstrak + Keywords
  children.push(...buildAbstractSection(content.abstract, content.keywords))

  // Main sections dengan numbering
  children.push(...buildPendahuluanSection(content.pendahuluan))
  children.push(...buildTinjauanLiteraturSection(content.tinjauanLiteratur))
  children.push(...buildMetodologiSection(content.metodologi))
  children.push(...buildHasilSection(content.hasil))
  children.push(...buildDiskusiSection(content.diskusi))
  children.push(...buildKesimpulanSection(content.kesimpulan))

  // Daftar Pustaka (dengan page break)
  children.push(...buildDaftarPustakaSection(content.daftarPustaka))

  // Lampiran (dengan page break)
  children.push(...buildLampiranSection(content.lampiran))

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

/**
 * Generate Word document ArrayBuffer dari CompiledPaperContent.
 * Returns ArrayBuffer untuk kompatibilitas dengan Response/Blob API.
 */
export async function generateWordBuffer(
  content: CompiledPaperContent
): Promise<ArrayBuffer> {
  const doc = buildWordDocument(content)
  const buffer = await Packer.toBuffer(doc)
  // Create new ArrayBuffer dan copy data dari Node.js Buffer
  // Ini menghindari masalah SharedArrayBuffer vs ArrayBuffer
  const arrayBuffer = new ArrayBuffer(buffer.byteLength)
  const view = new Uint8Array(arrayBuffer)
  for (let i = 0; i < buffer.byteLength; i++) {
    view[i] = buffer[i]
  }
  return arrayBuffer
}

/**
 * Generate Word document ReadableStream untuk response streaming.
 */
export async function generateWordStream(
  content: CompiledPaperContent
): Promise<ReadableStream<Uint8Array>> {
  const buffer = await generateWordBuffer(content)
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(buffer))
      controller.close()
    },
  })
}

/**
 * Get suggested filename untuk Word export.
 */
export function getWordFilename(title: string | null): string {
  if (!title) return "paper.docx"

  // Sanitize title untuk filename
  const sanitized = title
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid filename chars
    .replace(/\s+/g, "_") // Replace spaces with underscore
    .substring(0, 100) // Limit length

  return `${sanitized}.docx`
}
