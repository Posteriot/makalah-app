import { embed, embedMany } from "ai"
import { google } from "@ai-sdk/google"

const EMBEDDING_MODEL = "gemini-embedding-001"
const DIMENSIONS = 768
const MAX_RETRIES = 3
const BASE_DELAY_MS = 10000 // 10s — Google free tier rate limit resets per minute

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) throw error
      // Parse retry-after from error if available (Google 429 includes retryDelay)
      const retryAfterMs = extractRetryAfterMs(error)
      const delay = retryAfterMs ?? BASE_DELAY_MS * Math.pow(2, attempt)
      console.log(`[Embedding] Retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(delay / 1000)}s...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error("Unreachable")
}

function extractRetryAfterMs(error: unknown): number | undefined {
  try {
    // AI SDK wraps errors — dig into lastError.responseBody for Google's retryDelay
    const lastError = (error as { lastError?: { responseBody?: string } })?.lastError
    const body = lastError?.responseBody
    if (!body) return undefined
    const match = body.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)
    if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1000 // add 1s buffer
  } catch {
    // Fall through to default
  }
  return undefined
}

/**
 * Embed multiple texts for document storage.
 * Uses taskType RETRIEVAL_DOCUMENT. Retries 3x with exponential backoff.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const model = google.textEmbeddingModel(EMBEDDING_MODEL)
  const { embeddings } = await withRetry(() => embedMany({
    model,
    values: texts,
    providerOptions: {
      google: {
        outputDimensionality: DIMENSIONS,
        taskType: "RETRIEVAL_DOCUMENT",
      },
    },
  }))

  return embeddings
}

/**
 * Embed a single query for retrieval.
 * Uses taskType RETRIEVAL_QUERY. Retries 3x with exponential backoff.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const model = google.textEmbeddingModel(EMBEDDING_MODEL)
  const { embedding } = await withRetry(() => embed({
    model,
    value: query,
    providerOptions: {
      google: {
        outputDimensionality: DIMENSIONS,
        taskType: "RETRIEVAL_QUERY",
      },
    },
  }))

  return embedding
}
