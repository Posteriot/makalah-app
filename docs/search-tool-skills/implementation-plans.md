# Web Search Orchestrator — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor ~1200 lines of duplicated web search code in route.ts into a pluggable orchestrator with Strategy Pattern retrievers, then add OpenAI Search and Google Grounding as new retrievers.

**Architecture:** Two-layer Strategy Pattern. Orchestrator handles generic two-pass flow (Phase 1: silent search → Phase 2: Gemini compose with SKILL.md). Each retriever implements `SearchRetriever` interface (~50 lines each). Route.ts becomes a thin dispatcher (~40 lines for web search).

**Tech Stack:** TypeScript, Vercel AI SDK v6 (`ai@^6`), `@ai-sdk/google@^3.0.34`, OpenRouter provider, Convex (schema + admin), Next.js 16 API route.

**Design Doc:** `docs/search-tool-skills/web-search-orchestrator-design.md`

**Architecture Principles:** `docs/search-tool-skills/README.md`, `docs/search-tool-skills/architecture-constraints.md`

---

## Task 1: Create types.ts — Shared Interfaces

**Files:**
- Create: `src/lib/ai/web-search/types.ts`

**Step 1: Create the types file**

```typescript
// src/lib/ai/web-search/types.ts
import type { LanguageModel, StreamTextResult } from "ai"
import type { NormalizedCitation } from "@/lib/citations/types"

export interface RetrieverConfig {
  apiKey: string
  modelId: string
  providerOptions?: Record<string, unknown>
}

export interface SearchRetriever {
  name: string

  /**
   * Build streamText config for Phase 1 search.
   * Returns model + optional tools (Google Grounding needs google_search tool).
   */
  buildStreamConfig(config: RetrieverConfig): {
    model: LanguageModel
    tools?: Record<string, unknown>
  }

  /**
   * Extract and normalize sources from streamText result.
   * Async because some providers need await with timeout.
   */
  extractSources(result: StreamTextResult<Record<string, never>>): Promise<NormalizedCitation[]>
}

export interface RetrieverChainEntry {
  retriever: SearchRetriever
  retrieverConfig: RetrieverConfig
}

export interface WebSearchOrchestratorConfig {
  retrieverChain: RetrieverChainEntry[]

  messages: Parameters<typeof import("ai").streamText>[0]["messages"]
  composeMessages: Parameters<typeof import("ai").streamText>[0]["messages"]
  composeModel: LanguageModel

  systemPrompt: string
  paperModePrompt?: string
  paperWorkflowReminder?: string
  fileContext?: string

  samplingOptions: { temperature?: number; topP?: number }

  reasoningTraceEnabled: boolean
  isTransparentReasoning: boolean
  reasoningProviderOptions?: Record<string, unknown>
  traceMode: string

  onFinish: (result: WebSearchResult) => Promise<void>
}

export interface WebSearchResult {
  text: string
  sources: NormalizedCitation[]
  usage?: { inputTokens: number; outputTokens: number }
  searchUsage?: { inputTokens: number; outputTokens: number }
  retrieverName: string
  retrieverIndex: number
  attemptedRetrievers: string[]
}

export type SearchExecutionMode =
  | "perplexity"
  | "grok"
  | "openai-search"
  | "google-grounding"
  | "blocked_unavailable"
  | "off"
```

**Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "web-search/types" | head -20`
Expected: No errors referencing this file (warnings from unused exports are OK at this stage).

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/types.ts
git commit -m "feat(web-search): add shared types for orchestrator + retriever interfaces"
```

---

## Task 2: Create Perplexity Retriever

**Files:**
- Create: `src/lib/ai/web-search/retrievers/perplexity.ts`
- Reference: `src/lib/ai/streaming.ts:324-337` (current `getWebSearchModel`)
- Reference: `src/app/api/chat/route.ts:2330-2406` (current Perplexity Phase 1)
- Reference: `src/lib/citations/normalizer.ts` (`normalizeCitations(data, 'perplexity')`)

**Step 1: Create the retriever**

```typescript
// src/lib/ai/web-search/retrievers/perplexity.ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { normalizeCitations } from "@/lib/citations/normalizer"
import type { StreamTextResult } from "ai"
import type { NormalizedCitation } from "@/lib/citations/types"
import type { RetrieverConfig, SearchRetriever } from "../types"

const SOURCE_TIMEOUT_MS = 4000

export const perplexityRetriever: SearchRetriever = {
  name: "perplexity",

  buildStreamConfig(config: RetrieverConfig) {
    const openrouter = createOpenRouter({ apiKey: config.apiKey })
    return { model: openrouter.chat(config.modelId) }
  },

  async extractSources(
    result: StreamTextResult<Record<string, never>>
  ): Promise<NormalizedCitation[]> {
    try {
      const rawSources = await Promise.race([
        result.sources,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Perplexity sources timeout")), SOURCE_TIMEOUT_MS)
        ),
      ])
      return normalizeCitations(rawSources, "perplexity")
    } catch {
      console.warn("[perplexity] Failed to extract sources within timeout")
      return []
    }
  },
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "retrievers/perplexity" | head -10`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/retrievers/perplexity.ts
git commit -m "feat(web-search): add Perplexity retriever implementation"
```

---

## Task 3: Create Grok Retriever

**Files:**
- Create: `src/lib/ai/web-search/retrievers/grok.ts`
- Reference: `src/lib/ai/streaming.ts:343-363` (current `getWebSearchFallbackModel`)
- Reference: `src/app/api/chat/route.ts:3298-3392` (current Grok Phase 1)
- Reference: `src/app/api/chat/route.ts:1886-1894` (`isVertexProxyUrl` — moves here)

**Step 1: Create the retriever**

```typescript
// src/lib/ai/web-search/retrievers/grok.ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { normalizeCitations } from "@/lib/citations/normalizer"
import type { StreamTextResult } from "ai"
import type { NormalizedCitation } from "@/lib/citations/types"
import type { RetrieverConfig, SearchRetriever } from "../types"

