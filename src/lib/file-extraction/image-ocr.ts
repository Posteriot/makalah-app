/**
 * Image OCR Extractor
 *
 * Extracts text from images using OpenAI Vision API (GPT-4o)
 * Handles OCR for .png, .jpg, .jpeg, .webp files
 * Completely separate from Gemini chat AI
 */

import { createOpenAI } from "@ai-sdk/openai"
import { generateText } from "ai"

/**
 * Custom error types untuk Image OCR
 */
export class ImageOCRError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "API_ERROR"
      | "RATE_LIMIT"
      | "INVALID_IMAGE"
      | "NO_TEXT_FOUND"
      | "ENCODING_ERROR"
      | "UNKNOWN"
  ) {
    super(message)
    this.name = "ImageOCRError"
  }
}

/**
 * Validate OpenAI API key from environment
 *
 * @throws Error if API key is missing
 */
function validateOpenAIKey(): void {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not configured in environment variables"
    )
  }
}

/**
 * Create OpenAI client instance
 * Uses separate API key from chat AI (Gemini)
 *
 * @returns OpenAI client configured for Vision API
 */
function createOpenAIClient() {
  validateOpenAIKey()

  return createOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  })
}

/**
 * Convert Blob to base64 string
 *
 * @param blob - Image blob to convert
 * @returns Base64-encoded string
 * @throws ImageOCRError if encoding fails
 */
async function blobToBase64(blob: Blob): Promise<string> {
  try {
    const arrayBuffer = await blob.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    return buffer.toString("base64")
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    throw new ImageOCRError(
      `Failed to encode image to base64: ${errorMessage}`,
      "ENCODING_ERROR"
    )
  }
}

/**
 * Extract text from an image using OpenAI Vision API (GPT-4o)
 *
 * @param blob - Image blob from Convex storage
 * @param filename - Original filename (for context in prompt)
 * @returns Extracted text or image description
 * @throws ImageOCRError if OCR fails
 */
export async function extractTextFromImage(
  blob: Blob,
  filename: string = "image"
): Promise<string> {
  try {
    // Validate buffer size
    const arrayBuffer = await blob.arrayBuffer()
    if (arrayBuffer.byteLength === 0) {
      throw new ImageOCRError(
        "Image file is empty (0 bytes)",
        "INVALID_IMAGE"
      )
    }

    // Convert to base64
    const base64Image = await blobToBase64(blob)

    // Get MIME type (default to jpeg if not specified)
    const mimeType = blob.type || "image/jpeg"

    // Validate MIME type
    const validMimeTypes = [
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/gif",
    ]
    if (!validMimeTypes.includes(mimeType)) {
      throw new ImageOCRError(
        `Unsupported image type: ${mimeType}`,
        "INVALID_IMAGE"
      )
    }

    // Create OpenAI client
    const openai = createOpenAIClient()

    // Call Vision API for OCR
    console.log(
      `[Image OCR] Processing image: ${filename} (${mimeType}, ${Math.round(arrayBuffer.byteLength / 1024)}KB)`
    )

    const { text } = await generateText({
      model: openai("gpt-4o"), // GPT-4o Vision model
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all text from this image. If there's no readable text, describe what you see in the image in Indonesian. Be concise and focus on the main content.",
            },
            {
              type: "image",
              image: `data:${mimeType};base64,${base64Image}`,
            },
          ],
        },
      ],
      temperature: 0.3, // Low temperature for more consistent OCR
    })

    // Clean up extracted text
    const extractedText = text.trim()

    // Check if response indicates no text found
    if (
      !extractedText ||
      extractedText.toLowerCase().includes("no text") ||
      extractedText.toLowerCase().includes("tidak ada teks")
    ) {
      throw new ImageOCRError(
        "Image contains no readable text",
        "NO_TEXT_FOUND"
      )
    }

    // Log success
    console.log(
      `[Image OCR] Successfully extracted ${extractedText.length} characters from ${filename}`
    )

    return extractedText
  } catch (error) {
    // Handle specific error types
    if (error instanceof ImageOCRError) {
      throw error // Re-throw custom errors
    }

    // Parse error messages to detect specific issues
    const errorMessage = error instanceof Error ? error.message : String(error)

    // Detect rate limit errors
    if (
      errorMessage.includes("rate_limit") ||
      errorMessage.includes("quota") ||
      errorMessage.includes("429")
    ) {
      throw new ImageOCRError(
        "OpenAI API rate limit exceeded. Please try again later.",
        "RATE_LIMIT"
      )
    }

    // Detect invalid image errors
    if (
      errorMessage.includes("invalid_image") ||
      errorMessage.includes("unsupported") ||
      errorMessage.includes("cannot process")
    ) {
      throw new ImageOCRError(
        `Invalid or unsupported image format: ${errorMessage}`,
        "INVALID_IMAGE"
      )
    }

    // Generic API error
    throw new ImageOCRError(
      `OpenAI Vision API error: ${errorMessage}`,
      "API_ERROR"
    )
  }
}

/**
 * Validate if a blob is a valid image file
 *
 * @param blob - File blob to validate
 * @returns true if blob appears to be valid image, false otherwise
 */
export function isValidImageFile(blob: Blob): boolean {
  // Check MIME type
  const validMimeTypes = [
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/gif",
  ]

  return validMimeTypes.includes(blob.type)
}

/**
 * Get user-friendly error message from ImageOCRError
 *
 * @param error - ImageOCRError instance
 * @returns User-friendly error message in Indonesian
 */
export function getImageOcrErrorMessage(error: ImageOCRError): string {
  switch (error.code) {
    case "API_ERROR":
      return "Gagal memproses gambar dengan AI. Silakan coba lagi."
    case "RATE_LIMIT":
      return "Batas penggunaan API tercapai. Silakan coba beberapa saat lagi."
    case "INVALID_IMAGE":
      return "Format gambar tidak valid atau tidak didukung."
    case "NO_TEXT_FOUND":
      return "Tidak ada teks yang dapat diekstrak dari gambar ini."
    case "ENCODING_ERROR":
      return "Gagal memproses gambar. File mungkin rusak."
    default:
      return "Terjadi error saat membaca gambar."
  }
}

/**
 * Get fallback message when OCR fails but we want graceful degradation
 *
 * @param filename - Original filename
 * @param error - The error that occurred
 * @returns Fallback message for database storage
 */
export function getOcrFallbackMessage(
  filename: string,
  error: ImageOCRError
): string {
  return `[OCR Failed for ${filename}] ${getImageOcrErrorMessage(error)}`
}
