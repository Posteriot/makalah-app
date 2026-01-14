/**
 * Retry Helper for Convex Operations
 *
 * Handles transient failures in Vercel serverless environment:
 * - Cold start delays
 * - Network latency spikes
 * - Connection pool exhaustion
 *
 * Uses exponential backoff: 100ms → 200ms → 400ms (capped at maxDelayMs)
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay in milliseconds (default: 100) */
  baseDelayMs?: number
  /** Maximum delay cap in milliseconds (default: 2000) */
  maxDelayMs?: number
  /** Optional operation name for logging */
  operationName?: string
}

/**
 * Execute an async operation with exponential backoff retry
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => fetchMutation(api.paperSessions.create, { ... }),
 *   { operationName: 'createPaperSession' }
 * )
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 100,
    maxDelayMs = 2000,
    operationName = "unknown",
  } = options

  let lastError: Error | unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      // Don't retry on final attempt
      if (attempt === maxRetries) {
        console.error(
          `[Retry] ${operationName} failed after ${maxRetries + 1} attempts:`,
          error
        )
        break
      }

      // Calculate exponential backoff delay
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs)

      console.warn(
        `[Retry] ${operationName} attempt ${attempt + 1} failed, retrying in ${delay}ms...`
      )

      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Wrapper for Convex fetchMutation with retry
 * Convenience function for common mutation pattern
 */
export async function retryMutation<T>(
  mutationFn: () => Promise<T>,
  operationName: string
): Promise<T> {
  return withRetry(mutationFn, { operationName })
}

/**
 * Wrapper for Convex fetchQuery with retry
 * Convenience function for common query pattern
 */
export async function retryQuery<T>(
  queryFn: () => Promise<T>,
  operationName: string
): Promise<T> {
  return withRetry(queryFn, { operationName })
}
