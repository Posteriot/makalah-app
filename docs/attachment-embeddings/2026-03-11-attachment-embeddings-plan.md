# Attachment Embeddings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add RAG-based retrieval to file attachments using Gemini Embedding + Vision extraction, replacing brute-force context stuffing for large files.

**Architecture:** Files are chunked and embedded at upload time (ingestion). At chat time, a hybrid router decides: small files get context-stuffed (existing behavior), large files get RAG retrieval (embed query, vector search, inject top chunks). Vision extraction via Gemini Flash captures diagrams/charts that text extraction misses.

**Tech Stack:** `@ai-sdk/google` (embedding + vision), Convex native vector search, `pdf-to-img` (PDF page rendering), Vercel AI SDK `embed`/`embedMany`

**Design Doc:** `docs/attachment-embeddings/2026-03-11-attachment-embeddings-design.md`

---

## Task 1: Schema -- `fileChunks` Table + `embeddingStatus` Field

**Files:**
- Modify: `convex/schema.ts` (lines 171-189, files table + add new fileChunks table)

**Step 1: Add `embeddingStatus` to `files` table**

In `convex/schema.ts`, add after line 182 (`extractionError` field):

```typescript
embeddingStatus: v.optional(v.union(
  v.literal("pending"),
  v.literal("processing"),
  v.literal("completed"),
  v.literal("failed"),
)),
```

**Step 2: Add `fileChunks` table**

Add new table definition after the `files` table:

```typescript
fileChunks: defineTable({
  fileId: v.id("files"),
  conversationId: v.optional(v.id("conversations")),
  userId: v.id("users"),
  content: v.string(),
  source: v.union(v.literal("text"), v.literal("vision")),
  pageNumber: v.optional(v.number()),
  chunkIndex: v.number(),
  embedding: v.array(v.float64()),
  createdAt: v.number(),
})
  .index("by_file", ["fileId"])
  .index("by_conversation", ["conversationId"])
  .index("by_user", ["userId"])
  .vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["conversationId", "fileId", "userId"],
  }),
```

**Step 3: Verify schema syncs**

Run `npx convex dev` -- should sync without errors. Schema updated, new table created, vector index created.

**Step 4: Commit**

Stage `convex/schema.ts` and commit: "feat: add fileChunks table with vector index + embeddingStatus field"

---

## Task 2: Convex Mutations -- `fileChunks.ts`

**Files:**
- Create: `convex/fileChunks.ts`
- Modify: `convex/files.ts` (add `updateEmbeddingStatus` mutation)

**Step 1: Create `convex/fileChunks.ts` with CRUD + vector search**

```typescript
// convex/fileChunks.ts
import { v } from "convex/values"
import { mutation, action, internalQuery } from "./_generated/server"
import { internal } from "./_generated/api"

// Insert chunks in batch (called from ingestion pipeline)
export const insertChunks = mutation({
  args: {
    chunks: v.array(v.object({
      fileId: v.id("files"),
      conversationId: v.optional(v.id("conversations")),
      userId: v.id("users"),
      content: v.string(),
      source: v.union(v.literal("text"), v.literal("vision")),
      pageNumber: v.optional(v.number()),
      chunkIndex: v.number(),
      embedding: v.array(v.float64()),
    })),
  },
  handler: async (ctx, { chunks }) => {
    const now = Date.now()
    const ids = []
    for (const chunk of chunks) {
      const id = await ctx.db.insert("fileChunks", {
        ...chunk,
        createdAt: now,
      })
      ids.push(id)
    }
    return ids
  },
})

// Delete all chunks for a file (cleanup on re-embed or file delete)
export const deleteChunksByFile = mutation({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const chunks = await ctx.db
      .query("fileChunks")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect()
    for (const chunk of chunks) {
      await ctx.db.delete(chunk._id)
    }
    return chunks.length
  },
})

// Internal query for fetching chunk by ID (used by vector search action)
export const getById = internalQuery({
  args: { id: v.id("fileChunks") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id)
  },
})

// Vector search action (vector search only available in actions)
export const searchSimilar = action({
  args: {
    vector: v.array(v.float64()),
    conversationId: v.optional(v.id("conversations")),
    fileIds: v.optional(v.array(v.id("files"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const filter = args.conversationId
      ? (q: any) => q.eq("conversationId", args.conversationId)
      : undefined

    const results = await ctx.vectorSearch("fileChunks", "by_embedding", {
      vector: args.vector,
      limit: args.limit ?? 8,
      ...(filter && { filter }),
    })

    const chunks = await Promise.all(
      results.map(async (r) => {
        const chunk = await ctx.runQuery(internal.fileChunks.getById, { id: r._id })
        return chunk ? { ...chunk, score: r._score } : null
      })
    )

    const validChunks = chunks.filter(Boolean)

    if (args.fileIds && args.fileIds.length > 0) {
      return validChunks.filter((c) => args.fileIds!.includes(c!.fileId))
    }
    return validChunks
  },
})

// Get chunk count for a file (for status checks)
export const getChunkCountByFile = internalQuery({
  args: { fileId: v.id("files") },
  handler: async (ctx, { fileId }) => {
    const chunks = await ctx.db
      .query("fileChunks")
      .withIndex("by_file", (q) => q.eq("fileId", fileId))
      .collect()
    return chunks.length
  },
})
```

