# RAG Pipeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable verbatim quoting and cross-source retrieval by storing full source content as embedded chunks in Convex, retrievable via semantic search.

**Architecture:** Two entry points (FetchWeb + file upload) → shared pipeline (chunk → embed → store in Convex with vectorIndex) → two retrieval tools (quoteFromSource, searchAcrossSources). All async, graceful degradation on failure.

**Tech Stack:** Convex (vectorSearch), `@ai-sdk/google` (gemini-embedding-001), AI SDK `tool()` + Zod, vitest

**Design doc:** `docs/search-tool-skills/rag/design.md`

---

### Task 1: Chunking Module — Tests

**Files:**
- Create: `__tests__/chunking.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect } from "vitest"
import { chunkContent } from "@/lib/ai/chunking"

describe("chunkContent", () => {
  it("returns single chunk for short content", () => {
    const chunks = chunkContent("Short text under 500 tokens.")
    expect(chunks).toHaveLength(1)
    expect(chunks[0].content).toBe("Short text under 500 tokens.")
    expect(chunks[0].chunkIndex).toBe(0)
  })

  it("splits by section headings", () => {
    const md = "## Introduction\n\nFirst section content that is long enough to be meaningful for embedding purposes and analysis.\n\n## Methodology\n\nSecond section content that describes the research methodology in sufficient detail."
    const chunks = chunkContent(md)
    expect(chunks.length).toBeGreaterThanOrEqual(2)
    expect(chunks[0].metadata.sectionHeading).toBe("Introduction")
    expect(chunks[1].metadata.sectionHeading).toBe("Methodology")
  })

  it("splits long paragraphs at sentence boundary", () => {
    const longParagraph = Array(50).fill("This is a complete sentence about research findings.").join(" ")
    const chunks = chunkContent(longParagraph)
    expect(chunks.length).toBeGreaterThan(1)
    // Each chunk should end at a sentence boundary (period)
    for (const chunk of chunks.slice(0, -1)) {
      expect(chunk.content.trimEnd()).toMatch(/[.!?]$/)
    }
  })

  it("merges consecutive short paragraphs", () => {
    const md = "Short para 1.\n\nShort para 2.\n\nShort para 3.\n\nShort para 4."
    const chunks = chunkContent(md)
    // 4 short paragraphs should be merged into 1 chunk
    expect(chunks).toHaveLength(1)
    expect(chunks[0].content).toContain("Short para 1")
    expect(chunks[0].content).toContain("Short para 4")
  })

  it("skips chunks shorter than 50 chars", () => {
    const md = "## Title\n\nOk.\n\n## Real Section\n\nThis is a real section with enough content to be meaningful for embedding and retrieval purposes in the RAG pipeline."
    const chunks = chunkContent(md)
    // "Ok." alone is <50 chars, should be skipped or merged
    const contents = chunks.map(c => c.content)
    expect(contents.every(c => c.length >= 50)).toBe(true)
  })

  it("returns empty array for empty input", () => {
    expect(chunkContent("")).toEqual([])
    expect(chunkContent("   ")).toEqual([])
  })

  it("preserves chunkIndex ordering", () => {
    const md = "## A\n\n" + "Content A. ".repeat(100) + "\n\n## B\n\n" + "Content B. ".repeat(100)
    const chunks = chunkContent(md)
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i].chunkIndex).toBe(i)
    }
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/chunking.test.ts`

Expected: FAIL — `Cannot find module '@/lib/ai/chunking'`

**Step 3: Commit**

```bash
git add __tests__/chunking.test.ts
git commit -m "test: add failing tests for chunking module"
```

---

### Task 2: Chunking Module — Implementation

**Files:**
- Create: `src/lib/ai/chunking.ts`

**Step 1: Implement the chunker**

