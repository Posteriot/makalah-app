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

### How Full Content Is Obtained (FetchWeb)

Currently `content-fetcher.ts` truncates all content to 12K chars inside `fetchAndParse()` before returning. For RAG, we need the full content. Refactor: `fetchAndParse()` returns full markdown. Truncation moves to the orchestrator — compose context gets `truncate(content)`, RAG ingest gets the raw full content. This is a small change: move the `truncate()` call from content-fetcher to orchestrator.

### Ingest Insertion Points

- **Web search (orchestrator.ts):** Inside the `execute` callback, after `config.onFinish()` completes (line ~442). The `fetchedContent` array (with full content after refactor) is still in scope. Fire-and-forget `fetch("/api/rag/ingest", ...)` for each source with content.
- **File upload (extract-file/route.ts):** After successful `updateExtractionResult` mutation (line ~256). `extractedText` and `file.conversationId` are both available. Fire-and-forget to `/api/rag/ingest`.

### Edge Case: File Upload Without conversationId

The `files` table has `conversationId` as `v.optional(v.id("conversations"))`. It can be `undefined` if a file is uploaded before the conversation is created (e.g., user uploads a file in a brand-new chat that has no ID yet). The upload flow in `FileUploadButton.tsx` passes `conversationId` from props, which comes from the current chat — but on a fresh page with no conversation, this is `null`.

**Handling:** If `file.conversationId` is `undefined` after extraction, skip RAG ingest. The file content is still stored in `files.extractedText` and injected into chat context via the existing `fileContext` mechanism. RAG ingest for this file can happen later — when the first message is sent and a conversation is created, a backfill could associate orphaned files and trigger ingest. However, this backfill is NOT in scope for the initial RAG implementation. For v1: no conversationId = no RAG ingest for that file.

### Authentication for /api/rag/ingest

Both callers are server-side Next.js API routes — they can pass the user's auth token via internal fetch header. The ingest route validates with `isAuthenticated()` + `getToken()`, same as `/api/extract-file`.

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

### Tool Availability — Important Constraint

RAG tools are **NOT available during web search compose phase.** The compose phase in `orchestrator.ts` explicitly has no tools — the `COMPOSE_PHASE_DIRECTIVE` states "You have NO access to tools." This is by design.

RAG tools are available in **follow-up turns** (normal chat and paper mode), where the full tool set from `paper-tools.ts` is registered. This means:

- **Web search compose turn:** Model uses truncated page content (from FetchWeb) to produce initial response. No RAG access.
- **Follow-up turn:** User asks "kutipannya mana?" → Model calls `quoteFromSource` → retrieves verbatim chunk from Convex → quotes it.
- **Paper writing turns:** Model calls `searchAcrossSources` to find relevant passages for literature review, discussion, etc.

This is the correct behavior — RAG ingestion happens in background AFTER compose, so chunks aren't available yet during that same turn anyway.

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

### Cleanup on Conversation Deletion

When a conversation is deleted, all associated `sourceChunks` must be cascade-deleted. Add a `deleteByConversation` mutation to `convex/sourceChunks.ts` and call it from the existing conversation deletion logic in `convex/conversations.ts`.

### Convex Action Requirement

`vectorSearch` can only be called from Convex **actions** (not queries or mutations). This is a Convex platform constraint. The `searchByEmbedding` function in `convex/sourceChunks.ts` must be defined as an `action`, not a `query`. It calls `ctx.vectorSearch()`, then loads full documents via `ctx.runQuery()` to return content.

## Files Changed

| File | Change |
|---|---|
| **Convex** | |
| `convex/schema.ts` | Add `sourceChunks` table with vectorIndex |
| `convex/sourceChunks.ts` | NEW — mutations: `ingestChunks`, `getBySource`, `deleteBySource`, `deleteByConversation`. Action: `searchByEmbedding` (vectorSearch must be in action, not query) |
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

| `convex/conversations.ts` | Add cascade-delete of sourceChunks when conversation deleted |
| `src/lib/ai/web-search/content-fetcher.ts` | Refactor: return full content, move truncation to caller (orchestrator) |

**Unchanged:**
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
