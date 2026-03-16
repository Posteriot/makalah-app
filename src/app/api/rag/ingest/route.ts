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
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      )
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
      console.error(
        `[RAG Ingest] Embedding failed for ${sourceId}:`,
        embedError,
      )
      return NextResponse.json({ error: "Embedding failed" }, { status: 502 })
    }

    console.log(
      `[RAG Ingest] Embedded ${embeddings.length} chunks for ${sourceId}`,
    )

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

    console.log(
      `[RAG Ingest] Stored ${chunksWithEmbeddings.length} chunks for ${sourceId}`,
    )

    return NextResponse.json({
      status: "ingested",
      chunks: chunksWithEmbeddings.length,
    })
  } catch (error) {
    console.error("[RAG Ingest] Unexpected error:", error)
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
