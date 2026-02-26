/**
 * Context Budget Monitor + Soft Window Pruning (W2)
 *
 * Estimates token usage and prunes old messages when approaching
 * context window limits. Uses chars/4 heuristic for token estimation.
 *
 * Context window size is read from database config (aiProviderConfigs.primaryContextWindow).
 * Falls back to 128K if not configured.
 */

const DEFAULT_COMPACTION_RATIO = 0.85
const DEFAULT_THRESHOLD_RATIO = 0.8
const DEFAULT_WARN_RATIO = 0.6
const DEFAULT_KEEP_LAST_N = 50
const CHARS_PER_TOKEN = 4
const DEFAULT_CONTEXT_WINDOW = 128_000

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

export function getContextWindow(configuredWindow: number | undefined): number {
  return configuredWindow && configuredWindow > 0 ? configuredWindow : DEFAULT_CONTEXT_WINDOW
}

export interface ContextBudgetResult {
  totalTokens: number
  threshold: number
  compactionThreshold: number
  contextWindow: number
  shouldCompact: boolean
  shouldPrune: boolean
  shouldWarn: boolean
}

export function checkContextBudget(
  totalChars: number,
  contextWindow: number,
  thresholdRatio = DEFAULT_THRESHOLD_RATIO
): ContextBudgetResult {
  const compactionThreshold = Math.floor(contextWindow * DEFAULT_COMPACTION_RATIO)
  const threshold = Math.floor(contextWindow * thresholdRatio)
  const warnThreshold = Math.floor(contextWindow * DEFAULT_WARN_RATIO)
  const totalTokens = Math.ceil(totalChars / CHARS_PER_TOKEN)

  return {
    totalTokens,
    threshold,
    compactionThreshold,
    contextWindow,
    shouldCompact: totalTokens > compactionThreshold,
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
