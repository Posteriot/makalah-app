# Chat Runtime Architecture

Dokumen ini adalah peta arsitektur runtime halaman chat untuk kebutuhan maintenance, optimasi, dan source of truth lintas tim.

## 1. Tujuan dan Scope

### Tujuan

- Menjadi acuan tunggal untuk memahami cara kerja runtime halaman chat dari UI sampai persistence.
- Menetapkan boundary komponen, state ownership, dan dependency utama sebelum audit lanjutan.

### In Scope

- Route: `/chat` dan `/chat/[conversationId]`
- Runtime UI shell chat + artifact workspace
- Alur data: `UI -> /api/chat -> Convex -> UI`
- Dependency utama yang memengaruhi behavior runtime chat

### Out of Scope

- Detail visual token/style rule (dibahas di dokumen UI/theme terpisah)
- Test plan QA matrix detail (dibahas di dokumen quality gates)
- Detail kontrak semua schema Convex lintas fitur non-chat

## 2. Boundary Arsitektur

### Route Boundary

- `src/app/chat/page.tsx`: entry landing chat, inject `conversationId={null}` ke `ChatContainer`.
- `src/app/chat/[conversationId]/page.tsx`: entry chat by ID, await async params lalu inject ke `ChatContainer`.
- `src/app/chat/layout.tsx`: wrapper layout route-level.

### UI Runtime Boundary

- Root runtime client: `src/components/chat/ChatContainer.tsx`
- Shell layout: `src/components/chat/layout/ChatLayout.tsx`
- Conversation runtime: `src/components/chat/ChatWindow.tsx`
- Artifact runtime: `src/components/chat/ArtifactPanel.tsx`

### Server Runtime Boundary

- Endpoint utama: `src/app/api/chat/route.ts`
- AI/model/provider orchestration: `src/lib/ai/streaming.ts`
- System prompt resolver: `src/lib/ai/chat-config.ts`

### Data Boundary (Convex)

- Conversation: `convex/conversations.ts`
- Message: `convex/messages.ts`
- Artifact: `convex/artifacts.ts`
- Paper session: `convex/paperSessions.ts`
- Auth-user bridge: `convex/chatHelpers.ts`
- File context: `convex/files.ts`

## 3. Parent-Child Runtime Tree

```text
/chat + /chat/[conversationId]
  -> ChatContainer
    -> ChatLayout
      -> ActivityBar
      -> ChatSidebar
         -> SidebarChatHistory | SidebarPaperSessions | SidebarProgress
      -> TopBar
      -> PanelResizer (left/right)
      -> children: ChatWindow
      -> artifactPanel: ArtifactPanel
    -> ChatWindow
      -> QuotaWarningBanner
      -> TemplateGrid
      -> MessageBubble
         -> MarkdownRenderer
            -> InlineCitationChip
               -> ai-elements/inline-citation
         -> QuickActions / ToolStateIndicator / SearchStatusIndicator / SourcesIndicator / ArtifactIndicator
      -> ChatInput
         -> FileUploadButton
      -> ChatProcessStatusBar
      -> PaperValidationPanel
    -> ArtifactPanel
      -> ArtifactTabs
      -> ArtifactToolbar
      -> ArtifactViewer
         -> ArtifactEditor / ChartRenderer / MarkdownRenderer / SourcesIndicator / RefrasaTabContent
      -> FullsizeArtifactModal
```

## 4. State Ownership (Single Source per State)

## 4.1 Route dan Shell State

- Owner: `ChatContainer`
  - `conversationId` validasi format Convex ID (regex 32-char lowercase alphanumeric).
  - `isMobileOpen` untuk sidebar mobile sheet.
  - Artifact tab state via `useArtifactTabs`:
    - `openTabs`
    - `activeTabId`
    - open/close/setActive/updateTitle
  - `artifactPanelOpen` diturunkan dari `openTabs.length > 0`.
  - `handleArtifactSelect` membuka tab artifact aktif.

- Owner: `ChatLayout`
  - `activePanel` (`chat-history | paper | progress`)
  - `isSidebarCollapsed`
  - `sidebarWidth`, `panelWidth` (resizable)
  - `isCreating` untuk state pembuatan conversation dari sidebar

