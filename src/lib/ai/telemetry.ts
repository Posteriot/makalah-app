import { fetchMutation } from "convex/nextjs"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"

type TelemetryParams = {
  token: string
  userId: Id<"users">
  conversationId?: Id<"conversations">
  provider: "vercel-gateway" | "openrouter"
  model: string
  isPrimaryProvider: boolean
  failoverUsed: boolean
  toolUsed?: string
  mode: "normal" | "websearch" | "paper"
  success: boolean
  errorType?: string
  errorMessage?: string
  latencyMs: number
  inputTokens?: number
  outputTokens?: number
}

/**
 * Classify error into a standard error type category.
 */
export function classifyError(error: unknown): { errorType: string; errorMessage: string } {
  const message = error instanceof Error ? error.message : String(error)
  const lower = message.toLowerCase()

  let errorType = "api_error"
  if (lower.includes("timeout") || lower.includes("timed out")) errorType = "timeout"
  else if (lower.includes("429") || lower.includes("rate limit") || lower.includes("rate_limit")) errorType = "rate_limit"
  else if (lower.includes("401") || lower.includes("403") || lower.includes("unauthorized") || lower.includes("api key")) errorType = "auth"
  else if (lower.includes("network") || lower.includes("econnrefused") || lower.includes("fetch failed")) errorType = "network"
  else if (lower.includes("500") || lower.includes("502") || lower.includes("503")) errorType = "server_error"

  return {
    errorType,
    errorMessage: message.slice(0, 200),
  }
}

/**
 * Fire-and-forget telemetry logger.
 * NEVER awaited — must not block or crash the chat response.
 */
export function logAiTelemetry(params: TelemetryParams): void {
  const { token, ...args } = params

  fetchMutation(api.aiTelemetry.log, args, { token })
    .catch((err) => {
      console.error("[Telemetry] Failed to log:", err)
    })
}
