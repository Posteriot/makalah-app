# Tools Calling & API - Technical Reference

Dokumentasi lengkap tentang Tool Calling dan API Endpoints di Makalah App - arsitektur LLM dengan dual-provider dan berbagai function tools untuk chat, paper workflow, dan file processing.

## Daftar Isi

1. [Overview](#overview)
2. [Provider Architecture](#provider-architecture)
3. [Tool Categories](#tool-categories)
4. [Function Tools](#function-tools)
5. [Provider-Defined Tools](#provider-defined-tools)
6. [API Endpoints](#api-endpoints)
7. [Tool Execution Flow](#tool-execution-flow)
8. [Constraints & Limitations](#constraints--limitations)
9. [Configuration](#configuration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Makalah App menggunakan arsitektur LLM dual-provider dengan berbagai tools untuk mendukung fitur chat, penulisan paper, dan processing file.

### Key Features

- **Dual-Provider Architecture**: Gateway (primary) + OpenRouter (fallback) mengikuti `aiProviderConfigs` di database
- **Function Tools**: AI-callable tools untuk artifact management, paper workflow
- **Provider-Defined Tools**: `google_search` untuk web search real-time (Gateway only)
- **Dedicated OCR Provider**: OpenRouter dengan GPT-4o untuk Vision tasks
- **Stage-Aware Web Search Router**: Router mempertimbangkan stage, konfirmasi, dan evidence dari `stageData`
- **Tool State Switching**: Deterministic logic untuk switch antara WEB_SEARCH dan FUNCTION_TOOLS mode di ACTIVE stages
- **Force Submit**: Konfirmasi user bisa memaksa `submitStageForValidation` agar panel validasi muncul

### Component to LLM Mapping

| Component | Provider | Model | Tools Available |
|-----------|----------|-------|-----------------|
| Chat (Normal Mode) | Gateway → OpenRouter | Primary: `aiProviderConfigs.primaryModel`, Fallback: `aiProviderConfigs.fallbackModel` | Function tools (7 tools) |
| Chat (Web Search Mode) | Gateway ONLY | `aiProviderConfigs.primaryModel` | `google_search` only |
| Refrasa API | Gateway → OpenRouter | Primary: `aiProviderConfigs.primaryModel`, Fallback: `aiProviderConfigs.fallbackModel` | None (generateObject) |
| Image OCR | OpenRouter (dedicated) | `openai/gpt-4o` | None (generateText Vision) |

**Note:** Model di atas selalu mengikuti config aktif di `aiProviderConfigs` (database). Tidak ada hardcoded fallback di `streaming.ts`.

---

## Provider Architecture

### Dual-Provider Design

**IMPORTANT:** Database adalah single source of truth. `streaming.ts` akan melempar `AIProviderConfigError` jika tidak ada config aktif, jadi tidak ada hardcoded fallback.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PROVIDER ARCHITECTURE (Database Config)                   │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────────────────┐
                    │      Vercel AI Gateway          │
                    │      (Primary Provider)         │
                    │                                 │
                    │  Model: aiProviderConfigs.primaryModel
                    │  Features:                      │
                    │  - Chat streaming               │
                    │  - Function tools               │
                    │  - google_search (web search)   │
                    │  - generateObject (Refrasa)     │
                    └────────────┬────────────────────┘
                                 │
                          (on failure)
                                 │
                                 ▼
                    ┌─────────────────────────────────┐
                    │        OpenRouter               │
                    │      (Fallback Provider)        │
                    │                                 │
                    │  Model: aiProviderConfigs.fallbackModel
                    │  Features:                      │
                    │  - Chat streaming (fallback)    │
                    │  - Function tools (fallback)    │
                    │  - generateObject (fallback)    │
                    │  ⚠️ NO google_search support    │
                    └─────────────────────────────────┘


                    ┌─────────────────────────────────┐
                    │        OpenRouter               │
                    │      (Dedicated - OCR)          │
                    │                                 │
                    │  Model: openai/gpt-4o           │
                    │  Features:                      │
                    │  - Image OCR (Vision)           │
                    │  - Best-in-class for OCR        │
                    └─────────────────────────────────┘
```

### Provider Configuration (streaming.ts)

`streaming.ts` memuat konfigurasi provider dari database via `configCache`. Tidak ada hardcoded fallback.

Perilaku penting:
- Jika tidak ada config aktif, `getProviderConfig()` melempar `AIProviderConfigError`
- Model primary/fallback diambil dari `aiProviderConfigs` (database)
- `getModelNames()` dipakai untuk metadata/logging model yang digunakan

### Model Helper Functions

| Function | Location | Returns |
|----------|----------|---------|
| `getGatewayModel()` | streaming.ts:154-160 | Primary model instance |
| `getOpenRouterModel()` | streaming.ts:166-172 | Fallback model instance |
| `getProviderSettings()` | streaming.ts:178-184 | `{ temperature, topP, maxTokens }` |
| `getModelNames()` | streaming.ts:191-202 | `{ primary, fallback }` model names |
| `getGoogleSearchTool()` | streaming.ts:210-233 | google_search tool atau null |

---

## Tool Categories

### 1. Function Tools (AI-Callable)

Tools yang dapat dipanggil oleh AI berdasarkan konteks conversation:

| Tool | Category | Purpose |
|------|----------|---------|
| `createArtifact` | Artifact | Create new artifact |
| `updateArtifact` | Artifact | Update existing artifact |
| `renameConversationTitle` | Conversation | Rename chat title |
| `startPaperSession` | Paper | Initialize paper workflow |
| `getCurrentPaperState` | Paper | Get session state |
| `updateStageData` | Paper | Save stage progress |
| `submitStageForValidation` | Paper | Submit for user approval |

### 2. Provider-Defined Tools

Tools yang disediakan oleh LLM provider:

| Tool | Provider | Constraint |
|------|----------|------------|
| `google_search` | Google (via Gateway) | Cannot mix with function tools |

---

## Function Tools

### createArtifact

**Location:** `src/app/api/chat/route.ts:652-725`

**Purpose:** Create standalone content artifacts (outline, section, code, etc.)

**Input Schema:**
```typescript
{
  type: "code" | "outline" | "section" | "table" | "citation" | "formula",
  title: string,           // max 200 chars
  content: string,         // min 10 chars
  format?: "markdown" | "latex" | "python" | "r" | "javascript" | "typescript",
  description?: string,
  sources?: { url: string, title: string, publishedAt?: number }
}
```

**Execute:** `fetchMutation(api.artifacts.create, { ... })`

**Response:**
```typescript
{ success: true, artifactId: string, title: string, message: string }
// or
{ success: false, error: string }
```

### updateArtifact

**Location:** `src/app/api/chat/route.ts:726-786`

**Purpose:** Update existing artifact (creates new version)

**Input Schema:**
```typescript
{
  artifactId: string,      // ID of artifact to update
  content: string,         // New content
  title?: string,          // Optional new title
  sources?: { url: string, title: string, publishedAt?: number }
}
```

**Execute:** `fetchMutation(api.artifacts.update, { ... })`

### renameConversationTitle

**Location:** `src/app/api/chat/route.ts:787-855`

**Purpose:** Rename conversation title

**Input Schema:**
```typescript
{
  title: string,           // max 50 chars
}
```

**Execute:** `fetchMutation(api.conversations.updateConversationTitleFromAI, { ... })`

### startPaperSession

**Location:** `src/lib/ai/paper-tools.ts:15-46`

**Purpose:** Initialize paper writing workflow session

**Input Schema:**
```typescript
{
  initialIdea?: string,    // Optional initial topic/idea
}
```

**Execute:** `fetchMutation(api.paperSessions.create, { ... })`

**Note:** Must be called immediately when user shows paper writing intent.

### getCurrentPaperState

**Location:** `src/lib/ai/paper-tools.ts:48-64`

**Purpose:** Get current state of paper session

**Input Schema:**
```typescript
{}  // No parameters
```

**Execute:** `fetchQuery(api.paperSessions.getByConversation, { ... })`

### updateStageData

**Location:** `src/lib/ai/paper-tools.ts:66-153`

**Purpose:** Save progress for current stage

**Input Schema:**
```typescript
{
  ringkasan: string,       // max 280 chars - Required summary
  data?: Record<string, any>,  // Additional stage data
}
```

**Execute:** `fetchMutation(api.paperSessions.updateStageData, { ... })`

**Important:** Stage is AUTO-FETCHED from `session.currentStage`. AI cannot specify stage manually (prevents stage confusion bugs).

### submitStageForValidation

**Location:** `src/lib/ai/paper-tools.ts:155-181`

**Purpose:** Submit current stage for user approval

**Input Schema:**
```typescript
{}  // No parameters
```

**Execute:** `fetchMutation(api.paperSessions.submitForValidation, { ... })`

---

## Provider-Defined Tools

### google_search

**Location:** `src/lib/ai/streaming.ts:210-233` + `src/app/api/chat/route.ts:964-966`

**Purpose:** Real-time web search via Google

**Source:** `@ai-sdk/google` provider

**Initialization:**
```typescript
export async function getGoogleSearchTool() {
  const { google } = await import("@ai-sdk/google")
  const toolFactory = google.tools?.googleSearch
  if (typeof toolFactory === "function") {
    return toolFactory({})
  }
  return null
}
```

**Usage in Chat:**
```typescript
// Web search mode
const gatewayTools = enableWebSearch
  ? ({ google_search: wrappedGoogleSearchTool } as ToolSet)
  : tools
```

**Critical Constraint:** Cannot be mixed with function tools in the same request.

---

## API Endpoints

### POST /api/chat

**Location:** `src/app/api/chat/route.ts`

**Purpose:** Main chat streaming endpoint

**LLM:** Gateway (primary) → OpenRouter (fallback)

**Model:** Mengikuti `aiProviderConfigs` (primaryModel + fallbackModel)

**Tools:**
- Normal mode: 7 function tools
- Web search mode: `google_search` only
- `toolChoice` bisa dipaksa ke `submitStageForValidation` saat user konfirmasi dan stage siap divalidasi

**Method:** `streamText()` with tools

### POST /api/refrasa

**Location:** `src/app/api/refrasa/route.ts`

**Purpose:** Text style improvement (Bahasa Indonesia)

**LLM:** Gateway (primary) → OpenRouter (fallback)

**Model:** Mengikuti `aiProviderConfigs` (primaryModel + fallbackModel)

**Method:** `generateObject()` with schema

**Temperature:** `0.7`

**Request:**
```json
{
  "content": "string (min 50 chars)",
  "artifactId": "string (optional)"
}
```

**Response:**
```json
{
  "issues": [...],
  "refrasedText": "string"
}
```

### POST /api/extract-file

**Location:** `src/app/api/extract-file/route.ts`

**Purpose:** Extract text from uploaded files (including Image OCR)

**LLM for OCR:** OpenRouter (dedicated)

**Model for OCR:** `openai/gpt-4o`

**Method:** `generateText()` with Vision (for images)

**Temperature:** `0.3` (low for consistent OCR)

**Supported:** TXT, PDF, DOCX, XLSX, Images (PNG, JPEG, WebP, GIF)

### POST /api/export/word

**Location:** `src/app/api/export/word/route.ts`

**Purpose:** Export paper to DOCX format

**LLM:** None (document generation only)

### POST /api/export/pdf

**Location:** `src/app/api/export/pdf/route.ts`

**Purpose:** Export paper to PDF format

**LLM:** None (document generation only)

### POST /api/admin/validate-provider

**Location:** `src/app/api/admin/validate-provider/route.ts`

**Purpose:** Test/validate provider configuration

**LLM:** Dynamic (tests configured provider)

### POST /api/webhooks/clerk

**Location:** `src/app/api/webhooks/clerk/route.ts`

**Purpose:** Clerk webhook handler for user sync

**LLM:** None

---

## Tool Execution Flow

### Normal Chat Mode (Function Tools)

```
User message
    │
    ▼
┌─────────────────────────────────────┐
│ Web Search Router (decideWebSearchMode)
│ Context:
│ - currentStage + stagePolicy
│ - searchAlreadyDone (stageData)
│ - isUserConfirmation (<= 400)
│ Temperature: 0.2
│ Output: { enableWebSearch: boolean }
└─────────────────────────────────────┘
    │
    ▼ enableWebSearch = false
    │
┌─────────────────────────────────────┐
│ streamText() with function tools:
│ - createArtifact
│ - updateArtifact
│ - renameConversationTitle
│ - startPaperSession
│ - getCurrentPaperState
│ - updateStageData
│ - submitStageForValidation
│ + toolChoice (force submit bila perlu)
└─────────────────────────────────────┘
    │
    ▼ AI decides to call tool
    │
┌─────────────────────────────────────┐
│ tool.execute()
│ → fetchMutation/fetchQuery to Convex
│ → Return result to AI
└─────────────────────────────────────┘
    │
    ▼
AI generates response with tool result
```

Catatan router:
- `explicitSearchRequest` selalu diprioritaskan jika stage policy mengizinkan
- `searchAlreadyDone` diambil dari `stageData` (referensi/sitasi) lalu fallback ke pola pesan

### Web Search Mode

```
User message
    │
    ▼
┌─────────────────────────────────────┐
│ Web Search Router (decideWebSearchMode)
│ Output: { enableWebSearch: true }
└─────────────────────────────────────┘
    │
    ▼ enableWebSearch = true
    │
┌─────────────────────────────────────┐
│ streamText() with google_search ONLY
│ (No function tools available)
│ maxToolSteps = 1
└─────────────────────────────────────┘
    │
    ▼
AI uses google_search for real-time info
    │
    ▼
Response with inline citations [1], [2]
```

### Tool State Switching (ACTIVE Stages)

Di ACTIVE stages (gagasan, topik, pendahuluan, dll), tool mode ditentukan secara **deterministic** tanpa LLM router untuk menghindari non-deterministic behavior.

**Helper File:** `src/lib/ai/paper-search-helpers.ts`

```
User message arrives
        │
        ▼
┌───────────────────────────────────┐
│ userExplicitlyAsksSearch?         │──YES──▶ WEB_SEARCH
│ (cari, search, referensi, dll)    │
└───────────────────────────────────┘
        │ NO
        ▼
┌───────────────────────────────────┐
│ incomplete && !searchAlreadyDone? │──YES──▶ WEB_SEARCH
│ (referensi belum cukup)           │
└───────────────────────────────────┘
        │ NO
        ▼
┌───────────────────────────────────┐
│ aiPromisedSearch && !searchAlreadyDone? │──YES──▶ WEB_SEARCH
│ (AI bilang "akan mencari...")     │
└───────────────────────────────────┘
        │ NO
        ▼
┌───────────────────────────────────┐
│ userWantsToSave?                  │──YES──▶ FUNCTION_TOOLS
│ (simpan, submit, lanjut tahap)    │
└───────────────────────────────────┘
        │ NO
        ▼
┌───────────────────────────────────┐
│ searchAlreadyDone?                │──YES──▶ FUNCTION_TOOLS ✓
│ (referensi sudah ada di stageData)│
└───────────────────────────────────┘
        │ NO
        ▼
    FUNCTION_TOOLS (safer default)
```

**Key Insight:** `searchAlreadyDone` adalah **exit condition** utama dari WEB_SEARCH mode. Ketika search selesai (referensi tersimpan di stageData), agent otomatis switch ke FUNCTION_TOOLS mode sehingga bisa call `createArtifact`, `updateStageData`, dll.

**System Notes:**
- `PAPER_TOOLS_ONLY_NOTE`: Inject ketika search disabled, mencegah AI promise search
- `getResearchIncompleteNote()`: Inject ketika research belum lengkap
- `getFunctionToolsModeNote()`: Inject ketika function tools mode aktif (setelah search)

---

## Constraints & Limitations

### Critical: Cannot Mix Tool Types

**Location:** `src/app/api/chat/route.ts:871-873`

```typescript
// Catatan penting: AI SDK tidak bisa mix provider-defined tools (google_search)
// dengan function tools dalam 1 request.
```

**Impact:**
- Web search mode: ONLY `google_search` available
- Normal mode: ONLY function tools available
- Router decides mode ONCE per request
- ACTIVE stages use deterministic logic (bypass LLM router)
- `searchAlreadyDone` enables automatic mode switching

### Web Search Limitations

1. **Gateway Only**: `google_search` only works with Gateway provider
2. **No Fallback**: If Gateway fails during web search, no OpenRouter fallback for `google_search`
3. **No Artifact Creation**: Cannot create artifacts in same turn as web search
4. **Stage Policy**: Stage PASSIVE hanya boleh web search jika user eksplisit minta search
5. **Konfirmasi**: Jika user konfirmasi (<= 400 karakter) di paper mode, router memprioritaskan tools paper
6. **Force Paper Tools Mode**: Jika paper intent terdeteksi tapi belum ada sesi, web search dipaksa off supaya `startPaperSession` bisa dipanggil dulu

### Paper Tools Constraints

1. **AUTO-STAGE**: `updateStageData` auto-fetches stage from session
2. **Sequential Validation**: Must `submitStageForValidation` before moving to next stage
3. **Session Required**: Paper tools require active paper session
4. **Force Submit**: Konfirmasi user + stage siap = `toolChoice` paksa `submitStageForValidation`
5. **Config Wajib**: `aiProviderConfigs` harus ada dan aktif, jika tidak `AIProviderConfigError`

---

## Configuration

### Environment Variables

| Variable | Provider | Purpose |
|----------|----------|---------|
| `VERCEL_AI_GATEWAY_API_KEY` | Gateway | Primary provider auth |
| `AI_GATEWAY_API_KEY` | Gateway | Alias (auto-set) |
| `OPENROUTER_API_KEY` | OpenRouter | Fallback + OCR provider auth |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google | Required if using Google provider directly |

### Database Config (SOURCE OF TRUTH)

Konfigurasi aktif ada di table `aiProviderConfigs` (lihat `convex/schema.ts:202-234`) dan dipakai lewat `configCache`.

Field utama:
- `primaryProvider`, `primaryModel`, `primaryApiKey`
- `fallbackProvider`, `fallbackModel`, `fallbackApiKey`
- `temperature`, `topP`, `maxTokens`
- `isActive`, `version`

**Catatan:** Tidak ada hardcoded fallback di `streaming.ts`. Jika config aktif tidak ditemukan, `AIProviderConfigError` dilempar dan request gagal.

### Other Settings

| Setting | Value | Location |
|---------|-------|----------|
| OCR Model | `openai/gpt-4o` | image-ocr.ts:17 (hardcoded, dedicated) |
| Router Temperature | `0.2` | chat/route.ts:565,588 |
| OCR Temperature | `0.3` | image-ocr.ts:150 |
| Refrasa Temperature | `0.7` | refrasa/route.ts:90,108 |

### Configuration History Note

Migration history untuk referensi (BUKAN config aktif saat ini):

1. **seedDefaultAIConfig.ts** - Seed awal dari env (default `gemini-2.5-flash-lite`)
2. **updateAIConfigForToolCalling.ts** - Update fallback ke model yang support tool calling

---

## Troubleshooting

### Tools tidak dipanggil AI

1. **Cek tool description**: Pastikan description jelas tentang kapan tool harus dipanggil
2. **Cek input validation**: Pastikan parameter sesuai schema
3. **Cek mode**: Web search mode tidak punya function tools

### google_search tidak berfungsi

1. **Cek provider**: Hanya Gateway yang support google_search
2. **Cek API key**: `GOOGLE_GENERATIVE_AI_API_KEY` mungkin diperlukan
3. **Cek initialization**: Log `[Streaming] Google Search Tool initialized successfully`

### Fallback tidak aktif

1. **Cek primary error**: Pastikan primary memang gagal
2. **Cek OpenRouter key**: `OPENROUTER_API_KEY` harus valid
3. **Cek config aktif**: `aiProviderConfigs.isActive` harus ada
4. **Cek log**: `[Streaming] Primary provider failed, using fallback`

### AIProviderConfigError

1. **Cek config aktif**: Pastikan ada record aktif di `aiProviderConfigs`
2. **Cek Admin Panel**: AI Providers harus punya config aktif

### Paper tools error

1. **Cek session**: Pastikan ada active paper session
2. **Cek stage**: `updateStageData` hanya bisa untuk stage aktif
3. **Cek validation**: Submit harus selesai sebelum pindah stage

### Console Logging

Key log points:

```javascript
// Provider selection
console.log(`[Streaming] Using primary: ${provider}/${model}`)
console.log(`[Streaming] Using fallback: ${provider}/${model}`)

// Google Search initialization
console.log("[Streaming] Google Search Tool initialized successfully")

// Tool execution
console.log("[createArtifact] Attempting to create artifact:", { ... })
console.log("[createArtifact] Success:", { artifactId, title })

// Web search router (stage-aware) - PASSIVE/NONE stages
console.log("[WebSearchRouter] Decision:", {
  enableWebSearch,
  confidence,
  reason,
  currentStage,
  stagePolicy,
  explicitSearchRequest,
  shouldForceSubmitValidation,
})

// Tool State Switching (ACTIVE stages)
console.log("[SearchDecision] ACTIVE stage override:", {
  activeStageSearchReason,  // e.g., "search_already_done", "research_incomplete"
  searchAlreadyDone,        // true/false
  enableWebSearch,          // true/false
})

// Tools configuration
console.log("[Chat API] Gateway Tools Configured:", { hasCreateArtifact, hasGoogleSearch })
```

---

## Related Documentation

- **CLAUDE.md**: Section "Multi-provider AI Strategy"
- **Files Index**: `.references/tools-calling-api/files-index.md`
- **Web Search**: `.references/search-web/`
- **Artifact**: `.references/artifact/`
- **Paper Workflow**: `.references/paper-workflow/`
- **LLM Provider**: `.references/llm-models-provider/`
- **Image OCR**: `.references/image-ocr/`

## Key Source Files

| File | Purpose |
|------|---------|
| `src/app/api/chat/route.ts` | Main chat endpoint, Tool State Switching logic |
| `src/lib/ai/paper-search-helpers.ts` | Deterministic helpers for ACTIVE stages |
| `src/lib/ai/paper-tools.ts` | Paper workflow tool definitions |
| `src/lib/ai/streaming.ts` | Provider configuration + google_search |

---

*Last updated: 2026-01-15*
