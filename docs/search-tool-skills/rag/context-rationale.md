# RAG Pipeline — Context & Rationale

## Why This Document Exists

This document explains why a RAG (Retrieval-Augmented Generation) pipeline is needed alongside FetchWeb, what problem it solves that FetchWeb alone cannot, and why the investment is justified for an academic paper writing application.

## Background: FetchWeb

FetchWeb (implemented March 2026) adds a content extraction layer to the web search pipeline. It fetches actual page content from source URLs, converts HTML to markdown via readability + turndown, and provides this content to the compose model as ground truth. Two-tier: primary fetch (Node.js fetch + linkedom + readability + turndown) with Tavily Extract API as fallback for Cloudflare-blocked or JS-rendered sites. Content below 50 characters is discarded (MIN_CONTENT_CHARS filter for trivially short extractions like login pages).

**What FetchWeb solved:**
- Compose model hallucination — the model fabricated claims because it had zero actual page content. It only received the retriever's synthesis (`searchText`) which itself could contain errors.
- Dropping `searchText` from compose context when page content is available eliminated the contamination source.
- Anti-hallucination rules in `COMPOSE_PHASE_DIRECTIVE` (first system message, highest priority) instruct the model to only state facts from verified page content and never fill gaps with training knowledge.

**What FetchWeb cannot solve:**

1. **Truncation loss.** FetchWeb caps page content at 12,000 characters (~3,000 tokens) per source. Academic papers typically run 20,000–60,000+ characters. This means 70–80% of a paper's content is discarded. If the paragraph the user needs is on page 15, it's gone.

2. **Verbatim quoting.** Even with page content in context, LLMs interpret and paraphrase by nature — they predict next tokens, not copy text. When a user asks "show me the exact quote from source [1]", the model generates an approximation, not the actual text. For academic writing, approximate quotes are unacceptable.

3. **Follow-up access.** Page content exists only in the compose context of the search turn. In follow-up turns, it's gone. The user cannot ask "what did source [2] actually say about methodology?" because the content is no longer in context.

4. **Cross-source retrieval.** With 20–50 sources in a paper, the user needs to find relevant passages across all sources — "find paragraphs about qualitative methodology from all my references." FetchWeb provides content per-URL but has no mechanism for semantic search across stored content.

## The Problem: Academic Citation Integrity

The core weakness of every AI paper-writing tool is citation accuracy. Models interpret sources instead of quoting them. A model might write:

> "Menurut penelitian Sudarno (2023), 78% responden menyatakan kepuasan tinggi terhadap layanan publik digital [3]."

But the actual source text says:

> "Dari 450 responden yang disurvei, 352 orang (78,2%) melaporkan tingkat kepuasan 'baik' atau 'sangat baik' terhadap portal layanan publik daring yang diluncurkan pada Januari 2023."

The model's version loses specificity (450 respondents, portal name, launch date, exact percentage) and subtly changes meaning ("kepuasan tinggi" vs "baik atau sangat baik"). In academic writing, this matters — it's the difference between a credible paper and one that fails peer review.

## Proposed Solution: RAG Pipeline

Store fetched content as searchable chunks with vector embeddings. When the model needs to cite or the user asks for a quote, retrieve the exact chunk and present it verbatim.

### Pipeline

```
Source content (from FetchWeb URL fetch OR user document upload)
  → Full markdown (no truncation)
  → Chunking (per paragraph/section, ~500 tokens each)
  → Embedding (Google gemini-embedding-001)
  → Store in Convex (chunks + vectors, native vector search)

When model needs to cite:
  → Semantic search query against stored chunks
  → Retrieve top-k relevant chunks
  → Model quotes verbatim from retrieved chunks
```

### What RAG Adds Over FetchWeb Alone

| Capability | FetchWeb Only | FetchWeb + RAG |
|---|---|---|
| Content source | Truncated (12K chars) | Full document, all chunks |
| Quote accuracy | Model interprets/paraphrases | Verbatim from stored chunk |
| Follow-up access | Lost after search turn | Persistent in DB |
| Cross-source search | Not possible | Semantic search across all sources |
| Upload integration | Separate pipeline | Same pipeline |

### Two Use Cases, One Pipeline

1. **FetchWeb sources** — URL fetched by search pipeline → markdown → chunk → embed → store
2. **User uploads** — PDF/DOCX uploaded by user → extract → markdown → chunk → embed → store

Both produce markdown. Both enter the same chunking → embedding → storage pipeline. The RAG infrastructure serves both without duplication.

## Infrastructure Assessment

### Already Available (No New Services)

- **Convex vector search** — native, built-in, included in current pricing. Supports cosine similarity, up to 4,096 dimensions, 256 results per query. Already the project's database.
- **Google API key** — already configured (`GOOGLE_GENERATIVE_AI_API_KEY`). Same key works for embedding models.
- **File extraction** — already implemented for uploads (`src/lib/file-extraction/`). Produces text from PDF, DOCX, PPTX, XLSX.

### New Components Needed

- **Chunking logic** — split markdown into ~500-token paragraphs/sections
- **Embedding calls** — Google `gemini-embedding-001` API integration
- **Convex schema** — new table with vector index for chunks
- **Retrieval tool or context injection** — mechanism for model to access chunks

### Cost

| Volume | Embedding Cost | Storage Cost |
|---|---|---|
| 1,000 papers/month, 50 chunks each | **$0** (Google free tier) | Included in Convex plan |
| 10,000 papers/month | ~$4.50/month (Google paid) | Included in Convex plan |

Google's free tier allows ~60 requests/minute. At 50 chunks per paper with batching, this handles moderate production load without cost.

## Risks

1. **Chunking quality** — bad chunk boundaries = bad retrieval. Academic papers have specific structures (abstract, introduction, methodology) that generic paragraph splitting might not respect. May need section-aware chunking.

2. **Embedding relevance** — semantic similarity doesn't always equal citation relevance. "metodologi kualitatif" might match chunks about "qualitative research design" but miss a chunk that uses different terminology for the same concept.

3. **Latency** — embedding 50 chunks adds ~2-5 seconds. Must run in background (after response) to avoid blocking the user.

4. **Convex vector search limitations** — cosine similarity only, no hybrid search (keyword + semantic). May need workarounds for exact-match queries.

## Decision

RAG is justified because:
- The truncation problem is real and measurable (70-80% content loss)
- Verbatim quoting is a hard requirement for academic integrity
- Infrastructure cost is zero (Convex native + Google free tier)
- The pipeline serves both web fetch and document upload
- It builds on FetchWeb rather than replacing it

## Related Documents

- `docs/search-tool-skills/fetchweb/README.md` — FetchWeb problem statement and proposed direction
- `docs/plans/2026-03-16-fetchweb-content-extraction-design.md` — FetchWeb design document
- `docs/search-tool-skills/rag/design.md` — RAG pipeline design (to be written)
- `docs/search-tool-skills/rag/implementation-plan.md` — RAG implementation plan (to be written)
