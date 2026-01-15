# Tools & API Documentation - MakalahApp

> **Last Updated:** 2026-01-14
> **Total Tools/Functions/Endpoints:** 150+

Dokumentasi lengkap semua tools, API endpoints, dan functions di codebase MakalahApp.

## Table of Contents

1. [AI Function Tools](#1-ai-function-tools)
2. [Next.js API Routes](#2-nextjs-api-routes)
3. [Convex Backend Functions](#3-convex-backend-functions)
4. [Convex Migrations](#4-convex-migrations)
5. [Helper Functions & Utilities](#5-helper-functions--utilities)
6. [External Service Integrations](#6-external-service-integrations)
7. [Statistics Summary](#7-statistics-summary)

---

## 1. AI Function Tools

Tools yang dipanggil oleh LLM selama chat session.

### 1.1 Paper Writing Tools

**File:** `src/lib/ai/paper-tools.ts`

| Tool | Purpose | Parameters |
|------|---------|------------|
| `startPaperSession` | Inisialisasi sesi penulisan paper baru | `initialIdea?` (string, optional) |
| `getCurrentPaperState` | Ambil status terbaru sesi paper | (none) |
| `updateStageData` | Simpan progres draf ke tahap SAAT INI (auto-stage) | `ringkasan` (required, max 280 chars), `data?` (object) |
| `submitStageForValidation` | Kirim draf untuk approval user | (none) |

**Detail:**

#### `startPaperSession`
```typescript
inputSchema: {
  initialIdea?: string  // Ide kasar, judul awal, atau topik. Opsional.
}
returns: {
  success: boolean
  sessionId?: string
  message?: string
  error?: string
}
```

#### `getCurrentPaperState`
```typescript
inputSchema: {}
returns: {
  success: boolean
  session?: PaperSession
  error?: string
}
```

#### `updateStageData`
```typescript
inputSchema: {
  ringkasan: string      // WAJIB! Max 280 chars. Keputusan utama yang disepakati.
  data?: Record<string, any>  // Objek data draf lainnya
}
returns: {
  success: boolean
  stage?: string         // Stage yang di-update (auto-fetched)
  message?: string
  warning?: string
  error?: string
}
```

**PENTING - AUTO-STAGE:** Tool ini otomatis menyimpan ke tahap yang sedang aktif (`currentStage`). AI tidak perlu dan tidak bisa specify stage - tool auto-fetch dari session. Ini mencegah error "Cannot update X while in Y".

#### `submitStageForValidation`
```typescript
inputSchema: {}
returns: {
  success: boolean
  message?: string
  error?: string
}
```

---

### 1.2 General Chat Tools

**File:** `src/app/api/chat/route.ts` (lines 651-861)

| Tool | Purpose | Parameters |
|------|---------|------------|
| `createArtifact` | Buat artifact baru | `type`, `title`, `content`, `format?`, `description?`, `sources?` |
| `updateArtifact` | Update artifact yang sudah ada | `artifactId`, `content`, `title?`, `sources?` |
| `renameConversationTitle` | Update judul conversation (max 2x oleh AI) | `title` (3-50 chars) |

**Detail:**

#### `createArtifact`
```typescript
inputSchema: {
  type: "code" | "outline" | "section" | "table" | "citation" | "formula"
  title: string           // Max 200 chars
  content: string         // Min 10 chars
  format?: "markdown" | "latex" | "python" | "r" | "javascript" | "typescript"
  description?: string
  sources?: Array<{       // Web sources dari hasil search
    url: string
    title: string
    publishedAt?: number
  }>
}
returns: {
  success: boolean
  artifactId?: string
  title?: string
  message?: string
  error?: string
}
```

**Use cases:**
- Paper outlines and structures (type: "outline")
- Draft sections: Introduction, Methodology, Results, etc. (type: "section")
- Code snippets for data analysis (type: "code")
- Tables and formatted data (type: "table")
- Bibliography entries and citations (type: "citation")
- LaTeX mathematical formulas (type: "formula")

#### `updateArtifact`
```typescript
inputSchema: {
  artifactId: string      // ID dari artifact yang akan di-update
  content: string         // Min 10 chars. Konten baru.
  title?: string          // Max 200 chars. Opsional.
  sources?: Array<{
    url: string
    title: string
    publishedAt?: number
  }>
}
returns: {
  success: boolean
  newArtifactId?: string
  oldArtifactId?: string
  version?: number
  message?: string
  error?: string
}
```

**PENTING:** Gunakan tool ini untuk artifact yang ditandai 'invalidated' (karena rewind). Jangan gunakan `createArtifact` untuk artifact yang sudah ada.

#### `renameConversationTitle`
```typescript
inputSchema: {
  title: string           // 3-50 chars
}
returns: {
  success: boolean
  title?: string
  error?: string
}
```

**Aturan:**
- Maksimal 2 kali update judul oleh AI per conversation
- Jangan panggil kalau user sudah mengganti judul sendiri
- Minimal 3 pasang pesan sebelum bisa update final

---

### 1.3 Provider-Defined Tools

**File:** `src/lib/ai/streaming.ts` → `getGoogleSearchTool()`

| Tool | Purpose | Provider | Path |
|------|---------|----------|------|
| `google_search` | Web search via Google (Primary) | `@ai-sdk/google` | Gateway |
| `:online` suffix | Web search via OpenRouter (Fallback) | OpenRouter | Fallback |

**CONSTRAINT PENTING:**
- Provider-defined tool dari `@ai-sdk/google`
- TIDAK BISA di-mix dengan function tools dalam 1 request
- Route `/api/chat` menggunakan router untuk decide mode:
  - **Websearch mode:** tools = `{ google_search }`
  - **Normal mode:** tools = function tools only

---

### 1.4 OpenRouter `:online` Web Search (Fallback)

**File:** `src/lib/ai/streaming.ts` → `getOpenRouterModel({ enableWebSearch: true })`

| Feature | Description |
|---------|-------------|
| **Suffix** | `:online` appended ke model ID (e.g., `google/gemini-2.5-flash-lite:online`) |
| **Model-agnostic** | Works dengan model apapun dari OpenRouter |
| **When Used** | Fallback path ketika Gateway gagal + web search requested |
| **Citations** | Returns annotations di `providerMetadata` |

**Configuration (Admin Panel → AI Providers → Web Search Settings):**

| Setting | Default | Description |
|---------|---------|-------------|
| `primaryWebSearchEnabled` | `true` | Enable `google_search` untuk Gateway |
| `fallbackWebSearchEnabled` | `true` | Enable `:online` suffix untuk OpenRouter |
| `fallbackWebSearchEngine` | `"auto"` | Engine: "auto" \| "native" \| "exa" |
| `fallbackWebSearchMaxResults` | `5` | Max search results (1-10) |

**Flow:**
```
Primary (Gateway) fails
    ↓
Check: enableWebSearch && config.fallbackWebSearchEnabled
    ↓ (if true)
Use model:online suffix
    ↓
Extract annotations → normalizeCitations('openrouter')
    ↓
Insert inline citations [1], [2] → Send to UI
```

**Citation Normalization:**

OpenRouter annotations di-normalize menggunakan `normalizeCitations()`:

```typescript
import { normalizeCitations } from "@/lib/citations/normalizer"

const citations = normalizeCitations(providerMetadata, 'openrouter')
// Returns: NormalizedCitation[]
```

**Graceful Degradation:**

Jika `:online` call gagal, sistem otomatis retry tanpa web search:
```
:online fails → Retry without :online → Text-only response
```

---

## 2. Next.js API Routes

### 2.1 Chat Streaming

| Endpoint | Method | File |
|----------|--------|------|
| `/api/chat` | POST | `src/app/api/chat/route.ts` |

**Request Body:**
```typescript
{
  messages: Array<{
    role: "user" | "assistant"
    content: string
  }>
  conversationId?: string    // Untuk existing conversations
  fileIds?: string[]         // File IDs untuk context
}
```

**Response:** `UIMessageStream` (AI SDK v5)

**Features:**
- Automatic conversation creation & title generation
- File context injection (max 6000 chars per file, 20000 total in paper mode)
- Paper mode detection & prompt injection
- Web search decision router (structured router)
- Inline citations [1], [2] untuk web search sources
- Message trimming (max 20 pairs history in paper mode)
- Dual provider with fallback (Gateway → OpenRouter)

---

### 2.2 File Extraction

| Endpoint | Method | File |
|----------|--------|------|
| `/api/extract-file` | POST | `src/app/api/extract-file/route.ts` |

**Request Body:**
```typescript
{
  fileId: string
}
```

**Response:**
```typescript
{
  success: boolean
  fileId: string
  fileName?: string
  textLength?: number
  error?: string
}
```

**Supported Formats:**
| Format | Library |
|--------|---------|
| TXT | Plain text extraction |
| PDF | `pdf-parse` |
| DOCX | `mammoth` |
| XLSX | `xlsx` (max 10 sheets, 1000 rows) |
| Images | OpenAI Vision API (OCR) |

**Features:**
- Retry logic dengan exponential backoff
- Graceful degradation (file tetap accessible even if extraction fails)
- Status tracking (pending → success/failed)

---

### 2.3 Text Analysis (Refrasa)

| Endpoint | Method | File |
|----------|--------|------|
| `/api/refrasa` | POST | `src/app/api/refrasa/route.ts` |

**Request Body:**
```typescript
{
  content: string           // Min 50 chars
  artifactId?: string       // Untuk tracking
}
```

**Response:**
```typescript
{
  issues: RefrasaIssue[]
  refrasedText: string
}

interface RefrasaIssue {
  type: "informal_language" | "redundancy" | "weak_vocabulary" | "passive_overuse" | "awkward_phrasing" | "inconsistent_tone" | "filler_words" | "style_violation"
  category: "naturalness" | "style"
  severity: "info" | "warning" | "critical"
  original: string
  suggestion: string
  explanation: string
  position: { start: number; end: number }
}
```

**Architecture:**
- Layer 1: Core Naturalness Criteria (hardcoded)
- Layer 2: Style Constitution (dari database, optional)

---

### 2.4 Document Export

| Endpoint | Method | File | Format |
|----------|--------|------|--------|
| `/api/export/word` | POST | `src/app/api/export/word/route.ts` | .docx |
| `/api/export/pdf` | POST | `src/app/api/export/pdf/route.ts` | .pdf |

**Request Body:**
```typescript
{
  sessionId: string
}
```

**Response:** Binary stream dengan `Content-Disposition` header

**Validation:**
- Session ownership check
- Completion status check
- Content availability check

---

### 2.5 Admin Endpoints

| Endpoint | Method | File | Purpose |
|----------|--------|------|---------|
| `/api/admin/validate-provider` | POST | `src/app/api/admin/validate-provider/route.ts` | Test AI provider connection |
| `/api/admin/verify-model-compatibility` | POST | `src/app/api/admin/verify-model-compatibility/route.ts` | Verify model compatibility |

**Auth:** Admin/superadmin only

**validate-provider Request:**
```typescript
{
  provider: "vercel-gateway" | "openrouter"
  model: string
  apiKey: string
}
```

**Response:**
```typescript
{
  success: boolean
  message: string
  response?: string
  provider: string
  model: string
}
```

---

### 2.6 Webhook

| Endpoint | Method | File |
|----------|--------|------|
| `/api/webhooks/clerk` | POST | `src/app/api/webhooks/clerk/route.ts` |

**Events Handled:**
- `user.created` → Send welcome email via Resend

**Auth:** Svix signature verification

---

## 3. Convex Backend Functions

### 3.1 Messages

**File:** `convex/messages.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `getMessages` | Get messages untuk conversation | `conversationId: Id<"conversations">` |
| `countMessagePairsForConversation` | Hitung pasang pesan | `conversationId`, `userId` |
| `getRecentSources` | Get recent web search sources | `conversationId`, `limit?` |

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `createMessage` | Buat message baru | `conversationId`, `role`, `content`, `fileIds?`, `metadata?`, `sources?` |
| `updateMessage` | Update message content | `messageId`, `content` |

---

### 3.2 Conversations

**File:** `convex/conversations.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `listConversations` | List conversations user (max 50) | `userId: Id<"users">` |
| `getConversation` | Get single conversation | `conversationId: Id<"conversations">` |

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `createConversation` | Buat conversation baru | `userId`, `title?` |
| `updateConversation` | Update conversation | `conversationId`, `title?` |
| `updateConversationTitleFromAI` | Update title by AI | `conversationId`, `userId`, `title`, `nextTitleUpdateCount` |

---

### 3.3 Files

**File:** `convex/files.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `getFile` | Get file by ID | `fileId: Id<"files">` |
| `getFileUrl` | Get file URL | `storageId: Id<"_storage">` |
| `getFilesByIds` | Get multiple files | `fileIds: Id<"files">[]` |

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `createFile` | Create file record | `conversationId?`, `storageId`, `name`, `type`, `size` |
| `updateFileStatus` | Update extraction status | `fileId`, `status`, `extractedText?` |
| `updateExtractionResult` | Update extraction result | `fileId`, `extractedText?`, `extractionStatus`, `extractionError?`, `processedAt` |
| `deleteFile` | Delete file | `fileId` |

---

### 3.4 Artifacts

**File:** `convex/artifacts.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `get` | Get artifact by ID | `artifactId`, `userId` |
| `listByConversation` | List artifacts in conversation | `conversationId`, `userId`, `type?` |
| `listByUser` | List all user's artifacts | `userId`, `type?`, `limit?` |

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `create` | Create new artifact | `conversationId`, `userId`, `type`, `title`, `content`, `format?`, `description?`, `sources?` |
| `update` | Update artifact (creates new version) | `artifactId`, `userId`, `content`, `title?`, `sources?` |
| `clearInvalidation` | Clear invalidation flag | `artifactId` |

---

### 3.5 Paper Sessions

**File:** `convex/paperSessions.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `getByConversation` | Get session by conversation | `conversationId: Id<"conversations">` |
| `getById` | Get session by ID | `sessionId: Id<"paperSessions">` |
| `getSessionHistory` | Get user's session history | `userId`, `limit?` |

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `create` | Create new paper session | `userId`, `conversationId`, `initialIdea?` |
| `updateStageData` | Update stage data | `sessionId`, `stage`, `data` |
| `submitForValidation` | Submit for user validation | `sessionId` |
| `approveStage` | Approve current stage | `sessionId`, `userId` |
| `reviseStage` | Request revision | `sessionId` |
| `markStageComplete` | Mark stage complete | `sessionId`, `userId` |
| `moveToNextStage` | Advance to next stage | `sessionId`, `userId` |
| `rewindToStage` | Rewind to previous stage | `sessionId`, `userId`, `targetStage` |
| `clearArtifactInvalidation` | Clear artifact invalidation | `sessionId`, `artifactId` |

---

### 3.6 Users

**File:** `convex/users.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `getUserByClerkId` | Get user by Clerk ID | `clerkUserId: string` |
| `getUserRole` | Get user's role | `userId: Id<"users">` |
| `checkIsAdmin` | Check if admin | `userId` |
| `checkIsSuperAdmin` | Check if superadmin | `userId` |
| `listAllUsers` | List all users (admin only) | `requestorUserId` |

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `ensureUser` | Get or create user | `clerkUserId`, `email`, `firstName?`, `lastName?` |
| `updateUserRole` | Update user role | `requestorUserId`, `targetUserId`, `newRole` |
| `deleteUser` | Delete user (superadmin) | `requestorUserId`, `userId` |

---

### 3.7 Papers

**File:** `convex/papers.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `listPapersForUser` | List user's papers | `userId: Id<"users">` |

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `createPaperMetadata` | Create paper metadata | `userId`, `title`, `abstract?` |

---

### 3.8 Admin User Management

**File:** `convex/adminUserManagement.ts`

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `promoteToAdmin` | Promote user to admin (superadmin only) | `targetUserId: Id<"users">` |
| `demoteToUser` | Demote admin to user (superadmin only) | `targetUserId: Id<"users">` |

---

### 3.9 Admin Manual User Creation

**File:** `convex/adminManualUserCreation.ts`

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `createAdminUser` | Create pending admin/superadmin user | `email`, `role`, `firstName`, `lastName` |

---

### 3.10 System Prompts

**File:** `convex/systemPrompts.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `getActiveSystemPrompt` | Get active system prompt | (none) |
| `listSystemPrompts` | List all prompts (admin) | `requestorUserId` |
| `getPromptVersionHistory` | Get version history | `requestorUserId`, `rootId` |

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `createSystemPrompt` | Create new prompt | `requestorUserId`, `name`, `content`, `description?` |
| `updateSystemPrompt` | Update prompt (creates new version) | `requestorUserId`, `promptId`, `content`, `description?` |
| `activateSystemPrompt` | Activate prompt | `requestorUserId`, `promptId` |
| `deleteSystemPrompt` | Delete prompt | `requestorUserId`, `promptId` |

---

### 3.11 Style Constitutions

**File:** `convex/styleConstitutions.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `getActive` | Get active style constitution | (none) |
| `listStyleConstitutions` | List all constitutions (admin) | `requestorUserId` |
| `getHistoryForRoot` | Get version history | `requestorUserId`, `rootId` |

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `createStyleConstitution` | Create new constitution | `requestorUserId`, `name`, `content`, `description?` |
| `updateStyleConstitution` | Update constitution | `requestorUserId`, `constitutionId`, `content`, `description?` |
| `activateStyleConstitution` | Activate constitution | `requestorUserId`, `constitutionId` |

---

### 3.12 AI Provider Configs

**File:** `convex/aiProviderConfigs.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `getActiveConfig` | Get active AI config | (none) |
| `listConfigs` | List all configs (admin) | `requestorUserId` |
| `getConfigHistory` | Get version history | `requestorUserId`, `rootId` |

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `createConfig` | Create new config | `requestorUserId`, `name`, `primaryProvider`, `primaryModel`, `primaryApiKey`, `fallbackProvider`, `fallbackModel`, `fallbackApiKey`, `temperature`, `topP?`, `maxTokens?`, `description?` |
| `updateConfig` | Update config | `requestorUserId`, `configId`, ... |
| `activateConfig` | Activate config | `requestorUserId`, `configId` |

---

### 3.13 System Alerts

**File:** `convex/systemAlerts.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `isFallbackActive` | Check if fallback mode active | (none) |
| `getUnresolvedAlertCount` | Count unresolved alerts | (none) |
| `getRecentAlerts` | Get recent alerts | `limit?`, `type?`, `severity?` |

#### Mutations

| Function | Purpose | Parameters |
|----------|---------|------------|
| `createAlert` | Create new alert | `alertType`, `severity`, `message`, `source`, `metadata?` |
| `resolveAlert` | Resolve alert | `alertId`, `userId` |

---

### 3.14 Chat Helpers

**File:** `convex/chatHelpers.ts`

#### Queries

| Function | Purpose | Parameters |
|----------|---------|------------|
| `getUserId` | Get user ID from Clerk ID | `clerkUserId: string` |

---

### 3.15 Permissions (Helper Module)

**File:** `convex/permissions.ts`

**Note:** Ini adalah helper module internal, bukan exported Convex functions.

| Function | Purpose | Parameters |
|----------|---------|------------|
| `hasRole` | Check if user has role | `db: DatabaseReader`, `userId`, `requiredRole` |
| `requireRole` | Throw if no permission | `db: DatabaseReader`, `userId`, `requiredRole` |
| `isSuperAdmin` | Check if superadmin | `db: DatabaseReader`, `userId` |
| `isAdmin` | Check if at least admin | `db: DatabaseReader`, `userId` |

**Role Hierarchy:**
```typescript
const ROLE_HIERARCHY = {
  superadmin: 3,
  admin: 2,
  user: 1,
}
```

---

## 4. Convex Migrations

**Location:** `convex/migrations/`

| Migration | File | Purpose |
|-----------|------|---------|
| `seedDefaultSystemPrompt` | `seedDefaultSystemPrompt.ts` | Seed default system prompt |
| `seedDefaultAIConfig` | `seedDefaultAIConfig.ts` | Seed default AI provider config |
| `seedDefaultStyleConstitution` | `seedDefaultStyleConstitution.ts` | Seed default style constitution |
| `addRoleToExistingUsers` | `addRoleToExistingUsers.ts` | Add role field to existing users |
| `updatePromptWithPaperWorkflow` | `updatePromptWithPaperWorkflow.ts` | Update prompt with paper workflow |
| `updatePromptWithArtifactGuidelines` | `updatePromptWithArtifactGuidelines.ts` | Update prompt with artifact guidelines |
| `updatePromptWithArtifactSources` | `updatePromptWithArtifactSources.ts` | Update prompt with artifact sources |
| `updateAIConfigForToolCalling` | `updateAIConfigForToolCalling.ts` | Update AI config for tool calling |
| `updateToGPT4oForToolCalling` | `updateToGPT4oForToolCalling.ts` | Update to GPT-4o for tool calling |
| `removeOldPaperWorkflowSection` | `removeOldPaperWorkflowSection.ts` | Remove old paper workflow section |
| `fix14TahapReference` | `fix13TahapReference.ts` | Fix 14 tahap reference (should be 13) |
| `fixAgentPersonaAndCapabilities` | `fixAgentPersonaAndCapabilities.ts` | Fix agent persona and capabilities |

**Usage:**
```bash
npm run convex -- run migrations:seedDefaultSystemPrompt
npm run convex -- run migrations:seedDefaultAIConfig
```

---

## 5. Helper Functions & Utilities

### 5.1 AI Streaming

**File:** `src/lib/ai/streaming.ts`

| Function | Purpose | Return Type |
|----------|---------|-------------|
| `streamChatResponse` | Stream chat response with AI SDK | `StreamTextResult` |
| `getGatewayModel` | Get Vercel AI Gateway model instance | `LanguageModelV1` |
| `getOpenRouterModel` | Get OpenRouter model instance (fallback) | `LanguageModelV1` |
| `getProviderSettings` | Get temperature, topP, maxTokens from config | `{ temperature, topP?, maxTokens? }` |
| `getModelNames` | Get primary & fallback model names | `{ primary: {...}, fallback: {...} }` |
| `getGoogleSearchTool` | Get Google Search tool instance | `Tool \| null` |

---

### 5.2 AI Config

**File:** `src/lib/ai/chat-config.ts`

| Function | Purpose | Return Type |
|----------|---------|-------------|
| `getSystemPrompt` | Get active system prompt with fallback | `Promise<string>` |
| `getMinimalFallbackPrompt` | Get minimal fallback prompt | `string` |

---

### 5.3 Config Cache

**File:** `src/lib/ai/config-cache.ts`

| Export | Purpose |
|--------|---------|
| `configCache` | Singleton cache for AI provider config with auto-refresh |

---

### 5.4 Title Generator

**File:** `src/lib/ai/title-generator.ts`

| Function | Purpose | Parameters |
|----------|---------|------------|
| `generateTitle` | Generate conversation title from messages | `{ userMessage, assistantMessage? }` |

---

### 5.5 Paper Intent Detector

**File:** `src/lib/ai/paper-intent-detector.ts`

| Function | Purpose | Return Type |
|----------|---------|-------------|
| `detectPaperIntent` | Detect paper writing intent (detailed) | `{ hasPaperIntent, confidence, matchedKeywords }` |
| `hasPaperWritingIntent` | Check if message has paper intent | `boolean` |

**Keywords detected:** "paper", "makalah", "skripsi", "tesis", "disertasi", "jurnal", "artikel ilmiah", dll.

---

### 5.6 Paper Mode Prompt

**File:** `src/lib/ai/paper-mode-prompt.ts`

| Function | Purpose | Parameters |
|----------|---------|------------|
| `getPaperModeSystemPrompt` | Get system prompt injection for paper mode | `conversationId: Id<"conversations">` |

---

### 5.7 Paper Stage Instructions

**Location:** `src/lib/ai/paper-stages/`

| File | Exports |
|------|---------|
| `foundation.ts` | `GAGASAN_INSTRUCTIONS`, `TOPIK_INSTRUCTIONS` |
| `core.ts` | `ABSTRAK_INSTRUCTIONS`, `PENDAHULUAN_INSTRUCTIONS`, `TINJAUAN_LITERATUR_INSTRUCTIONS`, `METODOLOGI_INSTRUCTIONS` |
| `results.ts` | `HASIL_INSTRUCTIONS`, `DISKUSI_INSTRUCTIONS`, `KESIMPULAN_INSTRUCTIONS` |
| `finalization.ts` | `DAFTAR_PUSTAKA_INSTRUCTIONS`, `LAMPIRAN_INSTRUCTIONS`, `JUDUL_INSTRUCTIONS`, `OUTLINE_INSTRUCTIONS` |
| `index.ts` | `getStageInstructions(stage)` |
| `formatStageData.ts` | `formatStageData(stageData, stage)` |

**13 Stages:**
1. Gagasan
2. Topik
3. Outline
4. Abstrak
5. Pendahuluan
6. Tinjauan Literatur
7. Metodologi
8. Hasil
9. Diskusi
10. Kesimpulan
11. Daftar Pustaka
12. Lampiran
13. Judul

---

### 5.8 Paper Workflow Reminder

**File:** `src/lib/ai/paper-workflow-reminder.ts`

| Export | Purpose |
|--------|---------|
| `PAPER_WORKFLOW_REMINDER` | Full paper workflow reminder prompt |
| `PAPER_WORKFLOW_REMINDER_SHORT` | Short version |

---

### 5.9 Citations

**Location:** `src/lib/citations/`

#### `apaWeb.ts`
| Function | Purpose |
|----------|---------|
| `normalizeWebSearchUrl(url)` | Remove UTM params, hash, trailing slashes |
| `deriveSiteNameFromUrl(url)` | Extract site name from URL |
| `getApaWebReferenceParts(source)` | Get APA reference parts |
| `getWebCitationDisplayParts(source)` | Get display parts for citation |

#### `webTitle.ts`
| Function | Purpose |
|----------|---------|
| `fetchWebPageMetadata(url)` | Fetch page metadata (title, description, etc.) |
| `fetchWebPageTitle(url, options?)` | Fetch page title only |
| `enrichSourcesWithFetchedTitles(sources)` | Enrich sources with fetched titles (4 parallel, 2500ms timeout) |

---

### 5.10 Refrasa

**Location:** `src/lib/refrasa/`

#### `prompt-builder.ts`
| Function | Purpose |
|----------|---------|
| `buildRefrasaPrompt(content, constitutionContent?)` | Build full refrasa prompt (2 layers) |
| `buildRefrasaPromptLayer1Only(content)` | Build prompt with Layer 1 only |

#### `schemas.ts`
| Export | Purpose |
|--------|---------|
| `RefrasaIssueTypeSchema` | Zod schema for issue types |
| `RefrasaIssueCategorySchema` | Zod schema for categories |
| `RefrasaIssueSeveritySchema` | Zod schema for severities |
| `RefrasaIssueSchema` | Zod schema for single issue |
| `RefrasaOutputSchema` | Zod schema for full output |
| `RequestBodySchema` | Zod schema for API request |

#### `loading-messages.ts`
| Export | Purpose |
|--------|---------|
| `LOADING_MESSAGES` | Array of loading messages |
| `LOADING_ROTATION_INTERVAL` | Rotation interval (2500ms) |
| `getRandomLoadingMessage()` | Get random loading message |
| `getLoadingMessageByIndex(index)` | Get message by index |

---

### 5.11 File Extraction

**Location:** `src/lib/file-extraction/`

| File | Purpose | Library |
|------|---------|---------|
| `txt-extractor.ts` | Extract text from TXT files | Plain text |
| `pdf-extractor.ts` | Extract text from PDF files | `pdf-parse` |
| `docx-extractor.ts` | Extract text from DOCX files | `mammoth` |
| `xlsx-extractor.ts` | Extract data from XLSX files | `xlsx` |
| `image-ocr.ts` | Extract text from images | OpenAI Vision API |

---

### 5.12 Document Export

**Location:** `src/lib/export/`

| File | Purpose |
|------|---------|
| `word-builder.ts` | Build Word document from paper session |
| `pdf-builder.ts` | Build PDF from paper session |
| `content-compiler.ts` | Compile paper content for export |
| `validation.ts` | Validate paper session for export |

---

### 5.13 React Hooks

**Location:** `src/lib/hooks/`

| Hook | Purpose | Return Type |
|------|---------|-------------|
| `useCurrentUser` | Get current user with loading state | `{ user, isLoading }` |
| `usePermissions` | Get user permissions | `{ isAdmin, isSuperAdmin, ... }` |
| `useMessages` | Get messages for conversation | `Message[]` |
| `useConversations` | Get user's conversations | `Conversation[]` |
| `usePaperSession` | Get paper session with rewind functions | `{ session, rewind, ... }` |
| `useRefrasa` | Text analysis with refrasa API | `{ analyze, isLoading, result }` |

---

## 6. External Service Integrations

### 6.1 AI Providers

| Provider | SDK | Purpose | Config Location |
|----------|-----|---------|-----------------|
| Vercel AI Gateway | `@ai-sdk/gateway` | Primary AI provider | `src/lib/ai/streaming.ts` |
| OpenRouter | `@ai-sdk/openai` | Fallback AI provider | `src/lib/ai/streaming.ts` |
| Google Generative AI | `@ai-sdk/google` | Google Search tool | `src/lib/ai/streaming.ts` |
| OpenAI | `openai` | Image OCR via Vision API | `src/lib/file-extraction/image-ocr.ts` |

**Dual Provider Pattern:**
```
Primary (Gateway) → Fallback (OpenRouter)
```

### 6.2 Authentication

| Service | Purpose | Config Location |
|---------|---------|-----------------|
| Clerk | Authentication & user management | `src/proxy.ts`, `convex/auth.config.ts` |

### 6.3 Email

| Service | Purpose | Config Location |
|---------|---------|-----------------|
| Resend | Email sending (welcome emails) | `src/lib/email/resend.ts` |

---

## 7. Statistics Summary

| Category | Count |
|----------|-------|
| **AI Function Tools** | 7 |
| **Provider-Defined Tools** | 2 |
| **Next.js API Routes** | 8 |
| **Convex Queries** | 25 |
| **Convex Mutations** | 42 |
| **Convex Migrations** | 12 |
| **Helper Functions** | 45+ |
| **React Hooks** | 6 |
| **External Integrations** | 6 |
| **Total** | **155+** |

---

## Architecture Notes

### Tool Switching Constraint

AI SDK tidak bisa mix `google_search` (provider-defined tool) dengan function tools dalam 1 request. Solusi:

```
User Message
    ↓
Router Decision (decideWebSearchMode)
    ↓
┌─────────────────┬─────────────────┐
│ Web Search Mode │  Normal Mode    │
│ tools = {       │  tools = {      │
│   google_search │   createArtifact│
│ }               │   updateArtifact│
│                 │   paperTools... │
│                 │ }               │
└─────────────────┴─────────────────┘
```

### Auto-Stage Pattern

`updateStageData` tool tidak menerima `stage` parameter. Stage otomatis diambil dari `session.currentStage`. Ini mencegah AI error "Cannot update X while in Y".

```typescript
// Old (error-prone):
updateStageData({ stage: "topik", ... })

// New (auto-stage):
updateStageData({ ringkasan: "...", data: {...} })
// stage auto-fetched dari session.currentStage
```

### Dual Provider Fallback

```
Request
  ↓
Gateway (Primary)
  ↓ (on failure)
OpenRouter (Fallback)
  ↓
Response
```

---

*Documentation generated: 2026-01-14*
