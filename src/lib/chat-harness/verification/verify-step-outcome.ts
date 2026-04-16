// ────────────────────────────────────────────────────────────────
// verify-step-outcome.ts
//
// Consolidates scattered step-outcome verification logic from the
// executor modules into a single, testable function.
//
// Called from TWO locations per step (dual-call pattern):
//   1. buildStepStream stream-finish handler — runs verification to
//      compute `streamContentOverride` for the in-flight stream guard.
//      This caller passes `emitEvents: false` so the observability
//      events (`verification_started` / `verification_completed`) are
//      NOT emitted from the stream path.
//   2. buildOnFinishHandler — runs verification again over the final
//      normalized text. This caller passes `emitEvents: true` and is
//      the SINGLE, definitive emitter of verification events per step.
//
// The `emitEvents: boolean` gate (Task 6.4d / audit fix HIGH 3) exists
// to prevent double-emission of nearly-identical verification events
// that share the same correlationId. The verification logic itself is
// side-effect free and runs on both calls. Persistence failures are
// logged + swallowed so observability never blocks the verification
// flow.
// ────────────────────────────────────────────────────────────────

import type { PaperToolTracker } from "@/lib/ai/paper-tools"
import type { PaperTurnObservability } from "../executor/types"
import type { PaperStageId } from "../../../../convex/paperSessions/constants"
import type { ParsedChoiceInteractionEvent } from "@/lib/chat/choice-request"
import type { ResolvedChoiceWorkflow } from "@/lib/chat/choice-request"
import type { PlanSpec } from "@/lib/ai/harness/plan-spec"
import type { Id } from "../../../../convex/_generated/dataModel"
import { sanitizeChoiceOutcome } from "@/lib/chat/choice-outcome-guard"
import type { StepVerificationResult, PaperSessionForVerification } from "./types"
import type { EventStore } from "../persistence"
import { HARNESS_EVENT_TYPES } from "../persistence"
import type { RunLane } from "../types/runtime"

// ────────────────────────────────────────────────────────────────
// Main verification function
// ────────────────────────────────────────────────────────────────

export async function verifyStepOutcome(params: {
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
    /** Harness persistence — Task 6.4d wiring. */
    eventStore: EventStore
    lane: RunLane
    userId: Id<"users">
    /** Step record id (may be null if step creation failed earlier). */
    stepId: Id<"harnessRunSteps"> | null
    /**
     * When true, emits verification_started + verification_completed events.
     * The function is called from TWO locations per step:
     *   - stream-finish handler (build-step-stream.ts) — emitEvents=false
     *     (verification logic runs only for guard/override; no events to avoid duplication)
     *   - onFinish handler (build-on-finish-handler.ts) — emitEvents=true
     *     (single, definitive verification emission per step)
     */
    emitEvents: boolean
}): Promise<StepVerificationResult> {
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
        eventStore,
        lane,
        userId,
        stepId,
        emitEvents,
    } = params

    // ── Emit verification_started (best-effort observability) ──
    // Gated by emitEvents so only one of the two per-step calls emits.
    if (emitEvents) {
        try {
            await eventStore.emit({
                eventType: HARNESS_EVENT_TYPES.VERIFICATION_STARTED,
                userId,
                sessionId: lane.sessionId,
                chatId: lane.conversationId,
                runId: lane.runId,
                stepId: stepId ?? undefined,
                correlationId: lane.requestId,
                payload: {
                    target: "combined",
                    startedAt: Date.now(),
                },
            })
        } catch (err) {
            console.warn("[HARNESS][persistence] verification_started emit failed", err)
        }
    }

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

    const result: StepVerificationResult = {
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

    // ── Emit verification_completed (best-effort observability) ──
    // Gated by emitEvents so only one of the two per-step calls emits.
    if (emitEvents) {
        try {
            await eventStore.emit({
                eventType: HARNESS_EVENT_TYPES.VERIFICATION_COMPLETED,
                userId,
                sessionId: lane.sessionId,
                chatId: lane.conversationId,
                runId: lane.runId,
                stepId: stepId ?? undefined,
                correlationId: lane.requestId,
                payload: {
                    target: "combined",
                    status: result.canContinue && !result.mustPause ? "pass" : "fail",
                    outcome: deriveVerificationOutcome(result),
                    findings: deriveFindings(result),
                    completionEligible: result.canComplete,
                    completedAt: Date.now(),
                },
            })
        } catch (err) {
            console.warn("[HARNESS][persistence] verification_completed emit failed", err)
        }
    }

    return result
}

// ────────────────────────────────────────────────────────────────
// Outcome / findings helpers (research doc lines 758-763 + 901-908)
// ────────────────────────────────────────────────────────────────

type VerificationOutcome =
    | "pass"
    | "fail_repairable"
    | "fail_missing_content"
    | "fail_user_blocked"
    | "fail_irrecoverable"

function deriveVerificationOutcome(result: StepVerificationResult): VerificationOutcome {
    if (result.canContinue && !result.mustPause && result.completionBlockers.length === 0) {
        return "pass"
    }
    if (
        result.mustPause &&
        result.pauseReason &&
        /approval|user|decision|choice/i.test(result.pauseReason)
    ) {
        return "fail_user_blocked"
    }
    if (!result.artifactChainComplete || !result.planComplete) {
        return "fail_missing_content"
    }
    if (result.leakageDetected || result.streamContentOverride !== undefined) {
        return "fail_repairable"
    }
    return "fail_irrecoverable"
}

interface VerificationFinding {
    code: string
    severity: "info" | "warn" | "error"
    message: string
}

function deriveFindings(result: StepVerificationResult): VerificationFinding[] {
    const findings: VerificationFinding[] = []
    for (const blocker of result.completionBlockers) {
        findings.push({ code: "completion_blocker", severity: "error", message: blocker })
    }
    if (result.leakageDetected) {
        findings.push({
            code: "recovery_leakage_detected",
            severity: "warn",
            message: result.leakageDetails?.match ?? "leakage match (details suppressed)",
        })
    }
    if (result.streamContentOverride !== undefined) {
        findings.push({
            code: "stream_content_overridden",
            severity: "warn",
            message: "outcome guard replaced stream content",
        })
    }
    return findings
}