**Step 2: Add `updateEmbeddingStatus` mutation to `convex/files.ts`**

Add after the existing `updateExtractionResult` mutation (around line 73):

```typescript
export const updateEmbeddingStatus = mutation({
  args: {
    fileId: v.id("files"),
    embeddingStatus: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("completed"),
      v.literal("failed"),
    ),
  },
  handler: async (ctx, { fileId, embeddingStatus }) => {
    await ctx.db.patch(fileId, { embeddingStatus })
  },
})
```

**Step 3: Verify Convex syncs**

Run `npx convex dev` -- functions registered, no errors.

**Step 4: Commit**

Stage `convex/fileChunks.ts` and `convex/files.ts`, commit: "feat: add fileChunks CRUD + vector search action + embeddingStatus mutation"

---

## Task 3: Chunker Utility (TDD)

**Files:**
- Create: `src/lib/embedding/chunker.ts`
- Create: `__tests__/chunker.test.ts`

**Step 1: Write failing tests**

```typescript
// __tests__/chunker.test.ts
import { describe, it, expect } from "vitest"
import { chunkText, type ChunkResult } from "@/lib/embedding/chunker"

describe("chunkText", () => {
  it("returns single chunk for short text", () => {
    const result = chunkText("Ini kalimat pendek.", { source: "text" })
    expect(result).toHaveLength(1)
    expect(result[0].content).toBe("Ini kalimat pendek.")
    expect(result[0].source).toBe("text")
    expect(result[0].chunkIndex).toBe(0)
  })

  it("splits long text into multiple chunks at sentence boundaries", () => {
    const sentences = Array.from({ length: 30 }, (_, i) =>
      `Kalimat nomor ${i + 1} yang cukup panjang untuk mengisi ruang dalam teks.`
    )
    const longText = sentences.join(" ")
    const result = chunkText(longText, { source: "text" })
    expect(result.length).toBeGreaterThan(1)
    for (const chunk of result) {
      expect(chunk.content.trimEnd()).toMatch(/[.!?]$/)
    }
  })

  it("preserves overlap between consecutive chunks", () => {
    const sentences = Array.from({ length: 30 }, (_, i) =>
      `Kalimat unik ${i + 1} dalam paragraf panjang yang digunakan untuk pengujian.`
    )
    const longText = sentences.join(" ")
    const result = chunkText(longText, { source: "text" })
    if (result.length >= 2) {
      const endOfFirst = result[0].content.slice(-100)
      const startOfSecond = result[1].content.slice(0, 200)
      const overlapWords = endOfFirst.split(" ").filter(w =>
        startOfSecond.includes(w)
      )
      expect(overlapWords.length).toBeGreaterThan(0)
    }
  })

  it("assigns sequential chunkIndex", () => {
    const sentences = Array.from({ length: 30 }, (_, i) =>
      `Kalimat pengujian ${i + 1} yang dipakai untuk memverifikasi indeks chunk.`
    )
    const longText = sentences.join(" ")
    const result = chunkText(longText, { source: "text" })
    result.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i)
    })
  })

  it("propagates pageNumber when provided", () => {
    const result = chunkText("Teks halaman tiga.", {
      source: "vision",
      pageNumber: 3,
    })
    expect(result[0].pageNumber).toBe(3)
    expect(result[0].source).toBe("vision")
  })

  it("does not split markdown tables", () => {
    const table = "| Kolom A | Kolom B |\n| --- | --- |\n" +
      Array.from({ length: 50 }, (_, i) => `| Data ${i} | Nilai ${i} |`).join("\n")
    const result = chunkText(table, { source: "text" })
    expect(result).toHaveLength(1)
    expect(result[0].content).toContain("| Kolom A |")
  })

  it("returns empty array for empty input", () => {
    expect(chunkText("", { source: "text" })).toEqual([])
    expect(chunkText("   ", { source: "text" })).toEqual([])
  })
})
```

