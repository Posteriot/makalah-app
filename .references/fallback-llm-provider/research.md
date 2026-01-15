# Fallback LLM Provider - Research & Implementation Recommendation

Dokumen riset tentang web search capabilities di fallback provider dan rekomendasi implementasi untuk flexible multi-provider architecture.

---

## Daftar Isi

1. [Executive Summary](#executive-summary)
2. [Current State Analysis](#current-state-analysis)
3. [Research Findings](#research-findings)
4. [Implementation Recommendation](#implementation-recommendation)
5. [Technical Specification](#technical-specification)
6. [Migration Path](#migration-path)
7. [Cost Analysis](#cost-analysis)
8. [Risk Assessment](#risk-assessment)

---

## Executive Summary

### Problem Statement

Fallback provider (OpenRouter) saat ini **TIDAK memiliki web search capability**, sementara primary provider (Vercel AI Gateway) memiliki `google_search`. Ini menyebabkan:
- Degraded user experience saat fallback aktif
- Inkonsistensi fitur antara primary dan fallback
- Ketergantungan penuh pada Gateway untuk web search

### Key Discovery

**OpenRouter SUDAH memiliki web search** via `:online` suffix yang:
- Works dengan ANY model
- Menggunakan native search (OpenAI/Anthropic) atau Exa.ai
- Standardized annotation format
- Bisa di-enable tanpa major architecture change

### Recommended Solution

**Hybrid Approach dengan Citation Normalization Layer**

```
┌─────────────────────────────────────────────────────────────┐
│                    RECOMMENDED ARCHITECTURE                  │
│                                                             │
│  NOTE: Model dikonfigurasi via Admin Panel (DB config)      │
│  Contoh konfigurasi production saat ini:                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  PRIMARY PATH (unchanged)                                   │
│  ├── Provider: Vercel AI Gateway                           │
│  ├── Model: google/gemini-2.5-flash (from Admin Panel)     │
│  ├── Web Search: google_search (provider-defined)          │
│  └── Citations: Google grounding metadata                  │
│                                                             │
│  FALLBACK PATH (enhanced)                                   │
│  ├── Provider: OpenRouter                                   │
│  ├── Model: openai/gpt-4o (from Admin Panel)               │
│  ├── Web Search: via :online suffix                        │
│  └── Citations: OpenAI-style annotations                   │
│                                                             │
│  NORMALIZATION LAYER (new)                                  │
│  └── Converts all citation formats to unified schema       │
│                                                             │
│  IMPORTANT: Database = SINGLE SOURCE OF TRUTH               │
│  No hardcoded fallback - explicit error if no config        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Current State Analysis

### Architecture Overview

```
Current Implementation:

┌──────────────┐     ┌──────────────┐
│   PRIMARY    │     │   FALLBACK   │
│   Gateway    │────▶│  OpenRouter  │
└──────┬───────┘     └──────┬───────┘
       │                    │
       ▼                    ▼
┌──────────────┐     ┌──────────────┐
│ google_search│     │  NO SEARCH   │  ← Problem!
│ + grounding  │     │  Function    │
│   metadata   │     │  tools only  │
└──────────────┘     └──────────────┘
```

### Current Limitations

| Aspect | Primary (Gateway) | Fallback (OpenRouter) |
|--------|-------------------|----------------------|
| Web Search | ✅ `google_search` | ❌ None |
| Function Tools | ✅ Available | ✅ Available |
| Mix Tools | ❌ Cannot mix | ✅ Can mix |
| Citations | ✅ Grounding metadata | ❌ None |
| Model Flexibility | Limited | High |

### Root Cause: Gemini API Constraint

```
google_search adalah provider-defined tool yang:
- Didefinisikan di field BERBEDA dari FunctionDeclaration
- TIDAK BISA di-mix dengan function tools
- Ini adalah GEMINI API LIMITATION, bukan AI SDK limitation
```

Source: [GitHub Issue #8258](https://github.com/vercel/ai/issues/8258)

---

## Research Findings

### 1. Web Search Capabilities by Provider

| Provider | Tool | Type | Pricing | Can Mix? |
|----------|------|------|---------|----------|
| **Google Gemini** | `google_search` | Provider-defined | Included | ❌ |
| **Anthropic Claude** | `web_search_20250305` | Provider-defined | $10/1000 | ✅ (perlu verify) |
| **OpenAI** | `webSearchPreview()` | Responses API | Context-based | ✅ |
| **OpenRouter** | `:online` suffix | Plugin | $4/1000 (Exa) | ✅ |
| **Tavily** | Function tool | External API | ~$8/1000 | ✅ |
| **Exa** | Function tool | External API | $5/1000 | ✅ |

### 2. OpenRouter Web Search Detail

**Enable Methods:**
```typescript
// Method 1: Model suffix
"google/gemini-2.5-flash-lite:online"

// Method 2: Plugin config
{
  "plugins": [{
    "id": "web",
    "engine": "exa|native",
    "max_results": 5
  }]
}
```

**Engine Selection:**
- `native`: Uses provider's built-in search (OpenAI, Anthropic, xAI, Perplexity)
- `exa`: Uses Exa.ai semantic search (default for models without native)
- `undefined`: Auto-select best available

**Response Format (Standardized):**
```json
{
  "choices": [{
    "message": {
      "content": "...",
      "annotations": [{
        "type": "url_citation",
        "url": "https://example.com/article",
        "title": "Article Title",
        "start_index": 0,
        "end_index": 150
      }]
    }
  }]
}
```

### 3. Citation Format Comparison

**Google Grounding (Current Primary):**
```json
{
  "groundingMetadata": {
    "groundingChunks": [{
      "web": { "uri": "...", "title": "..." }
    }],
    "groundingSupports": [{
      "segment": { "endIndex": 150 },
      "groundingChunkIndices": [0]
    }]
  }
}
```

**OpenRouter/OpenAI Annotations:**
```json
{
  "annotations": [{
    "type": "url_citation",
    "url": "...",
    "title": "...",
    "start_index": 0,
    "end_index": 150
  }]
}
```

**Anthropic Citations:**
```json
{
  "citations": [{
    "type": "web_search_result_location",
    "url": "...",
    "title": "...",
    "cited_text": "..."
  }]
}
```

### 4. Model Flexibility Analysis

Dengan OpenRouter `:online`, model switching TIDAK memerlukan code change:

```typescript
// Semua ini work identically
"google/gemini-2.5-flash-lite:online"
"openai/gpt-4o:online"
"anthropic/claude-3.5-sonnet:online"
"meta-llama/llama-3.1-70b-instruct:online"
"mistralai/mistral-large:online"
```

---

## Implementation Recommendation

### Recommended Approach: Hybrid with Normalization

**Rationale:**
1. **Minimal Risk**: Tidak mengubah primary path yang sudah proven
2. **High Value**: Web search di fallback = better UX saat degraded
3. **Future-Proof**: Normalization layer supports any future provider
4. **Pragmatic**: Implementable dalam ~1 week

### Architecture Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENHANCED FALLBACK ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────────────┐
                              │   API Request    │
                              │  (with router    │
                              │   decision)      │
                              └────────┬─────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │                           │
                         ▼                           ▼
              ┌─────────────────────┐     ┌─────────────────────┐
              │      PRIMARY        │     │      FALLBACK       │
              │   Vercel Gateway    │     │     OpenRouter      │
              └──────────┬──────────┘     └──────────┬──────────┘
                         │                           │
                         │                           │
           ┌─────────────┴─────────────┐   ┌────────┴────────┐
           │                           │   │                 │
           ▼                           ▼   ▼                 ▼
    ┌─────────────┐            ┌─────────────┐        ┌─────────────┐
    │ Web Search  │            │   Normal    │        │ Web Search  │
    │    Mode     │            │    Mode     │        │    Mode     │
    │             │            │             │        │             │
    │google_search│            │  Function   │        │  :online    │
    │             │            │   Tools     │        │   suffix    │
    └──────┬──────┘            └──────┬──────┘        └──────┬──────┘
           │                          │                      │
           ▼                          │                      ▼
    ┌─────────────┐                   │               ┌─────────────┐
    │  Grounding  │                   │               │ OpenRouter  │
    │  Metadata   │                   │               │ Annotations │
    └──────┬──────┘                   │               └──────┬──────┘
           │                          │                      │
           └──────────────┬───────────┴──────────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  NORMALIZATION  │
                 │     LAYER       │
                 │                 │
                 │ Unified Schema: │
                 │ { url, title,   │
                 │   startIndex,   │
                 │   endIndex,     │
                 │   citedText }   │
                 └────────┬────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │    Frontend     │
                 │  Consistent UI  │
                 └─────────────────┘
```

### Key Components

#### 1. Web Search Mode Detection (Existing)

```typescript
// Existing router decision - no change needed
const { enableWebSearch } = await decideWebSearchMode({
  model,
  recentMessages,
  isPaperMode
})
```

#### 2. Enhanced Model Selection

```typescript
// streaming.ts - new enhancement
export async function getOpenRouterModel(options?: {
  enableWebSearch?: boolean
}) {
  const config = await getProviderConfig()
  const baseModel = config.fallback.model

  // Append :online suffix if web search enabled
  const modelId = options?.enableWebSearch
    ? `${baseModel}:online`
    : baseModel

  return createProviderModel(
    config.fallback.provider,
    modelId,
    config.fallback.apiKey
  )
}
```

#### 3. Citation Normalization Layer

```typescript
// New file: src/lib/citations/normalizer.ts

export interface NormalizedCitation {
  url: string
  title: string
  startIndex?: number
  endIndex?: number
  citedText?: string
  publishedAt?: number
}

export function normalizeCitations(
  providerMetadata: unknown,
  provider: 'gateway' | 'openrouter' | 'anthropic' | 'openai'
): NormalizedCitation[] {
  switch (provider) {
    case 'gateway':
      return normalizeGoogleGrounding(providerMetadata)
    case 'openrouter':
    case 'openai':
      return normalizeOpenAIAnnotations(providerMetadata)
    case 'anthropic':
      return normalizeAnthropicCitations(providerMetadata)
    default:
      return []
  }
}

function normalizeGoogleGrounding(metadata: unknown): NormalizedCitation[] {
  const gm = metadata as GoogleGroundingMetadata
  if (!gm?.groundingChunks) return []

  return gm.groundingChunks.map((chunk, index) => ({
    url: chunk.web?.uri ?? '',
    title: chunk.web?.title ?? '',
    // Map endIndex from groundingSupports if available
    endIndex: findEndIndexForChunk(gm.groundingSupports, index),
  }))
}

function normalizeOpenAIAnnotations(response: unknown): NormalizedCitation[] {
  const annotations = extractAnnotations(response)
  return annotations
    .filter(a => a.type === 'url_citation')
    .map(a => ({
      url: a.url,
      title: a.title ?? '',
      startIndex: a.start_index,
      endIndex: a.end_index,
    }))
}
```

#### 4. Enhanced Fallback Handler

```typescript
// chat/route.ts - fallback section (lines ~1176-1200)
catch (error) {
  console.error("Gateway stream failed, trying fallback:", error)

  // Get fallback model WITH web search if enabled
  const fallbackModel = await getOpenRouterModel({
    enableWebSearch
  })

  if (enableWebSearch) {
    // Use createUIMessageStream for web search mode (like primary)
    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        // Send initial search status
        writer.write({
          type: "data-search",
          id: generateId(),
          data: { status: "searching" }
        })

        const result = streamText({
          model: fallbackModel,
          messages: fullMessagesBase,
          tools,  // Can now include function tools too!
          ...samplingOptions,
        })

        let hasSearchResults = false

        for await (const chunk of result.toUIMessageStream()) {
          writer.write(chunk)

          // Detect search results in OpenRouter response
          if (chunk.type === 'finish') {
            const annotations = extractOpenRouterAnnotations(chunk)
            if (annotations.length > 0) {
              hasSearchResults = true

              // Normalize citations
              const normalizedCitations = normalizeCitations(
                annotations,
                'openrouter'
              )

              // Insert inline citations into text
              const textWithCitations = insertInlineCitations(
                chunk.text,
                normalizedCitations
              )

              // Send normalized data
              writer.write({
                type: "data-cited-text",
                id: generateId(),
                data: { text: textWithCitations }
              })

              writer.write({
                type: "data-cited-sources",
                id: generateId(),
                data: { sources: normalizedCitations }
              })
            }
          }
        }

        // Close search status
        writer.write({
          type: "data-search",
          id: searchStatusId,
          data: { status: hasSearchResults ? "done" : "off" }
        })

        // Save message with sources
        await saveAssistantMessage(textWithCitations, normalizedCitations)
      }
    })

    return createUIMessageStreamResponse({ stream })
  }

  // Normal mode fallback (unchanged)
  const result = streamText({
    model: fallbackModel,
    messages: fullMessagesBase,
    tools,
    ...samplingOptions,
  })

  return result.toUIMessageStreamResponse()
}
```

---

## Technical Specification

### 1. File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/lib/ai/streaming.ts` | Modify | Add `enableWebSearch` option to `getOpenRouterModel()` |
| `src/lib/citations/normalizer.ts` | **New** | Citation normalization functions |
| `src/app/api/chat/route.ts` | Modify | Enhanced fallback with web search |
| `src/components/chat/MessageBubble.tsx` | Minor | Handle normalized citations (mostly compatible) |
| `convex/aiProviderConfigs.ts` | Optional | Add `webSearchEnabled` per provider |

### 2. New Dependencies

```json
{
  // No new dependencies required!
  // OpenRouter web search works via existing @ai-sdk/openai
}
```

### 3. Environment Variables

```bash
# Existing (no change)
OPENROUTER_API_KEY=sk-or-xxx

# Optional new (for fine-tuning)
OPENROUTER_WEB_SEARCH_MAX_RESULTS=5  # default: 5
```

### 4. Database Schema Addition (Optional)

```typescript
// convex/schema.ts - aiProviderConfigs table enhancement
{
  // ... existing fields ...

  // New optional fields for flexibility
  primaryWebSearchEnabled: v.optional(v.boolean()),   // default: true
  fallbackWebSearchEnabled: v.optional(v.boolean()),  // default: true
  fallbackWebSearchEngine: v.optional(v.string()),    // "native" | "exa" | "auto"
  fallbackWebSearchMaxResults: v.optional(v.number()),// default: 5
}
```

### 5. API Contract

**Request (unchanged):**
```typescript
POST /api/chat
{
  messages: UIMessage[],
  conversationId?: string,
  // ... existing fields
}
```

**Response (enhanced - same format, normalized content):**
```typescript
// Stream parts (same as current)
data-search: { status: "searching" | "done" | "off" | "error" }
data-cited-text: { text: string }  // Text with [1], [2] markers
data-cited-sources: { sources: NormalizedCitation[] }
```

---

## Migration Path

### Phase 1: Foundation (2-3 days)

**Tasks:**
1. Create `src/lib/citations/normalizer.ts`
2. Add normalization for Google grounding format
3. Add normalization for OpenRouter annotations format
4. Unit tests for normalizers

**Deliverable:** Citation normalization layer

**Files:**
```
src/lib/citations/
├── normalizer.ts          # New: normalization functions
├── normalizer.test.ts     # New: unit tests
└── types.ts               # New: NormalizedCitation interface
```

### Phase 2: Fallback Enhancement (2-3 days)

**Tasks:**
1. Modify `getOpenRouterModel()` to accept web search option
2. Update fallback handler in `chat/route.ts`
3. Integrate normalization layer
4. Test fallback web search flow

**Deliverable:** Web search in fallback path

**Key Code Changes:**
```typescript
// streaming.ts
export async function getOpenRouterModel(options?: {
  enableWebSearch?: boolean
}): Promise<LanguageModel>

// chat/route.ts catch block
const fallbackModel = await getOpenRouterModel({ enableWebSearch })
```

### Phase 3: UI Consistency (1-2 days)

**Tasks:**
1. Verify `MessageBubble.tsx` works with normalized citations
2. Ensure `InlineCitationChip` works with both formats
3. Test end-to-end flow for both primary and fallback
4. Visual QA

**Deliverable:** Consistent UI for both paths

### Phase 4: Admin Configuration (Optional, 2-3 days)

**Tasks:**
1. Add web search config fields to schema
2. Update admin panel UI
3. Implement config-based web search toggle
4. Migration script if needed

**Deliverable:** Configurable web search per provider

### Timeline

```
Week 1:
├── Day 1-2: Phase 1 (Normalization Layer)
├── Day 3-4: Phase 2 (Fallback Enhancement)
└── Day 5: Phase 3 (UI Consistency)

Week 2 (Optional):
└── Day 1-3: Phase 4 (Admin Configuration)

Total: 5-8 days depending on scope
```

---

## Cost Analysis

### Current Cost Structure

| Provider | Model | Web Search | Cost |
|----------|-------|------------|------|
| Gateway | gemini-2.5-flash-lite | google_search | Included in Gateway pricing |
| OpenRouter | gemini-2.5-flash-lite | None | Model tokens only |

### Projected Cost with Web Search Fallback

| Scenario | Provider | Web Search Cost | Model Cost |
|----------|----------|-----------------|------------|
| Primary (unchanged) | Gateway | Included | ~$0.075/1M input |
| Fallback with search | OpenRouter | $4/1000 results | ~$0.075/1M input |

### Cost Estimation Example

Assuming:
- 100,000 monthly requests
- 10% fallback rate (90% primary success)
- 30% of fallback requests need web search
- 5 results per search (default)

```
Monthly breakdown:
├── Primary: 90,000 requests (no change in cost)
├── Fallback: 10,000 requests
│   ├── With web search: 3,000 × $0.02 = $60/month
│   └── Without web search: 7,000 (model cost only)

Additional cost: ~$60/month at 100K requests
Per-request overhead: $0.0006 average
```

### Cost Optimization Options

1. **Reduce `max_results`**: 3 instead of 5 → 40% savings
2. **Smarter router**: Only enable search when truly needed
3. **Cache search results**: Reduce duplicate searches (advanced)

---

## Risk Assessment

### Risk Matrix

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Different search quality | Medium | Low | Exa is reputable; test thoroughly |
| Citation format mismatch | Low | Medium | Normalization layer handles this |
| Increased latency | Low | Low | OpenRouter is fast; Exa ~1.2s avg |
| Cost overrun | Low | Medium | Set max_results limit; monitor usage |
| API changes | Low | Medium | Abstract behind normalization layer |

### Rollback Plan

```
If issues arise:
1. Disable fallback web search via config flag
2. Fallback reverts to current behavior (no search)
3. No data migration needed - just config change
4. Zero downtime rollback
```

### Monitoring Recommendations

```typescript
// Add logging for analysis
console.log("[Fallback] Web search used:", {
  model: modelId,
  searchEnabled: enableWebSearch,
  resultsCount: citations.length,
  latencyMs: endTime - startTime,
  provider: 'openrouter',
  engine: 'exa'  // or 'native' if configured
})
```

---

## Alternative Approaches Considered

### Option A: Full OpenRouter Migration

**Description:** Replace Gateway entirely with OpenRouter

**Pros:**
- Unified interface
- Consistent web search across all modes
- More model flexibility

**Cons:**
- Major architecture change
- Lose Gateway-specific optimizations
- Higher risk

**Verdict:** Too risky for current stage; consider for v2

### Option B: External Search API (Tavily/Exa Direct)

**Description:** Implement search as function tool

**Pros:**
- 100% provider-agnostic
- Can mix with function tools (solves Gemini constraint!)
- Full control

**Cons:**
- Manual citation insertion
- Different UX from native search
- Additional API dependency

**Verdict:** Good for future enhancement, not primary solution

### Option C: No Fallback Web Search

**Description:** Accept degraded UX in fallback

**Pros:**
- Zero effort
- No additional cost

**Cons:**
- Poor user experience
- Inconsistent behavior

**Verdict:** Not acceptable for production quality

---

## Conclusion

### Recommendation Summary

1. **Implement Hybrid Approach** dengan OpenRouter `:online` untuk fallback
2. **Build Citation Normalization Layer** untuk consistent UX
3. **Keep Primary Path Unchanged** untuk minimize risk
4. **Add Admin Configuration** untuk flexibility (optional)

### Expected Outcomes

- ✅ Web search available di fallback mode
- ✅ Consistent citation UI across providers
- ✅ Flexible model switching support
- ✅ Minimal disruption to current users
- ✅ Foundation for future multi-provider enhancements
- ✅ Can mix function tools WITH web search di fallback (bonus!)

### Next Steps

1. Review dan approve rekomendasi ini
2. Create implementation tasks di spec folder
3. Start Phase 1 (Citation Normalization)
4. Iterative testing dan refinement

---

## References

- [OpenRouter Web Search Documentation](https://openrouter.ai/docs/guides/features/plugins/web-search)
- [Anthropic Web Search API](https://www.anthropic.com/news/web-search-api)
- [Claude Web Search Tool Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool)
- [AI SDK OpenAI Responses Guide](https://ai-sdk.dev/cookbook/guides/openai-responses)
- [GitHub Issue: Gemini Built-in Tools Limitation](https://github.com/vercel/ai/issues/8258)
- [Exa.ai Documentation](https://docs.exa.ai/)
- [Tavily API Documentation](https://docs.tavily.com/)

---

*Last updated: 2026-01-12*