const SOURCE_TIMEOUT_MS = 8000

function isVertexProxyUrl(raw: string): boolean {
  try {
    const hostname = new URL(raw).hostname
    return (
      hostname === "vertexaisearch.cloud.google.com" ||
      hostname.startsWith("vertexaisearch.cloud.google.")
    )
  } catch {
    return false
  }
}

export const grokRetriever: SearchRetriever = {
  name: "grok",

  buildStreamConfig(config: RetrieverConfig) {
    const openrouter = createOpenRouter({ apiKey: config.apiKey })
    const maxResults = (config.providerOptions?.maxResults as number) ?? 5
    const engine = config.providerOptions?.engine as string | undefined

    return {
      model: openrouter.chat(config.modelId, {
        web_search_options: {
          max_results: maxResults,
          ...(engine && engine !== "auto" ? { search_engine: engine } : {}),
        },
      }),
    }
  },

  async extractSources(
    result: StreamTextResult<Record<string, never>>
  ): Promise<NormalizedCitation[]> {
    try {
      const metadata = await Promise.race([
        result.providerMetadata,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Grok metadata timeout")), SOURCE_TIMEOUT_MS)
        ),
      ])
      const citations = normalizeCitations(metadata, "openrouter")
      return citations.filter((c) => !isVertexProxyUrl(c.url))
    } catch {
      console.warn("[grok] Failed to extract sources within timeout")
      return []
    }
  },
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "retrievers/grok" | head -10`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/retrievers/grok.ts
git commit -m "feat(web-search): add Grok retriever with Vertex proxy URL filter"
```

---

## Task 4: Create OpenAI Search Retriever

**Files:**
- Create: `src/lib/ai/web-search/retrievers/openai-search.ts`

**Step 1: Create the retriever**

```typescript
// src/lib/ai/web-search/retrievers/openai-search.ts
import { createOpenRouter } from "@openrouter/ai-sdk-provider"
import { normalizeCitations } from "@/lib/citations/normalizer"
import type { StreamTextResult } from "ai"
import type { NormalizedCitation } from "@/lib/citations/types"
import type { RetrieverConfig, SearchRetriever } from "../types"

const SOURCE_TIMEOUT_MS = 6000

export const openaiSearchRetriever: SearchRetriever = {
  name: "openai-search",

  buildStreamConfig(config: RetrieverConfig) {
    const openrouter = createOpenRouter({ apiKey: config.apiKey })
    return { model: openrouter.chat(config.modelId) }
  },

  async extractSources(
    result: StreamTextResult<Record<string, never>>
  ): Promise<NormalizedCitation[]> {
    try {
      const metadata = await Promise.race([
        result.providerMetadata,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("OpenAI Search metadata timeout")), SOURCE_TIMEOUT_MS)
        ),
      ])
      return normalizeCitations(metadata, "openrouter")
    } catch {
      console.warn("[openai-search] Failed to extract sources within timeout")
      return []
    }
  },
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "retrievers/openai-search" | head -10`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/retrievers/openai-search.ts
git commit -m "feat(web-search): add OpenAI Search retriever (gpt-4o-mini-search-preview)"
```

---

## Task 5: Create Google Grounding Retriever

**Files:**
- Create: `src/lib/ai/web-search/retrievers/google-grounding.ts`
- Reference: `@ai-sdk/google` v5/v6 API — `google.tools.googleSearch({})`
- Reference: `src/lib/citations/normalizer.ts` (`normalizeCitations(data, 'gateway')`)

**IMPORTANT:** This retriever uses Google AI Studio API directly (NOT OpenRouter). Uses `google.tools.googleSearch({})` as provider-defined tool — AI SDK v5/v6 API.

**Step 1: Create the retriever**

```typescript
// src/lib/ai/web-search/retrievers/google-grounding.ts
import { google } from "@ai-sdk/google"
import { normalizeCitations } from "@/lib/citations/normalizer"
import type { StreamTextResult } from "ai"
import type { NormalizedCitation } from "@/lib/citations/types"
import type { RetrieverConfig, SearchRetriever } from "../types"

const SOURCE_TIMEOUT_MS = 6000

export const googleGroundingRetriever: SearchRetriever = {
  name: "google-grounding",

  buildStreamConfig(config: RetrieverConfig) {
    // Google AI Studio uses GOOGLE_GENERATIVE_AI_API_KEY env var by default.
    // config.apiKey is available if explicit override needed.
    return {
      model: google(config.modelId),
      tools: { google_search: google.tools.googleSearch({}) },
    }
  },

  async extractSources(
    result: StreamTextResult<Record<string, never>>
  ): Promise<NormalizedCitation[]> {
    try {
      // Google Grounding provides sources via both result.sources and providerMetadata
      const [sources, metadata] = await Promise.race([
        Promise.all([result.sources, result.providerMetadata]),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Google Grounding sources timeout")), SOURCE_TIMEOUT_MS)
        ),
      ])

      // Try providerMetadata first (richer data with groundingChunks), fall back to sources
      const groundingMetadata = (metadata as Record<string, unknown>)?.google as
        | Record<string, unknown>
        | undefined
      if (groundingMetadata?.groundingMetadata) {
        return normalizeCitations(metadata, "gateway")
      }
      return normalizeCitations(sources, "gateway")
    } catch {
      console.warn("[google-grounding] Failed to extract sources within timeout")
      return []
    }
  },
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "retrievers/google-grounding" | head -10`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/retrievers/google-grounding.ts
git commit -m "feat(web-search): add Google Grounding retriever via AI Studio API"
```

---

## Task 6: Create Retriever Registry

**Files:**
- Create: `src/lib/ai/web-search/retriever-registry.ts`

**Step 1: Create the registry**

