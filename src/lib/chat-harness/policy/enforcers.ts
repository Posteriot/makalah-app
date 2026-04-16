import type { PlanSpec } from "@/lib/ai/harness/plan-spec"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { EnforcerContext, PrepareStepFunction } from "./types"

// ────────────────────────────────────────────────────────────────
// Supporting computed values
// ────────────────────────────────────────────────────────────────

export function computeEnforcerDerivedValues(ctx: {
    paperSession: EnforcerContext["paperSession"]
    paperStageScope: PaperStageId | undefined
    resolvedWorkflow: EnforcerContext["resolvedWorkflow"]
}): {
    isCompileThenFinalize: boolean
    shouldEnforceArtifactChain: boolean
    planHasIncompleteTasks: boolean
} {
    const isCompileThenFinalize = ctx.resolvedWorkflow?.action === "compile_then_finalize"
    const shouldEnforceArtifactChain =
        ctx.resolvedWorkflow?.action !== "continue_discussion"

    const currentPlan = (ctx.paperSession?.stageData as Record<string, Record<string, unknown>> | undefined)
        ?.[ctx.paperStageScope ?? ""]?._plan as PlanSpec | undefined
    const planHasIncompleteTasks = currentPlan?.tasks?.some(
        (t: { status: string }) => t.status !== "complete"
    ) ?? false

    if (shouldEnforceArtifactChain && planHasIncompleteTasks && ctx.resolvedWorkflow?.action === "finalize_stage") {
        console.info(`[PLAN-GATE] enforcer downgraded: plan has incomplete tasks (${currentPlan?.tasks.filter((t: { status: string }) => t.status === "complete").length}/${currentPlan?.tasks.length} complete)`)
    }

    return { isCompileThenFinalize, shouldEnforceArtifactChain, planHasIncompleteTasks }
}

// ────────────────────────────────────────────────────────────────
// Revision Chain Enforcer
// ────────────────────────────────────────────────────────────────

/**
 * Active during pending_validation / revision status only.
 * Forces the model through: requestRevision → updateStageData → updateArtifact/createArtifact → submitStageForValidation.
 */
export function createRevisionChainEnforcer(ctx: EnforcerContext): PrepareStepFunction | undefined {
    const isRevisionActive = ctx.paperSession?.stageStatus === "pending_validation" || ctx.paperSession?.stageStatus === "revision"

    if (!isRevisionActive) return undefined

    return ({ steps, stepNumber }) => {
        if (stepNumber === 0) {
            if (ctx.paperSession?.stageStatus === "revision") {
                console.info(`[REVISION][chain-enforcer] step=0 status=revision → required`)
                return { toolChoice: "required" as const }
            }
            return undefined
        }

        const prevToolNames = steps[stepNumber - 1]?.toolCalls?.map(tc => tc.toolName) ?? []

        if (prevToolNames.includes("requestRevision")) {
            console.info(`[REVISION][chain-enforcer] step=${stepNumber} prev=${prevToolNames.join(",")} → required`)
            return { toolChoice: "required" as const }
        }
        if (prevToolNames.includes("updateStageData")) {
            console.info(`[REVISION][chain-enforcer] step=${stepNumber} prev=${prevToolNames.join(",")} → required`)
            return { toolChoice: "required" as const }
        }
        if (prevToolNames.includes("updateArtifact") || prevToolNames.includes("createArtifact")) {
            if (ctx.paperToolTracker?.sawUpdateArtifactSuccess || ctx.paperToolTracker?.sawCreateArtifactSuccess) {
                console.info(`[REVISION][chain-enforcer] step=${stepNumber} prev=${prevToolNames.join(",")} → submitStageForValidation`)
                return { toolChoice: { type: "tool", toolName: "submitStageForValidation" } as const }
            }
            console.info(`[REVISION][chain-enforcer] step=${stepNumber} prev=${prevToolNames.join(",")} → artifact failed, allowing retry`)
            return { toolChoice: "required" as const }
        }

        return undefined
    }
}

// ────────────────────────────────────────────────────────────────
// Drafting Choice Artifact Enforcer
// ────────────────────────────────────────────────────────────────

/**
 * Active during drafting when a choice interaction event triggers an artifact chain.
 * Forces: [compileDaftarPustaka] → updateStageData → createArtifact → submitStageForValidation.
 */
