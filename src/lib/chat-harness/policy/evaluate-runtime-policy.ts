import type { ExactSourceRoutingResult } from "../context/types"
import type { EnforcerContext, RuntimePolicyDecision } from "./types"
import {
    computeEnforcerDerivedValues,
    createRevisionChainEnforcer,
    createDraftingChoiceArtifactEnforcer,
    createUniversalReactiveEnforcer,
} from "./enforcers"
import { composePrepareStep } from "./compose-prepare-step"
import { classifyExecutionBoundary } from "./build-tool-boundary-policy"

/**
 * Orchestrates all runtime policy evaluation into a single decision.
 *
 * Internally:
 * 1. Computes derived values (isCompileThenFinalize, shouldEnforceArtifactChain, planHasIncompleteTasks)
 * 2. Creates all enforcer functions
 * 3. Composes them into a single prepareStep
 * 4. Classifies execution boundary
 * 5. Returns the full RuntimePolicyDecision
 */
export function evaluateRuntimePolicy(params: {
    enforcerContext: Omit<EnforcerContext, "isCompileThenFinalize" | "shouldEnforceArtifactChain" | "planHasIncompleteTasks" | "stepTimingRef">
    exactSourceRouting: ExactSourceRoutingResult
    forcedSyncPrepareStep: unknown
    forcedToolChoice: unknown
}): RuntimePolicyDecision {
    const { enforcerContext, exactSourceRouting, forcedSyncPrepareStep, forcedToolChoice } = params

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

    return {
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
}
