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
  const chunkStart = Date.now()
  const chunks = chunkContent(input.content)
  if (chunks.length === 0) {
    console.log(`[RAG Ingest] Skip — no chunks produced for: ${input.sourceId}`)
    return { status: "skipped", reason: "no_chunks" }
  }
  const chunkElapsed = Date.now() - chunkStart

  // Embed
  const embedStart = Date.now()
  const embeddings = await embedTexts(chunks.map((c) => c.content))
  const embedElapsed = Date.now() - embedStart

  // Store
  const storeStart = Date.now()
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
  const storeElapsed = Date.now() - storeStart

  console.log(`[⏱ LATENCY] RAG ingest source=${input.sourceId.slice(0, 60)} chunks=${chunks.length} chunk=${chunkElapsed}ms embed=${embedElapsed}ms store=${storeElapsed}ms total=${chunkElapsed + embedElapsed + storeElapsed}ms contentChars=${input.content.length}`)

  return { status: "ingested", chunks: chunksWithEmbeddings.length }
}
