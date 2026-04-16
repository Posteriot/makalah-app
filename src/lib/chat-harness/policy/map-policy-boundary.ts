/**
 * Maps the RuntimePolicyDecision.executionBoundary (5 values, runtime-focused)
 * to PolicyState.currentBoundary (3 values, durable contract per research doc
 * lines 868-878).
 *
 * Rationale: executionBoundary is preserved in event payloads for rich
 * observability, while currentBoundary is persisted in harnessRuns.policyState
 * as the coarser durable shape.
 *
 * Mapping table:
 *   normal (+ no approval, no pause) -> read_only
 *   forced-sync | forced-submit | exact-source | revision-chain -> bounded_mutation
 *   requiresApproval=true OR pauseReason set -> blocked (overrides above)
 */
import type { RuntimePolicyDecision } from "./types"
import type { PolicyBoundary } from "../persistence"

export function mapExecutionBoundaryToPolicyBoundary(
    decision: RuntimePolicyDecision,
): PolicyBoundary {
    if (decision.requiresApproval || decision.pauseReason) return "blocked"
    if (decision.executionBoundary === "normal") return "read_only"
    // forced-sync, forced-submit, exact-source, revision-chain
    return "bounded_mutation"
}