```typescript
// src/lib/ai/web-search/retriever-registry.ts
import type { SearchRetriever } from "./types"
import { perplexityRetriever } from "./retrievers/perplexity"
import { grokRetriever } from "./retrievers/grok"
import { openaiSearchRetriever } from "./retrievers/openai-search"
import { googleGroundingRetriever } from "./retrievers/google-grounding"

const registry = new Map<string, SearchRetriever>([
  ["perplexity", perplexityRetriever],
  ["grok", grokRetriever],
  ["openai-search", openaiSearchRetriever],
  ["google-grounding", googleGroundingRetriever],
])

export function getRetriever(name: string): SearchRetriever | undefined {
  return registry.get(name)
}

export function getRetrieverNames(): string[] {
  return Array.from(registry.keys())
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "retriever-registry" | head -10`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/retriever-registry.ts
git commit -m "feat(web-search): add retriever registry mapping names to implementations"
```

---

## Task 7: Create Utils — Shared Functions Extracted from route.ts

**Files:**
- Create: `src/lib/ai/web-search/utils.ts`
- Reference: `src/app/api/chat/route.ts:1807-1830` (`sanitizeMessagesForSearch`)
- Reference: `src/app/api/chat/route.ts:2260-2272` (`canonicalizeCitationUrl`)
- Reference: `src/app/api/chat/route.ts:1831-1883` (`createSearchUnavailableResponse`)

**Step 1: Create utils file**

Extract these 3 functions from route.ts. The exact implementation must match the current route.ts logic. Read route.ts at the referenced lines before writing.

```typescript
// src/lib/ai/web-search/utils.ts
import { createUIMessageStream, createUIMessageStreamResponse } from "ai"
import type { NormalizedCitation } from "@/lib/citations/types"

/**
 * Strip tool-call/result messages before sending to search models.
 * Search models (Perplexity/Grok/OpenAI) don't understand tool-call JSON.
 */
export function sanitizeMessagesForSearch<
  T extends { role: string; content: unknown }
>(msgs: T[]): T[] {
  return msgs
    .filter((m) => ["system", "user", "assistant"].includes(m.role))
    .map((m) => {
      if (m.role !== "assistant") return m
      if (!Array.isArray(m.content)) return m
      const textParts = m.content
        .filter((p: Record<string, unknown>) => p.type === "text")
        .map((p: Record<string, unknown>) => p.text)
        .join("\n")
      if (!textParts) return null
      return { ...m, content: textParts } as T
    })
    .filter((m): m is T => m !== null)
}

/**
 * Strip UTM params and hash from citation URLs for canonical comparison.
 */
export function canonicalizeCitationUrl(raw: string): string {
  try {
    const u = new URL(raw)
    for (const key of [...u.searchParams.keys()]) {
      if (key.startsWith("utm_")) u.searchParams.delete(key)
    }
    u.hash = ""
    const result = u.toString()
    return result.endsWith("/") ? result.slice(0, -1) : result
  } catch {
    return raw
  }
}

/**
 * Canonicalize all citation URLs in an array (post-normalization).
 */
export function canonicalizeCitationUrls(
  citations: NormalizedCitation[]
): NormalizedCitation[] {
  return citations.map((c) => ({ ...c, url: canonicalizeCitationUrl(c.url) }))
}

/**
 * Build error Response when ALL retrievers fail or search is unavailable.
 */
export function createSearchUnavailableResponse(input: {
  errorMessage: string
}): Response {
  const stream = createUIMessageStream({
    execute: ({ writeMessage, close }) => {
      writeMessage({
        role: "assistant",
        content: [{ type: "text", text: input.errorMessage }],
      })
      close()
    },
  })
  return createUIMessageStreamResponse({ stream })
}
```

**NOTE:** The actual `createSearchUnavailableResponse` in route.ts is more complex — it persists the error message and logs telemetry. Those route-scoped side effects stay in route.ts's `onFinish` callback. The orchestrator version only creates the error stream Response. Route.ts handles persistence separately.

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "web-search/utils" | head -10`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/utils.ts
git commit -m "feat(web-search): extract shared utils from route.ts (sanitize, canonicalize, error)"
```

---

## Task 8: Create Search Execution Mode Resolver (N-retriever)

**Files:**
- Create: `src/lib/ai/web-search/search-execution-mode.ts`
- Reference: `src/lib/ai/search-execution-mode.ts` (current 2-slot version)

**Step 1: Create new resolver**

```typescript
// src/lib/ai/web-search/search-execution-mode.ts
import type { SearchExecutionMode } from "./types"

interface RetrieverEntry {
  name: SearchExecutionMode
  enabled: boolean
  modelId: string | undefined
}

