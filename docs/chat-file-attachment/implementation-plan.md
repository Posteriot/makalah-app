# Chat File Attachment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix broken file attachment flow end-to-end — images via native multimodal, documents via text extraction, seamless UX.

**Architecture:** Hybrid approach — images sent as FileUIPart data URLs (AI SDK v5 native), documents uploaded to Convex with background text extraction injected as context. Transport body uses ref+function pattern to bypass `useChat` stale reference bug.

**Tech Stack:** AI SDK v5 (`ai` ^5.0.113, `@ai-sdk/react` ^2.0.115), Convex, Next.js 16, React 19, TypeScript, sonner (toast)

---

### Task 1: Create AttachedFileMeta Type

**Files:**
- Create: `src/lib/types/attached-file.ts`

**Step 1: Create the type file**

```typescript
import { Id } from "../../../convex/_generated/dataModel"

export interface AttachedFileMeta {
  fileId: Id<"files">
  name: string
  size: number
  type: string // MIME type
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function isImageType(mimeType: string): boolean {
  return mimeType.startsWith("image/")
}
```

**Step 2: Commit**

```bash
git add src/lib/types/attached-file.ts
git commit -m "feat(chat): add AttachedFileMeta type and helpers"
```

---

### Task 2: Add PPTX Extractor

**Files:**
- Create: `src/lib/file-extraction/pptx-extractor.ts`
- Modify: `src/app/api/extract-file/route.ts:58-100` (detectFileType) + imports

**Step 1: Install PPTX parsing library**

Research best lightweight option. Candidates:
- `pptx-parser` — check npm for stability
- `officeparser` — multi-format (docx/xlsx/pptx)
- Manual: PPTX is a ZIP containing XML slides — could unzip + parse XML

Run: `npm install <chosen-library>` in worktree

**Step 2: Create pptx-extractor following existing pattern**

Follow the pattern from `docx-extractor.ts`:
```typescript
export class PPTXExtractionError extends Error {
  code: "CORRUPT_FILE" | "UNSUPPORTED_FORMAT" | "EMPTY_PPTX" | "PARSE_ERROR" | "UNKNOWN"
}

export async function extractTextFromPptx(blob: Blob): Promise<string>
export function isValidPptxFile(blob: Blob): boolean
export function getPptxErrorMessage(error: PPTXExtractionError): string
```

**Step 3: Update extract-file route**

In `detectFileType()` add:
```typescript
if (
  mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
  mimeType === "application/pptx"
) {
  return "pptx"
}
```

Add import and routing case for pptx.

**Step 4: Run build to verify**

Run: `npm run build` (in worktree)
Expected: No TypeScript errors

**Step 5: Commit**

```bash
git add src/lib/file-extraction/pptx-extractor.ts src/app/api/extract-file/route.ts package.json package-lock.json
git commit -m "feat(chat): add PPTX text extraction support"
```

---

### Task 3: Refactor FileUploadButton — No Dialog, Return Metadata

**Files:**
- Modify: `src/components/chat/FileUploadButton.tsx` (full rewrite)

**Step 1: Update callback signature and remove alerts**

Changes:
1. Props: `onFileUploaded` now returns `AttachedFileMeta` instead of `Id<"files">`
2. New prop: `onImageDataUrl?: (fileId: Id<"files">, dataUrl: string) => void`
3. Add PPTX to `allowedTypes` array + `accept` attribute
4. Replace all `alert()` with `toast.error()` / `toast.success()` (from `sonner`)
5. For images: read file as data URL via FileReader BEFORE upload, pass via `onImageDataUrl`
6. Remove `alert("File uploaded successfully!")` — the chip appearing IS the confirmation

Key logic for image data URL:
```typescript
if (file.type.startsWith("image/")) {
  const reader = new FileReader()
  reader.onload = () => {
    onImageDataUrl?.(fileId, reader.result as string)
  }
  reader.readAsDataURL(file)
}
```

For documents: trigger extraction as before (fire and forget).
For images: **skip extraction** — multimodal will handle it.

**Step 2: Run lint**

Run: `npm run lint -- --fix`

**Step 3: Commit**

```bash
git add src/components/chat/FileUploadButton.tsx
git commit -m "refactor(chat): FileUploadButton returns metadata, removes alert dialogs"
```

---

### Task 4: Refactor ChatInput — Rich File Chips with Remove

**Files:**
- Modify: `src/components/chat/ChatInput.tsx`

**Step 1: Update props interface**

```typescript
interface ChatInputProps {
  // ... existing props
  attachedFiles: AttachedFileMeta[]        // was: uploadedFileIds
  onFileAttached: (file: AttachedFileMeta) => void  // was: onFileUploaded
  onFileRemoved: (fileId: Id<"files">) => void      // NEW
  onImageDataUrl?: (fileId: Id<"files">, dataUrl: string) => void  // NEW
}
```

