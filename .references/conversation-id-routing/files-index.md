# Conversation ID Routing - Files Index

Quick reference untuk lokasi semua files terkait URL-based Conversation Routing.

## Quick Jump

| Category | Count | Files |
|----------|-------|-------|
| [Route Pages](#route-pages) | 2 | Dynamic route, landing page |
| [Core Components](#core-components) | 3 | Container, Sidebar, Window |
| [Integration Points](#integration-points) | 1 | PaperSessionCard (existing pattern) |
| [Hooks](#hooks) | 1 | useConversations |
| **Total** | **7** | |

---

## Route Pages

```
src/app/chat/
├── page.tsx                              # Landing page (/chat)
└── [conversationId]/
    └── page.tsx                          # Dynamic route (/chat/{id})
```

### Landing Page (src/app/chat/page.tsx)

| Line | What's There |
|------|--------------|
| 1-3 | Imports: auth, redirect, ChatContainer |
| 5-10 | Auth check dengan redirect ke sign-in |
| 12 | `<ChatContainer conversationId={null} />` |

### Dynamic Route (src/app/chat/[conversationId]/page.tsx)

| Line | What's There |
|------|--------------|
| 1-3 | Imports: auth, redirect, ChatContainer |
| 5-7 | Interface dengan async params (Next.js 16) |
| 9-17 | Server component: auth → extract params → render |
| 16 | `await params` untuk extract conversationId |
| 17 | `<ChatContainer conversationId={conversationId} />` |

---

## Core Components

```
src/components/chat/
├── ChatContainer.tsx                     # Router navigation, state management
├── ChatSidebar.tsx                       # Link-based navigation
└── ChatWindow.tsx                        # Conversation validation
```

### ChatContainer (src/components/chat/ChatContainer.tsx)

| Line | What's There |
|------|--------------|
| 4 | `import { useRouter } from "next/navigation"` |
| 13-15 | Interface: `{ conversationId: string \| null }` |
| 17-18 | Props destructuring, router hook |
| 22 | `isCreating` state untuk loading guard |
| 36-49 | `handleNewChat()` dengan `router.push(\`/chat/${newId}\`)` |
| 51-58 | `handleDeleteConversation()` dengan redirect logic |
| 66, 82 | Pass `conversationId` ke ChatSidebar |
| 102-103 | Pass `conversationId` ke ChatWindow |

**Key Functions:**

```typescript
// handleNewChat - Navigate setelah create
const handleNewChat = async () => {
    if (isCreating) return
    setIsCreating(true)
    try {
        const newId = await createNewConversation()
        if (newId) {
            router.push(`/chat/${newId}`)
        }
    } finally {
        setIsCreating(false)
    }
}

// handleDeleteConversation - Redirect jika current
const handleDeleteConversation = async (id: string) => {
    await deleteConversation(id as Id<"conversations">)
    if (conversationId === id) {
        router.push('/chat')
    }
}
```

### ChatSidebar (src/components/chat/ChatSidebar.tsx)

| Line | What's There |
|------|--------------|
| 3 | `import Link from "next/link"` |
| 14-27 | Interface tanpa `onSelectConversation` |
| 26 | `isCreating` prop untuk loading state |
| 60-79 | New Chat button dengan loading indicator |
| 102-150 | `<Link href={\`/chat/${conv._id}\`}>` untuk items |
| 105 | `onClick={() => onCloseMobile?.()}` untuk mobile |
| 128-143 | Delete button dengan `e.preventDefault()` |

**Link Pattern:**

```tsx
<Link
    href={`/chat/${conv._id}`}
    onClick={() => onCloseMobile?.()}
    className={`... ${currentConversationId === conv._id ? "bg-accent" : "hover:bg-accent/50"}`}
>
    {/* Conversation content */}
    <div
        role="button"
        onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            // Delete logic
        }}
    >
        <TrashIcon />
    </div>
</Link>
```

### ChatWindow (src/components/chat/ChatWindow.tsx)

| Line | What's There |
|------|--------------|
| 9 | Import `SearchXIcon` dari lucide-react |
| 54-57 | `useQuery(api.conversations.getConversation)` |
| 58 | `isConversationLoading` detection |
| 59 | `conversationNotFound` detection |
| 283-301 | Empty state untuk `!conversationId` |
| 303-323 | "Percakapan tidak ditemukan" UI |
| 349 | Loading skeleton includes `isConversationLoading` |

**Validation Logic:**

```typescript
// Check if conversation exists
const conversation = useQuery(
    api.conversations.getConversation,
    conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
)
const isConversationLoading = conversationId !== null && conversation === undefined
const conversationNotFound = conversationId !== null && conversation === null

// Handle invalid/not-found
if (conversationNotFound) {
    return (
        <div className="...">
            <SearchXIcon className="h-12 w-12 ..." />
            <p>Percakapan tidak ditemukan</p>
            <p>Percakapan mungkin telah dihapus atau URL tidak valid.</p>
        </div>
    )
}
```

---

## Integration Points

```
src/components/paper/
└── PaperSessionCard.tsx                  # Pre-existing Link pattern (line 192-197)
```

### PaperSessionCard (src/components/paper/PaperSessionCard.tsx)

Pattern yang sudah ada sebelum implementasi routing:

```tsx
// Line 192-197 (existing pattern yang menjadi referensi)
<Link
    href={`/chat/${session.conversationId}`}
    className="flex items-center gap-2 ..."
>
    Lanjutkan →
</Link>
```

---

## Hooks

```
src/lib/hooks/
└── useConversations.ts                   # CRUD operations
```

### useConversations (src/lib/hooks/useConversations.ts)

| Export | Type | Description |
|--------|------|-------------|
| `conversations` | Array | List of conversations |
| `createNewConversation()` | Function | Returns new conversation ID |
| `deleteConversation(id)` | Function | Delete by ID |
| `isLoading` | Boolean | Loading state |

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        URL NAVIGATION FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser URL: /chat/abc123                                       │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────┐                        │
│  │ src/app/chat/[conversationId]/      │                        │
│  │ page.tsx                            │                        │
│  │                                     │                        │
│  │ 1. Auth check (Clerk)               │                        │
│  │ 2. Extract conversationId from URL  │                        │
│  │ 3. Pass to ChatContainer            │                        │
│  └─────────────────────────────────────┘                        │
│       │                                                          │
│       ▼ conversationId="abc123"                                  │
│  ┌─────────────────────────────────────┐                        │
│  │ ChatContainer                        │                        │
│  │                                     │                        │
│  │ Props: { conversationId }           │                        │
│  │ Router: useRouter()                 │                        │
│  └─────────────────────────────────────┘                        │
│       │                                                          │
│       ├─────────────────┬─────────────────┐                     │
│       ▼                 ▼                 ▼                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐              │
│  │ChatSidebar│    │ChatWindow│    │ArtifactPanel │              │
│  │           │    │          │    │              │              │
│  │Link nav   │    │Validation│    │key={convId}  │              │
│  │isCreating │    │useQuery  │    │              │              │
│  └──────────┘    └──────────┘    └──────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      NEW CHAT FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User clicks "New Chat"                                          │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────┐                        │
│  │ ChatContainer.handleNewChat()        │                        │
│  │                                     │                        │
│  │ 1. Guard: if (isCreating) return    │                        │
│  │ 2. setIsCreating(true)              │                        │
│  │ 3. newId = createNewConversation()  │                        │
│  │ 4. router.push(`/chat/${newId}`)    │                        │
│  │ 5. setIsCreating(false)             │                        │
│  └─────────────────────────────────────┘                        │
│       │                                                          │
│       ▼                                                          │
│  Browser navigates to /chat/{newId}                              │
│  Page re-renders with new conversationId                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    SIDEBAR CLICK FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User clicks conversation in sidebar                             │
│       │                                                          │
│       ▼                                                          │
│  ┌─────────────────────────────────────┐                        │
│  │ <Link href={`/chat/${conv._id}`}>   │                        │
│  │                                     │                        │
│  │ 1. onClick: onCloseMobile?.()       │ ← Close mobile sidebar │
│  │ 2. Next.js handles navigation       │ ← Prefetch enabled     │
│  │ 3. Browser URL updates              │                        │
│  └─────────────────────────────────────┘                        │
│       │                                                          │
│       ▼                                                          │
│  Page re-renders with new conversationId                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Search Patterns

```bash
# Find all routing-related files
grep -r "conversationId" src/app/chat/ --include="*.tsx"

# Find Link usage in chat components
grep -r "import Link from" src/components/chat/ --include="*.tsx"

# Find router.push usage
grep -r "router\.push" src/components/chat/ --include="*.tsx"

# Find conversation validation
grep -r "conversationNotFound\|getConversation" src/components/chat/

# Find useRouter imports
grep -r "useRouter.*next/navigation" src/components/
```

---

## Quick Reference: Key Lines

| File | Line(s) | What's There |
|------|---------|--------------|
| `src/app/chat/page.tsx` | 12 | `<ChatContainer conversationId={null} />` |
| `src/app/chat/[conversationId]/page.tsx` | 6 | `params: Promise<{ conversationId: string }>` |
| `src/app/chat/[conversationId]/page.tsx` | 16-17 | `await params` + render |
| `src/components/chat/ChatContainer.tsx` | 4 | `useRouter` import |
| `src/components/chat/ChatContainer.tsx` | 44 | `router.push(\`/chat/${newId}\`)` |
| `src/components/chat/ChatContainer.tsx` | 56 | `router.push('/chat')` |
| `src/components/chat/ChatSidebar.tsx` | 3 | `Link` import |
| `src/components/chat/ChatSidebar.tsx` | 102-105 | `<Link href=...>` |
| `src/components/chat/ChatSidebar.tsx` | 129 | `e.preventDefault()` |
| `src/components/chat/ChatWindow.tsx` | 54-57 | `useQuery(getConversation)` |
| `src/components/chat/ChatWindow.tsx` | 59 | `conversationNotFound` |
| `src/components/chat/ChatWindow.tsx` | 304-323 | Not found UI |

---

*Last updated: 2026-01-04*
