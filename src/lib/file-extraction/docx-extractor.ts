/**
 * DOCX File Text Extractor
 *
 * Extracts text content from Microsoft Word files (.docx) using mammoth library
 * Handles paragraph structure, headers, and basic formatting
 */

import mammoth from "mammoth"

/**
 * Custom error types untuk DOCX extraction
 */
export class DOCXExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CORRUPT_FILE"
      | "UNSUPPORTED_FORMAT"
      | "EMPTY_DOCX"
      | "PARSE_ERROR"
      | "UNKNOWN"
  ) {
    super(message)
    this.name = "DOCXExtractionError"
  }
}

/**
 * Extract text from a DOCX file (Blob)
 *
 * @param blob - File blob from Convex storage
 * @returns Extracted text content, trimmed and preserving paragraph structure
 * @throws DOCXExtractionError if extraction fails
 */
export async function extractTextFromDocx(blob: Blob): Promise<string> {
  try {
    // Convert Blob to Buffer (mammoth v1 expects Node.js Buffer, not ArrayBuffer)
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate buffer size
    if (buffer.byteLength === 0) {
      throw new DOCXExtractionError(
        "DOCX file is empty (0 bytes)",
        "EMPTY_DOCX"
      )
    }

    // Extract raw text using mammoth
    const result = await mammoth.extractRawText({ buffer })

    // Get extracted text
    const extractedText = result.value.trim()

    // Check if DOCX is empty (no text content)
    if (!extractedText) {
      throw new DOCXExtractionError(
        "DOCX contains no extractable text",
        "EMPTY_DOCX"
      )
    }

    return extractedText
  } catch (error) {
    // Handle specific error types
    if (error instanceof DOCXExtractionError) {
      throw error // Re-throw custom errors
    }

    // Parse error messages to detect specific issues
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Detect unsupported format (not a valid DOCX)
    if (
      errorMessage.includes("not a valid") ||
      errorMessage.includes("unsupported") ||
      errorMessage.includes("Cannot read") ||
      errorMessage.includes("ENOENT")
    ) {
      throw new DOCXExtractionError(
        `DOCX file format is unsupported or invalid: ${errorMessage}`,
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
      throw new DOCXExtractionError(
        `DOCX file is corrupt or damaged: ${errorMessage}`,
        "CORRUPT_FILE"
      )
    }

    // Generic parse error
    throw new DOCXExtractionError(
      `Failed to parse DOCX: ${errorMessage}`,
      "PARSE_ERROR"
    )
  }
}