**Step 2: Rewrite renderFileChips()**

```tsx
const renderFileChips = () => {
  if (attachedFiles.length === 0) return null
  return (
    <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
      {attachedFiles.map((file) => (
        <div
          key={file.fileId}
          className="flex items-center gap-2 bg-[var(--chat-muted)] pl-2.5 pr-1.5 py-1.5 rounded-badge text-xs font-mono text-[var(--chat-muted-foreground)] whitespace-nowrap group"
        >
          {isImageType(file.type) ? (
            <MediaImage className="h-3 w-3 shrink-0" />
          ) : (
            <Page className="h-3 w-3 shrink-0" />
          )}
          <span className="max-w-[120px] truncate">{file.name}</span>
          <span className="text-[10px] opacity-60">{formatFileSize(file.size)}</span>
          <button
            type="button"
            onClick={() => onFileRemoved(file.fileId)}
            className="ml-0.5 p-0.5 rounded hover:bg-[var(--chat-accent)] transition-colors"
            aria-label={`Remove ${file.name}`}
          >
            <Xmark className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
```

Import `MediaImage` from `iconoir-react` for image icon. Import `formatFileSize`, `isImageType` from types.

**Step 3: Update all 3 render locations (desktop, mobile, fullscreen)**

Replace `uploadedFileIds` → `attachedFiles`, `onFileUploaded` → `onFileAttached`, add `onFileRemoved` and `onImageDataUrl` props to FileUploadButton.

**Step 4: Run lint**

Run: `npm run lint -- --fix`

**Step 5: Commit**

```bash
git add src/components/chat/ChatInput.tsx
git commit -m "refactor(chat): ChatInput shows filename, size, remove button on file chips"
```

---

### Task 5: Fix ChatWindow — Hybrid Send + Transport Fix (CRITICAL)

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`

**Step 1: Replace state management**

```typescript
// OLD:
const [uploadedFileIds, setUploadedFileIds] = useState<Id<"files">[]>([])

// NEW:
const [attachedFiles, setAttachedFiles] = useState<AttachedFileMeta[]>([])
const [imageDataUrls, setImageDataUrls] = useState<Map<string, string>>(new Map())
```

**Step 2: Fix transport with ref + lazy body function**

```typescript
const attachedFilesRef = useRef(attachedFiles)
attachedFilesRef.current = attachedFiles

