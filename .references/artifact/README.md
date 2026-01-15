# Artifact System - Technical Reference

Dokumentasi lengkap tentang sistem Artifact di Makalah App - fitur untuk menyimpan deliverable content yang terpisah dari chat conversation.

## Daftar Isi

1. [Overview](#overview)
2. [Rationale](#rationale)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [Versioning System](#versioning-system)
6. [Tool Definition](#tool-definition)
7. [UI Components](#ui-components)
8. [Key Functions](#key-functions)
9. [Integration Flow](#integration-flow)
10. [Usage Guidelines](#usage-guidelines)
11. [Rewind Feature Integration](#rewind-feature-integration)
12. [Troubleshooting](#troubleshooting)

---

## Overview

Artifact System adalah fitur yang memungkinkan AI untuk membuat konten standalone (outline, code, section, table, citation, formula) yang terpisah dari percakapan chat. Konten ini dapat diedit, di-copy, di-download, dan memiliki version history.

### Key Features

- **AI Tool-Based Creation**: AI memutuskan kapan artifact diperlukan berdasarkan konteks
- **6 Artifact Types**: code, outline, section, table, citation, formula
- **6 Format Options**: markdown, latex, python, r, javascript, typescript
- **Web Sources Support**: field `sources` untuk sitasi inline di artifact
- **Immutable Versioning**: Setiap edit membuat versi baru, history tersimpan
- **Split Panel UI**: 50/50 layout dengan chat di kiri, artifact di kanan
- **Syntax Highlighting**: Prism dengan tema oneDark untuk artifact type `code` dan konten berformat `latex` (format terdeteksi)
- **Markdown Rendering**: MarkdownRenderer untuk konten non-code selama format bukan `latex` (outline, section, table, citation, formula)
- **Fallback Rendering**: `<pre>` untuk artifact type `code` tanpa format yang dikenali
- **Refrasa di Artifact**: Context menu + button untuk perbaikan tulisan
- **Invalidation Banner**: Badge + alert saat artifact di-invalidate oleh rewind

### Catatan Penting

- Jika web search mode aktif, `createArtifact`/`updateArtifact` tidak tersedia di turn yang sama karena constraint provider-defined tools.
- `AVAILABLE_WEB_SOURCES` akan di-inject ke system prompt jika ada hasil web search sebelumnya; sumber ini harus dipass ke tool artifact agar sitasi inline berjalan.

### Artifact Types

| Type | Icon | Use Case |
|------|------|----------|
| `code` | CodeIcon | Data analysis scripts (Python, R, JS, TS) |
| `outline` | ListIcon | Paper structures & hierarchies |
| `section` | FileTextIcon | Draft sections (Intro, Metodologi, Hasil, dst) |
| `table` | TableIcon | Formatted data & matrices |
| `citation` | BookOpenIcon | Bibliography entries & APA references |
| `formula` | FunctionSquareIcon | LaTeX mathematical formulas |

### Format Options

| Format | Extension | Rendering |
|--------|-----------|-----------|
| `python` | .py | SyntaxHighlighter (Prism/oneDark) |
| `r` | .r | SyntaxHighlighter (Prism/oneDark) |
| `javascript` | .js | SyntaxHighlighter (Prism/oneDark) |
| `typescript` | .ts | SyntaxHighlighter (Prism/oneDark) |
| `latex` | .tex | SyntaxHighlighter (Prism/oneDark) |
| `markdown` | .md | MarkdownRenderer |

---

## Rationale

### Mengapa Separate Artifacts Table?

1. **Independent Lifecycle**
   - Artifacts dapat diedit tanpa mengubah messages
   - Different retention policy (artifacts bisa disimpan selamanya)
   - Independent queries & indexes

2. **Versioning Support**
   - Linear version history dengan parentId chain
   - Tidak bisa embed versioning dalam messages (message immutable)
   - Easy to query semua versions

3. **Type-Based Filtering**
   - Index pada `type` memungkinkan fast query: "show all code artifacts"
   - Tidak mungkin dengan message embedding

4. **Scalability**
   - Foundation untuk future features: templates, sharing, export, comparison
   - Dapat menambah `artifactTemplateId`, `sharedWith`, dll
   - Separate table tidak impact message query performance

5. **Professional UX**
   - Dedicated UI workspace untuk fokus pada deliverable
   - Tidak cluttering chat history
   - Clean separation of concerns

### Mengapa Tool Calling (bukan Manual Action)?

1. **AI Intelligence**
   - AI explicitly decides kapan artifact needed
   - Bukan user yang manual tagging content
   - More natural UX

2. **Deterministic**
   - AI tidak accidentally create artifact
   - Clear rules kapan pakai tool

3. **Context-Aware**
   - AI melihat entire conversation context
   - Decides based on content, bukan user action
   - Dapat refuse ("This explanation shouldn't be artifact")

4. **Future Extensible**
   - Dapat menambah `updateArtifact` tool
   - Dapat menambah `refactorArtifact` tool
   - AI dapat orchestrate multi-step artifact creation

### Mengapa Immutable Versioning?

1. **Audit Trail**
   - Every change recorded
   - Dapat trace siapa yang mengubah apa
   - Compliance-friendly

2. **Concurrent Edits**
   - Multiple users dapat edit without conflict
   - Each creates new version
   - No locking needed

3. **Rollback Safety**
   - Dapat switch ke old version anytime
   - Old version never deleted
   - No data loss risk

4. **Simple Implementation**
   - Just insert new row
   - Set parentId reference
   - Increment version counter
   - No UPDATE needed

---

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ARTIFACT SYSTEM ARCHITECTURE                         │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌─────────────────┐
                              │   Chat Window   │
                              │   User Input    │
                              └────────┬────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────┐
                    │      POST /api/chat              │
                    │                                  │
                    │  tools = {                       │
                    │    createArtifact,               │
                    │    updateArtifact,               │
                    │    renameConversationTitle,      │
                    │    ...paperTools                 │
                    │  }                               │
                    └──────────────────────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────┐
                    │      AI Decision Engine          │
                    │                                  │
                    │  "Is this artifact-worthy?"      │
                    │  ✓ outline → createArtifact      │
                    │  ✓ code → createArtifact         │
                    │  ✗ explanation → stay in chat    │
                    └──────────────────────────────────┘
                                       │
                          ┌────────────┴────────────┐
                          │                         │
                          ▼                         ▼
                ┌─────────────────┐       ┌─────────────────┐
                │ Tool Execution  │       │ Text Response   │
                │                 │       │                 │
                │ createArtifact │       │ (no tool call)  │
                │ updateArtifact │       │                 │
                │ .execute()      │       │                 │
                └─────────────────┘       └─────────────────┘
                          │
                          ▼
                ┌──────────────────────────────────┐
                │     Convex Backend               │
                │     convex/artifacts.ts          │
                │                                  │
                │  api.artifacts.create({          │
                │    conversationId,               │
                │    userId,                       │
                │    type, title, content, format, │
                │    sources                        │
                │  })                              │
                │                                  │
                │  → Insert to artifacts table     │
                │  → Return { artifactId }         │
                └──────────────────────────────────┘
                          │
                          ▼
                ┌──────────────────────────────────┐
                │     Convex Database              │
                │     artifacts table              │
                │                                  │
                │  version: 1                      │
                │  parentId: undefined             │
                └──────────────────────────────────┘
                          │
                          ▼
                ┌──────────────────────────────────┐
                │     AI Response Stream           │
                │                                  │
                │  Text: "Saya sudah buatkan..."   │
                │  Tool Result: {                  │
                │    success: true,                │
                │    artifactId: "abc123",         │
                │    title: "..."                  │
                │  }                               │
                └──────────────────────────────────┘
                          │
                          ▼
                ┌──────────────────────────────────┐
                │     Client Processing            │
                │     ChatWindow.onFinish()        │
                │                                  │
                │  extractCreatedArtifacts(msg)    │
                │  onArtifactSelect(artifactId)    │
                └──────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
┌─────────────────────────┐ ┌─────────────────────────┐
│   MessageBubble         │ │   ChatContainer         │
│                         │ │                         │
│   Shows:                │ │   setArtifactPanelOpen  │
│   ArtifactIndicator     │ │   setSelectedArtifactId │
│   "Artifact dibuat"     │ │                         │
│   [Lihat →]             │ │   Split 50/50 layout    │
└─────────────────────────┘ └─────────────────────────┘
                                      │
                                      ▼
                          ┌───────────────────────────────────────────────────┐
                          │                 UI LAYOUT                          │
                          │                                                   │
                          │  ┌─────────────────┬─────────────────────────┐    │
                          │  │   ChatWindow    │     ArtifactPanel       │    │
                          │  │      50%        │         50%             │    │
                          │  │                 │                         │    │
                          │  │   [Messages]    │  ┌───────────┬───────┐  │    │
                          │  │                 │  │  Viewer   │ List  │  │    │
                          │  │   [Indicator]   │  │           │       │  │    │
                          │  │                 │  │  Content  │ Items │  │    │
                          │  │                 │  │  Actions  │       │  │    │
                          │  │                 │  └───────────┴───────┘  │    │
                          │  └─────────────────┴─────────────────────────┘    │
                          │                                                   │
                          └───────────────────────────────────────────────────┘
```

### Data Flow: Edit Artifact (Create New Version)

```
User clicks "Edit" in ArtifactViewer
         │
         ▼
ArtifactEditor opens with current content
         │
         ▼
User modifies content, clicks "Simpan"
         │
         ▼
handleSave(newContent) called
         │
         ▼
┌─────────────────────────────────────┐
│ useMutation(api.artifacts.update)   │
│                                     │
│ {                                   │
│   artifactId: currentArtifact._id,  │
│   userId: currentUser._id,          │
│   content: newContent               │
│ }                                   │
└─────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│ Convex Mutation:                    │
│                                     │
│ 1. Get old artifact                 │
│ 2. Validate user owns it            │
│ 3. Create NEW document with:        │
│    - version = oldVersion + 1       │
│    - parentId = oldArtifact._id     │
│    - Same conversationId, userId    │
│    - New content                    │
│ 4. Return { artifactId, version }   │
└─────────────────────────────────────┘
         │
         ▼
Toast: "Artifact diperbarui ke v{n}"
ArtifactViewer auto-refreshes (Convex reactive)
```

---

## Database Schema

### Table: artifacts

```typescript
// convex/schema.ts Lines 127-175

artifacts: defineTable({
    // Relationships
    conversationId: v.id("conversations"),  // Parent conversation
    userId: v.id("users"),                  // Owner
    messageId: v.optional(v.id("messages")), // Which message generated this

    // Artifact metadata
    type: v.union(
        v.literal("code"),
        v.literal("outline"),
        v.literal("section"),
        v.literal("table"),
        v.literal("citation"),
        v.literal("formula")
    ),
    title: v.string(),
    description: v.optional(v.string()),

    // Content
    content: v.string(),
    format: v.optional(v.union(
        v.literal("markdown"),
        v.literal("latex"),
        v.literal("python"),
        v.literal("r"),
        v.literal("javascript"),
        v.literal("typescript")
    )),

    // Web sources (from web search)
    sources: v.optional(v.array(v.object({
        url: v.string(),
        title: v.string(),
        publishedAt: v.optional(v.number()),
    }))),

    // Versioning
    version: v.number(),                    // 1, 2, 3, ...
    parentId: v.optional(v.id("artifacts")), // Link to previous version

    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),

    // Rewind Feature (Invalidation)
    invalidatedAt: v.optional(v.number()), // Timestamp when invalidated
    invalidatedByRewindToStage: v.optional(v.string()), // Stage triggering rewind
})
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_type", ["type"])
    .index("by_user", ["userId", "createdAt"])
    .index("by_parent", ["parentId"])
```

### Indexes Explained

| Index | Fields | Purpose |
|-------|--------|---------|
| `by_conversation` | `["conversationId", "createdAt"]` | List artifacts per conversation |
| `by_type` | `["type"]` | Filter by artifact type |
| `by_user` | `["userId", "createdAt"]` | List all user's artifacts |
| `by_parent` | `["parentId"]` | Find children (newer versions) |

---

## Versioning System

### Pattern: Immutable Append-Only Chain

Setiap edit membuat dokumen baru, bukan mengubah dokumen lama:

```
┌──────────────────────────────────────────────────────────────────┐
│ v1 (Root - Created)                                              │
│ _id: "abc123"                                                    │
│ title: "Research Outline"                                        │
│ content: "1. Introduction..."                                    │
│ version: 1                                                       │
│ parentId: undefined                                              │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼ (user edits)
┌──────────────────────────────────────────────────────────────────┐
│ v2                                                               │
│ _id: "def456"                                                    │
│ title: "Research Outline"                                        │
│ content: "1. Introduction (revised)..."                          │
│ version: 2                                                       │
│ parentId: "abc123" (points to v1)                                │
└──────────────────────────────────────────────────────────────────┘
         │
         ▼ (user edits again)
┌──────────────────────────────────────────────────────────────────┐
│ v3 (Latest)                                                      │
│ _id: "ghi789"                                                    │
│ title: "Research Outline"                                        │
│ content: "1. Introduction (final)..."                            │
│ version: 3                                                       │
│ parentId: "def456" (points to v2)                                │
└──────────────────────────────────────────────────────────────────┘
```

### Version Chain Traversal

```typescript
// getVersionHistory - convex/artifacts.ts Lines 167-219

// Step 1: Find root (traverse up parentId chain)
let currentId = artifactId
let current = artifact
while (current.parentId) {
    const parent = await db.get(current.parentId)
    if (!parent) break
    currentId = current.parentId
    current = parent
}
const rootId = currentId

// Step 2: Get all artifacts in conversation
const allArtifacts = await db
    .query("artifacts")
    .withIndex("by_conversation", (q) => q.eq("conversationId", artifact.conversationId))
    .collect()

// Step 3: Filter chain members (ancestors of rootId)
const chainArtifacts = allArtifacts.filter((a) => {
    let check = a
    while (check) {
        if (check._id === rootId) return true
        if (!check.parentId) return false
        const parent = allArtifacts.find((p) => p._id === check.parentId)
        if (!parent) return false
        check = parent
    }
    return false
})

// Step 4: Sort by version number
chainArtifacts.sort((a, b) => a.version - b.version)
```

### Catatan Update Version

- `update` membuat versi baru dan TIDAK mewariskan flag invalidation dari versi lama.
- `sources` akan dipertahankan dari versi lama jika parameter `sources` tidak dikirim.

### Delete Rules

1. **Single Version Delete (`remove`)**: Hanya bisa delete versi terbaru (yang tidak punya children)
2. **Chain Delete (`removeChain`)**: Delete semua versions dalam chain

```typescript
// remove - convex/artifacts.ts Lines 366-396
// Throws error if artifact has children
const children = await db
    .query("artifacts")
    .withIndex("by_parent", (q) => q.eq("parentId", artifactId))
    .collect()

if (children.length > 0) {
    throw new Error("Tidak bisa menghapus artifact yang memiliki versi lebih baru. Hapus versi terbaru terlebih dahulu.")
}
```

---

## Tool Definition

### createArtifact Tool

Location: `src/app/api/chat/route.ts` Lines 652-725

```typescript
createArtifact: tool({
    description: `Create an artifact for standalone, non-conversational content...

USE THIS TOOL WHEN generating:
✓ Paper outlines and structures (type: "outline")
✓ Draft sections: Introduction, Methodology, Results, Discussion, Conclusion (type: "section")
✓ Code snippets for data analysis in Python, R, JavaScript, TypeScript (type: "code")
✓ Tables and formatted data (type: "table")
✓ Bibliography entries and citations (type: "citation")
✓ LaTeX mathematical formulas (type: "formula")
✓ Research summaries and abstracts (type: "section")
✓ Paraphrased paragraphs (type: "section")

DO NOT use this tool for:
✗ Explanations and teaching
✗ Discussions about concepts
✗ Questions and clarifications
✗ Suggestions and feedback
✗ Meta-conversation about writing process
✗ Short answers (less than 3 sentences)

When using this tool, always provide a clear, descriptive title (max 50 chars).`,

    inputSchema: z.object({
        type: z.enum(["code", "outline", "section", "table", "citation", "formula"]),
        title: z.string().max(200),
        content: z.string().min(10),
        format: z.enum(["markdown", "latex", "python", "r", "javascript", "typescript"]).optional(),
        description: z.string().optional(),
        sources: z.array(z.object({
            url: z.string(),
            title: z.string(),
            publishedAt: z.number().optional(),
        })).optional(),
    }),

    execute: async ({ type, title, content, format, description, sources }) => {
        try {
            const result = await fetchMutation(api.artifacts.create, {
                conversationId: currentConversationId as Id<"conversations">,
                userId: userId as Id<"users">,
                type, title, content, format, description, sources
            })

            return {
                success: true,
                artifactId: result.artifactId,
                title,
                message: `Artifact "${title}" berhasil dibuat.`,
            }
        } catch (error) {
            return {
                success: false,
                error: `Gagal membuat artifact: ${error.message}`,
            }
        }
    }
})
```

### updateArtifact Tool

Location: `src/app/api/chat/route.ts` Lines 726-786

```typescript
updateArtifact: tool({
    inputSchema: z.object({
        artifactId: z.string(),
        content: z.string().min(10),
        title: z.string().max(200).optional(),
        sources: z.array(z.object({
            url: z.string(),
            title: z.string(),
            publishedAt: z.number().optional(),
        })).optional(),
    }),
    execute: async ({ artifactId, content, title, sources }) => {
        const result = await fetchMutation(api.artifacts.update, {
            artifactId: artifactId as Id<"artifacts">,
            userId: userId as Id<"users">,
            content,
            title,
            sources,
        })
        return {
            success: true,
            newArtifactId: result.artifactId,
            oldArtifactId: artifactId,
            version: result.version,
            message: `Artifact berhasil di-update ke versi ${result.version}.`,
        }
    }
})
```

### Tool Response

```typescript
// Success
{
    success: true,
    artifactId: "abc123def456",
    title: "Research Outline",
    message: "Artifact \"Research Outline\" berhasil dibuat. User dapat melihatnya di panel artifact."
}

// Error
{
    success: false,
    error: "Gagal membuat artifact: Conversation tidak ditemukan"
}
```

```typescript
// Success (updateArtifact)
{
    success: true,
    newArtifactId: "def456ghi789",
    oldArtifactId: "abc123def456",
    version: 2,
    message: "Artifact berhasil di-update ke versi 2. User dapat melihat versi baru di panel artifact."
}
```

---

## UI Components

### Component Hierarchy

```
ChatContainer
├── ChatSidebar (conversation list)
├── ChatWindow (50% when artifact panel open)
│   ├── Messages
│   │   └── MessageBubble
│   │       └── ArtifactIndicator (green button)
│   └── ChatInput
└── ArtifactPanel (50% when open)
    ├── ArtifactViewer (main content area)
│   ├── Header (title, type badge, version dropdown)
│   ├── Content (SyntaxHighlighter / MarkdownRenderer / <pre>)
    │   ├── ArtifactEditor (when editing)
    │   └── Actions (Edit, Download, Copy, History)
    └── ArtifactList (sidebar, w-56)
        ├── Type Filter
        └── Artifact Items
```

### ChatContainer

Location: `src/components/chat/ChatContainer.tsx`

**State:**
```typescript
const [artifactPanelOpen, setArtifactPanelOpen] = useState(false)
const [selectedArtifactId, setSelectedArtifactId] = useState<Id<"artifacts"> | null>(null)
```

**Layout:**
```typescript
// 50/50 split when artifact panel open
<div className={cn(
    "flex-1 transition-all duration-300 ease-in-out",
    artifactPanelOpen ? "w-1/2" : "w-full"
)}>
    <ChatWindow ... />
</div>
<div className={cn(
    "transition-all duration-300 ease-in-out overflow-hidden",
    artifactPanelOpen ? "w-1/2" : "w-0"
)}>
    <ArtifactPanel ... />
</div>
```

### ArtifactPanel

Location: `src/components/chat/ArtifactPanel.tsx`

**Features:**
- Collapsed: Shows button on right edge with artifact count
- Expanded: Split layout (Viewer + List)
- Query artifacts dengan optional type filter

### ArtifactViewer

Location: `src/components/chat/ArtifactViewer.tsx`

**Features:**
- **Header**: Title, type badge, version dropdown, description
- **Content Rendering**:
  - Artifact `code` dan konten berformat `latex`: SyntaxHighlighter dengan Prism + oneDark theme
  - Non-code tanpa format `latex`: MarkdownRenderer
  - `code` tanpa format dikenali: fallback ke `<pre>`
- **Sources Indicator**: Tampilkan `artifact.sources` jika tersedia
- **Refrasa**: Context menu + tombol Refrasa untuk perbaikan teks
- **Actions**:
  - Version History Dialog
  - Edit (opens ArtifactEditor)
  - Download (as file)
  - Copy to clipboard
  - **Invalidation Notice**: Menampilkan banner warning jika artifact ditandai invalid akibat rewind.


**Version Switching:**
```typescript
const [viewingVersionId, setViewingVersionId] = useState<Id<"artifacts"> | null>(artifactId)

// Query currently viewing version
const artifact = useQuery(
    api.artifacts.get,
    viewingVersionId && currentUser?._id
        ? { artifactId: viewingVersionId, userId: currentUser._id }
        : "skip"
)

// Query version history for dropdown
const versionHistory = useQuery(
    api.artifacts.getVersionHistory,
    artifactId && currentUser?._id
        ? { artifactId, userId: currentUser._id }
        : "skip"
)
```

### ArtifactEditor

Location: `src/components/chat/ArtifactEditor.tsx`

**Features:**
- Monospace textarea
- Character counter + unsaved indicator
- Keyboard shortcuts: Cmd/Ctrl+Enter → Save, Esc → Cancel
- Auto-focus with cursor at end

### ArtifactList

Location: `src/components/chat/ArtifactList.tsx`

**Features:**
- Type filter dropdown (Semua, Code, Outline, Section, Table, Sitasi, Formula)
- Artifact items with icon, title, version badge, type badge, date
- Selected state highlighting
- Footer with total count

### ArtifactIndicator

Location: `src/components/chat/ArtifactIndicator.tsx`

**Features:**
- Green accent styling: `bg-green-500/10 border-green-500/20`
- CheckCircleIcon + "Artifact dibuat" + title
- "Lihat →" action
- Click → opens artifact panel

### VersionHistoryDialog

Location: `src/components/chat/VersionHistoryDialog.tsx`

**Features:**
- Only shows if 2+ versions exist
- Timeline-style list (newest first)
- "Terbaru" badge for latest
- "Dilihat" badge for currently viewing
- Content preview (truncated 100 chars)
- Click to select version

---

## Key Functions

### Queries (convex/artifacts.ts)

| Function | Line | Auth | Description |
|----------|------|------|-------------|
| `get` | 34-52 | User owns artifact | Get single artifact by ID |
| `listByConversation` | 58-89 | User owns conversation | List artifacts per conversation |
| `listByUser` | 96-118 | Self | List all user's artifacts |
| `getInvalidatedByConversation` | 126-161 | User owns conversation | Get invalidated artifacts (rewind) |
| `getVersionHistory` | 167-219 | User owns artifact | Traverse parentId chain |

### Mutations (convex/artifacts.ts)

| Function | Line | Auth | Description |
|----------|------|------|-------------|
| `create` | 229-289 | User owns conversation | Create new v1 artifact |
| `update` | 296-361 | User owns artifact | Create new version (immutable) |
| `remove` | 366-396 | User owns artifact | Delete single (latest only) |
| `removeChain` | 401-453 | User owns artifact | Delete all versions |
| `clearInvalidation` | 464-491 | User owns artifact | Clear invalidation flags (rewind patch) |

### UI Functions

| Function | Component | Description |
|----------|-----------|-------------|
| `extractCreatedArtifacts()` | ChatWindow, MessageBubble | Extract artifacts from UIMessage parts |
| `handleArtifactSelect()` | ChatContainer | Open panel & select artifact |
| `handleSave()` | ArtifactViewer | Create new version via mutation |
| `handleCopy()` | ArtifactViewer | Copy content to clipboard |
| `handleDownload()` | ArtifactViewer | Download as file |
| `handleVersionChange()` | ArtifactViewer | Switch viewing version |

---

## Integration Flow

### Message Processing

```typescript
// ChatWindow.tsx - Extract artifacts from AI response
const extractCreatedArtifacts = (uiMessage: UIMessage): CreatedArtifact[] => {
    const created: CreatedArtifact[] = []

    for (const part of uiMessage.parts ?? []) {
        if (part.type !== "tool-createArtifact") continue
        if (part.state !== "output-available" && part.state !== "result") continue

        const output = part.output ?? part.result
        if (!output?.success) continue
        if (typeof output.artifactId !== "string") continue

        created.push({
            artifactId: output.artifactId,
            title: output.title,
        })
    }

    return created
}

// Auto-open artifact panel when artifact created
onFinish: ({ message }) => {
    const createdArtifacts = extractCreatedArtifacts(message)
    if (createdArtifacts.length > 0 && onArtifactSelect) {
        onArtifactSelect(createdArtifacts[createdArtifacts.length - 1].artifactId)
    }
}
```

### Message Display

```typescript
// MessageBubble.tsx - Show ArtifactIndicator
const createdArtifacts = extractCreatedArtifacts(message)

{createdArtifacts.map((created) => (
    <ArtifactIndicator
        key={created.artifactId}
        artifactId={created.artifactId}
        title={created.title}
        onSelect={onArtifactSelect}
    />
))}
```

---

## Paper Workflow & Prompt Guardrails

### System Prompt & Migration

- `src/lib/ai/chat-config.ts`: fallback system prompt memuat aturan tool (termasuk statement "Artifact bisa dibuat kapan saja")
- `src/lib/ai/paper-mode-prompt.ts`: konteks artifact invalidasi + instruksi wajib pakai `updateArtifact` untuk artifact yang di-rewind
- `convex/migrations/updatePromptWithArtifactGuidelines.ts`: migration menambahkan section artifact ke system prompt aktif
- `convex/migrations/updatePromptWithArtifactSources.ts`: migration menambahkan instruksi sources untuk artifact

### Artifact Sources Context (API Chat)

- `src/app/api/chat/route.ts`: inject `AVAILABLE_WEB_SOURCES` ke system prompt jika ada hasil web search sebelumnya (lines 314-355).

### Paper Workflow Reminder

- `src/lib/ai/paper-workflow-reminder.ts`: injeksi instruksi agar AI wajib panggil `startPaperSession` sebelum membuat artifact (outline/section) saat intent paper terdeteksi tanpa sesi

### Paper Session Integration

- `convex/schema.ts`: `paperSessions.stageData.*.artifactId` menyimpan tautan artifact per tahap
- `convex/paperSessions/types.ts`: validator stage data memasukkan `artifactId`
- `src/lib/paper/stage-types.ts`: tipe frontend menyimpan `artifactId`
- `convex/paperSessions.ts`: `deleteSession` menghapus artifacts terkait conversation saat sesi dihapus
- `convex/paperSessions.ts`: `invalidateArtifactsForStages` + `rewindToStage` menandai artifact invalid saat rewind

---

## Usage Guidelines

### WHEN to Create Artifact

#### Generic Use Cases
| Content Type | Artifact Type | Example |
|--------------|---------------|---------|
| Paper structures | `outline` | "1. Introduction\n2. Methods" |
| Draft sections | `section` | Introduction, Methodology, Results |
| Analysis code | `code` | Python/R data analysis scripts |
| Data tables | `table` | Formatted research data |
| Bibliography | `citation` | APA references list |
| Math formulas | `formula` | LaTeX equations |
| Summaries | `section` | Research abstracts |
| Paraphrases | `section` | Rewritten paragraphs |

#### Paper Workflow Mapping (Stage-Specific)
Setiap tahapan dalam Paper Workflow kini **wajib** menghasilkan artifact sebagai deliverable utama:

| Stage | Artifact Type | Format | Content Example |
|-------|---------------|--------|-----------------|
| `gagasan` | `section` | markdown | Draft Gagasan Paper & Analisis |
| `topik` | `section` | markdown | Topik Definitif & Research Gap |
| `outline` | `outline` | markdown | Struktur Hierarkis Paper |
| `abstrak` | `section` | markdown | Abstrak & Keywords |
| `pendahuluan` | `section` | markdown | Latar Belakang & Rumusan Masalah |
| `tinjauan_literatur` | `section` | markdown | Literature Review & Kerangka Teori |
| `metodologi` | `section` | markdown | Desain Penelitian & Teknik Analisis |
| `hasil` | `section` / `table` | markdown | Temuan Utama / Tabel Data |
| `diskusi` | `section` | markdown | Interpretasi & Implikasi |
| `kesimpulan` | `section` | markdown | Ringkasan & Saran |
| `daftar_pustaka` | `citation` | markdown | Daftar Pustaka Format APA 7th |
| `lampiran` | `section` | markdown | Instrumen / Data Tambahan |
| `judul` | `section` | markdown | 5 Opsi Judul & Analisis |

### WHEN NOT to Create Artifact

| Content Type | Reason |
|--------------|--------|
| Explanations | Stay in chat - conversational |
| Concept discussions | Stay in chat - back-and-forth |
| Questions | Stay in chat - needs response |
| Suggestions | Stay in chat - iterative |
| Short answers | Stay in chat - less than 3 sentences |
| Meta-conversation | Stay in chat - about writing process |

### Best Practices

1. **Clear Titles**: Max 50 chars, descriptive ("Introduction Draft v1", not "Draft")
2. **Appropriate Format**: Match format to content type (python for Python code)
3. **Meaningful Content**: Min 10 chars, substantial deliverable
4. **One Artifact Per Deliverable**: Don't bundle unrelated content
5. **Web Search Sources**: Jika artifact berbasis web search, sertakan `sources` di create/update agar sitasi inline benar

---

## Rewind Feature Integration

Artifact System terintegrasi dengan fitur **Paper Workflow Rewind**. Ketika user melakukan rewind ke tahap sebelumnya (misal: dari `topik` kembali ke `gagasan`), artifacts yang "lebih baru" dari target rewind perlu ditandai sebagai **invalid** atau "perlu revisi".

### Mekanisme Invalidation

1. **Trigger**: User melakukan rewind di UI Paper Flow.
2. **Backend**: `rewindToStage` mutation mencari semua artifact yang dibuat SETELAH target stage.
3. **Patch**: Artifact tersebut di-update dengan field:
   - `invalidatedAt`: Timestamp rewind.
   - `invalidatedByRewindToStage`: Nama stage tujuan rewind.

### UI Handling

- **ArtifactViewer**: Menampilkan `Alert` warning warna amber.
- **Badge**: Menampilkan icon peringatan pada badge tipe artifact.
- **Tooltip**: Menjelaskan alasan invalidasi (e.g., "Invalidated by rewind to 'Gagasan'").

### Resolution

Ketika user mengedit dan men-save artifact yang invalid:
1. `update` mutation membuat **versi baru** (v+1).
2. Versi baru ini **bersih** dari flag invalidation (`invalidatedAt: undefined`).
3. Warning hilang di UI untuk versi baru tersebut.

Alternatifnya, user bisa meminta AI untuk "perbaiki artifact ini", dan AI akan menggunakan tool `createArtifact` (atau update) yang juga menghasilkan versi baru yang valid.

---

## Troubleshooting

### Artifact tidak muncul setelah AI create

1. **Cek tool response**: Console log `[createArtifact] Success` atau `Failed`
2. **Cek conversation ID**: Pastikan currentConversationId valid
3. **Cek user permissions**: User harus owner conversation

### Version history tidak lengkap

1. **parentId chain broken**: Check if any version deleted incorrectly
2. **Query error**: Check Convex logs for errors
3. **Different conversation**: Version history per conversation only

### Edit tidak tersimpan

1. **Content validation**: Min 10 chars, cannot be empty
2. **Permission denied**: Must be artifact owner
3. **Network error**: Check Convex connection

### Artifact panel tidak muncul

1. **No artifacts**: Panel hidden if no artifacts in conversation
2. **State not updated**: Check ChatContainer state
3. **CSS transition**: Wait 300ms for animation

### Sitasi inline di artifact tidak muncul

1. **sources tidak terisi**: Pastikan `sources` dipass saat `createArtifact`/`updateArtifact`
2. **Context tidak masuk**: Cek `AVAILABLE_WEB_SOURCES` di `/api/chat` sudah ter-inject
3. **Artifact tanpa sources**: Pastikan field `sources` ada di record artifact

### Syntax highlighting tidak bekerja

1. **Format not set**: Artifact must have format field
2. **Unknown language**: Check formatToLanguage mapping
3. **Code artifact only**: Other types use MarkdownRenderer

---

## Related Documentation

- **CLAUDE.md**: Section "Artifacts"
- **Files Index**: `.references/artifact/files-index.md`
- **Spec**: `.development/specs/artifact/`

---

*Last updated: 2026-01-14*
