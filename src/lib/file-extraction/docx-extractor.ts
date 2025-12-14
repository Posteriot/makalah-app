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
    // Convert Blob to ArrayBuffer (required by mammoth)
    const arrayBuffer = await blob.arrayBuffer()

    // Validate buffer size
    if (arrayBuffer.byteLength === 0) {
      throw new DOCXExtractionError(
        "DOCX file is empty (0 bytes)",
        "EMPTY_DOCX"
      )
    }

    // Extract raw text using mammoth
    const result = await mammoth.extractRawText({ arrayBuffer })

    // Get extracted text
    const extractedText = result.value.trim()

    // Check if DOCX is empty (no text content)
    if (!extractedText) {
      throw new DOCXExtractionError(
        "DOCX contains no extractable text",
        "EMPTY_DOCX"
      )
    }

    // Log warnings if any (optional)
    if (result.messages.length > 0) {
      console.warn(
        `[DOCX Extractor] Warnings during extraction:`,
        result.messages
      )
    }

    // Log metadata for debugging
    console.log(
      `[DOCX Extractor] Successfully extracted ${extractedText.length} characters`
    )

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

/**
 * Validate if a blob is a valid DOCX file
 *
 * @param blob - File blob to validate
 * @returns true if blob appears to be valid DOCX, false otherwise
 */
export function isValidDocxFile(blob: Blob): boolean {
  // Check MIME type
  const validMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-word.document.macroEnabled.12", // .docm
  ]

  return validMimeTypes.includes(blob.type)
}

/**
 * Get user-friendly error message from DOCXExtractionError
 *
 * @param error - DOCXExtractionError instance
 * @returns User-friendly error message in Indonesian
 */
export function getDocxErrorMessage(error: DOCXExtractionError): string {
  switch (error.code) {
    case "CORRUPT_FILE":
      return "File DOCX rusak atau tidak valid. Silakan upload file yang valid."
    case "UNSUPPORTED_FORMAT":
      return "Format file tidak didukung. Pastikan file adalah .docx yang valid."
    case "EMPTY_DOCX":
      return "File DOCX tidak mengandung teks yang bisa diekstrak."
    case "PARSE_ERROR":
      return "Gagal membaca file DOCX. Format mungkin tidak didukung."
    default:
      return "Terjadi error saat membaca file DOCX."
  }
}
