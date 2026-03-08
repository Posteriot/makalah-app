# Design Doc: Web Search Migration — google_search to Perplexity Sonar

**Date:** 2026-03-08
**Branch:** `feat/search-web-tool-enforcement`
**Status:** Approved

## 1. Problem Statement

Makalah AI uses web search to find credible sources for academic paper writing. The current implementation uses `google_search` (Google Grounding) via Vercel AI Gateway with Gemini 2.5 Flash.

### Problems with google_search

1. **No source control** — Cannot exclude/include domains. Wikipedia, blogs, forums appear freely.
2. **Black box** — Google's ranking is opaque, no way to influence source quality.
3. **Cannot mix tools** — `google_search` is provider-defined, cannot be used alongside function tools (createArtifact, paper tools) in the same request.

### Failed Attempt: parallel_search

`parallel_search` via `gateway.tools.parallelSearch()` was tried and rejected because it uses **write-before-search** behavior — the model writes text from memory first, then search results are tacked on as disconnected references. This creates an illusion of grounding with high hallucination risk. No amount of prompt engineering fixed this fundamental flaw.

Full analysis in `docs/searchweb-tool/migration-context.md`.

## 2. Decision: Perplexity Sonar via OpenRouter

| Criteria | google_search | Perplexity Sonar |
|----------|--------------|------------------|
| Search order | Search -> Write | Search -> Write |
| Source control | None | Via prompt + model intelligence |
| Source transparency | Opaque (Google) | Transparent (URLs visible) |
| Citations | groundingSupports extraction | Native `sources` array |
| Tool isolation constraint | Cannot mix with function tools | No constraint (it's a model, not a tool) |
| Price | $5/1K searches | $1/M in + $1/M out + $5/1K searches |
| Available via | AI Gateway | OpenRouter |

**Why Perplexity Sonar:**
- Search-first model — always searches, reads results, then writes based on actual web data
- Source transparency — shows which sources were used
- Source quality influenceable via system prompt
- Already available via OpenRouter (infrastructure exists in codebase)
- Built-in citations via AI SDK `sources` property

## 3. Architecture

### Current (Before)

```
NON-SEARCH:
  Primary:  AI Gateway -> Gemini 2.5 Flash
  Fallback: OpenRouter -> GPT-5.1

WEB SEARCH:
  Primary:  AI Gateway -> Gemini 2.5 Flash + google_search (grounding tool)
  Fallback: OpenRouter -> any model + :online suffix
```

### Target (After)

```
NON-SEARCH (UNCHANGED):
  Primary:  AI Gateway -> Gemini 2.5 Flash
  Fallback: OpenRouter -> GPT-5.1

WEB SEARCH (NEW):
  Primary:  OpenRouter -> perplexity/sonar          (native search model)
  Fallback: OpenRouter -> x-ai/grok-3-mini          (with web_search_options)
  Blocked:  Both fail -> blocked_unavailable         (fail-closed error UI)
```

**Key principle:** Primary/fallback models for non-search (Gemini 2.5 Flash, GPT-5.1) are completely untouched. Perplexity and Grok only activate when `searchRequired === true`.

### Why All OpenRouter

- Single provider for all web search = simpler auth, billing, monitoring
- OpenRouter infrastructure already production-ready in codebase
- Both models available via same `createOpenRouter()` API

### Pricing

| Model | Input/M | Output/M | Search/1K | Role |
|-------|---------|----------|-----------|------|
| perplexity/sonar | $1.00 | $1.00 | $5.00 | Primary web search |
| x-ai/grok-3-mini | $0.30 | $0.50 | $5.00 | Fallback web search |

## 4. Execution Mode Changes

### Current Modes

| Mode | Trigger |
|------|---------|
| `primary_google_search` | google_search tool ready + enabled |
| `fallback_online_search` | google_search failed + :online enabled |
| `blocked_unavailable` | search needed but all engines unavailable |
| `off` | search not needed |

### New Modes

| Mode | Trigger |
|------|---------|
| `primary_perplexity` | webSearchEnabled + webSearchModel configured |
| `fallback_web_search` | primary failed + fallbackWebSearchEnabled + fallbackModel configured |
| `blocked_unavailable` | search needed but all engines unavailable |
| `off` | search not needed |

### Resolution Logic

```typescript
function resolveSearchExecutionMode(input: {
  searchRequired: boolean
  webSearchEnabled: boolean
  webSearchModel: string | undefined
  fallbackWebSearchEnabled: boolean
  webSearchFallbackModel: string | undefined
}): SearchExecutionMode {
  if (!input.searchRequired) return "off"
  if (input.webSearchEnabled && input.webSearchModel) return "primary_perplexity"
  if (input.fallbackWebSearchEnabled && input.webSearchFallbackModel) return "fallback_web_search"
  return "blocked_unavailable"
}
```

No more `primaryToolReady` check — Perplexity is a model, not a tool that needs initialization.

**Note — primary disabled, fallback enabled:** If admin disables primary (`webSearchEnabled=false`) but keeps fallback enabled, the function returns `"fallback_web_search"` directly — Grok becomes the sole web search provider, not a "fallback" from anything. This is intended behavior: admin deliberately disabled Perplexity but still wants web search capability via Grok.

## 5. Model Provisioning

New functions in `streaming.ts`:

```typescript
// Primary web search model — Perplexity is a native search model, no special config needed
async function getWebSearchModel(): Promise<LanguageModel> {
  const config = await getProviderConfig()
  return openrouter(config.webSearchModel) // "perplexity/sonar"
}

// Fallback web search model — Grok needs web_search_options to enable search
async function getWebSearchFallbackModel(): Promise<LanguageModel> {
  const config = await getProviderConfig()
  return openrouter(config.webSearchFallbackModel, {
    web_search_options: {
      max_results: config.fallbackWebSearchMaxResults ?? 5,
      engine: config.fallbackWebSearchEngine ?? "native",
    }
  })
}
```

## 6. Citation Normalization

### Perplexity Citations

AI SDK v5 returns `sources` property directly from Perplexity responses:

```typescript
const { text, sources } = await streamText({
  model: openrouter('perplexity/sonar'),
  ...
})
// sources = [{ url: "https://...", title: "..." }, ...]
```

In streaming, citations arrive as `source` events: `{ type: 'source', url, title }`.

### Grok Fallback Citations

Grok with `web_search_options` returns annotations via OpenRouter format (same as current `:online` path):

```
experimental_providerMetadata.openrouter.annotations
```

### Normalization Plan

Add `'perplexity'` case to `normalizeCitations()` dispatcher:

```typescript
function normalizePerplexityCitations(sources: Source[]): NormalizedCitation[] {
  return sources.map(s => ({ url: s.url, title: s.title ?? '' }))
}
```

Grok fallback reuses existing `normalizeOpenAIAnnotations()` (same format as current `:online`).

### Post-Processing: Domain Filter

Applied **once** in the `normalizeCitations()` dispatcher, **after** the provider-specific normalizer returns. This ensures ALL providers (Perplexity, OpenRouter, Google, etc.) are filtered uniformly without duplicating logic inside each normalizer.

```typescript
// In normalizeCitations() dispatcher — single filter point
export function normalizeCitations(providerData: unknown, provider: CitationProvider): NormalizedCitation[] {
  let citations: NormalizedCitation[]
  switch (provider) {
    case 'perplexity': citations = normalizePerplexityCitations(providerData); break
    case 'openrouter': citations = normalizeOpenAIAnnotations(providerData); break
    case 'gateway':    citations = normalizeGoogleGrounding(providerData); break
    default:           citations = []; break
  }
  // Universal post-filter — applied to ALL providers
  return citations.filter(c => !isBlockedSourceDomain(c.url))
}
```

Domain blocklist and filter function:

```typescript
const BLOCKED_DOMAINS = [
  "wikipedia.org", "wikimedia.org", "wiktionary.org",
  "blogspot.com", "wordpress.com", "medium.com", "substack.com",
  "tumblr.com", "quora.com", "reddit.com", "answers.yahoo.com",
  "scribd.com", "brainly.co.id", "coursehero.com",
]

function isBlockedSourceDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    // Malformed URL — don't block (let citation through, user can judge)
    return false
  }
}
```

## 7. Source Policy Prompt

Injected into system prompt during ALL web search turns (both Perplexity primary and Grok fallback).

```
Search GLOBALLY. Cast a wide net across all credible source types — news media,
academic journals, think tanks, international organizations, and government data.
Do not limit yourself to one category.

Credible Sources (examples, not exhaustive — use any credible source you find):
- News media, e.g.: Kompas, Tempo, Katadata, Tirto, CNN Indonesia, Republika, Reuters, AP News, BBC, NY Times, The Guardian
- Academic, e.g.: arxiv.org, PubMed, ScienceDirect, Nature, Google Scholar, university repositories
- Organizations, e.g.: World Bank, UN agencies, IRENA, IEA, WHO, McKinsey, Brookings
- Government data, e.g.: .go.id, .gov (use as data source, cross-check with independent sources)

These are examples to illustrate the breadth of acceptable sources. Do NOT limit yourself
to only these names. Any credible, verifiable source is welcome.

Blocked: Wikipedia, personal blogs, forums, unverified document-sharing sites.
```

**Important:** The source names above are illustrative examples and guides, NOT a deterministic whitelist. The model should freely use any credible source it discovers, not restrict itself to only the named sources. The purpose is to show the _types_ and _breadth_ of sources expected, not to constrain results.

### Hardcoded vs Configurable

Source policy prompt and blocked domains list are **hardcoded** in this iteration. Rationale:
- Source policy is domain expertise (academic credibility standards) — changes infrequently
- Blocked domains list is a safety net — additions are rare
- Making these admin-configurable adds schema fields, UI work, and prompt injection complexity for low-frequency changes
- **Future option:** If source policy needs frequent tuning, extract to `systemPrompts` table or add dedicated admin fields. For now, code changes + deploy is acceptable.

### Defense in Depth: Prompt vs Filter

The source policy operates at two layers:

| Layer | Mechanism | Scope | Guarantee |
|-------|-----------|-------|-----------|
| **Layer 1 — Prompt** | Source policy injected into system prompt | Guides model's search behavior | Soft (model may still find blocked sources) |
| **Layer 2 — Post-filter** | `isBlockedSourceDomain()` on citations | Removes blocked domains from citation list | Hard (blocked URLs never shown to user) |

**Trade-off:** Layer 2 only filters _citations_, not response text. If Perplexity uses a blocked source's content, the text may reference that information without a visible citation. This is acceptable because: (1) Perplexity is instruction-following and generally respects the "Blocked" directive, (2) the combination of prompt guidance + citation filter provides defense in depth, (3) hard-blocking at the search query level is not possible with Perplexity's API.

New file: `src/lib/ai/search-source-policy.ts`

## 8. Schema Changes

### New Fields in `aiProviderConfigs`

```typescript
webSearchModel: v.optional(v.string()),          // e.g. "perplexity/sonar"
webSearchFallbackModel: v.optional(v.string()),  // e.g. "x-ai/grok-3-mini"
```

### Existing Fields (Semantics Updated)

| Field | Old Meaning | New Meaning |
|-------|-------------|-------------|
| `primaryWebSearchEnabled` | Enable google_search tool | Enable Perplexity web search |
| `fallbackWebSearchEnabled` | Enable :online suffix | Enable Grok fallback web search |
| `fallbackWebSearchEngine` | Engine for :online | Engine for Grok web_search_options |
| `fallbackWebSearchMaxResults` | Max results for :online | Max results for Grok web_search_options |

### Default Seed Values

```typescript
webSearchModel: "perplexity/sonar"
webSearchFallbackModel: "x-ai/grok-3-mini"
```

## 9. Admin Panel Updates

Update the Web Search Settings section in `AIProviderConfigEditor.tsx`:

```
+----------------------------------------------------------+
|  Web Search Settings                                      |
|  (i) Semua pencarian web dirutekan melalui OpenRouter     |
|                                                           |
|  Enable Primary Web Search                     [Switch]   |
|  | Web Search Model:  [perplexity/sonar            v]    |
|  | "Model pencarian web utama (via OpenRouter)"          |
|                                                           |
|  Enable Fallback Web Search                    [Switch]   |
|  | Fallback Search Model: [x-ai/grok-3-mini       v]    |
|  | Fallback Search Engine: [native v]                    |
|  | Max Search Results:     [5        ]                   |
|  | "Fallback jika model utama gagal (via OpenRouter)"    |
+----------------------------------------------------------+
```

Changes:
- Add info banner: "Semua pencarian web dirutekan melalui OpenRouter"
- Add `webSearchModel` text input (under primary toggle, conditional on enabled)
- Add `webSearchFallbackModel` text input (under fallback toggle, conditional on enabled)
- Update helper texts from "google_search tool" / ":online suffix" to Perplexity/OpenRouter descriptions
- Add both new fields to create/update mutation payloads and change detection

## 10. Chat Route Changes

### Conversation History Sanitization

Perplexity and Grok are **different models** from the primary chat model (Gemini). The conversation history may contain tool call/result messages from previous turns (paper tools, artifact tools). These models may not support tool messages.

**Strategy:** Before sending messages to web search models, filter out tool call and tool result messages. Only send user + assistant text messages + system prompt. This prevents errors from unsupported message types.

```typescript
// Filter messages for web search models — strip tool calls/results
const searchMessages = messages.filter(m =>
  m.role === 'user' || (m.role === 'assistant' && !hasToolCalls(m))
)
```

If this filtering proves too aggressive (loses important context), fallback to sending full history and rely on AI SDK's `streamText` to convert/strip unsupported message types internally. Verify during Phase 3 testing.

### Web Search Mode (Simplified Pseudocode)

```typescript
if (searchExecutionMode === "primary_perplexity") {
  const model = await getWebSearchModel()
  const systemWithPolicy = systemPrompt + getSourcePolicyPrompt()
  const searchMessages = sanitizeMessagesForSearch(messages)

  const result = streamText({
    model,
    system: systemWithPolicy,
    messages: searchMessages,
    // NO tools — Perplexity IS the search, no function tools needed
    // NO maxToolSteps — no tool calling involved
  })

  // Citations from result.sources (streamed as 'source' events)
  // Post-filter via normalizeCitations() dispatcher (includes isBlockedSourceDomain)
}
```

### Fallback (If Primary Fails)

```typescript
catch (error) {
  if (canFallbackToWebSearch) {
    const fallbackModel = await getWebSearchFallbackModel()
    const systemWithPolicy = systemPrompt + getSourcePolicyPrompt() // SAME policy as primary
    const searchMessages = sanitizeMessagesForSearch(messages)

    const result = streamText({
      model: fallbackModel,
      system: systemWithPolicy,
      messages: searchMessages,
      // web_search_options already configured in model init (getWebSearchFallbackModel)
    })

    // Citations from annotations (existing normalizeOpenAIAnnotations)
    // Post-filter with isBlockedSourceDomain()
  } else {
    // blocked_unavailable -> error UI
  }
}
```

### Non-Search Mode (UNCHANGED)

```typescript
if (searchExecutionMode === "off") {
  // Existing AI Gateway + Gemini 2.5 Flash flow
  // Function tools (paper tools, artifacts) — completely untouched
}
```

## 11. Fallback Chain

```
Web search request arrives
  |
  v
1. Try: OpenRouter -> perplexity/sonar
   Success -> normalizePerplexityCitations() -> filter blocked domains -> stream
   Fail |
        v
2. Try: OpenRouter -> x-ai/grok-3-mini + web_search_options
   Success -> normalizeOpenAIAnnotations() -> filter blocked domains -> stream
   Fail |
        v
3. Return blocked_unavailable error UI
   "Pencarian web tidak tersedia saat ini. Coba lagi nanti."
```

## 12. Files to Change

| File | Change | Risk |
|------|--------|------|
| `src/lib/ai/streaming.ts` | Add `getWebSearchModel()`, `getWebSearchFallbackModel()` | Low |
| `src/lib/ai/search-execution-mode.ts` | Rename modes, simplify logic (remove tool readiness check) | Low |
| `src/lib/citations/normalizer.ts` | Add `'perplexity'` case, add `isBlockedSourceDomain()` post-filter | Low |
| `src/app/api/chat/route.ts` | Replace google_search path with Perplexity streamText | Medium |
| `convex/schema.ts` | Add `webSearchModel`, `webSearchFallbackModel` fields | Low |
| `convex/aiProviderConfigs.ts` | Add new fields to create/update mutations + getActiveConfig defaults | Low |
| `src/components/admin/AIProviderConfigEditor.tsx` | Add model inputs, update labels, info banner | Low |
| `src/components/admin/AIProviderFormDialog.tsx` | Mirror web search model fields (if dialog has web search section) | Low |
| `src/components/admin/AIProviderManager.tsx` | Update WebSearchChip to show model names | Low |
| `CLAUDE.md` | Update Web Search section | Low |

### New Files

| File | Purpose |
|------|---------|
| `src/lib/ai/search-source-policy.ts` | Source policy prompt for web search turns |
| `src/lib/ai/blocked-domains.ts` | Domain blocklist + `isBlockedSourceDomain()` filter |

### Test Files

| File | Purpose |
|------|---------|
| `__tests__/blocked-domains.test.ts` | Unit tests for `isBlockedSourceDomain()` |
| `__tests__/perplexity-citations.test.ts` | Unit tests for `normalizePerplexityCitations()` |
| Update existing citation normalizer tests | Verify post-filter applied to all providers |
| Update existing search-execution-mode tests | Verify new mode names and logic |

### Files to Remove

| File | Reason |
|------|--------|
| `src/lib/ai/google-search-tool.ts` | No longer needed — Perplexity doesn't use tool init |

### Files UNCHANGED

- `src/components/chat/InlineCitationChip.tsx` — works with normalized citations
- `src/components/chat/MarkdownRenderer.tsx` — works with normalized citations
- Paper workflow tools — still use mode alternation (web search turn vs function tools turn)
- Billing enforcement — `web_search` multiplier stays 2.0x
- Primary/fallback models (Gemini 2.5 Flash, GPT-5.1) — completely untouched

## 13. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Perplexity doesn't follow Indonesian system prompt well | Medium | Test with system prompt v6 before merge. Perplexity is instruction-following; Indonesian should work. |
| Citation format changes in OpenRouter updates | Low | Normalizer already handles gracefully (returns empty array on error). |
| Both providers down simultaneously | Low | Fail-closed `blocked_unavailable` with clear error UI. |
| Admin enters invalid model ID | Low | Validate model ID format on save. Runtime failure caught by fallback chain. |
| Blocked domain list incomplete | Low | List is a safety net (Layer 2), not primary defense. Expand over time. |
| Source diversity not guaranteed | Medium | Prompt says "Search GLOBALLY" + examples show breadth. Verify with manual testing (diverse source types, not just .ac.id). No deterministic guarantee — acceptable trade-off for search-first model. |
| Source policy prompt too constraining | Low | Names are explicitly labeled as examples ("e.g."), not whitelist. Prompt says "Do NOT limit yourself to only these names." |
| Tool call messages in conversation history | Medium | Perplexity/Grok receive history from Gemini that may contain tool calls. Mitigated by `sanitizeMessagesForSearch()` — strips tool call/result messages before sending. Verify in Phase 3 that context is sufficient after filtering. |
| Malformed URL in citations crashes filter | Low | `isBlockedSourceDomain()` wraps `new URL()` in try/catch. Malformed URLs pass through (not blocked). |
