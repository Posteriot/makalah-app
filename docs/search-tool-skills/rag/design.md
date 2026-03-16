# RAG Pipeline — Design Document

**Date:** 2026-03-16
**Status:** Approved
**Rationale doc:** `docs/search-tool-skills/rag/context-rationale.md`

## Goal

Enable verbatim quoting and cross-source retrieval for academic paper writing. Store full source content (from web search and uploaded files) as embedded chunks in Convex, retrievable via semantic search.

## Data Flow

Two entry points, one shared pipeline:

```
Entry Point A — FetchWeb (web search):
  orchestrator.ts → fetchPageContent() → full markdown (NO truncation for RAG)
    → background: POST /api/rag/ingest
    → compose context still gets truncated version (12K chars, existing behavior)

Entry Point B — File Upload:
  /api/extract-file → extractedText
    → chain: POST /api/rag/ingest

Shared Pipeline (POST /api/rag/ingest):
  content (markdown/text)
    → chunk (~500 tokens, section-aware)
    → batch embed via gemini-embedding-001
    → store chunks + vectors in Convex sourceChunks table
```

Both entry points fire async — user never waits for RAG ingestion.

## Convex Schema

New `sourceChunks` table:

```typescript
sourceChunks: defineTable({
  conversationId: v.id("conversations"),
  sourceType: v.union(v.literal("web"), v.literal("upload")),
  sourceId: v.string(),        // URL (web) or fileId (upload)
  chunkIndex: v.number(),      // order within document (0, 1, 2, ...)
  content: v.string(),         // chunk text (~500 tokens)
  embedding: v.array(v.float64()),
  metadata: v.object({
    title: v.optional(v.string()),
    pageNumber: v.optional(v.number()),
    sectionHeading: v.optional(v.string()),
  }),
  createdAt: v.number(),
})
  .index("by_conversation", ["conversationId", "createdAt"])
  .index("by_source", ["conversationId", "sourceId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["conversationId", "sourceType"],
  })
```

**768 dimensions** (not 3,072 default) — sufficient for academic text retrieval, better Convex performance, smaller storage. Configurable via gemini-embedding-001's `outputDimensionality` parameter.

## Chunking Strategy

```
Input: markdown/plain text
  → Split by section headings (##, ###) if present
  → Split by paragraph (\n\n) within each section
  → Merge consecutive short paragraphs up to ~500 tokens
  → Chunks exceeding ~500 tokens split at sentence boundary (. ? !)
  → Each chunk stores: chunkIndex, nearest sectionHeading in metadata
```

**Why ~500 tokens:**
- gemini-embedding-001 max is 2,048 — 500 is safely below
- Large enough to contain a complete argument/paragraph (verbatim quoting needs full paragraphs)
- Small enough for retrieval precision (2,000 token chunks = too much noise)

**Section-aware splitting:** Academic papers have structure (Abstract, Introduction, Methodology). Headings become chunk boundaries to avoid mixing sections. `sectionHeading` stored in metadata for retrieval context.

**Edge cases:**
- No headings (plain text) → split by paragraph only
- Very long paragraph (>500 tokens) → split at sentence boundary
- Very short document (<500 tokens) → single chunk

## Embedding & Ingestion

### API Route: POST /api/rag/ingest

Next.js API route (not Convex action) — same pattern as `/api/extract-file`. Handles chunking, embedding, and storage.

```
Input: { conversationId, sourceType, sourceId, content, metadata }

1. Dedup check: query sourceChunks.by_source — if sourceId already exists, skip
2. Chunk content (section-aware strategy above)
3. Batch embed via Google Generative AI:
   - Model: gemini-embedding-001
   - taskType: "RETRIEVAL_DOCUMENT"
   - outputDimensionality: 768
   - Parallel: 10 concurrent requests via Promise.allSettled
   - 50 chunks = 5 batches × 10 parallel = ~2-3 seconds
4. Store chunks + vectors via Convex mutation (ingestChunks)
```

### When Ingest Is Triggered

- **Web search:** Background, after compose response sent to user. Orchestrator fire-and-forget to `/api/rag/ingest` with full (non-truncated) FetchWeb content.
- **File upload:** After `/api/extract-file` succeeds, chain to `/api/rag/ingest` with `extractedText`.
- Both async — user does not wait.

### Dedup

Before ingesting, check `sourceChunks.by_source` index. If sourceId already exists for this conversation, skip. Prevents duplicate embedding when same URL appears in multiple searches.

## Retrieval — Two Tools

### Tool 1: `quoteFromSource`

**Use case:** "Kutipannya mana dari sumber [1]?" — user explicitly asks for a quote.

