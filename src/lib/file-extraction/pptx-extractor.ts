/**
 * PPTX File Text Extractor
 *
 * Extracts text content from Microsoft PowerPoint files (.pptx) using officeparser library
 * Handles slide content, speaker notes, and basic text structure
 */

import { parsePowerPoint } from "officeparser/dist/parsers/PowerPointParser"

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
    // Convert Blob to ArrayBuffer lalu ke Buffer (parser PPTX bekerja di Node Buffer)
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate buffer size
    if (arrayBuffer.byteLength === 0) {
      throw new PPTXExtractionError(
        "PPTX file is empty (0 bytes)",
        "EMPTY_PPTX"
      )
    }

    // Extract text menggunakan parser PPTX spesifik untuk hindari import parser PDF.
    const ast = await parsePowerPoint(buffer, {
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
