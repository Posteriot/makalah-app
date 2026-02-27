/**
 * PPTX File Text Extractor
 *
 * Extracts text content from Microsoft PowerPoint files (.pptx) using officeparser library
 * Handles slide content, speaker notes, and basic text structure
 */

import { parseOffice } from "officeparser"

/**
 * Custom error types untuk PPTX extraction
 */
export class PPTXExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CORRUPT_FILE"
      | "UNSUPPORTED_FORMAT"
      | "EMPTY_PPTX"
      | "PARSE_ERROR"
      | "UNKNOWN"
  ) {
    super(message)
    this.name = "PPTXExtractionError"
  }
}

/**
 * Extract text from a PPTX file (Blob)
 *
 * @param blob - File blob from Convex storage
 * @returns Extracted text content, trimmed and preserving slide structure
 * @throws PPTXExtractionError if extraction fails
 */
export async function extractTextFromPptx(blob: Blob): Promise<string> {
  try {
    // Convert Blob to ArrayBuffer (required by officeparser)
    const arrayBuffer = await blob.arrayBuffer()

    // Validate buffer size
    if (arrayBuffer.byteLength === 0) {
      throw new PPTXExtractionError(
        "PPTX file is empty (0 bytes)",
        "EMPTY_PPTX"
      )
    }

    // Extract text using officeparser
    // parseOffice accepts ArrayBuffer directly; returns AST with toText() method
    const ast = await parseOffice(arrayBuffer, {
      newlineDelimiter: "\n",
      putNotesAtLast: true,
    })

    // Get extracted text
    const extractedText = ast.toText().trim()

    // Check if PPTX is empty (no text content)
    if (!extractedText) {
      throw new PPTXExtractionError(
        "PPTX contains no extractable text",
        "EMPTY_PPTX"
      )
    }

    return extractedText
  } catch (error) {
    // Handle specific error types
    if (error instanceof PPTXExtractionError) {
      throw error // Re-throw custom errors
    }

    // Parse error messages to detect specific issues
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Detect unsupported format (not a valid PPTX)
    if (
      errorMessage.includes("not a valid") ||
      errorMessage.includes("unsupported") ||
      errorMessage.includes("Cannot read") ||
      errorMessage.includes("ENOENT")
    ) {
      throw new PPTXExtractionError(
        `PPTX file format is unsupported or invalid: ${errorMessage}`,
        "UNSUPPORTED_FORMAT"
      )
    }

    // Detect corrupt file
    if (
      errorMessage.includes("corrupt") ||
      errorMessage.includes("damaged") ||
      errorMessage.includes("zip") ||
      errorMessage.includes("invalid signature")
    ) {
      throw new PPTXExtractionError(
        `PPTX file is corrupt or damaged: ${errorMessage}`,
        "CORRUPT_FILE"
      )
    }

    // Generic parse error
    throw new PPTXExtractionError(
      `Failed to parse PPTX: ${errorMessage}`,
      "PARSE_ERROR"
    )
  }
}

/**
 * Validate if a blob is a valid PPTX file
 *
 * @param blob - File blob to validate
 * @returns true if blob appears to be valid PPTX, false otherwise
 */
export function isValidPptxFile(blob: Blob): boolean {
  // Check MIME type
  const validMimeTypes = [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/pptx",
  ]

  return validMimeTypes.includes(blob.type)
}

/**
 * Get user-friendly error message from PPTXExtractionError
 *
 * @param error - PPTXExtractionError instance
 * @returns User-friendly error message in Indonesian
 */
export function getPptxErrorMessage(error: PPTXExtractionError): string {
  switch (error.code) {
    case "CORRUPT_FILE":
      return "File PPTX rusak atau tidak valid. Silakan upload file yang valid."
    case "UNSUPPORTED_FORMAT":
      return "Format file tidak didukung. Pastikan file adalah .pptx yang valid."
    case "EMPTY_PPTX":
      return "File PPTX tidak mengandung teks yang bisa diekstrak."
    case "PARSE_ERROR":
      return "Gagal membaca file PPTX. Format mungkin tidak didukung."
    default:
      return "Terjadi error saat membaca file PPTX."
  }
}
