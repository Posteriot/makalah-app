# Chat Contracts and Data Model

Dokumen ini menetapkan kontrak runtime halaman chat sebagai source of truth untuk maintenance, optimasi, dan perubahan fitur lintas frontend-backend.

## 1. Scope Kontrak

- Route chat yang dicakup: `/chat`, `/chat/[conversationId]`.
- Endpoint server yang dicakup:
- `POST /api/chat`
- `POST /api/extract-file`
- `POST /api/refrasa`
- Kontrak data yang dicakup:
- tabel Convex yang dipakai langsung runtime chat
- query/mutation yang dipakai UI chat dan API route

## 2. Kontrak Endpoint `POST /api/chat`

### 2.1 Request Contract

- Auth wajib: BetterAuth session valid.
- Body (AI SDK transport):
- `messages`: array UI message (minimal mengandung role + text/content yang valid)
- `conversationId`: `Id<"conversations"> | null`
- `fileIds`: optional `Id<"files">[]`
- Perilaku penting:
- jika `conversationId` kosong, backend akan create conversation baru
- backend menyimpan user message ke `messages` sebelum streaming assistant
- backend menambahkan context sistem (system prompt, paper prompt, file context, sources context)

### 2.2 Response Contract

- Success: response stream UIMessage (`toUIMessageStreamResponse()` atau `createUIMessageStreamResponse()`).
- Error status:
- `401`: unauthorized atau token Convex tidak tersedia
- `404`: user app tidak ditemukan di database
- `402`: quota/credit tidak cukup (`error: "quota_exceeded"`, plus detail reason/action/balance)
- `500`: internal server error

### 2.3 Streaming Data Parts yang Dikirim

- part standar stream text AI SDK (text delta, finish, source-url jika ada).
- part custom tambahan:
- `data-search`: status pencarian (`searching | done | off | error`)
- `data-cited-text`: teks final yang sudah disisipi marker sitasi inline
- `data-cited-sources`: daftar sumber sitasi ter-normalisasi

### 2.4 Tool Routing Contract

- Dalam satu request, mode tool bersifat mutually exclusive:
- mode websearch: hanya `google_search`
- mode normal: function tools (`createArtifact`, `updateArtifact`, `renameConversationTitle`, paper tools)
- Tidak boleh campur provider-defined tool (`google_search`) dan function tools pada request yang sama.

### 2.5 Side Effects Persistence Contract

- User message dipersist ke `messages`.
- Assistant message dipersist ke `messages` (dengan metadata model dan optional `sources`).
- Penggunaan token/biaya direkam via billing usage.
- Untuk websearch pada paper mode, referensi bisa di-append ke `paperSessions.stageData` lewat `appendSearchReferences`.
- Judul conversation dapat di-update otomatis oleh AI sesuai guard count/lock.

## 3. Kontrak Tool di `POST /api/chat`

### 3.1 Artifact Tools

- `createArtifact`
- input: `type`, `title`, `content`, optional `format`, `description`, `sources`
- output sukses: `{ success: true, artifactId, title, message }`
- output gagal: `{ success: false, error }`
- `updateArtifact`
- input: `artifactId`, `content`, optional `title`, `sources`
- output sukses: `{ success: true, newArtifactId, oldArtifactId, version, message }`
- output gagal: `{ success: false, error }`

### 3.2 Conversation Title Tool

- `renameConversationTitle`
- input: `title` (3-50 chars)
- guard utama: ownership, tidak locked, max update AI, minimum message pair
- output: `{ success: true, title }` atau `{ success: false, error }`

### 3.3 Paper Tools

- `startPaperSession`
- input optional: `initialIdea`
- output: `sessionId` atau error
- `getCurrentPaperState`
- input: kosong
- output: status session by conversation
- `updateStageData`
- input: `ringkasan` (required), optional `ringkasanDetail`, optional `data` object
- stage diambil otomatis dari session aktif (bukan dari input caller)
- `submitStageForValidation`
- input: kosong
- output: status submit validasi

## 4. Kontrak Endpoint `POST /api/extract-file`

### 4.1 Request/Response

- Request body: `{ fileId }`
- Auth wajib.
- Success response: `{ success: true, fileId, fileName, textLength }`
- Failure response:
- validation/not found/unauthorized sesuai status
- extraction gagal: `{ success: false, fileId, fileName, error }`

### 4.2 Lifecycle Kontrak File Extraction

- `files.generateUploadUrl` -> upload blob ke Convex storage.
- `files.createFile` membuat record file awal.
- `POST /api/extract-file` melakukan ekstraksi berdasarkan MIME.
- hasil ekstraksi ditulis via `files.updateExtractionResult`:
- `extractionStatus`: `success | failed` (+ error message jika gagal).

## 5. Kontrak Endpoint `POST /api/refrasa`

### 5.1 Request Contract

- Body tervalidasi Zod:
- `content`: string minimal 50 karakter
- `artifactId`: optional string
- Auth wajib.

### 5.2 Response Contract

- Success:
- `issues`: array issue refrasa
- `refrasedText`: hasil perbaikan teks
- Error:
- `400` validation error
- `401` unauthorized
- `500` model/provider gagal total

### 5.3 Persist Contract ke Convex

- UI hook `useRefrasa` memanggil endpoint ini, lalu persist hasil ke `artifacts.createRefrasa`.
- Refrasa artifact terhubung ke source artifact via `sourceArtifactId`.

## 6. Data Model Convex (Chat Runtime)

### 6.1 Tabel Inti dan Relasi

