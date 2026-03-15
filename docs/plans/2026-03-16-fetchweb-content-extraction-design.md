# FetchWeb Content Extraction — Design Document

**Date:** 2026-03-16
**Status:** Approved
**Problem doc:** `docs/search-tool-skills/fetchweb/README.md`

## Problem

The compose model (Gemini 2.5 Flash) hallucinates because it receives zero actual page content. Both inputs are retriever-generated:

- `searchText` — retriever's synthesized prose (can hallucinate)
- `citedText` — retriever's own text mapped back to URLs by Google Grounding (circular)

The compose model has no ground truth to verify claims against. Prompt engineering (INFORMATION SUFFICIENCY in SKILL.md) does not fix this — Gemini Flash ignores insufficiency instructions on biographical/factual queries.

## Rejected Alternative: Jina Reader

Jina Reader (r.jina.ai) was tested before this design. Results: 60% failure rate on Indonesian websites, 20-32s latency, Kompas.com blocked by Jina's anti-DDoS, government domains (.go.id) DNS resolution failures. Not viable. This motivated the two-tier approach (local fetch primary + Tavily fallback) instead of relying on a single external extraction service.

## Solution: FetchWeb Layer

Add a content extraction step between retriever search (Phase 1) and compose (Phase 2). Fetch actual page content from source URLs, convert to markdown, and include in compose context as ground truth.

**Retriever-agnostic:** FetchWeb only consumes `sources[].url` from the retriever output. It works with any retriever (Perplexity, Grok, Google Grounding, or future retrievers) since all retrievers produce `NormalizedCitation[]` with URLs. No coupling to any specific retriever.

## Architecture

```
Phase 1: Retriever (existing, blocking)     → searchText + sources[]
Stream starts (first byte sent to client)
Phase 1.5: FetchWeb (NEW, inside execute)   → pageContent per source
Phase 2: Compose (existing, richer context) → response with ground truth
```

FetchWeb runs inside the stream `execute` callback, after `writer.write({ type: "start" })`. This ensures Vercel's first-byte timeout is already satisfied — the function can run for up to 300s (Edge) or 1-14min (Fluid Compute) after streaming begins.

## FetchWeb Two-Tier Fallback

```
Per URL (parallel via Promise.allSettled):
  Primary:  Node.js fetch() + linkedom + @mozilla/readability + turndown → markdown
  Fallback: @tavily/core .extract() batch for failed URLs only
  Final:    proceed without pageContent (current behavior, per-URL graceful degradation)
```

### Primary Tier: fetch + readability

- Standard `fetch()` with browser User-Agent + `Accept-Language: id-ID`
- linkedom for DOM implementation (920 KB, vs jsdom 6.9 MB)
- @mozilla/readability extracts article content (clean HTML)
- turndown converts HTML → markdown (token-efficient for LLM)
- Zero cost, ~0.5-2s latency per page
- Fails on: Cloudflare-protected sites, JS-rendered SPAs

### Fallback Tier: Tavily Extract

- `@tavily/core` SDK, `.extract()` method
- `TAVILY_API_KEY` already in `.env.local` (needs adding to Vercel env)
- Basic mode: 1 credit per 5 successful URLs, free 1,000 credits/month (= 5,000 pages)
- Returns `raw_content` in markdown format
- Handles Cloudflare, JS-rendered pages
- Only called for URLs that fail primary tier

## Open Questions — Decisions

### Where does fetching happen?

Inside stream `execute` callback, after Phase 1 completes and stream starts. This avoids Vercel timeout issues since first byte is already sent.

### How many URLs to fetch?

All sources from retriever, capped at 7. Retriever already filters for relevance. No additional scoring in pipeline per CLAUDE.md principle: "tools are simple executors."

### Token budget per page?

3,000 tokens per page, truncated. 7 pages × 3K = 21K tokens. Context window 128K, current usage ~9K, remaining ~119K. Budget is safe at ~18% of remaining capacity.

### searchText kept, replaced, or used alongside?

Kept alongside pageContent. searchText provides narrative structure for compose. pageContent provides ground truth for verification. Different functions, both needed.

### How does SKILL.md change?

Add CONTENT VERIFICATION section:
- Cross-reference claims against Page content, not just Search findings
- If Page content contradicts Search findings, trust Page content
- Sources without Page content are flagged as unverified
- No strong factual assertions from unverified sources alone

### What happens when both fetch() and Tavily fail for a URL?

Source remains in compose context without pageContent. Marked "unverified" in context. Compose model instructed to treat with lower confidence. Flow never breaks.

### Retriever chain pattern?

Two-tier per URL, not sequential like retriever chain. Primary fetch for all URLs in parallel, then Tavily batch for failures only.

### Sequential or parallel? Timeout?

