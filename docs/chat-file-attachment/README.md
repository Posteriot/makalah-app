# Chat File Attachment

Fitur file attachment di chat interface Makalah App. User bisa melampirkan dokumen dan gambar ke pesan chat, lalu AI model membaca konten file tersebut.

## Arsitektur

### Dual-Path Strategy

File attachment menggunakan dua jalur berbeda tergantung tipe file:

```
┌──────────────────────────────────────────────────────────┐
│                    FileUploadButton                       │
│          (client-side upload ke Convex storage)           │
└──────────┬───────────────────────────────┬───────────────┘
           │                               │
     ┌─────▼──────┐                 ┌──────▼──────┐
     │   IMAGE    │                 │  DOCUMENT   │
     │ (multimodal)│                │ (extraction) │
     └─────┬──────┘                 └──────┬──────┘
           │                               │
   FileReader →                   POST /api/extract-file
   data URL base64                         │
           │                      ┌────────▼────────┐
           │                      │  Extractor       │
           │                      │  (pdf-parse,     │
           │                      │   mammoth, dll)  │
           │                      └────────┬────────┘
           │                               │
           │                      Convex DB update
           │                      (extractedText)
           │                               │
     ┌─────▼──────────────────────────────▼───────────┐
     │              POST /api/chat                      │
     │                                                  │
     │  Image  → AI SDK FileUIPart (native vision)     │
     │  Document → System message injection            │
     │             (extracted text as context)          │
     └─────────────────────────────────────────────────┘
```

**Gambar (image/):** Dikirim langsung ke model sebagai `FileUIPart` via AI SDK v5 native multimodal. Model "melihat" gambar asli — tidak ada OCR atau text extraction. Ini jalur paling efektif untuk image understanding.

**Dokumen (non-image):** Text di-extract di server-side via Next.js API route (`/api/extract-file`), disimpan di Convex DB (`files.extractedText`), lalu di-inject sebagai system message ke model saat user mengirim pesan.

### Kenapa Next.js API Route, Bukan Convex Action?

Libraries extraction (pdf-parse, mammoth, xlsx-populate, officeparser) membutuhkan full Node.js environment. Convex runtime tidak support native Node.js modules ini. Maka extraction diproses di Next.js API route yang berjalan di Node.js.

## Conversation-Scoped Attachment Context (Durable)

Mulai implementasi 2026-03-01, attachment tidak lagi hanya bergantung ke payload per-message dari client.

Tambahan arsitektur:

1. **Server state per conversation**
- Table baru `conversationAttachmentContexts` menyimpan `activeFileIds` per `conversationId`.

2. **Resolver `effectiveFileIds` di `/api/chat`**
- Prioritas:
  - `clearAttachmentContext: true` → kosongkan context.
  - `fileIds` explicit non-empty → merge dengan context aktif (append + dedupe).
  - `replaceAttachmentContext: true` → replace context aktif penuh.
  - selain itu (`inheritAttachmentContext !== false`) → inherit dari context aktif server.

3. **Unified send pipeline di `ChatWindow`**
- Semua jalur kirim user (submit normal, template, approve/revise, edit-resend, starter prompt) lewat helper tunggal.
- Tidak ada lagi jalur text-only yang bypass attachment contract.

4. **Composer sync dari server context**
- Tray `Konteks` di composer dihydrate dari context aktif server.
- User bisa hapus satu file (`x`) atau hapus semua (`Hapus semua`).
- Attachment tetap aktif lintas turn dan lintas refresh sampai user clear context.

5. **Attachment mode per-message**
- `messages.attachmentMode` disimpan sebagai `explicit` atau `inherit`.
- Bubble chip hanya tampil untuk message user dengan mode `explicit`.
- Follow-up inherit tetap membawa konteks file di server, tanpa spam chip di bubble.

5. **Hard guard send rule**
- UI: tombol send aktif hanya jika ada teks (`input.trim().length > 0`).
- Backend: jika ada attachment tapi teks kosong, route return `400`.

## Tipe File yang Didukung

