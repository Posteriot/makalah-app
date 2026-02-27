/**
 * TXT File Text Extractor
 *
 * Extracts text content from plain text files (.txt)
 * Supports UTF-8, ASCII, and other common text encodings
 */

/**
 * Extract text from a plain text file (Blob)
 *
 * @param blob - File blob from Convex storage
 * @returns Extracted text content, trimmed of leading/trailing whitespace
 * @throws Error if blob cannot be read or is empty
 */
export async function extractTextFromTxt(blob: Blob): Promise<string> {
  try {
    // Read blob as text (automatically handles UTF-8 encoding)
    const text = await blob.text()

    // Trim whitespace and validate
    const trimmedText = text.trim()

    if (!trimmedText) {
      throw new Error("File is empty or contains only whitespace")
    }

    return trimmedText
  } catch (error) {
    // Re-throw with more context
    if (error instanceof Error) {
      throw new Error(`Failed to extract text from TXT file: ${error.message}`)
    }
    throw new Error("Failed to extract text from TXT file: Unknown error")
  }
}