**Step 2: Run tests to verify they fail**

Run `npx vitest run __tests__/chunker.test.ts` -- expected: FAIL, module not found.

**Step 3: Implement chunker**

```typescript
// src/lib/embedding/chunker.ts

export interface ChunkOptions {
  source: "text" | "vision"
  pageNumber?: number
  maxChars?: number
  overlapChars?: number
}

export interface ChunkResult {
  content: string
  source: "text" | "vision"
  pageNumber?: number
  chunkIndex: number
}

const DEFAULT_MAX_CHARS = 1500   // ~512 tokens at 3 chars/token
const DEFAULT_OVERLAP_CHARS = 150 // ~50 tokens

function isMarkdownTable(text: string): boolean {
  const lines = text.trim().split("\n")
  if (lines.length < 2) return false
  return lines[0].trim().startsWith("|") && lines.some(l => /^\|[\s-|]+\|$/.test(l.trim()))
}

function splitAtSentenceBoundary(text: string, targetPos: number): number {
  const searchStart = Math.max(0, targetPos - 200)
  const searchRegion = text.slice(searchStart, targetPos + 100)

  const sentenceEndPattern = /[.!?]\s/g
  let lastMatch = -1
  let match

  while ((match = sentenceEndPattern.exec(searchRegion)) !== null) {
    const absolutePos = searchStart + match.index + match[0].length
    if (absolutePos <= targetPos + 50) {
      lastMatch = absolutePos
    }
  }

  const newlinePattern = /\n\s*\n/g
  while ((match = newlinePattern.exec(searchRegion)) !== null) {
    const absolutePos = searchStart + match.index + match[0].length
    if (absolutePos <= targetPos + 50 && absolutePos > lastMatch) {
      lastMatch = absolutePos
    }
  }

  return lastMatch > 0 ? lastMatch : targetPos
}

export function chunkText(text: string, options: ChunkOptions): ChunkResult[] {
  const trimmed = text.trim()
  if (!trimmed) return []

  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS
  const overlapChars = options.overlapChars ?? DEFAULT_OVERLAP_CHARS

  if (isMarkdownTable(trimmed)) {
    return [{
      content: trimmed,
      source: options.source,
      pageNumber: options.pageNumber,
      chunkIndex: 0,
    }]
  }

  if (trimmed.length <= maxChars) {
    return [{
      content: trimmed,
      source: options.source,
      pageNumber: options.pageNumber,
      chunkIndex: 0,
    }]
  }

  const chunks: ChunkResult[] = []
  let pos = 0

  while (pos < trimmed.length) {
    let end = Math.min(pos + maxChars, trimmed.length)

    if (end < trimmed.length) {
      end = splitAtSentenceBoundary(trimmed, end)
    }

    const content = trimmed.slice(pos, end).trim()
    if (content) {
      chunks.push({
        content,
        source: options.source,
        pageNumber: options.pageNumber,
        chunkIndex: chunks.length,
      })
    }

    pos = end - overlapChars
    if (pos <= (chunks.length > 0 ? end - maxChars + overlapChars : 0)) {
      pos = end
    }
  }

  return chunks
}
```

**Step 4: Run tests to verify they pass**

Run `npx vitest run __tests__/chunker.test.ts` -- expected: all PASS.

**Step 5: Commit**

Stage `src/lib/embedding/chunker.ts` and `__tests__/chunker.test.ts`, commit: "feat: add text chunker with sentence boundary splitting and table preservation"

---

## Task 4: Embedder Utility (TDD)

**Files:**
- Create: `src/lib/embedding/embedder.ts`
- Create: `__tests__/embedder.test.ts`

**Step 1: Write failing tests**