export function resolveSearchExecutionMode(input: {
  searchRequired: boolean
  retrievers: RetrieverEntry[]
}): SearchExecutionMode {
  if (!input.searchRequired) return "off"
  for (const r of input.retrievers) {
    if (r.enabled && r.modelId) return r.name
  }
  return "blocked_unavailable"
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "web-search/search-execution-mode" | head -10`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/search-execution-mode.ts
git commit -m "feat(web-search): add N-retriever search execution mode resolver"
```

---

## Task 9: Create Config Builder (DB Config → RetrieverChain)

**Files:**
- Create: `src/lib/ai/web-search/config-builder.ts`
- Reference: `src/lib/ai/streaming.ts:139-161` (`getWebSearchConfig`)
- Reference: `convex/schema.ts:416-421` (current web search fields)

**Step 1: Create config builder**

This function converts database config into a `RetrieverChainEntry[]` for the orchestrator. It supports both the new `webSearchRetrievers` array format AND the legacy 2-slot format for backward compatibility.

```typescript
// src/lib/ai/web-search/config-builder.ts
import { getRetriever } from "./retriever-registry"
import type { RetrieverChainEntry } from "./types"

interface WebSearchRetrieverConfig {
  name: string
  enabled: boolean
  modelId: string
  priority: number
  providerOptions?: { maxResults?: number; engine?: string }
}

interface LegacyWebSearchConfig {
  primaryWebSearchEnabled?: boolean
  fallbackWebSearchEnabled?: boolean
  webSearchModel?: string
  webSearchFallbackModel?: string
  fallbackWebSearchEngine?: string
  fallbackWebSearchMaxResults?: number
}

interface BuildChainInput {
  webSearchRetrievers?: WebSearchRetrieverConfig[]
  legacyConfig?: LegacyWebSearchConfig
  openrouterApiKey: string
  googleApiKey?: string
}

/**
 * Convert DB config into ordered RetrieverChainEntry[].
 * Supports new array format and legacy 2-slot format.
 */
export function buildRetrieverChain(input: BuildChainInput): RetrieverChainEntry[] {
  const retrievers = input.webSearchRetrievers
    ? fromNewFormat(input)
    : fromLegacyFormat(input)
  return retrievers
}

function fromNewFormat(input: BuildChainInput): RetrieverChainEntry[] {
  if (!input.webSearchRetrievers) return []

  return input.webSearchRetrievers
    .filter((r) => r.enabled && r.modelId)
    .sort((a, b) => a.priority - b.priority)
    .map((r) => {
      const retriever = getRetriever(r.name)
      if (!retriever) {
        console.warn(`[config-builder] Unknown retriever: ${r.name}`)
        return null
      }

      const isGoogleDirect = r.name === "google-grounding"
      return {
        retriever,
        retrieverConfig: {
          apiKey: isGoogleDirect
            ? (input.googleApiKey ?? "")
            : input.openrouterApiKey,
          modelId: r.modelId,
          providerOptions: r.providerOptions
            ? { ...r.providerOptions }
            : undefined,
        },
      }
    })
    .filter((entry): entry is RetrieverChainEntry => entry !== null)
}

function fromLegacyFormat(input: BuildChainInput): RetrieverChainEntry[] {
  const chain: RetrieverChainEntry[] = []
  const legacy = input.legacyConfig ?? {}

  if (legacy.primaryWebSearchEnabled !== false && legacy.webSearchModel) {
    const retriever = getRetriever("perplexity")
    if (retriever) {
      chain.push({
        retriever,
        retrieverConfig: {
          apiKey: input.openrouterApiKey,
          modelId: legacy.webSearchModel,
        },
      })
    }
  }

  if (legacy.fallbackWebSearchEnabled !== false && legacy.webSearchFallbackModel) {
    const retriever = getRetriever("grok")
    if (retriever) {
      chain.push({
        retriever,
        retrieverConfig: {
          apiKey: input.openrouterApiKey,
          modelId: legacy.webSearchFallbackModel,
          providerOptions: {
            maxResults: legacy.fallbackWebSearchMaxResults ?? 5,
            engine: legacy.fallbackWebSearchEngine ?? "auto",
          },
        },
      })
    }
  }

  return chain
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "config-builder" | head -10`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/ai/web-search/config-builder.ts
git commit -m "feat(web-search): add config builder with legacy backward compat"
```

---

## Task 10: Create the Orchestrator

**Files:**
- Create: `src/lib/ai/web-search/orchestrator.ts`
- Reference: `src/app/api/chat/route.ts:2240-2650` (Perplexity two-pass flow)
- Reference: `src/lib/ai/search-system-prompt.ts` (`getSearchSystemPrompt`, `augmentUserMessageForSearch`)
- Reference: `src/lib/ai/search-results-context.ts` (`buildSearchResultsContext`)
- Reference: `src/lib/ai/skills/index.ts` (`composeSkillInstructions`, `buildSkillContext`)

This is the largest file. It implements the generic two-pass flow: Phase 1 (iterate retriever chain until success), Phase 2 (Gemini compose with SKILL.md).

**Step 1: Read current route.ts Phase 1 + Phase 2 code**

Before writing orchestrator.ts, read these sections of route.ts to understand the exact streaming, citation, and message construction patterns:
- Lines 2240-2650 (Perplexity full flow)
- Lines 2408-2500 (Phase 2 message construction — system messages, skill injection, file context)
- Lines 2500-2650 (Phase 2 streaming + citation formatting + onFinish)

**Step 2: Create orchestrator.ts**

Architecture decision: **Phase 1 runs BEFORE stream creation.** This ensures:
- Phase 2 compose errors propagate to route.ts for retry with fallback model (GAP 1 fix)
- Clean separation: Phase 1 is fully awaited, Phase 2 is streamed

```typescript
// src/lib/ai/web-search/orchestrator.ts
import {
  streamText,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai"
import { getSearchSystemPrompt, augmentUserMessageForSearch } from "@/lib/ai/search-system-prompt"
import { buildSearchResultsContext } from "@/lib/ai/search-results-context"
import { composeSkillInstructions, buildSkillContext } from "@/lib/ai/skills"
import { formatParagraphEndCitations } from "@/lib/citations/formatter"
import { sanitizeMessagesForSearch, canonicalizeCitationUrls } from "./utils"
import type { WebSearchOrchestratorConfig, WebSearchResult } from "./types"
import type { NormalizedCitation } from "@/lib/citations/types"

/**
 * Execute web search with retriever failover chain + Gemini compose.
 *
 * Architecture:
 * - Phase 1 runs BEFORE stream creation (fully awaited, silent)
 * - Phase 2 runs INSIDE stream (streamed to user)
 * - If Phase 1 all-fail → returns error Response (no throw)
 * - If Phase 2 compose fails → throws to caller (route.ts catches + retries)
 *
 * This separation ensures compose errors propagate to route.ts
 * for retry with fallback compose model.
 */
export async function executeWebSearch(
  config: WebSearchOrchestratorConfig
): Promise<Response> {
  // --- Phase 1: Search (silent, before stream) ---
  const searchResult = await executeSearchPhase(config)

  if (!searchResult) {
    // All retrievers failed — return error response
    // Route.ts onFinish handles persistence/telemetry for this case separately
    const stream = createUIMessageStream({
      execute: ({ writeMessage }) => {
        writeMessage({
          role: "assistant",
          content: [{
            type: "text",
            text: "Maaf, terjadi kesalahan saat mencari sumber. Silakan coba lagi.",
          }],
        })
      },
    })
    return createUIMessageStreamResponse({ stream })
  }

  const {
    text: searchText, sources, searchUsage,
    retrieverName, retrieverIndex, attemptedRetrievers,
  } = searchResult

  // --- Phase 2: Compose (streamed to user) ---
  // Build skill context from ACTUAL Phase 1 results (not from config)
  const searchResultsContext = buildSearchResultsContext(sources, searchText)
  const skillInstructions = composeSkillInstructions(
    buildSkillContext({
      hasRecentSources: sources.length > 0,
      availableSources: sources,
    })
  )

  // Build compose message array matching route.ts pattern
  const composeSystemMessages: Array<{ role: "system"; content: string }> = []
  composeSystemMessages.push({ role: "system", content: config.systemPrompt })
  if (config.paperModePrompt) {
    composeSystemMessages.push({ role: "system", content: config.paperModePrompt })
  }
  if (config.paperWorkflowReminder) {
    composeSystemMessages.push({ role: "system", content: config.paperWorkflowReminder })
  }
  if (skillInstructions) {
    composeSystemMessages.push({ role: "system", content: skillInstructions })
  }
  composeSystemMessages.push({ role: "system", content: searchResultsContext })
  if (config.fileContext) {
    composeSystemMessages.push({ role: "system", content: config.fileContext })
  }

  // Start compose streamText — this may throw (propagates to route.ts for retry)
  const composeResult = streamText({
    model: config.composeModel,
    messages: [...composeSystemMessages, ...config.composeMessages],
    temperature: config.samplingOptions.temperature,
    topP: config.samplingOptions.topP,
    providerOptions: config.reasoningProviderOptions,
  })

  const stream = createUIMessageStream({
    execute: async ({ writeData, mergeStream }) => {
      // Emit "searching" status for UI search widget
      // (Read route.ts to find exact data event format — likely writeData with custom type)
      writeData({ type: "search-status", status: "searching" })

      // Stream compose output to user
      mergeStream(composeResult.toUIMessageStream())

      // Wait for compose to finish
      const finalText = await composeResult.text
      const composeUsage = await composeResult.usage

      // Stream citation data events (data-cited-text, data-cited-sources)
      // Read route.ts for exact formatParagraphEndCitations pattern and replicate
      if (sources.length > 0) {
        const formatted = formatParagraphEndCitations({
          text: finalText,
          sources,
        })
        writeData({ type: "data-cited-text", text: formatted.text })
        writeData({ type: "data-cited-sources", sources: formatted.sources })
      }

      // Emit search complete status
      writeData({ type: "search-status", status: "complete" })

      // Prepare WebSearchResult for onFinish callback
      const webSearchResult: WebSearchResult = {
        text: finalText,
        sources,
        usage: composeUsage
          ? {
              inputTokens: (searchUsage?.inputTokens ?? 0) + composeUsage.inputTokens,
              outputTokens: (searchUsage?.outputTokens ?? 0) + composeUsage.outputTokens,
            }
          : searchUsage,
        searchUsage,
        retrieverName,
        retrieverIndex,
        attemptedRetrievers,
      }

      await config.onFinish(webSearchResult)
    },
  })

  return createUIMessageStreamResponse({ stream })
}

// --- Phase 1 internals ---

interface SearchPhaseResult {
  text: string
  sources: NormalizedCitation[]
  searchUsage?: { inputTokens: number; outputTokens: number }
  retrieverName: string
  retrieverIndex: number
  attemptedRetrievers: string[]
}

async function executeSearchPhase(
  config: WebSearchOrchestratorConfig
): Promise<SearchPhaseResult | null> {
  const searchSystemPrompt = getSearchSystemPrompt()
  const searchMessages = sanitizeMessagesForSearch(
    config.messages as Array<{ role: string; content: unknown }>
  )
  const augmentedMessages = augmentUserMessageForSearch(searchMessages)

  const attemptedRetrievers: string[] = []

  for (let i = 0; i < config.retrieverChain.length; i++) {
    const { retriever, retrieverConfig } = config.retrieverChain[i]
    attemptedRetrievers.push(retriever.name)

    try {
      const { model, tools } = retriever.buildStreamConfig(retrieverConfig)

      const result = await streamText({
        model,
        messages: [
          { role: "system", content: searchSystemPrompt },
          ...augmentedMessages,
        ],
        ...(tools ? { tools } : {}),
      })

      // Await full text (Phase 1 is silent, not streamed)
      const text = await result.text
      const sources = canonicalizeCitationUrls(
        await retriever.extractSources(result)
      )

      // Await usage (AI SDK v6: usage may be a promise after streamText)
      const usage = await result.usage

      if (text || sources.length > 0) {
        return {
          text,
          sources,
          searchUsage: usage
            ? { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens }
            : undefined,
          retrieverName: retriever.name,
          retrieverIndex: i,
          attemptedRetrievers,
        }
      }

      console.warn(`[orchestrator] ${retriever.name} returned empty result, trying next`)
    } catch (error) {
      console.error(`[orchestrator] ${retriever.name} failed:`, error)
    }
  }

  return null
}
```

**IMPORTANT NOTES for implementer:**
- `executeWebSearch` is now `async` and returns `Promise<Response>`. Route.ts must `await` it or `return` it (both work since route handlers can return Response or Promise<Response>).
- Phase 1 runs BEFORE stream creation. If Phase 2 `streamText()` call itself fails (model error), it throws before the stream is created — propagating to route.ts for retry with fallback compose model.
- **Search status events:** The `writeData({ type: "search-status" })` pattern must match what route.ts currently emits. Read route.ts to find the exact format (may be a custom annotation or data stream event). Adjust the `writeData` calls to match.
- **Citation streaming:** The `formatParagraphEndCitations` import and `writeData` format for `data-cited-text`/`data-cited-sources` must match route.ts's current implementation. Read route.ts lines 2550-2650 for the exact pattern.
- **`await result.usage`:** In AI SDK v6, after `await result.text`, `result.usage` should be resolved. But use `await` defensively to handle both sync and async cases.
- `composeMessages` should be trimmed model messages (not including system). System messages are constructed inside the orchestrator.

**Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "orchestrator" | head -20`
Expected: No errors (some type adjustments may be needed).

**Step 4: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts
git commit -m "feat(web-search): add generic two-pass orchestrator with retriever failover"
```

---

## Task 11: Create Barrel Export

**Files:**
- Create: `src/lib/ai/web-search/index.ts`

**Step 1: Create barrel file**

```typescript
// src/lib/ai/web-search/index.ts
export { executeWebSearch } from "./orchestrator"
export { buildRetrieverChain } from "./config-builder"
export { resolveSearchExecutionMode } from "./search-execution-mode"
export { getRetriever, getRetrieverNames } from "./retriever-registry"
export { createSearchUnavailableResponse, sanitizeMessagesForSearch } from "./utils"
export type {
  SearchRetriever,
  RetrieverConfig,
  RetrieverChainEntry,
  WebSearchOrchestratorConfig,
  WebSearchResult,
  SearchExecutionMode,
} from "./types"
```

**Step 2: Commit**

```bash
git add src/lib/ai/web-search/index.ts
git commit -m "feat(web-search): add barrel export for web-search module"
```

---

## Task 12: Add webSearchRetrievers Field to Convex Schema

**Files:**
- Modify: `convex/schema.ts` (around line 416, inside `aiProviderConfigs` table)

**Step 1: Read current schema**

Read `convex/schema.ts` lines 380-445 to see current `aiProviderConfigs` table definition.

**Step 2: Add webSearchRetrievers field**

After the existing web search fields (line ~421), add:

```typescript
webSearchRetrievers: v.optional(v.array(v.object({
  name: v.string(),
  enabled: v.boolean(),
  modelId: v.string(),
  priority: v.number(),
  providerOptions: v.optional(v.object({
    maxResults: v.optional(v.number()),
    engine: v.optional(v.string()),
  })),
}))),
```

**Step 3: Verify Convex schema is valid**

Run: `npx convex dev --once 2>&1 | tail -5`
Expected: Schema pushed successfully (or dev server syncs without error).

**Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add webSearchRetrievers array field to aiProviderConfigs"
```

---

## Task 13: Integrate Orchestrator into route.ts — Replace Perplexity Path

This is the critical integration task. We replace the ~400-line Perplexity search path in route.ts with a ~40-line orchestrator call.

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Read the full Perplexity path in route.ts**

Read route.ts lines 2090-2650 to understand:
- Where `enableWebSearch` is checked
- The Perplexity Phase 1 + Phase 2 code
- What `onFinish` does (persist message, record billing, log telemetry, auto-save paper references)
- All variables from route scope used inside the web search block

**Step 2: Replace the Perplexity web search block**

Find the section where `enableWebSearch` triggers the Perplexity path. Replace it with:

```typescript
// --- Web Search via Orchestrator ---
if (enableWebSearch) {
  const chain = buildRetrieverChain({
    webSearchRetrievers: webSearchConfig.webSearchRetrievers,
    legacyConfig: {
      primaryWebSearchEnabled: webSearchConfig.primaryEnabled,
      fallbackWebSearchEnabled: webSearchConfig.fallbackEnabled,
      webSearchModel: webSearchConfig.webSearchModel,
      webSearchFallbackModel: webSearchConfig.webSearchFallbackModel,
      fallbackWebSearchEngine: webSearchConfig.fallbackEngine,
      fallbackWebSearchMaxResults: webSearchConfig.fallbackMaxResults,
    },
    openrouterApiKey: process.env.OPENROUTER_API_KEY!,
    googleApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  })

  if (chain.length === 0) {
    return createSearchUnavailableResponse({
      errorMessage: "Maaf, layanan web search sedang tidak tersedia.",
    })
  }

  // executeWebSearch is async — await it.
  // If Phase 2 compose throws, error propagates here for retry with fallback model.
  return await executeWebSearch({
    retrieverChain: chain,
    messages: fullMessagesForSearch,
    composeMessages: trimmedModelMessages,
    composeModel: await getGatewayModel(),
    systemPrompt,
    paperModePrompt,
    paperWorkflowReminder,
    fileContext,
    samplingOptions: { temperature, topP },
    reasoningTraceEnabled,
    isTransparentReasoning,
    reasoningProviderOptions,
    traceMode: getTraceModeLabel(!!paperModePrompt, true),
    onFinish: async (result) => {
      // Persist assistant message
      await saveAssistantMessage(result.text, result.sources, /* ... */)
      // Record billing
      await recordUsageAfterOperation({ /* ... */ })
      // Auto-title if first message
      await maybeUpdateTitleFromAI({ /* ... */ })
      // Log telemetry
      logAiTelemetry({
        retriever: result.retrieverName,
        retrieverIndex: result.retrieverIndex,
        attemptedRetrievers: result.attemptedRetrievers,
        /* ... existing telemetry fields ... */
      })
    },
  })
}
```

**IMPORTANT:** The exact variable names (`fullMessagesForSearch`, `trimmedModelMessages`, `saveAssistantMessage`, etc.) must match the actual route.ts scope. Read route.ts carefully before writing the replacement.

**Step 3: Add imports at top of route.ts**

```typescript
import { executeWebSearch, buildRetrieverChain, createSearchUnavailableResponse } from "@/lib/ai/web-search"
```

**Step 4: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor(route): replace Perplexity search path with orchestrator call"
```

---

## Task 14: Remove Grok Fallback Path from route.ts

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Read the Grok fallback section**

Read route.ts lines 3227-3650+ to understand the full Grok path.

**Step 2: Remove the Grok fallback code block**

The Grok path is now handled by the orchestrator's failover chain. Remove the entire Grok fallback section (should be ~400 lines).

**Step 3: Remove the `isVertexProxyUrl` function from route.ts**

This function (lines 1886-1894) now lives in the Grok retriever. Remove it.

**Step 4: Remove `sanitizeMessagesForSearch` from route.ts if no longer used**

Check if `sanitizeMessagesForSearch` (lines 1807-1830) is still used elsewhere in route.ts. If not, remove it (it's now in `web-search/utils.ts`).

**Step 5: Remove `canonicalizeCitationUrl` from route.ts if no longer used**

Check if `canonicalizeCitationUrl` (lines 2260-2272) is still referenced. If not, remove it.

**Step 6: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 7: Commit**

```bash
git add src/app/api/chat/route.ts
git commit -m "refactor(route): remove Grok fallback path + extracted utils (~800 lines removed)"
```

---

## Task 15: Update search-execution-mode.ts

**Files:**
- Modify: `src/lib/ai/search-execution-mode.ts`

**Step 1: Read current file**

Read `src/lib/ai/search-execution-mode.ts` (27 lines).

**Step 2: Decide: replace or re-export**

Two options:
- **Option A (recommended):** Update the existing file to re-export from the new module, so existing imports don't break:

```typescript
// src/lib/ai/search-execution-mode.ts
// Re-export from new location for backward compatibility
export { resolveSearchExecutionMode } from "./web-search/search-execution-mode"
export type { SearchExecutionMode } from "./web-search/types"
```

- **Option B:** Update all import sites to use `@/lib/ai/web-search` directly.

Choose Option A for minimal blast radius.

**Step 3: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/lib/ai/search-execution-mode.ts
git commit -m "refactor: re-export search-execution-mode from new web-search module"
```

---

## Task 16: Clean Up streaming.ts

**Files:**
- Modify: `src/lib/ai/streaming.ts`

**Step 1: Read streaming.ts**

Read `src/lib/ai/streaming.ts` to identify:
- `getWebSearchModel()` (lines 324-337) — now in Perplexity retriever
- `getWebSearchFallbackModel()` (lines 343-363) — now in Grok retriever
- `getWebSearchConfig()` (lines 139-161) — **STAYS** (used by route.ts for config retrieval)

**Step 2: Check if getWebSearchModel / getWebSearchFallbackModel are still imported anywhere**

Search for imports of these functions:
Run: `grep -r "getWebSearchModel\|getWebSearchFallbackModel" src/ --include="*.ts" --include="*.tsx" -l`

**Step 3: If no longer imported, remove the functions**

Remove `getWebSearchModel()` and `getWebSearchFallbackModel()` from streaming.ts. Keep `getWebSearchConfig()`.

**Step 4: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/lib/ai/streaming.ts
git commit -m "refactor(streaming): remove getWebSearchModel/Fallback (moved to retrievers)"
```

---

## Task 17: Update route.ts resolveSearchExecutionMode Call

**Files:**
- Modify: `src/app/api/chat/route.ts`

**Step 1: Find where resolveSearchExecutionMode is called in route.ts**

The current call uses the old 2-slot interface. Update it to use the new N-retriever interface.

**Step 2: Update the call**

Read the current call and update it to pass a `retrievers` array:

```typescript
// Old:
const searchMode = resolveSearchExecutionMode({
  searchRequired,
  webSearchEnabled: webSearchConfig.primaryEnabled,
  webSearchModel: webSearchConfig.webSearchModel,
  fallbackWebSearchEnabled: webSearchConfig.fallbackEnabled,
  webSearchFallbackModel: webSearchConfig.webSearchFallbackModel,
})

// New:
const searchMode = resolveSearchExecutionMode({
  searchRequired,
  retrievers: webSearchConfig.webSearchRetrievers
    ? webSearchConfig.webSearchRetrievers
        .sort((a, b) => a.priority - b.priority)
        .map((r) => ({ name: r.name as SearchExecutionMode, enabled: r.enabled, modelId: r.modelId }))
    : [
        { name: "perplexity" as const, enabled: webSearchConfig.primaryEnabled, modelId: webSearchConfig.webSearchModel },
        { name: "grok" as const, enabled: webSearchConfig.fallbackEnabled, modelId: webSearchConfig.webSearchFallbackModel },
      ],
})
```

**Step 3: Update getWebSearchConfig to include webSearchRetrievers**

In `streaming.ts`, update `getWebSearchConfig()` to also return `webSearchRetrievers` from the DB config if present.

**Step 4: Verify build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds.

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts src/lib/ai/streaming.ts
git commit -m "refactor(route): update search mode resolution to N-retriever format"
```

---

## Task 18: End-to-End Smoke Test — Perplexity Path

**Step 1: Start dev servers**

Run: `npm run dev` (terminal 1)
Run: `npm run convex:dev` (terminal 2)

**Step 2: Test web search with Perplexity (default config)**

1. Open `http://localhost:3000/chat`
2. Type a question that triggers web search (e.g., "Apa kabar terbaru tentang AI di Indonesia?")
3. Verify:
   - "Mencari sumber..." status appears
   - Response streams with citations
   - Citations appear as numbered references
   - No console errors

**Step 3: Test failover by disabling Perplexity**

1. In Admin Panel → AI Providers → disable primary web search
2. Send another web search query
3. Verify Grok fallback activates (check console logs for `[orchestrator] perplexity failed`)

**Step 4: Test all-retriever failure**

1. Disable both Perplexity and Grok in admin
2. Send web search query
3. Verify error message appears: "Maaf, layanan web search sedang tidak tersedia."

**Step 5: Commit if tests pass**

```bash
git commit --allow-empty -m "test: verify orchestrator smoke test — Perplexity + Grok failover works"
```

---

## Task 19: Admin Panel — Web Search Retrievers UI

**Files:**
- Modify: existing admin AI provider config component
- Reference: `src/components/admin/` (find the AI provider config editor)

**Step 1: Find the admin AI provider config component**

Search for: `primaryWebSearchEnabled` or `webSearchModel` in `src/components/admin/`

**Step 2: Add Web Search Retrievers section**

Add a sortable list UI below the existing web search settings. Each row shows:
- Priority number (drag handle or up/down arrows)
- Retriever name (dropdown: perplexity, grok, openai-search, google-grounding)
- Model ID (text input)
- Enabled toggle (checkbox)
- Provider options (expandable: maxResults, engine — only for grok)
- Remove button

Add an "Add Retriever" button at the bottom.

**Step 3: Wire up to Convex mutation**

The save action should write to `webSearchRetrievers` field in `aiProviderConfigs`.

**Step 4: Backward compat display**

When `webSearchRetrievers` is undefined, display the legacy fields as before. When the admin saves via the new UI, write `webSearchRetrievers` and the new format takes precedence.

**Step 5: Verify in browser**

1. Open Admin Panel → AI Providers
2. Verify the new Web Search Retrievers section renders
3. Add a retriever, reorder, save
4. Refresh — verify config persists

**Step 6: Commit**

```bash
git add src/components/admin/
git commit -m "feat(admin): add Web Search Retrievers UI with drag-to-reorder priority"
```

---

## Task 20: End-to-End Test — OpenAI Search + Google Grounding

**Step 1: Configure new retrievers in admin**

1. Admin Panel → AI Providers → Web Search Retrievers
2. Add "openai-search" with model `openai/gpt-4o-mini-search-preview`, enabled, priority 3
3. Add "google-grounding" with model `gemini-2.5-flash`, enabled, priority 4
4. Save

**Step 2: Test OpenAI Search**

1. Disable Perplexity + Grok (priority 1-2) in admin
2. Send a web search query
3. Verify OpenAI Search retriever activates (check console: `[orchestrator]`)
4. Verify citations appear correctly

**Step 3: Test Google Grounding**

1. Disable Perplexity + Grok + OpenAI Search
2. Send a web search query
3. Verify Google Grounding retriever activates
4. Verify citations from Google Search appear

**Step 4: Test full chain failover**

1. Enable all 4 retrievers with correct priorities (1-4)
2. Send a web search query — should use priority 1 (Perplexity)
3. Disable priority 1 — should failover to priority 2 (Grok)
4. Verify console logs show `attemptedRetrievers` array

**Step 5: Commit**

```bash
git commit --allow-empty -m "test: verify OpenAI Search + Google Grounding + full chain failover"
```

---

## Task 21: Update Telemetry Logging

**Files:**
- Modify: `src/app/api/chat/route.ts` (telemetry section in onFinish)
- Reference: `convex/schema.ts` — `webSearchSkillLogs` table if it exists

**Step 1: Check current telemetry fields**

Read route.ts telemetry logging to see what fields are logged for web search.

**Step 2: Add new telemetry fields**

Add `retrieverName`, `retrieverIndex`, `attemptedRetrievers` to the telemetry log call. These come from `WebSearchResult` passed to `onFinish`.

**Step 3: Update Convex schema if needed**

If `webSearchSkillLogs` table exists, add the new fields. If telemetry goes to console only, no schema change needed.

**Step 4: Verify build**

Run: `npm run build 2>&1 | tail -20`

**Step 5: Commit**

```bash
git add src/app/api/chat/route.ts convex/schema.ts
git commit -m "feat(telemetry): add retriever chain failover fields to web search logs"
```

---

## Task 22: Final Cleanup + Verification

**Step 1: Verify route.ts line count reduction**

Run: `wc -l src/app/api/chat/route.ts`
Expected: ~2200 lines (down from ~3400, reduction of ~1200 lines)

**Step 2: Verify no dead imports**

Run: `npm run lint 2>&1 | head -40`
Fix any unused import warnings.

**Step 3: Verify web-search module file structure**

Run: `find src/lib/ai/web-search -type f | sort`
Expected:
```
src/lib/ai/web-search/config-builder.ts
src/lib/ai/web-search/index.ts
src/lib/ai/web-search/orchestrator.ts
src/lib/ai/web-search/retriever-registry.ts
src/lib/ai/web-search/search-execution-mode.ts
src/lib/ai/web-search/types.ts
src/lib/ai/web-search/utils.ts
src/lib/ai/web-search/retrievers/google-grounding.ts
src/lib/ai/web-search/retrievers/grok.ts
src/lib/ai/web-search/retrievers/openai-search.ts
src/lib/ai/web-search/retrievers/perplexity.ts
```

**Step 4: Run full build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup — lint fixes, dead import removal"
```

---

## Invariant Checklist (verify after all tasks)

- [ ] Two-pass pattern preserved: Phase 1 (search, silent) → Phase 2 (compose, streamed)
- [ ] SKILL.md injected in Phase 2 compose (not in retrievers)
- [ ] All retrievers normalize to `NormalizedCitation[]` before compose
- [ ] No programmatic domain filtering in pipeline (blocklist via SKILL.md only)
- [ ] Search system prompt is generic (same for all retrievers)
- [ ] Compose failover stays in route.ts (orchestrator throws, route.ts catches)
- [ ] Backward compat: legacy 2-slot config still works when `webSearchRetrievers` undefined
- [ ] Route.ts handles persistence, billing, telemetry (not orchestrator)
- [ ] Adding a new retriever = 1 file (~50 lines) + registry entry
