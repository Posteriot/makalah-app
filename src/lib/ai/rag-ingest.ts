import { fetchMutation, fetchQuery } from "convex/nextjs"
import { api } from "@convex/_generated/api"
import { Id } from "@convex/_generated/dataModel"
import { chunkContent } from "@/lib/ai/chunking"
import { embedTexts } from "@/lib/ai/embedding"

interface IngestInput {
  conversationId: string
  sourceType: "web" | "upload"
  sourceId: string
  content: string
  metadata?: { title?: string }
  convexToken?: string
}

/**
 * Core RAG ingest pipeline: chunk → embed → store.
 * Callable directly (no HTTP, no auth needed).
 * Used by orchestrator (web search) and extract-file (upload).
 */
export async function ingestToRag(input: IngestInput): Promise<{
  status: "ingested" | "skipped"
  reason?: string
  chunks?: number
}> {
  const convexOptions = input.convexToken ? { token: input.convexToken } : undefined

  // Dedup check
  const exists = await fetchQuery(
    api.sourceChunks.hasSource,
    {
      conversationId: input.conversationId as Id<"conversations">,
      sourceId: input.sourceId,
    },
    convexOptions,
  )

  if (exists) {
    console.log(`[RAG Ingest] Skip — sourceId already exists: ${input.sourceId}`)
    return { status: "skipped", reason: "already_exists" }
  }

  // Chunk
  const chunks = chunkContent(input.content)
  if (chunks.length === 0) {
    console.log(`[RAG Ingest] Skip — no chunks produced for: ${input.sourceId}`)
    return { status: "skipped", reason: "no_chunks" }
  }

  console.log(`[RAG Ingest] Chunked ${input.sourceId}: ${chunks.length} chunks`)

  // Embed
  const embeddings = await embedTexts(chunks.map((c) => c.content))

  console.log(`[RAG Ingest] Embedded ${embeddings.length} chunks for ${input.sourceId}`)

  // Store
  const chunksWithEmbeddings = chunks.map((chunk, i) => ({
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    embedding: embeddings[i],
    metadata: {
      ...chunk.metadata,
      ...(input.metadata?.title ? { title: input.metadata.title } : {}),
    },
  }))

  await fetchMutation(
    api.sourceChunks.ingestChunks,
    {
      conversationId: input.conversationId as Id<"conversations">,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      chunks: chunksWithEmbeddings,
    },
    convexOptions,
  )

  console.log(`[RAG Ingest] Stored ${chunksWithEmbeddings.length} chunks for ${input.sourceId}`)

  return { status: "ingested", chunks: chunksWithEmbeddings.length }
}