```typescript
// __tests__/embedder.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@ai-sdk/google", () => ({
  google: {
    embedding: vi.fn((modelId: string) => ({ modelId })),
  },
}))

vi.mock("ai", () => ({
  embed: vi.fn(),
  embedMany: vi.fn(),
}))

import { embedText, embedTexts, embedQuery } from "@/lib/embedding/embedder"
import { embed, embedMany } from "ai"

const mockEmbed = vi.mocked(embed)
const mockEmbedMany = vi.mocked(embedMany)

describe("embedder", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("embedText calls embed with RETRIEVAL_DOCUMENT taskType", async () => {
    mockEmbed.mockResolvedValue({ embedding: [0.1, 0.2, 0.3] } as any)
    const result = await embedText("Teks dokumen")
    expect(result).toEqual([0.1, 0.2, 0.3])
    expect(mockEmbed).toHaveBeenCalledWith(
      expect.objectContaining({
        value: "Teks dokumen",
        providerOptions: expect.objectContaining({
          google: expect.objectContaining({
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: 768,
          }),
        }),
      })
    )
  })

  it("embedQuery calls embed with RETRIEVAL_QUERY taskType", async () => {
    mockEmbed.mockResolvedValue({ embedding: [0.4, 0.5, 0.6] } as any)
    const result = await embedQuery("Apa metodologi?")
    expect(result).toEqual([0.4, 0.5, 0.6])
    expect(mockEmbed).toHaveBeenCalledWith(
      expect.objectContaining({
        providerOptions: expect.objectContaining({
          google: expect.objectContaining({
            taskType: "RETRIEVAL_QUERY",
          }),
        }),
      })
    )
  })

  it("embedTexts calls embedMany for batch embedding", async () => {
    mockEmbedMany.mockResolvedValue({
      embeddings: [[0.1], [0.2], [0.3]],
    } as any)
    const result = await embedTexts(["a", "b", "c"])
    expect(result).toEqual([[0.1], [0.2], [0.3]])
    expect(mockEmbedMany).toHaveBeenCalledWith(
      expect.objectContaining({ values: ["a", "b", "c"] })
    )
  })
})
```

**Step 2: Run tests to verify they fail**

Run `npx vitest run __tests__/embedder.test.ts` -- expected: FAIL, module not found.

**Step 3: Implement embedder**

```typescript
// src/lib/embedding/embedder.ts
import { google, type GoogleEmbeddingModelOptions } from "@ai-sdk/google"
import { embed, embedMany } from "ai"

const EMBEDDING_MODEL = "gemini-embedding-001"
const EMBEDDING_DIMENSIONS = 768

function getModel() {
  return google.embedding(EMBEDDING_MODEL)
}

function getProviderOptions(taskType: string): { google: GoogleEmbeddingModelOptions } {
  return {
    google: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    } satisfies GoogleEmbeddingModelOptions,
  }
}

export async function embedText(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: getModel(),
    value: text,
    providerOptions: getProviderOptions("RETRIEVAL_DOCUMENT"),
  })
  return embedding
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const { embeddings } = await embedMany({
    model: getModel(),
    values: texts,
    providerOptions: getProviderOptions("RETRIEVAL_DOCUMENT"),
  })
  return embeddings
}

export async function embedQuery(query: string): Promise<number[]> {
  const { embedding } = await embed({
    model: getModel(),
    value: query,
    providerOptions: getProviderOptions("RETRIEVAL_QUERY"),
  })
  return embedding
}
```

**Step 4: Run tests to verify they pass**

Run `npx vitest run __tests__/embedder.test.ts` -- expected: all PASS.

**Step 5: Commit**

Stage `src/lib/embedding/embedder.ts` and `__tests__/embedder.test.ts`, commit: "feat: add embedder utility wrapping @ai-sdk/google embed API"

---

## Task 5: Install `pdf-to-img` + Vision Extractor

**Files:**
- Create: `src/lib/file-extraction/vision-extractor.ts`

**Step 1: Install pdf-to-img**

Run `npm install pdf-to-img`

**Step 2: Implement vision extractor**

```typescript
// src/lib/file-extraction/vision-extractor.ts
import { google } from "@ai-sdk/google"
import { generateText } from "ai"

const VISION_MAX_PAGES = 6
const VISION_MODEL = "gemini-2.5-flash"

interface VisionResult {
  pageNumber: number
  description: string
}

const VISION_PROMPT = `Deskripsikan semua konten visual di halaman ini secara detail:
- Diagram, grafik, chart (sertakan jenis grafik, label axis, angka-angka kunci)
- Tabel (sertakan header dan data)
- Gambar dan ilustrasi (sertakan apa yang ditampilkan)
- Rumus matematika (tulis dalam format teks)
- Relasi antar elemen visual