- `conversations`
- owner: `userId`
- relasi: 1 conversation -> banyak `messages`, banyak `artifacts`, optional 1 `paperSessions`
- `messages`
- relasi: banyak message -> 1 conversation
- fields penting: `role`, `content`, optional `fileIds`, optional `sources`, optional `metadata.model`
- `artifacts`
- relasi: banyak artifact -> 1 conversation
- versioning via `version` + `parentId`
- invalidation rewind via `invalidatedAt`, `invalidatedByRewindToStage`
- `paperSessions`
- relasi: 1 session -> 1 conversation
- state: `currentStage`, `stageStatus`, `stageData`, `paperMemoryDigest`, dirty flag
- `rewindHistory`
- audit rewind: from/to stage + invalidated artifact IDs
- `files`
- owner: `userId`
- optional link ke `conversationId`/`messageId`
- extraction fields: `extractedText`, `extractionStatus`, `extractionError`, `processedAt`

### 6.2 Index Kontrak yang Paling Relevan

- `conversations.by_user`
- `messages.by_conversation`
- `artifacts.by_conversation`
- `paperSessions.by_conversation`
- `rewindHistory.by_session`
- `files.by_conversation`

## 7. Query/Mutation Contract yang Dipakai Runtime Chat

### 7.1 Conversations

- Query:
- `chatHelpers.getUserId`
- `chatHelpers.getMyUserId`
- `conversations.listConversations`
- `conversations.getConversation`
- Mutation:
- `conversations.createConversation`
- `conversations.deleteConversation`
- `conversations.updateConversation`
- `conversations.updateConversationTitleFromAI`
- `conversations.updateConversationTitleFromUser`
- `conversations.cleanupEmptyConversations`

### 7.2 Messages

- Query:
- `messages.getMessages`
- `messages.getRecentSources`
- `messages.countMessagePairsForConversation`
- Mutation:
- `messages.createMessage`
- `messages.editAndTruncateConversation`

### 7.3 Artifacts

- Query:
- `artifacts.get`
- `artifacts.listByConversation`
- `artifacts.getVersionHistory`
- `artifacts.getBySourceArtifact`
- `artifacts.getInvalidatedByConversation`
- `artifacts.checkFinalStatus`
- Mutation:
- `artifacts.create`
- `artifacts.update`
- `artifacts.createRefrasa`
- `artifacts.clearInvalidation`

### 7.4 Paper Sessions

- Query:
- `paperSessions.getByConversation`
- `paperSessions.getByUser`
- Mutation:
- `paperSessions.create`
- `paperSessions.updateStageData`
- `paperSessions.submitForValidation`
- `paperSessions.approveStage`
- `paperSessions.requestRevision`
- `paperSessions.updateWorkingTitle`
- `paperSessions.markStageAsDirty`
- `paperSessions.appendSearchReferences`
- `paperSessions.rewindToStage`

### 7.5 Files

- Query:
- `files.getFile`
- `files.getFileUrl`
- `files.getFilesByIds`
- Mutation:
- `files.generateUploadUrl`
- `files.createFile`
- `files.updateExtractionResult`

### 7.6 Runtime Support (Billing, User, Config)

- User:
- `users.getUserByBetterAuthId`
- `users.createAppUser`
- Billing (banner dan meter):
- `billing.quotas.getUserQuota`
- `billing.quotas.getQuotaStatus`
- `billing.credits.getCreditBalance`
- `billing.subscriptions.checkSubscriptionStatus`
- Billing enforcement (server):
- `billing.quotas.checkQuota`
- `billing.usage.recordUsage`
- `billing.quotas.deductQuota`
- `billing.credits.deductCredits`
- Feature toggle/config:
- `aiProviderConfigs.getActiveConfig`
- `aiProviderConfigs.getRefrasaEnabled`

## 8. Access Control Contract

- Query cenderung fail-safe:
- return `null` atau `[]` pada case unauthorized/not-found tertentu (khusus query yang dipakai UI).
- Mutation cenderung strict:
- throw error ketika unauthorized, invalid state, atau entity tidak ditemukan.
- Guard ownership dominan:
- conversation owner untuk message/artifact/session yang terkait conversation.
- user owner untuk file dan record user-bound lain.

## 9. State Machine Contract (Paper Session)

- `stageStatus` yang dipakai runtime:
- `drafting`
- `pending_validation`
- `revision`
- `approved` (terminal saat completed)
- Guard penting:
- `submitForValidation` dan `approveStage` wajib punya `ringkasan`.
- `updateStageData` ditolak jika stage mismatch atau status pending validation.
- `rewindToStage` dibatasi valid target dan history validasi.

## 10. Invariant Kontrak yang Harus Stabil

- Kontrak body `POST /api/chat` tetap kompatibel dengan `DefaultChatTransport` (`messages`, `conversationId`, `fileIds`).
- Format role message yang diproses backend tetap `user | assistant | system`.
- Websearch mode tetap terpisah dari function tools dalam satu request.
- `artifacts.update` selalu membuat versi baru (immutable version chain).
- `messages.editAndTruncateConversation` tetap jadi satu-satunya jalur resmi edit+resend.
- `paperSessions.updateStageData` tetap auto-stage di layer tool (`createPaperTools`).

## 11. Daftar File Referensi

- `src/app/api/chat/route.ts`
- `src/app/api/extract-file/route.ts`
- `src/app/api/refrasa/route.ts`
- `src/lib/ai/paper-tools.ts`
- `src/lib/billing/enforcement.ts`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/FileUploadButton.tsx`
- `src/lib/hooks/useConversations.ts`
- `src/lib/hooks/useMessages.ts`
- `src/lib/hooks/usePaperSession.ts`
- `src/lib/hooks/useRefrasa.ts`
- `convex/schema.ts`
- `convex/chatHelpers.ts`
- `convex/conversations.ts`
- `convex/messages.ts`
- `convex/artifacts.ts`
- `convex/paperSessions.ts`
- `convex/files.ts`
- `convex/aiProviderConfigs.ts`
