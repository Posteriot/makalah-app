# FetchWeb — Content Extraction for Search Hallucination Prevention

## Problem Statement

The web search pipeline suffers from compose model hallucination. The compose model (Gemini 2.5 Flash) fabricates claims with high confidence and attributes them to sources it never read.

### Evidence

Query: "Siapa Erik Supit?" — the compose model fabricated:
- Film credits ("Guru Bangsa Tjokroaminoto 2015", "Moonrise Over Egypt 2017", "Pulung Gantung - Pati Ngendat 2025") that don't exist
- Biographical details inferred from URL patterns and page titles
- When challenged, fabricated "corrections" citing radartasik.id, moviefone.com, themoviedb.org — sources it never read
- The actual person (the user) confirmed none of this is true

### Root Cause Analysis

The compose model receives two inputs:

1. **`searchText`** — the retriever model's synthesized prose. The retriever (Gemini with Google Search via direct `@ai-sdk/google` API) generates this text. It reads web pages internally but the generated text can contain hallucinations.

2. **`sources[]`** — URL + title + `citedText`. But `citedText` is NOT actual page content. It is the retriever's OWN generated text mapped back to source URLs by Google Grounding (`groundingSupports[].segment.text`). This is circular — hallucinated text citing itself.

Neither input contains actual web page content. The compose model has no way to verify claims against real source material. It operates on a retriever synthesis that may be wrong, and citation metadata that confirms the retriever's own output.

### What We Already Tried

1. **Propagate `citedText` to compose context** — Done. Works mechanically, but `citedText` from Google Grounding is the retriever's own text, not page content. Does not solve hallucination.

2. **INFORMATION SUFFICIENCY skill section** — Done. Added to SKILL.md instructing the model to declare gaps instead of fabricating. Gemini Flash ignores these instructions on biographical/factual queries and fabricates with confidence anyway.

3. **Jina Reader (r.jina.ai)** — Tested. 60% failure rate on Indonesian websites. 20-32s latency. Kompas.com blocked by Jina's anti-DDoS. Government domains (.go.id) DNS resolution failures. Not viable.

### Why This Matters

This application serves academic paper writing. Hallucinated citations destroy academic integrity, damage user trust, and would kill the product's reputation. This is not a nice-to-have fix.

## Proposed Direction: FetchWeb

The hypothesis: if the compose model receives **actual page content** (not just retriever synthesis), it can verify claims against real source material and avoid fabrication.

Two candidate mechanisms identified:

### 1. Node.js `fetch()` + HTML Parser

- Standard `fetch()` with browser User-Agent headers
- Parse HTML to clean text/markdown using `@mozilla/readability` or `cheerio`
- Runs on the server (Next.js serverless on Vercel)
- Zero cost, ~0.5-2s latency per page
- Limitations: fails on Cloudflare-protected sites, JS-rendered SPAs
- Likely works for: .go.id sites, academic repositories, simple news sites

### 2. Tavily Extract API (Fallback)

- `POST https://api.tavily.com/extract` with URLs
- Returns `raw_content` (full page markdown)
- Accepts up to 20 URLs per request
- Cost: 1 credit per 5 successful URLs, free 1,000 credits/month (= 5,000 pages)
- `TAVILY_API_KEY` already configured in `.env.local` (prefix: `tvly-`)
- Needs to be added to Vercel environment variables

### Evaluated but Not Viable

- **Cloudflare markdown.new** (`https://markdown.new/{url}`): Free service that converts HTML to clean markdown via three-tier fallback (Accept header → Workers AI → Browser Rendering). 500 requests/day per IP, no paid tier. Good as a technique (`Accept: text/markdown` header to Cloudflare-enabled sites) but unreliable for production — no SLA, no way to scale beyond 500/day, rate limit tied to server IP not API key.

### Open Questions (Not Yet Decided)

- Where in the pipeline does fetching happen? After search? During search? Replacing search?
- How many URLs to fetch? All sources? Top-N? Based on what criteria?
- Token budget: full page content vs truncated? How much per page?
- Should `searchText` be kept, replaced, or used alongside fetched content?
- How does SKILL.md change when actual content is available?
- What happens when both `fetch()` and Tavily fail for a URL?
- Does the retriever chain pattern apply here (fetch chain with fallback)?
- Performance: sequential or parallel fetching? Timeout strategy?
- How does this interact with paper mode stages vs chat mode?

## Current Pipeline Architecture

```
Phase 1: Retriever Search (silent, before streaming)
  ┌─────────────────────────────────────────────┐
  │ User message                                │
  │   → augmentUserMessageForSearch()           │
  │   → streamText() with retriever model       │
  │   → searchText (retriever synthesis)        │
  │   → extractSources() → sources[] (URLs)     │
  └─────────────────────────────────────────────┘
                    │
                    ▼
Phase 2: Compose (streaming to client)
  ┌─────────────────────────────────────────────┐
  │ COMPOSE_PHASE_DIRECTIVE                     │
  │ + searchResultsContext (sources + searchText)│
  │ + systemPrompt                              │
  │ + SKILL.md (with INFORMATION SUFFICIENCY)   │
  │ → streamText() to client                    │
  └─────────────────────────────────────────────┘
```

Key files:
- `src/lib/ai/web-search/orchestrator.ts` — two-pass flow
- `src/lib/ai/search-results-context.ts` — builds compose context
- `src/lib/ai/skills/web-search-quality/SKILL.md` — compose instructions
- `src/lib/ai/web-search/retrievers/*.ts` — strategy pattern retrievers
- `src/lib/citations/normalizer.ts` — two normalizers: `normalizeSourcesList()` (AI SDK) and `normalizeGoogleGrounding()` (Google direct API)

## Constraints

- Architecture principle: tools are simple executors, skills provide intelligence, code pipeline is minimal
- Retriever-agnostic: any retriever can be swapped via admin panel config
- Language policy: all model instructions in English, output in Indonesian
- Vercel serverless deployment (Next.js)
- Token budget: ~119K tokens available in 128K context window (current usage ~9K)

## Related Documents

- `docs/search-tool-skills/README.md` — architecture principles
- `docs/search-tool-skills/enforcement/README.md` — full technical documentation
- `docs/search-tool-skills/architecture-constraints.md` — constraints and rules
- `docs/superpowers/specs/2026-03-15-search-anti-hallucination-design.md` — Layer 1+2 design (citedText + INFORMATION SUFFICIENCY)

## Screenshots

Evidence of hallucination:
- `screenshots/Screen Shot 2026-03-15 at 19.54.38.png` — first hallucination case
- `screenshots/Screen Shot 2026-03-15 at 19.54.47.png`
- `screenshots/Screen Shot 2026-03-15 at 19.54.57.png`
- `screenshots/Screen Shot 2026-03-16 at 01.36.13.png` — second test after Layer 1+2, still hallucinates
- `screenshots/Screen Shot 2026-03-16 at 01.36.19.png`
- `screenshots/Screen Shot 2026-03-16 at 01.36.44.png`
- `screenshots/Screen Shot 2026-03-16 at 01.36.53.png`
