/**
 * XLSX File Data Extractor
 *
 * Extracts tabular data from Excel spreadsheets (.xlsx) using xlsx-populate
 * Formats data as markdown tables for better readability
 */

import XlsxPopulate from "xlsx-populate"

/**
 * Custom error types untuk XLSX extraction
 */
export class XLSXExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CORRUPT_FILE"
      | "UNSUPPORTED_FORMAT"
      | "EMPTY_XLSX"
      | "PARSE_ERROR"
      | "UNKNOWN"
  ) {
    super(message)
    this.name = "XLSXExtractionError"
  }
}

/**
 * Format cell value untuk markdown table
 * Handles undefined, null, numbers, booleans, dates
 */
function formatCellValue(value: unknown): string {
  if (value === undefined || value === null) {
    return ""
  }

  // Convert to string and escape pipe characters
  const stringValue = String(value).trim()
  return stringValue.replace(/\|/g, "\\|") // Escape pipes for markdown
}

/**
 * Convert sheet data to markdown table format
 *
 * @param sheetData - Array of objects representing rows
 * @param sheetName - Name of the sheet
 * @returns Markdown-formatted table string
 */
function sheetToMarkdownTable(
  sheetData: Record<string, unknown>[],
  sheetName: string
): string {
  if (sheetData.length === 0) {
    return `## Sheet: ${sheetName}\n\n*Empty sheet*\n`
  }

  // Get all column headers (keys from first row)
  const headers = Object.keys(sheetData[0])

  if (headers.length === 0) {
    return `## Sheet: ${sheetName}\n\n*No columns found*\n`
  }

  // Build markdown table
  let markdown = `## Sheet: ${sheetName}\n\n`

  // Header row
  markdown += "| " + headers.join(" | ") + " |\n"

  // Separator row
  markdown += "| " + headers.map(() => "---").join(" | ") + " |\n"

  // Data rows
  for (const row of sheetData) {
    const rowValues = headers.map((header) =>
      formatCellValue(row[header])
    )
    markdown += "| " + rowValues.join(" | ") + " |\n"
  }

  return markdown + "\n"
}

/**
 * Extract data from an XLSX file (Blob)
 *
 * @param blob - File blob from Convex storage
 * @param options - Extraction options
 * @returns Extracted data formatted as markdown tables
 * @throws XLSXExtractionError if extraction fails
 */
export async function extractDataFromXlsx(
  blob: Blob,
  options?: {
    maxSheets?: number // Maximum number of sheets to extract (default: all)
    maxRows?: number // Maximum rows per sheet (default: 1000)
  }
): Promise<string> {
  try {
    // Convert Blob to ArrayBuffer
    const arrayBuffer = await blob.arrayBuffer()

    // Validate buffer size
    if (arrayBuffer.byteLength === 0) {
      throw new XLSXExtractionError(
        "XLSX file is empty (0 bytes)",
        "EMPTY_XLSX"
      )
    }

    // Parse XLSX workbook
    const buffer = Buffer.from(arrayBuffer)
    const workbook = await XlsxPopulate.fromDataAsync(buffer)

    const sheets = workbook.sheets()
    if (!sheets || sheets.length === 0) {
      throw new XLSXExtractionError(
        "XLSX file contains no sheets",
        "EMPTY_XLSX"
      )
    }

    // Extract configuration
    const maxSheets = options?.maxSheets ?? sheets.length
    const maxRows = options?.maxRows ?? 1000

    let extractedText = ""
    let totalRows = 0

    // Process each sheet (up to maxSheets)
    const sheetsToProcess = sheets.slice(0, maxSheets)

    for (const sheet of sheetsToProcess) {
      const sheetName = sheet.name()
      const usedRange = sheet.usedRange()

      if (!usedRange) {
        extractedText += `## Sheet: ${sheetName}\n\n*Empty sheet*\n\n`
        continue
      }

      const sheetData = usedRange.value() as unknown[][]
      const limitedData = sheetData.slice(0, maxRows + 1) // +1 for header row

      if (limitedData.length > 0) {
        const headerRow = limitedData[0] ?? []
        const headers = headerRow.map((h, i) =>
          String(h ?? "").trim() || `Column ${i + 1}`
        )
        const dataRows = limitedData.slice(1).map((row) => {
          const obj: Record<string, unknown> = {}
          headers.forEach((header, i) => {
            obj[header] = (row as unknown[] | undefined)?.[i]
          })
          return obj
        })

        extractedText += sheetToMarkdownTable(dataRows, sheetName)
        totalRows += dataRows.length
      } else {
        extractedText += `## Sheet: ${sheetName}\n\n*Empty sheet*\n\n`
      }
    }

    // Validate extracted content
    if (!extractedText.trim()) {
      throw new XLSXExtractionError(
        "XLSX contains no extractable data",
        "EMPTY_XLSX"
      )
    }

    return extractedText.trim()
  } catch (error) {
    // Handle specific error types
    if (error instanceof XLSXExtractionError) {
      throw error // Re-throw custom errors
    }

    // Parse error messages to detect specific issues
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Detect unsupported format
    if (
      errorMessage.includes("Unsupported file") ||
      errorMessage.includes("not a valid") ||
      errorMessage.includes("unknown file type")
    ) {
      throw new XLSXExtractionError(
        `XLSX file format is unsupported: ${errorMessage}`,
        "UNSUPPORTED_FORMAT"
      )
    }

    // Detect corrupt file
    if (
      errorMessage.includes("corrupt") ||
      errorMessage.includes("damaged") ||
      errorMessage.includes("End of data reached") ||
      errorMessage.includes("invalid signature")
    ) {
      throw new XLSXExtractionError(
        `XLSX file is corrupt or damaged: ${errorMessage}`,
        "CORRUPT_FILE"
      )
    }

    // Generic parse error
    throw new XLSXExtractionError(
      `Failed to parse XLSX: ${errorMessage}`,
      "PARSE_ERROR"
    )
  }
}

/**
 * Validate if a blob is a valid XLSX file
 *
 * @param blob - File blob to validate
 * @returns true if blob appears to be valid XLSX, false otherwise
 */
export function isValidXlsxFile(blob: Blob): boolean {
  // Check MIME type
  const validMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel.sheet.macroEnabled.12", // .xlsm
  ]

  return validMimeTypes.includes(blob.type)
}

/**
 * Get user-friendly error message from XLSXExtractionError
 *
 * @param error - XLSXExtractionError instance
 * @returns User-friendly error message in Indonesian
 */
export function getXlsxErrorMessage(error: XLSXExtractionError): string {
  switch (error.code) {
    case "CORRUPT_FILE":
      return "File Excel rusak atau tidak valid. Silakan upload file yang valid."
    case "UNSUPPORTED_FORMAT":
      return "Format file tidak didukung. Pastikan file adalah .xlsx yang valid."
    case "EMPTY_XLSX":
      return "File Excel tidak mengandung data yang bisa diekstrak."
    case "PARSE_ERROR":
      return "Gagal membaca file Excel. Format mungkin tidak didukung."
    default:
      return "Terjadi error saat membaca file Excel."
  }
}
