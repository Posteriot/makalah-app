# Web Search Tool Migration: google_search → Perplexity Sonar

## Background

Makalah AI uses web search to find credible sources for academic paper writing. The current implementation uses `google_search` (Google Grounding) via Vercel AI Gateway with Gemini 2.5 Flash. This document captures findings from an attempted migration to `parallel_search` (Parallel AI) and the decision to migrate to Perplexity Sonar instead.

## Current State (main branch)

### Architecture
- **Primary**: Vercel AI Gateway → Gemini 2.5 Flash + `google_search` (grounding tool)
- **Fallback**: OpenRouter → any model + `:online` suffix
- **Citation flow**: `google_search` → onFinish extracts `groundingSupports` → stream citations → `InlineCitationChip` renders `[1]`, `[2]`

### Key Files
- `src/app/api/chat/route.ts` — Chat streaming endpoint, web search mode router
- `src/lib/ai/streaming.ts` — `getGatewayModel()`, `getOpenRouterModel()`, `getGoogleSearchTool()`
- `src/lib/ai/google-search-tool.ts` — Google Search tool initialization
- `src/lib/ai/search-execution-mode.ts` — Determines when to enable web search
- `src/lib/citations/normalizer.ts` — `normalizeCitations()` for citation extraction
- `src/components/chat/InlineCitationChip.tsx` — Citation hover preview chip

### How google_search Works (Grounding)
1. Model receives user query + `google_search` tool
2. Google **searches first**, returns results to the model
3. Model **writes response based on search results** (grounded)
4. Citations extracted from `groundingSupports` in `onFinish`

### Known Problems with google_search
1. **No source control** — Cannot exclude/include domains. Wikipedia, blogs, forums appear freely
2. **Black box** — Google's ranking is opaque, no way to influence source quality
3. **Cannot mix tools** — `google_search` is provider-defined, cannot be used alongside function tools (createArtifact, paper tools) in the same request

## Failed Attempt: Parallel Search (parallel_search)

### What Was Tried
Migrated from `google_search` to `parallel_search` via `gateway.tools.parallelSearch()`. This tool offers:
- `sourcePolicy.excludeDomains` — API-level domain blocking (up to 10 domains)
- `sourcePolicy.includeDomains` — Restrict results to specific domains
- `maxResults` configuration

### Why It Failed — Fundamental Flaw
**parallel_search is provider-executed with write-before-search behavior:**
1. Model **writes text first** (from internal memory, WITHOUT search results)
2. Model calls `parallel_search`
3. Gateway executes search AFTER text is written
4. Results appear as "supporting references" — disconnected from the text

**Consequences:**
- **High hallucination risk** — Model writes "facts" from potentially outdated/incorrect memory, then search results are tacked on as if they support the text
- **Illusion of grounding** — User sees citations, assumes text is based on sources, but it's not
- **Generic responses** — Model can only write from training data, not from current web data
- **Source diversity uncontrollable** — Despite prompt instructions for diverse sources (news media, academic, international), the search query constructed by the model was always narrow, returning only .ac.id and .go.id sites

### Prompt Engineering Attempts (All Failed)
1. "Preferred Sources (in priority order)" hierarchy → Model stuck in academic-only scope
2. Removed hierarchy, "use freely, no hierarchy" → No change in search results
3. "Search GLOBALLY", bilingual query strategy → No change
4. "Minimum 3 paragraphs" → Model skipped text entirely on follow-ups
5. Flexible text requirement → Still brief, generic, ungrounded responses

### Key Learning
- **Provider-executed tools** (parallel_search, google_search) execute search on the provider's servers
- **Grounding tools** (google_search) feed results TO the model before it writes → grounded
- **Non-grounding provider tools** (parallel_search) let model write first → ungrounded, dangerous
- No amount of prompt engineering can fix a tool that writes before searching

## Decision: Migrate to Perplexity Sonar

### Why Perplexity Sonar

| Criteria | google_search | parallel_search | Perplexity Sonar |
|----------|--------------|-----------------|------------------|
| Search order | Search → Write | Write → Search | Search → Write |
| Grounded | Yes | No (dangerous) | Yes |
| Source control | None | excludeDomains | Via prompt + model intelligence |
| Hallucination risk | Low | High | Low |
| Citations | Inline (groundingSupports) | Tacked on after | Inline (built-in) |
| Source transparency | Opaque (Google) | Opaque | Transparent |
| Price | $5/1k | $5/1k | $5/1k (sonar) |
| Available via | AI Gateway | AI Gateway | OpenRouter |

**Perplexity Sonar is the best option because:**
1. **Search-first** — Model searches, reads results, then writes based on actual data. No hallucination risk.
2. **Source transparency** — Perplexity shows which sources it used, unlike Google's black box
3. **Source quality influenceable** — Via system prompt / search prompt, can guide toward credible sources
4. **Already available via OpenRouter** — We have OpenRouter infrastructure (fallback path), minimal integration work
5. **Built-in citations** — Perplexity returns citations inline, similar to what our UI already handles

### Perplexity Sonar Models
- `perplexity/sonar` — Standard search-grounded model
- `perplexity/sonar-pro` — More capable, deeper search
- Available via OpenRouter as `perplexity/sonar` and `perplexity/sonar-pro`
- Also available via Perplexity's own API directly

