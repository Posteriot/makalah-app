/**
 * File Text Extraction API Route
 *
 * Alternative architecture: Processing di Next.js API route instead of Convex action
 * karena Convex environment tidak support libraries seperti pdf-parse dan mammoth.
 *
 * Flow:
 * 1. Client upload file → Convex storage
 * 2. Client call POST /api/extract-file
 * 3. API route fetch file dari storage → Extract → Update Convex DB
 * 4. Return result
 */

import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchQuery, fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"

// Import extractors (full Node.js environment - no restrictions)
import { extractTextFromTxt } from "@/lib/file-extraction/txt-extractor"
import { extractTextFromPdf } from "@/lib/file-extraction/pdf-extractor"
import { extractTextFromDocx } from "@/lib/file-extraction/docx-extractor"
import { extractDataFromXlsx } from "@/lib/file-extraction/xlsx-extractor"
import { extractTextFromImage } from "@/lib/file-extraction/image-ocr"
import { extractTextFromPptx } from "@/lib/file-extraction/pptx-extractor"

/**
 * Retry helper untuk network/API calls yang bisa transient error
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

      if (attempt < maxRetries) {
        const backoffDelay = delayMs * Math.pow(2, attempt - 1)
        await new Promise((resolve) => setTimeout(resolve, backoffDelay))
      }
    }
  }

  throw new Error(
    `Operation failed after ${maxRetries} retries: ${lastError?.message}`
  )
}

/**
 * Detect file type category dari MIME type
 */
function detectFileType(
  mimeType: string
): "txt" | "pdf" | "docx" | "xlsx" | "pptx" | "image" | "unsupported" {
  if (
    mimeType === "text/plain" ||
    mimeType === "text/txt" ||
    mimeType === "application/txt"
  ) {
    return "txt"
  }

  if (mimeType === "application/pdf") {
    return "pdf"
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/docx"
  ) {
    return "docx"
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/xlsx"
  ) {
    return "xlsx"
  }

  if (mimeType === "text/csv") {
    return "txt"
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mimeType === "application/pptx"
  ) {
    return "pptx"
  }

  if (
    mimeType === "image/png" ||
    mimeType === "image/jpeg" ||
    mimeType === "image/jpg" ||
    mimeType === "image/webp" ||
    mimeType === "image/gif"
  ) {
    return "image"
  }

  return "unsupported"
}

/**
 * POST /api/extract-file
 *
 * Extract text dari file yang sudah di-upload ke Convex storage
 *
 * Request body:
 * {
 *   fileId: string  // Convex file ID
 * }
 *
 * Response:
 * {
 *   success: boolean
 *   fileId: string
 *   fileName: string
 *   textLength?: number
 *   error?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { fileId } = body

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: "fileId is required" },
        { status: 400 }
      )
    }

    // Auth check + Convex token
    const isAuthed = await isAuthenticated()
    if (!isAuthed) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const convexToken = await getToken()
    if (!convexToken) {
      return NextResponse.json(
        { success: false, error: "Convex token missing" },
        { status: 500 }
      )
    }
    const convexOptions = { token: convexToken }

    // 1. Fetch file record dari Convex database
    const file = await fetchQuery(api.files.getFile, {
      fileId: fileId as Id<"files">,
    }, convexOptions)

    if (!file) {
      return NextResponse.json(
        { success: false, error: `File not found: ${fileId}` },
        { status: 404 }
      )
    }

    // 2. Get storage URL dari Convex
    const fileUrl = await fetchQuery(api.files.getFileUrl, {
      storageId: file.storageId,
    }, convexOptions)

    if (!fileUrl) {
      return NextResponse.json(
        { success: false, error: `File URL not found for storageId: ${file.storageId}` },
        { status: 404 }
      )
    }

    // 3. Fetch blob dari storage URL
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch file from storage: ${response.statusText}`)
    }

    const blob = await response.blob()

    // 4. Detect file type
    const fileTypeCategory = detectFileType(file.type)

    if (fileTypeCategory === "unsupported") {
      throw new Error(
        `Unsupported file type: ${file.type}. Supported: TXT, PDF, DOCX, XLSX, PPTX, Images.`
      )
    }

    // 5. Route to appropriate extractor dengan retry logic
    let extractedText: string

    try {
      switch (fileTypeCategory) {
        case "txt":
          extractedText = await retryWithBackoff(() => extractTextFromTxt(blob))
          break

        case "pdf":
          extractedText = await retryWithBackoff(() => extractTextFromPdf(blob))
          break

        case "docx":
          extractedText = await retryWithBackoff(() => extractTextFromDocx(blob))
          break

        case "xlsx":
          extractedText = await retryWithBackoff(() =>
            extractDataFromXlsx(blob, { maxSheets: 10, maxRows: 1000 })
          )
          break

        case "pptx":
          extractedText = await retryWithBackoff(() => extractTextFromPptx(blob))
          break

        case "image":
          extractedText = await retryWithBackoff(
            () => extractTextFromImage(blob),
            3,
            2000
          )
          break

        default:
          throw new Error(`Unhandled file type: ${fileTypeCategory}`)
      }

      // 6. Update Convex database dengan SUCCESS result
      await fetchMutation(api.files.updateExtractionResult, {
        fileId: fileId as Id<"files">,
        extractedText,
        extractionStatus: "success",
        extractionError: undefined,
        processedAt: Date.now(),
      }, convexOptions)

      return NextResponse.json({
        success: true,
        fileId,
        fileName: file.name,
        textLength: extractedText.length,
      })
    } catch (extractionError) {
      // Extraction failed - save error to database
      const errorMessage =
        extractionError instanceof Error
          ? extractionError.message
          : String(extractionError)

      await fetchMutation(api.files.updateExtractionResult, {
        fileId: fileId as Id<"files">,
        extractedText: undefined,
        extractionStatus: "failed",
        extractionError: errorMessage,
        processedAt: Date.now(),
      }, convexOptions)

      // Return error info (graceful degradation - file still accessible)
      return NextResponse.json({
        success: false,
        fileId,
        fileName: file.name,
        error: errorMessage,
      })
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    console.error("[File Extraction API] Error:", errorMessage)

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
