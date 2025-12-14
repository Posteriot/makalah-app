/**
 * PDF File Text Extractor
 *
 * Extracts text content from PDF files using pdf-parse library
 * Handles multi-page PDFs, corrupt files, and password-protected PDFs
 */

import { PDFParse } from "pdf-parse"

/**
 * Custom error types untuk PDF extraction
 */
export class PDFExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "CORRUPT_FILE"
      | "PASSWORD_PROTECTED"
      | "EMPTY_PDF"
      | "PARSE_ERROR"
      | "UNKNOWN"
  ) {
    super(message)
    this.name = "PDFExtractionError"
  }
}

/**
 * Extract text from a PDF file (Blob)
 *
 * @param blob - File blob from Convex storage
 * @returns Extracted text content from all pages, trimmed
 * @throws PDFExtractionError if extraction fails
 */
export async function extractTextFromPdf(blob: Blob): Promise<string> {
  try {
    // Convert Blob to ArrayBuffer (required by pdf-parse v2)
    const arrayBuffer = await blob.arrayBuffer()

    // Validate buffer size
    if (arrayBuffer.byteLength === 0) {
      throw new PDFExtractionError(
        "PDF file is empty (0 bytes)",
        "EMPTY_PDF"
      )
    }

    // Parse PDF using PDFParse class (v2 API)
    const parser = new PDFParse({ data: arrayBuffer })
    const result = await parser.getText()

    // Extract text and clean up
    const extractedText = result.text.trim()

    // Check if PDF is actually scanned/image-based (no extractable text)
    if (!extractedText) {
      throw new PDFExtractionError(
        "PDF contains no extractable text (might be scanned/image-based)",
        "EMPTY_PDF"
      )
    }

    // Log metadata for debugging (optional)
    console.log(
      `[PDF Extractor] Successfully extracted ${extractedText.length} characters from ${result.total} page(s)`
    )

    return extractedText
  } catch (error) {
    // Handle specific error types
    if (error instanceof PDFExtractionError) {
      throw error // Re-throw custom errors
    }

    // Parse error messages to detect specific issues
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Detect password-protected PDF
    if (
      errorMessage.includes("encrypted") ||
      errorMessage.includes("password") ||
      errorMessage.includes("Invalid Password")
    ) {
      throw new PDFExtractionError(
        "PDF is password-protected or encrypted",
        "PASSWORD_PROTECTED"
      )
    }

    // Detect corrupt file
    if (
      errorMessage.includes("Invalid PDF") ||
      errorMessage.includes("corrupt") ||
      errorMessage.includes("damaged") ||
      errorMessage.includes("startxref not found")
    ) {
      throw new PDFExtractionError(
        `PDF file is corrupt or invalid: ${errorMessage}`,
        "CORRUPT_FILE"
      )
    }

    // Generic parse error
    throw new PDFExtractionError(
      `Failed to parse PDF: ${errorMessage}`,
      "PARSE_ERROR"
    )
  }
}

/**
 * Validate if a blob is a valid PDF file
 *
 * @param blob - File blob to validate
 * @returns true if blob appears to be valid PDF, false otherwise
 */
export function isValidPdfFile(blob: Blob): boolean {
  // Check MIME type
  const validMimeTypes = ["application/pdf"]

  return validMimeTypes.includes(blob.type)
}

/**
 * Get user-friendly error message from PDFExtractionError
 *
 * @param error - PDFExtractionError instance
 * @returns User-friendly error message in Indonesian
 */
export function getPdfErrorMessage(error: PDFExtractionError): string {
  switch (error.code) {
    case "PASSWORD_PROTECTED":
      return "File PDF terproteksi password. Silakan unprotect terlebih dahulu."
    case "CORRUPT_FILE":
      return "File PDF rusak atau tidak valid. Silakan upload file yang valid."
    case "EMPTY_PDF":
      return "File PDF tidak mengandung teks yang bisa diekstrak (mungkin berisi gambar saja)."
    case "PARSE_ERROR":
      return "Gagal membaca file PDF. Format mungkin tidak didukung."
    default:
      return "Terjadi error saat membaca file PDF."
  }
}