Sertakan semua angka, label, dan keterangan yang terlihat.
Jika tidak ada konten visual di halaman ini, jawab hanya: TIDAK_ADA_KONTEN_VISUAL`

async function renderPdfPages(
  pdfBuffer: Buffer,
  pageNumbers: number[]
): Promise<Array<{ pageNumber: number; imageBuffer: Buffer }>> {
  const { pdf } = await import("pdf-to-img")
  const doc = await pdf(pdfBuffer, { scale: 1.5 })
  const results: Array<{ pageNumber: number; imageBuffer: Buffer }> = []

  for (const pageNum of pageNumbers) {
    if (pageNum > doc.length) continue
    const imageBuffer = await doc.getPage(pageNum)
    results.push({ pageNumber: pageNum, imageBuffer: Buffer.from(imageBuffer) })
  }

  return results
}

export function selectPagesForVision(
  pageTexts: Array<{ pageNumber: number; textLength: number }>,
  maxPages: number = VISION_MAX_PAGES
): number[] {
  const sorted = [...pageTexts].sort((a, b) => a.textLength - b.textLength)
  const sparsePages = sorted
    .filter(p => p.textLength < 100)
    .slice(0, maxPages)
    .map(p => p.pageNumber)

  if (sparsePages.length > 0) return sparsePages

  return pageTexts
    .slice(0, maxPages)
    .map(p => p.pageNumber)
}

export async function extractVisionFromPdf(
  pdfBuffer: Buffer,
  pageNumbers: number[]
): Promise<VisionResult[]> {
  if (pageNumbers.length === 0) return []

  const pages = await renderPdfPages(pdfBuffer, pageNumbers)
  const results: VisionResult[] = []

  for (const { pageNumber, imageBuffer } of pages) {
    try {
      const { text } = await generateText({
        model: google(VISION_MODEL),
        messages: [{
          role: "user",
          content: [
            { type: "text", text: VISION_PROMPT },
            {
              type: "file",
              data: imageBuffer,
              mediaType: "image/png" as const,
            },
          ],
        }],
        maxTokens: 1000,
      })

      if (text && !text.includes("TIDAK_ADA_KONTEN_VISUAL")) {
        results.push({ pageNumber, description: text.trim() })
      }
    } catch (error) {
      console.warn(`Vision extraction failed for page ${pageNumber}:`, error)
    }
  }

  return results
}

export async function extractVisionFromImage(
  imageBuffer: Buffer,
  mimeType: string
): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: google(VISION_MODEL),
      messages: [{
        role: "user",
        content: [
          { type: "text", text: VISION_PROMPT },
          { type: "file", data: imageBuffer, mediaType: mimeType as any },
        ],
      }],
      maxTokens: 1000,
    })

    if (text && !text.includes("TIDAK_ADA_KONTEN_VISUAL")) {
      return text.trim()
    }
    return null
  } catch (error) {
    console.warn("Vision extraction failed for image:", error)
    return null
  }
}
```

**Step 3: Commit**

Stage `package.json`, `package-lock.json`, and `src/lib/file-extraction/vision-extractor.ts`, commit: "feat: add vision extractor using Gemini Flash for PDF diagrams and images"

---

## Task 6: Ingestion Pipeline -- Orchestrator

**Files:**
- Create: `src/lib/embedding/ingestion.ts`
- Modify: `src/app/api/extract-file/route.ts` (trigger embedding after extraction)

**Step 1: Create ingestion orchestrator**