const transport = useMemo(
  () =>
    new DefaultChatTransport({
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

**Step 3: Add callbacks**

```typescript
const handleFileAttached = (file: AttachedFileMeta) => {
  setAttachedFiles(prev => [...prev, file])
}

const handleFileRemoved = (fileId: Id<"files">) => {
  setAttachedFiles(prev => prev.filter(f => f.fileId !== fileId))
  setImageDataUrls(prev => {
    const next = new Map(prev)
    next.delete(fileId)
    return next
  })
}

const handleImageDataUrl = (fileId: Id<"files">, dataUrl: string) => {
  setImageDataUrls(prev => new Map(prev).set(fileId, dataUrl))
}
```

**Step 4: Rewrite handleSubmit with hybrid send logic**

```typescript
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault()
  if (!input.trim() && attachedFiles.length === 0) return
  if (isLoading) return

  pendingScrollToBottomRef.current = true

  // Collect image FileUIParts
  const imageFileParts = attachedFiles
    .filter(f => f.type.startsWith("image/"))
    .map(f => ({
      type: "file" as const,
      mediaType: f.type,
      filename: f.name,
      url: imageDataUrls.get(f.fileId) ?? "",
    }))
    .filter(f => f.url !== "")

  if (imageFileParts.length > 0) {
    sendMessage({ text: input || " ", files: imageFileParts })
  } else {
    sendMessage({ text: input })
  }
  // Document fileIds are sent via transport.body() function (ref pattern)

  setInput("")
  setAttachedFiles([])
  setImageDataUrls(new Map())
}
```

**Step 5: Update all 3 ChatInput render sites**

Replace props at lines ~1047-1060, ~1077-1090, ~1337-1347:
- `uploadedFileIds={uploadedFileIds}` → `attachedFiles={attachedFiles}`
- `onFileUploaded={handleFileUploaded}` → `onFileAttached={handleFileAttached}`
- Add: `onFileRemoved={handleFileRemoved}`
- Add: `onImageDataUrl={handleImageDataUrl}`

**Step 6: Update landing page submit handlers**

Landing page `handleStartNewChat` also needs hybrid logic if files attached.

**Step 7: Run lint + build**

Run: `npm run lint -- --fix && npm run build`

**Step 8: Commit**

```bash
git add src/components/chat/ChatWindow.tsx
git commit -m "fix(chat): hybrid attachment send — images native, docs via context injection"
```

---

### Task 6: Fix Server Route — Preserve File Parts

**Files:**
- Modify: `src/app/api/chat/route.ts:363-398`

**Step 1: Update sanitization to preserve file parts**

```typescript
const modelMessages = rawModelMessages
  .map((msg) => {
    const validRoles = ["user", "assistant", "system"]
    if (!validRoles.includes(msg.role)) return null

    if (Array.isArray(msg.content)) {
      // Preserve text AND file parts (images via native multimodal)
      const meaningfulParts = msg.content.filter(
        (part): part is { type: string; [key: string]: unknown } =>
          typeof part === "object" &&
          part !== null &&
          "type" in part &&
          (part.type === "text" || part.type === "file")
      )

      if (meaningfulParts.length === 0) return null

      // If only file parts (no text), keep as content array
      // If mixed or only text, keep as content array for multimodal
      return { ...msg, content: meaningfulParts }
    }

    return msg
  })
  .filter((msg): msg is NonNullable<typeof msg> => msg !== null) as ModelMessage[]
```

**Step 2: Verify fileContext injection still works for documents**

The existing file context injection (lines 307-354) reads `fileIds` from `body` — this still works because the transport body function returns document fileIds.

No changes needed to the file context injection logic.

**Step 3: Run build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "fix(chat): preserve file parts in message sanitization for multimodal"
```

---

### Task 7: Update MessageBubble — Render Image Attachments

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`

**Step 1: Add image rendering from message.parts**

After the existing file badge rendering (lines 516-524), add image part rendering for user messages:

```tsx
{/* Inline image attachments from native SDK */}
{isUser && message.parts?.map((part, i) => {
  if (
    part.type === "file" &&
    "mediaType" in part &&
    typeof part.mediaType === "string" &&
    part.mediaType.startsWith("image/")
  ) {
    return (
      <div key={`file-${i}`} className="mb-3">
        <img
          src={(part as { url: string }).url}
          alt={(part as { filename?: string }).filename ?? "attachment"}
          className="max-w-xs max-h-64 rounded-action border border-[color:var(--chat-border)]"
          loading="lazy"
        />
      </div>
    )
  }
  return null
})}
```

**Step 2: Keep existing document badge (annotations-based)**

The existing badge from `fileIds` annotations continues to work for documents loaded from history.

**Step 3: Run lint**

Run: `npm run lint -- --fix`

**Step 4: Commit**

```bash
git add src/components/chat/MessageBubble.tsx
git commit -m "feat(chat): render inline image attachments in message bubbles"
```

---

### Task 8: Update FileUploadButton Allowed Types for PPTX

**Files:**
- Modify: `src/components/chat/FileUploadButton.tsx` (already modified in Task 3, but verify PPTX)

**Step 1: Verify PPTX is in allowedTypes**

Ensure these are present:
```typescript
const allowedTypes = [
  // ... existing types
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
]
```

And in accept attribute:
```html
accept=".pdf,.doc,.docx,.xlsx,.txt,.jpg,.jpeg,.png,.gif,.webp,.pptx"
```

**Step 2: Commit (if separate from Task 3)**

```bash
git add src/components/chat/FileUploadButton.tsx
git commit -m "feat(chat): add PPTX to allowed file types"
```

---

### Task 9: End-to-End Verification

**Test 1: Image attachment**
1. Open `/chat`, start new conversation
2. Click attach → select a PNG/JPG image
3. Verify: chip shows filename + size, no alert dialog
4. Type "Apa isi gambar ini?" → Send
5. Verify: message bubble shows image inline
6. Verify: AI describes the image content correctly

**Test 2: PDF attachment**
1. Attach a PDF file
2. Verify: chip shows filename + size
3. Send with prompt "Rangkum isi file ini"
4. Verify: AI summarizes the PDF content (from extracted text)

**Test 3: DOCX, XLSX, TXT, PPTX**
1. Repeat with each file type
2. Verify extraction works and AI receives content

**Test 4: Multiple files**
1. Attach 1 image + 1 PDF
2. Send
3. Verify: image visible in bubble, AI knows about both

**Test 5: Remove file**
1. Attach file → click X on chip
2. Verify: chip disappears, file not sent

**Test 6: History reload**
1. Send message with attachment
2. Refresh page
3. Verify: file badge still visible in message bubble

**Test 7: No regressions**
1. Run `npm run lint`
2. Run `npm run build`
3. Run `npm run test`
4. Send normal chat message without attachment — verify still works