```
Input: { sourceId: string, query: string }

1. Embed query with taskType: "RETRIEVAL_QUERY", 768 dimensions
2. Convex vectorSearch on sourceChunks:
   - filter: conversationId + sourceId
   - limit: 5
3. Return top-5 chunks with full content
4. Model quotes verbatim from returned chunks
```

### Tool 2: `searchAcrossSources`

**Use case:** Paper writing — "Cari paragraf tentang metodologi kualitatif dari semua referensi saya."

```
Input: { query: string, sourceType?: "web" | "upload" }

1. Embed query with taskType: "RETRIEVAL_QUERY", 768 dimensions
2. Convex vectorSearch on sourceChunks:
   - filter: conversationId (+ optional sourceType)
   - limit: 10
3. Return top-10 chunks from various sources
   - Each with: content, sourceId, sectionHeading, chunkIndex
4. Model synthesizes from chunks, quotes verbatim when citing
```

### Why Tool Calls, Not Auto-Inject

- Auto-inject = chunks in every turn even when not needed. Wastes tokens.
- Tool call = model requests chunks when needed. Efficient.
- Model already uses tools in paper mode (updateStageData, createArtifact, etc.)
- SKILL.md instructs when to use each tool.

### Query Embedding

- Embed user query or model-generated search query
- taskType: `"RETRIEVAL_QUERY"` (optimized for queries, different from `"RETRIEVAL_DOCUMENT"` for chunks)
- Same 768 dimensions as stored chunks

## Error Handling

| Scenario | Behavior |
|---|---|
| Embedding API fails | Retry 3x with exponential backoff. If still fails, store chunks WITHOUT embedding (content preserved, not vector-searchable). Log warning. |
| Convex mutation fails | Retry 3x. If fails, log error. Search response still works — RAG is enhancement, not dependency. |
| vectorSearch returns 0 results | Model gets empty array. SKILL.md instructs: inform user that specific quote is not available. |
| Chunk too short after split (<50 chars) | Skip, don't embed. |
| sourceId already exists (dedup) | Skip ingest. Return existing chunk count. |
| File extraction fails | No content to ingest. RAG skips. File keeps "failed" status in UI as-is. |
| FetchWeb fails (all URLs fail) | No content to ingest. Compose uses searchText fallback (current behavior). RAG skips. |

**Core principle:** RAG never breaks existing flow. All failures = graceful degradation to pre-RAG behavior.

## Files Changed

| File | Change |
|---|---|
| **Convex** | |
| `convex/schema.ts` | Add `sourceChunks` table with vectorIndex |
| `convex/sourceChunks.ts` | NEW — mutations: `ingestChunks`, `getBySource`, `deleteBySource`. Action: `searchByEmbedding` |
| **API Routes** | |
| `src/app/api/rag/ingest/route.ts` | NEW — chunking + embedding + store pipeline |
| **AI Tools** | |
| `src/lib/ai/paper-tools.ts` | Add 2 tools: `quoteFromSource`, `searchAcrossSources` |
| **Embedding** | |
| `src/lib/ai/embedding.ts` | NEW — Google gemini-embedding-001 client, batch embed function |
| **Chunking** | |
| `src/lib/ai/chunking.ts` | NEW — section-aware markdown/text chunker |
| **Integration** | |
| `src/lib/ai/web-search/orchestrator.ts` | After compose, fire-and-forget to /api/rag/ingest with full FetchWeb content |
| `src/app/api/extract-file/route.ts` | After extraction, chain to /api/rag/ingest with extractedText |
| **SKILL.md** | |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | Add instructions for `quoteFromSource` and `searchAcrossSources` usage |

**Unchanged:**
- FetchWeb pipeline (content-fetcher.ts) — still truncates for compose context, full content sent to RAG separately
- File upload UI — no user-facing changes
- Paper stages structure — stageData unchanged, RAG lives in separate table
- Citation formatter — unchanged
- Existing tools (updateStageData, createArtifact) — unchanged

## Embedding Model

**Current:** `gemini-embedding-001` via Google Generative AI API (ai.google.dev)
- Uses existing `GOOGLE_GENERATIVE_AI_API_KEY`
- Free tier available
- GA, production-ready
- 2,048 max input tokens, 768 configured output dimensions

**Future upgrade path:** `gemini-embedding-2-preview` via Vertex AI
- Requires separate Vertex AI credentials + GCP project setup
- Multimodal (embed images/PDF/audio directly without text extraction)
- 8,192 max input tokens
- Upgrade = swap model ID + credentials. Pipeline unchanged.

## Related Documents

- `docs/search-tool-skills/rag/context-rationale.md` — why RAG + FetchWeb
- `docs/search-tool-skills/fetchweb/README.md` — FetchWeb problem statement
- `docs/plans/2026-03-16-fetchweb-content-extraction-design.md` — FetchWeb design
- `docs/search-tool-skills/rag/implementation-plan.md` — implementation plan (to be written)
