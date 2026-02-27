/**
 * Image OCR Extractor
 *
 * Extracts text from images using OpenAI GPT-4o Vision via OpenRouter
 * Handles OCR for .png, .jpg, .jpeg, .webp files
 * Uses OpenRouter for consistency with app's LLM architecture
 */

import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { generateText } from "ai"

// ============================================================================
// OCR MODEL CONFIGURATION
// ============================================================================
// Using OpenRouter for consistency with app architecture
// Model: openai/gpt-4o (OpenRouter format for GPT-4o Vision)
const OCR_MODEL = "openai/gpt-4o"

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
 * Validate OpenRouter API key from environment
 *
 * @throws Error if API key is missing
 */
function validateOpenRouterKey(): void {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error(
      "OPENROUTER_API_KEY is not configured in environment variables"
    )
  }
}

/**
 * Create OpenRouter client instance
 * Uses official @openrouter/ai-sdk-provider for proper integration
 *
 * @returns OpenRouter provider configured for Vision API (GPT-4o)
 */
function createOpenRouterClient() {
  validateOpenRouterKey()

  return createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
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
 * Extract text from an image using GPT-4o Vision via OpenRouter
 *
 * @param blob - Image blob from Convex storage
 * @returns Extracted text or image description
 * @throws ImageOCRError if OCR fails
 */
export async function extractTextFromImage(
  blob: Blob,
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

    // Create OpenRouter client (consistent with app architecture)
    const openRouter = createOpenRouterClient()

    // Call Vision API for OCR via OpenRouter
    const { text } = await generateText({
      model: openRouter(OCR_MODEL), // GPT-4o Vision via OpenRouter
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
        "OpenRouter API rate limit exceeded. Please try again later.",
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
      `OpenRouter Vision API error: ${errorMessage}`,
      "API_ERROR"
    )
  }
}
