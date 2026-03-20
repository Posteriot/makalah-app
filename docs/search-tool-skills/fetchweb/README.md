# FetchWeb — Content Extraction for Search Hallucination Prevention

## Problem Statement

The web search pipeline suffered from compose model hallucination. The compose model (Gemini 2.5 Flash) fabricated claims with high confidence and attributed them to sources it never read.

### Evidence

Query: "Siapa Erik Supit?" — the compose model fabricated:
- Film credits ("Guru Bangsa Tjokroaminoto 2015", "Moonrise Over Egypt 2017", "Pulung Gantung - Pati Ngendat 2025") that don't exist
- Biographical details inferred from URL patterns and page titles
- When challenged, fabricated "corrections" citing radartasik.id, moviefone.com, themoviedb.org — sources it never read
- The actual person (the user) confirmed none of this is true

### Root Cause Analysis

The compose model received two inputs, both unreliable:

1. **`searchText`** — the retriever model's synthesized prose. The retriever (Gemini with Google Search via direct `@ai-sdk/google` API) generates this text. It reads web pages internally but the generated text can contain hallucinations.

2. **`sources[]`** — URL + title + `citedText`. But `citedText` is NOT actual page content. It is the retriever's OWN generated text mapped back to source URLs by Google Grounding (`groundingSupports[].segment.text`). This is circular — hallucinated text citing itself.

Neither input contained actual web page content. The compose model had no way to verify claims against real source material.

### What Was Tried Before FetchWeb

1. **Propagate `citedText` to compose context** — Done. Works mechanically, but `citedText` from Google Grounding is the retriever's own text, not page content. Does not solve hallucination.

2. **INFORMATION SUFFICIENCY skill section** — Done. Added to SKILL.md instructing the model to declare gaps instead of fabricating. Gemini Flash ignores these instructions on biographical/factual queries and fabricates with confidence anyway.

3. **Jina Reader (r.jina.ai)** — Tested. 60% failure rate on Indonesian websites. 20-32s latency. Kompas.com blocked by Jina's anti-DDoS. Government domains (.go.id) DNS resolution failures. Not viable.

### Why This Matters

This application serves academic paper writing. Hallucinated citations destroy academic integrity, damage user trust, and would kill the product's reputation.

## Solution: FetchWeb (Implemented)

FetchWeb adds a content extraction phase (Phase 1.5) between retriever search and compose. It fetches actual page content from source URLs, converts to markdown, and provides this as ground truth to the compose model.

### Architecture

```
Phase 1: Retriever Search (silent, blocking)
  User message → retriever chain → searchText + sources[]

Phase 1.5: FetchWeb (inside stream execute — Vercel timeout safe)
  sources[].url (max 7)
    → Primary: fetch() + linkedom + readability + turndown → markdown
    → Fallback: @tavily/core .extract() for failed URLs
    → Metadata extraction: author, date, site from readability + HTML meta tags
    → Output: pageContent (truncated 12K for compose) + fullContent (raw for RAG)

Phase 2: Compose (streaming to client)
  COMPOSE_PHASE_DIRECTIVE (anti-hallucination rules, position #1)
  + searchResultsContext (with verified page content per source)
  + systemPrompt + SKILL.md + fileContext
  → compose model → streaming response

  KEY: searchText DROPPED when page content available (eliminates contamination)

Phase 3: RAG Ingest (background, after compose)
  fullContent → chunk (~500 tokens) → embed (gemini-embedding-001) → Convex vectorIndex
  → Available for verbatim quoting in follow-up turns
```

### What FetchWeb Solved

1. **Hallucination from searchText** — `searchText` (retriever synthesis) was the primary contamination source. When page content is available, searchText is dropped from compose context entirely. The compose model only sees actual page content.

