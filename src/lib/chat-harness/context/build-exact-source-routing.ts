import type { ModelMessage } from "ai"

import {
    buildDeterministicExactSourcePrepareStep,
    buildExactSourceInspectionRouterNote,
    buildExactSourceInspectionSystemMessage,
} from "@/lib/ai/exact-source-guardrails"
import type {
    ExactSourceFollowupResolution,
    ExactSourceSummary,
} from "@/lib/ai/exact-source-followup"

/**
 * Build deterministic exact-source routing: prepareStep, toolChoice,
 * maxToolSteps, and inject inspection system message into the messages array.
 *
 * Deduplicates the identical primary-path and fallback-path blocks in route.ts
 * (lines ~1795-1817 and ~2174-2200) into a single call.
 */
export function buildExactSourceRouting(params: {
    exactSourceResolution: ExactSourceFollowupResolution
    enableWebSearch: boolean
    forcedSyncPrepareStep: unknown
    forcedToolChoice: unknown
    availableExactSources: ExactSourceSummary[]
    messages: ModelMessage[]
}): {
    prepareStep: unknown
    toolChoice: unknown
    maxToolSteps: number
    routerNote: string | undefined
    messages: ModelMessage[]
} {
    const {
        exactSourceResolution,
        enableWebSearch,
        forcedSyncPrepareStep,
        forcedToolChoice,
        availableExactSources,
        messages,
    } = params

    // Deterministic routing only applies when web search is off and
    // there are no forced overrides from other routing decisions.
    const shouldApplyDeterministicRouting =
        !enableWebSearch &&
        !forcedSyncPrepareStep &&
        !forcedToolChoice &&
        availableExactSources.length > 0

    const routePlan = shouldApplyDeterministicRouting
        ? buildDeterministicExactSourcePrepareStep({
            messages: messages as Array<{ role: "system" | "user" | "assistant"; content: string }>,
            resolution: exactSourceResolution,
        })
        : {
            messages,
            prepareStep: undefined,
            maxToolSteps: undefined as number | undefined,
        }

    // Inject the inspection system message when deterministic routing produced
    // a force-inspect or clarify plan (i.e. prepareStep is defined).
    const finalMessages: ModelMessage[] = routePlan.prepareStep
        ? [
            ...(routePlan.messages as ModelMessage[]),
            buildExactSourceInspectionSystemMessage() as ModelMessage,
        ]
        : (routePlan.messages as ModelMessage[])

    // Router note for logging / observability
    const routerNote = shouldApplyDeterministicRouting && exactSourceResolution.mode !== "none"
        ? buildExactSourceInspectionRouterNote(availableExactSources.length > 0)
        : undefined

    return {
        prepareStep: routePlan.prepareStep,
        toolChoice: forcedToolChoice,
        maxToolSteps: routePlan.maxToolSteps ?? 10,
        routerNote: routerNote || undefined,
        messages: finalMessages,
    }
}
