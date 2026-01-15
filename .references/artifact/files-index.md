# Artifact System - Files Index

Quick reference untuk lokasi semua files terkait Artifact System.

## Quick Jump

| Category | Count | Files |
|----------|-------|-------|
| [Backend (Convex Core)](#backend-convex-core) | 2 | Schema, CRUD mutations |
| [Backend (Paper Workflow Integration)](#backend-paper-workflow-integration) | 2 | Session cleanup, stage validators |
| [API (Tool Definition)](#api-tool-definition) | 1 | Chat route with createArtifact |
| [Prompt & Guardrails](#prompt--guardrails) | 3 | Fallback prompt, paper prompt, workflow reminder |
| [Migrations](#migrations) | 2 | Prompt update for artifact guidelines + sources |
| [UI Components](#ui-components) | 9 | Panel, viewer, editor, list, sources, etc |
| [Integration](#integration) | 2 | ChatWindow, MessageBubble |
| [Frontend Types](#frontend-types) | 1 | Paper stage types with artifactId |
| **Total** | **22** | |

---

## Backend (Convex Core)

```
convex/
├── schema.ts                         # artifacts table definition (lines 127-179)
└── artifacts.ts                      # CRUD queries & mutations (1-492)
```

### Schema Definition (convex/schema.ts:127-179)

```typescript
artifacts: defineTable({
    conversationId: v.id("conversations"),
    userId: v.id("users"),
    messageId: v.optional(v.id("messages")),
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
    content: v.string(),
    format: v.optional(v.union(
        v.literal("markdown"),
        v.literal("latex"),
        v.literal("python"),
        v.literal("r"),
        v.literal("javascript"),
        v.literal("typescript")
    )),
    sources: v.optional(v.array(v.object({
        url: v.string(),
        title: v.string(),
        publishedAt: v.optional(v.number()),
    }))),
    version: v.number(),
    parentId: v.optional(v.id("artifacts")),
    createdAt: v.number(),
    updatedAt: v.number(),

    // Rewind Feature (Invalidation)
    invalidatedAt: v.optional(v.number()),
    invalidatedByRewindToStage: v.optional(v.string()),
})
    .index("by_conversation", ["conversationId", "createdAt"])
    .index("by_type", ["type"])
    .index("by_user", ["userId", "createdAt"])
    .index("by_parent", ["parentId"])
```

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

### Type Validators (convex/artifacts.ts)

| Validator | Line | Values |
|-----------|------|--------|
| `artifactTypeValidator` | 8-15 | code, outline, section, table, citation, formula |
| `artifactFormatValidator` | 17-24 | markdown, latex, python, r, javascript, typescript |

---

## Backend (Paper Workflow Integration)

```
convex/
├── paperSessions.ts                 # Delete artifacts when session is deleted (lines 686-733)
└── paperSessions/types.ts           # Stage validators include artifactId (lines 14-259)
```

### Session Cleanup (convex/paperSessions.ts:686-733)

- `deleteSession` menghapus semua artifacts dalam conversation sebelum menghapus session.

### Stage Data Links (convex/paperSessions/types.ts:14-259)

- Setiap stage data memiliki `artifactId` optional untuk mengaitkan output ke artifact.

### Stage Data Schema (convex/schema.ts:246-355)

- `paperSessions.stageData.*.artifactId` tersimpan di schema Convex.

---

## API (Tool Definition)

```
src/app/api/chat/
└── route.ts                          # createArtifact + updateArtifact tool (lines 652-786)
```

### Tool Definition (src/app/api/chat/route.ts:652-786)

| Line | What's There |
|------|--------------|
| 652 | `createArtifact: tool({` - Tool declaration |
| 653-678 | Tool description with usage guidelines + sources |
| 679-696 | Input schema (Zod validation) |
| 697-725 | Execute function |
| 726 | `updateArtifact: tool({` - Tool declaration |
| 727-745 | Tool description for update |
| 746-759 | Input schema update |
| 760-786 | Execute function update |

### Tool Input Schema

```typescript
// Lines 679-696
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
})
```

---

## Prompt & Guardrails

```
src/lib/ai/
├── chat-config.ts                   # Fallback system prompt (lines 13-46)
├── paper-mode-prompt.ts             # Paper mode prompt + invalidated artifacts (lines 18-107)
└── paper-workflow-reminder.ts       # Guardrail agar tidak membuat artifact sebelum session (lines 15-69)
```

### System Prompt Fallback (src/lib/ai/chat-config.ts:13-46)

- Fallback prompt memuat aturan tool termasuk statement "Artifact bisa dibuat kapan saja".

### Paper Mode Prompt (src/lib/ai/paper-mode-prompt.ts:18-107)

- Menyertakan konteks artifact invalidasi + instruksi wajib `updateArtifact`.

### Paper Workflow Reminder (src/lib/ai/paper-workflow-reminder.ts:15-69)

- Injeksi instruksi yang melarang `createArtifact` sebelum `startPaperSession` aktif.

### Artifact Sources Context (src/app/api/chat/route.ts:314-355)

- Inject `AVAILABLE_WEB_SOURCES` agar AI bisa pass `sources` ke tool artifact.

---

## Migrations

```
convex/migrations/
├── updatePromptWithArtifactGuidelines.ts  # Tambah section artifact ke system prompt aktif (1-125)
└── updatePromptWithArtifactSources.ts     # Tambah instruksi sources ke system prompt (1-125)
```

---

## UI Components

```
src/components/chat/
├── ChatContainer.tsx                 # Split panel layout management (1-140)
├── ArtifactPanel.tsx                 # Collapsible panel container (1-120)
├── ArtifactViewer.tsx                # Main display + edit + actions (1-550)
├── ArtifactEditor.tsx                # Inline textarea editor (1-106)
├── ArtifactList.tsx                  # Sidebar artifact list + filter (1-192)
├── ArtifactIndicator.tsx             # "Artifact dibuat" message button (1-44)
├── VersionHistoryDialog.tsx          # Version browser modal (1-149)
├── SourcesIndicator.tsx              # Sources panel for artifact + chat (1-110)
└── MarkdownRenderer.tsx              # Markdown rendering for artifacts (1-542)
```

### ChatContainer (src/components/chat/ChatContainer.tsx)

| Line | What's There |
|------|--------------|
| 20-22 | Artifact state: `artifactPanelOpen`, `selectedArtifactId` |
| 25-34 | `handleArtifactSelect()` + `toggleArtifactPanel()` |
| 36-48 | Reset panel saat membuat chat baru |
| 51-64 | Reset panel saat delete conversation |
| 104-118 | ChatWindow section (50% when open) |
| 121-135 | ArtifactPanel section (50% when open) |

### ArtifactPanel (src/components/chat/ArtifactPanel.tsx)

| Line | What's There |
|------|--------------|
| 15 | `ArtifactType` type definition |
| 17-23 | Props interface |
| 32 | `typeFilter` state |
| 36-45 | Query artifacts with filter |
| 49-68 | Collapsed state (right edge button) |
| 71-118 | Expanded state (header + split layout) |
| 103-105 | ArtifactViewer placement |
| 108-116 | ArtifactList placement (w-56 sidebar) |

### ArtifactViewer (src/components/chat/ArtifactViewer.tsx)

| Line | What's There |
|------|--------------|
| 46-54 | `typeIcons` mapping |
| 56-64 | `formatToLanguage` mapping (for syntax highlighting) |
| 66-74 | `formatToExtension` mapping (for download) |
| 113-118 | Component state (copied, isEditing, isSaving, viewingVersionId) |
| 130 | `updateArtifact` mutation hook |
| 137-143 | Query current artifact |
| 145-151 | Query version history |
| 153-165 | `handleCopy()` - Copy to clipboard |
| 167-185 | `handleSave()` - Create new version |
| 188-217 | `handleDownload()` - Download as file |
| 220-222 | `handleVersionChange()` - Switch version |
| 323-396 | Header section (title, type, version, **invalidation warning**) |
| 398-412 | **Invalidation Alert Banner** (rewind warning) |
| 435-458 | Content rendering (SyntaxHighlighter / MarkdownRenderer / `<pre>`) |
| 472-476 | **Sources Indicator** |
| 480-532 | Actions section (Edit, Download, Copy, History, Refrasa) |

### ArtifactEditor (src/components/chat/ArtifactEditor.tsx)

| Line | What's There |
|------|--------------|
| 9-14 | Props interface |
| 15-16 | `editedContent` state |
| 18-28 | Auto-focus with cursor at end |
| 31-43 | Keyboard shortcuts (Cmd+Enter, Esc) |
| 59-68 | Textarea element |
| 73-78 | Character counter + unsaved indicator |
| 80-97 | Cancel & Save buttons |

### ArtifactList (src/components/chat/ArtifactList.tsx)

| Line | What's There |
|------|--------------|
| 24 | `ArtifactType` type definition |
| 42-50 | `typeIcons` mapping |
| 52-60 | `typeLabels` mapping (Indonesian) |
| 62-71 | `filterOptions` array |
| 34-40 | Props interface |
| 88-94 | `handleFilterChange()` |
| 104-118 | Type filter dropdown |
| 121-181 | Artifact list rendering |
| 185-189 | Footer with count |

### ArtifactIndicator (src/components/chat/ArtifactIndicator.tsx)

| Line | What's There |
|------|--------------|
| 6-10 | Props interface |
| 12-15 | `handleClick()` |
| 17-22 | `handleKeyDown()` (Enter/Space) |
| 25-42 | Button element with green styling |
| 33 | CheckCircleIcon |
| 35-36 | "Artifact dibuat" + title |
| 38-40 | "Lihat" action |

### VersionHistoryDialog (src/components/chat/VersionHistoryDialog.tsx)

| Line | What's There |
|------|--------------|
| 19-23 | Props interface |
| 49-54 | Query version history |
| 56-61 | Early return if < 2 versions |
| 63-147 | Dialog content |
| 86-137 | Version timeline list |
| 104-108 | Timeline dot indicator |
| 112-120 | "Terbaru" and "Dilihat" badges |
| 131-134 | Content preview (truncated) |

---

## Integration

```
src/components/chat/
├── ChatWindow.tsx                    # Extract artifacts from AI response (94-128)
└── MessageBubble.tsx                 # Render ArtifactIndicator (82-118, 399-410)
```

### ChatWindow (src/components/chat/ChatWindow.tsx)

| Line | What's There |
|------|--------------|
| 94-128 | `extractCreatedArtifacts()` function |
| 107 | Check for `tool-createArtifact` type |
| 109-111 | Check state: `output-available` or `result` |
| 113-120 | Validate output success |
| 133-138 | `onFinish` callback - auto-open artifact panel |

### MessageBubble (src/components/chat/MessageBubble.tsx)

| Line | What's There |
|------|--------------|
| 82-118 | `extractCreatedArtifacts()` function (title wajib string) |
| 317 | Call `extractCreatedArtifacts(message)` |
| 399-410 | Render `ArtifactIndicator` for each created artifact |

---

## Frontend Types

```
src/lib/paper/
└── stage-types.ts                    # Stage data includes artifactId (1-226)
```

---

## Database Indexes

| Index | Fields | Usage |
|-------|--------|-------|
| `by_conversation` | `["conversationId", "createdAt"]` | `listByConversation()` |
| `by_type` | `["type"]` | Filter by artifact type |
| `by_user` | `["userId", "createdAt"]` | `listByUser()` |
| `by_parent` | `["parentId"]` | Find children in `remove()` |

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARTIFACT CREATION FLOW                             │
│                                                                             │
│  User message → /api/chat → AI decides → createArtifact tool                │
│       │                                        │                            │
│       └────────────────────────────────────────┘                            │
│                                    │                                         │
│                                    ▼                                         │
│              Convex mutation → Insert to artifacts table                     │
│                                    │                                         │
│                                    ▼                                         │
│              Tool result in stream → ChatWindow.onFinish()                   │
│                                    │                                         │
│                                    ▼                                         │
│              handleArtifactSelect() → ArtifactPanel opens                    │
│                                    │                                         │
│                                    ▼                                         │
│              ArtifactViewer loads → SyntaxHighlighter/MarkdownRenderer/<pre> │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           ARTIFACT EDIT FLOW                                 │
│                                                                             │
│  Edit button → ArtifactEditor → handleSave() → api.artifacts.update         │
│       │                                              │                       │
│       └──────────────────────────────────────────────┘                      │
│                                    │                                         │
│                                    ▼                                         │
│              Create NEW artifact row with parentId = oldId                   │
│                                    │                                         │
│                                    ▼                                         │
│              Convex reactive update → ArtifactViewer auto-refreshes          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Search Patterns

```bash
# Find all artifact related files
rg -g "*.ts" -g "*.tsx" -l "artifact|Artifact" src/ convex/

# Find tool definition
rg -n "createArtifact.*tool" src/app/api/

# Find artifact state management
rg -n "selectedArtifactId|artifactPanelOpen" src/components/

# Find version history logic
rg -n "parentId|getVersionHistory" convex/

# Find artifact extraction from messages
rg -n "extractCreatedArtifacts|tool-createArtifact" src/components/
```

---

## Quick Reference: Key Lines

| File | Line(s) | What's There |
|------|---------|--------------|
| `convex/schema.ts` | 127-179 | artifacts table definition |
| `convex/schema.ts` | 246-355 | `paperSessions.stageData.*.artifactId` |
| `convex/artifacts.ts` | 8-15 | `artifactTypeValidator` |
| `convex/artifacts.ts` | 229-289 | `create` mutation |
| `convex/artifacts.ts` | 296-361 | `update` mutation (versioning) |
| `convex/artifacts.ts` | 167-219 | `getVersionHistory` query |
| `convex/paperSessions.ts` | 686-733 | `deleteSession` cleanup artifacts |
| `convex/paperSessions.ts` | 934-1059 | `rewindToStage` + invalidasi artifact |
| `convex/paperSessions/types.ts` | 14-259 | `artifactId` di validator stage |
| `convex/migrations/updatePromptWithArtifactGuidelines.ts` | 1-125 | Section guidelines artifact |
| `convex/migrations/updatePromptWithArtifactSources.ts` | 1-125 | Instruksi sources artifact |
| `src/lib/ai/chat-config.ts` | 13-46 | Fallback prompt aturan tool |
| `src/lib/ai/paper-mode-prompt.ts` | 18-107 | Paper prompt + invalidated artifacts |
| `src/lib/ai/paper-workflow-reminder.ts` | 15-69 | Guardrail paper workflow |
| `src/lib/paper/stage-types.ts` | 1-226 | `artifactId` di tipe stage frontend |
| `src/app/api/chat/route.ts` | 314-355 | `AVAILABLE_WEB_SOURCES` injection |
| `src/app/api/chat/route.ts` | 652-786 | `createArtifact` + `updateArtifact` tool |
| `src/components/chat/ChatContainer.tsx` | 20-22 | Artifact state |
| `src/components/chat/ChatContainer.tsx` | 104-135 | 50/50 split layout |
| `src/components/chat/ArtifactViewer.tsx` | 167-185 | handleSave (versioning) |
| `src/components/chat/ArtifactViewer.tsx` | 435-458 | SyntaxHighlighter/MarkdownRenderer |
| `src/components/chat/ChatWindow.tsx` | 94-128 | extractCreatedArtifacts |
| `src/components/chat/MessageBubble.tsx` | 399-410 | ArtifactIndicator render |

---

*Last updated: 2026-01-14*