| Format | MIME Type | Library | Catatan |
|--------|-----------|---------|---------|
| PDF | `application/pdf` | `pdf-parse` v2 (wraps `pdfjs-dist`) | Text-based PDF. Scanned/image PDF → empty result |
| DOCX | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `mammoth` v1 | Hanya `.docx` (OOXML), bukan legacy `.doc` |
| XLSX | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | `xlsx-populate` | Hanya `.xlsx` (OOXML), bukan legacy `.xls`. Output: markdown table |
| PPTX | `application/vnd.openxmlformats-officedocument.presentationml.presentation` | `officeparser` | Slide text + speaker notes |
| TXT | `text/plain` | Native `Blob.text()` | UTF-8 |
| CSV | `text/csv` | Native `Blob.text()` | Diperlakukan sebagai plain text |
| PNG | `image/png` | — | Native multimodal (AI SDK FileUIPart) |
| JPEG | `image/jpeg` | — | Native multimodal |
| GIF | `image/gif` | — | Native multimodal |
| WebP | `image/webp` | — | Native multimodal |

**Batas ukuran:** 10 MB per file.

**Format yang TIDAK didukung:** Legacy `.doc` (binary Word), legacy `.xls` (BIFF Excel), `.ppt`, `.odt`, `.ods`.

## Database Schema

### Tabel `files`

```typescript
files: defineTable({
  userId: v.id("users"),
  conversationId: v.optional(v.id("conversations")),
  messageId: v.optional(v.id("messages")),
  storageId: v.string(),          // Convex storage ID
  name: v.string(),               // Original filename
  type: v.string(),               // MIME type
  size: v.number(),               // Byte size
  status: v.string(),             // "uploading" | "processing" | "ready" | "error"
  extractedText: v.optional(v.string()),     // Hasil extraction
  extractionStatus: v.optional(v.string()),  // "pending" | "success" | "failed"
  extractionError: v.optional(v.string()),   // Error message jika gagal
  processedAt: v.optional(v.number()),       // Timestamp extraction selesai
  createdAt: v.number(),
})
  .index("by_user", ["userId", "createdAt"])
  .index("by_conversation", ["conversationId", "createdAt"])
  .index("by_message", ["messageId"])
  .index("by_extraction_status", ["extractionStatus"])
```

### Tabel `messages`

Field `fileIds` (opsional) menyimpan array `Id<"files">[]` yang di-attach ke pesan.

## Alur Lengkap (End-to-End)

### 1. Upload (Client)

**File:** `src/components/chat/FileUploadButton.tsx`

```
User pilih file → Validasi (tipe + size) → generateUploadUrl() → POST ke Convex storage
→ createFile() mutation → File record tersimpan di DB
```

Setelah upload:
- **Image:** `FileReader.readAsDataURL()` → simpan data URL di state `imageDataUrls`
- **Document:** Fire-and-forget `POST /api/extract-file` → extraction berjalan di background

### 2. Text Extraction (Server)

**File:** `src/app/api/extract-file/route.ts`

```
POST /api/extract-file { fileId }
→ Auth check (BetterAuth)
→ Fetch file record dari Convex
→ Fetch blob dari Convex storage URL
→ Detect file type dari MIME
→ Route ke extractor yang sesuai (dengan retry + exponential backoff)
→ Update Convex DB: extractedText, extractionStatus, processedAt
```

Setiap extractor di-wrap dengan `retryWithBackoff()` (max 3 retry, exponential delay). Image OCR retry dengan delay lebih panjang (2000ms base).

### 3. Kirim Pesan (Client → Server)

**File:** `src/components/chat/ChatWindow.tsx`

Saat user submit pesan:

```typescript
// Image files → AI SDK FileUIPart (native multimodal)
const imageFileParts = attachedFiles
  .filter(f => f.type.startsWith("image/"))
  .map(f => ({
    type: "file" as const,
    mediaType: f.type,
    url: imageDataUrls.get(f.fileId) ?? "",
  }))

// Document files → fileIds dikirim via transport body
const docFiles = attachedFiles.filter(f => !f.type.startsWith("image/"))
const fileIds = docFiles.map(f => f.fileId)
```

Image parts di-embed langsung ke message parts. Document `fileIds` dikirim sebagai field terpisah di request body.

### 4. Context Injection (Server)

**File:** `src/app/api/chat/route.ts` (line ~300-377)

Server-side processing saat menerima chat request:

