# RAG Pipeline — Technical Documentation

## Overview

The RAG (Retrieval-Augmented Generation) pipeline enables verbatim quoting and cross-source retrieval for academic paper writing. It stores full source content — from web search and uploaded files — as embedded chunks in Convex, retrievable via semantic vector search.

RAG builds on top of FetchWeb. FetchWeb provides the compose model with page content for anti-hallucination during the search turn. RAG persists that content as searchable chunks for follow-up turns — enabling exact quotes, author identification, and cross-source passage finding.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     INGESTION (background)                   │
│                                                              │
│  Entry Point A: Web Search                                   │
│    orchestrator.ts → FetchWeb → fullContent per source        │
│    → ingestToRag() sequential, after compose completes       │
│                                                              │
│  Entry Point B: File Upload                                  │
│    extract-file/route.ts → extractedText                     │
│    → ingestToRag() fire-and-forget, after extraction         │
│                                                              │
│  Shared Pipeline (src/lib/ai/rag-ingest.ts):                │
│    content → dedup check → chunkContent() → embedTexts()     │
│    → Convex sourceChunks.ingestChunks()                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     STORAGE (Convex)                         │
│                                                              │
│  Table: sourceChunks                                         │
│    conversationId, sourceType, sourceId, chunkIndex,         │
│    content, embedding (768-dim), metadata                    │
│                                                              │
│  Indexes:                                                    │
│    by_conversation — list all chunks per conversation        │
│    by_source — list chunks per source within conversation    │
│    by_embedding — vectorIndex for semantic search             │
│      filterFields: conversationId, sourceType, sourceId      │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     RETRIEVAL (follow-up turns)              │
│                                                              │
│  Search Decision Override:                                   │
│    ragChunksAvailable + searchAlreadyDone                    │
│    + no explicit new-search trigger → skip web search        │
│    → normal chat path WITH RAG tools                         │
│                                                              │
│  Tool: quoteFromSource({ sourceId, query })                  │
│    → embed query → vectorSearch(sourceId filter) → top 5     │
│    → model quotes verbatim                                   │
│                                                              │
│  Tool: searchAcrossSources({ query, sourceType? })           │
│    → embed query → vectorSearch(conversation-wide) → top 10  │
│    → model cites from multiple sources                       │
└─────────────────────────────────────────────────────────────┘
```

## Pipeline Components

### Chunking (`src/lib/ai/chunking.ts`)

Section-aware content splitter:
- Splits by markdown headings (`##`, `###`) first
- Then by paragraph (`\n\n`) within sections
- Merges consecutive short paragraphs up to ~2,000 chars (~500 tokens)
- Splits oversized paragraphs at sentence boundaries (`. ` `? ` `! `)
- Skips chunks < 50 chars (`MIN_CHUNK_CHARS`)
- Preserves `sectionHeading` in metadata per chunk

### Embedding (`src/lib/ai/embedding.ts`)

Google `gemini-embedding-001` via AI SDK:
- `embedTexts(texts[])` — batch embed for document storage, `taskType: "RETRIEVAL_DOCUMENT"`
- `embedQuery(query)` — single embed for retrieval, `taskType: "RETRIEVAL_QUERY"`
- 768 dimensions (`outputDimensionality` via `providerOptions`)
- Retry 3x with exponential backoff (base 10s)
- Parses `retryDelay` from Google 429 response — uses server's delay instead of fixed backoff

### Ingest (`src/lib/ai/rag-ingest.ts`)

Core pipeline function called directly (no HTTP):

```
ingestToRag({ conversationId, sourceType, sourceId, content, metadata })
  → dedup check (sourceChunks.hasSource)
  → chunkContent(content)
  → embedTexts(chunks[].content)
  → sourceChunks.ingestChunks(chunks + embeddings)
```

### Convex Backend (`convex/sourceChunks.ts`)

| Function | Type | Purpose |
|---|---|---|
| `ingestChunks` | mutation | Bulk insert chunks with embeddings |
| `hasSource` | query | Dedup check — does sourceId already exist? |
| `hasChunks` | query | Does any chunk exist for conversation? (for search decision) |
| `deleteByConversation` | mutation | Cascade delete when conversation removed |
| `searchByEmbedding` | action | Vector search with post-filtering by sourceId/sourceType |
| `getById` | internalQuery | Load full document from action (Convex constraint) |

`searchByEmbedding` uses `ctx.vectorSearch()` filtered by `conversationId`, then post-filters by `sourceId`/`sourceType` on hydrated documents. Convex `vectorSearch` only supports `eq` and `or` filters (no `and`), so multi-field filtering uses the post-filter pattern.

### RAG Tools (`src/lib/ai/paper-tools.ts`)

| Tool | Input | Output | Use Case |
|---|---|---|---|
| `quoteFromSource` | `sourceId` + `query` | Top 5 chunks with content | "Kutip paragraf asli dari sumber [1]" |
| `searchAcrossSources` | `query` + optional `sourceType` | Top 10 chunks from multiple sources | "Cari paragraf tentang metodologi dari semua referensi" |

