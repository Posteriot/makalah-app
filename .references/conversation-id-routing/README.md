# Conversation ID URL Routing - Technical Reference

Dokumentasi lengkap tentang sistem URL-based Conversation Routing di Makalah App.

## Daftar Isi

1. [Overview](#overview)
2. [Rationale](#rationale)
3. [Arsitektur](#arsitektur)
4. [Cara Kerja](#cara-kerja)
5. [Files & Codes Location](#files--codes-location)
6. [Key Patterns](#key-patterns)
7. [Edge Cases](#edge-cases)
8. [Catatan Teknis](#catatan-teknis)
9. [Troubleshooting](#troubleshooting)

---

## Overview

Conversation ID Routing mengubah chat routing dari static `/chat` ke dynamic route `/chat/[conversationId]` agar URL menampilkan conversation ID, mendukung browser refresh, back/forward navigation, dan deep linking.

### Before vs After

```
BEFORE (State-based):
- URL: /chat (selalu sama)
- State: useState untuk currentConversationId
- Refresh: Kehilangan context conversation
- Share: Tidak bisa share specific chat

AFTER (URL-based):
- URL: /chat/abc123xyz (menampilkan ID)
- State: Dari URL params
- Refresh: Preserved via URL
- Share: Bisa bookmark/share specific chat
```

### Key Features

- **Dynamic Route**: `/chat/[conversationId]` dengan Next.js App Router
- **Landing Page**: `/chat` sebagai empty state
- **URL-based State**: No useState untuk conversation ID
- **Link Navigation**: Prefetching enabled via next/link
- **Programmatic Navigation**: router.push untuk create/delete
- **Graceful Degradation**: Invalid ID handled tanpa crash

---

## Rationale

### Mengapa URL-based Routing?

| Aspek | State-based | URL-based |
|-------|-------------|-----------|
| **Refresh** | Kehilangan conversation | Preserved |
| **Back/Forward** | Tidak work | Native browser behavior |
| **Deep Linking** | Tidak bisa | `/chat/{id}` langsung |
| **Bookmarking** | Tidak bisa | Bisa bookmark specific chat |
| **Sharing** | Tidak bisa | Bisa share URL |
| **SEO/Analytics** | Satu route | Per-conversation tracking |

### Mengapa Next.js Dynamic Route?

1. **Convention over Configuration**: Next.js App Router pattern
2. **Automatic Prefetching**: Link component prefetch on hover
3. **Type Safety**: TypeScript-friendly params extraction
4. **Auth Integration**: Mudah integrate dengan Clerk middleware
5. **Existing Pattern**: `PaperSessionCard` sudah pakai pattern ini

### Mengapa Tidak Query Parameters?

```
❌ /chat?id=abc123  → Less clean, harder to match routes
✅ /chat/abc123     → RESTful, clear resource identification
```

---

## Arsitektur

### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                        NEXT.JS APP ROUTER                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  src/app/chat/                                                   │
│  ├── page.tsx              → /chat (landing)                    │
│  │   └── conversationId = null                                  │
│  │                                                               │
│  └── [conversationId]/                                          │
│      └── page.tsx          → /chat/{id} (dynamic)               │
│          └── conversationId = URL param                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CHATCONTAINER                            │
│                                                                  │
│  Props: { conversationId: string | null }                       │
│  State: isMobileOpen, artifactPanelOpen, selectedArtifactId,    │
│         isCreating                                               │
│  Hooks: useRouter(), useConversations()                         │
│                                                                  │
│  Navigation Methods:                                             │
│  ├── handleNewChat()           → router.push(`/chat/${newId}`)  │
│  └── handleDeleteConversation() → router.push('/chat')          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
     ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
     │ ChatSidebar  │  │ ChatWindow   │  │ArtifactPanel │
     │              │  │              │  │              │
     │ Link nav     │  │ Validation   │  │ key={id}     │
     │ onCloseMobile│  │ useQuery     │  │ reset on     │
     │ isCreating   │  │ notFound UI  │  │ nav change   │
     └──────────────┘  └──────────────┘  └──────────────┘
```

### State Management

```
┌─────────────────────────────────────────────────────────────────┐
│                      STATE OWNERSHIP                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  URL (Single Source of Truth):                                   │
│  └── conversationId                                              │
│                                                                  │
│  ChatContainer (Local State):                                    │
│  ├── isMobileOpen          → Mobile sidebar toggle               │
│  ├── artifactPanelOpen     → Artifact panel visibility           │
│  ├── selectedArtifactId    → Currently viewed artifact           │
│  └── isCreating            → New chat loading guard              │
│                                                                  │
│  ChatWindow (Derived State):                                     │
│  ├── isConversationLoading → conversation === undefined          │
│  └── conversationNotFound  → conversation === null               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cara Kerja

### 1. Route Resolution

```typescript
// src/app/chat/[conversationId]/page.tsx

interface PageProps {
  params: Promise<{ conversationId: string }>  // Next.js 16 async params
}

export default async function ChatConversationPage({ params }: PageProps) {
  // 1. Auth check (Clerk)
  const { userId } = await auth()
  if (!userId) {
    redirect("/sign-in?redirect_url=/chat")
  }

  // 2. Extract conversationId dari URL params
  const { conversationId } = await params

  // 3. Pass ke ChatContainer
  return <ChatContainer conversationId={conversationId} />
}
```

### 2. Navigation Flows

#### New Chat Creation

```
User clicks "New Chat"
        │
        ▼
┌───────────────────────────────────────┐
│ handleNewChat()                        │
│                                       │
│ 1. Guard: if (isCreating) return      │ ← Prevent double-click
│ 2. setIsCreating(true)                │ ← Show loading
│ 3. newId = await createNewConversation│ ← Convex mutation
│ 4. router.push(`/chat/${newId}`)      │ ← Navigate
│ 5. setIsCreating(false)               │ ← Reset (in finally)
└───────────────────────────────────────┘
        │
        ▼
Browser URL: /chat/{newId}
Next.js re-renders with new conversationId
```

#### Sidebar Navigation

```
User clicks conversation item
        │
        ▼
┌───────────────────────────────────────┐
│ <Link href={`/chat/${conv._id}`}>     │
│                                       │
│ 1. onClick: onCloseMobile?.()         │ ← Close mobile sidebar
│ 2. Next.js Link handles navigation    │ ← Prefetch enabled
│ 3. No state update needed             │ ← URL is truth
└───────────────────────────────────────┘
        │
        ▼
Browser URL: /chat/{conv._id}
Next.js re-renders with new conversationId
```

#### Delete Current Conversation

```
User deletes currently viewed conversation
        │
        ▼
┌───────────────────────────────────────┐
│ handleDeleteConversation(id)          │
│                                       │
│ 1. await deleteConversation(id)       │ ← Convex mutation
│ 2. if (conversationId === id) {       │ ← Check if current
│      router.push('/chat')             │ ← Redirect to landing
│    }                                  │
└───────────────────────────────────────┘
        │
        ▼
Browser URL: /chat
ChatWindow shows empty state
```

### 3. Conversation Validation

```typescript
// src/components/chat/ChatWindow.tsx

// Query conversation existence
const conversation = useQuery(
  api.conversations.getConversation,
  conversationId ? { conversationId: conversationId as Id<"conversations"> } : "skip"
)

// Derived states
const isConversationLoading = conversationId !== null && conversation === undefined
const conversationNotFound = conversationId !== null && conversation === null

// Render logic
if (!conversationId) {
  return <EmptyState />           // /chat landing
}

if (conversationNotFound) {
  return <NotFoundState />        // Invalid ID
}

if ((isHistoryLoading || isConversationLoading) && messages.length === 0) {
  return <Skeleton />             // Loading awal
}

return <ChatContent />            // Valid conversation
```

---

## Files & Codes Location

Lihat [files-index.md](./files-index.md) untuk detail lengkap lokasi files.

### Summary

| Category | Files |
|----------|-------|
| Route Pages | `src/app/chat/page.tsx`, `src/app/chat/[conversationId]/page.tsx` |
| Core Components | `ChatContainer.tsx`, `ChatSidebar.tsx`, `ChatWindow.tsx` |
| Integration | `PaperSessionCard.tsx` (existing pattern) |
| Hooks | `useConversations.ts` |

---

## Key Patterns

### 1. Async Params Extraction (Next.js 16)

```typescript
// Next.js 16 menggunakan Promise untuk params
interface PageProps {
  params: Promise<{ conversationId: string }>
}

export default async function Page({ params }: PageProps) {
  const { conversationId } = await params  // WAJIB await
  // ...
}
```

**Rationale**: Next.js 16 mengubah params menjadi async untuk mendukung streaming dan partial rendering.

### 2. Link Component dengan Mobile Close

```tsx
<Link
  href={`/chat/${conv._id}`}
  onClick={() => onCloseMobile?.()}  // Close sidebar on mobile
  className={...}
>
  {/* Content */}
</Link>
```

**Rationale**: `onClick` tetap dipanggil sebelum navigation, memungkinkan side effects seperti close sidebar.

### 3. Delete Button Inside Link

```tsx
<Link href={...}>
  {/* Content */}
  <div
    role="button"
    onClick={(e) => {
      e.preventDefault()      // Prevent Link navigation
      e.stopPropagation()     // Prevent event bubbling
      // Delete logic
    }}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        e.stopPropagation()
        // Delete logic
      }
    }}
  >
    <TrashIcon />
  </div>
</Link>
```

**Rationale**: Delete button ada di dalam Link, jadi perlu prevent default untuk menghindari navigation saat delete.

### 4. Component Key untuk Reset

```tsx
<ChatWindow
  key={conversationId}           // Force re-mount on change
  conversationId={conversationId}
/>

<ArtifactPanel
  key={conversationId ?? "no-conversation"}  // Handle null case
  conversationId={conversationId}
/>
```

**Rationale**: `key` prop memaksa React unmount/remount component, memastikan internal state di-reset saat conversation berubah.

### 5. Conditional Convex Query

```typescript
const conversation = useQuery(
  api.conversations.getConversation,
  conversationId ? { conversationId: ... } : "skip"  // Skip if null
)
```

**Rationale**: `"skip"` adalah Convex idiom untuk conditional queries - menghindari error saat `conversationId` null.

### 6. Loading vs Not Found Detection

```typescript
const isConversationLoading = conversationId !== null && conversation === undefined
const conversationNotFound = conversationId !== null && conversation === null
```

**Rationale**:
- `undefined` = Query belum selesai (loading)
- `null` = Query selesai, data tidak ada (not found)
- Distinction ini memungkinkan UI yang tepat untuk setiap state

---

## Edge Cases

### 1. Invalid Conversation ID

**Scenario**: User access `/chat/invalid-id-xxx`

**Handling**:
```typescript
if (conversationNotFound) {
  return (
    <div>
      <SearchXIcon />
      <p>Percakapan tidak ditemukan</p>
      <p>Percakapan mungkin telah dihapus atau URL tidak valid.</p>
    </div>
  )
}
```

**Result**: Friendly error message, no crash.

### 2. Double-Click New Chat

**Scenario**: User double-clicks "New Chat" button

**Handling**:
```typescript
const handleNewChat = async () => {
  if (isCreating) return  // Guard
  setIsCreating(true)
  try {
    // ... create logic
  } finally {
    setIsCreating(false)
  }
}
```

**Result**: Second click ignored, only one conversation created.

### 3. Delete Current Conversation

**Scenario**: User deletes the conversation they're viewing

**Handling**:
```typescript
if (conversationId === id) {
  router.push('/chat')  // Redirect to landing
}
```

**Result**: User redirected to empty state, not stuck on deleted conversation.

### 4. Delete Non-Current Conversation

**Scenario**: User deletes a different conversation from sidebar

**Handling**:
```typescript
if (conversationId === id) {
  router.push('/chat')
}
// Else: no redirect, stay on current
```

**Result**: User stays on current conversation, sidebar updates via Convex reactivity.

### 5. Mobile Sidebar Close

**Scenario**: User clicks conversation on mobile

**Handling**:
```tsx
<Link
  href={...}
  onClick={() => onCloseMobile?.()}  // Close before navigate
>
```

**Result**: Sidebar closes, then navigation happens.

### 6. Browser Refresh

**Scenario**: User refreshes page on `/chat/abc123`

**Handling**: URL contains conversation ID, so:
1. Next.js matches dynamic route
2. Auth check runs
3. ChatContainer receives conversationId from params
4. ChatWindow queries and displays conversation

**Result**: Conversation preserved.

### 7. Browser Back/Forward

**Scenario**: User navigates between conversations using browser buttons

**Handling**: Next.js App Router handles history automatically.

**Result**: Native browser navigation works correctly.

---

## Catatan Teknis

### 1. Auth Protection

Route `/chat/[conversationId]` auto-protected oleh `proxy.ts` karena falls under existing matcher pattern:

```typescript
// src/proxy.ts
export const config = {
  matcher: [
    // ... patterns
    '/chat/:path*',  // Matches /chat and /chat/*
  ]
}
```

### 2. Backward Compatibility

- `/chat` route tetap accessible sebagai landing page
- Existing links ke `/chat` dari dashboard tetap work
- `PaperSessionCard` sudah pakai `/chat/${id}` pattern

### 3. No Database Changes

Implementasi ini murni routing layer:
- No schema changes
- No new Convex functions
- Only uses existing `getConversation` query

### 4. Prefetching

Next.js Link component menyediakan prefetch default (dikontrol oleh Next.js):
```tsx
<Link href={`/chat/${id}`}>  // Prefetch enabled by default
```

### 5. Scope Guard

Files yang TIDAK dimodifikasi:
- `src/app/api/chat/route.ts` (Chat API)
- `src/lib/ai/*` (AI logic)
- `convex/paperSessions.ts` (Paper workflow)
- `convex/aiProviderConfigs.ts` (AI config)
- `src/components/paper/*` (Paper components)

---

## Troubleshooting

### URL tidak berubah setelah klik conversation

1. Pastikan menggunakan `<Link>` bukan `<button>`
2. Cek browser console untuk errors
3. Verify `href` prop correct: `` href={`/chat/${id}`} ``

### Conversation hilang setelah refresh

1. Verify route dynamic: `src/app/chat/[conversationId]/page.tsx` exists
2. Check `await params` di server component
3. Verify `conversationId` passed to ChatContainer

### "Percakapan tidak ditemukan" untuk valid ID

1. Check Convex connection
2. Verify `api.conversations.getConversation` query exists
3. Check user authorization (conversation belongs to user)

### Double-click creates multiple conversations

1. Verify `isCreating` guard in `handleNewChat`
2. Check `isCreating` state initialized to `false`
3. Verify `finally` block resets state

### Mobile sidebar tidak close

1. Verify `onCloseMobile` prop passed to ChatSidebar
2. Check `onClick={() => onCloseMobile?.()}` on Link
3. Verify `setIsMobileOpen(false)` in parent

### Delete button triggers navigation

1. Verify `e.preventDefault()` in onClick
2. Verify `e.stopPropagation()` in onClick
3. Check both `onClick` and `onKeyDown` handlers

---

## Related Documentation

- **Spec Files**: `.development/specs/conversation-id-routing/`
- **Implementation Reports**: `.development/specs/conversation-id-routing/implementation/`
- **Verification Reports**: `.development/specs/conversation-id-routing/implementation/verification/`

---

*Last updated: 2026-01-04*
*Implementation: Complete (TG1-TG4 verified)*