1. **Polling:** Jika ada file dengan `extractionStatus === "pending"`, server poll Convex setiap 500ms (max 16x = 8 detik) sampai extraction selesai.

2. **Format context:** Per-file, berdasarkan `extractionStatus`:
   - `"success"` → Inject `extractedText` sebagai context
   - `"pending"` (timeout) → Pesan "file sedang diproses"
   - `"failed"` → Pesan error

3. **Paper mode limits:** Di paper mode, per-file max 6.000 karakter, total max 20.000 karakter.

4. **Injection point:** File context di-inject sebagai system message:
   ```
   { role: "system", content: "File Context:\n\n[File: dokumen.pdf]\n<extracted text>" }
   ```

### 5. Tampilan UI

**File:** `src/components/chat/MessageBubble.tsx`

Pesan dengan attachment menampilkan file badge:
- Icon `Page` (dari iconoir-react) + nama file yang di-truncate (max 180px)
- Badge styling: `rounded-badge`, border sky/info, background chat-accent

File names diambil dari:
1. `fileNames` annotation (set saat kirim pesan)
2. `fileNameMap` prop (lookup dari Convex query, untuk history messages)
3. Fallback: `"file"`

**File:** `src/components/chat/ChatInput.tsx`

Tray `Konteks` berada di dalam composer:
- Menampilkan file aktif (nama terpotong, ekstensi tetap terlihat, ukuran file).
- Tombol `x` per file untuk partial remove.
- Tombol `Hapus semua` untuk reset context conversation.

## File Map

### Core Components

| File | Fungsi |
|------|--------|
| `src/components/chat/FileUploadButton.tsx` | Upload button + validasi + Convex upload |
| `src/components/chat/ChatInput.tsx` | Input area dengan file preview |
| `src/components/chat/ChatWindow.tsx` | Orchestrator: state management, transport, history sync |
| `src/components/chat/MessageBubble.tsx` | Render file badges di pesan |

### Server Routes

| File | Fungsi |
|------|--------|
| `src/app/api/extract-file/route.ts` | Text extraction API (auth → fetch → extract → save) |
| `src/app/api/chat/route.ts` | Chat streaming + file context injection + extraction polling |

### Extractors

| File | Format | Library |
|------|--------|---------|
| `src/lib/file-extraction/txt-extractor.ts` | TXT, CSV | Native `Blob.text()` |
| `src/lib/file-extraction/pdf-extractor.ts` | PDF | `pdf-parse` v2 (`PDFParse` class API) |
| `src/lib/file-extraction/docx-extractor.ts` | DOCX | `mammoth` v1 (expects `{ buffer: Buffer }`) |
| `src/lib/file-extraction/xlsx-extractor.ts` | XLSX | `xlsx-populate` (output: markdown tables) |
| `src/lib/file-extraction/pptx-extractor.ts` | PPTX | `officeparser` (`parseOffice()`) |
| `src/lib/file-extraction/image-ocr.ts` | Image OCR | OpenRouter GPT-4o Vision (fallback path, bukan primary) |

### Types & Convex

| File | Fungsi |
|------|--------|
| `src/lib/types/attached-file.ts` | `AttachedFileMeta` interface, `formatFileSize()`, `isImageType()` |
| `convex/files.ts` | Convex mutations/queries: `createFile`, `getFile`, `getFileUrl`, `getFilesByIds`, `generateUploadUrl`, `updateExtractionResult` |
| `convex/schema.ts` | Tabel `files` definition |

### Config

| File | Fungsi |
|------|--------|
| `next.config.ts` | `serverExternalPackages: ["pdf-parse", "pdfjs-dist"]` — exclude dari Turbopack bundling |

## Error Handling

### Custom Error Classes

Setiap extractor punya custom error class dengan `code` field untuk kategorisasi:

| Extractor | Error Class | Codes |
|-----------|-------------|-------|
| PDF | `PDFExtractionError` | `CORRUPT_FILE`, `PASSWORD_PROTECTED`, `EMPTY_PDF`, `PARSE_ERROR` |
| DOCX | `DOCXExtractionError` | `CORRUPT_FILE`, `UNSUPPORTED_FORMAT`, `EMPTY_DOCX`, `PARSE_ERROR` |
| XLSX | `XLSXExtractionError` | `CORRUPT_FILE`, `UNSUPPORTED_FORMAT`, `EMPTY_XLSX`, `PARSE_ERROR` |
| PPTX | `PPTXExtractionError` | `CORRUPT_FILE`, `UNSUPPORTED_FORMAT`, `EMPTY_PPTX`, `PARSE_ERROR` |
| Image OCR | `ImageOCRError` | `API_ERROR`, `RATE_LIMIT`, `INVALID_IMAGE`, `NO_TEXT_FOUND`, `ENCODING_ERROR` |

