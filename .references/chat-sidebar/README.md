# ChatSidebar - Technical Reference

Dokumentasi lengkap tentang ChatSidebar component di Makalah App.

## Daftar Isi

1. [Overview](#overview)
2. [Arsitektur](#arsitektur)
3. [Component Hierarchy](#component-hierarchy)
4. [Props & Interface](#props--interface)
5. [Data Flow](#data-flow)
6. [Paper Progress Badge](#paper-progress-badge)
7. [Relative Date Formatting](#relative-date-formatting)
8. [Edit Conversation Title](#edit-conversation-title)
9. [Delete Confirmation Dialog](#delete-confirmation-dialog)
10. [Navigation Patterns](#navigation-patterns)
11. [UI States](#ui-states)
12. [Backend Integration](#backend-integration)
13. [Key Implementation Details](#key-implementation-details)
14. [Troubleshooting](#troubleshooting)
15. [Files Reference](#files-reference)

---

## Overview

ChatSidebar adalah komponen navigasi utama untuk chat interface di Makalah App. Komponen ini menampilkan:

- **Header** dengan branding "Makalah Chat"
- **New Chat button** untuk membuat conversation baru
- **Conversation list** dengan:
  - Title conversation (truncated, editable via inline edit)
  - Paper progress badge (x/13) jika ada paper session
  - Relative date (misal: "5 menit lalu", "2 hari lalu")
  - Edit button (hover reveal, PencilIcon)
  - Delete button (hover reveal, TrashIcon)
- **Context Menu** (right-click) dengan "Edit Judul" dan "Hapus"
- **Delete confirmation dialog** berbahasa Indonesia

### Key Features

| Feature | Implementation |
|---------|----------------|
| URL-based Navigation | `<Link href={\`/chat/${conv._id}\`}>` |
| Paper Progress | `PaperSessionBadge` dengan `getStageNumber()` |
| Relative Date | `formatRelativeTime()` dari date-fns + locale Indonesia |
| Inline Edit Title | Input field dengan 3 triggers (pencil, double-click, context menu) |
| Context Menu | Right-click menu via ContextMenu dari shadcn/ui |
| Mobile Support | Responsive via `Sheet` component |
| Real-time Updates | Convex reactivity untuk conversations & paper sessions |
| Loading States | Skeleton loader + isCreating + isUpdating state |
| Delete with Confirmation | Custom `AlertDialog` berbahasa Indonesia |
| Race Condition Protection | Close artifact panel sebelum delete |
| Paper Session Lock | Edit diblokir untuk conversation dengan active paper session |

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                      CHATCONTAINER                               │
│                                                                  │
│  Props: { conversationId: string | null }                       │
│  State: isMobileOpen, artifactPanelOpen, selectedArtifactId,    │
│         isCreating                                               │
│  Hooks: useRouter(), useConversations()                         │
│                                                                  │
│  Renders:                                                        │
│  ├── ChatSidebar (Desktop) - className="hidden md:flex"         │
│  ├── Sheet + ChatSidebar (Mobile)                               │
│  ├── ChatWindow                                                  │
│  └── ArtifactPanel                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       CHATSIDEBAR                                │
│                                                                  │
│  Props:                                                          │
│  ├── conversations[]                                             │
│  ├── currentConversationId                                       │
│  ├── onNewChat, onDeleteConversation                            │
│  ├── onUpdateConversationTitle                                   │
│  ├── isLoading, isCreating                                       │
│  └── onCloseMobile                                               │
│                                                                  │
│  Internal Queries:                                               │
│  ├── useCurrentUser() → user._id                                 │
│  └── useQuery(paperSessions.getByUser) → paperSessions[]        │
│                                                                  │
│  Internal State:                                                 │
│  ├── deleteDialogOpen (boolean)                                  │
│  ├── conversationToDelete ({ id, title } | null)                │
│  ├── editingId (Id<"conversations"> | null)                     │
│  ├── editValue (string)                                          │
│  ├── isUpdating (boolean)                                        │
│  └── editInputRef (useRef<HTMLInputElement>)                    │
│                                                                  │
│  Renders:                                                        │
│  ├── Header ("Makalah Chat")                                     │
│  ├── New Chat Button                                             │
│  ├── Conversation List                                           │
│  │   └── Per Item:                                               │
│  │       ├── <ContextMenu> wrapper                               │
│  │       │   └── isEditing ? <div> : <Link>                     │
│  │       ├── Title (Input if editing, span otherwise)           │
│  │       ├── PaperSessionBadge (conditional, hidden if editing) │
│  │       ├── Relative Date (hidden if editing)                  │
│  │       ├── Edit Button (PencilIcon, hover reveal)             │
│  │       └── Delete Button (TrashIcon, hover reveal)            │
│  └── AlertDialog (delete confirmation)                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Hierarchy

```
ChatContainer (src/components/chat/ChatContainer.tsx)
├── ChatSidebar (Desktop) - hidden md:flex
│   ├── Header
│   │   ├── MessageSquareIcon + "Makalah Chat"
│   │   └── New Chat Button (PlusIcon/Loader2Icon)
│   ├── Conversation List
│   │   └── <ContextMenu> per conversation
│   │       ├── <ContextMenuTrigger asChild>
│   │       │   └── isEditing ? <div> : <Link>
│   │       │       ├── Title (Input or span)
│   │       │       ├── PaperSessionBadge (jika ada session, hidden saat edit)
│   │       │       ├── Relative Date (hidden saat edit)
│   │       │       ├── Edit Button (PencilIcon, hidden untuk paper session)
│   │       │       └── Delete Button (TrashIcon)
│   │       └── <ContextMenuContent>
│   │           ├── "Edit Judul" (disabled untuk paper session)
│   │           └── "Hapus"
│   ├── Footer (empty placeholder)
│   └── AlertDialog (delete confirmation)
│       ├── AlertDialogHeader
│       │   ├── AlertDialogTitle: "Hapus Percakapan?"
│       │   └── AlertDialogDescription: "{title} akan dihapus..."
│       └── AlertDialogFooter
│           ├── AlertDialogCancel: "Batal"
│           └── AlertDialogAction: "Hapus" (destructive)
│
├── Sheet (Mobile Sidebar)
│   └── ChatSidebar - w-full border-none
│       └── (same as above)
│
├── ChatWindow - header mobile dengan tombol menu untuk buka sidebar
└── ArtifactPanel
```

---

## Props & Interface

### ChatSidebarProps

```typescript
interface ChatSidebarProps {
    // Data
    conversations: Array<{
        _id: Id<"conversations">
        title: string
        lastMessageAt: number
    }>
    currentConversationId: string | null

    // Actions
    onNewChat: () => void
    onDeleteConversation: (id: Id<"conversations">) => void
    onUpdateConversationTitle?: (id: Id<"conversations">, title: string) => Promise<void>
    onCloseMobile?: () => void

    // Styling
    className?: string

    // Loading states
    isLoading?: boolean
    isCreating?: boolean
}
```

### PaperSessionBadgeProps

```typescript
interface PaperSessionBadgeProps {
    stageNumber: number              // Current stage (1-13)
    totalStages?: number             // Default: STAGE_ORDER.length (13)
    className?: string
}
```

### ChatContainerProps

```typescript
interface ChatContainerProps {
    conversationId: string | null    // From URL params
}
```

---

## Data Flow

### 1. Conversations Data

```
Clerk User → useUser()
     │
     └── clerkUserId
            │
            ▼
useQuery(api.chatHelpers.getUserId, { clerkUserId })
     │
     └── Convex userId
            │
            ▼
useQuery(api.conversations.listConversations, { userId })
     │
     └── conversations[] (last 50, desc order)
            │
            ▼
ChatContainer → ChatSidebar (via props)
```

### 2. Paper Sessions Data

```
ChatSidebar Internal:

useCurrentUser()
     │
     ├── useQuery(api.users.getUserByClerkId, { clerkUserId })
     │       └── convexUser._id
     │
     ▼
useQuery(api.paperSessions.getByUser, { userId })
     │
     └── paperSessions[]
            │
            ▼
new Map(sessions.map(s => [s.conversationId, s]))
     │
     └── paperSessionMap (O(1) lookup)
            │
            ▼
Per conversation: paperSessionMap.get(conv._id)
     │
     ▼
getStageNumber(session.currentStage) → stageNumber
     │
     ▼
<PaperSessionBadge stageNumber={n} />
```

### 3. Complete Flow Diagram

```
┌───────────────────────────────────────────────────────────────────┐
│                     FRONTEND FLOW                                  │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Clerk useUser()                                                   │
│       │                                                            │
│       └── clerkUserId ─────────────────────────┐                  │
│                                                │                   │
│  useConversations() hook                       │                   │
│       │                                        ▼                   │
│       ├── useQuery(chatHelpers.getUserId) ← clerkUserId           │
│       │       │                                                    │
│       │       └── convexUserId                                     │
│       │              │                                             │
│       ├── useQuery(conversations.listConversations) ← userId      │
│       │       │                                                    │
│       │       └── conversations[]                                  │
│       │                                                            │
│       └── Returns: { conversations, createNewConversation,        │
│                      deleteConversation, updateConversationTitle, │
│                      isLoading, userId }                          │
│                                                                    │
│  ChatContainer                                                     │
│       │                                                            │
│       └── Pass conversations + handlers to ChatSidebar            │
│                                                                    │
│  ChatSidebar                                                       │
│       │                                                            │
│       ├── useCurrentUser() → user._id                              │
│       │                                                            │
│       ├── useQuery(paperSessions.getByUser) ← userId              │
│       │       │                                                    │
│       │       └── paperSessions[]                                  │
│       │                                                            │
│       └── Merge & Render:                                          │
│           for each conversation:                                   │
│             paperSession = paperSessionMap.get(conv._id)           │
│             isEditing = editingId === conv._id                     │
│             render ContextMenu + (Link or div) + content          │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

## Paper Progress Badge

### Cara Kerja

1. **Fetch paper sessions** di ChatSidebar via `useQuery(api.paperSessions.getByUser)`
2. **Buat Map** untuk O(1) lookup: `conversationId → paperSession`
3. **Per conversation**, cek apakah ada paper session:
   ```typescript
   const paperSession = paperSessionMap.get(conv._id)
   ```
4. **Jika ada**, render badge dengan stage number (hidden saat editing):
   ```typescript
   {paperSession && !isEditing && (
       <PaperSessionBadge
           stageNumber={getStageNumber(paperSession.currentStage as PaperStageId | "completed")}
       />
   )}
   ```

### Stage Mapping

| Stage ID | Number | Label |
|----------|--------|-------|
| gagasan | 1 | Gagasan Paper |
| topik | 2 | Penentuan Topik |
| outline | 3 | Menyusun Outline |
| abstrak | 4 | Penyusunan Abstrak |
| pendahuluan | 5 | Pendahuluan |
| tinjauan_literatur | 6 | Tinjauan Literatur |
| metodologi | 7 | Metodologi |
| hasil | 8 | Hasil Penelitian |
| diskusi | 9 | Diskusi |
| kesimpulan | 10 | Kesimpulan |
| daftar_pustaka | 11 | Daftar Pustaka |
| lampiran | 12 | Lampiran |
| judul | 13 | Pemilihan Judul |
| completed | 13 | Selesai |

### Badge Styling

```tsx
<span
    className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
        "bg-primary-500/15 text-primary-500 border border-primary-500/30",
        className
    )}
    title={`Paper mode: Tahap ${stageNumber} dari ${totalStages}`}
>
    <FileText className="h-2.5 w-2.5" />
    {stageNumber}/{totalStages}
</span>
```

---

## Relative Date Formatting

### Overview

Tanggal conversation ditampilkan dalam format relatif yang ramah pengguna, seperti "5 menit lalu", "2 hari lalu", dll. Format ini lebih intuitif dibanding format absolut seperti "09/01/2026".

### Output Format

| Waktu | Output |
|-------|--------|
| < 1 menit | "kurang dari semenit lalu" |
| 5 menit lalu | "5 menit lalu" |
| 2 jam lalu | "sekitar 2 jam lalu" |
| Kemarin | "1 hari lalu" |
| 1 minggu lalu | "7 hari lalu" |
| 2 bulan lalu | "sekitar 2 bulan lalu" |
| > 1 tahun | "13 Jan 2024" (absolute) |

### Implementasi

**Utility Function:** `src/lib/date/formatters.ts`

```typescript
import { formatDistanceToNow, format } from "date-fns"
import { id as localeId } from "date-fns/locale"

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000

export function formatRelativeTime(timestamp: number): string {
    const diffInMs = Date.now() - timestamp

    if (diffInMs >= ONE_YEAR_MS) {
        // > 1 tahun: tampilkan absolute date
        return format(timestamp, "d MMM yyyy", { locale: localeId })
    }

    // <= 1 tahun: tampilkan relative time
    const relative = formatDistanceToNow(timestamp, {
        addSuffix: true,
        locale: localeId,
    })

    // "5 menit yang lalu" -> "5 menit lalu" (lebih ringkas)
    return relative.replace(" yang lalu", " lalu")
}
```

### Usage di ChatSidebar

```tsx
// Import
import { formatRelativeTime } from "@/lib/date/formatters"

// Render (hidden saat editing)
{!isEditing && (
    <div className="text-xs text-muted-foreground">
        {formatRelativeTime(conv.lastMessageAt)}
    </div>
)}
```

### Design Decisions

1. **Threshold 1 Tahun:** Conversation yang lebih dari 1 tahun ditampilkan dengan format absolute ("13 Jan 2024") karena "2 tahun lalu" kurang informatif.

2. **Tanpa "yang":** Output date-fns Indonesia default adalah "5 menit yang lalu". Dipersingkat menjadi "5 menit lalu" untuk UX yang lebih bersih.

3. **Locale Indonesia:** Menggunakan `id` locale dari `date-fns/locale` untuk output berbahasa Indonesia.

4. **Centralized Utility:** Function ditempatkan di `src/lib/date/formatters.ts` untuk reusability dan maintainability.

---

## Edit Conversation Title

### Overview

User dapat mengedit judul conversation secara inline langsung di sidebar. Fitur ini menyediakan 3 cara untuk trigger edit mode, dengan validasi dan feedback yang lengkap.

### Three Trigger Methods

| Trigger | Lokasi | Behavior |
|---------|--------|----------|
| Pencil Icon | Hover reveal button | Click → edit mode |
| Double-click | Title text | Double-click → edit mode |
| Context Menu | Right-click anywhere | "Edit Judul" → edit mode |

### Edit Mode UI Changes

Saat edit mode aktif:
- **Link → div:** Mencegah navigation saat editing
- **Title span → Input:** Text input untuk edit
- **PaperSessionBadge:** Hidden
- **Relative date:** Hidden
- **Action buttons:** Hidden
- **Auto-focus:** Input auto-focused dengan text selected

### Validation

| Rule | Handling |
|------|----------|
| Empty input | Revert ke original title, skip API |
| > 50 characters | Visual: `border-destructive`, toast.error |
| Unchanged | Skip API call |

### Keyboard Handlers

| Key | Action |
|-----|--------|
| Enter | Save (handleSaveEdit) |
| Escape | Cancel (handleCancelEdit) |
| Blur | Auto-save (handleSaveEdit) |

### Paper Session Lock

Conversation dengan active paper session **tidak dapat di-edit**:

| Trigger | Lock Method |
|---------|-------------|
| Pencil icon | **Hidden** (not rendered) |
| Double-click | **Ignored** (early return) |
| Context menu | **Disabled** (`disabled={hasPaperSession}`) |

### State Management

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
```

### Handlers

```typescript
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

### Conditional Link/div Pattern

```tsx
// PENTING: Saat editing, gunakan div bukan Link untuk mencegah navigation
<ContextMenu key={conv._id}>
    <ContextMenuTrigger asChild>
        {isEditing ? (
            // Saat editing: gunakan div, BUKAN Link
            <div className={itemClasses}>
                {renderContent()}
            </div>
        ) : (
            // Saat tidak editing: gunakan Link untuk navigasi
            <Link
                href={`/chat/${conv._id}`}
                onClick={() => onCloseMobile?.()}
                className={itemClasses}
                aria-label={`Select conversation: ${conv.title}`}
            >
                {renderContent()}
            </Link>
        )}
    </ContextMenuTrigger>
    <ContextMenuContent>
        {/* ... */}
    </ContextMenuContent>
</ContextMenu>
```

**Kenapa conditional div/Link?**
- Next.js `<Link>` punya internal event handling untuk navigation
- `e.stopPropagation()` tidak cukup untuk mencegah Link navigation
- Solusi: Hapus Link sepenuhnya saat editing dengan render `<div>` sebagai gantinya

### Edit Title Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      EDIT CONVERSATION TITLE FLOW               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Three Triggers → handleStartEdit(id, title)                    │
│       │                                                          │
│       ├── setEditingId(id)                                      │
│       └── setEditValue(title)                                   │
│               │                                                  │
│               ▼                                                  │
│  ┌─────────────────────────────────────────────┐                │
│  │ EDIT MODE ACTIVE                             │                │
│  │   - Link → div                              │                │
│  │   - Title span → Input field               │                │
│  │   - Auto-focus + select text               │                │
│  │   - > 50 chars: border-destructive         │                │
│  └─────────────────────────────────────────────┘                │
│                │              │                                  │
│                │              ▼                                  │
│                │     handleSaveEdit()                           │
│                │              │                                  │
│                │              ├── Validation:                   │
│                │              │   Empty → revert                │
│                │              │   > 50 chars → toast.error      │
│                │              │   Unchanged → skip API          │
│                │              │                                  │
│                │              ├── onUpdateConversationTitle()   │
│                │              │         ↓                        │
│                │              │   handleUpdateConversationTitle │
│                │              │         ↓                        │
│                │              │   updateConversationTitle()     │
│                │              │         ↓                        │
│                │              │   updateConversationTitleFromUser│
│                │              │                                  │
│                │              └── Reset state                   │
│                │                                                 │
│                └── handleCancelEdit() → Reset state             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Delete Confirmation Dialog

### Overview

Delete confirmation menggunakan custom `AlertDialog` dari shadcn/ui, bukan native browser `confirm()`. Dialog berbahasa Indonesia dan menampilkan judul conversation yang akan dihapus.

### UI Design

```
┌─────────────────────────────────────────┐
│  Hapus Percakapan?                      │
│                                         │
│  Percakapan "Judul Percakapan" akan     │
│  dihapus secara permanen. Aksi ini      │
│  tidak bisa dibatalkan.                 │
│                                         │
│              [Batal]  [Hapus]           │
└─────────────────────────────────────────┘
```

### Two Trigger Methods

| Trigger | Lokasi |
|---------|--------|
| Trash Icon | Hover reveal button |
| Context Menu | Right-click → "Hapus" |

### State Management

```typescript
// State untuk delete confirmation dialog
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
const [conversationToDelete, setConversationToDelete] = useState<{
    id: Id<"conversations">
    title: string
} | null>(null)
```

### Handlers

```typescript
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

### AlertDialog Component

```tsx
<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Hapus Percakapan?</AlertDialogTitle>
            <AlertDialogDescription>
                Percakapan <span className="font-medium text-foreground">
                    &quot;{conversationToDelete?.title}&quot;
                </span> akan dihapus secara permanen. Aksi ini tidak bisa dibatalkan.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConversationToDelete(null)}>
                Batal
            </AlertDialogCancel>
            <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
                Hapus
            </AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
```

### Delete Flow

```
1. User clicks trash icon or context menu "Hapus"
       │
       ▼
handleDeleteClick(conv._id, conv.title)
       │
       ├── setConversationToDelete({ id, title })
       └── setDeleteDialogOpen(true)
               │
               ▼
┌─────────────────────────────────────────────┐
│ AlertDialog (Indonesian)                     │
│                                             │
│  "Hapus Percakapan?"                        │
│  Percakapan "{title}" akan dihapus...       │
│                                             │
│              [Batal]  [Hapus]               │
└─────────────────────────────────────────────┘
                │              │
                │              ▼
                │     handleConfirmDelete()
                │              │
                │              ├── onDeleteConversation(id)
                │              │         │
                │              │         ▼ (ChatContainer)
                │              │   ┌────────────────────┐
                │              │   │ 1. Close artifact  │
                │              │   │    panel (jika     │
                │              │   │    aktif)          │
                │              │   │ 2. deleteConv()    │
                │              │   │ 3. router.push()   │
                │              │   │    (jika aktif)    │
                │              │   └────────────────────┘
                │              │
                │              └── setDeleteDialogOpen(false)
                │
                └── (Cancel) setDeleteDialogOpen(false)
```

---

## Navigation Patterns

### 1. Conditional Link/div (Conversation Items)

```tsx
// CRITICAL: Saat editing, gunakan div bukan Link
<ContextMenuTrigger asChild>
    {isEditing ? (
        <div className={itemClasses}>{renderContent()}</div>
    ) : (
        <Link
            href={`/chat/${conv._id}`}
            onClick={() => onCloseMobile?.()}
            className={itemClasses}
            aria-label={`Select conversation: ${conv.title}`}
        >
            {renderContent()}
        </Link>
    )}
</ContextMenuTrigger>
```

**Kenapa conditional div/Link?**
- Next.js `<Link>` punya internal behavior untuk navigation dan prefetching
- `e.stopPropagation()` tidak cukup untuk mencegah navigation
- Solusi: Render `<div>` saat editing untuk menghilangkan Link sepenuhnya

### 2. Programmatic Navigation (New Chat)

```typescript
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
```

### 3. Delete with Race Condition Fix

```typescript
const handleDeleteConversation = async (id: string) => {
    // PENTING: Close artifact panel SEBELUM delete untuk menghindari race condition
    // Jika tidak, ArtifactPanel akan re-query conversation yang sudah dihapus
    if (conversationId === id) {
        setArtifactPanelOpen(false)
        setSelectedArtifactId(null)
    }

    await deleteConversation(id as Id<"conversations">)

    if (conversationId === id) {
        router.push('/chat')
    }
}
```

### 4. Action Buttons Inside Link

```tsx
// Edit button with event prevention
<div
    role="button"
    tabIndex={0}
    onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
    }}
    onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        handleStartEdit(conv._id, conv.title)
    }}
    onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            e.stopPropagation()
            handleStartEdit(conv._id, conv.title)
        }
    }}
>
    <PencilIcon />
</div>
```

### 5. Tombol Menu Mobile (ChatWindow)

Tombol ini memanggil `onMobileMenuClick` dari `ChatContainer` untuk membuka `Sheet` sidebar.

```tsx
<Button variant="ghost" size="icon" onClick={onMobileMenuClick} aria-label="Open mobile menu">
    <MenuIcon className="h-5 w-5" />
</Button>
```

---

## UI States

### 1. Loading State (isLoading)

```tsx
{isLoading ? (
    <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col gap-2 p-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        ))}
    </div>
) : ...}
```

### 2. Empty State (No Conversations)

```tsx
{conversations.length === 0 ? (
    <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground opacity-50">
        <MessageSquareIcon className="h-8 w-8 mb-2" />
        <span className="text-xs">No conversations yet</span>
    </div>
) : ...}
```

### 3. Creating State (isCreating)

```tsx
<Button disabled={isCreating} aria-busy={isCreating}>
    {isCreating ? (
        <>
            <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
            Membuat...
        </>
    ) : (
        <>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Chat
        </>
    )}
</Button>
```

### 4. Active State (Current Conversation)

```tsx
const itemClasses = `group flex items-center w-full p-2 rounded-lg mb-1 transition-colors text-left ${
    currentConversationId === conv._id
        ? "bg-accent text-accent-foreground"    // Active
        : "hover:bg-accent/50"                   // Inactive
}`
```

### 5. Edit State (isEditing)

```tsx
{isEditing ? (
    <Input
        ref={editInputRef}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleEditKeyDown}
        onBlur={handleSaveEdit}
        disabled={isUpdating}
        className={`h-6 text-sm px-1 py-0 font-medium ${isExceedingMaxLength ? 'border-destructive focus-visible:ring-destructive' : ''}`}
        aria-invalid={isExceedingMaxLength}
    />
) : (
    <span className="font-medium text-sm truncate" onDoubleClick={...}>
        {conv.title}
    </span>
)}
```

### 6. Updating State (isUpdating)

```tsx
// Loading indicator saat updating
{isEditing && isUpdating && (
    <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
)}
```

### 7. Max Length Exceeded State

```tsx
const isExceedingMaxLength = isEditing && editValue.length > 50

<Input
    className={`... ${isExceedingMaxLength ? 'border-destructive focus-visible:ring-destructive' : ''}`}
    aria-invalid={isExceedingMaxLength}
/>
```

### 8. Action Buttons Hover State

```tsx
// Edit button
<div
    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-accent rounded-md transition-all focus:opacity-100"
    title="Edit judul"
    aria-label="Edit judul"
>
    <PencilIcon />
</div>

// Delete button
<div
    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-destructive/10 hover:text-destructive rounded-md transition-all focus:opacity-100"
    title="Hapus percakapan"
    aria-label="Hapus percakapan"
>
    <TrashIcon />
</div>
```

---

## Backend Integration

### Queries Used

| Query | File | Purpose |
|-------|------|---------|
| `chatHelpers.getUserId` | chatHelpers.ts:4-13 | Clerk → Convex user lookup |
| `users.getUserByClerkId` | users.ts:8-17 | Dipakai `useCurrentUser()` |
| `conversations.listConversations` | conversations.ts:5-14 | Get user's conversations (last 50) |
| `paperSessions.getByUser` | paperSessions.ts:213-222 | Get paper sessions for badge |
| `artifacts.listByConversation` | artifacts.ts:58-90 | Get artifacts (graceful handling) |

### Mutations Used

| Mutation | File | Purpose |
|----------|------|---------|
| `conversations.createConversation` | conversations.ts:25-42 | Create new conversation |
| `conversations.deleteConversation` | conversations.ts:124-140 | Delete with cascade |
| `conversations.updateConversationTitleFromUser` | conversations.ts:142-165 | Update title |

### Graceful Error Handling (artifacts.ts)

```typescript
// artifacts.ts line 67-71
// Return empty array instead of throwing error
// Ini handle race condition saat conversation dihapus sementara query sedang berjalan
if (!conversation) {
    return []
}
```

### Query Details

**listConversations:**
```typescript
export const listConversations = query({
    args: { userId: v.id("users") },
    handler: async ({ db }, { userId }) => {
        return await db
            .query("conversations")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .order("desc")
            .take(50)
    },
})
```

**getByUser (Paper Sessions):**
```typescript
export const getByUser = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("paperSessions")
            .withIndex("by_user_updated", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
    },
});
```

**updateConversationTitleFromUser:**
```typescript
export const updateConversationTitleFromUser = mutation({
    args: {
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        // Verify ownership + update title
    },
});
```

---

## Key Implementation Details

### 1. paperSessionMap untuk O(1) Lookup

```typescript
// Create map once per render
const paperSessionMap = new Map(
    paperSessions?.map(session => [session.conversationId, session]) ?? []
)

// O(1) lookup per conversation
const paperSession = paperSessionMap.get(conv._id)
```

**Kenapa Map, bukan filter?**
- Filter: O(n) per conversation = O(n*m) total
- Map: O(1) per conversation = O(n) total

### 2. Conditional Query dengan "skip"

```typescript
const paperSessions = useQuery(
    api.paperSessions.getByUser,
    user ? { userId: user._id } : "skip"  // Skip if no user
)
```

Convex `"skip"` idiom menghindari error saat dependency belum ready.

### 3. Type Safety dengan PaperStageId

```typescript
getStageNumber(paperSession.currentStage as PaperStageId | "completed")
```

Type assertion karena Convex menyimpan sebagai string, tapi kita tahu nilainya valid.

### 4. Mobile Close Callback

```typescript
<Link
    onClick={() => onCloseMobile?.()}  // Optional chaining
>
```

Callback dipanggil sebelum navigation, memungkinkan close sidebar di mobile.

### 5. Race Condition Fix untuk Delete

**Problem:** Convex reactivity sangat cepat. Setelah conversation dihapus, komponen lain (ArtifactPanel) masih mencoba query ke conversation yang sudah tidak ada.

**Solution (Two-Layer Fix):**

1. **Frontend (ChatContainer):** Close artifact panel SEBELUM delete
   ```typescript
   if (conversationId === id) {
       setArtifactPanelOpen(false)
       setSelectedArtifactId(null)
   }
   await deleteConversation(id)
   ```

2. **Backend (artifacts.ts):** Graceful handling jika conversation tidak ditemukan
   ```typescript
   if (!conversation) {
       return []  // Return empty, don't throw
   }
   ```

### 6. Single AlertDialog Pattern

Menggunakan 1 AlertDialog instance dengan state, bukan per-conversation:
- Lebih performant
- State-driven open/close
- Menyimpan conversation info untuk display

### 7. Conditional Link/div untuk Edit Mode

**Problem:** Next.js `<Link>` punya internal event handling yang tidak bisa di-override dengan `stopPropagation()`

**Solution:** Conditional rendering
```typescript
{isEditing ? (
    <div className={itemClasses}>{renderContent()}</div>  // No Link = no navigation
) : (
    <Link href={...} className={itemClasses}>{renderContent()}</Link>
)}
```

### 8. Paper Session Lock untuk Edit

Conversation dengan active paper session tidak dapat di-edit judulnya untuk menjaga konsistensi paper workflow.

```typescript
const hasPaperSession = !!paperSession

// Pencil icon hidden
{!hasPaperSession && <div role="button">...</div>}

// Double-click ignored
onDoubleClick={(e) => {
    if (hasPaperSession) return
    ...
}}

// Context menu disabled
<ContextMenuItem disabled={hasPaperSession}>Edit Judul</ContextMenuItem>
```

---

## Troubleshooting

### Badge tidak muncul padahal ada paper session

1. Cek `useCurrentUser()` return user dengan `_id`
2. Cek query `paperSessions.getByUser` tidak skip
3. Cek `paperSession.conversationId` match dengan `conv._id`
4. Cek `currentStage` bukan undefined/null

### New Chat button double-create

1. Verify `isCreating` guard di `handleNewChat`
2. Cek `isCreating` initial value adalah `false`
3. Cek `finally` block reset state

### Delete tidak redirect

1. Verify `conversationId === id` comparison
2. Cek `router.push('/chat')` dipanggil
3. Cek tidak ada error sebelum redirect

### Mobile sidebar tidak close

1. Verify `onCloseMobile` prop passed
2. Cek `onClick={() => onCloseMobile?.()}` di Link
3. Cek `setIsMobileOpen(false)` di parent

### Race condition saat delete (ArtifactPanel kosong sementara)

1. Pastikan artifact panel di-close SEBELUM delete di `handleDeleteConversation`
2. Verify backend `artifacts.ts` return `[]` jika conversation tidak ada

### AlertDialog tidak muncul

1. Verify `deleteDialogOpen` state di-set `true`
2. Cek `conversationToDelete` tidak null
3. Verify AlertDialog imports dari `@/components/ui/alert-dialog`

### Edit mode langsung tertutup

1. Pastikan conditional Link/div rendering benar (`isEditing ? <div> : <Link>`)
2. Verify `editingId` state di-set dengan benar
3. Cek tidak ada navigation event yang tidak ter-handle

### Edit tidak bisa dilakukan untuk paper session

1. Ini adalah expected behavior (paper session lock)
2. Jika ingin edit, user harus menyelesaikan atau membatalkan paper session terlebih dahulu

### Toast error tidak muncul

1. Verify `toast` imported dari "sonner"
2. Cek `<Toaster />` component di layout
3. Verify catch block memanggil `toast.error()`

---

## Files Reference

Lihat [files-index.md](./files-index.md) untuk detail lengkap lokasi files dan line numbers.

### Summary

| File | Lines | Purpose |
|------|-------|---------|
| src/components/chat/ChatSidebar.tsx | 409 | Komponen utama sidebar + Edit + Delete |
| src/components/chat/ChatContainer.tsx | 140 | Container dengan routing + handlers |
| src/components/chat/ChatWindow.tsx | 531 | Header mobile + tombol menu |
| src/components/chat/ArtifactPanel.tsx | 120 | Panel artifacts + listByConversation |
| src/components/paper/PaperSessionBadge.tsx | 36 | Badge progress paper |
| src/components/paper/index.ts | 13 | Barrel export komponen paper |
| src/components/ui/alert-dialog.tsx | 157 | Komponen AlertDialog |
| src/components/ui/context-menu.tsx | 252 | Komponen ContextMenu |
| src/components/ui/input.tsx | 21 | Komponen Input |
| src/lib/date/formatters.ts | 28 | Relative date formatting utility |
| src/lib/hooks/useConversations.ts | 67 | Hook CRUD + update title |
| src/lib/hooks/useCurrentUser.ts | 36 | Hook get current user |
| src/lib/utils.ts | 6 | Helper `cn()` untuk className |
| src/app/chat/page.tsx | 13 | Rute /chat |
| src/app/chat/[conversationId]/page.tsx | 18 | Rute /chat/[conversationId] |
| src/components/ui/button.tsx | 62 | Komponen Button UI |
| src/components/ui/skeleton.tsx | 15 | Komponen Skeleton UI |
| src/components/ui/sheet.tsx | 139 | Komponen Sheet UI (sidebar mobile) |
| convex/conversations.ts | 140 | Query/mutation conversation |
| convex/chatHelpers.ts | 13 | Clerk → Convex user lookup |
| convex/paperSessions.ts | 1076 | Query paper sessions (getByUser: L213-222) |
| convex/artifacts.ts | 475 | Query artifacts (graceful handling: L67-71) |
| convex/users.ts | 173 | Lookup user by Clerk ID |
| convex/paperSessions/constants.ts | 61 | Stage definitions |

---

*Last updated: 2026-01-11*