```typescript
// src/lib/embedding/ingestion.ts
import { fetchMutation } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { chunkText, type ChunkResult } from "./chunker"
import { embedTexts } from "./embedder"
import {
  selectPagesForVision,
  extractVisionFromPdf,
  extractVisionFromImage,
} from "@/lib/file-extraction/vision-extractor"

interface IngestionParams {
  fileId: Id<"files">
  conversationId: Id<"conversations"> | undefined
  userId: Id<"users">
  extractedText: string
  fileBuffer: Buffer
  fileName: string
  mimeType: string
  convexOptions: { token: string }
}

export async function runEmbeddingIngestion(params: IngestionParams): Promise<void> {
  const {
    fileId, conversationId, userId,
    extractedText, fileBuffer, fileName, mimeType,
    convexOptions,
  } = params

  await fetchMutation(api.files.updateEmbeddingStatus, {
    fileId,
    embeddingStatus: "processing",
  }, convexOptions)

  try {
    const allChunks: ChunkResult[] = []

    // Step 1: Chunk extracted text
    const textChunks = chunkText(extractedText, { source: "text" })
    allChunks.push(...textChunks)

    // Step 2: Vision extraction (PDF and images only)
    if (mimeType === "application/pdf") {
      const estimatedPages = Math.max(1, Math.ceil(extractedText.length / 3000))
      const pageTexts = Array.from({ length: estimatedPages }, (_, i) => ({
        pageNumber: i + 1,
        textLength: Math.floor(extractedText.length / estimatedPages),
      }))
      const pagesToProcess = selectPagesForVision(pageTexts)

      const visionResults = await extractVisionFromPdf(fileBuffer, pagesToProcess)
      for (const { pageNumber, description } of visionResults) {
        const visionChunks = chunkText(description, {
          source: "vision",
          pageNumber,
        })
        allChunks.push(...visionChunks)
      }
    } else if (mimeType.startsWith("image/")) {
      const description = await extractVisionFromImage(fileBuffer, mimeType)
      if (description) {
        const visionChunks = chunkText(description, { source: "vision" })
        allChunks.push(...visionChunks)
      }
    }

    // Step 3: Embed all chunks
    if (allChunks.length === 0) {
      await fetchMutation(api.files.updateEmbeddingStatus, {
        fileId, embeddingStatus: "completed",
      }, convexOptions)
      return
    }

    const embeddings = await embedTexts(allChunks.map(c => c.content))

    // Step 4: Store chunks with embeddings in Convex
    const chunksToInsert = allChunks.map((chunk, i) => ({
      fileId,
      conversationId,
      userId,
      content: chunk.content,
      source: chunk.source as "text" | "vision",
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      embedding: embeddings[i],
    }))

    const BATCH_SIZE = 50
    for (let i = 0; i < chunksToInsert.length; i += BATCH_SIZE) {
      const batch = chunksToInsert.slice(i, i + BATCH_SIZE)
      await fetchMutation(api.fileChunks.insertChunks, {
        chunks: batch,
      }, convexOptions)
    }

    await fetchMutation(api.files.updateEmbeddingStatus, {
      fileId, embeddingStatus: "completed",
    }, convexOptions)

  } catch (error) {
    console.error(`Embedding ingestion failed for file ${fileId}:`, error)
    await fetchMutation(api.files.updateEmbeddingStatus, {
      fileId, embeddingStatus: "failed",
    }, convexOptions)
  }
}
```

**Step 2: Integrate into extract-file route**

In `src/app/api/extract-file/route.ts`, after the successful extraction mutation (line ~256), add the embedding trigger. Import `runEmbeddingIngestion` at top of file.

After `await fetchMutation(api.files.updateExtractionResult, ...)`, add:

```typescript
if (extractedText) {
  runEmbeddingIngestion({
    fileId: fileId as Id<"files">,
    conversationId: file.conversationId as Id<"conversations"> | undefined,
    userId: file.userId as Id<"users">,
    extractedText,
    fileBuffer: Buffer.from(await blob.arrayBuffer()),
    fileName: file.name,
    mimeType: file.type,
    convexOptions,
  }).catch((err) => {
    console.error("Embedding ingestion fire-and-forget error:", err)
  })
}
```

The ingestion runs fire-and-forget. Extraction API response returns immediately. Embedding status tracked via `embeddingStatus` field.

**Step 3: Commit**

Stage `src/lib/embedding/ingestion.ts` and `src/app/api/extract-file/route.ts`, commit: "feat: add embedding ingestion pipeline triggered after text extraction"

---

## Task 7: Retriever Utility

**Files:**
- Create: `src/lib/embedding/retriever.ts`

**Step 1: Implement retriever**

```typescript
// src/lib/embedding/retriever.ts
import { fetchAction } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import { embedQuery } from "./embedder"

export interface RetrievedChunk {
  content: string
  source: "text" | "vision"
  pageNumber?: number
  chunkIndex: number
  fileId: Id<"files">
  score: number
}

interface RetrieveParams {
  query: string
  conversationId?: Id<"conversations">
  fileIds?: Id<"files">[]
  topK?: number
  convexOptions: { token: string }
}

export async function retrieveRelevantChunks(
  params: RetrieveParams
): Promise<RetrievedChunk[]> {
  const { query, conversationId, fileIds, topK = 8, convexOptions } = params

  const queryVector = await embedQuery(query)

  const results = await fetchAction(api.fileChunks.searchSimilar, {
    vector: queryVector,
    conversationId,
    fileIds,
    limit: topK,
  }, convexOptions)

  return (results ?? []) as RetrievedChunk[]
}

export function formatRetrievedChunks(
  chunks: RetrievedChunk[],
  fileNameMap: Map<string, string>
): string {
  if (chunks.length === 0) return ""

  return chunks
    .map((chunk) => {
      const fileName = fileNameMap.get(chunk.fileId) ?? "Unknown file"
      const pageInfo = chunk.pageNumber ? `, halaman ${chunk.pageNumber}` : ""
      const sourceTag = chunk.source === "vision" ? " (visual)" : ""
      const score = chunk.score.toFixed(2)

      return `[Retrieved from: ${fileName}${pageInfo}${sourceTag}, relevance: ${score}]\n${chunk.content}`
    })
    .join("\n\n")
}
```