## 4.2 Conversation State

- Owner: `ChatWindow`
  - Input state: `input`, `uploadedFileIds`
  - Stream lifecycle state: `status`, `messages`, process UI state
  - Scrolling state: `isAtBottom`, pending auto-scroll refs
  - Start-chat state: `isCreatingChat`

- Data source hooks
  - `useMessages(conversationId)` -> history Convex
  - `usePaperSession(conversationId)` -> stage/session state
  - `useSession` + `api.chatHelpers.getUserId` -> resolve app user ID

## 4.3 User/Auth State

- Owner hook: `useCurrentUser`
  - Source: BetterAuth session + Convex user query
  - Fallback behavior: cache last known user untuk mengurangi flicker saat re-auth query.
  - Auto-create app user saat auth ada tapi record Convex belum ada.

## 4.4 Artifact State

- Owner: `useArtifactTabs`
  - Session-local tab state (tanpa URL sync/localStorage)
  - Max tab: 8
  - Refrasa tab reuse berbasis `sourceArtifactId`

- Owner runtime data: `ArtifactPanel`
  - Query artifact by conversation (`api.artifacts.listByConversation`)
  - Resolve active artifact by `activeTabId`

## 5. Data Flow End-to-End

## 5.1 Initial Load

1. Route render `ChatContainer`.
2. `ChatContainer` resolve user (`useCurrentUser`) dan validasi `conversationId`.
3. Kalau landing `/chat` (`conversationId === null`), jalankan cleanup non-blocking `useCleanupEmptyConversations`.
4. `ChatLayout` fetch list conversation via `useConversations`.
5. `ChatWindow`:
   - Cek conversation exists (`api.conversations.getConversation`) jika ada ID.
   - Fetch message history (`useMessages`).
   - Sync history ke `useChat` internal state via `setMessages`.

## 5.2 Create New Chat (dari Sidebar atau Empty State)

1. UI trigger create conversation (`api.conversations.createConversation`).
2. Redirect ke `/chat/{newId}`.
3. Optional starter prompt disimpan di `sessionStorage` lalu dikonsumsi setelah redirect.

## 5.3 Send Message Runtime (`UI -> API -> Convex -> UI`)

1. `ChatInput` submit -> `ChatWindow.sendMessage` (AI SDK `useChat` + `DefaultChatTransport`).
2. Request POST ke `src/app/api/chat/route.ts` dengan body berisi:
   - `messages`
   - `conversationId`
   - `fileIds`
3. API route:
   - Validasi auth BetterAuth.
   - Ambil Convex token untuk guarded query/mutation.
   - Resolve user (`api.chatHelpers.getMyUserId`).
   - Quota pre-flight check.
   - Create conversation jika belum ada.
   - Persist user message (`api.messages.createMessage`).
   - Susun system prompt + paper prompt + file context + sources context.
   - Pilih mode tool: web search only atau function tools.
   - Stream response via `streamText`.
4. Saat stream finish:
   - Persist assistant message (`api.messages.createMessage`).
   - Persist source metadata bila ada.
   - Record usage billing.
   - Optional update title otomatis.
5. UI menerima stream dan update `messages` realtime.

## 5.4 Web Search Mode Routing

1. Router logic di API menilai `enableWebSearch` berdasarkan:
   - explicit search intent
   - paper stage policy (active/passive)
   - apakah search sebelumnya sudah cukup
   - confirmation/save intent
2. Jika web search mode aktif:
   - tool set hanya `google_search`
   - function tools dinonaktifkan pada request yang sama
3. Stream menulis custom data part:
   - `data-search` (status searching/done/off/error)
   - `data-cited-text`
   - `data-cited-sources`

## 5.5 Fallback Provider Flow

1. Primary gateway gagal -> fallback OpenRouter.
2. Jika mode search aktif dan config fallback allow:
   - model fallback pakai suffix `:online`.
   - normalisasi citations dari provider metadata OpenRouter.
3. Jika `:online` gagal:
   - degrade ke fallback non-search mode.

## 5.6 Artifact Creation/Update Flow

