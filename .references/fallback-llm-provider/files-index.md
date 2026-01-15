# Fallback LLM Provider - Files Index

Quick reference untuk lokasi semua files terkait OpenRouter Fallback LLM Provider.

## Quick Jump

| Category | Count | Files |
|----------|-------|-------|
| [Core Streaming](#core-streaming) | 2 | Provider model, config cache |
| [API Routes dengan Fallback](#api-routes-dengan-fallback) | 3 | Chat, title, refrasa |
| [Dedicated OpenRouter](#dedicated-openrouter) | 1 | Image OCR |
| [Database & Schema](#database--schema) | 2 | Config storage, migrations |
| [Admin Panel UI](#admin-panel-ui) | 2 | Manager, form dialog |
| [Admin Validation & Compatibility](#admin-validation--compatibility) | 2 | Basic test, tool compatibility |
| **Total** | **12** | |

---

## Core Streaming

```
src/lib/ai/
├── streaming.ts                      # Provider model creation + exports
└── config-cache.ts                   # In-memory config caching
```

### Streaming Core (src/lib/ai/streaming.ts)

| Line | What's There |
|------|--------------|
| 1-9 | Imports: `createOpenRouter`, `createGateway`, env alias |
| 19-25 | `AIProviderConfigError` - Custom error class for missing config |
| 35-63 | `getProviderConfig()` - Load config from cache/DB (NO hardcoded fallback) |
| 41-45 | **Error throw jika no config** - Database is SINGLE SOURCE OF TRUTH |
| 47-62 | Return config object dengan `maxTokens` |
| 135-188 | `createProviderModel()` - Create model instance by provider type |
| 145-165 | Vercel Gateway creation dengan google prefix handling |
| 166-187 | OpenRouter creation: `createOpenRouter` dari `@openrouter/ai-sdk-provider` dengan `.chat(model)` |
| 247-254 | `getGatewayModel()` - Get primary model |
| 269-295 | `getOpenRouterModel()` - Get fallback model (dengan web search `:online` suffix support) |
| 300-307 | `getProviderSettings()` - Get temperature/topP/maxTokens |
| 313-325 | `getModelNames()` - Get model names for metadata/logging |
| 332-356 | `getGoogleSearchTool()` - Get Google Search tool (provider-defined) |

**PENTING:** Tidak ada hardcoded fallback config. Jika tidak ada config aktif di database, akan throw `AIProviderConfigError`.

### Config Cache (src/lib/ai/config-cache.ts)

| Line | What's There |
|------|--------------|
| 6-24 | `AIProviderConfig` interface dengan fallback fields + maxTokens |
| 17-18 | `topP?: number`, `maxTokens?: number` |
| 29-93 | `ConfigCache` class singleton |
| 32 | TTL constant: 5 minutes (300,000 ms) |
| 38-67 | `get()` - Fetch dengan stale cache fallback |
| 62-65 | Stale cache fallback saat DB error |
| 73-76 | `invalidate()` - Force fresh fetch |
| 81-89 | `getState()` - Debug cache state |

---

## API Routes dengan Fallback

```
src/
├── app/api/chat/
│   └── route.ts                      # Main chat dengan fallback
├── lib/ai/
│   └── title-generator.ts            # Title generation dengan triple fallback
└── app/api/refrasa/
    └── route.ts                      # Refrasa dengan dual fallback
```

### Chat Route (src/app/api/chat/route.ts)

| Line | What's There |
|------|--------------|
| 301-305 | Import `getGatewayModel`, `getOpenRouterModel`, `getProviderSettings`, `getModelNames` |
| 308-309 | Get `providerSettings` dan `modelNames` dari config |
| 310-314 | `samplingOptions` object dengan temperature, topP, maxTokens |
| 645 | Primary model: `const model = await getGatewayModel()` |
| 699 | Primary streamText dengan `...samplingOptions` |
| 1182-1204 | Fallback mechanism dengan `getOpenRouterModel()` |
| 1188 | Fallback streamText dengan `...samplingOptions` |

**Catatan**: Fallback mode TIDAK memiliki:
- `google_search` tool (provider-defined, Gateway-only)
- Inline citations/grounding metadata
- Tetap support function tools (createArtifact, paper tools)

**Dynamic Model Metadata:**
- Message metadata sekarang menggunakan `modelNames.primary.model` atau `modelNames.fallback.model`
- Bukan hardcoded `"google/gemini-2.5-flash-lite"` lagi

### Title Generator (src/lib/ai/title-generator.ts)

| Line | What's There |
|------|--------------|
| 2 | Import `getGatewayModel`, `getOpenRouterModel` |
| 40-64 | `generateTitle()` dengan triple fallback |
| 43-49 | Level 1: Primary (Gateway) |
| 50-58 | Level 2: Fallback (OpenRouter) |
| 59-62 | Level 3: Final (truncate user message + "...") |

**Fallback Chain:**
```
Gateway → OpenRouter → userMessage.substring(0, 30) + "..."
```

### Refrasa Route (src/app/api/refrasa/route.ts)

| Line | What's There |
|------|--------------|
| 10 | Import `getGatewayModel`, `getOpenRouterModel` |
| 82-97 | Level 1: Primary dengan `generateObject()` |
| 99-116 | Catch + Level 2: Fallback dengan `generateObject()` |
| 115-119 | Final error: Return 500 |

---

## Dedicated OpenRouter

```
src/lib/file-extraction/
└── image-ocr.ts                      # GPT-4o Vision via OpenRouter
```

### Image OCR (src/lib/file-extraction/image-ocr.ts)

| Line | What's There |
|------|--------------|
| 9 | Import `createOpenRouter` dari `@openrouter/ai-sdk-provider` |
| 17 | `OCR_MODEL = "openai/gpt-4o"` |
| 22-36 | `ImageOCRError` class dengan error codes |
| 43-49 | `validateOpenRouterKey()` |
| 57-63 | `createOpenRouterClient()` - Official SDK |
| 133-151 | `generateText()` dengan Vision API |
| 150 | Temperature: 0.3 (low for consistent OCR) |
| 178-206 | Error detection: rate_limit, invalid_image, API error |

**Sama dengan fallback chat:**
- Keduanya menggunakan `@openrouter/ai-sdk-provider` (official SDK)
- Keduanya menggunakan `createOpenRouter().chat(model)` pattern

**Perbedaan:**
- Image OCR: Model hardcoded `openai/gpt-4o` (Vision-capable)
- Fallback: Model dari database config (bisa model apapun)

---

## Database & Schema

```
convex/
├── schema.ts                         # aiProviderConfigs table definition
├── aiProviderConfigs.ts              # CRUD mutations/queries
└── migrations/
    └── seedDefaultAIConfig.ts        # Seed default config
```

### Schema (convex/schema.ts)

| Line | What's There |
|------|--------------|
| 195-228 | `aiProviderConfigs` table definition |
| 200-202 | Primary provider fields |
| 205-207 | Fallback provider fields |
| 210-212 | AI settings (temperature, topP, **maxTokens**) |
| 215-218 | Versioning (version, isActive, parentId, rootId) |
| 225-227 | Indexes (by_active, by_root, by_createdAt) |

### AI Provider Configs (convex/aiProviderConfigs.ts)

| Line | What's There |
|------|--------------|
| 9-19 | `getActiveConfig` query (no auth) |
| 26-65 | `listConfigs` query (admin only) |
| 71-100 | `getConfigVersionHistory` query |
| 106-161 | `createConfig` mutation (includes maxTokens) |
| 171-256 | `updateConfig` mutation (creates new version, includes maxTokens) |
| 263-295 | `activateConfig` mutation |
| 301-352 | `swapProviders` mutation (includes maxTokens) |
| 358-383 | `deleteConfig` mutation |
| 389-431 | `deleteConfigChain` mutation |

### Migration (convex/migrations/seedDefaultAIConfig.ts)

| Line | What's There |
|------|--------------|
| 43-44 | Get API keys dari environment |
| 57-85 | Insert default config |
| 62-64 | Primary: `vercel-gateway`, `google/gemini-2.5-flash-lite` |
| 67-69 | Fallback: `openrouter`, `google/gemini-2.5-flash-lite` |
| 77 | `isActive: true` by default |

---

## Admin Panel UI

```
src/components/admin/
├── AIProviderManager.tsx             # Config list management
└── AIProviderFormDialog.tsx          # Create/edit config form
```

### AIProviderFormDialog (src/components/admin/AIProviderFormDialog.tsx)

| Line | What's There |
|------|--------------|
| 27-28 | Import icons: Shield, ShieldCheck, ShieldX, AlertTriangle + Alert components |
| 142-169 | `CompatibilityVerificationResult` interface |
| 214-216 | State: isVerifyingCompatibility, compatibilityResult |
| 266 | Reset compatibilityResult on dialog open |
| 289 | Reset compatibility on fallback provider change |
| 304 | Reset compatibility on fallback model preset change |
| 383-429 | `handleVerifyCompatibility()` - call verification API |
| 779-856 | **Tool Compatibility Verification UI** (OpenRouter only) |
| 783-801 | "Verify Tool Compatibility" button |
| 811-854 | Compatibility Results Alert panel |

**Compatibility UI Flow:**
```
Test button passed? → Enable "Verify Tool Compatibility" button
                   → Show results panel dengan feature checklist
                   → Green/Yellow/Red styling based on level
```

---

## Admin Validation & Compatibility

```
src/app/api/admin/
├── validate-provider/
│   └── route.ts                      # Test provider connection (basic)
└── verify-model-compatibility/
    └── route.ts                      # Comprehensive tool calling verification
```

### Validate Provider (src/app/api/admin/validate-provider/route.ts)

| Line | What's There |
|------|--------------|
| 3 | Import `createOpenAI` dari `@ai-sdk/openai` |
| 65-84 | Vercel Gateway validation |
| 85-105 | OpenRouter validation dengan `createOpenAI({ baseURL })` pattern (legacy) |
| 96-103 | OpenRouter config: `baseURL`, `HTTP-Referer`, `X-Title` headers |
| 114-118 | Test prompt: "Say 'OK' if you can read this." |

**CATATAN:** File ini masih menggunakan pattern lama (`createOpenAI` dengan custom baseURL). Berbeda dengan `streaming.ts` yang sudah diupdate ke `createOpenRouter` official SDK.

### Verify Model Compatibility (src/app/api/admin/verify-model-compatibility/route.ts)

**Purpose:** Comprehensive tool calling verification untuk OpenRouter fallback models.

| Line | What's There |
|------|--------------|
| 1-7 | Imports: NextRequest, NextResponse, Clerk auth, AI SDK (`createOpenAI`), Zod |
| 19-22 | `SimpleToolSchema` - string + enum test |
| 24-31 | `ComplexToolSchema` - nested arrays, enums, optionals test |
| 33-37 | `StructuredOutputSchema` - generateObject test |
| 39-45 | `VerificationResult` interface |
| 47-88 | Auth & permission check (admin/superadmin only) |
| 99-109 | OpenRouter client creation (`createOpenAI` dengan custom baseURL - legacy) |
| 112-136 | **TEST 1**: Basic text generation |
| 138-174 | **TEST 2**: Simple tool calling |
| 176-225 | **TEST 3**: Complex tool calling |
| 227-257 | **TEST 4**: Structured output (generateObject) |
| 259-271 | Aggregate results & compatibility level |
| 273-306 | Response with feature support mapping |

**CATATAN:** File ini juga masih menggunakan pattern lama (`createOpenAI` dengan custom baseURL), sama seperti `validate-provider/route.ts`.

**4 Capability Tests:**

| Test | AI SDK Function | Complexity |
|------|-----------------|------------|
| `basic_generation` | `generateText()` | None |
| `simple_tool_calling` | `tool({ inputSchema: SimpleSchema })` | Simple |
| `complex_tool_calling` | `tool({ inputSchema: ComplexSchema })` | Complex |
| `structured_output` | `generateObject({ schema })` | Structured |

**Feature Mapping:**

| Test Result | Mapped Features |
|-------------|-----------------|
| `basic_generation` | Chat Streaming, Title Generation |
| `simple_tool_calling` | createArtifact, updateArtifact, renameConversationTitle |
| `complex_tool_calling` | Paper Tools (startPaperSession, updateStageData, submitStageForValidation) |
| `structured_output` | Refrasa (RefrasaOutputSchema) |

---

## Dependencies

```json
// package.json
{
  "@ai-sdk/openai": "^2.0.86",           // Admin validate-provider (legacy pattern)
  "@ai-sdk/gateway": "^2.0.24",          // Vercel AI Gateway (primary)
  "@openrouter/ai-sdk-provider": "^1.5.4" // Official OpenRouter SDK (fallback streaming + Image OCR)
}
```

**CATATAN PENTING (2026-01-14):**
- **Fallback streaming** (`streaming.ts`) menggunakan `@openrouter/ai-sdk-provider` (official SDK)
- **Admin validation** (`validate-provider/route.ts`) masih menggunakan `@ai-sdk/openai` dengan custom baseURL (legacy)
- Perubahan ke official SDK di streaming.ts memperbaiki bug reasoning model detection yang menyebabkan tool calling tidak berfungsi untuk model dengan prefix `openai/` (contoh: `openai/gpt-4o`)

---

## Data Flow Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FALLBACK PROVIDER FLOW                               │
│                    (Database = SINGLE SOURCE OF TRUTH)                      │
│                                                                             │
│  API Request                                                                 │
│       │                                                                     │
│       ▼                                                                     │
│  getProviderConfig()                                                        │
│       │                                                                     │
│       ├── configCache.get()                                                 │
│       │        │                                                            │
│       │        ├── Fresh cache? → Use cached                               │
│       │        │                                                            │
│       │        └── Stale/No cache? → fetchQuery(getActiveConfig)           │
│       │                  │                                                  │
│       │                  ├── Found? → Use DB config                        │
│       │                  │                                                  │
│       │                  └── Not found? → throw AIProviderConfigError      │
│       │                                                                     │
│       ▼                                                                     │
│  getProviderSettings()                                                      │
│       │                                                                     │
│       └── Returns: { temperature, topP, maxTokens }                        │
│                                                                             │
│       ▼                                                                     │
│  Try PRIMARY (Vercel Gateway)                                               │
│       │                                                                     │
│       ├── Success? → Stream response                                       │
│       │                                                                     │
│       └── Error? → Try FALLBACK (OpenRouter)                               │
│            │                                                                │
│            ├── Success? → Stream response (tanpa web search/citations)     │
│            │                                                                │
│            └── Error? → Return 500                                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Search Patterns

```bash
# Find all OpenRouter related files
grep -r "openrouter\|OpenRouter\|OPENROUTER" src/ convex/ --include="*.ts" --include="*.tsx"

# Find fallback mechanism
grep -r "getOpenRouterModel\|fallbackModel\|fallback.*provider" src/

# Find provider creation
grep -r "createOpenRouter\|createGateway\|createProviderModel" src/lib/ai/

# Find config cache usage
grep -r "configCache\|getProviderConfig" src/

# Find dedicated OpenRouter usage (Image OCR)
grep -r "createOpenRouter\|@openrouter/ai-sdk-provider" src/

# Find maxTokens usage
grep -r "maxTokens" src/lib/ai/ convex/

# Find compatibility verification
grep -r "verify-model-compatibility\|CompatibilityVerificationResult\|handleVerifyCompatibility" src/
```

---

## Quick Reference: Key Lines

| File | Line(s) | What's There |
|------|---------|--------------|
| `src/lib/ai/streaming.ts` | 19-24 | `AIProviderConfigError` class |
| `src/lib/ai/streaming.ts` | 40-45 | Error throw jika no config (SINGLE SOURCE OF TRUTH) |
| `src/lib/ai/streaming.ts` | 166-187 | OpenRouter model creation (`createOpenRouter` + `.chat()`) |
| `src/lib/ai/streaming.ts` | 269-295 | `getOpenRouterModel()` export (dengan `:online` suffix support) |
| `src/lib/ai/streaming.ts` | 300-307 | `getProviderSettings()` dengan maxTokens |
| `src/lib/ai/streaming.ts` | 313-325 | `getModelNames()` untuk dynamic metadata |
| `src/lib/ai/config-cache.ts` | 17-18 | topP dan maxTokens di interface |
| `src/lib/ai/config-cache.ts` | 62-65 | Stale cache fallback |
| `src/app/api/chat/route.ts` | 310-314 | samplingOptions dengan maxTokens |
| `src/app/api/chat/route.ts` | 1182-1204 | Chat fallback mechanism |
| `src/lib/ai/title-generator.ts` | 50-62 | Triple fallback chain |
| `src/app/api/refrasa/route.ts` | 99-116 | Dual fallback mechanism |
| `src/lib/file-extraction/image-ocr.ts` | 57-63 | Dedicated OpenRouter client |
| `convex/aiProviderConfigs.ts` | 9-19 | `getActiveConfig` query |
| `convex/schema.ts` | 195-228 | `aiProviderConfigs` table (includes maxTokens) |
| `src/components/admin/AIProviderFormDialog.tsx` | 142-169 | `CompatibilityVerificationResult` interface |
| `src/components/admin/AIProviderFormDialog.tsx` | 383-429 | `handleVerifyCompatibility()` handler |
| `src/components/admin/AIProviderFormDialog.tsx` | 779-856 | Tool Compatibility Verification UI |
| `src/app/api/admin/verify-model-compatibility/route.ts` | 19-37 | Test schemas (Simple, Complex, Structured) |
| `src/app/api/admin/verify-model-compatibility/route.ts` | 106-251 | 4 capability tests |
| `src/app/api/admin/verify-model-compatibility/route.ts` | 256-300 | Compatibility level & feature mapping |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key untuk fallback |
| `VERCEL_AI_GATEWAY_API_KEY` | Yes | Vercel AI Gateway API key (primary) |
| `APP_URL` | Optional | HTTP-Referer header (default: `http://localhost:3000`) |

---

*Last updated: 2026-01-14*