**Step 2: Commit**

Stage `src/lib/embedding/retriever.ts`, commit: "feat: add retriever utility for vector search and chunk formatting"

---

## Task 8: Hybrid Routing in Chat API

**Files:**
- Modify: `src/app/api/chat/route.ts` (lines ~470-569)

This is the most critical integration. The routing logic decides context stuffing vs RAG.

**Step 1: Add imports and constants**

At the top of `src/app/api/chat/route.ts`, add imports:

```typescript
import { retrieveRelevantChunks, formatRetrievedChunks } from "@/lib/embedding/retriever"
```

Add constant near the existing `MAX_FILE_CONTEXT_CHARS_PER_FILE` (line ~474):

```typescript
const RAG_THRESHOLD_TOKENS = 10000
const CHARS_PER_TOKEN_ESTIMATE = 3
```

**Step 2: Add RAG routing decision inside the file context block**

The existing file context block (lines ~485-563) fetches files and loops through them to build `fileContext`. The routing decision goes AFTER the files are fetched and extraction polling is done, but BEFORE the file context loop.

After the extraction polling loop (after line ~507 `if (!stillPending) break`), insert the routing check:

```typescript
// --- RAG vs Context Stuffing routing ---
const docFiles = files.filter(
  (f: any) => !f.type?.startsWith("image/") && f.extractionStatus === "success" && f.extractedText
)
const totalExtractedChars = docFiles.reduce(
  (sum: number, f: any) => sum + (f.extractedText?.length ?? 0), 0
)
const totalExtractedTokens = Math.ceil(totalExtractedChars / CHARS_PER_TOKEN_ESTIMATE)

const embeddedFiles = docFiles.filter(
  (f: any) => f.embeddingStatus === "completed"
)
const useRAG = embeddedFiles.length > 0 && totalExtractedTokens >= RAG_THRESHOLD_TOKENS

if (useRAG) {
  try {
    // Get the last user message text for query embedding
    const lastUserMessage = body.messages
      .filter((m: any) => m.role === "user")
      .pop()
    const queryText = typeof lastUserMessage?.content === "string"
      ? lastUserMessage.content
      : lastUserMessage?.content?.[0]?.text ?? ""

    if (queryText) {
      const embeddedFileIds = embeddedFiles.map((f: any) => f._id)
      const fileNameMap = new Map(
        files.map((f: any) => [f._id, f.name])
      )

      const chunks = await retrieveRelevantChunks({
        query: queryText,
        conversationId: embeddedFiles[0]?.conversationId,
        fileIds: embeddedFileIds,
        topK: 8,
        convexOptions: { token: convexToken },
      })

      fileContext = formatRetrievedChunks(chunks, fileNameMap)
      docExtractionSuccessCount = embeddedFiles.length
      docFileCount = docFiles.length
      docContextChars = fileContext.length

      // Handle non-embedded files via context stuffing fallback
      const nonEmbeddedDocs = docFiles.filter(
        (f: any) => f.embeddingStatus !== "completed"
      )
      for (const file of nonEmbeddedDocs) {
        fileContext += `\n\n[File: ${file.name}]\n${file.extractedText}\n`
      }
    }
  } catch (ragError) {
    console.error("[RAG] Retrieval failed, falling back to context stuffing:", ragError)
    // Fall through to existing context stuffing below
  }
}

// Only run context stuffing if RAG didn't handle it
if (!useRAG || fileContext === "") {
  // ... existing file context loop code stays here unchanged ...
}
```

**Key Points:**
- The existing context stuffing loop (lines ~514-562) gets wrapped in the `if (!useRAG || fileContext === "")` block
- RAG failure = automatic fallback to existing behavior
- Non-embedded files in a mixed set still get context-stuffed
- Image files continue through their existing multimodal path (untouched)

**Step 3: Test manually**

1. Upload small file (< 15 pages) → should use context stuffing (existing behavior)
2. Upload large files (total > 10K tokens) → should use RAG
3. Check `embeddingStatus` in Convex dashboard
4. Ask specific question about content deep in the document → AI should find it via RAG
5. Break embedding API key temporarily → should fallback to context stuffing