```typescript
export interface ContentChunk {
  chunkIndex: number
  content: string
  metadata: {
    sectionHeading?: string
  }
}

const TARGET_CHUNK_CHARS = 2000   // ~500 tokens
const MIN_CHUNK_CHARS = 50
const HEADING_REGEX = /^#{1,6}\s+(.+)$/

export function chunkContent(text: string): ContentChunk[] {
  if (!text?.trim()) return []

  // Split into sections by headings
  const sections = splitBySections(text)

  // Split sections into paragraphs, merge short ones, split long ones
  const rawChunks: Array<{ content: string; sectionHeading?: string }> = []

  for (const section of sections) {
    const paragraphs = section.content.split(/\n\s*\n+/).filter((p) => p.trim())
    let buffer = ""

    for (const para of paragraphs) {
      const combined = buffer ? `${buffer}\n\n${para}` : para

      if (combined.length > TARGET_CHUNK_CHARS && buffer) {
        // Flush buffer before this paragraph
        if (buffer.length >= MIN_CHUNK_CHARS) {
          rawChunks.push({ content: buffer.trim(), sectionHeading: section.heading })
        }
        // Start new buffer with current paragraph
        if (para.length > TARGET_CHUNK_CHARS) {
          // Paragraph itself is too long — split at sentence boundary
          const sentenceChunks = splitAtSentenceBoundary(para, TARGET_CHUNK_CHARS)
          for (const sc of sentenceChunks) {
            if (sc.length >= MIN_CHUNK_CHARS) {
              rawChunks.push({ content: sc.trim(), sectionHeading: section.heading })
            }
          }
          buffer = ""
        } else {
          buffer = para
        }
      } else if (combined.length > TARGET_CHUNK_CHARS && !buffer) {
        // Single paragraph exceeds target — split at sentence boundary
        const sentenceChunks = splitAtSentenceBoundary(para, TARGET_CHUNK_CHARS)
        for (const sc of sentenceChunks) {
          if (sc.length >= MIN_CHUNK_CHARS) {
            rawChunks.push({ content: sc.trim(), sectionHeading: section.heading })
          }
        }
        buffer = ""
      } else {
        buffer = combined
      }
    }

    // Flush remaining buffer
    if (buffer.trim().length >= MIN_CHUNK_CHARS) {
      rawChunks.push({ content: buffer.trim(), sectionHeading: section.heading })
    }
  }

  return rawChunks.map((chunk, i) => ({
    chunkIndex: i,
    content: chunk.content,
    metadata: {
      ...(chunk.sectionHeading ? { sectionHeading: chunk.sectionHeading } : {}),
    },
  }))
}

function splitBySections(text: string): Array<{ heading?: string; content: string }> {
  const lines = text.split("\n")
  const sections: Array<{ heading?: string; content: string }> = []
  let currentHeading: string | undefined
  let currentLines: string[] = []

  for (const line of lines) {
    const match = line.match(HEADING_REGEX)
    if (match) {
      if (currentLines.length > 0) {
        sections.push({ heading: currentHeading, content: currentLines.join("\n") })
      }
      currentHeading = match[1].trim()
      currentLines = []
    } else {
      currentLines.push(line)
    }
  }

  if (currentLines.length > 0) {
    sections.push({ heading: currentHeading, content: currentLines.join("\n") })
  }

  return sections
}

function splitAtSentenceBoundary(text: string, maxChars: number): string[] {
  const chunks: string[] = []
  let remaining = text

  while (remaining.length > maxChars) {
    const slice = remaining.slice(0, maxChars)
    // Find last sentence boundary
    const lastPeriod = Math.max(
      slice.lastIndexOf(". "),
      slice.lastIndexOf("? "),
      slice.lastIndexOf("! "),
    )

    if (lastPeriod > maxChars * 0.3) {
      chunks.push(remaining.slice(0, lastPeriod + 1))
      remaining = remaining.slice(lastPeriod + 1).trimStart()
    } else {
      // No good sentence boundary — hard cut at maxChars
      chunks.push(slice)
      remaining = remaining.slice(maxChars).trimStart()
    }
  }

  if (remaining.trim()) {
    chunks.push(remaining.trim())
  }

  return chunks
}
```

**Step 2: Run tests**

