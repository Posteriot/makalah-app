# Web Search Orchestrator Design

> Design doc untuk refactor web search dari duplicated inline code di route.ts ke pluggable orchestrator + retriever architecture.

## Problem

Route.ts (~3400 lines) berisi ~1200 lines duplicated logic antara Perplexity path dan Grok path. Setiap retriever punya Phase 1 (search) + Phase 2 (compose) + streaming infrastructure yang hampir identik. Menambah retriever baru berarti copy-paste ~600 lines lagi.

## Solution: Strategy Pattern — Pluggable Retrievers

Pisah jadi dua layer:
- **Orchestrator** — generic two-pass flow + streaming. Nggak tau retriever mana yang dipake.
- **Retriever** — per-provider logic. Implement interface standar.

### Architecture Overview

```
route.ts (dispatcher)
  └── executeWebSearch({ retrieverChain, config }) → Response

web-search/
  ├── orchestrator.ts        Generic two-pass flow + streaming
  ├── retriever-registry.ts  Map name → retriever instance
  ├── config-builder.ts      DB config → RetrieverConfig
  ├── search-execution-mode.ts  Priority-based mode resolution
  ├── types.ts               Interfaces
  └── retrievers/
        ├── perplexity.ts
        ├── grok.ts
        ├── openai-search.ts
        └── google-grounding.ts
```

## SearchRetriever Interface

```typescript
interface RetrieverConfig {
  apiKey: string
  modelId: string
  providerOptions?: Record<string, unknown>
}

interface SearchResult {
  text: string
  sources: NormalizedCitation[]
  usage?: { inputTokens: number; outputTokens: number }
}

interface SearchRetriever {
  name: string

  /**
   * Build streamText config for Phase 1 search.
   * Returns model + optional tools (Google Grounding needs google_search tool).
   * Most retrievers only return { model }. Google Grounding returns { model, tools }.
   */
  buildStreamConfig(config: RetrieverConfig): {
    model: LanguageModel
    tools?: Record<string, unknown>
  }

  /**
   * Extract sources from streamText result.
   * Async because some providers need await with timeout:
   * - Perplexity: result.sources (4s timeout)
   * - Grok: result.providerMetadata annotations (8s timeout)
   * - OpenAI Search: result.providerMetadata annotations (6s timeout)
   * - Google Grounding: result.sources + result.providerMetadata (6s timeout)
   */
  extractSources(result: StreamTextResult): Promise<NormalizedCitation[]>
}
```

Design decisions:
- `buildStreamConfig` (not `createModel`) — returns `{ model, tools? }` because Google Grounding requires `google.tools.googleSearch({})` as a provider-defined tool passed to `streamText()`. Other retrievers return `{ model }` only.
- `extractSources` is async — some providers need `await result.sources` or `await result.providerMetadata` with timeout
- Config is separate from retriever — retriever doesn't read database, orchestrator provides config

## Retriever Implementations

### Perplexity (existing, refactored)

- Model: `perplexity/sonar` via OpenRouter
- Native search — no special config needed
- Sources: `result.sources` array (4s timeout)
- Normalizer: `normalizeCitations(raw, 'perplexity')` — already exists

### Grok (existing, refactored)

