# ChatSidebar - Files Index

Quick reference untuk lokasi file utama terkait ChatSidebar component.

## Quick Jump

| Category | Count | Files |
|----------|-------|-------|
| [Core Components](#core-components) | 5 | ChatSidebar, ChatContainer, ChatWindow, ArtifactPanel, PaperSessionBadge |
| [Rute](#rute) | 2 | chat page, chat/[conversationId] |
| [Komponen UI](#komponen-ui) | 6 | alert-dialog, button, context-menu, input, skeleton, sheet |
| [Ekspor Barrel](#ekspor-barrel) | 1 | components/paper/index |
| [Utilitas](#utilitas) | 2 | utils, date/formatters |
| [Hooks](#hooks) | 2 | useConversations, useCurrentUser |
| [Backend Queries](#backend-queries) | 5 | conversations, chatHelpers, paperSessions, artifacts, users |
| [Constants](#constants) | 1 | paperSessions/constants |
| **Total** | **24** | |

---

## Core Components

```
src/components/chat/
├── ChatSidebar.tsx               # Komponen utama sidebar (409 lines)
├── ChatContainer.tsx             # Orchestrator sidebar + chat window (140 lines)
├── ChatWindow.tsx                # Pemicu menu mobile (tombol menu)
└── ArtifactPanel.tsx             # Panel artifacts (120 lines)

src/components/paper/
└── PaperSessionBadge.tsx         # Badge progress paper (x/13)
```

### ChatSidebar (src/components/chat/ChatSidebar.tsx)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 3 | `import { useState, useRef, useEffect } from "react"` |
| 4 | `import Link from "next/link"` |
| 5 | `import { Button } from "@/components/ui/button"` |
| 6 | `import { Input } from "@/components/ui/input"` |
| 7 | Import icons: `Loader2Icon`, `PlusIcon`, `MessageSquareIcon`, `TrashIcon`, `PencilIcon` |
| 8 | Import `Id` dari Convex |
| 10-11 | `useQuery`, `api` imports |
| 12 | `useCurrentUser` hook |
| 13 | `PaperSessionBadge` import |
| 14 | `getStageNumber`, `PaperStageId` imports |
| 15 | `formatRelativeTime` import dari `@/lib/date/formatters` |
| 16 | `import { toast } from "sonner"` |
| 17-26 | AlertDialog imports |
| 27-33 | ContextMenu imports |
| 35-49 | Interface `ChatSidebarProps` |
| 62 | `useCurrentUser()` untuk get user |
| 65-68 | `useQuery(api.paperSessions.getByUser)` |
| 71-73 | Create `paperSessionMap` untuk O(1) lookup |
| 76-80 | State untuk delete confirmation dialog |
| 83-86 | State untuk inline edit mode (`editingId`, `editValue`, `isUpdating`, `editInputRef`) |
| 89-94 | useEffect untuk auto-focus input saat edit mode aktif |
| 97-100 | `handleStartEdit()` - memulai edit mode |
| 103-135 | `handleSaveEdit()` - menyimpan edit dengan validasi |
| 138-141 | `handleCancelEdit()` - membatalkan edit |
| 144-152 | `handleEditKeyDown()` - keyboard handlers (Enter=save, Escape=cancel) |
| 155-158 | `handleDeleteClick()` - buka dialog |
| 161-167 | `handleConfirmDelete()` - konfirmasi delete |
| 172-176 | Header "Makalah Chat" (div.p-4.border-b) |
| 177-196 | "+ New Chat" button dengan loading state |
| 201-209 | Loading skeleton |
| 210-214 | Empty state (no conversations) |
| 216-374 | Conversation list dengan conditional rendering |
| 222-226 | `itemClasses` - shared classes untuk Link dan div |
| 229-333 | `renderContent()` - content untuk edit mode dan normal mode |
| 234-243 | Input field saat editing dengan validasi visual |
| 245-255 | Title span dengan `onDoubleClick` trigger |
| 257-261 | `PaperSessionBadge` rendering (hidden saat editing) |
| 263-267 | Relative date (hidden saat editing) |
| 270-326 | Action buttons (edit & delete) - hidden saat editing |
| 274-298 | Edit button (PencilIcon) - hidden untuk paper session |
| 301-325 | Delete button (TrashIcon) |
| 329-331 | Loading indicator saat updating |
| 336-372 | ContextMenu wrapper dengan conditional Link/div |
| 338-342 | `isEditing ? <div> : <Link>` pattern |
| 355-371 | ContextMenuContent dengan Edit Judul dan Hapus |
| 386-406 | AlertDialog untuk delete confirmation |

**Props Interface:**

```typescript
interface ChatSidebarProps {
    conversations: Array<{
        _id: Id<"conversations">
        title: string
        lastMessageAt: number
    }>
    currentConversationId: string | null
    onNewChat: () => void
    onDeleteConversation: (id: Id<"conversations">) => void
    onUpdateConversationTitle?: (id: Id<"conversations">, title: string) => Promise<void>
    className?: string
    onCloseMobile?: () => void
    isLoading?: boolean
    isCreating?: boolean
}
```

**Edit State & Handlers:**

```typescript
// State untuk inline edit mode
const [editingId, setEditingId] = useState<Id<"conversations"> | null>(null)
const [editValue, setEditValue] = useState("")
const [isUpdating, setIsUpdating] = useState(false)
const editInputRef = useRef<HTMLInputElement>(null)

// Auto-focus input saat edit mode aktif
useEffect(() => {
    if (editingId && editInputRef.current) {
        editInputRef.current.focus()
        editInputRef.current.select()
    }
}, [editingId])

// Handler untuk memulai edit mode
const handleStartEdit = (id: Id<"conversations">, title: string) => {
    setEditingId(id)
    setEditValue(title)
}

// Handler untuk menyimpan edit
const handleSaveEdit = async () => {
    if (!editingId || !onUpdateConversationTitle) {
        setEditingId(null)
        return
    }

    const trimmedValue = editValue.trim()
    const originalTitle = conversations.find(c => c._id === editingId)?.title ?? ""

    // Skip jika kosong atau tidak berubah
    if (!trimmedValue || trimmedValue === originalTitle) {
        setEditingId(null)
        setEditValue("")
        return
    }

    // Validation: max 50 characters
    if (trimmedValue.length > 50) {
        toast.error("Judul maksimal 50 karakter")
        return
    }

    setIsUpdating(true)
    try {
        await onUpdateConversationTitle(editingId, trimmedValue)
    } catch {
        toast.error("Gagal menyimpan judul")
    } finally {
        setIsUpdating(false)
        setEditingId(null)
        setEditValue("")
    }
}

// Handler untuk cancel edit
const handleCancelEdit = () => {
    setEditingId(null)
    setEditValue("")
}

// Handler keyboard untuk edit input
const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
        e.preventDefault()
        handleSaveEdit()
    } else if (e.key === "Escape") {
        e.preventDefault()
        handleCancelEdit()
    }
}
```

**Delete Confirmation State & Handlers:**

```typescript
// State untuk delete confirmation dialog
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [conversationToDelete, setConversationToDelete] = useState<{
    id: Id<"conversations">
    title: string
} | null>(null)

// Handler untuk membuka dialog konfirmasi delete
const handleDeleteClick = (id: Id<"conversations">, title: string) => {
    setConversationToDelete({ id, title })
    setDeleteDialogOpen(true)
}

// Handler untuk konfirmasi delete
const handleConfirmDelete = () => {
    if (conversationToDelete) {
        onDeleteConversation(conversationToDelete.id)
    }
    setDeleteDialogOpen(false)
    setConversationToDelete(null)
}
```

### ChatContainer (src/components/chat/ChatContainer.tsx)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 4 | `import { useRouter } from "next/navigation"` |
| 5 | `ChatSidebar` import |
| 8 | `useConversations` hook import |
| 13-15 | Interface `{ conversationId: string | null }` |
| 17-23 | State setup: router, isMobileOpen, artifactPanelOpen, selectedArtifactId, isCreating |
| 23 | Destructure `updateConversationTitle` dari useConversations |
| 36-49 | `handleNewChat()` reset artifact + `router.push(/chat/${newId})` |
| 51-64 | `handleDeleteConversation()` dengan race condition fix |
| 66-68 | `handleUpdateConversationTitle()` - wrapper untuk update title |
| 73-82 | Desktop ChatSidebar (hidden on mobile) dengan `onUpdateConversationTitle` prop |
| 85-101 | Mobile Sheet dengan ChatSidebar dan `onUpdateConversationTitle` prop |

**Key Functions:**

```typescript
// handleNewChat - Navigate setelah create
const handleNewChat = async () => {
    if (isCreating) return  // Guard double-click
    setIsCreating(true)
    try {
        const newId = await createNewConversation()
        if (newId) {
            setArtifactPanelOpen(false)
            setSelectedArtifactId(null)
            router.push(`/chat/${newId}`)
        }
    } finally {
        setIsCreating(false)
    }
}

// handleDeleteConversation - Close artifact panel SEBELUM delete (race condition fix)
const handleDeleteConversation = async (id: string) => {
    // PENTING: Close artifact panel SEBELUM delete untuk menghindari race condition
    if (conversationId === id) {
        setArtifactPanelOpen(false)
        setSelectedArtifactId(null)
    }

    await deleteConversation(id as Id<"conversations">)

    if (conversationId === id) {
        router.push('/chat')
    }
}

// handleUpdateConversationTitle - Wrapper untuk update title
const handleUpdateConversationTitle = async (id: Id<"conversations">, title: string) => {
    await updateConversationTitle(id, title)
}
```

### ChatWindow (src/components/chat/ChatWindow.tsx)

| Line | What's There |
|------|--------------|
| 23-26 | `ChatWindowProps` include `onMobileMenuClick` |
| 341-350 | Header mobile (empty state) + tombol menu |
| 365-370 | Header mobile (not found) + tombol menu |
| 386-391 | Header mobile utama + tombol menu |

### ArtifactPanel (src/components/chat/ArtifactPanel.tsx)

| Line | What's There |
|------|--------------|
| 36-44 | `useQuery(api.artifacts.listByConversation)` |
| 50-68 | Collapsed state (button kanan) |
| 71-118 | Expanded panel layout |

### PaperSessionBadge (src/components/paper/PaperSessionBadge.tsx)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 3 | `import React from "react"` |
| 4 | `FileText` icon import |
| 5 | `STAGE_ORDER` import |
| 6 | `cn()` import untuk className |
| 8-12 | Interface `PaperSessionBadgeProps` |
| 18-35 | Component dengan badge rendering |
| 20 | Default `totalStages = STAGE_ORDER.length` |
| 30 | Tooltip: "Paper mode: Tahap n dari totalStages" |
| 32-33 | Icon + "n/13" text |

**Props Interface:**

```typescript
interface PaperSessionBadgeProps {
    stageNumber: number
    totalStages?: number  // default: STAGE_ORDER.length (13)
    className?: string
}
```

---

## Rute

```
src/app/chat/
├── page.tsx                        # Landing /chat
└── [conversationId]/page.tsx       # Chat detail
```

---

## Komponen UI

```
src/components/ui/
├── alert-dialog.tsx                # Dialog konfirmasi hapus
├── button.tsx                      # Tombol (New Chat, menu mobile)
├── context-menu.tsx                # Context menu untuk right-click (Edit, Hapus)
├── input.tsx                       # Input field untuk inline edit
├── skeleton.tsx                    # Loading state di list
└── sheet.tsx                       # Sidebar mobile (Sheet)
```

### alert-dialog.tsx (src/components/ui/alert-dialog.tsx)

| Line | What's There |
|------|--------------|
| 9-13 | `AlertDialog` (Root) |
| 15-21 | `AlertDialogTrigger` |
| 23-29 | `AlertDialogPortal` |
| 31-44 | `AlertDialogOverlay` |
| 47-64 | `AlertDialogContent` (dengan overlay) |
| 66-77 | `AlertDialogHeader` |
| 79-93 | `AlertDialogFooter` |
| 95-106 | `AlertDialogTitle` |
| 108-119 | `AlertDialogDescription` |
| 121-131 | `AlertDialogAction` |
| 133-143 | `AlertDialogCancel` |

### context-menu.tsx (src/components/ui/context-menu.tsx)

| Export | Purpose |
|--------|---------|
| `ContextMenu` | Root container |
| `ContextMenuTrigger` | Element yang trigger context menu (dengan `asChild`) |
| `ContextMenuGroup` | Grouping untuk item terkait |
| `ContextMenuPortal` | Portal wrapper untuk content |
| `ContextMenuSub` | Wrapper untuk submenu |
| `ContextMenuSubTrigger` | Trigger untuk submenu |
| `ContextMenuSubContent` | Konten submenu |
| `ContextMenuContent` | Popup content |
| `ContextMenuItem` | Menu item (`inset`, `variant`, `disabled`) |
| `ContextMenuCheckboxItem` | Item checkbox |
| `ContextMenuRadioGroup` | Grup radio |
| `ContextMenuRadioItem` | Item radio |
| `ContextMenuLabel` | Label section |
| `ContextMenuSeparator` | Separator antar menu items |
| `ContextMenuShortcut` | Shortcut text di kanan |

**Usage di ChatSidebar:**

```tsx
<ContextMenu key={conv._id}>
    <ContextMenuTrigger asChild>
        {isEditing ? (
            <div className={itemClasses}>{renderContent()}</div>
        ) : (
            <Link href={`/chat/${conv._id}`} className={itemClasses}>
                {renderContent()}
            </Link>
        )}
    </ContextMenuTrigger>
    <ContextMenuContent>
        <ContextMenuItem
            onClick={() => handleStartEdit(conv._id, conv.title)}
            disabled={hasPaperSession}
        >
            <PencilIcon className="h-4 w-4 mr-2" />
            Edit Judul
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
            onClick={() => handleDeleteClick(conv._id, conv.title)}
            className="text-destructive focus:text-destructive"
        >
            <TrashIcon className="h-4 w-4 mr-2" />
            Hapus
        </ContextMenuItem>
    </ContextMenuContent>
</ContextMenu>
```

---

## Ekspor Barrel

```
src/components/paper/
└── index.ts                        # Barrel export komponen paper
    - PaperStageProgress
    - PaperValidationPanel
    - PaperSessionBadge
    - PaperSessionsContainer
    - PaperSessionsList
    - PaperSessionCard
    - PaperSessionsEmpty
```

---

## Utilitas

```
src/lib/
├── utils.ts                        # cn() untuk className
└── date/
    └── formatters.ts               # Relative date formatting (28 lines)
```

### formatters.ts (src/lib/date/formatters.ts)

| Line | What's There |
|------|--------------|
| 1 | `import { formatDistanceToNow, format } from "date-fns"` |
| 2 | `import { id as localeId } from "date-fns/locale"` |
| 4 | `ONE_YEAR_MS` constant (365 hari dalam ms) |
| 6-11 | JSDoc comment |
| 12-28 | `formatRelativeTime(timestamp)` function |

**Function:**

```typescript
/**
 * Format waktu relatif untuk conversation list.
 *
 * - Jika < 1 tahun: "5 menit lalu", "2 jam lalu", "3 hari lalu"
 * - Jika >= 1 tahun: "13 Jan 2024" (absolute date)
 */
export function formatRelativeTime(timestamp: number): string {
    const diffInMs = Date.now() - timestamp

    if (diffInMs >= ONE_YEAR_MS) {
        // Lebih dari 1 tahun: tampilkan absolute date
        return format(timestamp, "d MMM yyyy", { locale: localeId })
    }

    // Kurang dari 1 tahun: tampilkan relative time
    const relative = formatDistanceToNow(timestamp, {
        addSuffix: true,
        locale: localeId,
    })

    // "5 menit yang lalu" -> "5 menit lalu" (lebih ringkas)
    return relative.replace(" yang lalu", " lalu")
}
```

---

## Hooks

```
src/lib/hooks/
├── useConversations.ts           # CRUD conversations (67 lines)
└── useCurrentUser.ts             # Get current Convex user
```

### useConversations (src/lib/hooks/useConversations.ts)

| Line | What's There |
|------|--------------|
| 1 | `"use client"` directive |
| 3 | `useQuery`, `useMutation` imports |
| 5 | `useUser` dari Clerk |
| 8-16 | Resolve Clerk ID → Convex User ID |
| 19-22 | Query conversations via `api.conversations.listConversations` |
| 25-27 | Create/Delete/Update mutations |
| 29-36 | `createNewConversation()` - title: "Percakapan baru" |
| 38-40 | `deleteConversation(id)` |
| 42-57 | `updateConversationTitle(id, title)` - update title dengan error handling |
| 59-66 | Return object |

**Return Type:**

```typescript
{
    conversations: Array<Conversation>  // [] if undefined
    createNewConversation: () => Promise<Id<"conversations"> | null>
    deleteConversation: (id: Id<"conversations">) => Promise<void>
    updateConversationTitle: (id: Id<"conversations">, title: string) => Promise<{ success: boolean }>
    isLoading: boolean
    userId: Id<"users"> | null | undefined
}
```

**updateConversationTitle Implementation:**

```typescript
const updateTitleMutation = useMutation(api.conversations.updateConversationTitleFromUser)

const updateConversationTitle = async (
    conversationId: Id<"conversations">,
    title: string
): Promise<{ success: boolean }> => {
    if (!userId) return { success: false }
    try {
        const result = await updateTitleMutation({
            conversationId,
            userId,
            title,
        })
        return result ?? { success: true }
    } catch {
        return { success: false }
    }
}
```

---

## Backend Queries

```
convex/
├── conversations.ts              # CRUD conversations
├── chatHelpers.ts                # Clerk → Convex user lookup
├── paperSessions.ts              # Paper session queries
├── artifacts.ts                  # Artifact queries (graceful handling)
└── users.ts                      # Lookup user by Clerk ID
```

### conversations.ts (convex/conversations.ts)

| Line | What's There |
|------|--------------|
| 5-14 | `listConversations({ userId })` - last 50, desc order |
| 17-22 | `getConversation({ conversationId })` |
| 25-42 | `createConversation({ userId, title? })` |
| 124-140 | `deleteConversation({ conversationId })` - cascade delete |
| 142-165 | `updateConversationTitleFromUser({ conversationId, userId, title })` - update title |

### chatHelpers.ts (convex/chatHelpers.ts)

| Line | What's There |
|------|--------------|
| 4-13 | `getUserId({ clerkUserId })` - lookup via index `by_clerkUserId` |

### paperSessions.ts (convex/paperSessions.ts)

| Line | What's There |
|------|--------------|
| 213-222 | `getByUser({ userId })` - for sidebar badges |

### artifacts.ts (convex/artifacts.ts)

| Line | What's There |
|------|--------------|
| 58-90 | `listByConversation({ conversationId, userId })` |
| 67-71 | Graceful handling jika conversation tidak ditemukan (return `[]`) |

### users.ts (convex/users.ts)

| Line | What's There |
|------|--------------|
| 8-17 | `getUserByClerkId({ clerkUserId })` - dipakai `useCurrentUser()` |

---

## Constants

```
convex/paperSessions/
└── constants.ts                  # Stage definitions
```

### constants.ts (convex/paperSessions/constants.ts)

| Line | What's There |
|------|--------------|
| 1-15 | `STAGE_ORDER` - 13 stages (gagasan → judul) |
| 17 | `PaperStageId` type |
| 18 | `LegacyPaperStageId` type (includes "elaborasi") |
| 20-26 | `getNextStage(current)` |
| 28-34 | `getPreviousStage(current)` |
| 36-39 | `getStageNumber(stage)` - returns 1-13 |
| 41-61 | `getStageLabel(stage)` - Indonesian labels |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      SIDEBAR DATA FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ChatContainer                                                   │
│       │                                                          │
│       ├── useConversations() hook                                │
│       │   ├── useUser() (Clerk)                                  │
│       │   │       └── clerkUserId                                │
│       │   ├── useQuery(api.chatHelpers.getUserId)                │
│       │   │       └── Convex userId                              │
│       │   └── useQuery(api.conversations.listConversations)      │
│       │           └── conversations[]                            │
│       │                                                          │
│       └── Pass to ChatSidebar                                    │
│               │                                                  │
│               ▼                                                  │
│  ┌─────────────────────────────────────────────┐                │
│  │ ChatSidebar                                  │                │
│  │                                             │                │
│  │ Props:                                      │                │
│  │   conversations, currentConversationId,     │                │
│  │   onNewChat, onDeleteConversation,          │                │
│  │   onUpdateConversationTitle,                │  ← NEW         │
│  │   isLoading, isCreating                     │                │
│  │                                             │                │
│  │ Internal Query:                             │                │
│  │   useCurrentUser()                          │                │
│  │     └── useQuery(api.users.getUserByClerkId)│                │
│  │         └── user._id                        │                │
│  │   useQuery(api.paperSessions.getByUser)     │                │
│  │       └── paperSessions[]                   │                │
│  │                                             │                │
│  │ Internal State:                             │                │
│  │   deleteDialogOpen, conversationToDelete    │                │
│  │   editingId, editValue, isUpdating          │  ← NEW         │
│  │                                             │                │
│  │ Transform:                                  │                │
│  │   paperSessionMap = Map(convId → session)   │                │
│  │                                             │                │
│  │ Render:                                     │                │
│  │   conversations.map(conv => {               │                │
│  │     paperSession = paperSessionMap.get(id)  │                │
│  │     isEditing = editingId === conv._id      │  ← NEW         │
│  │                                             │                │
│  │     <ContextMenu>                           │  ← NEW         │
│  │       <ContextMenuTrigger asChild>          │                │
│  │         {isEditing ? (                      │  ← NEW         │
│  │           <div>{renderContent()}</div>      │                │
│  │         ) : (                               │                │
│  │           <Link href={`/chat/${id}`}>       │                │
│  │             {renderContent()}               │                │
│  │           </Link>                           │                │
│  │         )}                                  │                │
│  │       </ContextMenuTrigger>                 │                │
│  │       <ContextMenuContent>                  │                │
│  │         Edit Judul | Hapus                  │  ← NEW         │
│  │       </ContextMenuContent>                 │                │
│  │     </ContextMenu>                          │                │
│  │   })                                        │                │
│  │   <AlertDialog ... />                       │                │
│  └─────────────────────────────────────────────┘                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Edit Title Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      EDIT CONVERSATION TITLE FLOW               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Three Triggers:                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Pencil Icon (hover reveal)                                ││
│  │ 2. Double-click on title text                                ││
│  │ 3. Right-click → Context Menu → "Edit Judul"                 ││
│  └─────────────────────────────────────────────────────────────┘│
│       │                                                          │
│       ▼                                                          │
│  handleStartEdit(conv._id, conv.title)                          │
│       │                                                          │
│       ├── setEditingId(conv._id)                                │
│       └── setEditValue(conv.title)                              │
│               │                                                  │
│               ▼                                                  │
│  ┌─────────────────────────────────────────────┐                │
│  │ EDIT MODE ACTIVE                             │                │
│  │                                             │                │
│  │ UI Changes:                                 │                │
│  │   - Link → div (prevents navigation)        │                │
│  │   - Title span → Input field               │                │
│  │   - PaperSessionBadge hidden               │                │
│  │   - Relative date hidden                   │                │
│  │   - Action buttons hidden                  │                │
│  │   - Input auto-focused + text selected     │                │
│  │                                             │                │
│  │ Input Validation (visual):                 │                │
│  │   - > 50 chars: border-destructive         │                │
│  │   - aria-invalid={isExceedingMaxLength}    │                │
│  │                                             │                │
│  │ Keyboard Handlers:                          │                │
│  │   - Enter → handleSaveEdit()               │                │
│  │   - Escape → handleCancelEdit()            │                │
│  │   - Blur → handleSaveEdit() (auto-save)    │                │
│  └─────────────────────────────────────────────┘                │
│                │              │                                  │
│                │              ▼                                  │
│                │     handleSaveEdit()                           │
│                │              │                                  │
│                │              ├── Validation checks:            │
│                │              │   - Empty → revert to original  │
│                │              │   - > 50 chars → toast.error    │
│                │              │   - Unchanged → skip API        │
│                │              │                                  │
│                │              ├── setIsUpdating(true)           │
│                │              │                                  │
│                │              ├── onUpdateConversationTitle()   │
│                │              │         │                        │
│                │              │         ▼ (ChatContainer)       │
│                │              │   handleUpdateConversationTitle │
│                │              │         │                        │
│                │              │         ▼ (useConversations)    │
│                │              │   updateConversationTitle()     │
│                │              │         │                        │
│                │              │         ▼ (Convex)              │
│                │              │   updateConversationTitleFromUser│
│                │              │                                  │
│                │              ├── catch → toast.error           │
│                │              │                                  │
│                │              └── finally:                      │
│                │                  setIsUpdating(false)          │
│                │                  setEditingId(null)            │
│                │                  setEditValue("")              │
│                │                                                 │
│                └── handleCancelEdit()                           │
│                       │                                          │
│                       ├── setEditingId(null)                    │
│                       └── setEditValue("")                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

Paper Session Lock:
┌─────────────────────────────────────────────────────────────────┐
│  hasPaperSession = !!paperSessionMap.get(conv._id)              │
│                                                                  │
│  If hasPaperSession:                                            │
│    - Pencil icon: HIDDEN (not rendered)                         │
│    - Double-click: IGNORED (early return)                       │
│    - Context menu "Edit Judul": DISABLED                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Delete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      DELETE CONVERSATION FLOW                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Two Triggers:                                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. Trash Icon (hover reveal)                                 ││
│  │ 2. Right-click → Context Menu → "Hapus"                      ││
│  └─────────────────────────────────────────────────────────────┘│
│       │                                                          │
│       ▼                                                          │
│  handleDeleteClick(conv._id, conv.title)                         │
│       │                                                          │
│       ├── setConversationToDelete({ id, title })                │
│       └── setDeleteDialogOpen(true)                             │
│               │                                                  │
│               ▼                                                  │
│  ┌─────────────────────────────────────────────┐                │
│  │ AlertDialog (Indonesian)                     │                │
│  │                                             │                │
│  │  "Hapus Percakapan?"                        │                │
│  │                                             │                │
│  │  Percakapan "{title}" akan dihapus          │                │
│  │  secara permanen. Aksi ini tidak bisa       │                │
│  │  dibatalkan.                                │                │
│  │                                             │                │
│  │              [Batal]  [Hapus]               │                │
│  └─────────────────────────────────────────────┘                │
│                    │              │                              │
│                    │              ▼                              │
│                    │     handleConfirmDelete()                   │
│                    │              │                              │
│                    │              ├── onDeleteConversation(id)   │
│                    │              │         │                    │
│                    │              │         ▼ (ChatContainer)    │
│                    │              │   ┌────────────────────┐     │
│                    │              │   │ 1. Close artifact  │     │
│                    │              │   │    panel FIRST     │     │
│                    │              │   │    (race fix)      │     │
│                    │              │   │ 2. deleteConv()    │     │
│                    │              │   │ 3. router.push()   │     │
│                    │              │   └────────────────────┘     │
│                    │              │                              │
│                    │              └── setDeleteDialogOpen(false) │
│                    │                                             │
│                    └── (Cancel) setDeleteDialogOpen(false)       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Search Patterns

```bash
# Find ChatSidebar related files
grep -r "ChatSidebar" src/components/chat/ --include="*.tsx"

# Find paper badge usage
grep -r "PaperSessionBadge" src/components/ --include="*.tsx"

# Find conversation queries
grep -r "listConversations\|getByUser" convex/ --include="*.ts"

# Find sidebar props
grep -r "ChatSidebarProps" src/components/chat/

# Find AlertDialog usage
grep -r "AlertDialog" src/components/chat/ --include="*.tsx"

# Find ContextMenu usage
grep -r "ContextMenu" src/components/chat/ --include="*.tsx"

# Find delete handlers
grep -r "handleDeleteClick\|handleConfirmDelete\|handleDeleteConversation" src/components/chat/

# Find edit handlers
grep -r "handleStartEdit\|handleSaveEdit\|handleCancelEdit\|handleEditKeyDown" src/components/chat/

# Find update title mutation
grep -r "updateConversationTitle\|updateTitleMutation" src/
```

---

## Quick Reference: Key Lines

| File | Line(s) | What's There |
|------|---------|--------------|
| `ChatSidebar.tsx` | 3 | `useState, useRef, useEffect` imports |
| `ChatSidebar.tsx` | 5 | `Button` import |
| `ChatSidebar.tsx` | 6 | `Input` import |
| `ChatSidebar.tsx` | 7 | `PencilIcon` import |
| `ChatSidebar.tsx` | 16 | `toast` import |
| `ChatSidebar.tsx` | 27-33 | ContextMenu imports |
| `ChatSidebar.tsx` | 35-49 | Props interface (includes `onUpdateConversationTitle`) |
| `ChatSidebar.tsx` | 65-68 | Paper sessions query |
| `ChatSidebar.tsx` | 71-73 | paperSessionMap creation |
| `ChatSidebar.tsx` | 76-80 | Delete dialog state |
| `ChatSidebar.tsx` | 83-86 | Edit state (`editingId`, `editValue`, `isUpdating`, `editInputRef`) |
| `ChatSidebar.tsx` | 89-94 | Auto-focus useEffect |
| `ChatSidebar.tsx` | 97-100 | handleStartEdit |
| `ChatSidebar.tsx` | 103-135 | handleSaveEdit (dengan validasi) |
| `ChatSidebar.tsx` | 138-141 | handleCancelEdit |
| `ChatSidebar.tsx` | 144-152 | handleEditKeyDown |
| `ChatSidebar.tsx` | 155-158 | handleDeleteClick |
| `ChatSidebar.tsx` | 161-167 | handleConfirmDelete |
| `ChatSidebar.tsx` | 174-175 | Header "Makalah Chat" text |
| `ChatSidebar.tsx` | 177-196 | New Chat button |
| `ChatSidebar.tsx` | 222-226 | itemClasses shared |
| `ChatSidebar.tsx` | 229-333 | renderContent function |
| `ChatSidebar.tsx` | 234-243 | Input field (editing mode) |
| `ChatSidebar.tsx` | 245-255 | Title span dengan onDoubleClick |
| `ChatSidebar.tsx` | 274-298 | Edit button (PencilIcon) |
| `ChatSidebar.tsx` | 301-325 | Delete button (TrashIcon) |
| `ChatSidebar.tsx` | 336-372 | ContextMenu wrapper |
| `ChatSidebar.tsx` | 338-342 | Conditional Link/div rendering |
| `ChatSidebar.tsx` | 355-371 | ContextMenuContent |
| `ChatSidebar.tsx` | 386-406 | AlertDialog component |
| `ChatContainer.tsx` | 23 | Destructure `updateConversationTitle` |
| `ChatContainer.tsx` | 36-49 | handleNewChat |
| `ChatContainer.tsx` | 51-64 | handleDeleteConversation (race fix) |
| `ChatContainer.tsx` | 66-68 | handleUpdateConversationTitle |
| `ChatContainer.tsx` | 79 | `onUpdateConversationTitle` prop (desktop) |
| `ChatContainer.tsx` | 96 | `onUpdateConversationTitle` prop (mobile) |
| `ChatWindow.tsx` | 341-391 | Header mobile + tombol menu (empty state, not found, main) |
| `ArtifactPanel.tsx` | 36-44 | listByConversation query |
| `PaperSessionBadge.tsx` | 18-35 | Badge component |
| `formatters.ts` | 12-28 | `formatRelativeTime()` function |
| `useConversations.ts` | 27 | `updateTitleMutation` |
| `useConversations.ts` | 29-36 | createNewConversation |
| `useConversations.ts` | 42-57 | updateConversationTitle |
| `useConversations.ts` | 63 | Return `updateConversationTitle` |
| `artifacts.ts` | 58-71 | listByConversation + graceful handling |
| `users.ts` | 8-17 | getUserByClerkId |
| `constants.ts` | 36-39 | getStageNumber |

---

*Last updated: 2026-01-11*