1. Tool call `createArtifact` atau `updateArtifact` di API route.
2. Persist via `api.artifacts.create` atau `api.artifacts.update`.
3. `ChatWindow.onFinish` parse tool output dan trigger `onArtifactSelect`.
4. `ChatContainer` buka tab artifact terkait -> `ArtifactPanel` render viewer.

## 5.7 Paper Mode Flow

1. `usePaperSession` men-drive status stage dan label stage.
2. Saat pending validation, `PaperValidationPanel` muncul di footer messages.
3. Approve/revise trigger mutation paper session.
4. Rewind stage (`rewindToStage`) bisa menulis system message untuk memberi konteks ke AI.

## 5.8 Edit Message Flow (Edit + Truncate)

1. User edit message pada `MessageBubble`.
2. `ChatWindow` resolve Convex message ID (handle client-generated ID mismatch).
3. Mutation `api.messages.editAndTruncateConversation` menghapus message edited + subsequent messages.
4. Local message state dipotong lalu edited content dikirim ulang sebagai user message baru.

## 6. Dependency Utama per Layer

## 6.1 UI Runtime Dependencies

- Chat orchestration:
  - `src/components/chat/ChatContainer.tsx`
  - `src/components/chat/layout/ChatLayout.tsx`
  - `src/components/chat/ChatWindow.tsx`
  - `src/components/chat/ArtifactPanel.tsx`
- Sidebar shell:
  - `src/components/chat/shell/ActivityBar.tsx`
  - `src/components/chat/shell/TopBar.tsx`
  - `src/components/chat/ChatSidebar.tsx`

## 6.2 Data/Hook Dependencies

- `src/lib/hooks/useCurrentUser.ts`
- `src/lib/hooks/useConversations.ts`
- `src/lib/hooks/useMessages.ts`
- `src/lib/hooks/usePaperSession.ts`
- `src/lib/hooks/useArtifactTabs.ts`
- `src/lib/hooks/useCleanupEmptyConversations.ts`

## 6.3 Server/API Dependencies

- `src/app/api/chat/route.ts`
- `src/lib/ai/streaming.ts`
- `src/lib/ai/chat-config.ts`
- `src/lib/ai/paper-tools.ts`

## 6.4 Convex Dependencies

- `convex/chatHelpers.ts`
- `convex/conversations.ts`
- `convex/messages.ts`
- `convex/artifacts.ts`
- `convex/paperSessions.ts`
- `convex/files.ts`

## 6.5 External Runtime Dependencies

- AI SDK: `ai`, `@ai-sdk/react`, `@ai-sdk/gateway`, `@openrouter/ai-sdk-provider`
- State/data realtime: `convex/react`, `convex/nextjs`
- Routing/framework: `next/navigation`, Next.js App Router
- UI infra: `react-virtuoso`, `sonner`, `iconoir-react`, Radix/shadcn UI primitives

## 7. Invariant Arsitektur yang Harus Dijaga

- `conversationId` di layer client harus lolos format Convex ID sebelum dipakai query/mutation sensitif.
- Web search mode tidak boleh mix `google_search` dengan function tools pada request yang sama.
- Persistence message tetap terjadi saat finish stream (termasuk handling tertentu saat abort).
- Artifact panel terbuka berdasarkan source of truth tab state (`openTabs.length > 0`).
- Paper mode permission/edit boundary mengacu ke stage state (`stageData`, `currentStage`).
- Cleanup empty conversations hanya dieksekusi saat landing state (`/chat` tanpa ID).

## 8. Risiko Arsitektur Saat Maintenance

- Drift antara local UI state `messages` dan persisted history jika urutan sync berubah.
- Regression pada route invalid conversation jika auth-settlement check diubah.
- Loop routing web search vs paper tools jika heuristik stage policy dimodifikasi tanpa guard.
- Inconsistency artifact title/tab jika update sinkronisasi title ke tab dihapus.

## 9. Referensi Dokumen Internal

- Baseline file map: `docs/chat-page/baseline-file-map.md`
- Konteks roadmap doc chat: `docs/chat-page/context.md`

## 10. Status Dokumen

- Status: **active source of truth (runtime architecture)**
- Update saat ada perubahan pada:
  - struktur parent-child utama,
  - ownership state,
  - jalur data `/api/chat`,
  - dependency runtime inti.

