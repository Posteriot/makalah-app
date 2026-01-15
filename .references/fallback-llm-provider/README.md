# Fallback LLM Provider - Technical Reference

Dokumentasi lengkap tentang OpenRouter sebagai Fallback LLM Provider di Makalah App - sistem dual-provider untuk high availability AI responses.

## Daftar Isi

1. [Overview](#overview)
2. [Rationale](#rationale)
3. [Architecture](#architecture)
4. [Provider Configuration](#provider-configuration)
5. [Fallback Mechanisms](#fallback-mechanisms)
6. [Config Cache System](#config-cache-system)
7. [Database Schema](#database-schema)
8. [Dedicated OpenRouter Usage](#dedicated-openrouter-usage)
9. [Admin Validation](#admin-validation)
10. [Model Compatibility Verification](#model-compatibility-verification)
11. [Environment Variables](#environment-variables)
12. [Constraints & Limitations](#constraints--limitations)
13. [Troubleshooting](#troubleshooting)

---

## Overview

Makalah App mengimplementasikan arsitektur dual-provider untuk AI/LLM dengan:
- **Primary**: Vercel AI Gateway
- **Fallback**: OpenRouter

Sistem ini memastikan high availability - jika primary provider gagal (error, timeout, rate limit), sistem otomatis switch ke fallback provider.

### Key Features

- **Automatic Failover**: Try-catch pattern untuk seamless fallback
- **Database-Driven Config**: Provider settings disimpan di Convex (SINGLE SOURCE OF TRUTH)
- **In-Memory Caching**: Cache dengan TTL 5 menit untuk performance
- **Explicit Error Handling**: Jika tidak ada config aktif, error dengan jelas (bukan silent degradation)
- **Dedicated Use Cases**: Image OCR menggunakan OpenRouter langsung (GPT-4o Vision)
- **Dynamic Model Metadata**: Message metadata menggunakan actual model dari config

### Package Dependencies

```json
{
  "@ai-sdk/openai": "^2.0.86",           // Admin validate-provider (legacy pattern)
  "@ai-sdk/gateway": "^2.0.24",          // Vercel AI Gateway (primary)
  "@openrouter/ai-sdk-provider": "^1.5.4" // Official OpenRouter SDK (fallback streaming + Image OCR)
}
```

**CATATAN (2026-01-14):**
- **Fallback streaming** menggunakan `@openrouter/ai-sdk-provider` (official SDK)
- **Admin validation** masih menggunakan `@ai-sdk/openai` dengan custom baseURL
- Perubahan ke official SDK di streaming.ts memperbaiki bug reasoning model detection

---

## Rationale

### Mengapa Dual-Provider Architecture?

1. **High Availability**
   - Single point of failure dihindari
   - Service tetap berjalan saat primary down
   - User experience tidak terganggu

2. **Cost Optimization**
   - Primary: Vercel Gateway (optimized pricing)
   - Fallback: OpenRouter (pay-per-use)

3. **Feature Flexibility**
   - Gateway mendukung `google_search` (provider-defined tool)
   - OpenRouter mendukung berbagai model (GPT-4o untuk Vision)

### Mengapa OpenRouter sebagai Fallback?

1. **Multi-Model Access**: Akses ke berbagai model via satu API
2. **Official SDK Support**: `@openrouter/ai-sdk-provider` terintegrasi langsung dengan AI SDK
3. **Proven Reliability**: Established provider dengan uptime tinggi
4. **Flexible Billing**: Pay-per-use tanpa commitment

### Mengapa TIDAK Simple Retry?

1. **Different Failure Modes**: Rate limit vs API error vs timeout butuh handling berbeda
2. **Provider-Specific Issues**: Jika Gateway down, retry tidak membantu
3. **Faster Recovery**: Switch provider lebih cepat dari retry loop

---

## Architecture

### High-Level Provider Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       DUAL-PROVIDER ARCHITECTURE                             │
│                                                                             │
│                    Database = SINGLE SOURCE OF TRUTH                        │
│                    (No hardcoded fallback config)                           │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   API Request    │
                              └────────┬─────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ getProviderConfig│
                              └────────┬─────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                         ▼                           ▼
                  ┌────────────┐              ┌────────────┐
                  │  In-Memory │              │  Database  │
                  │   Cache    │◄────────────▶│   Config   │
                  │ (TTL 5min) │              │  (Convex)  │
                  └────────────┘              └────────────┘
                         │                           │
                         └─────────────┬─────────────┘
                                       │
                              ┌────────┴────────┐
                              │                 │
                              ▼                 ▼
                       ┌────────────┐    ┌─────────────────┐
                       │  Config    │    │   No Config?    │
                       │   Found    │    │ AIProviderConfig│
                       └─────┬──────┘    │     Error       │
                             │           └────────┬────────┘
                             │                    │
                             ▼                    ▼
                  ┌──────────────────┐      ┌──────────┐
                  │ createProvider   │      │ Return   │
                  │     Model()      │      │   503    │
                  └────────┬─────────┘      └──────────┘
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
      ┌─────────────┐            ┌─────────────┐
      │   PRIMARY   │            │  FALLBACK   │
      │   Vercel    │            │ OpenRouter  │
      │   Gateway   │            │             │
      └──────┬──────┘            └──────┬──────┘
             │                           │
             ▼                           │
       ┌──────────┐                     │
       │ Try API  │                     │
       │   Call   │                     │
       └────┬─────┘                     │
            │                           │
   ┌────────┴────────┐                 │
   │                 │                 │
   ▼                 ▼                 │
┌─────────┐    ┌──────────┐           │
│ Success │    │  Error   │───────────┤
└────┬────┘    └──────────┘           │
     │                                 │
     ▼                                 ▼
┌─────────┐                     ┌──────────┐
│ Return  │                     │ Try API  │
│ Response│                     │   Call   │
└─────────┘                     └────┬─────┘
                                     │
                            ┌────────┴────────┐
                            │                 │
                            ▼                 ▼
                      ┌─────────┐       ┌──────────┐
                      │ Success │       │  Error   │
                      └────┬────┘       └────┬─────┘
                           │                 │
                           ▼                 ▼
                      ┌─────────┐       ┌──────────┐
                      │ Return  │       │ Return   │
                      │ Response│       │   500    │
                      └─────────┘       └──────────┘
```

### Model Usage Summary

Model dikonfigurasi via Admin Panel → AI Providers. Contoh konfigurasi production saat ini:

| Component | Primary Provider | Fallback Provider |
|-----------|-----------------|-------------------|
| Chat | Vercel Gateway | OpenRouter |
| Title Generation | Vercel Gateway | OpenRouter |
| Refrasa | Vercel Gateway | OpenRouter |
| Image OCR | OpenRouter (dedicated) | - |

**Contoh Konfigurasi (dari Admin Panel):**
- Primary Model: `google/gemini-2.5-flash` (via Vercel Gateway)
- Fallback Model: `openai/gpt-4o` (via OpenRouter)

**PENTING:** Model ditentukan oleh database config, bukan hardcoded di code.

---

## Provider Configuration

### Primary: Vercel AI Gateway

```typescript
// src/lib/ai/streaming.ts Lines 145-165
if (provider === "vercel-gateway") {
  const resolvedApiKey =
    apiKey || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_AI_GATEWAY_API_KEY

  if (!resolvedApiKey) {
    throw new Error("API key ENV tidak ditemukan untuk Vercel AI Gateway")
  }

  const gateway = createGateway({
    apiKey: resolvedApiKey,
  })

  // Ensure google prefix is present for Gemini models
  const targetModel = (model.includes("gemini") && !model.includes("/"))
    ? `google/${model}`
    : model

  return gateway(targetModel)
}
```

### Fallback: OpenRouter

```typescript
// src/lib/ai/streaming.ts Lines 166-187
if (provider === "openrouter") {
  // OpenRouter: Use official @openrouter/ai-sdk-provider
  // IMPORTANT: This provider handles model ID correctly and doesn't have
  // the reasoning model detection bug that @ai-sdk/openai has with prefixed
  // model IDs like "openai/gpt-4o" (which gets incorrectly detected as reasoning model)
  const resolvedApiKey = apiKey || process.env.OPENROUTER_API_KEY

  if (!resolvedApiKey) {
    throw new Error("API key ENV tidak ditemukan untuk OpenRouter")
  }

  const openrouter = createOpenRouter({
    apiKey: resolvedApiKey,
  })

  // Use .chat() method for chat models (recommended per documentation)
  return openrouter.chat(model)
}
```

**Catatan:**
- Official SDK tidak perlu custom headers (`HTTP-Referer`, `X-Title`) - handled internally
- Import: `import { createOpenRouter } from "@openrouter/ai-sdk-provider"`
- Pattern: `createOpenRouter().chat(modelId)` untuk chat models

### No Config Error Handling

Jika tidak ada config aktif di database, sistem akan throw error:

```typescript
// src/lib/ai/streaming.ts Lines 40-45
if (!config) {
  throw new AIProviderConfigError(
    "No active AI provider configuration found. " +
    "Please activate a configuration in Admin Panel → AI Providers."
  )
}
```

**Rationale:**
- Database adalah SINGLE SOURCE OF TRUTH
- Tidak ada hardcoded fallback yang bisa bikin bingung maintenance
- Explicit error lebih baik dari silent degradation
- Admin langsung tau jika config belum di-setup

---

## Fallback Mechanisms

### Pattern 1: Chat API (Dual Fallback)

```typescript
// src/app/api/chat/route.ts Lines 645-700 (primary), 1182-1204 (fallback)
try {
  const model = await getGatewayModel()
  const result = streamText({
    model,
    messages: fullMessagesGateway,
    tools: enableWebSearch ? { google_search } : tools,
    ...samplingOptions, // includes temperature, topP, maxTokens
  })
  return result.toUIMessageStreamResponse()
} catch (error) {
  console.error("Gateway stream failed, trying fallback:", error)

  // Fallback: OpenRouter (tanpa web search)
  const fallbackModel = await getOpenRouterModel()
  const result = streamText({
    model: fallbackModel,
    messages: fullMessagesBase,
    tools, // Function tools only
    ...samplingOptions, // includes temperature, topP, maxTokens
  })
  return result.toUIMessageStreamResponse()
}
```

**Catatan Penting:**
- Fallback mode TIDAK memiliki `google_search` (provider-defined tool)
- Fallback mode TIDAK memiliki inline citations
- Tetap support function tools (createArtifact, paper tools)

### Pattern 2: Title Generation (Triple Fallback)

```typescript
// src/lib/ai/title-generator.ts Lines 40-64
export async function generateTitle(input: TitleGenerationInput): Promise<string> {
  const prompt = createTitlePrompt(input)

  try {
    // Level 1: Primary (Gateway)
    const model = await getGatewayModel()
    const { text } = await generateText({ model, prompt })
    return text.trim().slice(0, TITLE_MAX_LENGTH)
  } catch (error) {
    console.error("Title generation failed, trying fallback...", error)

    try {
      // Level 2: Fallback (OpenRouter)
      const fallbackModel = await getOpenRouterModel()
      const { text } = await generateText({ model: fallbackModel, prompt })
      return text.trim().slice(0, TITLE_MAX_LENGTH)
    } catch (finalError) {
      // Level 3: Final (truncate user message)
      console.error("All title generation attempts failed", finalError)
      return input.userMessage.substring(0, FALLBACK_TITLE_LENGTH) + "..."
    }
  }
}
```

### Pattern 3: Refrasa (Dual Fallback)

```typescript
// src/app/api/refrasa/route.ts Lines 82-119
try {
  const primaryModel = await getGatewayModel()
  const { object } = await generateObject({
    model: primaryModel,
    schema: RefrasaOutputSchema,
    prompt,
    temperature: 0.7,
  })
  result = { issues: object.issues, refrasedText: object.refrasedText }
} catch (primaryError) {
  console.error("[Refrasa API] Primary provider failed:", primaryError)

  try {
    const fallbackModel = await getOpenRouterModel()
    const { object } = await generateObject({
      model: fallbackModel,
      schema: RefrasaOutputSchema,
      prompt,
      temperature: 0.7,
    })
    result = { issues: object.issues, refrasedText: object.refrasedText }
  } catch (fallbackError) {
    console.error("[Refrasa API] Fallback provider also failed:", fallbackError)
    return NextResponse.json(
      { error: "Failed to process text. Please try again later." },
      { status: 500 }
    )
  }
}
```

---

## Config Cache System

### Cache Architecture

```typescript
// src/lib/ai/config-cache.ts
class ConfigCache {
  private config: AIProviderConfig | null = null
  private lastFetch: number = 0
  private TTL = 5 * 60 * 1000 // 5 minutes

  async get(): Promise<AIProviderConfig | null> {
    const now = Date.now()

    // Return cached config if still fresh
    if (this.config && now - this.lastFetch < this.TTL) {
      return this.config
    }

    try {
      // Fetch from Convex database
      const activeConfig = await fetchQuery(api.aiProviderConfigs.getActiveConfig)
      this.config = activeConfig
      this.lastFetch = now
      return this.config
    } catch (error) {
      console.error("[ConfigCache] Error fetching config:", error)
      // Return stale cache if available as fallback
      if (this.config) {
        return this.config
      }
      return null
    }
  }
}
```

### Cache Fallback Chain

```
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  Fresh Cache  │────▶│   Database    │────▶│  AIProvider   │
│   (< 5 min)   │     │    Config     │     │ ConfigError   │
└───────────────┘     └───────────────┘     └───────────────┘
       │                     │                     │
       │                     │                     │
       ▼                     ▼                     ▼
   Use cached           Use fetched            Throw error
     config               config             (no hardcoded)
```

### Cache Methods

| Method | Purpose |
|--------|---------|
| `get()` | Get config (cached atau fresh fetch) |
| `invalidate()` | Force fresh fetch on next get() |
| `getState()` | Debug: lihat cache state |

### Debug Cache State

```typescript
const state = configCache.getState()
// Returns:
// {
//   hasCached: boolean,
//   lastFetch: number,
//   age: number (ms),
//   ttl: number (ms),
//   isExpired: boolean
// }
```

---

## Database Schema

### aiProviderConfigs Table

```typescript
// convex/schema.ts Lines 195-228
aiProviderConfigs: defineTable({
  name: v.string(),
  description: v.optional(v.string()),

  // Primary Provider
  primaryProvider: v.string(),    // "vercel-gateway" | "openrouter"
  primaryModel: v.string(),       // e.g., "google/gemini-2.5-flash-lite"
  primaryApiKey: v.string(),      // Plain text (DB is private)

  // Fallback Provider
  fallbackProvider: v.string(),   // "openrouter" | "vercel-gateway"
  fallbackModel: v.string(),
  fallbackApiKey: v.string(),

  // AI Settings
  temperature: v.number(),        // 0.0 - 2.0
  topP: v.optional(v.number()),   // 0.0 - 1.0
  maxTokens: v.optional(v.number()), // Max output tokens

  // Versioning
  version: v.number(),
  isActive: v.boolean(),
  parentId: v.optional(v.id("aiProviderConfigs")),
  rootId: v.optional(v.id("aiProviderConfigs")),

  // Audit
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_active", ["isActive"])
  .index("by_root", ["rootId", "version"])
  .index("by_createdAt", ["createdAt"])
```

### Available Mutations

| Mutation | Purpose | Access |
|----------|---------|--------|
| `getActiveConfig` | Get active config | Public (no auth) |
| `listConfigs` | List all configs | Admin only |
| `createConfig` | Create new config | Admin only |
| `updateConfig` | Update (creates version) | Admin only |
| `activateConfig` | Activate config | Admin only |
| `swapProviders` | Swap primary/fallback | Admin only |
| `deleteConfig` | Delete single version | Admin only |
| `deleteConfigChain` | Delete all versions | Admin only |

### Seed Default Config

```bash
# Run migration
npx convex run migrations:seedDefaultAIConfig
```

Creates config dengan:
- Primary: Vercel Gateway, `google/gemini-2.5-flash-lite`
- Fallback: OpenRouter, `google/gemini-2.5-flash-lite`
- Temperature: 0.7
- Active by default

---

## Provider Settings Helper

### getProviderSettings()

Returns sampling options from active config:

```typescript
// src/lib/ai/streaming.ts Lines 300-307
export async function getProviderSettings() {
  const config = await getProviderConfig()
  return {
    temperature: config.temperature,
    topP: config.topP,
    maxTokens: config.maxTokens,
  }
}
```

### getModelNames()

Returns model identifiers for metadata/logging:

```typescript
// src/lib/ai/streaming.ts Lines 313-325
export async function getModelNames() {
  const config = await getProviderConfig()
  return {
    primary: {
      provider: config.primary.provider,
      model: config.primary.model,
    },
    fallback: {
      provider: config.fallback.provider,
      model: config.fallback.model,
    },
  }
}
```

### Usage in Chat Route

```typescript
// src/app/api/chat/route.ts Lines 308-314
const providerSettings = await getProviderSettings()
const modelNames = await getModelNames()
const samplingOptions = {
  temperature: providerSettings.temperature,
  ...(providerSettings.topP !== undefined ? { topP: providerSettings.topP } : {}),
  ...(providerSettings.maxTokens !== undefined ? { maxTokens: providerSettings.maxTokens } : {}),
}
```

---

## Dedicated OpenRouter Usage

### Image OCR - GPT-4o Vision

Image OCR menggunakan OpenRouter LANGSUNG (bukan sebagai fallback) karena GPT-4o Vision superior untuk OCR.

```typescript
// src/lib/file-extraction/image-ocr.ts Lines 57-63
import { createOpenRouter } from "@openrouter/ai-sdk-provider"

function createOpenRouterClient() {
  validateOpenRouterKey()
  return createOpenRouter({
    apiKey: process.env.OPENROUTER_API_KEY!,
  })
}
```

**Persamaan dan Perbedaan dengan Fallback:**

| Aspect | Fallback (Chat/Title/Refrasa) | Dedicated (Image OCR) |
|--------|------------------------------|----------------------|
| Package | `@openrouter/ai-sdk-provider` | `@openrouter/ai-sdk-provider` |
| Creation | `createOpenRouter().chat(model)` | `createOpenRouter().chat(model)` |
| Model | From DB config (dynamic) | `openai/gpt-4o` (hardcoded) |
| Purpose | Backup saat primary fail | Primary (no fallback) |

**Keduanya menggunakan official SDK yang sama** - tidak ada lagi perbedaan implementation antara fallback dan dedicated.

### Vision API Call

```typescript
// src/lib/file-extraction/image-ocr.ts Lines 133-151
const { text } = await generateText({
  model: openRouter(OCR_MODEL), // "openai/gpt-4o"
  messages: [
    {
      role: "user",
      content: [
        {
          type: "text",
          text: "Extract all text from this image...",
        },
        {
          type: "image",
          image: `data:${mimeType};base64,${base64Image}`,
        },
      ],
    },
  ],
  temperature: 0.3, // Low for consistent OCR
})
```

---

## Admin Validation

### Provider Test Endpoint

Admin dapat test provider connection sebelum save config:

```typescript
// POST /api/admin/validate-provider
{
  "provider": "openrouter",
  "model": "google/gemini-2.5-flash-lite",
  "apiKey": "sk-or-xxx"
}
```

### OpenRouter Validation

```typescript
// src/app/api/admin/validate-provider/route.ts Lines 96-105
// NOTE: This file still uses legacy pattern (createOpenAI with custom baseURL)
// Different from streaming.ts which uses createOpenRouter official SDK
const openRouterOpenAI = createOpenAI({
  apiKey: resolvedApiKey,
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
    "X-Title": "Makalah App - Config Validation",
  },
})

testModel = openRouterOpenAI(model)

const result = await generateText({
  model: testModel,
  prompt: "Say 'OK' if you can read this.",
  temperature: 0.3,
})
```

**⚠️ CATATAN PENTING:** Admin validation endpoint masih menggunakan pattern lama (`@ai-sdk/openai` dengan custom baseURL). Ini berbeda dengan `streaming.ts` yang sudah diupdate ke `@openrouter/ai-sdk-provider` official SDK. Untuk konsistensi, file ini sebaiknya diupdate juga di masa depan.

---

## Model Compatibility Verification

### Mengapa Perlu Verifikasi?

Tidak semua model di OpenRouter mendukung **tool calling** dengan baik. Makalah App menggunakan beberapa fitur yang memerlukan tool calling:

| Feature | AI SDK Function | Tool Complexity |
|---------|-----------------|-----------------|
| Chat Streaming | `streamText()` | None |
| Title Generation | `generateText()` | None |
| createArtifact Tool | `streamText({ tools })` | Simple (string, enum) |
| updateArtifact Tool | `streamText({ tools })` | Simple (string, enum) |
| Paper Tools | `streamText({ tools })` | Complex (nested arrays, enums, optionals) |
| Refrasa | `generateObject({ schema })` | Structured Output |

**Problem:** Jika fallback model tidak mendukung tool calling, fitur seperti createArtifact dan Paper Tools tidak akan berfungsi saat fallback aktif.

### Verification Endpoint

```typescript
// POST /api/admin/verify-model-compatibility
{
  "model": "google/gemini-2.5-flash-lite",
  "apiKey": "sk-or-xxx"
}
```

**Response:**
```json
{
  "success": true,
  "model": "google/gemini-2.5-flash-lite",
  "provider": "openrouter",
  "compatibility": {
    "full": true,
    "minimal": true,
    "level": "full"
  },
  "results": [
    { "test": "basic_generation", "passed": true, "duration": 1234 },
    { "test": "simple_tool_calling", "passed": true, "duration": 2345 },
    { "test": "complex_tool_calling", "passed": true, "duration": 3456 },
    { "test": "structured_output", "passed": true, "duration": 1234 }
  ],
  "supportedFeatures": {
    "chat": true,
    "simpleTool": true,
    "complexTool": true,
    "structuredOutput": true
  },
  "featureSupport": {
    "Chat Streaming": true,
    "Title Generation": true,
    "createArtifact Tool": true,
    "updateArtifact Tool": true,
    "renameConversationTitle Tool": true,
    "Paper Tools (complex)": true,
    "Refrasa (generateObject)": true
  },
  "recommendation": "Model fully compatible for fallback use",
  "totalDuration": 8269
}
```

### 4 Capability Tests

| Test | What It Tests | Mapped Features |
|------|---------------|-----------------|
| `basic_generation` | Basic `generateText()` | Chat, Title Generation |
| `simple_tool_calling` | Tool dengan simple schema (string, enum) | createArtifact, updateArtifact, renameConversationTitle |
| `complex_tool_calling` | Tool dengan nested arrays, enums, optionals | Paper Tools (startPaperSession, updateStageData) |
| `structured_output` | `generateObject()` dengan Zod schema | Refrasa |

### Compatibility Levels

| Level | Criteria | Recommendation |
|-------|----------|----------------|
| `full` | Semua 4 test passed | ✅ Fully recommended |
| `partial` | basic_generation + simple_tool_calling passed | ⚠️ Some features may not work |
| `incompatible` | basic_generation atau simple_tool_calling failed | ❌ NOT recommended |

### Test Schemas

```typescript
// Simple Tool Schema (line 19-22)
const SimpleToolSchema = z.object({
  title: z.string().min(1).max(100),
  type: z.enum(["note", "task", "reminder"]),
})

// Complex Tool Schema (line 24-31)
const ComplexToolSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    priority: z.enum(["low", "medium", "high"]),
    completed: z.boolean().optional(),
  })),
  summary: z.string(),
})

// Structured Output Schema (line 33-37)
const StructuredOutputSchema = z.object({
  analysis: z.string().min(10),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string()),
})
```

### Admin Panel Integration

Di Admin Panel → AI Providers → Edit Config, section Fallback Provider memiliki:

1. **Test** button - Validasi koneksi dasar
2. **Verify Tool Compatibility** button - Test komprehensif (muncul setelah Test berhasil)

```
┌────────────────────────────────────────────────────────────────────┐
│  Fallback Provider                                                  │
├────────────────────────────────────────────────────────────────────┤
│  Provider: [OpenRouter ▼]                                          │
│  Model:    [Google Gemini 2.5 Flash Lite ▼]                       │
│  API Key:  [sk-or-xxx...             ] [Test]                      │
│                                                                     │
│  [🛡️ Verify Tool Compatibility]                                   │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ ✓ Fully Compatible (2340ms)                                 │  │
│  │                                                              │  │
│  │ ✅ Chat Streaming        ✅ Paper Tools (complex)           │  │
│  │ ✅ Title Generation      ✅ Refrasa (generateObject)        │  │
│  │ ✅ createArtifact Tool                                      │  │
│  │ ✅ updateArtifact Tool                                      │  │
│  │ ✅ renameConversationTitle Tool                             │  │
│  │                                                              │  │
│  │ Model fully compatible for fallback use                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### OpenRouter Models dengan Tool Calling

Untuk mencari model yang support tool calling di OpenRouter:
- URL: `https://openrouter.ai/models?supported_parameters=tools`
- Key parameters: `tools`, `tool_choice`, `structured_outputs`

**Verified Compatible Models (as of 2026-01):**
- `google/gemini-2.5-flash-lite` ✅
- `google/gemini-2.5-flash` ✅
- `openai/gpt-4o` ✅
- `openai/gpt-4o-mini` ✅
- `anthropic/claude-sonnet-4` ✅
- `anthropic/claude-3.5-sonnet` ✅

**PENTING:** Selalu jalankan verification sebelum menggunakan model baru sebagai fallback.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key |
| `VERCEL_AI_GATEWAY_API_KEY` | Yes | Vercel AI Gateway key |
| `AI_GATEWAY_API_KEY` | Auto | Auto-mapped dari VERCEL_AI_GATEWAY_API_KEY |
| `APP_URL` | Optional | HTTP-Referer untuk OpenRouter (default: localhost:3000) |

### Environment Alias

```typescript
// src/lib/ai/streaming.ts Lines 7-9
if (!process.env.AI_GATEWAY_API_KEY && process.env.VERCEL_AI_GATEWAY_API_KEY) {
  process.env.AI_GATEWAY_API_KEY = process.env.VERCEL_AI_GATEWAY_API_KEY
}
```

---

## Constraints & Limitations

### Web Search Constraint

**PENTING**: `google_search` adalah provider-defined tool yang HANYA available di Vercel Gateway.

```
┌────────────────────┬─────────────────────┬─────────────────────┐
│     Feature        │   Primary (Gateway) │ Fallback (OpenRouter)│
├────────────────────┼─────────────────────┼─────────────────────┤
│ google_search      │        ✅           │         ❌          │
│ Inline Citations   │        ✅           │         ❌          │
│ Grounding Metadata │        ✅           │         ❌          │
│ Function Tools     │        ✅           │         ✅          │
│ createArtifact     │        ✅           │         ✅          │
│ Paper Tools        │        ✅           │         ✅          │
└────────────────────┴─────────────────────┴─────────────────────┘
```

### API Key Storage

- API keys disimpan sebagai **plain text** di database
- Convex database bersifat private (server-side only)
- Tidak ada encryption layer tambahan

### Single Fallback Level

- Jika primary dan fallback SAMA-SAMA gagal → Return 500
- Tidak ada retry logic sebelum fallback
- Title generation punya level ketiga (truncate message)

### Cache TTL

- TTL: 5 menit (fixed)
- Tidak configurable via database
- Perubahan config butuh up to 5 menit untuk berlaku

---

## Troubleshooting

### Fallback Tidak Aktif

1. **Cek environment variable**: `OPENROUTER_API_KEY` harus diset
2. **Cek database config**: `getActiveConfig` harus return config valid
3. **Cek API key di DB**: Fallback API key tidak boleh kosong

### Primary Selalu Gagal

1. **Cek Gateway API key**: `VERCEL_AI_GATEWAY_API_KEY`
2. **Cek model format**: Harus `provider/model` (e.g., `google/gemini-2.5-flash-lite`)
3. **Cek rate limit**: Gateway mungkin rate limited

### Cache Tidak Update

1. **Tunggu TTL expired**: Cache TTL 5 menit
2. **Manual invalidate**: Call `configCache.invalidate()`
3. **Restart server**: Force fresh cache

### AIProviderConfigError

Jika muncul error ini:
```
No active AI provider configuration found.
Please activate a configuration in Admin Panel → AI Providers.
```

**Solution:**
1. Go to Admin Panel → AI Providers
2. Create or activate a configuration
3. Cache akan refresh dalam 5 menit (atau restart server)

### Console Logging

Key log points untuk debugging:

```javascript
// Streaming failures
"[Streaming] Primary provider failed, using fallback:", error

// Chat API fallback
"Gateway stream failed, trying fallback:", error

// Title generation
"Title generation failed, trying fallback...", error
"All title generation attempts failed", error

// Refrasa
"[Refrasa API] Primary provider failed:", error
"[Refrasa API] Fallback provider also failed:", error

// Config cache
"[ConfigCache] Error fetching config:", error
```

### Test Provider Connection

```bash
# Via API (admin only)
curl -X POST /api/admin/validate-provider \
  -H "Content-Type: application/json" \
  -d '{"provider":"openrouter","model":"google/gemini-2.5-flash-lite","apiKey":"sk-or-xxx"}'
```

---

## Related Documentation

- **CLAUDE.md**: Section "Multi-provider AI Strategy"
- **Files Index**: `.references/fallback-llm-provider/files-index.md`
- **LLM Models Provider**: `.references/llm-models-provider/`
- **Image OCR**: `.references/image-ocr/`
- **System Prompt Fallback**: `.references/system-prompt/fallback-alert.md`

---

*Last updated: 2026-01-14*
