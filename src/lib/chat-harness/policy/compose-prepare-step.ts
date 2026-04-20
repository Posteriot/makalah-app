import type { PrepareStepFunction } from "./types"

/**
 * Compose multiple enforcer prepareStep functions into a single one.
 *
 * Priority chain:
 * 1. If exactSourcePrepareStep AND any chain enforcer exist, compose them
 *    so exact-source fires first per step, then the chained enforcer.
 * 2. Otherwise: chainedEnforcer ?? exactSourcePrepareStep ?? deterministicSyncPrepareStep
 *
 * This deduplicates the primary and fallback IIFEs in route.ts.
 */
export function composePrepareStep(params: {
    exactSourcePrepareStep: PrepareStepFunction | undefined
    revisionChainEnforcer: PrepareStepFunction | undefined
    draftingChoiceArtifactEnforcer: PrepareStepFunction | undefined
    universalReactiveEnforcer: PrepareStepFunction | undefined
    deterministicSyncPrepareStep: PrepareStepFunction | undefined
}): PrepareStepFunction | undefined {
    const {
        exactSourcePrepareStep,
        revisionChainEnforcer,
        draftingChoiceArtifactEnforcer,
        universalReactiveEnforcer,
        deterministicSyncPrepareStep,
    } = params

    const hasChainEnforcer = !!(revisionChainEnforcer || draftingChoiceArtifactEnforcer || universalReactiveEnforcer)

    const chainedEnforcer: PrepareStepFunction | undefined = hasChainEnforcer
        ? (stepParams) =>
              revisionChainEnforcer?.(stepParams) ?? draftingChoiceArtifactEnforcer?.(stepParams) ?? universalReactiveEnforcer?.(stepParams)
        : undefined

    if (exactSourcePrepareStep && hasChainEnforcer) {
        return (stepParams) => exactSourcePrepareStep(stepParams) ?? chainedEnforcer!(stepParams)
    }

    return chainedEnforcer ?? exactSourcePrepareStep ?? deterministicSyncPrepareStep
}
