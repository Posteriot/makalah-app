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
  }))

  return embedding
}
