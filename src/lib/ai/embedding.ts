import { embed, embedMany } from "ai"
import { gateway } from "@ai-sdk/gateway"

// Use Vercel AI Gateway for embedding — separate quota from Google direct API
// (which is shared with grounding search via GOOGLE_GENERATIVE_AI_API_KEY).
// Gateway uses OIDC auth, so no API key contention.
const EMBEDDING_MODEL = "google/gemini-embedding-001"
const DIMENSIONS = 768
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000
const MAX_RETRY_DELAY_MS = 5000
const MAX_BATCH_SIZE = 100 // Google batchEmbedContents hard limit

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (!shouldRetryEmbedding(error)) throw error
      if (attempt === MAX_RETRIES - 1) throw error
      const retryAfterMs = extractRetryAfterMs(error)
      const delay = Math.min(
        retryAfterMs ?? BASE_DELAY_MS * Math.pow(2, attempt),
        MAX_RETRY_DELAY_MS,
      )
      console.log(`[Embedding] Retry ${attempt + 1}/${MAX_RETRIES} in ${Math.round(delay / 1000)}s...`)
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
  throw new Error("Unreachable")
}

function shouldRetryEmbedding(error: unknown): boolean {
  const maybeError = error as {
    statusCode?: number
    message?: string
    responseBody?: string
    lastError?: { statusCode?: number; message?: string; responseBody?: string }
  }

  const lastError = maybeError.lastError
  const statusCode = lastError?.statusCode ?? maybeError.statusCode
  const message = `${lastError?.message ?? ""} ${maybeError.message ?? ""}`.toLowerCase()
  const responseBody = `${lastError?.responseBody ?? ""} ${maybeError.responseBody ?? ""}`.toLowerCase()

  const hardQuotaExhausted =
    statusCode === 429 &&
    (
      message.includes("billing details") ||
      message.includes("current quota") ||
      responseBody.includes("resource_exhausted") ||
      responseBody.includes("billing details") ||
      responseBody.includes("current quota")
    )

  return !hardQuotaExhausted
}

function extractRetryAfterMs(error: unknown): number | undefined {
  try {
    const lastError = (error as { lastError?: { responseBody?: string }; responseBody?: string })?.lastError
    const body = lastError?.responseBody
      ?? (error as { responseBody?: string })?.responseBody
    if (!body) return undefined
    const match = body.match(/"retryDelay":\s*"(\d+(?:\.\d+)?)s"/)
    if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 1000
  } catch {
    // Fall through to default
  }
  return undefined
}

/**
 * Embed multiple texts for document storage.
 * Uses Vercel AI Gateway → google/gemini-embedding-001.
 * Retries transient failures with short exponential backoff. Batches at max 100.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const model = gateway.textEmbeddingModel(EMBEDDING_MODEL)

  if (texts.length <= MAX_BATCH_SIZE) {
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

  const allEmbeddings: number[][] = []
  for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
    const batch = texts.slice(i, i + MAX_BATCH_SIZE)
    const { embeddings } = await withRetry(() => embedMany({
      model,
      values: batch,
      providerOptions: {
        google: {
          outputDimensionality: DIMENSIONS,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      },
    }))
    allEmbeddings.push(...embeddings)
  }
  return allEmbeddings
}

/**
 * Embed a single query for retrieval.
 * Uses Vercel AI Gateway → google/gemini-embedding-001.
 */
export async function embedQuery(query: string): Promise<number[]> {
  const model = gateway.textEmbeddingModel(EMBEDDING_MODEL)
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