### Credentials
- `PERPLEXITY_API_KEY` is already configured in `.env.local`
- Can be used directly with Perplexity API, or via OpenRouter with `OPENROUTER_API_KEY` (already configured)

## Reusable Work from parallel_search Attempt

### Domain Blocking (Layer 3 — Post-Processing)
The blocked domain list and `isBlockedSourceDomain()` function are still valuable as a safety net. Regardless of search provider, we should filter out citations from low-quality domains.

```typescript
// Domains to block from citations (post-processing filter)
const BLOCKED_DOMAINS = [
  "wikipedia.org", "wikimedia.org", "wiktionary.org",
  "blogspot.com", "wordpress.com", "medium.com", "substack.com",
  "tumblr.com", "quora.com", "reddit.com", "answers.yahoo.com",
  "scribd.com", "brainly.co.id", "coursehero.com",
]

function isBlockedSourceDomain(url: string): boolean {
  const hostname = new URL(url).hostname.toLowerCase()
  return BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))
}
```

### Source Policy Prompt
Guide the model toward diverse, credible sources (no rigid hierarchy):

```
Search GLOBALLY. Cast a wide net across all credible source types — news media,
academic journals, think tanks, international organizations, and government data.
Do not limit yourself to one category.

Credible Sources (use freely, no hierarchy):
- News media: Kompas, Tempo, Katadata, Tirto, CNN Indonesia, Republika, Reuters, AP News, BBC, NY Times, The Guardian
- Academic: arxiv.org, PubMed, ScienceDirect, Nature, Google Scholar, university repositories
- Organizations: World Bank, UN agencies, IRENA, IEA, WHO, McKinsey, Brookings
- Government data: .go.id, .gov (use as data source, cross-check with independent sources)

Blocked: Wikipedia, personal blogs, forums, unverified document-sharing sites.
```

### System Prompt v6 (Already in DB)
The system prompt was rewritten in English (model's native training language) and is already active in the `systemPrompts` table (version 6). Key improvements:
- All instructions in English for reduced ambiguity
- Language behavior preserved (Jakarta-style informal chat + formal academic artifacts)
- Web search mode section updated (flexible text requirements)
- This prompt is independent of search provider and should be kept

## Requirements for Perplexity Implementation

### Architecture Change
```
BEFORE (current):
  Web search request → AI Gateway → Gemini 2.5 Flash + google_search (grounding)
  Fallback → OpenRouter → model:online

AFTER (target):
  Web search request → OpenRouter → Perplexity Sonar (search-grounded)
  Non-search request → AI Gateway → Gemini 2.5 Flash (unchanged)
  Fallback → OpenRouter → fallback model (unchanged, no web search)
```

### Key Design Decisions Needed
1. **Routing**: When web search is needed, route to Perplexity via OpenRouter instead of Gateway. Non-search requests stay on Gateway + Gemini.
2. **Citation extraction**: Perplexity returns citations in its own format. Need to normalize to our existing `InlineCitationChip` format.
3. **System prompt compatibility**: Perplexity is a different model — test if it follows our system prompt well (Indonesian language, tone, academic style).
4. **Tool isolation**: `google_search` constraint (can't mix with function tools) may not apply to Perplexity. Verify if we can call Perplexity for search AND use function tools in the same turn, or if we still need mode separation.
5. **Fallback strategy**: If Perplexity fails, what happens? Fall back to Gemini without search? Or OpenRouter `:online`?
6. **Admin config**: Update `aiProviderConfigs` schema to support Perplexity as web search provider (separate from primary/fallback model config).
7. **Domain filtering**: Apply `isBlockedSourceDomain()` post-processing on Perplexity citations (Layer 3 safety net).
8. **Source policy injection**: Inject source policy prompt into Perplexity system prompt to guide source selection.

### Constraints
- Cannot mix provider-defined tools with function tools in same request (verify if this applies to Perplexity via OpenRouter)
- Web search mode must remain a separate "turn" from paper tools / artifact tools (existing alternation rules in system prompt)
- Citation UI (InlineCitationChip, MarkdownRenderer) must continue to work with new citation format
- Billing: web_search operation multiplier is 2.0x (unchanged)

### Files to Modify (Estimated)
- `src/lib/ai/streaming.ts` — Add `getPerplexityModel()` or route via OpenRouter
- `src/app/api/chat/route.ts` — Update web search mode to use Perplexity instead of google_search
- `src/lib/ai/search-execution-mode.ts` — May need updates for new provider
- `src/lib/citations/normalizer.ts` — Add Perplexity citation normalization
- `src/lib/ai/search-source-policy.ts` — New file (reuse from parallel_search attempt)
- `convex/schema.ts` — Update aiProviderConfigs if needed
- `CLAUDE.md` — Update Web Search section

### Files Unchanged
- `src/components/chat/InlineCitationChip.tsx` — Should work if citations are normalized correctly
- `src/components/chat/MarkdownRenderer.tsx` — Should work with normalized citations
- Paper workflow tools — Unchanged, still use mode alternation
- Billing enforcement — Unchanged, web_search multiplier stays 2.0x
