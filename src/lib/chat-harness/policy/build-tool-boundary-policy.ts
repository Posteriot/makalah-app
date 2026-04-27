import type { ExecutionBoundary } from "./types"
import type { ExactSourceRoutingResult } from "../context/types"

/**
 * Classifies the execution boundary from policy signals.
 *
 * Priority order:
 * 1. forcedSyncPrepareStep  → "forced-sync"
 * 2. forcedToolChoice       → "forced-submit"
 * 3. exactSourceRouting     → "exact-source"  (when mode is "force-inspect")
 * 4. revisionChainEnforcer  → "revision-chain"
 * 5. fallback               → "normal"
 */
export function classifyExecutionBoundary(params: {
    forcedSyncPrepareStep: unknown
    forcedToolChoice: unknown
    exactSourceRouting: ExactSourceRoutingResult
    revisionChainEnforcer: unknown
}): ExecutionBoundary {
    if (params.forcedSyncPrepareStep) return "forced-sync"
    if (params.forcedToolChoice) return "forced-submit"
    if (params.exactSourceRouting.mode === "force-inspect") return "exact-source"
    if (params.revisionChainEnforcer) return "revision-chain"
    return "normal"
}