export function createDraftingChoiceArtifactEnforcer(ctx: EnforcerContext): PrepareStepFunction | undefined {
    const isActive =
        ctx.choiceInteractionEvent && ctx.paperStageScope && ctx.paperSession?.stageStatus === "drafting"
        && ctx.shouldEnforceArtifactChain && !(ctx.planHasIncompleteTasks && ctx.resolvedWorkflow?.action === "finalize_stage")

    if (!isActive) return undefined

    return ({ steps, stepNumber }) => {
        const allPrevToolNames = steps.flatMap(s => s.toolCalls?.map(tc => tc.toolName) ?? [])
        const sawCompile = allPrevToolNames.includes("compileDaftarPustaka")
        const sawUpdateStageData = allPrevToolNames.includes("updateStageData")
        const sawCreateArtifact = allPrevToolNames.includes("createArtifact")
        const sawUpdateArtifact = allPrevToolNames.includes("updateArtifact")
        const sawSubmit = allPrevToolNames.includes("submitStageForValidation")
        const sawArtifact = sawCreateArtifact || sawUpdateArtifact

        if (ctx.isCompileThenFinalize && !sawCompile) {
            console.info(`[CHOICE][artifact-enforcer] step=${stepNumber} stage=${ctx.paperStageScope} → compileDaftarPustaka (compile_then_finalize)`)
            return { toolChoice: { type: "tool", toolName: "compileDaftarPustaka" } as const }
        }

        if (!sawUpdateStageData && !sawArtifact) {
            console.info(`[CHOICE][artifact-enforcer] step=${stepNumber} stage=${ctx.paperStageScope} → updateStageData (chain start)`)
            return { toolChoice: { type: "tool", toolName: "updateStageData" } as const }
        }

        if (sawUpdateStageData && !sawArtifact) {
            console.info(`[CHOICE][artifact-enforcer] step=${stepNumber} stage=${ctx.paperStageScope} → createArtifact`)
            return { toolChoice: { type: "tool", toolName: "createArtifact" } as const }
        }

        if (sawArtifact && !sawSubmit) {
            console.info(`[CHOICE][artifact-enforcer] step=${stepNumber} stage=${ctx.paperStageScope} → submitStageForValidation`)
            return { toolChoice: { type: "tool", toolName: "submitStageForValidation" } as const }
        }

        return undefined
    }
}

// ────────────────────────────────────────────────────────────────
// Universal Reactive Enforcer
// ────────────────────────────────────────────────────────────────

/**
 * Active during drafting for any stage.
 * Reacts to updateStageData → forces createArtifact → submitStageForValidation.
 * Also tracks step timing via `ctx.stepTimingRef`.
 */
export function createUniversalReactiveEnforcer(ctx: EnforcerContext): PrepareStepFunction | undefined {
    const isActive = ctx.paperStageScope && ctx.paperSession?.stageStatus === "drafting"

    if (!isActive) return undefined

    return ({ steps, stepNumber }) => {
        if (stepNumber > 0) {
            const prevStepTools = steps[stepNumber - 1]?.toolCalls?.map(tc => tc.toolName).join(",") ?? "text"
            const elapsed = Date.now() - ctx.stepTimingRef.current
            console.info(`[STEP-TIMING] step=${stepNumber - 1} stage=${ctx.paperStageScope} tools=[${prevStepTools}] elapsed=${elapsed}ms`)
        }
        ctx.stepTimingRef.current = Date.now()

        if (stepNumber === 0) return undefined

        const allPrevToolNames = steps.flatMap(s => s.toolCalls?.map(tc => tc.toolName) ?? [])
        const sawUpdateStageData = allPrevToolNames.includes("updateStageData")

        if (!sawUpdateStageData) return undefined

        const sawCreateArtifact = allPrevToolNames.includes("createArtifact")
        const sawUpdateArtifact = allPrevToolNames.includes("updateArtifact")
        const sawSubmit = allPrevToolNames.includes("submitStageForValidation")
        const sawArtifact = sawCreateArtifact || sawUpdateArtifact

        if (!sawArtifact) {
            console.info(`[REACTIVE-ENFORCER] step=${stepNumber} stage=${ctx.paperStageScope} → createArtifact`)
            return { toolChoice: { type: "tool", toolName: "createArtifact" } as const }
        }

        if (!sawSubmit) {
            console.info(`[REACTIVE-ENFORCER] step=${stepNumber} stage=${ctx.paperStageScope} → submitStageForValidation`)
            return { toolChoice: { type: "tool", toolName: "submitStageForValidation" } as const }
        }

        return undefined
    }
}