Both tools embed the query via `embedQuery()`, call `searchByEmbedding` Convex action, and return chunk content with metadata. Available in follow-up turns (non-search path) via `paper-tools.ts`.

## Search Decision: RAG-Aware Override

When RAG chunks exist, the search decision router is overridden to prevent redundant web searches on follow-up questions:

```
Pre-router:
  ragChunksAvailable = sourceChunks.hasChunks(conversationId)

Router prompt:
  "RAG tools available with stored source chunks.
   Set enableWebSearch=false when user asks about previously cited sources."

Post-router deterministic guard:
  if (ragChunksAvailable && searchAlreadyDone && !explicitNewSearchTrigger)
    → force enableWebSearch = false

Explicit triggers that bypass override:
  "cari lagi", "tambah sumber", "search again", "sumber baru", "referensi baru"
```

This ensures:
- Follow-up questions → RAG tools handle (no web search)
- New topic searches → web search proceeds normally
- Explicit "cari lagi" → web search proceeds

## Entry Points

### Web Search → RAG

```
orchestrator.ts (after config.onFinish() in compose finish handler):
  → sequential loop: for each source with fullContent
  → await ingestToRag({ sourceType: "web", sourceId: url, content: fullContent })
  → logged but never blocks user response
```

Sequential to avoid embedding API rate limits (Google free tier: 100 req/min).

### File Upload → RAG

```
extract-file/route.ts (after successful updateExtractionResult):
  → if (file.conversationId && extractedText)
  → void ingestToRag({ sourceType: "upload", sourceId: fileId, content: extractedText })
```

`conversationId` always exists — app creates conversation before file upload.

## Error Handling

| Scenario | Behavior |
|---|---|
| Embedding API rate limit (429) | Retry 3x, parse `retryDelay` from response. Base delay 10s. |
| Embedding API down | After 3 retries, ingest fails. Logged. Flow continues. |
| Convex mutation fails | Logged. Source not stored. No impact on user response. |
| vectorSearch returns 0 results | Model receives empty array. SKILL.md instructs: inform user. |
| Chunk too short (<50 chars) | Skipped — not embedded. |
| Source already ingested (dedup) | Skipped — return early. |

**Core principle:** RAG never breaks existing flow. All failures = graceful degradation.

## Embedding Model

**Current:** `gemini-embedding-001`
- API: Google Generative AI (ai.google.dev) — same key as Google Grounding retriever
- Pricing: free tier (100 req/min), paid $0.15/MTok
- Input: max 2,048 tokens per text
- Output: 768 dimensions (configurable, default 3,072)
- Task types: `RETRIEVAL_DOCUMENT` (storage), `RETRIEVAL_QUERY` (search)

**Upgrade path:** `gemini-embedding-2-preview`
- API: Vertex AI only (requires separate GCP credentials)
- Multimodal: text, image, PDF, audio, video
- Input: max 8,192 tokens
- Upgrade = swap model ID + credentials. Pipeline unchanged.

## Cleanup

When a conversation is deleted, all associated `sourceChunks` are cascade-deleted via `deleteByConversation` mutation, called from `deleteConversationCascade` in `convex/conversations.ts`. All deletion paths (single, bulk, all, cleanup) go through this cascade.

## Key Files

| File | Description |
|---|---|
| `src/lib/ai/chunking.ts` | Section-aware content chunker |
| `src/lib/ai/embedding.ts` | Google gemini-embedding-001 client with retry |
| `src/lib/ai/rag-ingest.ts` | Core pipeline: dedup → chunk → embed → store |
| `src/lib/ai/paper-tools.ts` | RAG tools: `quoteFromSource`, `searchAcrossSources` |
| `src/lib/ai/web-search/orchestrator.ts` | RAG ingest trigger (web search entry point) |
| `src/lib/ai/web-search/content-fetcher.ts` | FetchWeb: provides `fullContent` for RAG |
| `src/app/api/extract-file/route.ts` | RAG ingest trigger (file upload entry point) |
| `src/app/api/chat/route.ts` | RAG-aware search decision override |
| `src/lib/ai/skills/web-search-quality/SKILL.md` | VERBATIM QUOTING TOOLS instructions |
| `convex/sourceChunks.ts` | Convex mutations + vector search action |
| `convex/schema.ts` | sourceChunks table definition |
| `convex/conversations.ts` | Cascade delete |
| `__tests__/chunking.test.ts` | Chunking tests (7 cases) |
| `__tests__/embedding.test.ts` | Embedding tests (3 cases) |

## Related Documents

| Document | Description |
|---|---|
| `context-rationale.md` | Why RAG is needed alongside FetchWeb |
| `design.md` | Original design document (pre-implementation) |
| `implementation-plan.md` | Implementation plan (14 tasks) |
| `known-issues.md` | Known issues discovered during testing |
| `../fetchweb/README.md` | FetchWeb documentation (RAG builds on this) |
| `../README.md` | Architecture principles |
| `../enforcement/README.md` | Full technical documentation |
