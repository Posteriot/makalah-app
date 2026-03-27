import type { ReasoningLiveDataPart } from "./curated-trace"
import { sanitizeReasoningSnapshot } from "./reasoning-sanitizer"

const DEFAULT_MIN_EMIT_INTERVAL_MS = 160
const DEFAULT_MIN_GROWTH_CHARS = 48

export interface ReasoningLiveAccumulator {
  onReasoningDelta: (delta: string) => ReasoningLiveDataPart | null
  finalize: () => ReasoningLiveDataPart | null
  getFullReasoning: () => string
  hasReasoning: () => boolean
}

export function createReasoningLiveAccumulator(options: {
  traceId: string
  enabled: boolean
  now?: () => number
  minEmitIntervalMs?: number
  minGrowthChars?: number
}): ReasoningLiveAccumulator {
  const now = options.now ?? Date.now
  const minEmitIntervalMs = options.minEmitIntervalMs ?? DEFAULT_MIN_EMIT_INTERVAL_MS
  const minGrowthChars = options.minGrowthChars ?? DEFAULT_MIN_GROWTH_CHARS

  let rawReasoning = ""
  let lastEmittedSnapshot = ""
  let lastEmittedAt = 0
  let lastEmittedWasDone = false
  let chunkCount = 0
  let finalized = false

  const buildPart = (snapshot: string, done = false): ReasoningLiveDataPart => {
    const ts = now()
    lastEmittedSnapshot = snapshot
    lastEmittedAt = ts
    lastEmittedWasDone = done
    return {
      type: "data-reasoning-live",
      id: `${options.traceId}-live-${++chunkCount}${done ? "-done" : ""}`,
      data: {
        traceId: options.traceId,
        text: snapshot,
        ts,
        ...(done ? { done: true } : {}),
      },
    }
  }

  const shouldEmitSnapshot = (snapshot: string): boolean => {
    if (!snapshot || snapshot === lastEmittedSnapshot) return false
    if (lastEmittedSnapshot.length === 0) return true

    const elapsed = now() - lastEmittedAt
    if (elapsed >= minEmitIntervalMs) return true
    if (snapshot.length - lastEmittedSnapshot.length >= minGrowthChars) return true

    return false
  }

  return {
    onReasoningDelta: (delta: string) => {
      if (!options.enabled || finalized || !delta) return null

      rawReasoning += delta
      const snapshot = sanitizeReasoningSnapshot(rawReasoning)
      if (!shouldEmitSnapshot(snapshot)) return null

      return buildPart(snapshot)
    },
    finalize: () => {
      finalized = true
      if (!options.enabled || !rawReasoning.trim()) return null

      const snapshot = sanitizeReasoningSnapshot(rawReasoning)
      if (!snapshot) return null
      if (snapshot === lastEmittedSnapshot && lastEmittedWasDone) return null

      return buildPart(snapshot, true)
    },
    getFullReasoning: () => rawReasoning,
    hasReasoning: () => rawReasoning.trim().length > 0,
  }
}