**Step 4: Commit**

Stage `src/app/api/chat/route.ts`, commit: "feat: add hybrid RAG/context-stuffing routing for file attachments"

---

## Task 9: Billing Integration

**Files:**
- Modify: `convex/billing/constants.ts` (add `file_embedding` operation type)
- Modify: `src/lib/billing/enforcement.ts` (add type)
- Modify: `src/lib/embedding/ingestion.ts` (add billing calls)

**Step 1: Add operation type to constants**

In `convex/billing/constants.ts`, add to `OPERATION_COST_MULTIPLIERS`:

```typescript
file_embedding: 0.3,
```

**Step 2: Add type to enforcement**

In `src/lib/billing/enforcement.ts`, add `"file_embedding"` to the `OperationType` union type.

**Step 3: Add billing pre-flight to ingestion**

In `src/lib/embedding/ingestion.ts`, at the start of `runEmbeddingIngestion`:

```typescript
import { checkQuotaBeforeOperation, recordUsageAfterOperation, estimateTokens } from "@/lib/billing/enforcement"

// Estimate tokens from extracted text for pre-flight check
const quotaCheck = await checkQuotaBeforeOperation(
  userId,
  extractedText,           // inputText (string, not operation type)
  "file_embedding",        // operationType
  convexOptions.token      // convexToken (string, not object)
)
if (!quotaCheck.allowed) {
  console.warn(`Embedding skipped for file ${fileId}: quota exceeded`)
  return
}
```

After `embeddingStatus = "completed"`, record usage:

```typescript
const totalInputTokens = Math.ceil(
  allChunks.reduce((sum, c) => sum + c.content.length / 3, 0)
)
await recordUsageAfterOperation({
  userId,
  operationType: "file_embedding",
  inputTokens: totalInputTokens,
  outputTokens: 0,              // Embedding has no output tokens
  totalTokens: totalInputTokens,
  model: "gemini-embedding-001",
  convexToken: convexOptions.token,
})
```

**Step 4: Commit**

Stage `convex/billing/constants.ts`, `src/lib/billing/enforcement.ts`, `src/lib/embedding/ingestion.ts`, commit: "feat: integrate file_embedding operation into billing system (0.3x multiplier)"

---

## Task 10: End-to-End Verification

**Files:** No new files. Manual testing + verification.

**Step 1: Start dev servers**

Run `npm run dev` in one terminal, `npm run convex:dev` in another.

**Step 2: Test context stuffing path (backward compatibility)**

1. Upload a small TXT file (< 1 page)
2. Send a chat message referencing the file
3. Verify AI responds with file content (existing behavior)
4. Check Convex dashboard: `embeddingStatus: "completed"`, chunks in `fileChunks`
5. Routing should use context stuffing (total tokens < 10K)

**Step 3: Test RAG path**

1. Upload large PDF (20+ pages) or multiple files totaling > 10K tokens
2. Wait for `embeddingStatus: "completed"` in dashboard
3. Send specific question about content deep in the document
4. Verify AI responds with relevant info (not just first 3 pages)

**Step 4: Test vision extraction**

1. Upload PDF with diagrams/charts
2. Check `fileChunks` for chunks with `source: "vision"`
3. Ask about the diagram content
4. Verify AI can describe the diagram

**Step 5: Test fallback**

1. Temporarily break embedding API key
2. Upload file --> should fall back to context stuffing
3. `embeddingStatus` should be "failed"
4. Chat should still work normally

**Step 6: Commit any fixes**

Stage all changes, commit: "fix: address issues found during end-to-end verification"

---

## Summary

| Task | Description | Estimated effort |
|------|-------------|-----------------|
| 1 | Schema: fileChunks table + embeddingStatus | Small |
| 2 | Convex mutations: CRUD + vector search | Medium |
| 3 | Chunker utility (TDD) | Medium |
| 4 | Embedder utility (TDD) | Small |
| 5 | Vision extractor + pdf-to-img | Medium |
| 6 | Ingestion pipeline orchestrator | Large |
| 7 | Retriever utility | Small |
| 8 | Hybrid routing in chat API | Large |
| 9 | Billing integration | Small |
| 10 | End-to-end verification | Medium |

**Dependency order:** 1 --> 2 --> 3,4 (parallel) --> 5 --> 6 --> 7 --> 8 --> 9 --> 10