- Model: `x-ai/grok-3-mini` via OpenRouter
- Requires `web_search_options` in model init
- Sources: `result.providerMetadata` annotations (8s timeout)
- Normalizer: `normalizeCitations(metadata, 'openrouter')` — already exists
- Post-filter: `isVertexProxyUrl()` — filters Vertex AI Search proxy URLs (Grok-specific, lives in this retriever's `extractSources`)

### OpenAI Search (new)

- Model: `openai/gpt-4o-mini-search-preview` via OpenRouter
- Native search model — no special config needed
- Sources: `result.providerMetadata` annotations (`url_citation` format, 6s timeout)
- Normalizer: `normalizeCitations(metadata, 'openrouter')` — already exists, same format as Grok
- Coverage: Bing search backend
- Pricing: $0.15/M input, $0.60/M output, $27.50/1K searches

Why gpt-4o-mini over gpt-4o: In two-pass architecture, the search model is only a retriever (Phase 1). Gemini does the reasoning in Phase 2. Mini is ~16x cheaper with equivalent retrieval quality.

### Google Grounding (new)

- Model: `gemini-2.5-flash` via Google AI Studio API (NOT OpenRouter)
- Uses `google.tools.googleSearch({})` provider-defined tool (AI SDK v5/v6 API)
- Sources: `result.sources` array + `result.providerMetadata?.google?.groundingMetadata` (6s timeout)
- Normalizer: `normalizeCitations(metadata, 'gateway')` — already exists in codebase
- Coverage: Google Search backend
- API key: `GOOGLE_GENERATIVE_AI_API_KEY` (defined in .env.example as template, set in .env.local for local dev and Vercel Environment Variables for production, already installed: `@ai-sdk/google@^3.0.34`)

**IMPORTANT — AI SDK v5/v6 API (NOT v4):**
```typescript
// WRONG (v4, deprecated): google('gemini-2.5-flash', { useSearchGrounding: true })
// CORRECT (v5/v6):
import { google } from '@ai-sdk/google'
streamText({
  model: google('gemini-2.5-flash'),
  tools: { google_search: google.tools.googleSearch({}) },
})
// Sources: result.sources + providerMetadata?.google?.groundingMetadata
```

Why not via OpenRouter: OpenRouter doesn't have native Google Search integration. Using `:online` suffix falls back to Exa search, not Google Search. True Google Grounding (with groundingChunks metadata) requires direct Google AI Studio API.

Why Google AI Studio, not Google Custom Search API: Custom Search API returns raw results (snippets), not synthesized text. Doesn't fit the SearchRetriever interface which expects `streamText()` → `result.text`. Gemini with grounding returns both text and structured citations naturally.

## Orchestrator

### Responsibilities

```
Input:  retrieverChain + messages + compose config + callbacks
Output: UIMessageStream Response (streamed to user)

Flow:
  1. Emit "searching" status
  2. Phase 1: Search (silent) — iterate retrieverChain until one succeeds
     a. sanitizeMessagesForSearch(messages) — strip tool-call parts from assistant messages
     b. augmentUserMessageForSearch(messages) — add diversity hints
     c. { model, tools } = retriever.buildStreamConfig(config)
     d. streamText({ model, tools, messages }) → await text (not streamed)
     e. retriever.extractSources(result) → NormalizedCitation[]
     f. canonicalizeCitationUrls(citations) — strip UTM params, hash (post-normalization)
  3. Phase 2: Compose (streamed)
     - buildSearchResultsContext(sources, searchText)
     - composeSkillInstructions(skillContext) → SKILL.md injection
     - streamText({ model: composeModel, messages }) → stream to user
  4. Stream citations (data-cited-text, data-cited-sources)
  5. onFinish callback → persist + billing + telemetry

Error handling:
  - Phase 1 all-retriever failure → createSearchUnavailableResponse() → error stream + telemetry
  - Phase 2 compose failure → orchestrator throws → route.ts catches → retry with fallback compose model
```

### Shared Utilities (moved from route.ts to orchestrator)

These functions currently live in route.ts and apply to ALL retrievers. They move into the orchestrator:

- **`sanitizeMessagesForSearch()`** — strips tool-call parts from assistant messages before passing to search models. Without this, search models receive tool-call JSON they can't process.
- **`augmentUserMessageForSearch()`** — appends diversity hints to user message. Already in `search-system-prompt.ts`, called by orchestrator.
- **`canonicalizeCitationUrls()`** — strips UTM params and hash from citation URLs. Applied post-normalization to ALL citations regardless of retriever.
- **`isVertexProxyUrl()`** — filters Vertex AI proxy URLs. Grok-specific, moves into Grok retriever's `extractSources()`.
- **`createSearchUnavailableResponse()`** — builds error response + telemetry when search is entirely unavailable. Moves into orchestrator as the all-retrievers-failed handler.

### Interface

```typescript
interface WebSearchOrchestratorConfig {
  retrieverChain: Array<{
    retriever: SearchRetriever
    retrieverConfig: RetrieverConfig
  }>

  messages: ModelMessage[]
  composeMessages: ModelMessage[]
  composeModel: LanguageModel

  systemPrompt: string
  paperModePrompt?: string
  paperWorkflowReminder?: string
  skillContext: SkillContext
  fileContext?: string

  samplingOptions: { temperature?: number; topP?: number }

  reasoningTraceEnabled: boolean
  isTransparentReasoning: boolean
  reasoningProviderOptions?: Record<string, unknown>
  traceMode: string

  onFinish: (result: {
    text: string
    sources: NormalizedCitation[]
    usage?: { inputTokens: number; outputTokens: number }
    searchUsage?: { inputTokens: number; outputTokens: number }
    retrieverName: string
    retrieverIndex: number
    attemptedRetrievers: string[]
  }) => Promise<void>
}

function executeWebSearch(config: WebSearchOrchestratorConfig): Response
```

### What stays in route.ts

Route.ts remains the dispatcher — auth, billing preflight, mode detection, and the `onFinish` callback (persist message, record billing, log telemetry). These need access to route-scoped variables (convexToken, billingContext, userId) that shouldn't leak into the orchestrator.

```typescript
// route.ts — web search section (~30-40 lines)
if (enableWebSearch) {
  const chain = buildRetrieverChain(webSearchConfig, openrouterApiKey, googleApiKey)
  return executeWebSearch({
    retrieverChain: chain,
    messages: sanitizedMessages,
    composeMessages: trimmedModelMessages,
    composeModel: await getGatewayModel(),
    systemPrompt,
    paperModePrompt,
    paperWorkflowReminder,
    skillContext: buildSkillContext({ ... }),
    fileContext,
    samplingOptions,
    reasoningTraceEnabled,
    isTransparentReasoning,
    reasoningProviderOptions,
    traceMode: getTraceModeLabel(!!paperModePrompt, true),
    onFinish: async (result) => {
      await saveAssistantMessage(result.text, result.sources, ...)
      await recordUsageAfterOperation({ ... })
      await maybeUpdateTitleFromAI({ ... })
      logAiTelemetry({ retriever: result.retrieverName, ... })
    },
  })
}
```

## Failover Chain

### Strategy

Priority-ordered failover. Orchestrator iterates the chain until one retriever succeeds.

```
Retriever #1 (priority 1) → execute
  ├─ Success → Phase 2 compose → done
  └─ Fail → log → try next

Retriever #2 (priority 2) → execute
  ├─ Success → Phase 2 compose → done
  └─ Fail → log → try next

...

All failed → emit error → "Maaf, terjadi kesalahan saat mencari sumber."
```

### Compose model failover

The orchestrator only handles **retriever failover** (Phase 1). If Phase 2 compose fails, the orchestrator **throws** — route.ts catches the error and retries with a fallback compose model (e.g., Gateway Gemini fails → OpenRouter fallback). This matches the existing primary→fallback pattern in route.ts.

### UX during failover

User sees "Mencari sumber..." throughout the entire retriever failover process. No flicker or status change. From user's perspective, search is just slightly slower when failover occurs.

### Telemetry

`onFinish` receives `retrieverName`, `retrieverIndex`, and `attemptedRetrievers` for debugging:
- `retrieverIndex: 0` → primary succeeded
- `retrieverIndex: 1` → primary failed, fallback #1 succeeded
- `attemptedRetrievers: ["perplexity", "grok"]` → full attempt history

## Search Execution Mode Resolution

```typescript
type SearchExecutionMode =
  | "perplexity"
  | "grok"
  | "openai-search"
  | "google-grounding"
  | "blocked_unavailable"
  | "off"

function resolveSearchExecutionMode(input: {
  searchRequired: boolean
  retrievers: Array<{
    name: SearchExecutionMode
    enabled: boolean
    modelId: string | undefined
  }>
}): SearchExecutionMode {
  if (!input.searchRequired) return "off"
  for (const r of input.retrievers) {
    if (r.enabled && r.modelId) return r.name
  }
  return "blocked_unavailable"
}
```

Priority determined by array order — admin controls priority via config.

## Database Schema Changes

### New field in aiProviderConfigs

```typescript
// convex/schema.ts — aiProviderConfigs table
webSearchRetrievers: v.optional(v.array(v.object({
  name: v.string(),           // "perplexity" | "grok" | "openai-search" | "google-grounding"
  enabled: v.boolean(),
  modelId: v.string(),
  priority: v.number(),       // 1 = highest (tried first)
  providerOptions: v.optional(v.object({
    maxResults: v.optional(v.number()),
    engine: v.optional(v.string()),
  })),
}))),
```

### Backward compatibility

When `webSearchRetrievers` is undefined, `resolveRetrievers()` converts legacy fields (`primaryWebSearchEnabled`, `webSearchModel`, `fallbackWebSearchEnabled`, `webSearchFallbackModel`) to the new array format. No migration needed on day one.

## Admin Panel UI

Web Search Retrievers section — sortable list with drag-to-reorder priority:

```
┌─ Web Search Retrievers ──────────────────────────────┐
│                                                        │
│  Priority  Name              Model ID         Enabled  │
│  ────────  ────              ────────         ───────  │
│  1 ↕       Perplexity        perplexity/sonar       ✓ │
│  2 ↕       OpenAI Search     openai/gpt-4o-mini-    ✓ │
│                               search-preview           │
│  3 ↕       Grok              x-ai/grok-3-mini       ✓ │
│  4 ↕       Google Grounding  gemini-2.5-flash        ✓ │
│                                                        │
│  ↕ = drag to reorder priority                          │
│  [+ Add Retriever]                                     │
└────────────────────────────────────────────────────────┘
```

## File Structure

### New files

```
src/lib/ai/web-search/
├── types.ts                    ~50 lines
├── orchestrator.ts             ~400 lines
├── retriever-registry.ts       ~30 lines
├── config-builder.ts           ~50 lines
├── search-execution-mode.ts    ~20 lines
├── utils.ts                    ~60 lines  (sanitizeMessages, canonicalizeUrls, searchUnavailableResponse)
└── retrievers/
      ├── perplexity.ts         ~50 lines
      ├── grok.ts               ~70 lines  (includes isVertexProxyUrl)
      ├── openai-search.ts      ~50 lines
      └── google-grounding.ts   ~70 lines  (includes google.tools.googleSearch setup)
```

### Modified files

```
src/app/api/chat/route.ts
  REMOVE: ~1200 lines (Perplexity + Grok duplicate paths)
  ADD:    ~40 lines (build chain → call orchestrator)

convex/schema.ts
  ADD: webSearchRetrievers field

src/lib/ai/streaming.ts
  REMOVE: getWebSearchModel(), getWebSearchFallbackModel()

src/lib/ai/search-execution-mode.ts
  REMOVE: old file (logic moves to web-search/search-execution-mode.ts)

Admin panel component
  ADD: Web Search Retrievers UI
```

### Unchanged files

```
src/lib/citations/normalizer.ts      — all normalizers already exist
src/lib/citations/types.ts           — types already complete
src/lib/ai/skills/                   — SKILL.md + skill system unchanged
src/lib/ai/search-system-prompt.ts   — generic, works for all retrievers
src/lib/ai/search-results-context.ts — buildSearchResultsContext() unchanged
```

### Dependencies

```
@ai-sdk/google@^3.0.34 — already installed, used for Google AI Studio (Gemini with grounding)
```

No new dependencies needed.

## Impact Estimate

| Category | Lines |
|----------|-------|
| New files | ~850 |
| Removed from route.ts | ~1200 |
| Added to route.ts | ~40 |
| Schema + admin UI | ~150 |
| **Net change** | **~-160 (codebase shrinks)** |

## Invariants

These MUST NOT change:
1. **Two-pass pattern** — Phase 1 (search, silent) → Phase 2 (compose, streamed). Never single-pass.
2. **SKILL.md as intelligence layer** — Gemini compose reads SKILL.md. Retrievers don't judge quality.
3. **Normalizer dispatching** — each provider format normalized to `NormalizedCitation[]` before compose.
4. **Blocklist via SKILL.md** — no programmatic domain filtering in the pipeline (except the existing universal post-filter in normalizer.ts).
5. **Search system prompt is generic** — same prompt for all retrievers. Diversity hints in user message augmentation.
6. **Compose failover stays in route.ts** — orchestrator handles retriever failover only. Compose model failover (Gateway→OpenRouter) remains in route.ts try-catch.

## Future: Paper Mode Orchestrator

The same principle (extract domain orchestration from route.ts) applies to paper mode. Paper uses a different shape — config builder instead of two-pass — but the pattern is analogous:

```
route.ts → paperOrchestrator.buildStreamConfig(context) → streamText(config)
```

This is OUT OF SCOPE for this design. Implement after search orchestrator is proven.
