// ────────────────────────────────────────────────────────────────
// verify-step-outcome.ts
//
// Consolidates scattered step-outcome verification logic from the
// executor modules into a single, testable pure function.
//
// Called from buildStepStream's stream writer finish handler.
// Does NOT perform side-effects (no DB writes, no retries).
// ────────────────────────────────────────────────────────────────

import type { PaperToolTracker } from "@/lib/ai/paper-tools"
import type { PaperTurnObservability } from "../executor/types"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { ParsedChoiceInteractionEvent } from "@/lib/chat/choice-request"
import type { ResolvedChoiceWorkflow } from "@/lib/chat/choice-request"
import type { PlanSpec } from "@/lib/ai/harness/plan-spec"
import { sanitizeChoiceOutcome } from "@/lib/chat/choice-outcome-guard"
import type { StepVerificationResult, PaperSessionForVerification } from "./types"

// ────────────────────────────────────────────────────────────────
// Main verification function
// ────────────────────────────────────────────────────────────────

export function verifyStepOutcome(params: {
    text: string
    toolChainOrder: string[]
    paperToolTracker: PaperToolTracker
    paperTurnObservability: PaperTurnObservability
    resolvedWorkflow: ResolvedChoiceWorkflow | undefined
    choiceInteractionEvent: ParsedChoiceInteractionEvent | null
    paperSession: PaperSessionForVerification | null
    paperStageScope: PaperStageId | undefined
    isDraftingStage: boolean
    isCompileThenFinalize: boolean
}): StepVerificationResult {
    const {
        text,
        toolChainOrder,
        paperToolTracker,
        paperTurnObservability,
        resolvedWorkflow,
        choiceInteractionEvent,
        paperSession,
        paperStageScope,
        isDraftingStage,
        isCompileThenFinalize,
    } = params

    const completionBlockers: string[] = []

    // ── 1. Artifact chain completeness ──
    // Expected chain: updateStageData → createArtifact/updateArtifact → submitStageForValidation
    // With compile-then-finalize: compileDaftarPustaka → updateStageData → createArtifact → submitStageForValidation
    const hasArtifactSuccess =
        paperToolTracker.sawCreateArtifactSuccess || paperToolTracker.sawUpdateArtifactSuccess
    const hasSubmitSuccess = paperToolTracker.sawSubmitValidationSuccess

    const artifactChainComplete = isDraftingStage
        ? (paperToolTracker.sawUpdateStageData && hasArtifactSuccess && hasSubmitSuccess)
        : true // non-drafting stages don't require full chain

    if (isDraftingStage && paperStageScope) {
        if (paperToolTracker.sawUpdateStageData && !hasArtifactSuccess && !hasSubmitSuccess) {
            completionBlockers.push(
                `stage=${paperStageScope}: updateStageData called but artifact and submit missing (partial-save-stall)`
            )
        }
        if (hasArtifactSuccess && !hasSubmitSuccess) {
            completionBlockers.push(
                `stage=${paperStageScope}: artifact created/updated but submitStageForValidation not called`
            )
        }
        if (isCompileThenFinalize && !paperToolTracker.sawCompileDaftarPustakaPersist && hasArtifactSuccess) {
            completionBlockers.push(
                `stage=${paperStageScope}: compileDaftarPustaka not called before artifact creation (compile-then-finalize expected)`
            )
        }
    }

    // Generic cross-stage partial-save-stall for commit-point choices
    if (choiceInteractionEvent && paperStageScope) {
        const wasCommitPoint = resolvedWorkflow?.action !== "continue_discussion"
        if (
            wasCommitPoint &&
            paperToolTracker.sawUpdateStageData &&
            !hasArtifactSuccess &&
            !hasSubmitSuccess
        ) {
            // Only add if not already covered by the drafting-stage check above
            const stallMsg = `stage=${paperStageScope}: commit-point choice resulted in updateStageData only`
            if (!completionBlockers.some(b => b.includes("partial-save-stall"))) {
                completionBlockers.push(stallMsg)
            }
        }
    }

    // ── 2. Outcome guard (streamContentOverride) ──
    // Call sanitizeChoiceOutcome when stage scope exists and text is non-empty.
    // Produces sanitized text to replace stream content when the model output
    // violates the outcome contract.
    let streamContentOverride: string | undefined

    if (paperStageScope && text.length > 0) {
        const guardResult = sanitizeChoiceOutcome({
            action: resolvedWorkflow?.action ?? "finalize_stage",
            text,
            hasArtifactSuccess,
            submittedForValidation: hasSubmitSuccess,
        })
        if (guardResult.wasModified) {
            streamContentOverride = guardResult.text
        }
    }

    // ── 3. Leakage summary ──
    // The incremental detection runs in build-step-stream.ts per text-delta.
    // We only read the summary here — no re-scanning.
    const leakageDetected = paperTurnObservability.firstLeakageMatch !== null
    const leakageDetails = leakageDetected
        ? {
            match: paperTurnObservability.firstLeakageMatch!,
            snippet: paperTurnObservability.firstLeakageSnippet ?? "",
        }
        : undefined

    // ── 4. Plan completeness ──
    // Check tool chain for plan-related signals. A plan is complete when
    // all tasks are "complete", but we don't have the plan spec here —
    // we check whether validation was submitted (which triggers auto-complete
    // via autoCompletePlanOnValidation downstream). The plan is considered
    // incomplete if we're in a drafting stage and validation hasn't succeeded.
    const planComplete = isDraftingStage
        ? hasSubmitSuccess
        : true

    if (isDraftingStage && !planComplete) {
        completionBlockers.push(
            `stage=${paperStageScope ?? "unknown"}: plan incomplete — validation not submitted`
        )
    }

    // ── 5. Pause / continue decisions ──
    // mustPause: true when the step has blockers that require intervention
    // (e.g., ordering bug where submit failed before artifact existed).
    const hasOrderingBug =
        paperToolTracker.sawSubmitValidationArtifactMissing &&
        paperToolTracker.sawCreateArtifactSuccess &&
        !hasSubmitSuccess
    const mustPause = hasOrderingBug
    const pauseReason = hasOrderingBug
        ? `submitStageForValidation failed before artifact existed; createArtifact succeeded later but submit was not retried`
        : undefined

    // canContinue: step produced meaningful output and no hard blockers
    const canContinue = !mustPause && text.length > 0

    // canComplete: all expected work finished with no blockers
    const canComplete = completionBlockers.length === 0

    // ── Tool chain order validation (observability) ──
    // Validate that finalization tools appeared in correct order.
    // This is informational — included in the result for logging.
    if (toolChainOrder.length > 0 && paperStageScope) {
        const finalizationTools = new Set(["updateStageData", "createArtifact", "submitStageForValidation"])
        const expected = isCompileThenFinalize
            ? ["compileDaftarPustaka", "updateStageData", "createArtifact", "submitStageForValidation"]
            : ["updateStageData", "createArtifact", "submitStageForValidation"]
        const deduped = toolChainOrder.filter((name, i) => i === 0 || name !== toolChainOrder[i - 1])
        const hasFinalizationTool = toolChainOrder.some(name => finalizationTools.has(name))
        if (hasFinalizationTool) {
            const isCorrectOrder = expected.every((tool, idx) => deduped[idx] === tool)
            if (!isCorrectOrder) {
                completionBlockers.push(
                    `stage=${paperStageScope}: tool chain order incorrect — expected [${expected.join(", ")}] got [${deduped.join(", ")}]`
                )
            }
        }
    }

    return {
        canContinue,
        mustPause,
        pauseReason,
        canComplete,
        completionBlockers,
        leakageDetected,
        leakageDetails,
        artifactChainComplete,
        planComplete,
        streamContentOverride,
    }
}
