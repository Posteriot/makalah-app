/**
 * File Text Extraction - Convex Action
 *
 * Background processing untuk ekstraksi teks dari berbagai format file.
 * Triggered setelah file upload, extract text, dan save ke database.
 *
 * Supported formats:
 * - TXT: Plain text
 * - PDF: pdf-parse library
 * - DOCX: mammoth library
 * - XLSX: xlsx library (markdown table format)
 * - Images: OpenAI Vision API (GPT-4o)
 */

import { v } from "convex/values"
import { action } from "./_generated/server"
import { api } from "./_generated/api"

// Import extractors (Node.js compatible)
import { extractTextFromTxt } from "../src/lib/file-extraction/txt-extractor"
// TODO: pdf-parse not compatible with Convex environment (pdfjs-dist uses browser APIs)
// import { extractTextFromPdf } from "../src/lib/file-extraction/pdf-extractor"
import { extractTextFromDocx } from "../src/lib/file-extraction/docx-extractor"
import { extractDataFromXlsx } from "../src/lib/file-extraction/xlsx-extractor"
import { extractTextFromImage } from "../src/lib/file-extraction/image-ocr"

/**
 * Retry helper untuk network/API calls yang bisa transient error
 *
 * @param fn - Async function yang mau di-retry
 * @param maxRetries - Jumlah max retry attempts (default: 3)
 * @param delayMs - Delay antara retries dalam milliseconds (default: 1000)
 * @returns Result dari function call
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      console.warn(
        `[Retry] Attempt ${attempt}/${maxRetries} failed: ${lastError.message}`
      )

      // Jika bukan last attempt, wait sebelum retry
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const backoffDelay = delayMs * Math.pow(2, attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
      }
    }
  }

  // Semua retries gagal
  throw new Error(
    `Operation failed after ${maxRetries} retries: ${lastError?.message}`
  )
}

/**
 * Detect file type category dari MIME type
 *
 * @param mimeType - MIME type dari file
 * @returns File type category: "txt" | "pdf" | "docx" | "xlsx" | "image" | "unsupported"
 */
function detectFileType(
  mimeType: string
): "txt" | "pdf" | "docx" | "xlsx" | "image" | "unsupported" {
  // Text files
  if (
    mimeType === "text/plain" ||
    mimeType === "text/txt" ||
    mimeType === "application/txt"
  ) {
    return "txt"
  }

  // PDF files
  if (mimeType === "application/pdf") {
    return "pdf"
  }

  // DOCX files
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/docx"
  ) {
    return "docx"
  }

  // XLSX files
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/xlsx"
  ) {
    return "xlsx"
  }

  // Image files
  if (
    mimeType === "image/png" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/jpg" ||
    mimeType === "image/webp" ||
    mimeType === "image/gif"
  ) {
    return "image"
  }

  // Unsupported
  return "unsupported"
}

/**
 * Main Convex action untuk background file text extraction
 *
 * Flow:
 * 1. Fetch file record dari database
 * 2. Fetch file blob dari Convex storage
 * 3. Detect file type
 * 4. Route ke appropriate extractor
 * 5. Update database dengan extraction result
 *
 * Error handling:
 * - Retry untuk network errors (max 3 retries)
 * - Graceful degradation: save error tapi tetap biarkan file bisa di-download
 * - Comprehensive logging untuk debugging
 */
