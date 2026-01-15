# MessageBubble - Technical Reference

Dokumentasi lengkap tentang MessageBubble component di Makalah App.

## Daftar Isi

1. [Overview](#overview)
2. [Arsitektur](#arsitektur)
3. [Component Hierarchy](#component-hierarchy)
4. [Props & Interface](#props--interface)
5. [Edit Mode](#edit-mode)
6. [Content Extraction](#content-extraction)
7. [Sub-Components](#sub-components)
8. [Inline Citations](#inline-citations)
9. [Backend Integration](#backend-integration)
10. [Styling](#styling)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Paper Mode Integration](#paper-mode-integration)
13. [Troubleshooting](#troubleshooting)
14. [Files Reference](#files-reference)

---

## Overview

MessageBubble adalah komponen utama untuk menampilkan pesan individual dalam chat interface. Komponen ini mendukung:

- **Tampilan pesan** user dan assistant dengan styling berbeda
- **Edit mode** untuk pesan user dengan regenerasi AI response
- **Markdown rendering** dengan inline citations
- **File attachment** indicators
- **Tool state** indicators (loading, error; state sukses disembunyikan)
- **Web search** status indicators
- **Artifact** creation indicators
- **Sources** collapsible list
- **Quick actions** untuk assistant messages (Copy, Insert, Save)

### Key Features

| Feature | Implementation |
|---------|----------------|
| User Edit | Inline textarea dengan Enter/Escape shortcuts |
| Markdown | Custom parser dengan heading, list, code, blockquote |
| Citations | Inline chips [1], [2] dengan hover preview |
| Tool States | Real-time loading/error indicators |
| Artifacts | Clickable indicator untuk buka artifact panel |
| Sources | Collapsible list dengan pagination |
| Quick Actions | Copy to clipboard, Insert to Paper, Save to Snippets |
| Responsive | Adaptive styling dengan max-width 80% |

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                      CHATWINDOW                                   │
│                                                                  │
│  State: messages[], status, input                               │
│  Hooks: useChat(), useMessages(), usePaperSession()             │
│                                                                  │
│  Renders via Virtuoso:                                          │
│  ├── MessageBubble (per message)                                │
│  │   ├── Header (role label + edit button)                      │
│  │   ├── Content (MarkdownRenderer atau Textarea)               │
│  │   ├── ToolStateIndicator(s)                                  │
│  │   ├── SearchStatusIndicator                                  │
│  │   ├── ArtifactIndicator(s)                                   │
│  │   ├── SourcesIndicator                                       │
│  │   └── QuickActions (assistant only)                          │
│  └── ThinkingIndicator (saat generating)                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
MessageBubble (src/components/chat/MessageBubble.tsx)
├── Header
│   ├── Role Label ("user" | "assistant")
│   └── Edit Button (PencilIcon, user only, hover reveal)
│
├── File Attachments (jika ada)
│   └── Per file: PaperclipIcon + "Attachment" label
│
├── Tool State Indicators (non-search, jika ada)
│   └── ToolStateIndicator per tool
│
├── Content Area
│   ├── [Edit Mode] Textarea + Batal/Kirim buttons
│   └── [View Mode] MarkdownRenderer dengan sources
│       └── InlineCitationChip (untuk [1], [2] markers)
│
├── Search Status (assistant, jika ada)
│   └── SearchStatusIndicator
│
├── Search Tools (assistant, jika ada)
│   └── ToolStateIndicator per google_search tool
│
├── Artifact Indicators (jika ada)
│   └── ArtifactIndicator per created artifact
│
├── Sources Indicator (assistant, jika ada sources)
│   └── SourcesIndicator (collapsible)
│
└── Quick Actions (assistant only, view mode)
    └── QuickActions (Copy, Insert, Save)
```

---

## Props & Interface

### MessageBubbleProps

```typescript
interface MessageBubbleProps {
    // Required
    message: UIMessage              // AI SDK v5 message format

    // Required (can be null)
    conversationId: string | null   // Current conversation ID

    // Optional callbacks
    onEdit?: (messageId: string, newContent: string) => void
    onArtifactSelect?: (artifactId: Id<"artifacts">) => void

    // Paper Mode Permission Props (Optional)
    isPaperMode?: boolean
    messageIndex?: number
    currentStageStartIndex?: number
    allMessages?: PermissionMessage[]
    stageData?: Record<string, StageDataEntry>
}
```

### UIMessage Structure (AI SDK v5)

```typescript
interface UIMessage {
    id: string
    role: "user" | "assistant" | "system" | "data"
    content: string
    parts?: Array<
        | { type: "text"; text: string }
        | { type: "tool-*"; state: string; output?: unknown }
        | { type: "data-*"; data: unknown }
    >
    annotations?: Array<{ type?: string; [key: string]: unknown }>
    sources?: Array<{ url: string; title: string; publishedAt?: number | null }>
}
```

---

## Edit Mode

### Overview

Edit mode memungkinkan user mengedit pesan mereka. Saat pesan diedit:
1. Backend menghapus pesan yang diedit + semua pesan setelahnya (editAndTruncate)
2. Frontend truncate local state sampai sebelum pesan yang diedit
3. Pesan baru dikirim untuk trigger AI response

### UI States

**View Mode (default):**
```
┌────────────────────────────────────────────────┐
│ user                                  [pencil] │
│ ┌────────────────────────────────────────────┐ │
│ │ Rendered markdown content...               │ │
│ └────────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

**Edit Mode (setelah klik pencil):**
```
┌────────────────────────────────────────────────┐
│ user                                           │
│ ┌────────────────────────────────────────────┐ │
│ │ [Editable textarea content...]             │ │
│ └────────────────────────────────────────────┘ │
│                        [✕ Batal] [→ Kirim]    │
└────────────────────────────────────────────────┘
```

### State Management

```typescript
const [isEditing, setIsEditing] = useState(false)
const [editContent, setEditContent] = useState("")
const textareaRef = useRef<HTMLTextAreaElement>(null)
```

### Handlers

```typescript
// Start editing
// Start editing
const startEditing = () => {
    setIsEditing(true)
    setEditContent(content)
    setTimeout(() => {
        if (textareaRef.current) {
            textareaRef.current.focus()
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
        }
    }, 0)
}

// Kirim (Send) - SELALU trigger regeneration
const handleSave = () => {
    // "Kirim" selalu trigger regeneration, bahkan jika konten tidak berubah
    // User mungkin ingin retry/regenerate AI response tanpa mengubah pesan
    const contentToSend = editContent.trim() || content
    onEdit?.(message.id, contentToSend)
    setIsEditing(false)
}

// Cancel edit
const handleCancel = () => {
    setIsEditing(false)
    setEditContent(content)
}
```

**CATATAN**: Sebelumnya ada kondisi `editContent.trim() !== content` yang mencegah `onEdit` dipanggil jika konten tidak berubah. Ini sudah dihapus karena semantik "Kirim" berbeda dari "Save" - user mengharapkan regeneration bahkan tanpa perubahan konten (retry).

### Auto-resize Textarea

```typescript
<textarea
    ref={textareaRef}
    value={editContent}
    onChange={(e) => {
        setEditContent(e.target.value)
        // Auto-resize
        e.target.style.height = 'auto'
        e.target.style.height = e.target.scrollHeight + 'px'
    }}
    onKeyDown={handleKeyDown}
    className="... resize-none overflow-hidden"
    rows={1}
/>
```

---

## Content Extraction

MessageBubble extract berbagai data dari `message.parts` untuk rendering sub-components.

### Text Content

```typescript
const content = message.parts
    ? message.parts.filter(part => part.type === 'text').map(part => part.text).join('')
    : ''
```

### Created Artifacts

```typescript
const extractCreatedArtifacts = (uiMessage: UIMessage): CreatedArtifact[] => {
    const created: CreatedArtifact[] = []

    for (const part of uiMessage.parts ?? []) {
        const maybeToolPart = part as unknown as {
            type?: unknown
            state?: unknown
            output?: unknown
            result?: unknown
        }

        if (maybeToolPart.type !== "tool-createArtifact") continue

        const okState =
            maybeToolPart.state === "output-available" || maybeToolPart.state === "result"
        if (!okState) continue

        const maybeOutput = (maybeToolPart.output ?? maybeToolPart.result) as unknown as {
            success?: unknown
            artifactId?: unknown
            title?: unknown
        } | null

        if (!maybeOutput || maybeOutput.success !== true) continue
        if (typeof maybeOutput.artifactId !== "string") continue
        if (typeof maybeOutput.title !== "string") continue

        created.push({
            artifactId: maybeOutput.artifactId as Id<"artifacts">,
            title: maybeOutput.title,
        })
    }

    return created
}
```

### In-Progress Tools

```typescript
const extractInProgressTools = (uiMessage: UIMessage) => {
    const tools: { toolName: string; state: string; errorText?: string }[] = []

    for (const part of uiMessage.parts ?? []) {
        const maybeToolPart = part as unknown as {
            type?: string
            state?: string
            args?: unknown
            output?: unknown
            result?: unknown
        }

        if (!maybeToolPart.type?.startsWith("tool-")) continue

        // Skip completed states (handled by ArtifactIndicator)
        if (maybeToolPart.state === "output-available" || maybeToolPart.state === "result") continue

        const toolName = maybeToolPart.type.replace("tool-", "")
        let errorText: string | undefined

        if (maybeToolPart.state === "output-error" || maybeToolPart.state === "error") {
            const output = maybeToolPart.output ?? maybeToolPart.result
            if (typeof output === "string") {
                errorText = output
            } else if (typeof output === "object" && output && "error" in output) {
                errorText = String((output as { error: unknown }).error)
            }
        }

        tools.push({
            toolName,
            state: maybeToolPart.state || "unknown",
            errorText
        })
    }

    return tools
}
```

### Search Status

```typescript
const extractSearchStatus = (uiMessage: UIMessage): SearchStatus | null => {
    for (const part of uiMessage.parts ?? []) {
        const maybeDataPart = part as unknown as { type?: string; data?: unknown }
        if (maybeDataPart.type !== "data-search") continue

        const data = maybeDataPart.data as { status?: unknown } | null
        if (!data || typeof data !== "object") continue

        const status = data.status
        if (status === "searching" || status === "done" || status === "off" || status === "error") {
            return status
        }
    }

    return null
}
```

### Cited Text & Sources

```typescript
const extractCitedText = (uiMessage: UIMessage): string | null => {
    for (const part of uiMessage.parts ?? []) {
        const maybeDataPart = part as unknown as { type?: string; data?: unknown }
        if (maybeDataPart.type !== "data-cited-text") continue
        const data = maybeDataPart.data as { text?: unknown } | null
        if (!data || typeof data !== "object") continue
        return typeof data.text === "string" ? data.text : null
    }
    return null
}

const extractCitedSources = (uiMessage: UIMessage): CitationSource[] | null => {
    for (const part of uiMessage.parts ?? []) {
        const maybeDataPart = part as unknown as { type?: string; data?: unknown }
        if (maybeDataPart.type !== "data-cited-sources") continue
        const data = maybeDataPart.data as { sources?: unknown } | null
        if (!data || typeof data !== "object") continue
        if (!Array.isArray(data.sources)) return null
        // ... parse and validate sources
    }
    return null
}
```

### Fallback Sources

Urutan fallback sumber: `data-cited-sources` → `annotations` → `message.sources`.

```typescript
const sourcesFromAnnotation = (message as {
    annotations?: { type?: string; sources?: CitationSource[] }[]
}).annotations?.find((annotation) => annotation.type === "sources")?.sources

const citedSources = extractCitedSources(message)
const messageSources = (message as { sources?: CitationSource[] }).sources
const sources = citedSources || sourcesFromAnnotation || messageSources || []
```

---

## Sub-Components

### MarkdownRenderer

Custom markdown parser yang mendukung:
- Headings (h1-h6)
- Paragraphs
- Unordered lists (-, *, +)
- Ordered lists (1., 2., etc.)
- Outline lists (grouped numbered items)
- Code blocks (\`\`\`language)
- Inline code (\`code\`)
- Blockquotes (>)
- Horizontal rules (---, ***, ___)
- Bold (**text**, __text__)
- Italic (*text*, _text_)
- Links ([label](url))
- Inline citations ([1], [2, 3])

**Usage:**
```tsx
<MarkdownRenderer
    markdown={citedText ?? content}
    className="space-y-2"
    sources={sources}
/>
```

### QuickActions

Toolbar untuk assistant messages dengan 3 actions:

| Action | Handler | Status |
|--------|---------|--------|
| Copy | `navigator.clipboard.writeText()` | Implemented |
| Insert | `handleInsert()` | Placeholder |
| Save | `handleSave()` | Placeholder |

### ArtifactIndicator

Clickable button yang muncul saat artifact berhasil dibuat:
- Green styling untuk success state
- Shows artifact title
- Triggers `onArtifactSelect` callback

### ToolStateIndicator

Shows tool processing states:

| State | Display |
|-------|---------|
| `input-streaming` | Loader + "AI menyiapkan..." |
| `input-available` | Loader + "Memproses..." |
| `output-error`/`error` | Alert + error message |
| `output-available`/`result` | (hidden, handled by ArtifactIndicator) |

Special handling untuk `google_search` tool dengan GlobeIcon.

### SearchStatusIndicator

Shows web search status:

| Status | Display |
|--------|---------|
| `searching` | GlobeIcon (pulse) + "Mencari..." |
| `error` | AlertCircleIcon + "Pencarian gagal" |
| `done`/`off` | (hidden) |

### SourcesIndicator

Collapsible list of citation sources:
- Collapsed: "N sumber ditemukan" with toggle button
- Expanded: List of sources with title, date, URL
- Pagination: Shows 5 items initially, "Tampilkan N lainnya" button

---

## Inline Citations

### Flow

```
1. AI response dengan google_search
       │
       ▼
2. API route extracts groundingSupports
       │
       ▼
3. Stream data parts:
   - data-cited-text (text dengan [1], [2] markers)
   - data-cited-sources (array of {url, title, publishedAt})
       │
       ▼
4. MessageBubble extracts cited text & sources
       │
       ▼
5. MarkdownRenderer parses [1], [2] markers
       │
       ▼
6. InlineCitationChip renders as badge
   - Desktop: Hover card dengan carousel
   - Mobile: Bottom sheet
```

### Citation Chip Variants

**Desktop:**
```
[hostname +N] → Hover → Card with carousel of sources
```

**Mobile:**
```
[hostname +N] → Tap → Bottom sheet with sources
```

---

## Backend Integration

### Edit & Truncate Flow

Saat user edit pesan dan klik "Kirim":

1. **ID Resolution**: Periksa apakah messageId adalah Convex ID atau client ID
2. **Backend**: Hapus pesan yang diedit + semua pesan setelahnya
3. **Frontend**: Truncate local state, lalu `sendMessage()` dengan konten baru
4. **AI SDK**: `sendMessage()` membuat pesan baru di DB dan trigger AI response

**PENTING**:
1. Tidak menggunakan `regenerate()` karena AI SDK v5 `regenerate()` hanya bekerja untuk pesan **assistant** terakhir. Setelah truncate, pesan terakhir adalah pesan user, sehingga `regenerate()` tidak akan melakukan apa-apa.
2. Messages dari `sendMessage()` punya **client-generated ID** (~16 chars, mixed case), bukan Convex ID (32 chars, lowercase). Harus di-resolve sebelum mutation.

```typescript
// ChatWindow.tsx line 243-304
const handleEdit = async (messageId: string, newContent: string) => {
    if (!conversationId) return

    // Resolve the actual Convex ID
    // Client-generated IDs (from sendMessage) are ~16 chars, mixed case
    // Convex IDs are 32 chars, lowercase alphanumeric
    let actualMessageId: Id<"messages">
    const isValidConvexId = /^[a-z0-9]{32}$/.test(messageId)

    if (isValidConvexId) {
        actualMessageId = messageId as Id<"messages">
    } else {
        // For client-generated IDs, find the corresponding Convex ID from historyMessages
        const messageIndex = messages.findIndex(m => m.id === messageId)
        if (messageIndex !== -1 && historyMessages?.[messageIndex]) {
            const historyMsg = historyMessages[messageIndex]
            const currentMsg = messages[messageIndex]
            // Verify it's the same message by checking role
            if (historyMsg.role === currentMsg.role) {
                actualMessageId = historyMsg._id
            } else {
                toast.error("Pesan belum tersimpan. Tunggu sebentar lalu coba lagi.")
                return
            }
        } else {
            toast.error("Pesan belum tersimpan. Tunggu sebentar lalu coba lagi.")
            return
        }
    }

    try {
        // 1. Delete the edited message and all subsequent from DB
        await editAndTruncate({
            messageId: actualMessageId,
            content: newContent, // Passed for backwards compat, but not used by mutation
            conversationId: conversationId as Id<"conversations">
        })

        // 2. Mark stage as dirty in paper mode
        if (isPaperMode) {
            markStageAsDirty()
        }

        // 3. Truncate local messages to BEFORE the edited message
        const messageIndex = messages.findIndex(m => m.id === messageId)
        if (messageIndex !== -1) {
            const truncatedMessages = messages.slice(0, messageIndex)
            setMessages(truncatedMessages)

            // 4. Send the edited content as a new message - this triggers AI response
            pendingScrollToBottomRef.current = true
            sendMessage({ text: newContent })
        } else {
            // Edge case: message not found in local state (should not happen normally)
            toast.error("Pesan tidak ditemukan. Silakan refresh halaman.")
        }

    } catch (error) {
        console.error("Failed to edit and resend:", error)
        toast.error("Gagal mengedit pesan. Silakan coba lagi.")
    }
}
```

**Backend mutation (convex/messages.ts line 101-126):**

```typescript
// Truncate conversation from a specific message (delete it and all subsequent)
// Used for edit-and-resend flow: delete the message, then sendMessage() creates new one
export const editAndTruncateConversation = mutation({
    args: {
        messageId: v.id("messages"),
        content: v.string(), // Kept for backwards compatibility, but not used
        conversationId: v.id("conversations"),
    },
    handler: async ({ db }, { messageId, conversationId }) => {
        // 1. Get the message to define the split point
        const message = await db.get(messageId)
        if (!message) throw new Error("Message not found")

        // 2. Find and delete all subsequent messages in this conversation
        const subsequentMessages = await db
            .query("messages")
            .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
            .filter((q) => q.gt(q.field("createdAt"), message.createdAt))
            .collect()

        for (const msg of subsequentMessages) {
            await db.delete(msg._id)
        }

        // 3. Delete the edited message itself - sendMessage() will create a new one
        await db.delete(messageId)
    },
})
```

---

## Styling

### Bubble Container

```tsx
<div className={`
    group
    p-2 mb-2 rounded
    ${message.role === 'user'
        ? 'bg-primary text-primary-foreground ml-auto'
        : 'bg-muted'
    }
    max-w-[80%]
    relative
`}>
```

### Edit Button (Hover Reveal)

```tsx
<button
    onClick={startEditing}
    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/20 rounded"
>
    <PencilIcon className="h-3 w-3" />
</button>
```

### Textarea (Edit Mode)

```tsx
<textarea
    className="w-full bg-background/10 border border-white/20 rounded p-2 text-inherit focus:outline-none resize-none overflow-hidden"
    rows={1}
/>
```

### Action Buttons (Edit Mode)

```tsx
// Batal
<button className="p-1 hover:bg-white/20 rounded text-xs flex items-center gap-1">
    <XIcon className="h-3 w-3" /> Batal
</button>

// Kirim
<button className="p-1 bg-white/20 hover:bg-white/30 rounded text-xs flex items-center gap-1">
    <SendHorizontalIcon className="h-3 w-3" /> Kirim
</button>
```

---

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `Enter` | Kirim edit | Edit mode (tanpa Shift) |
| `Shift+Enter` | New line | Edit mode |
| `Escape` | Batalkan edit | Edit mode |

**Implementation:**

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSave()
    } else if (e.key === 'Escape') {
        handleCancel()
    }
}
```

---

## Paper Mode Integration

Saat dalam paper writing mode, edit message juga trigger `markStageAsDirty()`:

```typescript
// ChatWindow.tsx line 282-283
if (isPaperMode) {
    markStageAsDirty()
}
```

Ini menandai bahwa stage saat ini perlu validasi ulang karena ada perubahan pada conversation.

Selain itu, `MessageBubble` sekarang memeriksa izin edit menggunakan utility `isEditAllowed`. Jika edit tidak diizinkan (misalnya pesan dari tahap yang sudah divalidasi dan dikunci), tombol edit akan disabled dan menampilkan tooltip alasan penolakan.

```typescript
// MessageBubble.tsx
const editPermission = useMemo(() => {
    // ... check isEditAllowed ...
}, [...])

// Render
{!isEditing && message.role === 'user' && onEdit && (
    editPermission.allowed ? (
        <button onClick={startEditing} ... />
    ) : (
        <Tooltip>
            <TooltipTrigger><button disabled ... /></TooltipTrigger>
            <TooltipContent>{editPermission.reason}</TooltipContent>
        </Tooltip>
    )
)}
```

---

## Troubleshooting

### Edit button tidak muncul

1. Pastikan `message.role === 'user'`
2. Pastikan `onEdit` prop dipassing dari ChatWindow
3. Cek `group-hover:opacity-100` class pada button

### Textarea tidak auto-resize

1. Pastikan `textareaRef` attached ke element
2. Cek `setTimeout` di `startEditing()` untuk timing
3. Verify `overflow-hidden` dan `resize-none` classes

### Kirim tidak trigger AI response

1. Verify `handleEdit` dipassing dari ChatWindow
2. Cek `editAndTruncate` mutation tidak error
3. Pastikan `setMessages` truncate ke SEBELUM pesan yang diedit
4. Pastikan `sendMessage({ text: newContent })` dipanggil setelah truncate

**CATATAN**: Jangan gunakan `regenerate()` - hanya bekerja untuk pesan assistant terakhir

### Error "Value does not match validator" untuk messageId

**Gejala**: Mutation gagal dengan error seperti:
```
ArgumentValidationError: Value "DjfWirepp8e8JYhr" does not match validator v.id("messages")
```

**Penyebab**: Message yang diedit punya client-generated ID (dari `sendMessage()`), bukan Convex ID.

| Tipe ID | Format | Contoh |
|---------|--------|--------|
| **Convex ID** | 32 char, lowercase alphanumeric | `jd72n8w78s1y2bt7b8h2vrtn0d7ywdq9` |
| **Client ID** | ~16 char, mixed case | `DjfWirepp8e8JYhr` |

**Solusi**: `handleEdit` di ChatWindow (line 243-304) sudah handle ini dengan:
1. Validasi format ID dengan regex: `/^[a-z0-9]{32}$/`
2. Lookup Convex ID dari `historyMessages` jika client ID terdeteksi
3. Match berdasarkan index dan role untuk mencegah mismatch

```typescript
// ChatWindow.tsx line 250
const isValidConvexId = /^[a-z0-9]{32}$/.test(messageId)
if (!isValidConvexId) {
    // Lookup from historyMessages by index + role
    const messageIndex = messages.findIndex(m => m.id === messageId)
    if (messageIndex !== -1 && historyMessages?.[messageIndex]) {
        actualMessageId = historyMessages[messageIndex]._id
    }
}
```

### Error "Pesan belum tersimpan"

**Gejala**: Toast error "Pesan belum tersimpan. Tunggu sebentar lalu coba lagi."

**Penyebab**: User mencoba edit message yang baru dikirim sebelum tersimpan ke Convex, atau `historyMessages` belum sync.

**Solusi**: Tunggu beberapa detik sampai pesan tersimpan (sync dari Convex), lalu coba lagi.

### Citations tidak muncul

1. Cek `data-cited-text` dan `data-cited-sources` parts di message
2. Verify `sources` prop dipassing ke MarkdownRenderer
3. Pastikan source array tidak empty

### Tool indicators stuck

1. Cek state di message.parts (harusnya progress dari input-streaming → result)
2. Verify bukan completed state (`output-available`/`result`)
3. Cek error handling di API route

### Artifact indicator tidak clickable

1. Pastikan `onArtifactSelect` prop dipassing
2. Verify `artifactId` valid
3. Cek keyboard event handler untuk accessibility

---

## Files Reference

Lihat [files-index.md](./files-index.md) untuk detail lengkap lokasi files dan line numbers.

### Summary

| File | Lines | Purpose |
|------|-------|---------|
| src/components/chat/MessageBubble.tsx | 426 | Komponen utama bubble chat |
| src/components/chat/MarkdownRenderer.tsx | 542 | Custom markdown parser + citations |
| src/components/chat/QuickActions.tsx | 67 | Copy, Insert, Save buttons |
| src/components/chat/ArtifactIndicator.tsx | 44 | Artifact creation indicator |
| src/components/chat/ToolStateIndicator.tsx | 53 | Tool processing/error states |
| src/components/chat/SearchStatusIndicator.tsx | 38 | Web search status |
| src/components/chat/SourcesIndicator.tsx | 110 | Collapsible sources list |
| src/components/chat/InlineCitationChip.tsx | 132 | Inline citation badge |
| src/components/chat/ChatWindow.tsx | 531 | Parent component (handleEdit) |
| convex/messages.ts | 126 | Backend mutations |

---

*Last updated: 2026-01-11*
