# MessageBubble - Files Index

Quick reference untuk lokasi file utama terkait MessageBubble component.

## Quick Jump

| Category | Count | Files |
|----------|-------|-------|
| [Core Component](#core-component) | 1 | MessageBubble |
| [Sub-Components](#sub-components) | 6 | MarkdownRenderer, QuickActions, ArtifactIndicator, ToolStateIndicator, SearchStatusIndicator, SourcesIndicator |
| [Citation Components](#citation-components) | 2 | InlineCitationChip, inline-citation (AI Elements) |
| [Parent Components](#parent-components) | 2 | ChatWindow, ChatContainer |
| [Backend](#backend) | 1 | messages.ts |
| [Hooks](#hooks) | 1 | useMessages |
| [Types](#types) | 1 | AI SDK UIMessage |
| **Total** | **14** | |

---

## Core Component

```
src/components/chat/
└── MessageBubble.tsx               # Komponen utama bubble chat (426 lines)
```

### MessageBubble (src/components/chat/MessageBubble.tsx)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 3 | `import { UIMessage } from "ai"` |
| 4 | Icon imports: PaperclipIcon, PencilIcon, XIcon, SendHorizontalIcon |
| 5-9 | Sub-component imports |
| 10 | `useState, useRef, useMemo` imports |
| 11 | `Id` type import dari Convex |
| 12 | `MarkdownRenderer` import |
| 13 | `isEditAllowed` permission utility import |
| 14-19 | Tooltip components import |
| 33-44 | `MessageBubbleProps` interface |
| 46 | Component function declaration |
| 57-59 | Edit state: isEditing, editContent, textareaRef |
| 62-80 | `editPermission` memo - check paper edit logic |
| 84-118 | `extractCreatedArtifacts()` - extract artifact dari UIMessage.parts |
| 120-157 | `extractInProgressTools()` - extract tool states |
| 159-174 | `extractSearchStatus()` - extract web search status |
| 176-178 | Content extraction dari message.parts |
| 180-213 | Citation extraction: `extractCitedText()`, `extractCitedSources()` |
| 218-229 | `startEditing()` - toggle edit mode dengan auto-focus |
| 231-237 | `handleSave()` - Kirim (selalu trigger onEdit untuk regeneration) |
| 239-242 | `handleCancel()` - cancel edit mode |
| 244-251 | `handleKeyDown()` - Enter to kirim, Escape to batal |
| 272-425 | JSX render dengan conditional rendering & tooltip |

**Props Interface:**

```typescript
interface MessageBubbleProps {
    message: UIMessage
    conversationId: string | null
    onEdit?: (messageId: string, newContent: string) => void
    onArtifactSelect?: (artifactId: Id<"artifacts">) => void
    // Paper mode edit permissions
    isPaperMode?: boolean
    messageIndex?: number
    currentStageStartIndex?: number
    allMessages?: PermissionMessage[]
    stageData?: Record<string, StageDataEntry>
}
```

**Edit State & Handlers:**

```typescript
// State untuk edit mode
const [isEditing, setIsEditing] = useState(false)
const [editContent, setEditContent] = useState("")
const textareaRef = useRef<HTMLTextAreaElement>(null)

// Toggle edit mode
const startEditing = () => {
    setIsEditing(true)
    setEditContent(content)
    setTimeout(() => {
        textareaRef.current?.focus()
        // Auto-resize textarea
    }, 0)
}

// Kirim (Send) - SELALU trigger regeneration
const handleSave = () => {
    // "Kirim" selalu trigger regeneration, bahkan jika konten tidak berubah
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

---

## Sub-Components

```
src/components/chat/
├── MarkdownRenderer.tsx            # Markdown parsing + inline citations (542 lines)
├── QuickActions.tsx                # Copy, Insert, Save buttons (67 lines)
├── ArtifactIndicator.tsx           # Artifact creation indicator (44 lines)
├── ToolStateIndicator.tsx          # Tool processing/error states (53 lines)
├── SearchStatusIndicator.tsx       # Web search status (38 lines)
└── SourcesIndicator.tsx            # Collapsible sources list (110 lines)
```

### MarkdownRenderer (src/components/chat/MarkdownRenderer.tsx)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 3-4 | Fragment, ReactNode, InlineCitationChip imports |
| 6-10 | `MarkdownRendererProps` interface |
| 12-16 | `CitationSource` type |
| 18-26 | `Block` type union (heading, paragraph, ul, ol, code, blockquote, hr, outline) |
| 28-166 | Block parsing functions: isHeading, isUnorderedItem, isOrderedItem, etc. |
| 168-223 | Outline list grouping logic |
| 225-230 | `sanitizeHref()` - URL validation |
| 232-395 | `renderInline()` - inline markdown + citation rendering |
| 397-531 | `renderBlocks()` - block-level rendering |
| 533-542 | Main `MarkdownRenderer` component |

**Props Interface:**

```typescript
interface MarkdownRendererProps {
    markdown: string
    className?: string
    sources?: CitationSource[]  // For inline citation chips
}
```

### QuickActions (src/components/chat/QuickActions.tsx)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 3 | Icon imports: CopyIcon, FileTextIcon, BookmarkIcon, CheckIcon |
| 4 | `useState` import |
| 6-9 | `QuickActionsProps` interface |
| 11-67 | Component dengan 3 buttons: Copy, Insert, Save |
| 12 | `isCopied` state untuk feedback |
| 14-25 | `handleCopy()` - clipboard copy dengan feedback |
| 27-31 | `handleInsert()` - placeholder untuk paper integration |
| 33-37 | `handleSave()` - placeholder untuk snippets |

**Props Interface:**

```typescript
interface QuickActionsProps {
    content: string               // Content to copy/save
    conversationId: string | null // For Insert to Paper feature
}
```

### ArtifactIndicator (src/components/chat/ArtifactIndicator.tsx)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 3 | Icon imports: CheckCircleIcon, ArrowRightIcon |
| 4 | `Id` type import |
| 6-10 | `ArtifactIndicatorProps` interface |
| 12-44 | Component - clickable button untuk buka artifact panel |

**Props Interface:**

```typescript
interface ArtifactIndicatorProps {
    artifactId: Id<"artifacts">
    title: string
    onSelect: (id: Id<"artifacts">) => void
}
```

### ToolStateIndicator (src/components/chat/ToolStateIndicator.tsx)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 3 | `cn` utility import |
| 4 | Icon imports: Loader2Icon, AlertCircleIcon, GlobeIcon |
| 6-10 | `ToolStateIndicatorProps` interface |
| 12-53 | Component dengan conditional styling per state |
| 14 | Skip render untuk completed states |
| 16-17 | Error dan processing state detection |
| 19 | Google search special handling |
| 21-29 | Text generation per state |

**Props Interface:**

```typescript
interface ToolStateIndicatorProps {
    toolName: string   // Tool identifier (e.g., "google_search", "createArtifact")
    state: string      // Tool state (input-streaming, input-available, output-error, etc.)
    errorText?: string // Error message jika ada
}
```

### SearchStatusIndicator (src/components/chat/SearchStatusIndicator.tsx)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 3 | Icon imports: GlobeIcon, AlertCircleIcon |
| 4 | `cn` utility import |
| 6 | `SearchStatus` type export |
| 8-10 | `SearchStatusIndicatorProps` interface |
| 12-37 | Component - hanya render untuk "searching" atau "error" |

**Type & Props:**

```typescript
type SearchStatus = "searching" | "done" | "off" | "error"

interface SearchStatusIndicatorProps {
    status: SearchStatus
}
```

### SourcesIndicator (src/components/chat/SourcesIndicator.tsx)

| Line | What's There |
|------|--------------|
| 2 | `"use client"` directive |
| 4-14 | Imports: useState, icons, UI components, citation utils |
| 16-24 | `Source` and `SourcesIndicatorProps` interfaces |
| 26-110 | Collapsible component dengan pagination (max 5 items awal) |
| 27-28 | State: isOpen, showAll |
| 32-35 | Display logic dengan "show more" |
| 38-108 | JSX dengan Collapsible wrapper |

**Props Interface:**

```typescript
interface Source {
    url: string
    title: string
    publishedAt?: number | null
}

interface SourcesIndicatorProps {
    sources: Source[]
}
```

---

## Citation Components

```
src/components/chat/
└── InlineCitationChip.tsx          # Inline citation badge (132 lines)

src/components/ai-elements/
└── inline-citation.tsx             # Citation UI primitives (265 lines)
```

### InlineCitationChip (src/components/chat/InlineCitationChip.tsx)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 3-16 | Imports: inline-citation components, Badge, Sheet |
| 25 | `useEffect, useState` imports |
| 27-31 | `CitationSource` type |
| 33-44 | `formatDateId()` - Indonesian date formatting |
| 46-53 | `formatHostname()` - URL hostname extraction |
| 55-67 | `useIsMobile()` hook - responsive detection |
| 69-132 | Component dengan mobile/desktop variants |

**Props:**

```typescript
interface Props {
    sources: CitationSource[]  // Array of citation sources
}
```

---

## Parent Components

```
src/components/chat/
├── ChatWindow.tsx                  # Message list container (531 lines)
└── ChatContainer.tsx               # Top-level chat orchestrator (134 lines)
```

### ChatWindow (src/components/chat/ChatWindow.tsx)

| Line | What's There |
|------|--------------|
| 6 | `import { MessageBubble } from "./MessageBubble"` |
| 83 | `editAndTruncate = useMutation(api.messages.editAndTruncateConversation)` |
| 243-304 | `handleEdit()` - edit handler dengan ID resolution + regeneration |
| 437-487 | Virtuoso itemContent dengan MessageBubble rendering |
| 454-466 | MessageBubble instantiation dengan props |

**Key Integration:**

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
        // 1. Delete message and subsequent from DB
        await editAndTruncate({
            messageId: actualMessageId,
            content: newContent, // Passed for backwards compat, not used
            conversationId: conversationId as Id<"conversations">
        })

        // 2. Mark stage dirty in paper mode
        if (isPaperMode) {
            markStageAsDirty()
        }

        // 3. Truncate local state to BEFORE edited message
        const messageIndex = messages.findIndex(m => m.id === messageId)
        if (messageIndex !== -1) {
            const truncatedMessages = messages.slice(0, messageIndex)
            setMessages(truncatedMessages)

            // 4. Send edited content - creates new message AND triggers AI
            pendingScrollToBottomRef.current = true
            sendMessage({ text: newContent })
        }
    } catch (error) {
        toast.error("Gagal mengedit pesan. Silakan coba lagi.")
    }
}

// ChatWindow.tsx line 454-466
<MessageBubble
    key={message.id}
    message={displayMessage}
    conversationId={conversationId}
    onEdit={handleEdit}
    onArtifactSelect={onArtifactSelect}
/>
```

**PENTING**:
1. Menggunakan `sendMessage()` bukan `regenerate()` karena `regenerate()` dari AI SDK v5 hanya bekerja untuk pesan assistant terakhir.
2. Client-generated IDs (dari `sendMessage()`) harus di-resolve ke Convex ID via `historyMessages` lookup.

---

## Backend

```
convex/
└── messages.ts                     # Message CRUD + edit truncate (126 lines)
```

### messages.ts (convex/messages.ts)

| Line | What's There |
|------|--------------|
| 1-2 | Imports: v, mutation, query |
| 5-13 | `getMessages()` - query messages by conversation |
| 18-49 | `countMessagePairsForConversation()` - count user/assistant pairs |
| 53-85 | `createMessage()` - create new message dengan metadata |
| 89-97 | `updateMessage()` - simple content update |
| 101-126 | `editAndTruncateConversation()` - delete message + subsequent |

**Truncate Mutation (Delete for edit-and-resend):**

```typescript
// convex/messages.ts line 101-126
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

## Hooks

```
src/lib/hooks/
└── useMessages.ts                  # Fetch messages for conversation (37 lines)
```

### useMessages (src/lib/hooks/useMessages.ts)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 3-4 | Convex imports |
| 7-36 | Hook implementation dengan conditional query |

**Return Type:**

```typescript
{
    messages: Array<Message> // default []
    createMessage: (
        conversationId: Id<"conversations">,
        role: "user" | "assistant",
        content: string,
        fileIds?: Id<"files">[]
    ) => Promise<Id<"messages">>
    isLoading: boolean
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    MESSAGE BUBBLE DATA FLOW                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ChatWindow                                                      │
│       │                                                          │
│       ├── useChat() → messages[] (AI SDK state)                 │
│       ├── useMessages() → historyMessages[] (Convex)            │
│       │                                                          │
│       └── Merge & Render via Virtuoso:                          │
│               │                                                  │
│               ▼                                                  │
│  ┌─────────────────────────────────────────────┐                │
│  │ MessageBubble                                │                │
│  │                                             │                │
│  │ Props:                                      │                │
│  │   message (UIMessage), conversationId,     │                │
│  │   onEdit, onArtifactSelect                  │                │
│  │                                             │                │
│  │ Internal State:                             │                │
│  │   isEditing, editContent, textareaRef      │                │
│  │                                             │                │
│  │ Extract from message.parts:                 │                │
│  │   ├── content (text parts)                  │                │
│  │   ├── createdArtifacts (tool-createArtifact)│                │
│  │   ├── inProgressTools (tool states)        │                │
│  │   ├── searchStatus (data-search)           │                │
│  │   ├── citedText (data-cited-text)          │                │
│  │   └── citedSources (data-cited-sources)    │                │
│  │                                             │                │
│  │ Conditional Render:                         │                │
│  │   if (isEditing) → Textarea + Batal/Kirim  │                │
│  │   else → MarkdownRenderer                   │                │
│  │                                             │                │
│  │ Sub-components:                             │                │
│  │   ├── ToolStateIndicator (processing)      │                │
│  │   ├── SearchStatusIndicator (web search)   │                │
│  │   ├── ArtifactIndicator (created artifacts)│                │
│  │   ├── SourcesIndicator (citation list)     │                │
│  │   └── QuickActions (assistant only)        │                │
│  └─────────────────────────────────────────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Edit Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      EDIT MESSAGE FLOW                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User hovers message → Pencil icon muncul (opacity transition)│
│       │                                                          │
│       ▼                                                          │
│  2. User clicks pencil → startEditing()                         │
│       │                                                          │
│       ├── setIsEditing(true)                                    │
│       ├── setEditContent(current content)                       │
│       └── Auto-focus textarea                                   │
│               │                                                  │
│               ▼                                                  │
│  ┌─────────────────────────────────────────────┐                │
│  │ Edit Mode UI                                 │                │
│  │                                             │                │
│  │  ┌─────────────────────────────────────┐   │                │
│  │  │ user                                │   │                │
│  │  │ ┌─────────────────────────────────┐ │   │                │
│  │  │ │ [textarea with content]         │ │   │                │
│  │  │ └─────────────────────────────────┘ │   │                │
│  │  │                   [Batal] [Kirim]   │   │                │
│  │  └─────────────────────────────────────┘   │                │
│  └─────────────────────────────────────────────┘                │
│                    │              │                              │
│    Enter key ──────┤              │                              │
│    Click Kirim ────┤              │                              │
│                    ▼              │                              │
│  3. handleSave()                  │                              │
│       │                           │                              │
│       ├── SELALU call onEdit()    │   ← Tidak cek content changed│
│       │   (untuk retry/regenerate)│                              │
│       └── setIsEditing(false)     │                              │
│               │                   │                              │
│               ▼                   │ Escape key                   │
│  4. ChatWindow.handleEdit()       │ Click Batal                  │
│       │                           ▼                              │
│       ├── RESOLVE MESSAGE ID:     handleCancel()                │
│       │   ├── Convex ID (32 char)?                              │
│       │   │   → Use directly      ├── setIsEditing(false)       │
│       │   └── Client ID (~16 char)?                             │
│       │       → Lookup dari historyMessages                     │
│       │                           └── Reset editContent         │
│       ├── editAndTruncate()                                     │
│       │   (Delete message + subsequent)                         │
│       │                                                          │
│       ├── Mark paper stage dirty                                │
│       │   (if in paper mode)                                    │
│       │                                                          │
│       ├── Truncate local messages to BEFORE edited message      │
│       │   setMessages(messages.slice(0, messageIndex))          │
│       │                                                          │
│       └── sendMessage({ text: newContent })                     │
│           (Creates new message AND triggers AI response)        │
│                                                                  │
│  CATATAN:                                                        │
│  1. Tidak menggunakan regenerate() karena regenerate() hanya    │
│     bekerja untuk pesan assistant terakhir.                     │
│  2. Client IDs (dari sendMessage) harus di-resolve ke Convex ID │
│     via historyMessages lookup sebelum mutation.                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Search Patterns

```bash
# Find MessageBubble usage
rg "MessageBubble" src/components/chat/ -g "*.tsx"

# Find edit handlers
rg "onEdit|handleEdit|isEditing" src/components/chat/ -g "*.tsx"

# Find tool extraction
rg "extractCreatedArtifacts|extractInProgressTools|extractSearchStatus" src/components/chat/

# Find citation extraction
rg "extractCitedText|extractCitedSources|citedText|citedSources" src/components/chat/

# Find sub-component imports in MessageBubble
rg "import.*from.*\"\\./" src/components/chat/MessageBubble.tsx

# Find backend edit mutation
rg "editAndTruncateConversation" convex/ -g "*.ts"
```

---

## Quick Reference: Key Lines

| File | Line(s) | What's There |
|------|---------|--------------|
| `MessageBubble.tsx` | 33-44 | Props interface |
| `MessageBubble.tsx` | 57-59 | Edit state declarations |
| `MessageBubble.tsx` | 84-118 | extractCreatedArtifacts() |
| `MessageBubble.tsx` | 120-157 | extractInProgressTools() |
| `MessageBubble.tsx` | 159-174 | extractSearchStatus() |
| `MessageBubble.tsx` | 180-213 | Citation extraction functions |
| `MessageBubble.tsx` | 218-229 | startEditing() |
| `MessageBubble.tsx` | 231-237 | handleSave() (selalu trigger regeneration) |
| `MessageBubble.tsx` | 239-242 | handleCancel() |
| `MessageBubble.tsx` | 244-251 | handleKeyDown() (Enter/Escape) |
| `MessageBubble.tsx` | 272-309 | Header dengan edit button |
| `MessageBubble.tsx` | 338-369 | Edit mode textarea + buttons |
| `MessageBubble.tsx` | 370-375 | MarkdownRenderer (view mode) |
| `ChatWindow.tsx` | 6 | MessageBubble import |
| `ChatWindow.tsx` | 83 | editAndTruncate mutation |
| `ChatWindow.tsx` | 243-304 | handleEdit() dengan ID resolution |
| `ChatWindow.tsx` | 250 | Regex validasi Convex ID: `/^[a-z0-9]{32}$/` |
| `ChatWindow.tsx` | 454-466 | MessageBubble instantiation |
| `messages.ts` | 101-126 | editAndTruncateConversation mutation |
| `MarkdownRenderer.tsx` | 533-542 | Main component export |
| `QuickActions.tsx` | 14-25 | handleCopy() with feedback |
| `ArtifactIndicator.tsx` | 12-44 | Clickable artifact button |
| `ToolStateIndicator.tsx` | 12-53 | Processing/error indicator |
| `SearchStatusIndicator.tsx` | 12-37 | Web search status |
| `SourcesIndicator.tsx` | 26-110 | Collapsible sources list |
| `InlineCitationChip.tsx` | 69-132 | Mobile/desktop citation chip |

---

*Last updated: 2026-01-11*
