# Tools Calling & API - Files Index

Quick reference untuk lokasi semua files terkait Tool Calling dan API Endpoints di Makalah App.

## Quick Jump

| Category | Count | Files |
|----------|-------|-------|
| [Provider Configuration](#provider-configuration) | 1 | Streaming helpers |
| [Chat Route (Main)](#chat-route-main) | 1 | Chat endpoint + tools |
| [Paper Tools](#paper-tools) | 1 | Paper workflow tools |
| [Paper Search Helpers](#paper-search-helpers) | 1 | Tool state switching helpers |
| [API Endpoints](#api-endpoints) | 5 | Non-chat API routes |
| [Image OCR](#image-ocr) | 1 | Vision-based extraction |
| [Database & Migrations](#database--migrations) | 3 | Schema + config migrations |
| **Total** | **13** | |

---

## Provider Configuration

```
src/lib/ai/
└── streaming.ts                      # Provider config + model helpers
```

### Streaming Module (src/lib/ai/streaming.ts)

| Line | What's There |
|------|--------------|
| 1-4 | Imports: `streamText`, `createOpenAI`, `createGateway`, `configCache` |
| 6-9 | AI_GATEWAY_API_KEY aliasing |
| 15-63 | `AIProviderConfigError` + `getProviderConfig()` (database only) |
| 65-95 | `createProviderModel()` - Create model instance |
| 105-145 | `streamChatResponse()` - deprecated helper |
| 154-160 | `getGatewayModel()` - Get primary model |
| 166-172 | `getOpenRouterModel()` - Get fallback model |
| 178-184 | `getProviderSettings()` - Get temperature/topP/maxTokens |
| 191-202 | `getModelNames()` - Get model names for metadata |
| 210-233 | `getGoogleSearchTool()` - Provider-defined tool |

### Exported Functions

| Function | Line | Description |
|----------|------|-------------|
| `getGatewayModel()` | 154-160 | Get primary model instance |
| `getOpenRouterModel()` | 166-172 | Get fallback model instance |
| `getProviderSettings()` | 178-184 | Get sampling settings |
| `getModelNames()` | 191-202 | Get model names for logging |
| `getGoogleSearchTool()` | 210-233 | Get google_search tool |

### Database Config (No Hardcoded Fallback)

Konfigurasi wajib di `aiProviderConfigs` (database). Jika kosong, `AIProviderConfigError` dilempar.

---

## Chat Route (Main)

```
src/app/api/chat/
└── route.ts                          # Main chat endpoint + all tools
```

### Chat Route (src/app/api/chat/route.ts)

| Line | What's There |
|------|--------------|
| 153-171 | `isExplicitSearchRequest()` pattern list |
| 174-197 | `ACTIVE_SEARCH_STAGES`, `PASSIVE_SEARCH_STAGES`, `getStageSearchPolicy()` |
| 376-457 | `getSearchEvidenceFromStageData()` + `hasPreviousSearchResults()` |
| 459-482 | `isUserConfirmationMessage()` (<= 400 chars) |
| 485-619 | `decideWebSearchMode()` + router prompt |
| 652-861 | Function tools definition block |
| 652-725 | `createArtifact` tool |
| 726-786 | `updateArtifact` tool |
| 787-855 | `renameConversationTitle` tool |
| 871-873 | Critical constraint comment (cannot mix tools) |
| 907 | `searchAlreadyDone` calculation |
| 914-976 | **ACTIVE STAGE OVERRIDE**: Tool State Switching logic |
| 926 | `userExplicitlyAsksSearch` check (override) |
| 941-976 | 5-layer decision logic with `searchAlreadyDone` |
| 959-963 | `searchAlreadyDone` → function tools mode |
| 978-1010 | PASSIVE/NONE stages: LLM router logic |
| 1020-1040 | Web search behavior system note |
| 1050-1052 | `google_search` tool assignment (gatewayTools) |
| 1465-1490 | Fallback to OpenRouter |

### Tool State Switching (ACTIVE Stages)

Decision flow untuk ACTIVE stages (gagasan, topik, dll) dengan deterministic logic:

```
userExplicitlyAsksSearch? ──YES──▶ WEB_SEARCH
         │ NO
incomplete && !searchAlreadyDone? ──YES──▶ WEB_SEARCH
         │ NO
aiPromisedSearch && !searchAlreadyDone? ──YES──▶ WEB_SEARCH
         │ NO
userWantsToSave? ──YES──▶ FUNCTION_TOOLS
         │ NO
searchAlreadyDone? ──YES──▶ FUNCTION_TOOLS ✓
         │ NO
DEFAULT ──▶ FUNCTION_TOOLS (safer)
```

**Key Insight:** `searchAlreadyDone` adalah exit condition utama dari WEB_SEARCH mode.

### Function Tools in Chat Route

| Tool | Line | Input Schema | Execute Logic |
|------|------|--------------|---------------|
| `createArtifact` | 652-725 | type, title, content, format?, description?, sources? | Convex `api.artifacts.create` |
| `updateArtifact` | 726-786 | artifactId, content, title?, sources? | Convex `api.artifacts.update` |
| `renameConversationTitle` | 787-855 | title | Convex `api.conversations.updateConversationTitleFromAI` |

### Provider-Defined Tool

| Tool | Line | Source | Constraint |
|------|------|--------|------------|
| `google_search` | 964-966 | `@ai-sdk/google` via `getGoogleSearchTool()` | Cannot mix with function tools |

---

## Paper Tools

```
src/lib/ai/
└── paper-tools.ts                    # Paper workflow tool factory
```

### Paper Tools Module (src/lib/ai/paper-tools.ts)

| Line | What's There |
|------|--------------|
| 1-5 | Imports: `tool`, `z`, `fetchQuery`, `fetchMutation`, `api` |
| 10-13 | `createPaperTools()` factory context type |
| 15-46 | `startPaperSession` tool |
| 48-64 | `getCurrentPaperState` tool |
| 66-153 | `updateStageData` tool |
| 155-181 | `submitStageForValidation` tool |

### Paper Tools Definitions

| Tool | Line | Input Schema | Execute Logic |
|------|------|--------------|---------------|
| `startPaperSession` | 15-46 | initialIdea? | Convex `api.paperSessions.create` |
| `getCurrentPaperState` | 48-64 | (none) | Convex `api.paperSessions.getByConversation` |
| `updateStageData` | 66-153 | ringkasan, data? | Convex `api.paperSessions.updateStageData` |
| `submitStageForValidation` | 155-181 | (none) | Convex `api.paperSessions.submitForValidation` |

### Key Implementation Notes

| Tool | Note |
|------|------|
| `updateStageData` | AUTO-STAGE: Stage auto-fetched from `session.currentStage`, not specified by AI |
| `startPaperSession` | Must be called immediately when user shows paper writing intent |
| `submitStageForValidation` | Triggers UI panel for user approval |

---

## Paper Search Helpers

```
src/lib/ai/
└── paper-search-helpers.ts           # Tool state switching helpers (182 lines)
```

### Paper Search Helpers Module (src/lib/ai/paper-search-helpers.ts)

| Line | What's There |
|------|--------------|
| 1-11 | Module docs + imports |
| 18-48 | `STAGE_RESEARCH_REQUIREMENTS` - minCount per stage |
| 53-71 | `isStageResearchIncomplete()` - check if research needed |
| 76-90 | `aiIndicatedSearchIntent()` - detect AI's promise to search |
| 95-105 | `isExplicitSaveSubmitRequest()` - detect save/submit patterns |
| 110-131 | `getLastAssistantMessage()` - extract AI message content |
| 137-151 | `PAPER_TOOLS_ONLY_NOTE` - note when search disabled |
| 157-171 | `getResearchIncompleteNote()` - note when research needed |
| 177-182 | `getFunctionToolsModeNote()` - note when function tools active |

### Exported Functions

| Function | Line | Purpose |
|----------|------|---------|
| `isStageResearchIncomplete()` | 53-71 | Check if stage needs research |
| `aiIndicatedSearchIntent()` | 76-90 | Check if AI promised to search |
| `isExplicitSaveSubmitRequest()` | 95-105 | Check for save/submit patterns |
| `getLastAssistantMessage()` | 110-131 | Get last AI message text |
| `PAPER_TOOLS_ONLY_NOTE` | 137-151 | System note (search disabled) |
| `getResearchIncompleteNote()` | 157-171 | System note (research needed) |
| `getFunctionToolsModeNote()` | 177-182 | System note (function tools active) |

### Stage Research Requirements

| Stage | Required Field | Min Count |
|-------|---------------|-----------|
| `gagasan` | `referensiAwal` | 2 |
| `topik` | `referensiPendukung` | 3 |
| `tinjauan_literatur` | `referensi` | 5 |
| `pendahuluan` | `sitasiAPA` | 2 |
| `diskusi` | `sitasiTambahan` | 2 |

---

## API Endpoints

```
src/app/api/
├── chat/
│   └── route.ts                      # Main chat streaming (with tools)
├── refrasa/
│   └── route.ts                      # Text style improvement
├── extract-file/
│   └── route.ts                      # File text extraction (incl. OCR)
├── export/
│   ├── word/
│   │   └── route.ts                  # Export to DOCX
│   └── pdf/
│       └── route.ts                  # Export to PDF
├── admin/
│   └── validate-provider/
│       └── route.ts                  # Admin: test provider config
└── webhooks/
    └── clerk/
        └── route.ts                  # Clerk webhook handler
```

### API Routes Summary

| Endpoint | Method | LLM Provider | Purpose |
|----------|--------|--------------|---------|
| `/api/chat` | POST | Gateway → OpenRouter | Main chat streaming |
| `/api/refrasa` | POST | Gateway → OpenRouter | Style improvement |
| `/api/extract-file` | POST | OpenRouter (GPT-4o) | File extraction + OCR |
| `/api/export/word` | POST | None | Export to DOCX |
| `/api/export/pdf` | POST | None | Export to PDF |
| `/api/admin/validate-provider` | POST | Dynamic | Test provider config |
| `/api/webhooks/clerk` | POST | None | Clerk user sync |

### Refrasa Route (src/app/api/refrasa/route.ts)

| Line | What's There |
|------|--------------|
| 10 | Import `getGatewayModel`, `getOpenRouterModel` |
| 16 | `maxDuration = 300` |
| 82-96 | Primary provider (Gateway) with `generateObject` |
| 101-115 | Fallback to OpenRouter |
| 90 | `temperature: 0.7` |

---

## Image OCR

```
src/lib/file-extraction/
└── image-ocr.ts                      # GPT-4o Vision via OpenRouter
```

### Image OCR Module (src/lib/file-extraction/image-ocr.ts)

| Line | What's There |
|------|--------------|
| 9 | Import `createOpenRouter` from `@openrouter/ai-sdk-provider` |
| 17 | `OCR_MODEL = "openai/gpt-4o"` |
| 57-63 | `createOpenRouterClient()` |
| 133-151 | `generateText()` call with Vision |
| 150 | `temperature: 0.3` |

---

## Database & Migrations

```
convex/
├── schema.ts                         # aiProviderConfigs table definition
└── migrations/
    ├── seedDefaultAIConfig.ts        # Initial config seed
    └── updateAIConfigForToolCalling.ts  # Update fallback model for tool calling
```

### AI Provider Config Schema (convex/schema.ts:202-234)

| Field | Type | Description |
|-------|------|-------------|
| `primaryProvider` | string | "vercel-gateway" \| "openrouter" |
| `primaryModel` | string | e.g., "google/gemini-2.5-flash-lite" |
| `primaryApiKey` | string | API key (plain text) |
| `fallbackProvider` | string | "openrouter" \| "vercel-gateway" |
| `fallbackModel` | string | e.g., "openai/gpt-4o" |
| `fallbackApiKey` | string | API key (plain text) |
| `temperature` | number | 0.0 - 2.0, default 0.7 |
| `topP` | number | Optional: 0.0 - 1.0 |
| `maxTokens` | number | Optional: max output tokens |
| `version` | number | Incremented per update |
| `isActive` | boolean | Only one active at a time |
| `parentId` | id | Parent config link |
| `rootId` | id | Root config link |
| `createdBy` | id | Admin user |
| `createdAt` | number | Timestamp |
| `updatedAt` | number | Timestamp |

### Seed Migration (convex/migrations/seedDefaultAIConfig.ts)

| Line | What's There |
|------|--------------|
| 61-64 | Primary: vercel-gateway, gemini-2.5-flash-lite |
| 66-69 | Fallback: openrouter, gemini-2.5-flash-lite |
| 72 | Temperature: 0.7 |

### Tool Calling Migration (convex/migrations/updateAIConfigForToolCalling.ts)

| Line | What's There |
|------|--------------|
| 27-34 | Tool-calling compatible models list |
| 57 | New fallback model: `google/gemini-2.0-flash-001` |
| 76-80 | Change summary in return message |

**Purpose:** `gemini-2.5-flash-lite` adalah "reasoning model" yang tidak optimal untuk tool calling. Migration ini mengubah fallback ke `gemini-2.0-flash-001` yang memiliki explicit function calling support.

---

## Data Flow Summary

**Note:** Diagram ini menunjukkan alur tools dan API. Model mengikuti `aiProviderConfigs` (database).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 TOOLS & API ARCHITECTURE (Database Config)                   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     /api/chat (Main Chat)                             │   │
│  │                                                                       │   │
│  │  Provider: Gateway (primary) → OpenRouter (fallback)                  │   │
│  │  Model: aiProviderConfigs.primaryModel → aiProviderConfigs.fallbackModel │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │ Mode: Normal (enableWebSearch = false)                          │ │   │
│  │  │ Tools: createArtifact, updateArtifact, renameConversationTitle, │ │   │
│  │  │        startPaperSession, getCurrentPaperState, updateStageData,│ │   │
│  │  │        submitStageForValidation                                 │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                       │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │  │ Mode: Web Search (enableWebSearch = true)                       │ │   │
│  │  │ Tools: google_search ONLY (provider-defined)                    │ │   │
│  │  │ ⚠️  Cannot mix with function tools                              │ │   │
│  │  └─────────────────────────────────────────────────────────────────┘ │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     /api/refrasa                                      │   │
│  │                                                                       │   │
│  │  Provider: Gateway → OpenRouter (fallback)                            │   │
│  │  Model: aiProviderConfigs.primaryModel → aiProviderConfigs.fallbackModel │   │
│  │  Method: generateObject (structured output)                           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     /api/extract-file (Image OCR)                     │   │
│  │                                                                       │   │
│  │  Provider: OpenRouter (dedicated)                                     │   │
│  │  Model: openai/gpt-4o                                                 │   │
│  │  Method: generateText (Vision)                                        │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Search Patterns

```bash
# Find all tool definitions
rg "tool\\(" src/app/api/chat/ src/lib/ai/

# Find provider usage
rg "getGatewayModel|getOpenRouterModel|createOpenRouter" src/

# Find API routes
rg --files -g "route.ts" src/app/api

# Find generateText/generateObject usage
rg "generateText|generateObject" src/app/api/ src/lib/

# Find google_search references
rg "google_search|googleSearch" src/
```

---

## Quick Reference: Key Lines

| File | Line(s) | What's There |
|------|---------|--------------|
| `src/lib/ai/streaming.ts` | 154-160 | `getGatewayModel()` |
| `src/lib/ai/streaming.ts` | 166-172 | `getOpenRouterModel()` |
| `src/lib/ai/streaming.ts` | 210-233 | `getGoogleSearchTool()` |
| `src/app/api/chat/route.ts` | 652-725 | `createArtifact` tool |
| `src/app/api/chat/route.ts` | 726-786 | `updateArtifact` tool |
| `src/app/api/chat/route.ts` | 787-855 | `renameConversationTitle` tool |
| `src/app/api/chat/route.ts` | 871-873 | Cannot mix tools constraint |
| `src/app/api/chat/route.ts` | 914-976 | **Tool State Switching** (ACTIVE stages) |
| `src/app/api/chat/route.ts` | 1050-1052 | `google_search` assignment |
| `src/lib/ai/paper-tools.ts` | 15-46 | `startPaperSession` tool |
| `src/lib/ai/paper-tools.ts` | 48-64 | `getCurrentPaperState` tool |
| `src/lib/ai/paper-tools.ts` | 66-153 | `updateStageData` tool |
| `src/lib/ai/paper-tools.ts` | 155-181 | `submitStageForValidation` tool |
| `src/lib/ai/paper-search-helpers.ts` | 53-71 | `isStageResearchIncomplete()` |
| `src/lib/ai/paper-search-helpers.ts` | 177-182 | `getFunctionToolsModeNote()` |
| `src/app/api/refrasa/route.ts` | 82-96 | Primary provider call |
| `src/lib/file-extraction/image-ocr.ts` | 133-151 | Vision API call |

---

## Environment Variables

| Variable | Required For | Description |
|----------|--------------|-------------|
| `VERCEL_AI_GATEWAY_API_KEY` | Gateway | Primary provider API key |
| `AI_GATEWAY_API_KEY` | Gateway | Alias (auto-set from above) |
| `OPENROUTER_API_KEY` | OpenRouter | Fallback + OCR provider key |
| `GOOGLE_GENERATIVE_AI_API_KEY` | google_search | Required if using Google provider directly |

---

*Last updated: 2026-01-15*