### Graceful Degradation

Extraction failure **tidak** memblokir user. Alurnya:

1. Extraction gagal → `extractionStatus = "failed"`, `extractionError` tersimpan di DB
2. Saat chat, file context menampilkan: `"❌ File gagal diproses: <error message>"`
3. File tetap ada di storage — user masih bisa lihat attachment badge
4. Model mendapat notifikasi bahwa file gagal diproses

Upload failure (network/Convex error) → toast error, file tidak ter-attach.

## Gotchas & Known Issues

### Turbopack + pdfjs-dist

`pdfjs-dist` (dependency dari `pdf-parse` v2) membutuhkan `pdf.worker.mjs` yang tidak bisa di-bundle oleh Turbopack. Solusi: `serverExternalPackages` di `next.config.ts`.

Warning berikut muncul di terminal tapi **tidak menyebabkan error**:
```
⚠ Package pdfjs-dist can't be external
The request pdfjs-dist/legacy/build/pdf.worker.mjs matches serverExternalPackages
The package seems invalid. require() resolves to a EcmaScript module
```

### mammoth Buffer vs ArrayBuffer

`mammoth` v1 di Node.js mengharapkan `{ buffer: Buffer }`, bukan `{ arrayBuffer: ArrayBuffer }`. `docx-extractor.ts` sudah melakukan konversi: `Buffer.from(arrayBuffer)`.

### Legacy Format Tidak Didukung

`.xls` (binary BIFF) dan `.doc` (binary Word) **tidak** didukung karena:
- `xlsx-populate` hanya bisa baca OOXML (ZIP-based `.xlsx`)
- `mammoth` hanya bisa baca OOXML (`.docx`)

User yang upload format legacy akan mendapat toast error validasi.

### Image: Dual Path

Gambar punya **dua** path potensial:
1. **Primary (active):** Native multimodal via AI SDK `FileUIPart` — gambar dikirim langsung ke model sebagai base64 data URL. Ini yang digunakan saat user attach image di chat.
2. **Fallback (passive):** OCR via OpenRouter GPT-4o Vision di `image-ocr.ts` — hanya di-trigger jika extraction dipanggil eksplisit untuk image. Saat ini `FileUploadButton` **tidak** trigger extraction untuk image (`if (!file.type.startsWith("image/"))`).

### Extraction Polling Timeout

Server polls max 8 detik (16 × 500ms). Jika extraction belum selesai dalam 8 detik (misalnya file besar atau API lambat), model menerima pesan "file sedang diproses" — user perlu kirim ulang pesan setelah extraction selesai.

### CSV Handling

CSV diperlakukan sebagai plain text (MIME `text/csv` → routed ke `txt-extractor`). Tidak ada parsing kolom/baris khusus — model menerima raw CSV text.

## Environment Variables

| Variable | Dibutuhkan Oleh | Keterangan |
|----------|-----------------|------------|
| `OPENROUTER_API_KEY` | `image-ocr.ts` | Hanya untuk fallback OCR path (tidak dipakai di primary image flow) |
| `NEXT_PUBLIC_CONVEX_URL` | Convex client | Storage upload/download |

## Dependencies

| Package | Version | Digunakan Oleh |
|---------|---------|----------------|
| `pdf-parse` | ^2.4.5 | `pdf-extractor.ts` |
| `pdfjs-dist` | (peer dep) | Digunakan oleh pdf-parse v2 |
| `mammoth` | ^1.11.0 | `docx-extractor.ts` |
| `xlsx-populate` | ^1.21.1 | `xlsx-extractor.ts` |
| `officeparser` | ^5.1.1 | `pptx-extractor.ts` |
| `@openrouter/ai-sdk-provider` | (existing) | `image-ocr.ts` (fallback OCR) |