Run: `npx vitest run __tests__/chunking.test.ts`

Expected: All 7 tests PASS.

**Step 3: Commit**

```bash
git add src/lib/ai/chunking.ts
git commit -m "feat: add section-aware content chunker"
```

---

### Task 3: Embedding Module — Tests

**Files:**
- Create: `__tests__/embedding.test.ts`

**Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi, afterEach } from "vitest"
import { embedTexts, embedQuery } from "@/lib/ai/embedding"

// Mock @ai-sdk/google
vi.mock("@ai-sdk/google", () => ({
  google: {
    textEmbeddingModel: vi.fn().mockReturnValue("mock-model"),
  },
}))

// Mock ai embedMany/embed
vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>()
  return {
    ...original,
    embedMany: vi.fn().mockResolvedValue({
      embeddings: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
    }),
    embed: vi.fn().mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
    }),
  }
})

describe("embedTexts", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns embeddings for multiple texts", async () => {
    const result = await embedTexts(["text one", "text two"])
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual([0.1, 0.2, 0.3])
    expect(result[1]).toEqual([0.4, 0.5, 0.6])
  })

  it("returns empty array for empty input", async () => {
    const result = await embedTexts([])
    expect(result).toEqual([])
  })
})

describe("embedQuery", () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it("returns single embedding for query", async () => {
    const result = await embedQuery("search query")
    expect(result).toEqual([0.1, 0.2, 0.3])
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/embedding.test.ts`

Expected: FAIL — `Cannot find module '@/lib/ai/embedding'`

**Step 3: Commit**

```bash
git add __tests__/embedding.test.ts
git commit -m "test: add failing tests for embedding module"
```

---

### Task 4: Embedding Module — Implementation

**Files:**
- Create: `src/lib/ai/embedding.ts`

**Step 1: Implement embedding client**

```typescript
import { embed, embedMany } from "ai"
import { google } from "@ai-sdk/google"

const EMBEDDING_MODEL = "gemini-embedding-001"
const DIMENSIONS = 768
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) throw error
      const delay = BASE_DELAY_MS * Math.pow(2, attempt)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error("Unreachable")
}

/**
 * Embed multiple texts for document storage.
 * Uses taskType RETRIEVAL_DOCUMENT. Retries 3x with exponential backoff.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const { embeddings } = await withRetry(() => embedMany({
    model: google.textEmbeddingModel(EMBEDDING_MODEL, {
      outputDimensionality: DIMENSIONS,
      taskType: "RETRIEVAL_DOCUMENT",
    }),
    values: texts,
  }))

  return embeddings
}

/**
 * Embed a single query for retrieval.
 * Uses taskType RETRIEVAL_QUERY. Retries 3x with exponential backoff.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const { embedding } = await withRetry(() => embed({
    model: google.textEmbeddingModel(EMBEDDING_MODEL, {
      outputDimensionality: DIMENSIONS,
      taskType: "RETRIEVAL_QUERY",
    }),
    value: query,
  })

  return embedding
}
```

**Step 2: Run tests**

Run: `npx vitest run __tests__/embedding.test.ts`

Expected: All 3 tests PASS.

**Step 3: Verify the import actually works (not just mocked)**

Run: `node -e "const { google } = require('@ai-sdk/google'); console.log(typeof google.textEmbeddingModel)"`

Expected: `function` — confirms the SDK has the embedding API.

If output is `undefined`, the SDK version may not support `textEmbeddingModel`. In that case, fall back to direct Google API calls via `fetch()`. The implementer should check AI SDK docs for the correct method name.

**Step 4: Commit**

```bash
git add src/lib/ai/embedding.ts
git commit -m "feat: add embedding module with gemini-embedding-001"
```

---

### Task 5: Convex Schema — sourceChunks Table

**Files:**
- Modify: `convex/schema.ts`

**Step 1: Add sourceChunks table**

Add to the schema, after the existing `files` table definition:

```typescript
sourceChunks: defineTable({
  conversationId: v.id("conversations"),
  sourceType: v.union(v.literal("web"), v.literal("upload")),
  sourceId: v.string(),
  chunkIndex: v.number(),
  content: v.string(),
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
    filterFields: ["conversationId", "sourceType", "sourceId"],
  }),
```

**Step 2: Push schema to Convex**

Run: `npx convex dev` (if dev server running, it auto-pushes. Otherwise `npx convex push`)

Expected: Schema migration succeeds, new table created.

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: add sourceChunks table with vectorIndex to Convex schema"
```

---

### Task 6: Convex Mutations & Actions — sourceChunks.ts

**Files:**
- Create: `convex/sourceChunks.ts`

**Step 1: Implement mutations and action**

```typescript
import { v } from "convex/values"
import { mutation, action, query, internalMutation } from "./_generated/server"
import { internal } from "./_generated/api"

// ── Mutations ──

export const ingestChunks = mutation({
  args: {
    conversationId: v.id("conversations"),
    sourceType: v.union(v.literal("web"), v.literal("upload")),
    sourceId: v.string(),
    chunks: v.array(v.object({
      chunkIndex: v.number(),
      content: v.string(),
      embedding: v.array(v.float64()),
      metadata: v.object({
        title: v.optional(v.string()),
        pageNumber: v.optional(v.number()),
        sectionHeading: v.optional(v.string()),
      }),
    })),
  },
  handler: async (ctx, args) => {
    for (const chunk of args.chunks) {
      await ctx.db.insert("sourceChunks", {
        conversationId: args.conversationId,
        sourceType: args.sourceType,
        sourceId: args.sourceId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: chunk.metadata,
        createdAt: Date.now(),
      })
    }
    return { inserted: args.chunks.length }
  },
})

export const getBySource = query({
  args: {
    conversationId: v.id("conversations"),
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sourceChunks")
      .withIndex("by_source", (q) =>
        q.eq("conversationId", args.conversationId).eq("sourceId", args.sourceId)
      )
      .collect()
  },
})

export const deleteBySource = mutation({
  args: {
    conversationId: v.id("conversations"),
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("sourceChunks")
      .withIndex("by_source", (q) =>
        q.eq("conversationId", args.conversationId).eq("sourceId", args.sourceId)
      )
      .collect()
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id)
    }
    return { deleted: chunks.length }
  },
})

export const hasSource = query({
  args: {
    conversationId: v.id("conversations"),
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    const first = await ctx.db
      .query("sourceChunks")
      .withIndex("by_source", (q) =>
        q.eq("conversationId", args.conversationId).eq("sourceId", args.sourceId)
      )
      .first()
    return first !== null
  },
})

export const deleteByConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, args) => {
    const chunks = await ctx.db
      .query("sourceChunks")
      .withIndex("by_conversation", (q) => q.eq("conversationId", args.conversationId))
      .collect()
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id)
    }
    return { deleted: chunks.length }
  },
})

// ── Vector Search Action ──
// vectorSearch can ONLY run in actions, not queries/mutations (Convex constraint)

export const searchByEmbedding = action({
  args: {
    conversationId: v.id("conversations"),
    embedding: v.array(v.float64()),
    sourceId: v.optional(v.string()),
    sourceType: v.optional(v.union(v.literal("web"), v.literal("upload"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.vectorSearch("sourceChunks", "by_embedding", {
      vector: args.embedding,
      limit: args.limit ?? 10,
      filter: (q) => {
        const filters = [q.eq("conversationId", args.conversationId)]
        if (args.sourceId) filters.push(q.eq("sourceId", args.sourceId))
        if (args.sourceType) filters.push(q.eq("sourceType", args.sourceType))
        return filters.length === 1 ? filters[0] : q.and(...filters)
      },
    })

    // Load full documents for matched results
    const chunks = await Promise.all(
      results.map(async (r) => {
        const doc = await ctx.runQuery(internal.sourceChunks.getById, { id: r._id })
        return doc ? { ...doc, _score: r._score } : null
      })
    )

    return chunks.filter(Boolean)
  },
})

// Internal query for loading documents from action
// MUST be internalQuery (not query) — called via internal.sourceChunks.getById
import { internalQuery } from "./_generated/server"

export const getById = internalQuery({
  args: { id: v.id("sourceChunks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})
```

**Step 2: Verify Convex dev compiles**

Run: `npx convex dev` (or check dev server output)

Expected: No compile errors.

**Step 3: Commit**

```bash
git add convex/sourceChunks.ts
git commit -m "feat: add sourceChunks mutations, queries, and vector search action"
```

---

### Task 7: RAG Ingest API Route

**Files:**
- Create: `src/app/api/rag/ingest/route.ts`

**Step 1: Implement the ingest endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { isAuthenticated, getToken } from "@/lib/auth-server"
import { fetchMutation, fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import { chunkContent } from "@/lib/ai/chunking"
import { embedTexts } from "@/lib/ai/embedding"

export async function POST(req: NextRequest) {
  try {
    const isAuthed = await isAuthenticated()
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const convexToken = await getToken()
    const convexOptions = convexToken ? { token: convexToken } : undefined

    const body = await req.json()
    const { conversationId, sourceType, sourceId, content, metadata } = body

    if (!conversationId || !sourceType || !sourceId || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Dedup check
    const exists = await fetchQuery(
      api.sourceChunks.hasSource,
      { conversationId: conversationId as Id<"conversations">, sourceId },
      convexOptions,
    )

    if (exists) {
      console.log(`[RAG Ingest] Skip — sourceId already exists: ${sourceId}`)
      return NextResponse.json({ status: "skipped", reason: "already_exists" })
    }

    // Chunk
    const chunks = chunkContent(content)
    if (chunks.length === 0) {
      console.log(`[RAG Ingest] Skip — no chunks produced for: ${sourceId}`)
      return NextResponse.json({ status: "skipped", reason: "no_chunks" })
    }

    console.log(`[RAG Ingest] Chunked ${sourceId}: ${chunks.length} chunks`)

    // Embed
    let embeddings: number[][]
    try {
      embeddings = await embedTexts(chunks.map((c) => c.content))
    } catch (embedError) {
      console.error(`[RAG Ingest] Embedding failed for ${sourceId}:`, embedError)
      return NextResponse.json({ error: "Embedding failed" }, { status: 502 })
    }

    console.log(`[RAG Ingest] Embedded ${embeddings.length} chunks for ${sourceId}`)

    // Store
    const chunksWithEmbeddings = chunks.map((chunk, i) => ({
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      embedding: embeddings[i],
      metadata: {
        ...chunk.metadata,
        ...(metadata?.title ? { title: metadata.title } : {}),
      },
    }))

    await fetchMutation(
      api.sourceChunks.ingestChunks,
      {
        conversationId: conversationId as Id<"conversations">,
        sourceType,
        sourceId,
        chunks: chunksWithEmbeddings,
      },
      convexOptions,
    )

    console.log(`[RAG Ingest] Stored ${chunksWithEmbeddings.length} chunks for ${sourceId}`)

    return NextResponse.json({
      status: "ingested",
      chunks: chunksWithEmbeddings.length,
    })
  } catch (error) {
    console.error("[RAG Ingest] Unexpected error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
```

**Step 2: Verify route compiles**

Run: `npx tsc --noEmit 2>&1 | grep rag || echo "No RAG type errors"`

Expected: No type errors.

**Step 3: Commit**

```bash
git add src/app/api/rag/ingest/route.ts
git commit -m "feat: add RAG ingest API route (chunk + embed + store)"
```

---

### Task 8: Refactor content-fetcher — Return Full Content

**Files:**
- Modify: `src/lib/ai/web-search/content-fetcher.ts`
- Modify: `src/lib/ai/web-search/orchestrator.ts`
- Modify: `__tests__/content-fetcher.test.ts`

**Step 1: Refactor FetchedContent to include fullContent**

In `content-fetcher.ts`, change `FetchedContent` interface:

```typescript
export interface FetchedContent {
  url: string
  pageContent: string | null      // truncated for compose context
  fullContent: string | null       // full content for RAG ingest (no truncation)
  fetchMethod: "fetch" | "tavily" | null
}
```

Change `fetchAndParse` to return full content. Move `truncate()` call to the result mapping:

In the primary results mapping, change:
```typescript
// Before:
return { url: urls[i], pageContent: settled.value, fetchMethod: "fetch" as const }

// After:
return {
  url: urls[i],
  pageContent: truncate(settled.value),
  fullContent: settled.value,
  fetchMethod: "fetch" as const,
}
```

And the null case:
```typescript
return { url: urls[i], pageContent: null, fullContent: null, fetchMethod: null }
```

Similarly for Tavily fallback results, store both truncated and full.

Remove the `truncate()` call from inside `fetchAndParse` — just return the raw markdown.

**Step 2: Update tests**

Add `fullContent` expectations to existing tests. For the truncation test, verify:
- `pageContent` is truncated (< 15000 chars)
- `fullContent` is the full text (> pageContent length)

**Step 3: Run tests**

Run: `npx vitest run __tests__/content-fetcher.test.ts`

Expected: All tests pass.

**Step 4: Update orchestrator to use pageContent (truncated) for compose context**

In `orchestrator.ts`, the enrichedSources mapping already uses `fetched?.pageContent`. No change needed — `pageContent` is still the truncated version. But add `fullContent` pass-through for RAG ingest (Task 9 will use it).

**Step 5: Commit**

```bash
git add src/lib/ai/web-search/content-fetcher.ts src/lib/ai/web-search/orchestrator.ts __tests__/content-fetcher.test.ts
git commit -m "refactor: content-fetcher returns both truncated and full content"
```

---

### Task 9: Integrate RAG Ingest — Orchestrator (Web Search)

**Files:**
- Modify: `src/lib/ai/web-search/orchestrator.ts`

**Step 1: Add fire-and-forget RAG ingest after compose finishes**

Inside the `execute` callback, after `config.onFinish()` completes (in the `finish` chunk handler), add:

```typescript
// ── RAG Ingest: fire-and-forget ──
for (const fetched of fetchedContent) {
  if (fetched.fullContent && config.tavilyApiKey !== undefined) {
    // Find the source metadata
    const source = enrichedSources.find((s) => s.url === fetched.url)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/rag/ingest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: config.conversationId,
        sourceType: "web",
        sourceId: fetched.url,
        content: fetched.fullContent,
        metadata: { title: source?.title },
      }),
    }).catch((err) => {
      console.error(`[Orchestrator] RAG ingest failed for ${fetched.url}:`, err)
    })
  }
}
```

**Important:** `config.conversationId` does NOT currently exist in `WebSearchOrchestratorConfig`. It must be added.

**Step 2: Add conversationId to WebSearchOrchestratorConfig**

In `src/lib/ai/web-search/types.ts`, add to `WebSearchOrchestratorConfig`:

```typescript
conversationId: string  // needed for RAG ingest
```

And wire it in `route.ts` where `executeWebSearch({...})` is called:

```typescript
conversationId: currentConversationId,
```

**Step 3: Run tests + type check**

Run: `npx vitest run && npx tsc --noEmit`

Expected: All pass.

**Step 4: Commit**

```bash
git add src/lib/ai/web-search/orchestrator.ts src/lib/ai/web-search/types.ts src/app/api/chat/route.ts
git commit -m "feat: fire-and-forget RAG ingest from orchestrator after compose"
```

---

### Task 10: Integrate RAG Ingest — File Upload

**Files:**
- Modify: `src/app/api/extract-file/route.ts`

**Step 1: Add RAG ingest after successful extraction**

After the successful `updateExtractionResult` call (line ~256), add:

```typescript
// ── RAG Ingest: fire-and-forget ──
if (file.conversationId && extractedText) {
  fetch(`${process.env.NEXT_PUBLIC_APP_URL || ""}/api/rag/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId: file.conversationId,
      sourceType: "upload",
      sourceId: fileId,
      content: extractedText,
      metadata: { title: file.name },
    }),
  }).catch((err) => {
    console.error(`[ExtractFile] RAG ingest failed for ${fileId}:`, err)
  })
}
```

Note: `file.conversationId` can be `undefined` (edge case from design doc). Only ingest when it exists.

**Step 2: Verify the file record has conversationId accessible**

The `file` variable is fetched via `api.files.getFile` earlier in the route. Verify `file.conversationId` is in the returned type.

**Step 3: Commit**

```bash
git add src/app/api/extract-file/route.ts
git commit -m "feat: fire-and-forget RAG ingest after file extraction"
```

---

### Task 11: RAG Retrieval Tools — quoteFromSource & searchAcrossSources

**Files:**
- Modify: `src/lib/ai/paper-tools.ts`

**Step 1: Add two new tools**

Add to the object returned by `createPaperTools()`:

```typescript
quoteFromSource: tool({
  description: "Retrieve exact text chunks from a previously searched web source or uploaded file. Use when the user asks for a direct quote, verbatim citation, or the exact text from a specific source.",
  inputSchema: z.object({
    sourceId: z.string().describe("The URL (for web sources) or fileId (for uploaded files) to quote from"),
    query: z.string().describe("What to search for within this source — describe the topic or claim you need the exact quote for"),
  }),
  execute: async ({ sourceId, query }) => {
    try {
      const { embedQuery } = await import("@/lib/ai/embedding")
      const embedding = await embedQuery(query)

      const results = await fetchAction(
        api.sourceChunks.searchByEmbedding,
        {
          conversationId: context.conversationId,
          embedding,
          sourceId,
          limit: 5,
        },
        convexOptions,
      )

      if (!results || results.length === 0) {
        return { success: false, error: "No matching content found for this source. The source may not have been ingested yet." }
      }

      return {
        success: true,
        chunks: results.map((r: { content: string; metadata: { sectionHeading?: string }; _score: number }) => ({
          content: r.content,
          sectionHeading: r.metadata?.sectionHeading,
          relevanceScore: r._score,
        })),
      }
    } catch (error) {
      return { success: false, error: "Failed to retrieve source content." }
    }
  },
}),

searchAcrossSources: tool({
  description: "Search across all previously searched web sources and uploaded files in this conversation. Use when the user needs to find relevant passages about a topic across multiple references, e.g., for literature review or cross-referencing claims.",
  inputSchema: z.object({
    query: z.string().describe("The topic, concept, or claim to search for across all sources"),
    sourceType: z.enum(["web", "upload"]).optional().describe("Filter by source type: 'web' for searched pages, 'upload' for user-uploaded files. Omit to search all."),
  }),
  execute: async ({ query, sourceType }) => {
    try {
      const { embedQuery } = await import("@/lib/ai/embedding")
      const embedding = await embedQuery(query)

      const results = await fetchAction(
        api.sourceChunks.searchByEmbedding,
        {
          conversationId: context.conversationId,
          embedding,
          sourceType: sourceType ?? undefined,
          limit: 10,
        },
        convexOptions,
      )

      if (!results || results.length === 0) {
        return { success: false, error: "No matching content found across sources." }
      }

      return {
        success: true,
        chunks: results.map((r: { content: string; sourceId: string; metadata: { sectionHeading?: string }; _score: number }) => ({
          content: r.content,
          sourceId: r.sourceId,
          sectionHeading: r.metadata?.sectionHeading,
          relevanceScore: r._score,
        })),
      }
    } catch (error) {
      return { success: false, error: "Failed to search across sources." }
    }
  },
}),
```

**Step 2: Add `fetchAction` import if not present**

Check if `paper-tools.ts` already imports `fetchAction` from `convex/nextjs`. If not, add:

```typescript
import { fetchQuery, fetchMutation, fetchAction } from "convex/nextjs"
```

**Step 3: Run type check**

Run: `npx tsc --noEmit`

Expected: No new type errors.

**Step 4: Commit**

```bash
git add src/lib/ai/paper-tools.ts
git commit -m "feat: add quoteFromSource and searchAcrossSources RAG tools"
```

---

### Task 12: Cascade Delete — Cleanup sourceChunks on Conversation Deletion

**Files:**
- Modify: `convex/conversations.ts`

**Step 1: Add sourceChunks deletion to deleteConversationCascade**

Find the `deleteConversationCascade` function. After the files deletion block (around line 103), add:

```typescript
// Delete source chunks (RAG data)
const sourceChunks = await ctx.db
  .query("sourceChunks")
  .withIndex("by_conversation", (q) => q.eq("conversationId", conversationId))
  .collect()
for (const chunk of sourceChunks) {
  await ctx.db.delete(chunk._id)
}
```

**Step 2: Verify Convex dev compiles**

Check dev server output — no errors.

**Step 3: Commit**

```bash
git add convex/conversations.ts
git commit -m "feat: cascade-delete sourceChunks when conversation deleted"
```

---

### Task 13: SKILL.md — Add RAG Tool Instructions

**Files:**
- Modify: `src/lib/ai/skills/web-search-quality/SKILL.md`

**Step 1: Add tool usage instructions**

Insert after the CONTENT VERIFICATION section:

```markdown
## VERBATIM QUOTING TOOLS

Two tools are available for retrieving exact source content:

### quoteFromSource
Use when the user asks for a direct quote, exact text, or verbatim citation from a specific source.
- Input: sourceId (URL or file ID) + query (what to find)
- Returns: exact text chunks from the stored source
- ALWAYS quote the returned text verbatim — do not paraphrase or interpret

### searchAcrossSources
Use when writing paper sections that need evidence from multiple references, or when the user asks to find information across all their sources.
- Input: query (topic to search for) + optional sourceType filter
- Returns: relevant chunks from multiple sources with sourceId
- Use for: literature review, cross-referencing claims, finding supporting evidence

### When to Use These Tools
- User says "kutip", "quote", "teks asli", "paragraf asli" → use quoteFromSource
- User says "cari dari semua referensi", "temukan paragraf tentang" → use searchAcrossSources
- Writing tinjauan_literatur, diskusi, or any stage that cites specific claims → use searchAcrossSources
- These tools are NOT available during web search compose — only in follow-up turns
```

**Step 2: Run skill tests**

Run: `npx vitest run __tests__/skills/`

Expected: All pass.

**Step 3: Commit**

```bash
git add src/lib/ai/skills/web-search-quality/SKILL.md
git commit -m "feat: add RAG tool usage instructions to SKILL.md"
```

---

### Task 14: End-to-End Verification

**Files:** No new files.

**Step 1: Run full test suite**

Run: `npx vitest run`

Expected: All tests pass (except pre-existing normalizer.test.ts failure).

**Step 2: Type check**

Run: `npx tsc --noEmit`

Expected: No new type errors.

**Step 3: Build check**

Run: `npm run build`

Expected: Build succeeds.

**Step 4: Manual smoke test plan**

Test the full RAG pipeline end-to-end:

1. Start dev server: `npm run dev`
2. Create a new chat, ask a web search question (e.g., "Apa itu literasi AI?")
3. Wait for response to complete
4. Check server logs for `[RAG Ingest]` — should show chunking + embedding + storage
5. In the SAME conversation, ask: "Kutip paragraf asli dari sumber pertama"
6. Model should call `quoteFromSource` tool and return verbatim text
7. Test file upload: upload a PDF via "+ Konteks", send a message
8. Check server logs for RAG ingest of uploaded file
9. Ask: "Cari paragraf tentang [topic] dari semua referensi saya"
10. Model should call `searchAcrossSources` and return chunks from multiple sources

**Step 5: Verify in Convex dashboard**

Open Convex dashboard → `sourceChunks` table → verify chunks are stored with embeddings.
