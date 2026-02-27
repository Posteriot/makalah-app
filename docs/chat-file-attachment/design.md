# Chat File Attachment — Design Document

**Date:** 2026-02-27
**Branch:** `chat-attachment`
**Status:** Verified against codebase (12/12 checks passed) — Pending User Approval

---

## 1. Problem Statement

Fitur attach file di chat **tidak berfungsi sama sekali**. User bisa upload file (tersimpan di Convex storage), tapi file content tidak pernah sampai ke AI model. AI merespons seolah tidak ada attachment.

### Evidence (Screenshots)

1. Upload memproses (spinner) — terlihat bekerja
2. Browser alert "File uploaded successfully!" — upload ke Convex berhasil
3. Badge "File attached" muncul di atas input, **tanpa nama file**
4. User kirim pesan + attachment
5. Message bubble **tidak menampilkan** attachment badge
6. AI merespons **tanpa mengetahui** ada file — malah web search topik lain

---

## 2. Root Cause Analysis

### Bug #1: Transport Body Stale (CRITICAL)

**Lokasi:** `ChatWindow.tsx:465-475` + `@ai-sdk/react` `useChat` hook

`useChat` dari `@ai-sdk/react` v2.0.115 menggunakan `useRef` internal untuk menyimpan Chat instance. Chat instance **hanya dibuat sekali** saat first render. Meskipun `useMemo` membuat transport baru setiap kali `uploadedFileIds` berubah, `useChat` **tidak pernah mengganti** transport di Chat instance yang sudah ada.

```
uploadedFileIds berubah → useMemo buat transport baru → useChat ABAIKAN → sendMessage pakai transport lama (fileIds: [])
```

**Evidence di source code:**
- `@ai-sdk/react/dist/index.mjs:141-147` — `shouldRecreateChat` hanya cek `chat` object identity atau `id` change, BUKAN transport.
- `@ai-sdk/provider-utils/dist/index.mjs:899-904` — `resolve()` function mendukung `body` sebagai function (lazy evaluation), yang bisa dipakai sebagai fix.

### Bug #2: Server Sanitization Membuang File Parts (CRITICAL)

**Lokasi:** `src/app/api/chat/route.ts:371-393`

Setelah `convertToModelMessages(messages)`, sanitization code hanya mengambil `part.type === "text"` dan membuang semua `part.type === "file"`. Artinya meskipun file data URL sampai ke server via AI SDK native flow, file parts **dibuang sebelum sampai ke model**.

```typescript
// BUG: Hanya ambil text, buang file parts
const textParts = msg.content
  .filter((part) => part.type === "text")  // ← file parts HILANG di sini
```

### Bug #3: UX Issues (MEDIUM)

| Issue | Lokasi |
|-------|--------|
| `alert()` dialog blocking | `FileUploadButton.tsx:89,41,46,92` |
| Chip tanpa nama file | `ChatInput.tsx:100-103` |
| Tidak ada tombol remove file | `ChatInput.tsx:94-107` |
| PPTX tidak didukung | `FileUploadButton.tsx:27-37`, `extract-file/route.ts:58-100` |

---

## 3. Strategy: Hybrid

### Images (png/jpg/gif/webp)

```
Client: FileReader → data URL
  ↓
sendMessage({ text, files: [FileUIPart] })   ← AI SDK v5 native
  ↓
Server: convertToModelMessages → FilePart     ← automatic conversion
  ↓
Model: sees image directly (multimodal)       ← no OCR needed
```

**Kenapa native?** Gemini 2.5 Flash (primary model) dan GPT-5.1 (fallback) keduanya multimodal — bisa "lihat" gambar langsung. Hasil lebih akurat dari OCR.

### Documents (pdf/docx/xlsx/txt/pptx)

```
Client: upload → Convex storage
  ↓
Background: POST /api/extract-file → extractedText
  ↓
sendMessage({ text }) + fileIds via transport body (ref pattern)
  ↓
Server: fetch extractedText dari Convex → inject sebagai system message
  ↓
Model: reads extracted text
```

**Kenapa tetap extraction?** Model tidak bisa parse XLSX/PPTX/DOCX binary format langsung.

### Semua file: Disimpan ke Convex untuk history/persistence.

---

## 4. Component Changes

### 4.1 FileUploadButton.tsx

**Current:** Upload ke Convex, return `fileId: Id<"files">`, pakai `alert()`.

**Target:**
- Return metadata object (bukan hanya fileId):
  ```typescript
  interface AttachedFileMeta {
    fileId: Id<"files">
    name: string
    size: number
    type: string  // MIME
  }
  ```
- Untuk images: juga buat data URL via `FileReader.readAsDataURL()`, return via callback terpisah
- Hapus semua `alert()` — gunakan toast notification (dari sonner, sudah dipakai di codebase)
- Tambah PPTX ke allowed types
- Tetap upload SEMUA file ke Convex (termasuk images, untuk persistence)
- Tetap trigger extraction untuk documents only (skip untuk images — akan ditangani native multimodal)

### 4.2 ChatInput.tsx

**Current:** `uploadedFileIds: Id<"files">[]`, chip hanya tampil "File attached".

**Target:**
- Props ganti ke `attachedFiles: AttachedFileMeta[]` + `onFileRemoved: (fileId) => void`
- `renderFileChips()`:
  - Tampilkan nama file (truncate > 20 char dengan ellipsis)
  - Tampilkan ukuran ("2.3 MB" / "156 KB")
  - Icon: image icon untuk gambar, document icon untuk dokumen
  - Tombol X untuk remove
  - Design system: `rounded-badge`, `font-mono`, `text-xs`

