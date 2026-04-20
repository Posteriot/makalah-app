import type { Id } from "../../../../convex/_generated/dataModel"
import type { ExactSourceRoutingResult } from "../context/types"
import type { EnforcerContext, RuntimePolicyDecision } from "./types"
import type { RunLane } from "../types/runtime"
import type {
    EventStore,
    PolicyStateSnapshot,
    RunStore,
} from "../persistence"
import { HARNESS_EVENT_TYPES } from "../persistence"
import {
    computeEnforcerDerivedValues,
    createRevisionChainEnforcer,
    createDraftingChoiceArtifactEnforcer,
    createUniversalReactiveEnforcer,
} from "./enforcers"
import { composePrepareStep } from "./compose-prepare-step"
import { classifyExecutionBoundary } from "./build-tool-boundary-policy"
import { mapExecutionBoundaryToPolicyBoundary } from "./map-policy-boundary"

/**
 * Orchestrates all runtime policy evaluation into a single decision.
 *
 * Internally:
 * 1. Computes derived values (isCompileThenFinalize, shouldEnforceArtifactChain, planHasIncompleteTasks)
 * 2. Creates all enforcer functions
 * 3. Composes them into a single prepareStep
 * 4. Classifies execution boundary
 * 5. Persists PolicyState snapshot + emits `execution_boundary_evaluated` event
 * 6. Returns the full RuntimePolicyDecision
 *
 * Persistence + event emission are best-effort: failures are logged and
 * swallowed so the policy decision flow is never blocked by observability.
 */
export async function evaluateRuntimePolicy(params: {
    enforcerContext: Omit<EnforcerContext, "isCompileThenFinalize" | "shouldEnforceArtifactChain" | "planHasIncompleteTasks" | "stepTimingRef">
    exactSourceRouting: ExactSourceRoutingResult
    forcedSyncPrepareStep: unknown
    forcedToolChoice: unknown
    runStore: RunStore
    eventStore: EventStore
    lane: RunLane
    userId: Id<"users">
}): Promise<RuntimePolicyDecision> {
    const {
        enforcerContext,
        exactSourceRouting,
        forcedSyncPrepareStep,
        forcedToolChoice,
        runStore,
        eventStore,
        lane,
        userId,
    } = params

    // 1. Compute derived values
    const derived = computeEnforcerDerivedValues({
        paperSession: enforcerContext.paperSession,
        paperStageScope: enforcerContext.paperStageScope,
        resolvedWorkflow: enforcerContext.resolvedWorkflow,
    })

    // Build step timing ref
    const stepTimingRef = { current: Date.now() }

    // Full enforcer context with derived values
    const ctx: EnforcerContext = {
        ...enforcerContext,
        ...derived,
        stepTimingRef,
    }

    // 2. Create enforcers
    const revisionChainEnforcer = createRevisionChainEnforcer(ctx)
    const draftingChoiceArtifactEnforcer = createDraftingChoiceArtifactEnforcer(ctx)
    const universalReactiveEnforcer = createUniversalReactiveEnforcer(ctx)

    // 3. Compose into single prepareStep
    const prepareStep = composePrepareStep({
        exactSourcePrepareStep: exactSourceRouting.prepareStep,
        revisionChainEnforcer,
        draftingChoiceArtifactEnforcer,
        universalReactiveEnforcer,
        deterministicSyncPrepareStep: forcedSyncPrepareStep as ReturnType<typeof composePrepareStep>,
    })

    // 4. Classify execution boundary
    const executionBoundary = classifyExecutionBoundary({
        forcedSyncPrepareStep,
        forcedToolChoice,
        exactSourceRouting,
        revisionChainEnforcer,
    })

    // 5. Build summary for telemetry
    const activeEnforcers: string[] = []
    if (revisionChainEnforcer) activeEnforcers.push("revision-chain")
    if (draftingChoiceArtifactEnforcer) activeEnforcers.push("drafting-choice-artifact")
    if (universalReactiveEnforcer) activeEnforcers.push("universal-reactive")
    if (exactSourceRouting.prepareStep) activeEnforcers.push("exact-source")
    if (forcedSyncPrepareStep) activeEnforcers.push("forced-sync")

    const policyDecisionSummary = activeEnforcers.length > 0
        ? `boundary=${executionBoundary} enforcers=[${activeEnforcers.join(",")}]`
        : `boundary=${executionBoundary} enforcers=none`

    const decision: RuntimePolicyDecision = {
        prepareStep,
        forcedToolChoice,
        maxSteps: 0, // Not overridden by policy — caller uses stepContext.maxSteps
        requiresApproval: false, // Phase 6+ placeholder
        pauseReason: undefined, // Phase 6+ placeholder
        allowedToolNames: undefined, // Phase 6+ placeholder
        executionBoundary,
        policyDecisionSummary,
        isCompileThenFinalize: derived.isCompileThenFinalize,
        stepTimingRef,
    }

    // 6. Persist PolicyState snapshot + emit execution_boundary_evaluated event.
    //    Wrapped in try/catch — observability must NEVER break the policy flow.
    try {
        const policyState: PolicyStateSnapshot = {
            approvalMode: decision.requiresApproval ? "required_for_high_impact" : "default",
            currentBoundary: mapExecutionBoundaryToPolicyBoundary(decision),
            // pendingApprovalDecisionId is populated later by 6.4e workflow when
            // a pending approval decision is created.
            lastPolicyReason: decision.policyDecisionSummary,
            updatedAt: Date.now(),
        }

        await runStore.recordPolicyState(lane.runId, policyState)

        const forcedToolChoiceString = extractForcedToolChoiceName(decision.forcedToolChoice)

        await eventStore.emit({
            eventType: HARNESS_EVENT_TYPES.EXECUTION_BOUNDARY_EVALUATED,
            userId,
            sessionId: lane.sessionId,
            chatId: lane.conversationId,
            runId: lane.runId,
            correlationId: lane.requestId,
            payload: {
                executionBoundary: decision.executionBoundary,   // 5-value runtime-rich
                currentBoundary: policyState.currentBoundary,    // 3-value durable
                requiresApproval: decision.requiresApproval,
                pauseReason: decision.pauseReason,
                forcedToolChoice: forcedToolChoiceString,
                allowedToolNames: decision.allowedToolNames,
                maxSteps: decision.maxSteps,
                isCompileThenFinalize: decision.isCompileThenFinalize,
                policyDecisionSummary: decision.policyDecisionSummary,
            },
        })
    } catch (err) {
        console.warn("[HARNESS][persistence] policy persist failed", err)
    }

    return decision
}

/**
 * Serialize a RuntimePolicyDecision.forcedToolChoice into a plain string
 * suitable for event payloads. Returns undefined when no choice is forced.
 *
 * Accepted shapes:
 *   - `"required"` | `"auto"` | `"none"`            (AI SDK string literal)
 *   - `{ type: "tool"; toolName: string }`          (AI SDK object form)
 */
function extractForcedToolChoiceName(choice: unknown): string | undefined {
    if (choice === undefined || choice === null) return undefined
    if (typeof choice === "string") return choice
    if (typeof choice === "object") {
        const obj = choice as { type?: unknown; toolName?: unknown }
        if (obj.type === "tool" && typeof obj.toolName === "string") {
            return obj.toolName
        }
    }
    return undefined
}
