# Image OCR - Files Index

Quick reference untuk lokasi semua files terkait Image OCR System.

## Quick Jump

| Category | Count | Files |
|----------|-------|-------|
| [Core OCR Module](#core-ocr-module) | 1 | Main extractor |
| [API Integration](#api-integration) | 1 | Extract file route |
| [Database Schema](#database-schema) | 1 | Files table |
| [Related Extractors](#related-extractors) | 4 | Other file extractors |
| **Total** | **7** | |

---

## Core OCR Module

```
src/lib/file-extraction/
└── image-ocr.ts                      # Image OCR using GPT-4o via OpenRouter
```

### Image OCR Module (src/lib/file-extraction/image-ocr.ts)

| Line | What's There |
|------|--------------|
| 1-7 | File header comment |
| 9-10 | Imports: `createOpenRouter`, `generateText` |
| 12-17 | OCR_MODEL constant (`openai/gpt-4o`) |
| 19-36 | `ImageOCRError` class definition |
| 38-49 | `validateOpenRouterKey()` function |
| 51-63 | `createOpenRouterClient()` function |
| 65-84 | `blobToBase64()` helper function |
| 86-217 | `extractTextFromImage()` main function |
| 99-106 | Empty file validation |
| 108-127 | MIME type validation |
| 129-155 | OpenRouter API call with Vision |
| 157-170 | No-text detection |
| 178-216 | Error handling (rate limit, invalid image, API error) |
| 219-236 | `isValidImageFile()` helper function |
| 238-259 | `getImageOcrErrorMessage()` error message helper |
| 261-273 | `getOcrFallbackMessage()` fallback helper |

### Exported Functions

| Function | Line | Description |
|----------|------|-------------|
| `extractTextFromImage` | 94-217 | Main OCR extraction function |
| `isValidImageFile` | 225-236 | Validate MIME type |
| `getImageOcrErrorMessage` | 244-259 | Get Indonesian error message |
| `getOcrFallbackMessage` | 268-273 | Get fallback message for DB |
| `ImageOCRError` | 22-36 | Custom error class |

### Error Codes

| Code | Description | Indonesian Message |
|------|-------------|-------------------|
| `API_ERROR` | Generic OpenRouter API error | "Gagal memproses gambar dengan AI. Silakan coba lagi." |
| `RATE_LIMIT` | Rate limit/quota exceeded | "Batas penggunaan API tercapai. Silakan coba beberapa saat lagi." |
| `INVALID_IMAGE` | Unsupported format | "Format gambar tidak valid atau tidak didukung." |
| `NO_TEXT_FOUND` | No readable text in image | "Tidak ada teks yang dapat diekstrak dari gambar ini." |
| `ENCODING_ERROR` | Base64 encoding failed | "Gagal memproses gambar. File mungkin rusak." |
| `UNKNOWN` | Unknown error | "Terjadi error saat membaca gambar." |

---

## API Integration

```
src/app/api/extract-file/
└── route.ts                          # File extraction endpoint
```

### Extract File Route (src/app/api/extract-file/route.ts)

| Line | What's There |
|------|--------------|
| 24 | Import `extractTextFromImage` |
| 61-103 | `detectFileType()` - routes to correct extractor |
| 92-100 | Image MIME type detection |
| 214-221 | Image OCR case in switch statement |
| 216-220 | `extractTextFromImage()` call with retry |

### Supported Image Types (route.ts:92-100)

```typescript
if (
  mimeType === "image/png" ||
  mimeType === "image/jpeg" ||
  mimeType === "image/jpg" ||
  mimeType === "image/webp" ||
  mimeType === "image/gif"
) {
  return "image"
}
```

---

## Database Schema

```
convex/
└── schema.ts                         # Files table with extraction fields
```

### Files Table (convex/schema.ts:70-88)

| Field | Type | Description |
|-------|------|-------------|
| `extractedText` | `v.optional(v.string())` | OCR result text |
| `extractionStatus` | `v.optional(v.string())` | "pending" \| "success" \| "failed" |
| `extractionError` | `v.optional(v.string())` | Error message if failed |
| `processedAt` | `v.optional(v.number())` | Extraction timestamp |

### Index

| Index | Fields | Usage |
|-------|--------|-------|
| `by_extraction_status` | `["extractionStatus"]` | Filter by extraction status |

---

## Related Extractors

```
src/lib/file-extraction/
├── txt-extractor.ts                  # Plain text extraction
├── pdf-extractor.ts                  # PDF extraction (pdf-parse)
├── docx-extractor.ts                 # DOCX extraction (mammoth)
├── xlsx-extractor.ts                 # XLSX extraction (xlsx)
└── image-ocr.ts                      # Image OCR (this module)
```

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           IMAGE OCR FLOW                                     │
│                                                                             │
│  User uploads image → Convex storage → POST /api/extract-file               │
│       │                                       │                             │
│       └───────────────────────────────────────┘                             │
│                                    │                                         │
│                                    ▼                                         │
│              detectFileType() → "image" → extractTextFromImage()             │
│                                    │                                         │
│                                    ▼                                         │
│              createOpenRouterClient() → GPT-4o Vision via OpenRouter        │
│                                    │                                         │
│                                    ▼                                         │
│              generateText() with base64 image → Text extraction             │
│                                    │                                         │
│                                    ▼                                         │
│              Update Convex files table (extractedText, extractionStatus)    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Search Patterns

```bash
# Find all Image OCR related files
grep -r "image-ocr\|ImageOCR\|extractTextFromImage" src/ --include="*.ts" --include="*.tsx"

# Find OpenRouter usage for OCR
grep -r "createOpenRouter\|openrouter/ai-sdk-provider" src/lib/file-extraction/

# Find supported image types
grep -r "image/png\|image/jpeg\|image/webp" src/

# Find extraction status handling
grep -r "extractionStatus\|extractedText" convex/ src/
```

---

## Quick Reference: Key Lines

| File | Line(s) | What's There |
|------|---------|--------------|
| `src/lib/file-extraction/image-ocr.ts` | 9-10 | OpenRouter provider import |
| `src/lib/file-extraction/image-ocr.ts` | 17 | OCR_MODEL constant |
| `src/lib/file-extraction/image-ocr.ts` | 57-63 | `createOpenRouterClient()` |
| `src/lib/file-extraction/image-ocr.ts` | 94-217 | `extractTextFromImage()` |
| `src/lib/file-extraction/image-ocr.ts` | 137-155 | Vision API call |
| `src/app/api/extract-file/route.ts` | 24 | Import OCR module |
| `src/app/api/extract-file/route.ts` | 214-221 | Image case handling |
| `convex/schema.ts` | 79-81 | Extraction fields in files table |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for GPT-4o Vision |

---

*Last updated: 2026-01-12*