### 4.3 ChatWindow.tsx (CRITICAL FIX)

**Current:** `uploadedFileIds` state + `useMemo` transport yang stale.

**Target:**

**State:**
```typescript
const [attachedFiles, setAttachedFiles] = useState<AttachedFileMeta[]>([])
const [imageDataUrls, setImageDataUrls] = useState<Map<string, string>>(new Map())
```

**Transport fix — ref + lazy body:**
```typescript
const attachedFilesRef = useRef(attachedFiles)
attachedFilesRef.current = attachedFiles

const transport = useMemo(
  () => new DefaultChatTransport({
    api: "/api/chat",
    body: () => ({
      conversationId: safeConversationId,
      fileIds: attachedFilesRef.current
        .filter(f => !f.type.startsWith("image/"))
        .map(f => f.fileId),
    }),
  }),
  [safeConversationId]
)
```

**Hybrid submit:**
```typescript
const handleSubmit = async (e) => {
  e.preventDefault()
  if (!input.trim() && attachedFiles.length === 0) return

  const imageFiles = attachedFiles
    .filter(f => f.type.startsWith("image/"))
    .map(f => ({
      type: "file" as const,
      mediaType: f.type,
      filename: f.name,
      url: imageDataUrls.get(f.fileId) ?? "",
    }))
    .filter(f => f.url)

  if (imageFiles.length > 0) {
    sendMessage({ text: input || " ", files: imageFiles })
  } else {
    sendMessage({ text: input })
  }

  setInput("")
  setAttachedFiles([])
  setImageDataUrls(new Map())
}
```

**History sync:** Tambah `type: "file_ids"` annotation dan document file metadata untuk rendering badges.

### 4.4 API Route (route.ts)

**Fix sanitization (lines 371-393):**
- Preserve `type: "file"` parts (untuk images yang datang via native SDK)
- Tetap inject `fileContext` untuk documents (dari fileIds in body)

**Target sanitization:**
```typescript
if (Array.isArray(msg.content)) {
  const meaningfulParts = msg.content.filter((part) => {
    if (typeof part === "object" && "type" in part) {
      return part.type === "text" || part.type === "file"
    }
    return false
  })
  if (meaningfulParts.length === 0) return null
  return { ...msg, content: meaningfulParts }
}
```

### 4.5 MessageBubble.tsx

**Current:** Badge dari annotations `{ type: "file_ids", fileIds }` — hanya tampil count.

**Target:**
- Render image parts inline dari `message.parts` (untuk images yang dikirim via native SDK)
- Badge untuk documents tetap dari annotations
- Image preview: `max-w-xs rounded-action` styling

### 4.6 PPTX Support (NEW)

**New file:** `src/lib/file-extraction/pptx-extractor.ts`
- Ikuti pattern extractor lainnya (Blob input, string output, custom error class)
- Library: riset dulu (`pptx-parser` vs alternatives)

**Update:** `extract-file/route.ts` — add PPTX MIME detection + routing

---

## 5. Data Flow Diagram (After Fix)

```
USER ATTACHES IMAGE
  ↓
FileUploadButton:
  ├─ Upload to Convex (persistence)
  ├─ FileReader.readAsDataURL() → imageDataUrls state
  └─ Return AttachedFileMeta to parent
  ↓
ChatWindow state:
  ├─ attachedFiles: [{ fileId, name, size, type: "image/png" }]
  └─ imageDataUrls: Map { fileId → "data:image/png;base64,..." }
  ↓
ChatInput renders:
  └─ Chip: "screenshot.png · 2.3 MB" [X]
  ↓
User clicks Send:
  ├─ sendMessage({ text, files: [FileUIPart] })  ← images as native SDK
  └─ transport.body() → { fileIds: [] }           ← no doc fileIds
  ↓
Server /api/chat:
  ├─ convertToModelMessages → preserves FilePart  ← FIX: no longer stripped
  ├─ fileIds = [] → no document context
  └─ streamText({ messages: [...with image FilePart...] })
  ↓
AI Model: SEES the image directly


USER ATTACHES DOCUMENT
  ↓
FileUploadButton:
  ├─ Upload to Convex
  ├─ POST /api/extract-file (background extraction)
  └─ Return AttachedFileMeta
  ↓
ChatWindow state:
  └─ attachedFiles: [{ fileId, name, size, type: "application/pdf" }]
  ↓
ChatInput renders:
  └─ Chip: "paper.pdf · 1.1 MB" [X]
  ↓
User clicks Send:
  ├─ sendMessage({ text })                         ← text only
  └─ transport.body() → { fileIds: [docFileId] }   ← ref pattern, lazy eval
  ↓
Server /api/chat:
  ├─ fileIds = [docFileId]
  ├─ Fetch file record → get extractedText
  ├─ Inject as system message: "File Context:\n\n[File: paper.pdf]\n...text..."
  └─ streamText({ messages: [...with file context...] })
  ↓
AI Model: READS the extracted text
```

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Image data URL terlalu besar (>5MB base64) | Max file size tetap 10MB. Base64 ≈ 1.33x original. Gemini/GPT handle ini. |
| Document extraction belum selesai saat send | File context inject "File sedang diproses" message — AI aware. |
| PPTX library tidak stabil | Ikuti pattern extractor lain dengan custom error class + retry. |
| `sendMessage({ files })` type compatibility | AI SDK v5 sudah support `FileUIPart[]` — verified dari source code. |
| Web search mode aktif bersamaan | File context tetap di-inject ke `fullMessagesBase` sebelum mode split. |
