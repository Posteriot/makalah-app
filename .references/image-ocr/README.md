# Image OCR - Technical Reference

Dokumentasi lengkap tentang sistem Image OCR di Makalah App - fitur untuk mengekstrak teks dari gambar menggunakan GPT-4o Vision via OpenRouter.

## Daftar Isi

1. [Overview](#overview)
2. [Rationale](#rationale)
3. [Architecture](#architecture)
4. [Provider Configuration](#provider-configuration)
5. [Supported Formats](#supported-formats)
6. [Core Functions](#core-functions)
7. [Error Handling](#error-handling)
8. [API Integration](#api-integration)
9. [Database Schema](#database-schema)
10. [Configuration](#configuration)
11. [Troubleshooting](#troubleshooting)

---

## Overview

Image OCR adalah fitur yang memungkinkan user untuk upload gambar dan mengekstrak teks dari gambar tersebut menggunakan GPT-4o Vision model via OpenRouter. Hasil ekstraksi disimpan ke database dan dapat digunakan sebagai konteks dalam chat.

### Key Features

- **LLM-Powered OCR**: Menggunakan GPT-4o Vision untuk akurasi tinggi
- **OpenRouter Integration**: Konsisten dengan arsitektur LLM aplikasi
- **Multi-Format Support**: PNG, JPEG, WebP, GIF
- **Graceful Fallback**: Jika tidak ada teks, AI mendeskripsikan gambar dalam Bahasa Indonesia
- **Error Categorization**: Error codes yang spesifik untuk debugging
- **Retry Mechanism**: Exponential backoff untuk transient errors

### Supported Image Types

| Format | MIME Type | Extension |
|--------|-----------|-----------|
| PNG | `image/png` | .png |
| JPEG | `image/jpeg`, `image/jpg` | .jpg, .jpeg |
| WebP | `image/webp` | .webp |
| GIF | `image/gif` | .gif |

---

## Rationale

### Mengapa GPT-4o Vision via OpenRouter?

1. **Superior OCR Quality**
   - GPT-4o Vision memberikan hasil OCR yang lebih akurat dibanding traditional OCR (Tesseract, Google Vision)
   - Dapat memahami konteks dan format dokumen
   - Mendukung berbagai bahasa termasuk Indonesia

2. **Architectural Consistency**
   - Aplikasi menggunakan OpenRouter sebagai unified LLM gateway
   - Memudahkan monitoring, billing, dan rate limiting dari satu provider
   - Konsisten dengan fallback pattern di komponen lain

3. **Official SDK Support**
   - Menggunakan `@openrouter/ai-sdk-provider` resmi
   - Type-safe integration dengan Vercel AI SDK
   - Maintained by OpenRouter team

### Mengapa Tidak Tesseract/Traditional OCR?

1. **Accuracy**: LLM Vision models jauh lebih akurat untuk dokumen kompleks
2. **Context Understanding**: Dapat memahami struktur tabel, layout, dll
3. **Language Support**: Native support untuk Bahasa Indonesia
4. **Fallback**: Jika tidak ada teks, bisa mendeskripsikan gambar

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IMAGE OCR ARCHITECTURE                               │
└─────────────────────────────────────────────────────────────────────────────┘

User uploads image
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   Convex Storage                                                             │
│                                                                             │
│   1. File uploaded to storage                                               │
│   2. File record created in database                                        │
│   3. extractionStatus = "pending"                                           │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   POST /api/extract-file                                                     │
│                                                                             │
│   1. Fetch file record from Convex                                          │
│   2. Get storage URL                                                        │
│   3. Download blob                                                           │
│   4. Detect file type → "image"                                             │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   extractTextFromImage() (src/lib/file-extraction/image-ocr.ts)             │
│                                                                             │
│   1. Validate blob size (not empty)                                         │
│   2. Validate MIME type                                                     │
│   3. Convert blob to base64                                                 │
│   4. Create OpenRouter client                                               │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   OpenRouter API (GPT-4o Vision)                                            │
│                                                                             │
│   Provider: @openrouter/ai-sdk-provider                                     │
│   Model: openai/gpt-4o                                                      │
│   Temperature: 0.3 (low for consistent OCR)                                 │
│                                                                             │
│   Request:                                                                  │
│   {                                                                         │
│     model: openRouter("openai/gpt-4o"),                                     │
│     messages: [{                                                            │
│       role: "user",                                                         │
│       content: [                                                            │
│         { type: "text", text: "Extract all text..." },                      │
│         { type: "image", image: "data:image/png;base64,..." }              │
│       ]                                                                     │
│     }]                                                                      │
│   }                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   Response Processing                                                        │
│                                                                             │
│   Success:                                                                   │
│   - Return extracted text                                                   │
│   - Update files table: extractionStatus = "success"                        │
│                                                                             │
│   No Text Found:                                                            │
│   - Throw ImageOCRError("NO_TEXT_FOUND")                                    │
│   - Update files table: extractionStatus = "failed"                         │
│                                                                             │
│   Error:                                                                    │
│   - Categorize error (API_ERROR, RATE_LIMIT, INVALID_IMAGE, etc)           │
│   - Update files table: extractionStatus = "failed"                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Provider Architecture Comparison

| Component | Provider | Model | Purpose |
|-----------|----------|-------|---------|
| Chat + Tools | Gateway (primary) → OpenRouter (fallback) | gemini-2.5-flash-lite | Main conversation |
| Web Search | Gateway only | gemini-2.5-flash-lite + google_search | Real-time info |
| Refrasa | Gateway → OpenRouter | gemini-2.5-flash-lite | Style improvement |
| **Image OCR** | **OpenRouter (dedicated)** | **openai/gpt-4o** | **Text extraction** |

Image OCR menggunakan OpenRouter langsung (bukan Gateway) karena:
1. GPT-4o Vision lebih unggul untuk OCR dibanding Gemini
2. Dedicated use case, tidak perlu fallback ke model lain
3. Konsisten dengan arsitektur OpenRouter di aplikasi

---

## Provider Configuration

### Package Used

```typescript
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
```

### Client Creation

```typescript
// src/lib/file-extraction/image-ocr.ts Lines 57-63

function createOpenRouterClient() {
  validateOpenRouterKey()

  return createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
  })
}
```

### API Call Pattern

```typescript
// src/lib/file-extraction/image-ocr.ts Lines 137-155

const { text } = await generateText({
  model: openRouter(OCR_MODEL), // "openai/gpt-4o"
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
  temperature: 0.3, // Low temperature for consistent OCR
})
```

---

## Supported Formats

### MIME Type Validation

```typescript
// src/lib/file-extraction/image-ocr.ts Lines 115-127

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
```

### File Size Validation

```typescript
// src/lib/file-extraction/image-ocr.ts Lines 99-106

const arrayBuffer = await blob.arrayBuffer()
if (arrayBuffer.byteLength === 0) {
  throw new ImageOCRError(
    "Image file is empty (0 bytes)",
    "INVALID_IMAGE"
  )
}
```

---

## Core Functions

### extractTextFromImage

Main function untuk ekstraksi teks dari gambar.

**Signature:**
```typescript
export async function extractTextFromImage(
  blob: Blob,
  filename: string = "image"
): Promise<string>
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `blob` | `Blob` | Image blob from Convex storage |
| `filename` | `string` | Original filename (for logging) |

**Returns:** Extracted text atau image description (Indonesian)

**Throws:** `ImageOCRError` with specific error codes

### isValidImageFile

Helper untuk validasi MIME type.

**Signature:**
```typescript
export function isValidImageFile(blob: Blob): boolean
```

### getImageOcrErrorMessage

Konversi error code ke pesan user-friendly dalam Bahasa Indonesia.

**Signature:**
```typescript
export function getImageOcrErrorMessage(error: ImageOCRError): string
```

### getOcrFallbackMessage

Generate fallback message untuk database storage saat OCR gagal.

**Signature:**
```typescript
export function getOcrFallbackMessage(
  filename: string,
  error: ImageOCRError
): string
```

---

## Error Handling

### ImageOCRError Class

```typescript
// src/lib/file-extraction/image-ocr.ts Lines 22-36

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
```

### Error Codes & Messages

| Code | Trigger Condition | Indonesian Message |
|------|-------------------|-------------------|
| `API_ERROR` | Generic OpenRouter API failure | "Gagal memproses gambar dengan AI. Silakan coba lagi." |
| `RATE_LIMIT` | 429 / quota / rate_limit | "Batas penggunaan API tercapai. Silakan coba beberapa saat lagi." |
| `INVALID_IMAGE` | Unsupported MIME / empty file | "Format gambar tidak valid atau tidak didukung." |
| `NO_TEXT_FOUND` | Response contains "no text" | "Tidak ada teks yang dapat diekstrak dari gambar ini." |
| `ENCODING_ERROR` | Base64 conversion failed | "Gagal memproses gambar. File mungkin rusak." |
| `UNKNOWN` | Unhandled error | "Terjadi error saat membaca gambar." |

### Error Detection Logic

```typescript
// src/lib/file-extraction/image-ocr.ts Lines 178-216

// Rate limit detection
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

// Invalid image detection
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
```

---

## API Integration

### POST /api/extract-file

Endpoint yang menggunakan Image OCR.

**Location:** `src/app/api/extract-file/route.ts`

**Request:**
```json
{
  "fileId": "j57a1b2c3d4e5f6g7h8i9j0k"
}
```

**Response (Success):**
```json
{
  "success": true,
  "fileId": "j57a1b2c3d4e5f6g7h8i9j0k",
  "fileName": "document.png",
  "textLength": 1234
}
```

**Response (Error):**
```json
{
  "success": false,
  "fileId": "j57a1b2c3d4e5f6g7h8i9j0k",
  "fileName": "document.png",
  "error": "Format gambar tidak valid atau tidak didukung."
}
```

### Retry Mechanism

```typescript
// src/app/api/extract-file/route.ts Lines 214-221

case "image":
  console.log("[File Extraction API] Using Image OCR extractor")
  extractedText = await retryWithBackoff(
    () => extractTextFromImage(blob, file.name),
    3,      // maxRetries
    2000    // delayMs (exponential backoff)
  )
  break
```

---

## Database Schema

### Files Table

```typescript
// convex/schema.ts Lines 70-88

files: defineTable({
  userId: v.id("users"),
  conversationId: v.optional(v.id("conversations")),
  messageId: v.optional(v.id("messages")),
  storageId: v.id("_storage"),
  name: v.string(),
  type: v.string(),
  size: v.number(),
  status: v.string(), // "uploading" | "processing" | "ready" | "error"
  extractedText: v.optional(v.string()),
  extractionStatus: v.optional(v.string()), // "pending" | "success" | "failed"
  extractionError: v.optional(v.string()),
  processedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_user", ["userId", "createdAt"])
  .index("by_conversation", ["conversationId", "createdAt"])
  .index("by_message", ["messageId"])
  .index("by_extraction_status", ["extractionStatus"]),
```

### Extraction Status Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   pending    │ ──▶ │   success    │     │    failed    │
│              │     │              │  or │              │
│ (on upload)  │     │ (extracted)  │     │   (error)    │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |

### Constants

| Constant | Value | Location | Description |
|----------|-------|----------|-------------|
| `OCR_MODEL` | `"openai/gpt-4o"` | image-ocr.ts:17 | Vision model via OpenRouter |
| Temperature | `0.3` | image-ocr.ts:154 | Low for consistent OCR |
| Max Retries | `3` | route.ts:218 | Retry attempts |
| Retry Delay | `2000ms` | route.ts:219 | Base delay (exponential) |

---

## Troubleshooting

### OCR tidak menghasilkan teks

1. **Cek image format**: Pastikan format didukung (PNG, JPEG, WebP, GIF)
2. **Cek file size**: File tidak boleh kosong (0 bytes)
3. **Cek image quality**: Gambar harus jelas dan readable

### Rate limit error

1. **Tunggu beberapa saat**: OpenRouter rate limit biasanya reset dalam 1 menit
2. **Cek quota**: Periksa saldo OpenRouter account
3. **Retry mechanism**: API endpoint sudah ada retry dengan exponential backoff

### API key error

1. **Cek environment variable**: `OPENROUTER_API_KEY` harus diset
2. **Cek key validity**: Pastikan API key masih valid di OpenRouter dashboard

### Extraction status stuck at "pending"

1. **Cek API route logs**: `[File Extraction API]` prefix
2. **Cek OpenRouter logs**: OpenRouter dashboard → Logs
3. **Manual retry**: Panggil `/api/extract-file` lagi dengan fileId yang sama

### Console Logging

Key log points untuk debugging:

```javascript
// Start extraction
console.log(`[File Extraction API] Starting extraction for fileId: ${fileId}`)

// File details
console.log(`[File Extraction API] File details: name=${file.name}, type=${file.type}`)

// OCR processing
console.log(`[Image OCR] Processing image via OpenRouter: ${filename} (${mimeType}, ${KB}KB)`)

// Success
console.log(`[Image OCR] Successfully extracted ${length} characters from ${filename}`)

// Database update
console.log(`[File Extraction API] Database updated successfully for fileId: ${fileId}`)
```

---

## Related Documentation

- **CLAUDE.md**: Section "File Text Extraction"
- **Files Index**: `.references/image-ocr/files-index.md`
- **LLM Provider**: `.references/llm-models-provider/`
- **OpenRouter SDK**: `@openrouter/ai-sdk-provider`

---

*Last updated: 2026-01-12*