export const extractText = action({
  args: {
    fileId: v.id("files"),
  },
  handler: async (ctx, { fileId }) => {
    console.log(`[File Extraction] Starting extraction for fileId: ${fileId}`)

    try {
      // 1. Fetch file record dari database
      const file = await ctx.runQuery(api.files.getFile, { fileId })

      if (!file) {
        throw new Error(`File not found: ${fileId}`)
      }

      console.log(
        `[File Extraction] File details: name=${file.name}, type=${file.type}, size=${file.size} bytes`
      )

      // 2. Fetch blob dari Convex storage
      const blob = await ctx.storage.get(file.storageId)

      if (!blob) {
        throw new Error(`File blob not found in storage: ${file.storageId}`)
      }

      // 3. Detect file type category
      const fileTypeCategory = detectFileType(file.type)

      if (fileTypeCategory === "unsupported") {
        throw new Error(
          `Unsupported file type: ${file.type}. Supported types: TXT, PDF, DOCX, XLSX, Images.`
        )
      }

      console.log(
        `[File Extraction] Detected file type category: ${fileTypeCategory}`
      )

      // 4. Route ke appropriate extractor dengan retry logic
      let extractedText: string

      try {
        switch (fileTypeCategory) {
          case "txt":
            console.log("[File Extraction] Using TXT extractor")
            extractedText = await retryWithBackoff(() =>
              extractTextFromTxt(blob)
            )
            break

          case "pdf":
            console.log("[File Extraction] PDF extraction temporarily disabled (library incompatibility)")
            throw new Error(
              "PDF extraction not yet supported in Convex environment. " +
              "Please use alternative method or wait for implementation."
            )
            // TODO: Implement Convex-compatible PDF extraction
            // Option 1: Use alternative library (pdf2json, unpdf)
            // Option 2: Call Next.js API route for PDF processing
            break

          case "docx":
            console.log("[File Extraction] Using DOCX extractor")
            extractedText = await retryWithBackoff(() =>
              extractTextFromDocx(blob)
            )
            break

          case "xlsx":
            console.log("[File Extraction] Using XLSX extractor")
            extractedText = await retryWithBackoff(() =>
              extractDataFromXlsx(blob, {
                maxSheets: 10, // Max 10 sheets
                maxRows: 1000, // Max 1000 rows per sheet
              })
            )
            break

          case "image":
            console.log("[File Extraction] Using Image OCR extractor (OpenAI)")
            extractedText = await retryWithBackoff(
              () => extractTextFromImage(blob, file.name),
              3, // Max 3 retries for API calls
              2000 // 2 second initial delay
            )
            break

          default:
            throw new Error(`Unhandled file type category: ${fileTypeCategory}`)
        }

        // 5. Update database dengan extraction SUCCESS
        console.log(
          `[File Extraction] Extraction successful. Text length: ${extractedText.length} characters`
        )

        await ctx.runMutation(api.files.updateExtractionResult, {
          fileId,
          extractedText,
          extractionStatus: "success",
          extractionError: undefined,
          processedAt: Date.now(),
        })

        console.log(
          `[File Extraction] Database updated successfully for fileId: ${fileId}`
        )

        return {
          success: true,
          fileId,
          fileName: file.name,
          textLength: extractedText.length,
        }
      } catch (extractionError) {
        // Extraction gagal - save error ke database
        const errorMessage =
          extractionError instanceof Error
            ? extractionError.message
            : String(extractionError)

        console.error(
          `[File Extraction] Extraction failed for fileId: ${fileId}`,
          {
            fileName: file.name,
            fileType: file.type,
            errorMessage,
            error: extractionError,
          }
        )

        await ctx.runMutation(api.files.updateExtractionResult, {
          fileId,
          extractedText: undefined,
          extractionStatus: "failed",
          extractionError: errorMessage,
          processedAt: Date.now(),
        })

        console.log(
          `[File Extraction] Error saved to database for fileId: ${fileId}`
        )

        // Return error info (jangan throw, biarkan graceful degradation)
        return {
          success: false,
          fileId,
          fileName: file.name,
          error: errorMessage,
        }
      }
    } catch (error) {
      // Fatal error (file not found, storage error, etc.)
      const errorMessage = error instanceof Error ? error.message : String(error)

      console.error(
        `[File Extraction] Fatal error for fileId: ${fileId}`,
        error
      )

      // Try to update database dengan error (might fail jika fileId invalid)
      try {
        await ctx.runMutation(api.files.updateExtractionResult, {
          fileId,
          extractedText: undefined,
          extractionStatus: "failed",
          extractionError: `Fatal error: ${errorMessage}`,
          processedAt: Date.now(),
        })
      } catch (updateError) {
        console.error(
          `[File Extraction] Failed to update database with error:`,
          updateError
        )
      }

      // Throw error untuk Convex logging
      throw new Error(
        `File extraction failed for fileId ${fileId}: ${errorMessage}`
      )
    }
  },
})