Parallel via `Promise.allSettled()`. 5s timeout per URL (AbortController). No batch-level timeout needed — parallel execution means max primary tier duration equals the slowest single URL (~5s). Tavily fallback: uses its own default timeout (~10s), only called for URLs that fail primary tier.

### Paper mode vs chat mode?

Same — both use FetchWeb. Paper mode is even more critical (academic integrity). FetchWeb lives in orchestrator, shared by both modes.

## Components

### 1. `src/lib/ai/web-search/content-fetcher.ts` (NEW)

```typescript
interface FetchedContent {
  url: string
  pageContent: string | null  // markdown, truncated ~3000 tokens
  fetchMethod: "fetch" | "tavily" | null  // for telemetry
}

export async function fetchPageContent(
  urls: string[],
  options?: { tavilyApiKey?: string; timeoutMs?: number }
): Promise<FetchedContent[]>
```

No scoring, filtering, or quality judgment. Fetch → parse → return.

### 2. `orchestrator.ts` (MODIFIED)

- Move `buildSearchResultsContext()` call inside `execute` callback (currently before stream)
- Add Phase 1.5 FetchWeb call between stream start and compose
- Emit `data-search` status `"fetching-content"` during fetch
- Enrich sources with pageContent before building context

### 3. `search-results-context.ts` (MODIFIED)

SearchSource interface gains `pageContent?: string`. Output format changes conditionally:

**When at least one source has pageContent (FetchWeb working):**
```
Sources:
1. Title — URL
   Snippet: <citedText>
   Page content (verified):
   <truncated markdown>

2. Title — URL
   [no page content — unverified source]

Search findings (raw):
<searchText>
```

**When NO source has pageContent (FetchWeb entirely failed/unavailable):**
```
Sources:
1. Title — URL
   Snippet: <citedText>

Search findings (raw):
<searchText>
```

This conditional behavior prevents the compose model from seeing ALL sources as "unverified" when FetchWeb is down — which would be worse than the current pipeline (compose becomes too cautious). When FetchWeb is unavailable, behave exactly like the current pipeline.

### 4. SKILL.md (MODIFIED)

Add CONTENT VERIFICATION section after INFORMATION SUFFICIENCY. Per language policy constraint, all model instructions must be in English.

### 5. Types — pageContent is NOT added to NormalizedCitation

pageContent is a compose-context concern, not a citation metadata concern. It lives in SearchSource (compose context builder), not NormalizedCitation (citation system).

## Dependencies

| Package | Size | Purpose |
|---|---|---|
| `@mozilla/readability` ^0.6.0 | 155 KB | Article extraction from HTML |
| `linkedom` ^0.18.0 | 920 KB | Lightweight DOM for readability |
| `turndown` ^7.2.0 | 192 KB | HTML → Markdown conversion |
| `@tavily/core` latest | TBD | Tavily Extract SDK (fallback) |
| **Total added** | **~1.3 MB + Tavily** | |

## Error Handling

| Scenario | Behavior |
|---|---|
| fetch() non-200 | Mark failed, try Tavily |
| fetch() timeout >5s | Abort, mark failed, try Tavily |
| readability returns empty | Mark failed, try Tavily |
| Tavily failed_results | Source gets no pageContent, marked "unverified" |
| Tavily API down | Skip Tavily tier, fetch-only results stand |
| All URLs fail both tiers | Proceed with searchText only (current behavior) |
| TAVILY_API_KEY not configured | Skip Tavily tier entirely |

No error breaks the flow. Every failure = graceful degradation.

## Risks

1. **linkedom + readability compatibility** — untested combination. Mitigation: test with 10 sample Indonesian URLs before committing. Fallback: swap to jsdom (+6.9 MB).

2. **Added latency 2-5s** — user waits longer before compose text appears. Mitigation: UI status "Mengambil konten sumber..." during fetch.

3. **Token budget edge case** — unusually long pages after truncation. Mitigation: hard cap 3,000 tokens per page, 21K total for all pageContent.

## Files Changed

| File | Change |
|---|---|
| `package.json` | Add 4 dependencies |
| `src/lib/ai/web-search/content-fetcher.ts` | NEW — fetch + parse + Tavily fallback |
| `src/lib/ai/web-search/orchestrator.ts` | Add Phase 1.5, move context build + compose streamText into execute |
| `src/lib/ai/web-search/types.ts` | Add `tavilyApiKey?: string` to `WebSearchOrchestratorConfig` |
| `src/lib/ai/search-results-context.ts` | Add pageContent to SearchSource, conditional verified/unverified labels |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | Add CONTENT VERIFICATION section (English) |
| `src/components/chat/SearchStatusIndicator.tsx` | Add `"fetching-content"` to `SearchStatus` type + display text |
| `src/app/api/chat/route.ts` | Wire `process.env.TAVILY_API_KEY` to orchestrator config |
| Vercel env vars | Add `TAVILY_API_KEY` to Vercel project environment |