2. **Anti-hallucination enforcement** — `COMPOSE_PHASE_DIRECTIVE` (position #1, highest priority) instructs: "You may ONLY state facts that appear in Page content (verified) sections. NEVER add details from training knowledge."

3. **Identity disambiguation** — SKILL.md CONTENT VERIFICATION section: when sources attribute contradictory identities to the same name, present separately. Don't merge profiles from different people.

4. **Inline domain pollution** — SKILL.md bans embedding domain names in response text. Sources referenced only by citation number [1], [2], etc.

### What FetchWeb Cannot Solve (Addressed by RAG)

1. **Truncation loss** — FetchWeb caps page content at 12,000 chars for compose context. Academic papers run 20,000-60,000+ chars. RAG stores full content as chunks for later retrieval.

2. **Verbatim quoting** — Even with page content in context, LLMs paraphrase. RAG tools (`quoteFromSource`) retrieve exact chunks for verbatim citation.

3. **Follow-up access** — Page content exists only in the compose turn's context. RAG persists chunks in Convex for retrieval in any subsequent turn.

4. **Cross-source retrieval** — Finding specific passages across 20-50 sources requires semantic search. RAG tool `searchAcrossSources` provides this.

See `docs/search-tool-skills/rag/` for RAG pipeline documentation.

### Implementation Details

**Primary tier: fetch + readability**
- Node.js `fetch()` with browser User-Agent + `Accept-Language: id-ID`
- `linkedom` for DOM (920 KB, vs jsdom 6.9 MB)
- `@mozilla/readability` extracts article content (clean HTML)
- `turndown` converts HTML → markdown
- Metadata extraction: `article.byline`, `article.publishedTime`, `article.siteName` + HTML meta tags (`citation_author`, `og:author`, `article:author`, etc.)
- Zero cost, ~0.5-2s latency per page
- Fails on: Cloudflare-protected sites, JS-rendered SPAs
- `MIN_CONTENT_CHARS = 50` filter for trivially short extractions

**Fallback tier: Tavily Extract**
- `@tavily/core` SDK, `.extract()` method
- Handles Cloudflare, JS-rendered pages
- 1 credit per 5 successful URLs, free 1,000 credits/month
- Only called for URLs that fail primary tier

**FetchedContent interface:**
```typescript
interface FetchedContent {
  url: string
  pageContent: string | null      // truncated for compose context
  fullContent: string | null       // raw for RAG ingest
  fetchMethod: "fetch" | "tavily" | null
}
```

### Decisions Made (Previously Open Questions)

| Question | Decision | Reasoning |
|---|---|---|
| Where does fetching happen? | Inside stream `execute` callback, after Phase 1 | Vercel timeout safe — first byte already sent |
| How many URLs? | All sources, max 7 | Retriever already filters relevance. No scoring in pipeline. |
| Token budget per page? | 12,000 chars (~3,000 tokens) truncated for compose | 7 × 3K = 21K tokens. ~18% of 119K available. Full content goes to RAG. |
| searchText kept? | Dropped when page content available | searchText was the contamination source. Page content replaces it. |
| SKILL.md changes? | Added: CONTENT VERIFICATION, identity disambiguation, no inline domains, verbatim quoting tools | Multiple iterations to find what Gemini Flash actually follows. |
| Both fetch + Tavily fail? | Graceful degradation per-URL, never breaks flow | Sources without pageContent marked "[no page content — unverified source]" |
| Sequential or parallel? | Parallel fetch (Promise.allSettled), sequential RAG ingest | Fetch: latency = slowest single URL. RAG: sequential to avoid embedding rate limits. |
| Paper vs chat mode? | Same — shared orchestrator | Paper mode even more critical for academic integrity. |

### Key Files

| File | Description |
|------|-------------|
| `src/lib/ai/web-search/content-fetcher.ts` | FetchWeb: fetch + readability + turndown + metadata, Tavily fallback |
| `src/lib/ai/web-search/orchestrator.ts` | Three-phase flow + RAG ingest fire-and-forget |
| `src/lib/ai/search-results-context.ts` | Build compose context with pageContent, conditional verified/unverified labels |
| `src/lib/ai/rag-ingest.ts` | Core RAG pipeline: chunk → embed → store |
| `src/lib/ai/chunking.ts` | Section-aware content chunker |
| `src/lib/ai/embedding.ts` | Google gemini-embedding-001 with retry + retry-after |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | Compose instructions: content verification, disambiguation, quoting tools |

## Related Documents

- `docs/search-tool-skills/README.md` — architecture principles (updated)
- `docs/search-tool-skills/rag/context-rationale.md` — why RAG + FetchWeb
- `docs/search-tool-skills/rag/design.md` — RAG pipeline design
- `docs/search-tool-skills/rag/known-issues.md` — known issues and resolution status
- `docs/plans/2026-03-16-fetchweb-content-extraction-design.md` — original FetchWeb design
- `docs/search-tool-skills/enforcement/README.md` — full technical documentation
- `docs/superpowers/specs/2026-03-15-search-anti-hallucination-design.md` — Layer 1+2 design (pre-FetchWeb)

## Screenshots

Evidence of hallucination (before FetchWeb):
- `screenshots/Screen Shot 2026-03-15 at 19.54.38.png` — first hallucination case
- `screenshots/Screen Shot 2026-03-15 at 19.54.47.png`
- `screenshots/Screen Shot 2026-03-15 at 19.54.57.png`
- `screenshots/Screen Shot 2026-03-16 at 01.36.13.png` — second test after Layer 1+2, still hallucinates
- `screenshots/Screen Shot 2026-03-16 at 01.36.19.png`
- `screenshots/Screen Shot 2026-03-16 at 01.36.44.png`
- `screenshots/Screen Shot 2026-03-16 at 01.36.53.png`

After FetchWeb + searchText removal:
- `screenshots/Screen Shot 2026-03-16 at 05.54.27.png` — accurate results, no fabrication
