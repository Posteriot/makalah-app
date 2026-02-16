/**
 * Context Budget Monitor + Soft Window Pruning (W2)
 *
 * Estimates token usage and prunes old messages when approaching
 * context window limits. Uses chars/4 heuristic for token estimation.
 */

const DEFAULT_THRESHOLD_RATIO = 0.8
const DEFAULT_WARN_RATIO = 0.6
const DEFAULT_KEEP_LAST_N = 50
const CHARS_PER_TOKEN = 4

const MODEL_CONTEXT_WINDOWS: Record<string, number> = {
  "google/gemini-2.5-flash": 1_048_576,
  "openai/gpt-5.1": 1_047_576,
  default: 128_000,
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export function getModelContextWindow(modelId: string): number {
  return MODEL_CONTEXT_WINDOWS[modelId] ?? MODEL_CONTEXT_WINDOWS.default
}

export interface ContextBudgetResult {
  totalTokens: number
  threshold: number
  shouldPrune: boolean
  shouldWarn: boolean
}

export function checkContextBudget(
  totalChars: number,
  modelId: string,
  thresholdRatio = DEFAULT_THRESHOLD_RATIO
): ContextBudgetResult {
  const contextWindow = getModelContextWindow(modelId)
  const threshold = Math.floor(contextWindow * thresholdRatio)
  const warnThreshold = Math.floor(contextWindow * DEFAULT_WARN_RATIO)
  const totalTokens = Math.ceil(totalChars / CHARS_PER_TOKEN)

  return {
    totalTokens,
    threshold,
    shouldPrune: totalTokens > threshold,
    shouldWarn: totalTokens > warnThreshold,
  }
}

export interface UIMessage {
  role: string
  parts?: Array<{ type: string; text?: string }>
  [key: string]: unknown
}

export function pruneMessages<T extends UIMessage>(
  messages: T[],
  keepLastN = DEFAULT_KEEP_LAST_N
): T[] {
  if (messages.length <= keepLastN) return messages
  return messages.slice(-keepLastN)
}

export function estimateMessagesChars(messages: UIMessage[]): number {
  return messages.reduce((total, msg) => {
    if (msg.parts) {
      return (
        total +
        msg.parts.reduce((partTotal, part) => {
          return partTotal + (part.text?.length ?? 0)
        }, 0)
      )
    }
    return total
  }, 0)
}
